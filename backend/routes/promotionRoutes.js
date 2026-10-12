// backend/routes/promotionRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const promotionController = require('../controllers/promotionController');
const { verifyToken, isAdmin, isTeacher } = require('../middleware/auth');

const requireAssignedClass = (req, res, next) => {
  const classId = Number(req.params.classId || req.query.class_id);
  if (!Number.isInteger(classId) || classId <= 0) {
    return res.status(400).json({ success: false, error: 'A valid class_id is required' });
  }
  if (req.user.role !== 'admin' && !(req.user.allowedClassIds || []).some((id) => Number(id) === classId)) {
    return res.status(403).json({ success: false, error: 'Access denied to this class' });
  }
  next();
};

// ============================================================
// DEBUG ROUTES
// ============================================================
router.get('/ping', (req, res) => {
  res.json({ pong: true, message: 'Promotion router is alive!' });
});

// ============================================================
// CLASS ROUTES (for admin page)
// ============================================================

router.get('/classes', verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.class_name,
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
router.get('/students/class/:classId', verifyToken, isAdmin, async (req, res) => {
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
// ✅ Uses the same logic as the dashboard – returns classes for this teacher
router.get('/teacher/classes', verifyToken, isTeacher, async (req, res) => {
  try {
    const teacherId = req.user.role === 'admin' ? null : req.user.teacher_id;
    const result = await pool.query(`
      SELECT 
        c.id,
        c.class_name,
        c.level,
        COUNT(DISTINCT sc.student_id) AS student_count
      FROM classes c
      LEFT JOIN teacher_classes tc ON tc.class_id = c.id
      LEFT JOIN student_classes sc ON c.id = sc.class_id AND sc.is_active = true
      WHERE ($1::int IS NULL OR tc.teacher_id = $1 OR c.teacher_id = $1)
      GROUP BY c.id, c.class_name, c.level
      ORDER BY c.level, c.class_name
    `, [teacherId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ✅ FIXED: Fetch students with qualification + next class
// Removed the teacher check because the dropdown already enforces
// that the teacher is assigned to the selected class.
// ============================================================
router.get('/teacher/promotion/students', verifyToken, isTeacher, requireAssignedClass, async (req, res) => {
  try {
    const { class_id, academic_year, term } = req.query;

    if (!class_id || !academic_year || !term) {
      return res.status(400).json({
        success: false,
        error: 'Missing required filters: class_id, academic_year, term',
      });
    }

    const classIdInt = parseInt(class_id, 10);
    if (isNaN(classIdInt)) {
      return res.status(400).json({ success: false, error: 'Invalid class_id' });
    }

    const query = `
      WITH student_data AS (
        SELECT 
          s.id,
          s.first_name,
          s.last_name,
          s.admission_number,
          c.class_name,
          c.level,
          CAST(regexp_replace(c.class_name, '[^0-9]', '', 'g') AS INTEGER) AS num_part,
          substring(c.class_name FROM '[A-Z]$') AS letter_part,
          COALESCE(
            (SELECT AVG(g.grade::numeric) 
             FROM grades g 
             WHERE g.student_id = s.id 
               AND g.academic_year = $2 
               AND g.term = $3), 
            0
          ) AS average_grade,
          COALESCE(
            (SELECT COUNT(*) FILTER (WHERE a.status = 'present')::float / NULLIF(COUNT(*), 0) * 100
             FROM attendance a 
             WHERE a.student_id = s.id 
               AND a.academic_year = $2 
               AND a.term = $3), 
            0
          ) AS attendance_rate
        FROM students s
        JOIN student_classes sc ON s.id = sc.student_id
        JOIN classes c ON sc.class_id = c.id
        WHERE sc.class_id = $1 
          AND sc.is_active = true
        -- ❌ Removed teacher check – already guaranteed by frontend dropdown
      ),
      with_next_class AS (
        SELECT 
          *,
          CASE
            WHEN level = 'KG' AND num_part = 1 THEN 'KG'
            WHEN level = 'KG' AND num_part = 2 THEN 'Primary'
            WHEN level = 'Primary' AND num_part < 6 THEN 'Primary'
            WHEN level = 'Primary' AND num_part = 6 THEN 'JHS'
            WHEN level = 'JHS' AND num_part < 3 THEN 'JHS'
            ELSE 'GRADUATED'
          END 
          || ' ' 
          || 
          CASE
            WHEN level = 'KG' AND num_part = 1 THEN 2
            WHEN level = 'KG' AND num_part = 2 THEN 1
            WHEN level = 'Primary' AND num_part < 6 THEN num_part + 1
            WHEN level = 'Primary' AND num_part = 6 THEN 1
            WHEN level = 'JHS' AND num_part < 3 THEN num_part + 1
            ELSE NULL
          END
          || COALESCE(letter_part, 'A') AS next_class_name_candidate
        FROM student_data
      )
      SELECT 
        id,
        first_name,
        last_name,
        admission_number,
        class_name,
        average_grade,
        attendance_rate,
        COALESCE(
          (SELECT class_name FROM classes 
           WHERE class_name = next_class_name_candidate LIMIT 1),
          'GRADUATED'
        ) AS suggested_next_class,
        average_grade >= 50 AND attendance_rate >= 75 AS qualified
      FROM with_next_class
      ORDER BY last_name, first_name
    `;

    const result = await pool.query(query, [classIdInt, academic_year, term]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching promotion students:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get next class for preview
router.get(
  '/classes/:classId/next-class',
  verifyToken,
  isTeacher,
  requireAssignedClass,
  promotionController.getNextClass
);

// ============================================================
// ADMIN ROUTES (full control)
// ============================================================

router.get(
  '/admin/promotion/students',
  verifyToken,
  isAdmin,
  promotionController.getStudentsWithQualification
);

router.post(
  '/admin/promotion/save',
  verifyToken,
  isAdmin,
  promotionController.savePromotions
);

// ============================================================
// HISTORY
// ============================================================

router.get(
  '/promotion-history',
  verifyToken,
  isAdmin,
  promotionController.getPromotionHistory
);

// ============================================================
// TEST ROUTE
// ============================================================
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Promotion routes are working!' });
});

module.exports = router;
