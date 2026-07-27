# KIZEN EDUCATION CRM — MASTER BUILD PROMPT FOR CURSOR

Paste this entire document into Cursor's Agent mode as the first message. Do not skip any section — this is the full client context, not just a technical spec.

---

## 1. WHO THIS IS FOR (Client Context)

- **Client:** Kizen Education — coaching institute in Chandigarh
- **Address:** SCO 193-195, Sector 34-A, Chandigarh 160022
- **Contact/Owner:** Shivam
- **Website:** kizeneducation.com
- **What they do:** Coaching for college students — B.Com, BBA, MBA, M.Com, BA — in Chandigarh
- **Why this CRM exists:** Shivam currently manages leads, student admissions, and fees manually. This CRM replaces that with a proper system: track a lead from first contact → conversion → enrolled student → fee payments, plus reporting for the business owner.
- **This is a real paid client project**, not a demo. Budget: Rs 40,000. Timeline: 1 week. It must be production-usable, not a prototype.

## 2. STACK (Do not deviate)

- Frontend: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Charts: Recharts
- Backend/DB/Auth: Supabase (Postgres + Row Level Security + Realtime + Storage)
- Deployment target: Vercel
- Design inspiration: LeadSquared India (clean, data-dense, professional CRM look — not generic dashboard templates)

## 3. CLOUD SETUP — DO THIS FIRST, BEFORE WRITING APP CODE

1. Confirm a Supabase project exists and is linked (project URL + anon key available in `.env`). If not created yet, tell me exactly what to click to create one — I am not a developer, so give literal step-by-step instructions, not just "set up Supabase."
2. Run the full schema (tables, extensions, sample courses) in Supabase SQL Editor.
3. Apply **every** RLS policy listed in Section 6 below — not partial, not "will add later." A table with RLS enabled but no policy silently blocks all access, which breaks the app in production. This must not happen.
4. Add the auth → users sync trigger (Section 7) so every login automatically has a matching profile row.
5. Seed Shivam as Owner manually after he creates his login (I will provide his email).
6. Enable Realtime on: `leads`, `follow_ups`, `fee_payments`, `notifications`.
7. Create a Storage bucket for documents/avatars with correct access policies.
8. Only after all of the above is verified working — start frontend work.

## 4. USERS & ROLES (6 roles, max 10 users total)

| Role | Access |
|---|---|
| **Owner (Shivam, 1 seat, fixed)** | Full CRUD everywhere. Only role that can export data (Excel) and see full real-time revenue/insights. Cannot be deactivated by anyone. |
| Admin | Full CRUD except owner-exclusive exports/insights |
| Counselor | Full CRUD only on their own assigned leads/follow-ups/converted students |
| Faculty | Read own batches, mark attendance only |
| Accounts | Fees & payments CRUD only. **Must NOT see leads at all.** |
| Reception | Read leads (status only) + can add new leads. Cannot update/delete. |

## 5. MODULES (all required)

1. **Dashboard** — role-specific views (Owner/Admin see full picture, others see their own scope). Realtime widgets.
2. **Leads** — list, filters, add lead modal, detail view, 12-stage pipeline (new → contacted → follow_up_required → demo_scheduled → demo_attended → interested → negotiation → application_started → admitted → lost → not_interested → future_prospect), activity log, convert-to-student action, Owner-only Excel export.
3. **Follow-ups** — Today / Overdue / Upcoming / All views, WhatsApp and call quick-actions.
4. **Students** — list + detail tabs: profile, attendance calendar, fees, progress. Student ID auto-generated as `KIZ-2026-001` format.
5. **Fee Management** — KPIs, record payment, installment tracking, printable receipts (`RCPT-YYYYMMDD-NNN` auto-generated), auto-sync of amount paid vs pending balance.
6. **Reports** (Owner only) — 5 report cards with Excel export.
7. **Settings** (Owner only) — user management (invite/deactivate, respecting 10-user cap and owner-protection rule), course management, batch management.
8. Global search (Ctrl+K), in-app notifications, mobile-responsive sidebar, loading skeletons, toast messages throughout.

## 6. REQUIRED RLS POLICIES (apply ALL of these — this list is the actual security layer, not the UI)

Build policies so the access map below is enforced at the database level for every table:

