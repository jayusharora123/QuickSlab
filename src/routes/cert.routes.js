const { Router } = require('express');
const { getCertificate } = require('../controllers/cert.controller');

const router = Router();

router.get('/cert/:certNumber', getCertificate);

module.exports = router;
