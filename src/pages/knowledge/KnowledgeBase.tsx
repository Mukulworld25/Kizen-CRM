import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BookOpen, Search, Sparkles, CheckCircle2, ShieldCheck, IndianRupee, HelpCircle, FileText, CreditCard, Award } from 'lucide-react'

interface FeeRule {
  course: string
  level?: string
  subjects?: string
  totalFee: string
  installmentPattern: string
  perMonthFee?: string
  integratedAcca?: string
  integratedCa?: string
  notes: string
}

const FEE_MATRIX: FeeRule[] = [
  {
    course: 'ACCA (Knowledge Level)',
    subjects: 'BT, FA, MA (3 Subjects)',
    totalFee: '₹75,000',
    installmentPattern: '3 Installments × ₹25,000',
    perMonthFee: '₹25,000 / subject',
    notes: 'Free trial batch available for new inquiries. Full exam kit included.'
  },
  {
    course: 'ACCA (Skills Level)',
    subjects: 'LW, PM, TX, FR, AA, FM (6 Subjects)',
    totalFee: '₹1,80,000',
    installmentPattern: '6 Installments × ₹30,000',
    perMonthFee: '₹30,000 / subject',
    notes: 'Exam fee paid directly to ACCA portal. Mock tests after syllabus completion.'
  },
  {
    course: 'Class 12th Commerce',
    subjects: 'Accounts, Economics, Business Studies',
    totalFee: '₹68,400 (Annual)',
    installmentPattern: 'Monthly ₹5,700 or 6 Slabs',
    perMonthFee: 'Accounts ₹2k, Eco ₹2k, BSt ₹1.7k',
    integratedAcca: '₹1,43,400 (6 Inst. × ₹23,900)',
    integratedCa: '₹1,08,400 (6 Inst. × ₹18,000)',
    notes: 'Syllabus completion by November. Full syllabus mock tests in Dec-Jan.'
  },
  {
    course: 'Class 11th Commerce',
    subjects: 'Accounts, Economics, Business Studies',
    totalFee: '₹68,400 (Annual)',
    installmentPattern: 'Monthly ₹5,700 or 6 Slabs',
    perMonthFee: 'Accounts ₹2k, Eco ₹2k, BSt ₹1.7k',
    integratedAcca: '₹1,08,400 (6 Inst. × ₹18,000)',
    integratedCa: '₹93,400 (6 Inst. × ₹15,500)',
    notes: 'Batch starts from April. Chapter-wise unit tests with regular progress reports.'
  },
  {
    course: 'B.Com & BBA (UG Coaching)',
    subjects: 'All Core Commerce Subjects',
    totalFee: '₹19,500 (3-Month Slabs)',
    installmentPattern: '3 Installments × ₹6,500',
    perMonthFee: '₹6,500 / month',
    integratedAcca: '₹84,500 (6 Inst. × ₹14,000)',
    notes: 'Both Online & Offline modes available. ACCA fee + ₹9,500 for UG subjects.'
  },
  {
    course: 'CUET Preparation',
    subjects: 'Domain Subjects + General Test',
    totalFee: '₹25,000 - ₹35,000',
    installmentPattern: '2-3 Slabs',
    notes: 'Includes mock test series, speed test practice, and university guidance.'
  },
  {
    course: 'IFRS Certification',
    subjects: 'International Financial Reporting',
    totalFee: '₹35,000',
    installmentPattern: '2 Installments × ₹17,500',
    notes: 'Ideal for working professionals and B.Com graduates.'
  }
]

const PARTNER_SLABS = [
  { slab: '1 - 10 Students', accaPayout: '₹10,000 per student', integratedPayout: '₹15,000 per student', condition: 'After 2 exam fees / installments received' },
  { slab: '10 - 15 Students', accaPayout: '₹15,000 per student', integratedPayout: '₹18,000 per student', condition: 'After 2 installments cleared' },
  { slab: '16+ Students', accaPayout: '₹18,000 per student', integratedPayout: '₹20,000 per student', condition: 'Top Partner tier bonus applied' }
]

