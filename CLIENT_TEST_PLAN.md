# Kizen Education CRM — Testing & Delivery Plan

**Live Preview:** https://kizencrm.netlify.app

---

Hello Team,

The Kizen Education CRM is now live for preview and testing. Below is the complete plan covering design review, workflow testing, and pre-launch requirements.

---

## Phase 1 — Design & Layout Review (Days 1–2)

Please test with all 4 accounts and share visual feedback.

### Test Accounts
| Role | Email | Password |
|------|-------|----------|
| **Owner** | shivam.kizen.test@gmail.com | Shivam@123 |
| **Counselor** | counselor.kizen@gmail.com | Counselor@123 |
| **Accounts** | accounts.kizen@gmail.com | Accounts@123 |
| **Reception** | reception.kizen@gmail.com | Reception@123 |

### What to Check
- **Login page** — gradient background, centered card layout
- **Sidebar** — indigo (#1E3A8A) theme, amber (#F59E0B) accents, smooth collapse on mobile
- **Dashboards** — Each role has a dedicated dashboard:
  - Owner → Full dashboard with stats, charts (bar/line/pie), revenue & fees
  - Counselor → My Dashboard with personal pipeline
  - Accounts → Finance Dashboard with revenue, pending fees, quick actions
  - Reception → Front Desk Dashboard with leads today, quick actions
- **Typography** — Inter font, consistent heading sizes
- **Colors** — Primary indigo, accent amber, success green (#10B981)
- **Mobile** — Hamburger menu on small screens, tables scroll horizontally
- **Loading states** — Skeleton loaders on cards & tables
- **Empty states** — Helpful illustrations when no data

---

## Phase 2 — Operations & Workflow Testing (Days 3–5)

### How Data Enters the System

**A) Manual Entry (via CRM UI)**
| Task | Where | Who |
|------|-------|-----|
| Add a new lead | Leads → Add Lead → fill name, mobile, course, source | Reception / Counselor |
| Update lead status | Lead Detail → click pipeline stage (New → Contacted → Interested → Demo → Admitted) | Counselor |
| Schedule follow-up | Lead Detail or Follow-ups page → Schedule → pick date/time/type | Counselor |
| Convert lead to student | Lead Detail → Convert to Student → select batch | Counselor / Owner |
| Record payment | Fees → select student → Record Payment → amount, mode, date | Accounts |
| Create fee record | Student Detail → Fees tab → Create Fee | Accounts / Owner |
| Add course or batch | Settings → Courses / Batches → Add | Owner |
| Invite team member | Settings → Users → Invite User → email & role | Owner |

**B) Bulk Import (Available on Request)**
- Existing data from Excel, CSV, or Google Sheets can be imported
- Coverage: Leads, Students, Historical Fees, Installments
- We can build a dedicated import page or handle via backend script

**C) Automations Included**
| Feature | Description |
|---------|-------------|
| Overdue Detection | Hourly check → marks overdue follow-ups & installments → creates notifications |
| Receipt Generation | Auto receipt number & PDF data when payment is recorded |
| Student ID | Auto KIZ-YYYY-NNN format on admission |
| Fee Sync | Paid installments auto-update fee records |
| Notifications | Overdue items trigger bell icon alerts |

**D) Future Automations (Can Be Added)**
- Welcome emails for new students
- SMS reminders for follow-ups & due dates
- WhatsApp notifications

### Test Scenarios
| # | Scenario | Steps |
|---|----------|-------|
| 1 | **Lead Pipeline** | Login as Counselor → Leads → Add Lead → Move through stages (new → contacted → interested → demo → admitted) |
| 2 | **Convert to Student** | Admitted lead → Convert → Verify student ID format |
| 3 | **Fee Creation** | Student Detail → Fees → Create Fee |
| 4 | **Payment Recording** | Fees → Record Payment → ₹25,000 via UPI |
| 5 | **Installments** | Create installment plan → Mark as paid |
| 6 | **Follow-ups** | Schedule → Mark complete → Check overdue tab |
| 7 | **WhatsApp** | Lead Detail → WhatsApp button |
| 8 | **Reports** | Owner only → View 5 report cards → Export to Excel |
| 9 | **Users** | Settings → Invite → Deactivate → Reactivate |
| 10 | **Notifications** | Bell icon → Badge count → Read notification |

---

## Phase 3 — Pre-Launch Checklist (Day 7)

Before final deployment, we need your inputs on:

### 1. Domain & Hosting
- Custom domain? (e.g., crm.kizen.in) — I can configure it
- Netlify is live now. Prefer Vercel or self-hosted?

### 2. Branding
- Institute logo for sidebar/header? (currently shows "K")
- WhatsApp Business number for lead communication?
- Email templates for invitations & student communication?
- Color theme — current indigo/amber works or your brand colors?

### 3. Dark Mode
- Not built yet. Can be added after launch (2–3 days effort)
- Toggle via system preference + manual switch in header

### 4. Data Import
- Do you have existing student/lead data in Excel, CSV, or Google Sheets?
- Should we wipe the current test data before go-live?
- Need a Google Sheets integration for live sync?

### 5. Integrations
- Payment gateway? (Currently manual UPI/Cash — Razorpay/Stripe can be added)
- SMS gateway for reminders? (Twilio, MSG91)
- Google Calendar for demo scheduling?
- WhatsApp Business API for automated messages?

### 6. Operations Setup
- How many users per role? (Admin, Counselor, Accounts, Reception)
- Course catalog — current seeds are AI Foundations (₹45K), AI Apps (₹25K), Digital Marketing (₹20K), Vibe Coding (₹15K). Correct?
- Batch structure? (e.g., 2026 Batch 1, Batch 2...)
- Fee rules? Installments, discounts, late fees?

### 7. Compliance & Security
- Data retention policy for past students?
- Backup frequency preference?
- Any privacy/consent requirements?

---

We'll review Phase 1 feedback first, then move through Phases 2 and 3. The full cycle is 7 days. Any Phase 4 enhancements (Dark Mode, Payment Gateway, Google Sheets Import, SMS) will be scoped separately after launch.

**Preview:** https://kizencrm.netlify.app

Looking forward to your feedback!

---
*Kizen Education CRM — Build v1.0*