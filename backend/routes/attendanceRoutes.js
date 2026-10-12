const express = require('express');
const router = express.Router();
const { verifyToken, isTeacher } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

router.use(verifyToken, isTeacher);

// Mark attendance for a whole class
router.post('/class', attendanceController.markClassAttendance);

// Get attendance for a class on a specific date
router.get('/class/:classId', attendanceController.getClassAttendance);

// Get attendance summary for a student
router.get('/student-summary/:studentId', attendanceController.getStudentAttendanceSummary);

// Get monthly attendance report
router.get('/monthly/:classId', attendanceController.getMonthlyAttendance);

router.get('/today-summary', attendanceController.getTodaySummary);

module.exports = router;

