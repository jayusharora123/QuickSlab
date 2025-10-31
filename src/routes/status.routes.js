const { Router } = require('express');
const { getStatus } = require('../controllers/status.controller');

const router = Router();

router.get('/status', getStatus);

module.exports = router;
