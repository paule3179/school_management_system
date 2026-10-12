// backend/routes/gradeRoutes.js
const express = require('express');
const router = express.Router();
const { enrichUserContext, verifyToken, isTeacher, isAdmin } = require('../middleware/auth');
const gradeController = require('../controllers/gradeController');
const pool = require('../config/database');

const teacherCanAccessClass = (req, classId) => req.user?.role !== 'teacher' ||
  (Number.isInteger(Number(classId)) &&
    (req.user.allowedClassIds || []).some((id) => Number(id) === Number(classId)));

const requireAssignedClass = (getClassId) => async (req, res, next) => {
  if (req.user?.role !== 'teacher') return next();
  try {
    const classId = await getClassId(req);
    if (!classId) {
      return res.status(400).json({ success: false, error: 'A class is required for teacher grade access' });
    }
    if (!teacherCanAccessClass(req, classId)) {
      return res.status(403).json({ success: false, error: 'Access denied to this class' });
    }
    next();
  } catch (error) {
    console.error('Unable to verify teacher grade access:', error.message);
    res.status(500).json({ success: false, error: 'Unable to verify class access' });
  }
};

const classFromStudent = (getStudentId) => requireAssignedClass(async (req) => {
  const studentId = await getStudentId(req);
  if (!studentId) return null;
  const result = await pool.query('SELECT class_id FROM students WHERE id = $1', [studentId]);
  return result.rows[0]?.class_id;
});

const classFromGrade = requireAssignedClass(async (req) => {
  const result = await pool.query('SELECT class_id FROM grades WHERE id = $1', [req.params.id]);
  return result.rows[0]?.class_id;
});

const requireStudentInSubmittedClass = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND class_id = $2',
      [req.body?.student_id, req.body?.class_id]
    );
    if (!result.rows[0]) {
      return res.status(400).json({ success: false, error: 'Student does not belong to the submitted class' });
    }
    next();
  } catch (error) {
    console.error('Unable to verify student class:', error.message);
    res.status(500).json({ success: false, error: 'Unable to verify student class' });
  }
};

// Grade records are visible only to staff with grade access.
router.use(verifyToken, isTeacher);
router.use(enrichUserContext);

// ============================================
// SPECIFIC ROUTES (must come BEFORE /:id routes)
// ============================================

// Get class grade rows by student+subject (for entry UI)
router.get('/class/:classId', requireAssignedClass((req) => req.params.classId), gradeController.getClassGrades);

// Get class performance summary
router.get('/class-performance/:classId', requireAssignedClass((req) => req.params.classId), gradeController.getClassPerformance);

// Get student report card
router.get('/report-card/:studentId', classFromStudent((req) => req.params.studentId), gradeController.getStudentReportCard);

// Get student remarks (using grades_remarks table)
router.get('/remarks/:studentId', classFromStudent((req) => req.params.studentId), gradeController.getStudentRemarks);

// Get student grades (alternative endpoint)
router.get('/student/:studentId', classFromStudent((req) => req.params.studentId), gradeController.getStudentGrades);

// Get performance summary (global)
router.get('/performance/summary', requireAssignedClass((req) => req.query.class_id), gradeController.getPerformanceSummary);
// Backwards-compatible alias (frontend expects this path)
router.get('/performance-summary', requireAssignedClass((req) => req.query.class_id), gradeController.getPerformanceSummary);


// Get grade statistics
router.get('/statistics/overview', requireAssignedClass((req) => req.query.class_id), gradeController.getGradeStatistics);

// ============================================
// GENERAL ROUTES
// ============================================

// Get all grades (with optional filters)
router.get('/', requireAssignedClass((req) => req.query.class_id), gradeController.getAllGrades);

// ============================================
// PARAMETER ROUTES (must come AFTER specific routes)
// ============================================

// Get grade by ID (must be LAST)
router.get('/:id', classFromGrade, gradeController.getGradeById);

// ============================================
// POST ROUTES (require full authentication)
// ============================================

// Create new grade
router.post('/', verifyToken, isTeacher, requireAssignedClass((req) => req.body?.class_id), requireStudentInSubmittedClass, gradeController.createGrade);

// Save student remarks
router.post('/remarks', verifyToken, isTeacher, classFromStudent((req) => req.body?.student_id), gradeController.saveStudentRemarks);

// Bulk upload grades
router.post('/bulk', verifyToken, isTeacher, async (req, res, next) => {
  const grades = req.body?.grades;
  if (!Array.isArray(grades)) return next();
  if (req.user?.role === 'teacher' && grades.some((grade) => !teacherCanAccessClass(req, grade?.class_id))) {
    return res.status(403).json({ success: false, error: 'Grades include a class you are not assigned to' });
  }
  try {
    const grades = req.body.grades;
    const studentIds = [...new Set(grades.map((grade) => Number(grade?.student_id)))];
    if (studentIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      return res.status(400).json({ success: false, error: 'Bulk grades contain an invalid student ID' });
    }
    const students = await pool.query(
      'SELECT id, class_id FROM students WHERE id = ANY($1::int[])',
      [studentIds]
    );
    const classByStudent = new Map(students.rows.map((student) => [Number(student.id), Number(student.class_id)]));
    if (grades.some((grade) => classByStudent.get(Number(grade.student_id)) !== Number(grade.class_id))) {
      return res.status(400).json({ success: false, error: 'Bulk grades include a student outside the submitted class' });
    }
    next();
  } catch (error) {
    console.error('Unable to verify bulk grade student classes:', error.message);
    res.status(500).json({ success: false, error: 'Unable to verify student classes' });
  }
}, gradeController.bulkUploadGrades);

// ============================================
// PUT ROUTES
// ============================================

// Update grade
router.put('/:id', verifyToken, isTeacher, classFromGrade, gradeController.updateGrade);

// ============================================
// DELETE ROUTES
// ============================================

// Delete grade
router.delete('/:id', verifyToken, isAdmin, gradeController.deleteGrade);

module.exports = router;
