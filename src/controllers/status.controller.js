const PSAService = require('../../services/psaService');
const { ensureInitialized, getSheets } = require('../lib/sheets');

const psaService = new PSAService(process.env.PSA_API_KEY);

exports.getStatus = async (req, res) => {
  try {
    const psaStatus = psaService.getStatus();
    const googleSheetsStatus = getSheets().getStatus();

    let spreadsheetInfo = null;
    if (googleSheetsStatus.configured && googleSheetsStatus.spreadsheetId) {
      try {
        const sheets = await ensureInitialized();
        spreadsheetInfo = await sheets.getSpreadsheetInfo();
      } catch (e) {
        // ignore metadata fetch errors in status
      }
    }

    const enhancedGoogleSheetsStatus = {
      ...googleSheetsStatus,
      spreadsheetName: spreadsheetInfo?.title || null,
      sheetNames: spreadsheetInfo?.sheets || null
    };

    res.json({
      success: true,
      services: {
        psa: psaStatus,
        googleSheets: enhancedGoogleSheetsStatus
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
