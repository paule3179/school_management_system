const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');

router.get('/', feeController.getAllFees);
router.get('/types', feeController.getFeeTypes);
router.get('/school-summary', feeController.getSchoolFeeSummary);
router.get('/student/:studentId', feeController.getStudentFeeSummary);
router.get('/class/:classId', feeController.getClassFeeSummary);
router.get('/receipt/:feeId', feeController.generateReceipt);
router.post('/payment', feeController.recordPayment);

module.exports = router;