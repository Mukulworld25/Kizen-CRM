export type UserRole = 'owner' | 'admin' | 'counselor' | 'faculty' | 'accounts' | 'reception' | 'bdm'

export type LeadStatus =
  | 'new_lead' | 'contacted' | 'follow_up' | 'demo_booked'
  | 'demo_attended' | 'negotiation' | 'registration_pending'
  | 'fee_pending' | 'converted' | 'lost'

export type LeadSource =
  | 'instagram' | 'facebook' | 'walk_in' | 'referral'
  | 'website' | 'whatsapp' | 'college_visit' | 'other'

export type Priority = 'high' | 'medium' | 'low'
export type LeadTemperature = 'hot' | 'warm' | 'cold'

export type FollowUpStatus = 'pending' | 'completed' | 'overdue' | 'cancelled'
export type FollowUpType = 'call' | 'whatsapp' | 'email' | 'meeting' | 'demo'

export type ActivityType = 'call' | 'whatsapp' | 'email' | 'meeting' | 'note' | 'status_change'

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card' | 'other'

export type InstitutionType = 'school' | 'college'
export type MouStatus = 'not_started' | 'in_discussion' | 'signed' | 'expired'
export type ExpenseCategory = 'rent' | 'salaries' | 'electricity' | 'marketing' | 'misc'

export interface User {
  id: string
  auth_id: string | null
  name: string
  email: string
  phone: string | null
  role: UserRole
  is_owner: boolean
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  name: string
  duration_hours: number | null
  duration_days: number | null
  total_fee: number | null
  description: string | null
  is_active: boolean
  created_at: string
}

export interface Batch {
  id: string
  course_id: string | null
  batch_name: string
  start_date: string | null
  end_date: string | null
  timing: string | null
  total_seats: number
  enrolled_count: number
  faculty_id: string | null
  status: 'upcoming' | 'ongoing' | 'completed'
  created_at: string
  course?: Course
  faculty?: User
}

export interface Lead {
  id: string
  full_name: string
  mobile: string
  email: string | null
  parent_name: string | null
  parent_contact: string | null
  city: string | null
  school_college: string | null
  class_year: string | null
  graduation_year: number | null
  graduation_degree: string | null
  interested_course_id: string | null
  source: LeadSource | null
  assigned_counselor_id: string | null
  status: LeadStatus
  priority: Priority
  temperature: LeadTemperature | null
  budget: number | null
  expected_joining_date: string | null
  lead_score: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  course?: Course
  counselor?: User
}

export interface LeadActivity {
  id: string
  lead_id: string
  activity_type: ActivityType
  description: string | null
  ai_summary: string | null
  duration_mins: number | null
  outcome: string | null
  created_by: string | null
  created_at: string
  creator?: User
}

export interface FollowUp {
  id: string
  lead_id: string
  scheduled_at: string
  type: FollowUpType
  notes: string | null
  assigned_to: string | null
  status: FollowUpStatus
  completed_at: string | null
  created_by: string | null
  created_at: string
  lead?: Lead
  assignee?: User
}

export interface Student {
  id: string
  lead_id: string | null
  student_id: string | null
  full_name: string
  email: string | null
  mobile: string
  parent_name: string | null
  parent_contact: string | null
  emergency_contact: string | null
  address: string | null
  city: string | null
  photo_url: string | null
  dob: string | null
  gender: string | null
  school_college: string | null
  course_id: string | null
  batch_id: string | null
  roll_number: string | null
  admission_date: string
  faculty_id: string | null
  certification_status: 'not_started' | 'in_progress' | 'completed' | 'issued'
  is_active: boolean
  created_at: string
  updated_at: string
  course?: Course
  batch?: Batch
}

export interface Fee {
  id: string
  student_id: string
  course_id: string | null
  total_fee: number
  discount: number
  scholarship: number
  registration_amount: number
  net_fee: number
  amount_paid: number
  pending_balance: number
  gst_applicable: boolean
  gst_percent: number
  created_at: string
  updated_at: string
  student?: Student
  course?: Course
}

export interface FeePayment {
  id: string
  fee_id: string
  student_id: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  transaction_id: string | null
  receipt_number: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
}

export interface Installment {
  id: string
  fee_id: string
  student_id: string
  installment_number: number
  amount: number
  due_date: string
  paid_date: string | null
  status: 'pending' | 'paid' | 'overdue'
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'follow_up' | 'fee_due' | 'new_lead' | 'task' | 'system'
  related_id: string | null
  is_read: boolean
  created_at: string
}

export interface Document {
  id: string
  entity_type: 'lead' | 'student'
  entity_id: string
  doc_name: string
  doc_url: string
  doc_type: string | null
  uploaded_by: string | null
  created_at: string
}

export interface Attendance {
  id: string
  student_id: string
  batch_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'holiday'
  marked_by: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

export interface Institution {
  id: string
  name: string
  type: InstitutionType
  address: string | null
  city: string | null
  contact_person: string | null
  contact_phone: string | null
  contact_email: string | null
  mou_status: MouStatus
  mou_expiry_date: string | null
  assigned_bdm_id: string | null
  created_at: string
  bdm?: User
}

export interface InstitutionMeeting {
  id: string
  institution_id: string
  meeting_date: string
  notes: string | null
  outcome: string | null
  created_by: string | null
  created_at: string
}

export interface InstitutionFollowUp {
  id: string
  institution_id: string
  scheduled_at: string
  notes: string | null
  status: FollowUpStatus
  assigned_to: string | null
  created_at: string
  assignee?: User
  institution?: Institution
}

export interface InstituteExpense {
  id: string
  category: ExpenseCategory
  amount: number
  expense_date: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface FeaturePermission {
  id: string
  feature_key: string
  role: string | null
  user_id: string | null
  can_view: boolean
  can_edit: boolean
  granted_by: string | null
  granted_at: string
}

export interface LeadFilters {
  status?: LeadStatus
  source?: LeadSource
  counselorId?: string
  courseId?: string
  priority?: Priority
  temperature?: LeadTemperature
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  pageSize?: number
}

export const LEAD_STATUSES: LeadStatus[] = [
  'new_lead', 'contacted', 'follow_up', 'demo_booked',
  'demo_attended', 'negotiation', 'registration_pending',
  'fee_pending', 'converted', 'lost',
]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  follow_up: 'Follow-up',
  demo_booked: 'Demo Booked',
  demo_attended: 'Demo Attended',
  negotiation: 'Negotiation',
  registration_pending: 'Registration Pending',
  fee_pending: 'Fee Pending',
  converted: 'Converted',
  lost: 'Lost',
}

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'college_visit', label: 'College Visit' },
  { value: 'other', label: 'Other' },
]