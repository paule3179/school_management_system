// backend/routes/gradeRoutes.js
const express = require('express');
const router = express.Router();
const { optionalAuth, enrichUserContext, verifyToken, isTeacher, isAdmin } = require('../middleware/auth');
const gradeController = require('../controllers/gradeController');

// Apply middleware to all routes (optional auth for GETs, full auth for modifications)
router.use(optionalAuth);
router.use(enrichUserContext);

// ============================================
// SPECIFIC ROUTES (must come BEFORE /:id routes)
// ============================================

// Get class grade rows by student+subject (for entry UI)
router.get('/class/:classId', gradeController.getClassGrades);

// Get class performance summary
router.get('/class-performance/:classId', gradeController.getClassPerformance);

// Get student report card
router.get('/report-card/:studentId', gradeController.getStudentReportCard);

// Get student remarks (using grades_remarks table)
router.get('/remarks/:studentId', gradeController.getStudentRemarks);

// Get student grades (alternative endpoint)
router.get('/student/:studentId', gradeController.getStudentGrades);

// Get performance summary (global)
router.get('/performance/summary', gradeController.getPerformanceSummary);
// Backwards-compatible alias (frontend expects this path)
router.get('/performance-summary', gradeController.getPerformanceSummary);


// Get grade statistics
router.get('/statistics/overview', gradeController.getGradeStatistics);

// ============================================
// GENERAL ROUTES
// ============================================

// Get all grades (with optional filters)
router.get('/', gradeController.getAllGrades);

// ============================================
// PARAMETER ROUTES (must come AFTER specific routes)
// ============================================

// Get grade by ID (must be LAST)
router.get('/:id', gradeController.getGradeById);

// ============================================
// POST ROUTES (require full authentication)
// ============================================

// Create new grade
router.post('/', verifyToken, isTeacher, gradeController.createGrade);

// Save student remarks
router.post('/remarks', verifyToken, isTeacher, gradeController.saveStudentRemarks);

// Bulk upload grades
router.post('/bulk', verifyToken, isTeacher, gradeController.bulkUploadGrades);

// ============================================
// PUT ROUTES
// ============================================

// Update grade
router.put('/:id', verifyToken, isTeacher, gradeController.updateGrade);

// ============================================
// DELETE ROUTES
// ============================================

// Delete grade
router.delete('/:id', verifyToken, isAdmin, gradeController.deleteGrade);

module.exports = router;