# Google Sheets Integration Setup Guide

## Overview
This guide will help you set up Google Sheets integration so that scanned PSA card data can be automatically added to your Google spreadsheet.

## Prerequisites
- Your Google spreadsheet is already created at: https://docs.google.com/spreadsheets/d/1vusAwg71Q0JiYj1Ab9ryCRLee_slUhSCQygs5e2Ygwc/edit
- Google Cloud Console access

## Step 1: Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note the project ID

## Step 2: Enable Google Sheets API
1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Sheets API"
3. Click on it and enable it

## Step 3: Create Service Account
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in:
   - Service account name: `psa-scanner-service`
   - Service account ID: `psa-scanner-service`
   - Description: `Service account for PSA card scanner to access Google Sheets`
4. Click "Create and Continue"
5. Skip the optional steps (roles and user access)
6. Click "Done"

## Step 4: Create Service Account Key
1. Click on the service account you just created
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Click "Create"
6. Save the downloaded JSON file as `google-service-account.json` in the backend-example folder

## Step 5: Share Your Spreadsheet
1. Open your Google spreadsheet
2. Click "Share" in the top right
3. Add the service account email (found in the JSON file under "client_email")
4. Give it "Editor" permissions
5. Click "Send"

## Step 6: Update Your Environment
Your `.env` file is already configured with:
```
GOOGLE_SPREADSHEET_ID=1vusAwg71Q0JiYj1Ab9ryCRLee_slUhSCQygs5e2Ygwc
GOOGLE_SERVICE_ACCOUNT_KEY=./google-service-account.json
```

Make sure the `google-service-account.json` file is in your backend-example folder.

## Step 7: Test the Integration
1. Start your server: `npm start`
2. Open the scanner interface: http://localhost:3000/scanner-interface.html
3. Test with a PSA certificate number (like 82513373)
4. Click "Add to Google Sheets" after a successful lookup

## Column Mapping
Your spreadsheet will be populated as follows:
- Column A: (empty)
- Column B: Subject (Card Name)
- Column C: Card Number
- Column D: "Graded" (static)
- Column E: "Yes" (static)
- Column F: "PSA" (static)
- Column G: Numeric Grade (e.g., 10)
- Column H: Certificate Number

## Troubleshooting
- Make sure the service account email has access to your spreadsheet
- Check that the Google Sheets API is enabled in your Google Cloud project
- Verify the service account JSON file is in the correct location
- Check the server console for any error messages

## Security Notes
- Keep your `google-service-account.json` file secure and never commit it to version control
- The service account only has access to spreadsheets you explicitly share with it