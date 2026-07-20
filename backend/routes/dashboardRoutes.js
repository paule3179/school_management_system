// backend/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, isTeacher, isAdmin } = require('../middleware/auth');

// ============================================
// TEACHER DASHBOARD ROUTES
// ============================================

// Get teacher dashboard statistics
router.get('/teacher/stats', verifyToken, isTeacher, dashboardController.getTeacherStats);

// Get teacher's assigned classes
router.get('/teacher/classes', verifyToken, isTeacher, dashboardController.getTeacherClasses);

// Get students in a specific class (teacher only)
router.get('/teacher/class/:classId/students', verifyToken, isTeacher, dashboardController.getClassStudents);

// Get teacher's subjects
router.get('/teacher/subjects', verifyToken, isTeacher, dashboardController.getTeacherSubjects);

// Get today's schedule
router.get('/teacher/schedule', verifyToken, isTeacher, dashboardController.getTodaySchedule);

// Get notifications
router.get('/teacher/notifications', verifyToken, isTeacher, dashboardController.getNotifications);

// Get recent activities
router.get('/teacher/activities', verifyToken, isTeacher, dashboardController.getRecentActivities);

// Save attendance
router.post('/teacher/attendance', verifyToken, isTeacher, dashboardController.saveAttendance);

// Get attendance records
router.get('/teacher/attendance/:classId/:date', verifyToken, isTeacher, dashboardController.getAttendanceByClass);

// ============================================
// TEACHER GRADE ENTRY ROUTES
// ============================================

// ✅ Get all subjects (for teacher grade dropdown fallback)
router.get(
  '/teacher/subjects/all',
  verifyToken,
  isTeacher,
  dashboardController.getAllSubjects
);

// ✅ Get subjects for a specific class
router.get(
  '/teacher/class/:classId/subjects',
  verifyToken,
  isTeacher,
  dashboardController.getClassSubjects
);

// ✅ Get marks by class - FIXED: Uses subject_id
router.get(
  '/teacher/marks/:classId',
  verifyToken,
  isTeacher,
  dashboardController.getMarksByClass
);

// ✅ Get class subjects for grading (CA + Exam fields)
router.get(
  '/teacher/class/:classId/grading-subjects',
  verifyToken,
  isTeacher,
  dashboardController.getClassSubjectsForGrading
);

// ✅ Save grades (CA + Exam) - uses saveSubjectGrades
router.post(
  '/teacher/grades/save',
  verifyToken,
  isTeacher,
  dashboardController.saveSubjectGrades
);

// ✅ Save marks/grades - FIXED: Uses subject_id
router.post(
  '/teacher/marks',
  verifyToken,
  isTeacher,
  dashboardController.saveMarks
);

// Get teacher's classes with subjects
router.get(
  '/teacher/class-subjects',
  verifyToken,
  isTeacher,
  dashboardController.getTeacherClassSubjects
);

// Get student profile
router.get('/teacher/student/:studentId', verifyToken, isTeacher, dashboardController.getStudentProfile);

// ============================================
// PARENT DASHBOARD ROUTES
// ============================================

// Get parent's children
router.get('/parent/children', verifyToken, dashboardController.getParentChildren);

// Get child's grades
router.get('/parent/child/:childId/grades', verifyToken, dashboardController.getChildGrades);

// Get child's attendance
router.get('/parent/child/:childId/attendance', verifyToken, dashboardController.getChildAttendance);

// Get child's timetable
router.get('/parent/child/:childId/timetable', verifyToken, dashboardController.getChildTimetable);

// Get child's fee status
router.get('/parent/child/:childId/fees', verifyToken, dashboardController.getChildFees);

// ============================================
// ADMIN DASHBOARD ROUTES
// ============================================

// Get admin dashboard statistics
router.get('/admin/stats', verifyToken, isAdmin, dashboardController.getAdminStats);

// Get recent activities
router.get('/admin/recent', verifyToken, isAdmin, dashboardController.getAdminRecentActivities);

// Get system health
router.get('/admin/health', verifyToken, isAdmin, dashboardController.getSystemHealth);

module.exports = router;