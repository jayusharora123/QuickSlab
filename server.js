require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import our services
const PSAService = require('./services/psaService');
const GoogleSheetsService = require('./services/googleSheetsService');

/**
 * PSA Card Scanner - Inventory System
 * Express server providing API endpoints for PSA card lookup and Google Sheets integration
 */

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(__dirname));

// Initialize services
const psaService = new PSAService(process.env.PSA_API_KEY);
const googleSheetsService = new GoogleSheetsService({
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
  sheetName: process.env.GOOGLE_SHEET_NAME || 'Input Sheet',
  serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
});

// API Routes

/**
 * PSA Certificate Lookup
 * GET /api/cert/:certNumber
 */
app.get('/api/cert/:certNumber', async (req, res) => {
  try {
    const { certNumber } = req.params;
    const data = await psaService.getCertificateData(certNumber);
    
    res.json({
      success: true,
      PSACert: data
    });
    
  } catch (error) {
    console.error('PSA lookup error:', error.message);
    
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('authentication') ? 401 :
                      error.message.includes('rate limit') ? 429 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Add Card Data to Google Sheets
 * POST /api/add-to-sheets
 */
app.post('/api/add-to-sheets', async (req, res) => {
  try {
    const { psaData } = req.body;
    
    if (!psaData) {
      return res.status(400).json({ 
        success: false,
        error: 'PSA data is required' 
      });
    }

    // Initialize Google Sheets if not already done
    if (!googleSheetsService.getStatus().initialized) {
      await googleSheetsService.initialize();
    }

    // Add the card data to Google Sheets
    const result = await googleSheetsService.addCardData(psaData);
    res.json(result);
    
  } catch (error) {
    console.error('Google Sheets error:', error.message);
    
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('access denied') ? 403 :
                      error.message.includes('Invalid') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update Spreadsheet Configuration
 * GET /api/update-spreadsheet-config?id=...&sheet=...
 */
app.get('/api/update-spreadsheet-config', async (req, res) => {
  try {
    const { id: spreadsheetId, sheet: sheetName } = req.query;
    
    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        error: 'Spreadsheet ID is required'
      });
    }

    // Update the configuration
    googleSheetsService.updateConfig(spreadsheetId, sheetName);
    
    res.json({
      success: true,
      message: 'Spreadsheet configuration updated',
      spreadsheetId,
      sheetName: sheetName || 'Input Sheet'
    });
    
  } catch (error) {
    console.error('Config update error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Service Status Check
 * GET /api/status
 */
app.get('/api/status', async (req, res) => {
  try {
    const psaStatus = psaService.getStatus();
    const googleSheetsStatus = googleSheetsService.getStatus();
    
    // Try to get the actual spreadsheet name if Google Sheets is configured
    let spreadsheetInfo = null;
    if (googleSheetsStatus.configured && googleSheetsStatus.spreadsheetId) {
      try {
        if (!googleSheetsService.getStatus().initialized) {
          await googleSheetsService.initialize();
        }
        spreadsheetInfo = await googleSheetsService.getSpreadsheetInfo();
      } catch (error) {
        console.warn('Could not fetch spreadsheet info:', error.message);
      }
    }
    
    // Enhance Google Sheets status with spreadsheet name
    const enhancedGoogleSheetsStatus = {
      ...googleSheetsStatus,
      spreadsheetName: spreadsheetInfo?.title || null
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
    console.error('Status check error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Save Scan History Entry
 * POST /api/scan-history
 */
app.post('/api/scan-history', async (req, res) => {
  try {
    const { certNumber, cardData, status, timestamp } = req.body;
    
    if (!certNumber || !status || !timestamp) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: certNumber, status, timestamp'
      });
    }

    // Initialize Google Sheets if not already done
    if (!googleSheetsService.getStatus().initialized) {
      await googleSheetsService.initialize();
    }

    const result = await googleSheetsService.saveScanHistory(certNumber, cardData, status, timestamp);
    res.json(result);

  } catch (error) {
    console.error('Save scan history error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Load Scan History
 * GET /api/scan-history
 */
app.get('/api/scan-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    // Initialize Google Sheets if not already done
    if (!googleSheetsService.getStatus().initialized) {
      await googleSheetsService.initialize();
    }

    const history = await googleSheetsService.loadScanHistory(limit);
    res.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('Load scan history error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      history: [] // Return empty array so frontend doesn't break
    });
  }
});

/**
 * Health Check
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Scanner Interface Route
 * GET /
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'scanner-interface.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 PSA Card Scanner - Inventory System');
  console.log('=' .repeat(50));
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('📋 API Endpoints:');
  console.log(`   GET  /api/cert/:certNumber         - Get PSA certificate data`);
  console.log(`   POST /api/add-to-sheets            - Add card data to Google Sheets`);
  console.log(`   GET  /api/update-spreadsheet-config - Update spreadsheet configuration`);
  console.log(`   GET  /api/status                   - Service status and configuration`);
  console.log(`   POST /api/scan-history             - Save scan history entry`);
  console.log(`   GET  /api/scan-history             - Load scan history from Google Sheets`);
  console.log(`   GET  /health                       - Health check`);
  console.log('');
  console.log('🌐 Web Interface:');
  console.log(`   GET  /                             - Scanner interface`);
  console.log('');
  console.log('⚙️  Configuration:');
  console.log(`   PSA API: ${psaService.getStatus().configured ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Google Sheets: ${googleSheetsService.getStatus().configured ? '✅ Configured' : '❌ Not configured'}`);
  console.log('');
  console.log('💡 Ready to scan PSA cards!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down server gracefully...');
  process.exit(0);
});

module.exports = app;