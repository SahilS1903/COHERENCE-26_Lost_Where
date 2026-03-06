# Lead Import Guide

## Overview
You can now import leads into your workflows using CSV or Excel files! This feature makes it easy to bulk-import your contact lists.

## How to Import Leads

### 1. **Via File Upload (Recommended)**
- Go to the **Lead Tracker** page
- Click the **"Import Leads"** button
- Select your target workflow
- Choose **"Upload File"** tab
- Drag and drop or click to upload your CSV/Excel file
- Preview the first 5 rows to verify the data
- Click **"Import Leads"** to complete the import

### 2. **Via Text Paste**
- Go to the **Lead Tracker** page
- Click the **"Import Leads"** button
- Select your target workflow
- Choose **"Paste Data"** tab
- Paste your CSV data or JSON array
- Click **"Import Leads"**

## Supported File Formats
- **CSV** (.csv)
- **Excel** (.xlsx, .xls)
- Maximum file size: **10MB**

## Required Fields
Your file must include these columns:
- ✅ **email** (required) - Valid email address
- ✅ **firstName** (required) - Contact's first name

## Optional Fields
- **lastName** - Contact's last name
- **company** - Company name
- Any other columns will be stored as **customFields**

## Column Name Variations
The system recognizes multiple formats for standard fields (case-insensitive):
- Email: `email`, `Email`, `EMAIL`
- First Name: `firstName`, `FirstName`, `first_name`, `First Name`
- Last Name: `lastName`, `LastName`, `last_name`, `Last Name`
- Company: `company`, `Company`, `COMPANY`

## CSV Format Example
```csv
email,firstName,lastName,company
john.doe@example.com,John,Doe,Acme Corp
jane.smith@tech.com,Jane,Smith,Tech Innovations
bob.wilson@startup.io,Bob,Wilson,Startup Labs
```

## Excel Format Example
Create a spreadsheet with headers in the first row:

| email | firstName | lastName | company |
|-------|-----------|----------|---------|
| john.doe@example.com | John | Doe | Acme Corp |
| jane.smith@tech.com | Jane | Smith | Tech Innovations |

## Custom Fields
Any additional columns in your file will be automatically stored as custom fields. For example:

```csv
email,firstName,lastName,company,phone,industry,revenue
john@example.com,John,Doe,Acme Corp,555-0100,SaaS,$2M
```

The `phone`, `industry`, and `revenue` columns will be stored in the `customFields` object for each lead.

## Import Behavior
- **Upsert Logic**: If a lead with the same email already exists in the workflow, it will be updated with the new data
- **Validation**: All rows must have valid email addresses and first names
- **Status**: Imported leads are set to `ACTIVE` status by default
- **Workflow Assignment**: Leads are immediately assigned to the selected workflow

## Tips for Success
1. ✅ Use the provided `sample-leads-template.csv` file as a starting point
2. ✅ Keep email addresses unique within each workflow
3. ✅ Clean your data before importing (remove duplicates, invalid emails)
4. ✅ Test with a small batch first (5-10 leads) before importing large lists
5. ✅ Check the preview before confirming the import

## Troubleshooting

### "No valid leads found in file"
- Make sure your file has the required headers: `email` and `firstName`
- Check that you have at least one row of data (not just headers)
- Verify that email addresses are valid

### "Invalid file type"
- Ensure your file has the correct extension (.csv, .xlsx, or .xls)
- If you have a .txt file, rename it to .csv

### "Parse Error"
- Check for special characters or encoding issues
- Try saving your Excel file as CSV and upload that instead
- Make sure your CSV is properly formatted (commas as delimiters)

### Duplicate Emails
- Leads are upserted by email within each workflow
- If an email already exists, the lead data will be updated
- To avoid unintended updates, clean your data first

## API Endpoint
For programmatic access:
```
POST /api/workflows/:workflowId/leads/upload-file
Content-Type: multipart/form-data
Authorization: Bearer <token>

Field: file (CSV or Excel file)
```

## Sample Template
Download the sample template file from the project root:
- `sample-leads-template.csv`

Happy importing! 🚀
