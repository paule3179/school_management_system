// backend/routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// ============================================
// IMPORTANT: Specific routes MUST come BEFORE parameterized routes
// ============================================

// SPECIFIC ROUTES (no :id parameter) - These MUST come first
router.get('/statistics', studentController.getStudentStatistics);
router.get('/search/:keyword', studentController.searchStudents);
router.get('/class/:classId', studentController.getStudentsByClass);
router.get('/parent/children/:parentId', studentController.getParentChildren);

// GENERAL ROUTES
router.get('/', studentController.getAllStudents);

// PARAMETERIZED ROUTES (:id parameter) - These MUST come LAST
router.get('/:id', studentController.getStudentById);

// Protected routes (require authentication)
router.post('/', studentController.createStudent);
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);
router.post('/:parentId/reset-password', studentController.resetParentPassword);

module.exports = router;