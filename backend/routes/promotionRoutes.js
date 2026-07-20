// backend/routes/promotionRoutes.js
const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const { verifyToken, isAdmin, isTeacher } = require('../middleware/auth');

// Debug: Log available controller methods
console.log('=== Promotion Routes Loading ===');
console.log('Controller functions:', Object.keys(promotionController));

// Test route - no auth required for testing
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Promotion routes are working!' });
});

// ============================================
// STUDENT QUALIFICATION
// ============================================
router.get(
  '/students/:studentId/qualification', 
  verifyToken, 
  promotionController.checkStudentQualification
);

// ============================================
// PROMOTE SELECTED STUDENTS
// ============================================
router.post(
  '/classes/:classId/promote-selected', 
  verifyToken, 
  isAdmin,
  promotionController.promoteSelectedStudents
);

// ============================================
// BULK PROMOTE STUDENTS
// ============================================
router.post(
  '/students/promote-bulk', 
  verifyToken, 
  isAdmin,
  promotionController.promoteBulkStudents
);

// ============================================
// MAIN PROMOTION ROUTES
// ============================================

// Get promotion preview for a class
router.get(
  '/classes/:classId/promotion-preview', 
  verifyToken, 
  isAdmin,
  promotionController.getPromotionPreview
);

// Promote entire class
router.post(
  '/classes/:classId/promote', 
  verifyToken, 
  isAdmin,
  promotionController.promoteClass
);

// Get promotion history
router.get(
  '/history', 
  verifyToken, 
  isAdmin,
  promotionController.getPromotionHistory
);

// Promote single student
router.post(
  '/students/:studentId/promote', 
  verifyToken, 
  isAdmin,
  promotionController.promoteStudent
);

module.exports = router;