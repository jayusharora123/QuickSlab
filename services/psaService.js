const https = require('https');

/**
 * PSA Service - Handles all PSA API interactions
 * Provides secure certificate lookup and data processing
 */
class PSAService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('PSA API key is required');
    }
    
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.psacard.com/publicapi/cert';
    
    // HTTPS agent configuration for development
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      family: 4, // Force IPv4 for better DNS resolution
      timeout: 10000
    });
  }

  /**
   * Validates a PSA certificate number format
   * @param {string} certNumber - The certificate number to validate
   * @returns {boolean} - True if valid format
   */
  validateCertNumber(certNumber) {
    if (!certNumber || typeof certNumber !== 'string') {
      return false;
    }
    
    // PSA cert numbers should contain only digits
    return /^\d+$/.test(certNumber.trim());
  }

  /**
   * Fetches certificate data from PSA API
   * @param {string} certNumber - The PSA certificate number
   * @returns {Promise<Object>} - Promise resolving to processed PSA certificate data
   */
  async getCertificateData(certNumber) {
    if (!this.validateCertNumber(certNumber)) {
      throw new Error('Invalid certificate number format. Must contain only digits.');
    }

    try {
      const fetch = (await import('node-fetch')).default;
      const url = `${this.baseUrl}/GetByCertNumber/${certNumber}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'authorization': `bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        agent: this.httpsAgent,
        timeout: 10000
      });

      if (!response.ok) {
        const errorMessages = {
          401: 'Invalid API key or authentication failed',
          404: 'Certificate not found',
          429: 'Rate limit exceeded - too many requests',
          500: 'PSA server error'
        };
        
        const message = errorMessages[response.status] || `HTTP ${response.status}`;
        throw new Error(`PSA API error: ${message}`);
      }

      const rawData = await response.json();
      return this.processCertificateData(rawData);

    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        throw new Error('Network error: Unable to reach PSA API. Check internet connection.');
      }
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: PSA API took too long to respond.');
      }
      throw error;
    }
  }

  /**
   * Processes and enriches PSA certificate data
   * @param {Object} rawData - Raw data from PSA API
   * @returns {Object} - Processed certificate data
   */
  processCertificateData(rawData) {
    if (!rawData || !rawData.PSACert) {
      throw new Error('Invalid response format from PSA API');
    }

    const cert = rawData.PSACert;
    
    // Extract numeric grade from grade string (e.g., "GEM MT 10" -> "10")
    const gradeField = cert.GradeDescription || cert.CardGrade || cert.Grade;
    let numericGrade = '';
    
    if (gradeField) {
      const gradeMatch = gradeField.match(/(\d+(?:\.\d+)?)$/);
      if (gradeMatch) {
        numericGrade = gradeMatch[1];
      }
    }

    return {
      // Original data
      ...cert,
      
      // Enhanced data
      NumericGrade: numericGrade,
      
      // Formatted for Google Sheets
      GoogleSheetsData: {
        Subject: cert.Subject || '',
        CardNumber: cert.CardNumber || '',
        Status: 'Graded',
        Authenticated: 'Yes',
        Company: 'PSA',
        Grade: numericGrade,
        CertNumber: cert.CertNumber || ''
      }
    };
  }

  /**
   * Tests connectivity to PSA API
   * @returns {Promise<Object>} - Connectivity test result
   */
  async testConnectivity() {
    try {
      const testCert = '82513373'; // Known test certificate
      await this.getCertificateData(testCert);
      
      return {
        success: true,
        message: 'PSA API connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Gets the API configuration status
   * @returns {Object} - Configuration status
   */
  getStatus() {
    return {
      configured: !!this.apiKey,
      baseUrl: this.baseUrl,
      sslVerification: false // Development mode
    };
  }
}

module.exports = PSAService;