export default function KnowledgeBase() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredFeeRules = FEE_MATRIX.filter(r => {
    const term = searchTerm.toLowerCase()
    return (
      r.course.toLowerCase().includes(term) ||
      (r.subjects && r.subjects.toLowerCase().includes(term)) ||
      r.totalFee.toLowerCase().includes(term) ||
      r.notes.toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kizen Knowledge Center & Rulebook"
        description="Official course pricing catalog, payment rules, installment slabs, and counselor SOPs"
      />

      {/* Smart Search Engine */}
      <Card className="border-amber-500/30 bg-slate-900 text-white shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-amber-400" />
              <Input
                placeholder="Search Knowledge Base (e.g., 'ACCA Skills', '12th integrated', 'UPI payment', 'installments')..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 h-11 text-sm focus:border-amber-400"
              />
            </div>
            {searchTerm && (
              <Button variant="ghost" onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-white text-xs">
                Clear Filter
              </Button>
            )}
          </div>
          <p className="text-xs text-amber-400/90 mt-2 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Official Rule Engine: Use exact figures from this catalog when quoting fees or recording student payments.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="catalog">Course Pricing</TabsTrigger>
          <TabsTrigger value="policies">Payment Policies</TabsTrigger>
          <TabsTrigger value="partners">Partner Slabs</TabsTrigger>
          <TabsTrigger value="sops">Counselor SOPs</TabsTrigger>
        </TabsList>

        {/* TAB 1: COURSE PRICING MATRIX */}
        <TabsContent value="catalog" className="mt-4 space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/50 bg-slate-50/50">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Official Course & Fee Matrix
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Authoritative fee structures and installment breakdowns extracted from original Kizen Fee Matrix
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/60">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Course / Program</TableHead>
                    <TableHead className="font-bold text-slate-700">Subjects / Coverage</TableHead>
                    <TableHead className="font-bold text-slate-700">Total Fee</TableHead>
                    <TableHead className="font-bold text-slate-700">Installment Plan</TableHead>
                    <TableHead className="font-bold text-slate-700">Integrated Option</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/50">
                  {filteredFeeRules.map((rule, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50/50">
                      <TableCell className="font-semibold text-slate-900 text-sm">
                        {rule.course}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {rule.subjects || '—'}
                      </TableCell>
                      <TableCell className="font-bold text-emerald-700 text-sm">
                        {rule.totalFee}
                      </TableCell>
                      <TableCell className="text-slate-700 text-xs font-mono">
                        <Badge variant="outline" className="bg-slate-100 border-slate-300 text-slate-800">
                          {rule.installmentPattern}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {rule.integratedAcca ? (
                          <div className="space-y-1">
                            <p><strong className="text-slate-800">ACCA:</strong> {rule.integratedAcca}</p>
                            {rule.integratedCa && <p><strong className="text-slate-800">CA:</strong> {rule.integratedCa}</p>}
                          </div>
                        ) : (
                          <span className="text-slate-400">Standard</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PAYMENT POLICIES */}
        <TabsContent value="policies" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> Accepted Payment Modes
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2">
                <p><strong className="text-slate-800">1. Cash:</strong> Physical receipt issued immediately at reception desk.</p>
                <p><strong className="text-slate-800">2. UPI:</strong> GPay, PhonePe, Paytm (Transaction ID mandatory in CRM).</p>
                <p><strong className="text-slate-800">3. Bank Transfer:</strong> NEFT / IMPS to Kizen Education Account.</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-amber-600" /> Installment & Due Date Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2">
                <p><strong className="text-slate-800">Default Cycle:</strong> 30 days between installment due dates.</p>
                <p><strong className="text-slate-800">Grace Period:</strong> 5 days grace period before marking overdue.</p>
                <p><strong className="text-slate-800">Automatic Overdue Badges:</strong> Overdue status triggers visual red badges on Fee Management table.</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> Data Integrity Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2">
                <p><strong className="text-slate-800">No Freeform Amounts:</strong> Amounts must be numbers (e.g. ₹25,000, not text comments).</p>
                <p><strong className="text-slate-800">Auto-Balancing:</strong> Total Fee - Amount Paid = Pending Balance automatically computed.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: PARTNER SLABS */}
        <TabsContent value="partners" className="mt-4 space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/50 bg-slate-50/50">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" /> Business Partner & Referral Payout Slabs
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Official payout slabs for referral partners extracted from Kizen business agreement
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/60">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Student Volume Slab</TableHead>
                    <TableHead className="font-bold text-slate-700">ACCA Payout</TableHead>
                    <TableHead className="font-bold text-slate-700">Integrated Course Payout</TableHead>
                    <TableHead className="font-bold text-slate-700">Payout Condition</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/50">
                  {PARTNER_SLABS.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-semibold text-slate-900 text-sm">{s.slab}</TableCell>
                      <TableCell className="font-bold text-emerald-700 text-sm">{s.accaPayout}</TableCell>
                      <TableCell className="font-bold text-amber-700 text-sm">{s.integratedPayout}</TableCell>
                      <TableCell className="text-xs text-slate-600">{s.condition}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: COUNSELOR SOPS */}
        <TabsContent value="sops" className="mt-4 space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Counselor Standard Operating Procedures (SOPs)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 1. Lead Quoting SOP
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Always quote total fee and installment schedules using the exact figures from Tab 1 above. Never promise unauthorized discounts without Owner approval.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 2. Student Admission & Conversion
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  When converting a lead to an enrolled student, verify the 10-digit mobile number and select the correct course name (e.g., ACCA, Class 11th Commerce, Class 12th Commerce).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
