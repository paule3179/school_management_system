// backend/routes/classRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, optionalAuth } = require('../middleware/auth');
const classController = require('../controllers/classController');
const pool = require('../config/database');

console.log('=== Class Routes Loading ===');
console.log('✅ Available functions:', Object.keys(classController));

// ============================================
// PUBLIC ROUTES (with optional auth)
// ============================================

// Get all classes
router.get('/', optionalAuth, classController.getAllClasses);

// Get class levels
router.get('/levels', optionalAuth, classController.getLevels);

// Get class statistics
router.get('/statistics', optionalAuth, classController.getClassStatistics);

// Get all subjects (public)
router.get('/subjects/all', optionalAuth, classController.getAllSubjects);

// Get classes with teachers
router.get('/with-teachers', optionalAuth, classController.getClassesWithTeachers);

// ============================================
// SPECIFIC ROUTES - MUST COME BEFORE /:id
// ============================================

// Get subjects for a class (specific)
router.get('/:classId/subjects', optionalAuth, classController.getClassSubjects);

// ✅ GET STUDENTS IN A CLASS - MOVED BEFORE /:id
router.get('/:classId/students', verifyToken, async (req, res) => {
    try {
        const { classId } = req.params;
        
        console.log(`📚 Fetching students for class ${classId}`);
        
        // Check if class exists
        const classCheck = await pool.query(
            'SELECT id, class_name FROM classes WHERE id = $1',
            [classId]
        );
        
        if (classCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Class not found'
            });
        }
        
        const result = await pool.query(`
            SELECT 
                s.id,
                s.admission_number,
                s.first_name,
                s.last_name,
                s.gender,
                s.date_of_birth,
                s.parent_name,
                s.parent_phone,
                s.parent_email,
                s.status,
                s.enrollment_date,
                COALESCE(c.class_name, 'Not Assigned') as class_name
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.class_id = $1 AND s.status = 'Active'
            ORDER BY s.last_name, s.first_name
        `, [classId]);
        
        console.log(`✅ Found ${result.rows.length} students for class ${classCheck.rows[0].class_name}`);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            class_name: classCheck.rows[0].class_name
        });
        
    } catch (error) {
        console.error('❌ Error fetching class students:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET CLASS BY ID - MUST BE LAST FOR :id PARAM
// ============================================
router.get('/:id', optionalAuth, classController.getClassById);

// ============================================
// PROTECTED ROUTES (Admin only)
// ============================================

// --- CLASS CRUD ---
router.post('/', verifyToken, isAdmin, classController.createClass);
router.put('/:id', verifyToken, isAdmin, classController.updateClass);
router.delete('/:id', verifyToken, isAdmin, classController.deleteClass);

// --- CLASS SUBJECT MANAGEMENT ---
router.put('/subjects/:id', verifyToken, isAdmin, classController.updateClassSubject);
router.delete('/subjects/:id', verifyToken, isAdmin, classController.removeSubjectFromClass);
router.put('/class-subjects/:classSubjectId/teacher', verifyToken, isAdmin, classController.assignTeacherToSubject);

// --- TEACHER ASSIGNMENT ---
router.get('/teachers/available', verifyToken, isAdmin, classController.getAvailableTeachers);
router.post('/assign-teacher', verifyToken, isAdmin, classController.assignTeacherToClass);
router.delete('/:classId/teacher/:teacherId', verifyToken, isAdmin, classController.removeTeacherFromClass);

// --- STUDENT PROMOTION ---
router.post('/promote/:currentClassId/to/:nextClassId', verifyToken, isAdmin, classController.promoteClassStudents);
router.post('/promote/bulk', verifyToken, isAdmin, classController.bulkPromoteStudents);

// --- ARCHIVE ---
router.post('/:id/archive', verifyToken, isAdmin, classController.archiveClass);
router.post('/:id/restore', verifyToken, isAdmin, classController.restoreClass);
router.get('/archived/all', verifyToken, isAdmin, classController.getArchivedClasses);

module.exports = router;