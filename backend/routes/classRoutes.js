// backend/routes/classRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, optionalAuth } = require('../middleware/auth');
const classController = require('../controllers/classController');
const pool = require('../config/database');

console.log('=== Class Routes Loading ===');
console.log('✅ Available functions:', Object.keys(classController));

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

// ✅ DEBUG: Return ALL classes – no filtering, logs everything
router.get('/', async (req, res) => {
    console.log('📥 GET /classes called');
    try {
        // First, get all columns to see what's available
        const columnsResult = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'classes'
        `);
        const columns = columnsResult.rows.map(row => row.column_name);
        console.log('📋 Columns in classes table:', columns);

        // Now fetch all rows
        const result = await pool.query(`SELECT * FROM classes ORDER BY id`);
        console.log(`✅ Found ${result.rows.length} classes`);

        // If no rows, return empty array
        if (result.rows.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Map rows to a consistent format: use 'class_name' or fallback to 'name' or 'id'
        const mappedRows = result.rows.map(row => ({
            id: row.id,
            class_name: row.class_name || row.name || `Class ${row.id}`,
            name: row.name || row.class_name || `Class ${row.id}`,
            level: row.level || 'N/A',
            capacity: row.capacity || 0,
            academic_year: row.academic_year || '2025-2026',
            // include all original fields for debugging
            ...row
        }));

        console.log('📦 First row sample:', mappedRows[0]);

        res.json({ success: true, data: mappedRows });
    } catch (error) {
        console.error('❌ Error fetching classes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// OTHER ROUTES (unchanged)
// ============================================

// Get class levels (public)
router.get('/levels', optionalAuth, classController.getLevels);

// Get class statistics (public)
router.get('/statistics', optionalAuth, classController.getClassStatistics);

// Get all subjects (public)
router.get('/subjects/all', optionalAuth, classController.getAllSubjects);

// Get classes with teachers (public)
router.get('/with-teachers', optionalAuth, classController.getClassesWithTeachers);

// ============================================
// SPECIFIC ROUTES - MUST COME BEFORE /:id
// ============================================

// Get subjects for a class (specific)
router.get('/:classId/subjects', optionalAuth, classController.getClassSubjects);

// Preview promotion data for a class
router.get('/:classId/promotion-preview', verifyToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const classRes = await pool.query(
            'SELECT * FROM classes WHERE id = $1',
            [classId]
        );

        if (classRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }

        const classData = classRes.rows[0];
        const studentsRes = await pool.query(`
            WITH active_enrollments AS (
                SELECT student_id
                FROM student_classes
                WHERE class_id = $1 AND is_active = true
                UNION
                SELECT s.id
                FROM students s
                WHERE s.class_id = $1 AND s.status = 'Active'
            )
            SELECT s.id, s.admission_number, s.first_name, s.last_name, s.gender
            FROM active_enrollments ae
            JOIN students s ON s.id = ae.student_id
            WHERE s.status = 'Active'
            ORDER BY s.last_name, s.first_name
        `, [classId]);

        const studentsList = studentsRes.rows;
        const nextClassName = (() => {
            const className = classData.class_name || classData.name || '';
            const match = className.match(/(\d+)/);
            if (!match) return 'GRADUATED';
            const num = parseInt(match[1], 10);
            const level = classData.level || 'Primary';
            if (level === 'KG' && num < 2) return 'Primary 1A';
            if (level === 'Primary' && num < 6) return `Primary ${num + 1}A`;
            if (level === 'JHS' && num < 3) return `JHS${num + 1}A`;
            return 'GRADUATED';
        })();

        res.json({
            success: true,
            data: {
                current_class: {
                    id: classData.id,
                    name: classData.class_name || classData.name || `Class ${classData.id}`,
                    class_name: classData.class_name || classData.name || `Class ${classData.id}`,
                    level: classData.level || 'N/A',
                    academic_year: classData.academic_year || '2025-2026'
                },
                total_students: studentsList.length,
                suggested_next_class: nextClassName,
                is_graduation: nextClassName === 'GRADUATED',
                students_list: studentsList,
                academic_year: classData.academic_year || '2025-2026'
            }
        });
    } catch (error) {
        console.error('❌ Error fetching promotion preview:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ GET STUDENTS IN A CLASS - MOVED BEFORE /:id
router.get('/:classId/students', verifyToken, async (req, res) => {
    try {
        const { classId } = req.params;
        
        console.log(`📚 Fetching students for class ${classId}`);
        
        const classCheck = await pool.query(
            'SELECT * FROM classes WHERE id = $1',
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
                COALESCE(c.class_name, c.name, 'Not Assigned') as class_name
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.class_id = $1 AND s.status = 'Active'
            ORDER BY s.last_name, s.first_name
        `, [classId]);
        
        console.log(`✅ Found ${result.rows.length} students for class ${classCheck.rows[0].class_name || classCheck.rows[0].name}`);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            class_name: classCheck.rows[0].class_name || classCheck.rows[0].name
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