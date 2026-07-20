const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

router.use(optionalAuth);

// Mark attendance for a whole class
router.post('/class', attendanceController.markClassAttendance);

// Get attendance for a class on a specific date
router.get('/class/:classId', attendanceController.getClassAttendance);

// Get attendance summary for a student
router.get('/student-summary/:studentId', attendanceController.getStudentAttendanceSummary);

// Get monthly attendance report
router.get('/monthly/:classId', attendanceController.getMonthlyAttendance);

// Backwards-compatible endpoint (frontend expects this path)
// Returns a safe default if no dedicated implementation exists.
router.get('/today-summary', (req, res) => {
  res.json({ success: true, data: { message: 'today-summary endpoint is not implemented yet', items: [] } });
});

module.exports = router;

