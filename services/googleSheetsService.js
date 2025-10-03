const { google } = require('googleapis');

/**
 * Google Sheets Service - Handles all Google Sheets interactions
 * Provides secure spreadsheet data insertion and management
 */
class GoogleSheetsService {
  constructor(config = {}) {
    this.spreadsheetId = config.spreadsheetId;
    this.sheetName = config.sheetName || 'Input Sheet';
    this.serviceAccountKeyPath = config.serviceAccountKeyPath;
    this.auth = null;
    this.sheets = null;
  }

  /**
   * Initializes Google Sheets authentication
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.serviceAccountKeyPath) {
      throw new Error('Service account key path is required');
    }

    try {
      this.auth = new google.auth.GoogleAuth({
        keyFile: this.serviceAccountKeyPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Test authentication by getting spreadsheet metadata
      await this.getSpreadsheetInfo();
      
    } catch (error) {
      throw new Error(`Failed to initialize Google Sheets: ${error.message}`);
    }
  }

  /**
   * Gets basic spreadsheet information to verify access
   * @returns {Promise<Object>} - Spreadsheet metadata
   */
  async getSpreadsheetInfo() {
    if (!this.sheets) {
      throw new Error('Google Sheets not initialized. Call initialize() first.');
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      return {
        title: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => sheet.properties.title)
      };
    } catch (error) {
      if (error.code === 404) {
        throw new Error('Spreadsheet not found or access denied');
      }
      throw new Error(`Failed to access spreadsheet: ${error.message}`);
    }
  }

  /**
   * Adds PSA card data to the Google Sheet with automatic row numbering
   * @param {Object} psaData - Processed PSA certificate data
   * @returns {Promise<Object>} - Result of the insert operation
   */
  async addCardData(psaData) {
    if (!this.sheets) {
      throw new Error('Google Sheets not initialized. Call initialize() first.');
    }

    if (!psaData || !psaData.GoogleSheetsData) {
      throw new Error('Invalid PSA data format');
    }

    try {
      const sheetsData = psaData.GoogleSheetsData;
      
      // Find the first empty row in the table area to insert data
      const tableStartRow = 4; // Row 4 (after headers and examples in rows 1-3)
      const targetRow = await this.findNextAvailableRow(tableStartRow);
      
      // Create formula for automatic row numbering
      const previousRow = targetRow - 1;
      const rowNumberFormula = `=A${previousRow}+1`;

      // Prepare the row data according to column mapping
      const rowData = [
        rowNumberFormula,           // Column A: Auto-calculated row number
        sheetsData.Subject,         // Column B: Card Name
        sheetsData.CardNumber,      // Column C: Card Number
        sheetsData.Status,          // Column D: Condition (Graded)
        sheetsData.Authenticated,   // Column E: Graded? (Yes)
        sheetsData.Company,         // Column F: Company (PSA)
        sheetsData.Grade,          // Column G: Grade (Numeric)
        sheetsData.CertNumber      // Column H: Certification Number
      ];

      // Insert the data at the specific row
      const updateResult = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A${targetRow}:H${targetRow}`,
        valueInputOption: 'USER_ENTERED', // Process formulas
        resource: {
          values: [rowData]
        }
      });

      return {
        success: true,
        updatedRange: updateResult.data.updatedRange,
        updatedRows: 1,
        targetRow: targetRow,
        rowData: rowData,
        message: `Successfully added ${psaData.Subject || 'card'} to Google Sheets at row ${targetRow}`
      };

    } catch (error) {
      if (error.code === 400) {
        throw new Error(`Invalid sheet range or data format: ${error.message}`);
      }
      if (error.code === 404) {
        throw new Error(`Sheet "${this.sheetName}" not found in the spreadsheet`);
      }
      throw new Error(`Failed to add data to Google Sheets: ${error.message}`);
    }
  }

  /**
   * Finds the next available row for data insertion
   * @param {number} startRow - Row to start searching from
   * @returns {Promise<number>} - Next available row number
   */
  async findNextAvailableRow(startRow) {
    const tableEndRow = 50; // Reasonable limit for table area
    
    try {
      // Get existing data to find first empty row
      const existingDataResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A${startRow}:H${tableEndRow}`
      });
      
      const existingData = existingDataResponse.data.values || [];
      
      // Find first empty row (where column B is empty, since that's our main data column)
      for (let i = 0; i < existingData.length; i++) {
        const row = existingData[i] || [];
        if (!row[1] || row[1].toString().trim() === '') { // Column B (index 1) is Subject/Card Name
          return startRow + i;
        }
      }
      
      // If no empty row found, append at the end
      return startRow + existingData.length;
      
    } catch (error) {
      // If there's an error reading the range, default to start row
      return startRow;
    }
  }

  /**
   * Updates spreadsheet configuration
   * @param {string} spreadsheetId - New spreadsheet ID
   * @param {string} sheetName - New sheet name
   */
  updateConfig(spreadsheetId, sheetName) {
    this.spreadsheetId = spreadsheetId;
    this.sheetName = sheetName || 'Input Sheet';
    
    // Reset authentication to force re-initialization with new config
    this.auth = null;
    this.sheets = null;
  }

  /**
   * Gets the service configuration status
   * @returns {Object} - Configuration status
   */
  getStatus() {
    return {
      configured: !!(this.spreadsheetId && this.serviceAccountKeyPath),
      initialized: !!this.sheets,
      spreadsheetId: this.spreadsheetId,
      sheetName: this.sheetName,
      hasAuth: !!this.auth
    };
  }

  /**
   * Tests the complete Google Sheets integration
   * @returns {Promise<Object>} - Test results
   */
  async testIntegration() {
    const results = {
      authentication: false,
      spreadsheetAccess: false,
      errors: []
    };

    try {
      if (!this.sheets) {
        await this.initialize();
      }
      results.authentication = true;

      await this.getSpreadsheetInfo();
      results.spreadsheetAccess = true;

    } catch (error) {
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * Saves scan history entry to Google Sheets
   * @param {string} certNumber - PSA certificate number
   * @param {Object} cardData - PSA card data
   * @param {string} status - success or error
   * @param {string} timestamp - scan timestamp
   * @returns {Promise<Object>} - Add result
   */
  async saveScanHistory(certNumber, cardData, status, timestamp) {
    if (!this.sheets) {
      await this.initialize();
    }

    const historySheetName = 'Scan History';
    
    try {
      // Ensure the Scan History sheet exists
      await this.ensureScanHistorySheet(historySheetName);

      const values = [[
        timestamp,
        certNumber,
        status,
        cardData ? cardData.Subject || cardData.CardName || 'Unknown' : 'Lookup Failed',
        cardData ? cardData.CardNumber || 'N/A' : 'N/A',
        cardData ? (cardData.NumericGrade || cardData.numericGrade || 'N/A') : 'N/A',
        cardData ? JSON.stringify(cardData) : null // Store full data for recovery
      ]];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${historySheetName}!A:G`,
        valueInputOption: 'USER_ENTERED',
        resource: { values }
      });

      return {
        success: true,
        range: response.data.updates.updatedRange
      };

    } catch (error) {
      throw new Error(`Failed to save scan history: ${error.message}`);
    }
  }

  /**
   * Loads scan history from Google Sheets
   * @param {number} limit - Number of recent entries to load (default: 50)
   * @returns {Promise<Array>} - Array of scan history entries
   */
  async loadScanHistory(limit = 50) {
    if (!this.sheets) {
      await this.initialize();
    }

    const historySheetName = 'Scan History';
    
    try {
      // Check if Scan History sheet exists
      const spreadsheetInfo = await this.getSpreadsheetInfo();
      const historySheetExists = spreadsheetInfo.sheets.some(sheet => sheet.properties.title === historySheetName);
      
      if (!historySheetExists) {
        return []; // No history yet
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${historySheetName}!A:G`
      });

      const rows = response.data.values || [];
      
      // Skip header row and get recent entries
      const dataRows = rows.slice(1);
      const recentRows = dataRows.slice(-limit).reverse(); // Get last N entries, newest first

      return recentRows.map(row => {
        const [timestamp, certNumber, status, cardName, cardNumber, grade, cardDataJson] = row;
        
        let cardData = null;
        if (cardDataJson && status === 'success') {
          try {
            cardData = JSON.parse(cardDataJson);
          } catch (e) {
            // If JSON parsing fails, reconstruct basic card data
            cardData = {
              Subject: cardName,
              CardNumber: cardNumber,
              NumericGrade: grade
            };
          }
        }

        return {
          timestamp,
          certNumber,
          status,
          cardData
        };
      });

    } catch (error) {
      console.error('Failed to load scan history:', error.message);
      return []; // Return empty array on error, don't break the app
    }
  }

  /**
   * Ensures the Scan History sheet exists with proper headers
   * @param {string} sheetName - Name of the scan history sheet
   * @returns {Promise<void>}
   */
  async ensureScanHistorySheet(sheetName) {
    try {
      const spreadsheetInfo = await this.getSpreadsheetInfo();
      const sheetExists = spreadsheetInfo.sheets.some(sheet => sheet.properties.title === sheetName);
      
      if (!sheetExists) {
        // Create the sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }]
          }
        });

        // Add headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1:G1`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [['Timestamp', 'Cert Number', 'Status', 'Card Name', 'Card Number', 'Grade', 'Full Data']]
          }
        });
      }
    } catch (error) {
      console.error('Failed to ensure scan history sheet:', error.message);
      // Don't throw here - we want the app to continue working even if sheet creation fails
    }
  }
}

module.exports = GoogleSheetsService;