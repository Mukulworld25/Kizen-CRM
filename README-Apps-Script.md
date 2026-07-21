# Kizen CRM — Google Sheets Live Sync Setup Guide

This guide explains how to connect any Google Sheet or Google Form responses spreadsheet to Kizen CRM in less than 3 minutes.

---

## Prerequisites
1. Access to the target Google Sheet.
2. A generated **Webhook Secret** from Kizen CRM (**Settings** -> **Data Intake** -> **Google Sheets Connections**).
3. The exact column headers required for your CRM section:

### Required Header Format Reference

#### 1. Leads Section (`leads`)
- **Required Columns**: `full_name`, `mobile`
- **Optional Columns**: `email`, `parent_name`, `parent_contact`, `city`, `school_college`, `class_year`, `graduation_year`, `graduation_degree`, `source`, `status`, `priority`, `notes`
- **Deduplication Key**: `mobile` + `email`

#### 2. Finance Section (`institute_expenses`)
- **Required Columns**: `category`, `amount`, `expense_date`, `vendor`
- **Optional Columns**: `notes`
- **Deduplication Key**: `expense_date` + `amount` + `category` + `vendor`

#### 3. Institutions Section (`institutions`)
- **Required Columns**: `name`, `type`
- **Optional Columns**: `address`, `city`, `contact_person`, `contact_phone`, `contact_email`, `mou_status`
- **Deduplication Key**: `name` + `type`

---

## Step-by-Step Setup Instructions

1. **Open Apps Script Editor**:
   - Open your Google Sheet.
   - Click **Extensions** -> **Apps Script** in the top menu bar.

2. **Paste Code**:
   - Delete any placeholder code in `Code.gs`.
   - Copy and paste the entire contents of `KizenSheetSync.gs` into `Code.gs`.

3. **Set Webhook Secret**:
   - Locate `var SHARED_WEBHOOK_SECRET = "YOUR_SHEET_WEBHOOK_SECRET_HERE";` at the top of the file.
   - Replace `"YOUR_SHEET_WEBHOOK_SECRET_HERE"` with the secret token generated in Kizen CRM Settings.

4. **Add Trigger for Automatic Sync**:
   - In the Apps Script left sidebar, click **Triggers** (alarm clock icon).
   - Click **+ Add Trigger** (bottom right).
   - Configure trigger parameters:
     - **Choose which function to run**: `onFormSubmitOrEdit`
     - **Select event source**: `From spreadsheet`
     - **Select event type**: `On form submit` (for Google Forms) OR `On edit` (for direct spreadsheet edits).
   - Click **Save** and grant permissions if prompted.

5. **Test Manual Sync**:
   - Refresh your Google Sheet.
   - A new menu item **Kizen CRM Sync** will appear.
   - Click **Kizen CRM Sync** -> **Sync Now to Kizen CRM**.
   - Check Kizen CRM **Settings** -> **Data Intake** -> **Audit Log** to verify the rows imported!
