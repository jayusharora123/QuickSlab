const { ensureInitialized, getSheets } = require('../lib/sheets');

exports.addToSheets = async (req, res) => {
  try {
    const { psaData } = req.body || {};
    if (!psaData) {
      return res.status(400).json({ success: false, error: 'PSA data is required' });
    }
    const sheets = await ensureInitialized();
    const result = await sheets.addCardData(psaData);
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('access denied') ? 403 :
                      error.message.includes('Invalid') ? 400 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
};

exports.updateSpreadsheetConfig = async (req, res) => {
  try {
    const { id: spreadsheetId, sheet: sheetName } = req.query;
    if (!spreadsheetId) {
      return res.status(400).json({ success: false, error: 'Spreadsheet ID is required' });
    }
    const sheets = getSheets();
    sheets.updateConfig(spreadsheetId, sheetName);
    res.json({ success: true, message: 'Spreadsheet configuration updated', spreadsheetId, sheetName: sheetName || 'Input Sheet' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.saveScanHistory = async (req, res) => {
  try {
    const { certNumber, cardData, status, timestamp } = req.body || {};
    if (!certNumber || !status || !timestamp) {
      return res.status(400).json({ success: false, error: 'Missing required fields: certNumber, status, timestamp' });
    }
    const sheets = await ensureInitialized();
    const result = await sheets.saveScanHistory(certNumber, cardData, status, timestamp);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.loadScanHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const sheets = await ensureInitialized();
    const history = await sheets.loadScanHistory(limit);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, history: [] });
  }
};
