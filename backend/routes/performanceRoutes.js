const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');

// Parent performance (computed)
router.get('/parent/child/:childId/performance', verifyToken, dashboardController.getChildPerformance);

module.exports = router;

