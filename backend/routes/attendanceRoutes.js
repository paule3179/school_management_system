const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

router.get('/', attendanceController.getAllAttendance);
router.get('/student-summary/:studentId', attendanceController.getStudentAttendanceSummary);
router.get('/class-summary/:classId', attendanceController.getClassAttendanceSummary);
router.get('/:id', attendanceController.getAttendanceById);
router.post('/class', attendanceController.markClassAttendance);
router.post('/student', attendanceController.markStudentAttendance);
router.put('/:id', attendanceController.updateAttendance);

module.exports = router;