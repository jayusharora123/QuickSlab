const { Router } = require('express');
const certRoutes = require('./cert.routes');
const sheetsRoutes = require('./sheets.routes');
const statusRoutes = require('./status.routes');

const router = Router();

router.use(certRoutes);
router.use(sheetsRoutes);
router.use(statusRoutes);

module.exports = router;
