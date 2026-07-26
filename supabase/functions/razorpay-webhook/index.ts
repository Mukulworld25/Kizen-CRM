import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const razorpayWebhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get raw body for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')

    // Verify Razorpay webhook signature
    if (razorpayWebhookSecret && signature) {
      const expectedSignature = createHmac('sha256', razorpayWebhookSecret)
        .update(rawBody)
        .digest('hex')

      if (expectedSignature !== signature) {
        console.error('Invalid Razorpay signature')
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid webhook signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const payload = JSON.parse(rawBody)
    const event = payload.event

    // We only process successful payment captures
    if (event !== 'payment.captured' && event !== 'payment.authorized') {
      return new Response(
        JSON.stringify({ success: true, message: `Ignoring event: ${event}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payment = payload.payload?.payment?.entity
    if (!payment) {
      return new Response(
        JSON.stringify({ success: false, error: 'No payment entity in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract payment details
    const amountInRupees = payment.amount / 100 // Razorpay sends in paise
    const paymentMethod = mapRazorpayMethod(payment.method)
    const transactionId = payment.id
    const studentIdentifier = payment.notes?.student_id || payment.notes?.student_mobile || payment.notes?.mobile
    const feeIdFromNotes = payment.notes?.fee_id

    if (!studentIdentifier && !feeIdFromNotes) {
      // Log to audit and return success (don't retry)
      await supabase.from('import_audit_log').insert({
        source: 'razorpay_webhook',
        filename: transactionId,
        section: 'payments',
        total_rows: 1,
        inserted: 0,
        skipped: 0,
        rejected: 1,
        errors: [{ error: 'No student_id/mobile or fee_id in payment notes', payment_id: transactionId }],
      })

      return new Response(
        JSON.stringify({ success: false, error: 'No student identifier in payment notes. Add student_id or mobile to Razorpay payment link notes.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the fee record
    let feeId = feeIdFromNotes

    if (!feeId && studentIdentifier) {
      // Try to find student by student_id or mobile
      let studentQuery = supabase.from('students').select('id').limit(1)

      if (studentIdentifier.startsWith('KIZ-')) {
        studentQuery = studentQuery.eq('student_id', studentIdentifier)
      } else {
        // Normalize phone: strip non-digits, remove leading 91
        const normalized = studentIdentifier.replace(/\D/g, '').replace(/^(91)(\d{10})$/, '$2')
        studentQuery = studentQuery.eq('mobile', normalized)
      }

      const { data: students } = await studentQuery
      if (!students || students.length === 0) {
        await logRejection(supabase, transactionId, 'Student not found: ' + studentIdentifier)
        return new Response(
          JSON.stringify({ success: false, error: 'Student not found' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const studentId = students[0].id

      // Find the active fee record for this student
      const { data: fees } = await supabase
        .from('fees')
        .select('id')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!fees || fees.length === 0) {
        await logRejection(supabase, transactionId, 'No fee record for student: ' + studentIdentifier)
        return new Response(
          JSON.stringify({ success: false, error: 'No fee record found for student' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      feeId = fees[0].id
    }

    // Check for duplicate payment (idempotency)
    const { data: existing } = await supabase
      .from('fee_payments')
      .select('id')
      .eq('transaction_id', transactionId)
      .limit(1)

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Payment already recorded', payment_id: existing[0].id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert payment — the DB trigger sync_fee_amount_paid will automatically:
    // 1. Update fees.amount_paid
    // 2. Mark the earliest pending installment as paid
    // 3. Generate receipt number via generate_receipt_number trigger
    const { data: newPayment, error: insertError } = await supabase
      .from('fee_payments')
      .insert({
        fee_id: feeId,
        student_id: studentIdentifier.startsWith('KIZ-')
          ? (await supabase.from('students').select('id').eq('student_id', studentIdentifier).single()).data?.id
          : (await supabase.from('fees').select('student_id').eq('id', feeId).single()).data?.student_id,
        amount: amountInRupees,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        transaction_id: transactionId,
        notes: `Auto-recorded via Razorpay webhook. Razorpay Payment ID: ${transactionId}`,
      })
      .select('id, receipt_number')
      .single()

    if (insertError) {
      console.error('Failed to insert payment:', insertError)
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log success
    await supabase.from('import_audit_log').insert({
      source: 'razorpay_webhook',
      filename: transactionId,
      section: 'payments',
      total_rows: 1,
      inserted: 1,
      skipped: 0,
      rejected: 0,
      errors: [],
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment recorded successfully',
        payment_id: newPayment.id,
        receipt_number: newPayment.receipt_number,
        amount: amountInRupees,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Razorpay webhook error:', err)
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function mapRazorpayMethod(method: string): string {
  const methodMap: Record<string, string> = {
    upi: 'upi',
    card: 'card',
    netbanking: 'bank_transfer',
    wallet: 'other',
    bank_transfer: 'bank_transfer',
    emi: 'other',
  }
  return methodMap[method] ?? 'other'
}

async function logRejection(supabase: any, transactionId: string, reason: string) {
  await supabase.from('import_audit_log').insert({
    source: 'razorpay_webhook',
    filename: transactionId,
    section: 'payments',
    total_rows: 1,
    inserted: 0,
    skipped: 0,
    rejected: 1,
    errors: [{ error: reason, payment_id: transactionId }],
  })
}
