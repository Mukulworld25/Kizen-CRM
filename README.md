# Kizen CRM — Phase 3: Structured Data Auto-Intake System

Live production CRM for Kizen Education with strict rule-based data intake.

---

## 🔒 Data Intake Locked Template Reference

Zero AI/LLM involvement. Zero tolerance for silent misfiling. Every uploaded CSV, Excel spreadsheet, or Google Sheet must match one of these 3 locked template header formats **EXACTLY** (case-insensitive, whitespace-trimmed). If a single required header is missing or an unknown header is present, the batch is rejected 100%.

### 1. Leads Section (`leads`)
- **Required Columns**: `full_name`, `mobile`
- **Optional Columns**: `email`, `parent_name`, `parent_contact`, `city`, `school_college`, `class_year`, `graduation_year`, `graduation_degree`, `source`, `status`, `priority`, `notes`
- **Allowed Values**:
  - `status`: `new_lead`, `contacted`, `follow_up`, `demo_booked`, `demo_attended`, `negotiation`, `registration_pending`, `fee_pending`, `converted`, `lost`
  - `source`: `instagram`, `facebook`, `walk_in`, `referral`, `website`, `whatsapp`, `college_visit`, `other`
  - `priority`: `high`, `medium`, `low`
- **Deduplication Scope**: `mobile` + `email`

### 2. Finance Section (`institute_expenses`)
- **Required Columns**: `category`, `amount`, `expense_date`, `vendor`
- **Optional Columns**: `notes`
- **Allowed Values**:
  - `category`: `rent`, `salaries`, `electricity`, `marketing`, `misc`
- **Deduplication Scope**: `expense_date` + `amount` + `category` + `vendor`

### 3. Institutions Section (`institutions`)
- **Required Columns**: `name`, `type`
- **Optional Columns**: `address`, `city`, `contact_person`, `contact_phone`, `contact_email`, `mou_status`
- **Allowed Values**:
  - `type`: `school`, `college`
  - `mou_status`: `not_started`, `in_discussion`, `signed`, `expired`
- **Deduplication Scope**: `name` + `type`

---

## 🚀 Intake Channels & Features

1. **Manual CSV/XLSX Upload**: Available under **Settings** -> **Data Intake**. Features instant client-side header verification + atomic server-side RPC validation (`process_intake_batch`).
2. **Google Sheets Live Sync**: Edge Function endpoint `sheet-webhook-intake` using shared secret header `x-webhook-secret`. Includes Google Apps Script in `google_apps_script/KizenSheetSync.gs`.
3. **Ad Platform Sync Scaffolding**: Settings section for Meta Ads and Google Ads showing "Pending API Approval" until developer tokens are linked.
4. **Master Intake Toggles**: Single table `data_intake_settings` with 4 switches. Disabled sources reject immediately with an explicit error message.
