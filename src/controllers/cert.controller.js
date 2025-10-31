const PSAService = require('../../services/psaService');

const psaService = new PSAService(process.env.PSA_API_KEY);

exports.getCertificate = async (req, res) => {
  try {
    const { certNumber } = req.params;
    const data = await psaService.getCertificateData(certNumber);
    res.json({ success: true, PSACert: data });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('authentication') ? 401 :
                      error.message.includes('rate limit') ? 429 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
};

/**
 * Batch lookup PSA certificates
 * - POST body: { certNumbers: string[] }
 * - GET query:  /api/certs?ids=123,456
 * Returns: { success: true, results: Array<{ certNumber, success, PSACert?, error? }> }
 */
exports.batchGetCertificates = async (req, res) => {
  try {
    const fromGet = (req.method === 'GET') ? (req.query.ids || '') : null;
    const certNumbers = fromGet
      ? fromGet.split(',').map(s => s.trim()).filter(Boolean)
      : Array.isArray(req.body?.certNumbers) ? req.body.certNumbers : [];

    if (!certNumbers.length) {
      return res.status(400).json({ success: false, error: 'Provide certNumbers array or ids query param' });
    }

    // Normalize to strings, preserve original order, and build a unique set for caching
    const normalized = certNumbers.map(c => c?.toString().trim()).filter(Boolean);
    const unique = Array.from(new Set(normalized));

    // Simple concurrency limiter without extra deps
    const limit = Number(process.env.BATCH_LOOKUP_CONCURRENCY || 5);
    const queue = unique.slice();
    const cache = new Map();

    async function worker() {
      while (queue.length) {
        const cert = queue.shift();
        try {
          const data = await psaService.getCertificateData(cert);
          cache.set(cert, { success: true, PSACert: data });
        } catch (error) {
          cache.set(cert, { success: false, error: error.message });
        }
      }
    }

    const workers = Array.from({ length: Math.min(limit, unique.length || 1) }, () => worker());
    await Promise.all(workers);

    // Map back to input order, including duplicates
    const results = normalized.map(cert => ({ certNumber: cert, ...(cache.get(cert) || { success: false, error: 'Unknown error' }) }));

    res.json({ success: true, count: results.length, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
