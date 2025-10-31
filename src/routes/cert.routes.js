const { Router } = require('express');
const { getCertificate, batchGetCertificates } = require('../controllers/cert.controller');

const router = Router();

router.get('/cert/:certNumber', getCertificate);
router.post('/certs/lookup', batchGetCertificates);
router.get('/certs', batchGetCertificates);

module.exports = router;
