# Kizen Education CRM — Client Test Plan

**Live URL:** https://kizencrm.netlify.app  
**Status:** Under Active Testing (7-Day Review Cycle)

---

## Phase 1 — Design & Layout Review (Days 1–2)

### Visual Checklist
| # | Item | Status |
|---|------|--------|
| 1 | **Login Page** — Gradient background, branded card, centered layout | ⬜ |
| 2 | **Sidebar** — Indigo (#1E3A8A) theme, amber (#F59E0B) accent, smooth collapse animation | ⬜ |
| 3 | **Dashboard** — Stats cards, charts (bar/line/pie), responsive grid | ⬜ |
| 4 | **Typography** — Inter font, consistent heading/body hierarchy | ⬜ |
| 5 | **Spacing & Rounded Corners** — Cards (rounded-xl), buttons (rounded-lg), consistent padding | ⬜ |
| 6 | **Color System** — Primary indigo, accent amber, success green (#10B981), danger red | ⬜ |
| 7 | **Mobile Responsiveness** — Hamburger menu, sidebar overlay, table horizontal scroll | ⬜ |
| 8 | **Empty States** — All pages show helpful empty state illustrations | ⬜ |
| 9 | **Loading States** — Skeleton loaders on cards, tables, and charts | ⬜ |
| 10 | **Transitions** — Smooth hover effects, page transitions, sidebar toggle | ⬜ |

### Role-Specific Layout Test
| Role | Pages Visible | Pages Blocked |
|------|-------------|---------------|
| **Owner** (shivam.kizen.test@gmail.com) | All 7 pages | None |
| **Counselor** (counselor.kizen@gmail.com) | Dashboard, Leads, Follow-ups, Students | Fees, Reports, Settings |
| **Accounts** (accounts.kizen@gmail.com) | Dashboard, Students, Fees | Leads, Reports, Settings |
| **Reception** (reception.kizen@gmail.com) | Dashboard, Leads, Courses | Students, Fees, Reports, Settings |

---

## Phase 2 — Operations & Integration Testing (Days 3–5)

### Functional Checklist
| # | Scenario | Steps |
|---|----------|-------|
| 1 | **Lead Pipeline** | Create lead → Contacted → Interested → Demo Scheduled → Demo Attended → Admitted |
| 2 | **Convert to Student** | Admitted lead → Convert → Verify student ID (KIZ-YYYY-NNN) |
| 3 | **Fee Creation** | Student enrolled → Fee record created → Verify total/net amounts |
| 4 | **Payment Recording** | Record UPI/Cash payment → Verify receipt modal → Check balance |
| 5 | **Installment Tracking** | Create installment plan → Mark paid → Verify overdue detection |
| 6 | **Follow-up System** | Schedule follow-up → Mark complete → Check overdue tab |
| 7 | **WhatsApp Integration** | Click WhatsApp button → Verify correct number + message template |
| 8 | **Reports (Owner only)** | View 5 report cards → Export to Excel → Verify data accuracy |
| 9 | **User Management** | Invite user → Verify email → Deactivate user → Reactivate |
| 10 | **Notifications** | Trigger overdue → Check bell icon badge → Read notification |

### Integration Points
- **Supabase Realtime** — Dashboard updates live when data changes
- **Auth System** — Login/logout, session persistence, role-based redirects
- **Edge Functions** — `mark-overdue` (hourly cron), `invite-user` (admin only)

---

## Phase 3 — Final Delivery (Day 7)

### Pre-Deployment Client Questions

1. **Platform & Domain**
   - Do you have a custom domain? (e.g., crm.kizen.in)
   - Preferred hosting: Netlify (current) or Vercel or self-hosted?
   - SSL certificate — auto-provisioned or custom?

2. **Branding & Content**
   - Institute logo for sidebar/header?
   - WhatsApp business number for lead communication?
   - Email templates for user invitations?

3. **Data & Migration**
   - Any existing student/lead data to import? (Excel/CSV format)
   - Do you need a data wipe before go-live? (Current seed data is for testing)

4. **Integrations**
   - Payment gateway integration? (Razorpay/Stripe — currently manual UPI/Cash)
   - SMS gateway for follow-up reminders?
   - Google Calendar sync for demo scheduling?

5. **Operations**
   - Number of admin/counselor/accounts users needed?
   - Course catalog — is the current 4-course seed data correct?
   - Batch management — academic year structure?

6. **Compliance & Security**
   - Data retention policy for student records?
   - Backup frequency required?
   - Any specific privacy/consent requirements?

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| **Owner** | shivam.kizen.test@gmail.com | Shivam@123 |
| **Counselor** | counselor.kizen@gmail.com | Counselor@123 |
| **Accounts** | accounts.kizen@gmail.com | Accounts@123 |
| **Reception** | reception.kizen@gmail.com | Reception@123 |

---

**Next Steps:** Please review Phase 1 (Design & Layout) and share feedback. Phase 2 testing will begin after your approval. The CRM is under active testing for the next 7 days before final delivery.

**Sample Preview:** https://kizencrm.netlify.app