# Comprehensive Zero-Error Data Ingestion Plan

The previous ingestion script failed because it indiscriminately treated all 6 workbooks and all 40+ worksheets as "Leads", leading to fee structures and aggregate totals being imported as leads. Furthermore, it did not import actual enrolled students and fee records into the `students` and `fees` tables.

We will write a new, highly aggressive data categorization and ingestion engine.

## User Review Required

> [!CAUTION]
> **Total Database Wipe Before Ingestion**
> To ensure 0.0000% error and no duplicate or garbage data, the new script will completely wipe all existing records from the `leads`, `students`, `fees`, `fee_payments`, and `installments` tables in your Supabase database before running the fresh ingestion. This guarantees the CRM perfectly mirrors the Excel files.

## Proposed Changes

### Data Categorization & Strict Validation

We will separate the workbooks into their true data domains:

1. **Leads Domain** (`Leads for Kizen.xlsx`, `Data for Preeti.xlsx`, `Leads by Lakshaya Ma'am.xlsx`)
   - Will be parsed exclusively into the `leads` table.
   - **Validation:** Rows must have a valid Name OR a valid Phone. We will implement a strict blocklist for names (e.g., "16 and above", "total", "sr no", numbers) to ensure no garbage rows are ingested.
   - Leads marked as "Admitted", "Enrolled", "Joined", or "Paid" will be tagged as `converted` in the `leads` table.

2. **Students & Fees Domain** (`My students.xlsx`, `Fees Tracker.xlsx`)
   - Will be parsed into the `students`, `fees`, `installments`, and `fee_payments` tables.
   - **Validation:** We will extract the exact course, total fee amount, registration amount, pending amount, and installment schedules (Dates & Amounts).
   - If a student is found here, they will be registered as a definitive enrolled student in the CRM.

3. **Ignored Files** (`_Fee Structure- Kizen.xlsx`)
   - This file contains the generic fee structure (slabs) rather than actual student data. We will safely ignore it to prevent it from polluting the leads or students lists.

### Script Architecture

#### [MODIFY] `master-ingest-xlsx-fixed.mjs`
We will completely rewrite this script to:
1. **Wipe All Tables:** Clear `leads`, `students`, `fees`, `fee_payments`, and `installments`.
2. **Phase 1: Ingest Students & Fees:** Parse `Fees Tracker.xlsx` and `My students.xlsx`. Extract students, create their fee records, and map their installments.
3. **Phase 2: Ingest Leads:** Parse the remaining lead workbooks. Apply strict validation. If a lead's phone number matches a phone number already ingested as a Student in Phase 1, we will map them correctly or mark their lead status as `converted`.
4. **Error Reporting:** The script will output a precise tally of all skipped garbage rows and all successfully ingested Leads and Students.

## Verification Plan

### Automated Verification
- Run `node master-ingest-xlsx-fixed.mjs` and monitor the console output for exact row counts.
- Query Supabase via Node to confirm `leads`, `students`, and `fees` counts match the valid row counts from the Excel sheets.

### Manual Verification
- User to log in and check the **Leads**, **Students**, and **Fee Management** pages to confirm that garbage rows (like "16 and above") are gone and actual student/fee data is visible.
