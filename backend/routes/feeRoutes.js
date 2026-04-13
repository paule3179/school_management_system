const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');

router.get('/', feeController.getAllFees);
router.get('/types', feeController.getFeeTypes);
router.get('/school-summary', feeController.getSchoolFeeSummary);
router.get('/student/:studentId/summary', feeController.getStudentFeeSummary);
router.get('/:id', feeController.getFeeById);
router.post('/payment', feeController.recordPayment);

module.exports = router;