const { Router } = require('express');
const {
  addToSheets,
  updateSpreadsheetConfig,
  saveScanHistory,
  loadScanHistory
} = require('../controllers/sheets.controller');

const router = Router();

router.post('/add-to-sheets', addToSheets);
router.get('/update-spreadsheet-config', updateSpreadsheetConfig);
router.post('/scan-history', saveScanHistory);
router.get('/scan-history', loadScanHistory);

module.exports = router;
