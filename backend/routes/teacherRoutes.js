// backend/routes/teacherRoutes.js
const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, isAdmin, isTeacher } = require('../middleware/auth');
const pool = require('../config/database');

// ============================================
// PUBLIC/ADMIN ROUTES
// ============================================

router.get('/', isAdmin, teacherController.getAllTeachers);
router.get('/statistics', isAdmin, teacherController.getTeacherStatistics);
router.get('/departments', isAdmin, teacherController.getDepartments);
router.post('/', isAdmin, teacherController.createTeacher);
router.put('/:id', isAdmin, teacherController.updateTeacher);
router.delete('/:id', isAdmin, teacherController.deleteTeacher);
router.post('/:id/reset-password', isAdmin, teacherController.resetTeacherPassword);

// ============================================
// TEACHER DASHBOARD ROUTES (with /dashboard prefix)
// ============================================

router.get('/dashboard/classes', verifyToken, isTeacher, teacherController.getMyClasses);
router.get('/dashboard/class/:classId/students', verifyToken, isTeacher, teacherController.getClassStudents);
router.get('/dashboard/subjects', verifyToken, isTeacher, teacherController.getMySubjects);
router.get('/dashboard/stats', verifyToken, isTeacher, teacherController.getTeacherStats);
router.get('/dashboard/today-schedule', verifyToken, isTeacher, teacherController.getTodaySchedule);
router.get('/dashboard/notifications', verifyToken, isTeacher, teacherController.getNotifications);
router.get('/dashboard/recent-activities', verifyToken, isTeacher, teacherController.getRecentActivities);
router.post('/dashboard/attendance', verifyToken, isTeacher, dashboardController.saveAttendance);
router.get('/dashboard/attendance/:classId/:date', verifyToken, isTeacher, dashboardController.getAttendanceByClass);
router.post('/dashboard/marks', verifyToken, isTeacher, teacherController.saveMarks);
router.get('/dashboard/marks/:classId/:subjectId', verifyToken, isTeacher, teacherController.getMarks);

// ============================================
// FRONTEND COMPATIBILITY ROUTES (without /dashboard prefix)
// ============================================

