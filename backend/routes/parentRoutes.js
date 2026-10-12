// backend/routes/parentRoutes.js
const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// ============================================
// PARENT DASHBOARD ROUTES (Parent + Admin)
// These work for both parents and admins
// ============================================

// Profile and notifications
router.get('/profile', verifyToken, parentController.getProfile);
router.get('/notifications', verifyToken, parentController.getNotifications);
router.get('/messages', verifyToken, parentController.getMessages);

// Children routes
router.get('/children', verifyToken, parentController.getMyChildren);

// Dashboard summary (unified data for dashboard)
router.get('/dashboard-summary', verifyToken, parentController.getDashboardSummary);

// Child detail routes - IMPORTANT: Specific routes BEFORE parameterized
router.get('/child/:childId/performance', verifyToken, parentController.getChildPerformance);
router.get('/child/:childId/grades', verifyToken, parentController.getChildGrades);
router.get('/child/:childId/attendance', verifyToken, parentController.getChildAttendance);
router.get('/child/:childId/fees', verifyToken, parentController.getChildFees);
router.get('/child/:childId/subjects', verifyToken, parentController.getChildSubjects);
router.get('/child/:childId/teachers', verifyToken, parentController.getChildTeachers);
router.get('/child/:childId/overview', verifyToken, parentController.getChildOverview);

// ============================================
// ADMIN ONLY ROUTES (Require Admin Role)
// ============================================

router.get('/', verifyToken, isAdmin, parentController.getAllParents);
router.get('/:id', verifyToken, isAdmin, parentController.getParentById);
router.get('/:id/dashboard', verifyToken, isAdmin, parentController.getParentDashboard);
router.post('/', verifyToken, isAdmin, parentController.createParent);
router.put('/:id', verifyToken, isAdmin, parentController.updateParent);
router.delete('/:id', verifyToken, isAdmin, parentController.deleteParent);

module.exports = router;
