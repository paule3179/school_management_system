// backend/routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { isAdmin, isTeacher } = require('../middleware/auth');

// Teachers may read the roster for a class assigned to them. All other
// student directory and CRUD endpoints below remain administrator-only.
router.get('/class/:classId', isTeacher, (req, res, next) => {
    if (req.user.role === 'teacher' && !req.user.allowedClassIds?.includes(Number(req.params.classId))) {
        return res.status(403).json({ success: false, error: 'Access denied to this class' });
    }
    next();
}, studentController.getStudentsByClass);

// All student CRUD and directory queries are restricted to administrators.
// Parent and teacher dashboards use their scoped routes instead.
router.use(isAdmin);

// ============================================
// IMPORTANT: Specific routes MUST come BEFORE parameterized routes
// ============================================

// SPECIFIC ROUTES (no :id parameter) - These MUST come first
router.get('/statistics', studentController.getStudentStatistics);
router.get('/search/:keyword', studentController.searchStudents);
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
