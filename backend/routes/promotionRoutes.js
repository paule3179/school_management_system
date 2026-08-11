// backend/routes/promotionRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const promotionController = require('../controllers/promotionController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// ============================================================
// CLASS ROUTES (for admin page)
// ============================================================

// Get all classes with student counts
router.get('/classes', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.class_name,  -- ✅ CORRECT: 'class_name', not 'name'
        c.level,
        c.capacity,
        COUNT(DISTINCT sc.student_id) AS student_count
      FROM classes c
      LEFT JOIN student_classes sc ON c.id = sc.class_id AND sc.is_active = true
      GROUP BY c.id, c.class_name, c.level, c.capacity
      ORDER BY c.level, c.class_name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get students by class ID (for student count)
router.get('/students/class/:classId', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const result = await pool.query(`
      SELECT 
        s.id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.gender
      FROM students s
      JOIN student_classes sc ON s.id = sc.student_id
      WHERE sc.class_id = $1 AND sc.is_active = true
      ORDER BY s.last_name, s.first_name
    `, [classId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching students by class:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// TEACHER ROUTES (view‑only)
// ============================================================

// Get teacher's assigned classes (for the dropdown)
router.get('/teacher/classes', verifyToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const result = await pool.query(`
      SELECT 
        c.id,
        c.class_name,
        c.level,
        COUNT(DISTINCT sc.student_id) AS student_count
      FROM teacher_classes tc
      JOIN classes c ON tc.class_id = c.id
      LEFT JOIN student_classes sc ON c.id = sc.class_id AND sc.is_active = true
      WHERE tc.teacher_id = $1
      GROUP BY c.id, c.class_name, c.level
      ORDER BY c.level, c.class_name
    `, [teacherId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get students with qualification status for a class
router.get(
  '/teacher/promotion/students',
  verifyToken,
  promotionController.getStudentsWithQualification
);

// Get next class for preview
router.get(
  '/classes/:classId/next-class',
  verifyToken,
  promotionController.getNextClass
);

// ============================================================
// ADMIN ROUTES (full control)
// ============================================================

// Get students with qualification status – admin version
router.get(
  '/admin/promotion/students',
  verifyToken,
  isAdmin,
  promotionController.getStudentsWithQualification
);

// Save promotions – processes the final promotion transaction
router.post(
  '/admin/promotion/save',
  verifyToken,
  isAdmin,
  promotionController.savePromotions
);

// ============================================================
// HISTORY (both teachers and admins)
// ============================================================

// Get promotion history with filters
router.get(
  '/promotion-history',
  verifyToken,
  promotionController.getPromotionHistory
);

// ============================================================
// TEST ROUTE (no auth)
// ============================================================
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Promotion routes are working!' });
});

module.exports = router;