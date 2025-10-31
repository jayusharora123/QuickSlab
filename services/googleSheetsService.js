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
    this._sheetIdCache = {}; // cache for sheetName -> sheetId
  }

  /**
   * Initializes Google Sheets authentication
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Try to use JSON string from environment variable first (for Railway)
      const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      
      if (serviceAccountJson) {
        // Parse JSON string and use credentials directly
        const credentials = JSON.parse(serviceAccountJson);
        this.auth = new google.auth.GoogleAuth({
          credentials: credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      } else if (this.serviceAccountKeyPath) {
        // Fallback to file path (for local development)
        this.auth = new google.auth.GoogleAuth({
          keyFile: this.serviceAccountKeyPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      } else {
        throw new Error('Service account credentials are required (either GOOGLE_SERVICE_ACCOUNT_JSON or key file path)');
      }
      
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
  // Ensure we're targeting the intended tab; enforce existence for reliability
  await this.ensureActiveSheet(true);
      const sheetsData = psaData.GoogleSheetsData;

  // Build row using dynamic header mapping so we can adapt to new layouts
  const headerMap = await this.getHeaderMap();

      // Canonical field names we support from PSA data
      const fieldToValue = {
        cardName: sheetsData.Subject || '',
        cardNumber: sheetsData.CardNumber || '',
        condition: sheetsData.Status || 'Graded',
        gradedFlag: sheetsData.Authenticated || 'Y',
        company: sheetsData.Company || 'PSA',
        grade: sheetsData.Grade || '',
        certNumber: sheetsData.CertNumber || ''
      };

      // Prepare row aligned to headers if found, else fallback to legacy A:G order
      let valuesRow = [];
      if (headerMap && headerMap.headers && headerMap.indexByCanonical) {
        // Initialize array to header length
        valuesRow = new Array(headerMap.headers.length).fill('');

        // Fill only known columns if present
        const setIfPresent = (canonical, value) => {
          if (canonical in headerMap.indexByCanonical) {
            const idx = headerMap.indexByCanonical[canonical];
            valuesRow[idx] = value;
          }
        };

        setIfPresent('cardName', fieldToValue.cardName);
        setIfPresent('cardNumber', fieldToValue.cardNumber);
        setIfPresent('condition', fieldToValue.condition);
        setIfPresent('gradedFlag', fieldToValue.gradedFlag);
        setIfPresent('company', fieldToValue.company);
        setIfPresent('grade', fieldToValue.grade);
        setIfPresent('certNumber', fieldToValue.certNumber);
      } else {
        // Fallback to legacy 7-column layout (A:G)
        valuesRow = [
          fieldToValue.cardName,
          fieldToValue.cardNumber,
          fieldToValue.condition,
          fieldToValue.gradedFlag,
          fieldToValue.company,
          fieldToValue.grade,
          fieldToValue.certNumber
        ];
      }

      // Determine critical column indices for A–E style inputs we own
      const idxCardName = headerMap?.indexByCanonical?.cardName ?? 0;
      const idxCardNumber = headerMap?.indexByCanonical?.cardNumber ?? 1;
      const idxCompany = headerMap?.indexByCanonical?.company ?? 2;
      const idxGrade = headerMap?.indexByCanonical?.grade ?? 3;
      const idxCert = headerMap?.indexByCanonical?.certNumber ?? 4;

      // We'll only ever write the contiguous block covering these columns
      const writeStartIdx = Math.min(idxCardName, idxCardNumber, idxCompany, idxGrade, idxCert);
      const writeEndIdx = Math.max(idxCardName, idxCardNumber, idxCompany, idxGrade, idxCert);
      const writeStartLetter = this.columnIndexToLetter(writeStartIdx);
      const writeEndLetter = this.columnIndexToLetter(writeEndIdx);

      // Find the correct target row:
      // - Prefer a row whose cert matches the card we’re adding (update that row A–E)
      // - Else pick the first row where BOTH card name and cert are empty (insert)
      // - If a row has a name but no cert, treat it as occupied; skip it
      const firstDataRow = (headerMap?.headerRow || 1) + 1;
      const scanStartIdx = Math.min(idxCardName, idxCert);
      const scanEndIdx = Math.max(idxCardName, idxCert);
      const scanStartLetter = this.columnIndexToLetter(scanStartIdx);
      const scanEndLetter = this.columnIndexToLetter(scanEndIdx);
      const scanRange = `${this.sheetName}!${scanStartLetter}${firstDataRow}:${scanEndLetter}`;

      const scanResp = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: scanRange,
        majorDimension: 'ROWS'
      });
      const rows = scanResp.data.values || [];
      const certToAdd = (fieldToValue.certNumber || '').toString().trim();

      let targetRow = null;
      let firstEmptyRow = null;

      for (let i = 0; i < rows.length; i++) {
        const relRow = rows[i] || [];
        const nameCell = (relRow[idxCardName - scanStartIdx] || '').toString().trim();
        const certCell = (relRow[idxCert - scanStartIdx] || '').toString().trim();

        if (certCell) {
          // Strong match on cert – prefer updating this row
          if (certToAdd && certCell === certToAdd) {
            targetRow = firstDataRow + i;
            break;
          }
          // Different cert present → definitely occupied, skip
          continue;
        }

        // No cert – if there is a name, treat as occupied (don’t overwrite)
        if (nameCell) {
          continue;
        }

        // Both empty – potential insert location (keep the first one)
        if (!firstEmptyRow) {
          firstEmptyRow = firstDataRow + i;
        }
      }

      if (!targetRow) {
        // If we didn’t find a matching cert row, use first empty slot if discovered
        targetRow = firstEmptyRow || (firstDataRow + rows.length);
      }

      // Build the write payload only for the columns we own (contiguous A–E style segment)
      const writeRow = new Array(writeEndIdx - writeStartIdx + 1).fill('');
      writeRow[idxCardName - writeStartIdx] = fieldToValue.cardName;
      writeRow[idxCardNumber - writeStartIdx] = fieldToValue.cardNumber;
      writeRow[idxCompany - writeStartIdx] = fieldToValue.company;
      writeRow[idxGrade - writeStartIdx] = fieldToValue.grade;
      writeRow[idxCert - writeStartIdx] = fieldToValue.certNumber;

      const updateResult = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${writeStartLetter}${targetRow}:${writeEndLetter}${targetRow}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [writeRow] }
      });

      // Best effort: copy formatting and data validation from the previous row (or row after header)
      try {
        await this.applyFormattingAndValidation(headerMap, updateResult.data.updatedRange);
      } catch (fmtErr) {
        console.warn('Formatting/validation copy skipped:', fmtErr.message);
      }

      return {
        success: true,
        updatedRange: updateResult.data.updatedRange,
        updatedRows: 1,
        rowData: writeRow,
        sheetName: this.sheetName,
        spreadsheetId: this.spreadsheetId,
        message: `Successfully added ${sheetsData.Subject || 'card'} to Google Sheets`
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
    // Legacy helper kept for compatibility; prefer append() instead of update()
    const tableEndRow = 5000; // Increased limit to avoid early cutoffs
    
    try {
      // Get existing data to find first empty row
      const existingDataResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A${startRow}:G${tableEndRow}`
      });
      
      const existingData = existingDataResponse.data.values || [];
      
      // Find first empty row (where column A is empty, since that's our card name column now)
      for (let i = 0; i < existingData.length; i++) {
        const row = existingData[i] || [];
        if (!row[0] || row[0].toString().trim() === '') { // Column A (index 0) is Card Name
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
      configured: !!(this.spreadsheetId && (this.serviceAccountKeyPath || process.env.GOOGLE_SERVICE_ACCOUNT_JSON)),
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
      const historySheetExists = spreadsheetInfo.sheets.some(title => title === historySheetName);
      
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
      const sheetExists = spreadsheetInfo.sheets.some(title => title === sheetName);
      
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

  /**
   * Ensures the configured sheetName exists; if not, fallback to the first sheet in the spreadsheet.
   */
  async ensureActiveSheet(strict = false) {
    const info = await this.getSpreadsheetInfo();
    if (!info || !Array.isArray(info.sheets) || info.sheets.length === 0) {
      throw new Error('Spreadsheet has no sheets');
    }
    const exists = info.sheets.includes(this.sheetName);
    if (!exists) {
      if (strict) {
        throw new Error(`Target sheet tab "${this.sheetName}" not found. Available tabs: ${info.sheets.join(', ')}`);
      } else {
        // Fallback to the first tab
        this.sheetName = info.sheets[0];
      }
    }
  }

  /**
   * Reads header row and builds a mapping from canonical field names to column indices.
   * Adapts to different sheet layouts.
   * @returns {Promise<{headers: string[], indexByCanonical: Object}>}
   */
  async getHeaderMap() {
    if (!this.sheets) {
      throw new Error('Google Sheets not initialized. Call initialize() first.');
    }

    try {
      // Read first 10 rows to detect which row contains headers
      const resp = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A1:ZZ10`
      });

      const rows = resp.data.values || [];
      if (!rows.length) return null;

      // Normalize header text for matching
      const norm = (s) => (s || '').toString().trim().toLowerCase();

      // Map possible header names to canonical fields we support
      const candidates = [
        { canonical: 'cardName', names: ['card name', 'name', 'subject', 'title'] },
        { canonical: 'cardNumber', names: ['card #', 'card number', 'number', 'no', '#'] },
        { canonical: 'condition', names: ['condition', 'status', 'graded status'] },
        { canonical: 'gradedFlag', names: ['graded?', 'authenticated', 'graded'] },
        { canonical: 'company', names: ['company', 'grading company', 'grader'] },
        { canonical: 'grade', names: ['grade', 'numeric grade', 'grade (num)'] },
        { canonical: 'certNumber', names: ['cert', 'cert #', 'cert number', 'certification number'] }
      ];

  // Score each row by how many candidate headers it matches; pick the best
  let best = { idx: -1, score: -1, headers: [] };
      rows.forEach((row, rIdx) => {
        let score = 0;
        for (const cell of row) {
          const hNorm = norm(cell);
          if (candidates.some(c => c.names.some(n => hNorm === n))) score++;
        }
        if (score > best.score) best = { idx: rIdx, score, headers: row };
      });

      const headers = best.headers || [];
      if (!headers.length) return null;

      const indexByCanonical = {};
      headers.forEach((h, idx) => {
        const hNorm = norm(h);
        for (const c of candidates) {
          if (c.names.some(n => hNorm === n)) {
            if (!(c.canonical in indexByCanonical)) {
              indexByCanonical[c.canonical] = idx;
            }
          }
        }
      });

      return { headers, indexByCanonical, headerRow: best.idx + 1 };
    } catch (e) {
      // On any error, return null so caller can fallback to legacy order
      return null;
    }
  }

  /**
   * Converts a zero-based column index to a Google Sheets column letter (e.g., 0 -> A, 27 -> AB)
   */
  columnIndexToLetter(index) {
    let result = '';
    let n = index + 1;
    while (n > 0) {
      const rem = (n - 1) % 26;
      result = String.fromCharCode(65 + rem) + result;
      n = Math.floor((n - 1) / 26);
    }
    return result;
  }

  /**
   * Copy formatting and data validation from a template row to the appended row
   * @param {Object|null} headerMap
   * @param {string|null} updatedRange - A1 range returned by append e.g. `'Input Sheet'!A204:I204`
   */
  async applyFormattingAndValidation(headerMap, updatedRange) {
    if (!updatedRange || !headerMap || !headerMap.headers || !headerMap.headerRow) return;

    // Extract start and end row from A1 notation
    const match = updatedRange.match(/!(?:[A-Z]+)(\d+):(?:[A-Z]+)(\d+)/);
    if (!match) return;
    const startRow = parseInt(match[1], 10);
    const endRow = parseInt(match[2], 10);
    if (isNaN(startRow) || isNaN(endRow)) return;

    // Determine a template row: previous row or first data row after header
    const firstDataRow = headerMap.headerRow + 1;
    const templateRow = Math.max(firstDataRow, startRow - 1);
    if (templateRow >= startRow) return; // nothing to copy from

    const sheetId = await this.getSheetIdByName(this.sheetName);
    const startCol = 0;
    const endCol = headerMap.headers.length; // exclusive

    const requests = [];

    // Paste formatting
    requests.push({
      copyPaste: {
        source: {
          sheetId,
          startRowIndex: templateRow - 1,
          endRowIndex: templateRow,
          startColumnIndex: startCol,
          endColumnIndex: endCol
        },
        destination: {
          sheetId,
          startRowIndex: startRow - 1,
          endRowIndex: endRow,
          startColumnIndex: startCol,
          endColumnIndex: endCol
        },
        pasteType: 'PASTE_FORMAT',
        pasteOrientation: 'NORMAL'
      }
    });

    // Paste data validations (dropdowns)
    requests.push({
      copyPaste: {
        source: {
          sheetId,
          startRowIndex: templateRow - 1,
          endRowIndex: templateRow,
          startColumnIndex: startCol,
          endColumnIndex: endCol
        },
        destination: {
          sheetId,
          startRowIndex: startRow - 1,
          endRowIndex: endRow,
          startColumnIndex: startCol,
          endColumnIndex: endCol
        },
        pasteType: 'PASTE_DATA_VALIDATION',
        pasteOrientation: 'NORMAL'
      }
    });

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: { requests }
    });
  }

  /**
   * Get numeric sheetId for a given sheet name (cached)
   */
  async getSheetIdByName(name) {
    if (this._sheetIdCache[name]) return this._sheetIdCache[name];
    const resp = await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
    const sheet = resp.data.sheets.find(s => s.properties.title === name);
    if (!sheet) throw new Error(`Sheet tab not found: ${name}`);
    const id = sheet.properties.sheetId;
    this._sheetIdCache[name] = id;
    return id;
  }
}

module.exports = GoogleSheetsService;