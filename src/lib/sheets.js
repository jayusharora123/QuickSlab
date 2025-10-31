const GoogleSheetsService = require('../../services/googleSheetsService');

let sheetsInstance = null;

function getSheets() {
  if (!sheetsInstance) {
    sheetsInstance = new GoogleSheetsService({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      sheetName: process.env.GOOGLE_SHEET_NAME || 'Input Sheet',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    });
  }
  return sheetsInstance;
}

async function ensureInitialized() {
  const svc = getSheets();
  if (!svc.getStatus().initialized) {
    await svc.initialize();
  }
  return svc;
}

module.exports = { getSheets, ensureInitialized };