// Get teacher's classes
router.get('/classes', verifyToken, isTeacher, async (req, res) => {
    try {
        const teacherId = req.user?.teacher_id;
        if (!teacherId) {
            return res.status(403).json({ success: false, error: 'Teacher profile not found' });
        }
        
        const result = await pool.query(`
            SELECT 
                c.id,
                c.class_name,
                c.level,
                c.teacher_id,
                COUNT(DISTINCT s.id) as student_count
            FROM classes c
            LEFT JOIN students s ON s.class_id = c.id AND s.status = 'Active'
            WHERE c.teacher_id = $1 OR EXISTS (
                SELECT 1 FROM teacher_classes tc
                WHERE tc.teacher_id = $1 AND tc.class_id = c.id
                  AND COALESCE(tc.is_active, true) = true
            )
            GROUP BY c.id, c.class_name, c.level, c.teacher_id
            ORDER BY c.class_name
        `, [teacherId]);
        
        console.log(`✅ Found ${result.rows.length} classes for teacher ${teacherId}`);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('❌ Error fetching teacher classes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get students in a class
router.get('/classes/:classId/students', verifyToken, isTeacher, async (req, res) => {
    try {
        const { classId } = req.params;
        if (req.user.role === 'teacher' && !req.user.allowedClassIds?.includes(Number(classId))) {
            return res.status(403).json({ success: false, error: 'Access denied to this class' });
        }
        const result = await pool.query(`
            SELECT s.id, s.admission_number, s.first_name, s.last_name,
                   s.gender, s.date_of_birth, s.status, s.enrollment_date,
                   s.parent_name, s.parent_phone, s.parent_email, c.class_name
            FROM students s
            JOIN classes c ON c.id = s.class_id
            WHERE s.class_id = $1 AND (s.status = 'Active' OR s.status = 'active' OR s.status IS NULL)
            ORDER BY s.last_name, s.first_name
        `, [classId]);
        res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
        console.error('Error fetching teacher class students:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/subjects', verifyToken, isTeacher, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT s.id, s.name, s.code, s.level, s.description
            FROM subjects s
            WHERE EXISTS (
                SELECT 1 FROM class_subjects cs
                JOIN teacher_classes tc ON tc.class_id = cs.class_id
                WHERE tc.teacher_id = $1 AND cs.subject_id = s.id
            ) OR EXISTS (
                SELECT 1 FROM teacher_subjects ts
                WHERE ts.teacher_id = $1 AND ts.subject_id = s.id
            )
            ORDER BY s.name
        `, [req.user.teacher_id]);
        res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
        console.error('Error fetching teacher subjects:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/stats', verifyToken, isTeacher, teacherController.getTeacherStats);
// Get marks by class
router.get('/marks/:classId', verifyToken, isTeacher, async (req, res) => {
    try {
        const { classId } = req.params;
        const { term, academic_year } = req.query;
        const teacherId = req.user?.teacher_id;
        if (!teacherId) {
            return res.status(403).json({ success: false, error: 'Teacher profile not found' });
        }
        
        let query = `
            SELECT 
                m.id,
                m.student_id,
                m.subject_id,
                m.class_id,
                m.teacher_id,
                m.exam_type,
                m.marks,
                m.grade,
                m.remarks,
                m.academic_year,
                m.created_at,
                m.updated_at
            FROM marks m
            WHERE m.class_id = $1 AND m.teacher_id = $2
        `;
        
        const params = [classId, teacherId];
        let paramIndex = 3;
        
        if (term) {
            query += ` AND m.term = $${paramIndex}`;
            params.push(term);
            paramIndex++;
        }
        
        if (academic_year) {
            query += ` AND m.academic_year = $${paramIndex}`;
            params.push(academic_year);
        }
        
        query += ` ORDER BY m.student_id, m.subject_id, m.exam_type`;
        
        const result = await pool.query(query, params);
        
        console.log(`✅ Found ${result.rows.length} marks for class ${classId}`);
        
        res.json({ 
            success: true, 
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('❌ Error getting marks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate report cards
router.post('/marks/report-cards', verifyToken, isTeacher, async (req, res) => {
    try {
        const { class_id, teacher_id, term, academic_year } = req.body;
        
        console.log(`📄 Generating report cards for class: ${class_id}`);
        
        if (!class_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Class ID is required' 
            });
        }
        
        const studentsQuery = `
            SELECT 
                s.id,
                s.admission_number,
                s.first_name,
                s.last_name,
                s.gender
            FROM students s
            WHERE s.class_id = $1 AND (s.status = 'Active' OR s.status IS NULL)
            ORDER BY s.last_name, s.first_name
        `;
        
        const studentsResult = await pool.query(studentsQuery, [class_id]);
        
        const subjectsQuery = `
            SELECT DISTINCT
                s.id,
                s.name,
                s.code
            FROM subjects s
            INNER JOIN class_subjects cs ON cs.subject_id = s.id
            WHERE cs.class_id = $1
            ORDER BY s.name
        `;
        
        const subjectsResult = await pool.query(subjectsQuery, [class_id]);
        
        if (subjectsResult.rows.length === 0) {
            const allSubjects = await pool.query(`
                SELECT id, name, code FROM subjects ORDER BY name
            `);
            subjectsResult.rows = allSubjects.rows;
        }
        
        const marksQuery = `
            SELECT 
                m.student_id,
                m.subject_id,
                m.exam_type,
                m.marks,
                m.grade,
                m.remarks
            FROM marks m
            WHERE m.class_id = $1
            AND (m.term = $2 OR m.term IS NULL)
            AND (m.academic_year = $3 OR m.academic_year IS NULL)
        `;
        
        const marksResult = await pool.query(marksQuery, [
            class_id, 
            term || '1', 
            academic_year || '2024-2025'
        ]);
        
        res.json({
            success: true,
            data: {
                students: studentsResult.rows,
                subjects: subjectsResult.rows,
                marks: marksResult.rows,
                count: studentsResult.rows.length
            },
            message: 'Report data generated successfully'
        });
    } catch (error) {
        console.error('❌ Error generating report cards:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Keep this parameter route last so it cannot capture paths like /classes or /stats.
router.get('/:id', isAdmin, teacherController.getTeacherById);

module.exports = router;
