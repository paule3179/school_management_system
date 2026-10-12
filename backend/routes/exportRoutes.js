const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const pool = require('../config/database');
const { verifyToken, enrichUserContext, isAdmin, hasRole } = require('../middleware/auth');

router.use(verifyToken, enrichUserContext);

// Exports can contain large amounts of sensitive student and financial data.
router.get('/students/excel', isAdmin, exportController.exportStudentsToExcel);
router.get('/fees/excel', isAdmin, exportController.exportFeesReport);

const requireAssignedExportClass = async (req, res, next) => {
  if (req.user.role === 'admin') return next();
  const classId = Number(req.query.class_id);
  if (!Number.isInteger(classId) || classId <= 0) {
    return res.status(400).json({ success: false, error: 'A class_id is required' });
  }
  if (!(req.user.allowedClassIds || []).some((id) => Number(id) === classId)) {
    return res.status(403).json({ success: false, error: 'Access denied to this class' });
  }
  next();
};

router.get('/attendance/excel', hasRole('admin', 'teacher'), requireAssignedExportClass, exportController.exportAttendanceReport);

const requireReportCardAccess = async (req, res, next) => {
  try {
    const studentId = Number(req.query.studentId);
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ success: false, error: 'A valid studentId is required' });
    }
    if (req.user.role === 'admin') return next();

    const result = await pool.query('SELECT class_id FROM students WHERE id = $1', [studentId]);
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Student not found' });
    if (req.user.role === 'parent' && (req.user.allowedStudentIds || []).some((id) => Number(id) === studentId)) {
      return next();
    }
    if (req.user.role === 'teacher' && (req.user.allowedClassIds || []).some((id) => Number(id) === Number(result.rows[0].class_id))) {
      return next();
    }
    return res.status(403).json({ success: false, error: 'Access denied to this student' });
  } catch (error) {
    console.error('Unable to verify report card export access:', error.message);
    return res.status(500).json({ success: false, error: 'Unable to verify report card access' });
  }
};

router.get('/report-card/pdf', hasRole('admin', 'teacher', 'parent'), requireReportCardAccess, exportController.generatePDFReportCard);


module.exports = router;
