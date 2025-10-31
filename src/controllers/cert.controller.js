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