| Table | Owner | Admin | Counselor | Faculty | Accounts | Reception |
|---|---|---|---|---|---|---|
| users | CRUD | Read all | Read self | Read self | Read self | Read self |
| courses | CRUD | Read | Read | Read | Read | Read |
| batches | CRUD | Read | Read | Own batches | Read | — |
| leads | CRUD | CRUD | Own assigned | — | **no access** | Read + Insert only |
| lead_activities | CRUD | CRUD | Own leads | — | — | Read own leads |
| follow_ups | CRUD | CRUD | Own assigned | — | — | — |
| students | CRUD | CRUD | Own conversions | Own batches | Read | Read basic |
| attendance | CRUD | CRUD | — | Insert/read own batch | — | — |
| fees / installments | CRUD | Read | — | — | CRUD | — |
| fee_payments | CRUD | Read | — | — | CRUD | — |
| tasks | CRUD | CRUD | Own assigned | Own assigned | — | — |
| notifications | — | — | Own rows | Own rows | Own rows | Own rows |
| audit_logs | Read | — | — | — | — | — |
| documents | CRUD | CRUD | Own entities | Own students | — | Lead docs |

Also required:
- `users`, `follow_ups`, `fee_payments`, `tasks` currently have RLS enabled with **zero policies** in the base schema — this breaks the app completely (no policy = no access for anyone). Fix this first.
- `courses`, `batches`, `lead_activities`, `documents`, `attendance`, `installments`, `notifications` have no RLS at all in the base schema — this leaves them wide open. Enable RLS + policies on all of them.
- Remove `accounts` from any policy on `leads` — Accounts must never see leads, per client requirement.
- Helper functions `get_user_role()` and `is_owner()` must use `SECURITY DEFINER` with `SET search_path = public` locked, to prevent privilege escalation.
- `audit_logs` needs an INSERT policy too (not just Owner SELECT), otherwise no audit rows can ever be created, or alternatively route all inserts through a service-role Edge Function.

## 7. REQUIRED TRIGGERS / AUTOMATION

- Auth sync: every new `auth.users` row automatically creates a matching `public.users` profile row (default role: counselor, until manually promoted).
- Student ID auto-generation: `KIZ-YYYY-NNN` sequence on student insert.
- Receipt number auto-generation: `RCPT-YYYYMMDD-NNN` on fee_payments insert.
- Fee sync: on payment insert, update the parent `fees.amount_paid` automatically.
- Batch enrolled_count auto-updates when a student is assigned.
- Owner protection: trigger prevents `is_active = false` being set on the Owner row.
- 10-user cap: trigger or check constraint blocking an 11th user insert.
- Overdue detection (installments + follow-ups): scheduled Edge Function or pg_cron job, not just app-side logic.

## 8. IMPORTANT TECHNICAL NOTES

- `auth.uid()` is NOT the same as `users.id`. Every query needs to resolve the logged-in user's profile row first (`SELECT * FROM users WHERE auth_id = auth.uid()`), then use `profile.id` for `assigned_counselor_id`, `created_by`, etc. Get this wrong and role-based access silently fails.
- Add indexes for performance: on `leads.assigned_counselor_id`, `leads.status`, `leads.mobile`, `follow_ups.scheduled_at + status`, `students.student_id`, `fee_payments.student_id`, `notifications.user_id where is_read = false`.
- No pricing or money amounts should appear anywhere except inside the Fees module itself (not in marketing-facing screens, if any exist).

## 9. BUILD ORDER (follow this order, confirm each step works before moving to the next)

1. Supabase cloud setup complete + verified (Section 3)
2. All RLS policies applied + verified with a real test login per role
3. Auth sync trigger + Owner seeded
4. Business logic triggers (Section 7)
5. Indexes
6. Frontend: Auth/login → Dashboard shell → Leads → Follow-ups → Students → Fees → Reports → Settings
7. Final: mobile responsiveness pass, loading states, error handling, deploy to Vercel

## 10. WHAT "DONE" MEANS — DO NOT REPORT A MODULE AS COMPLETE UNLESS:

- It builds with zero errors (`npm run build`)
- The relevant Supabase tables exist and are visible in Table Editor
- RLS policies for that module are visible under Authentication → Policies
- A real test login for each affected role was used to confirm correct access (not just Owner)
- At least one real record was created and correctly appears/restricts as expected

Do not claim a module is "implemented" based on writing the code alone. Verify against real data in the actual Supabase project before reporting status back to me.
