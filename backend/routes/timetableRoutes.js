const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin, isTeacher } = require('../middleware/auth');
const timetableGenerator = require('../utils/timetableGenerator');
const pool = require('../config/database');

// Apply authentication to all routes
router.use(verifyToken);

// ============================================
// GET ROUTES - ADMIN
// ============================================

// Get all timetables
router.get('/', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*, c.class_name as class_name,
                   tc.first_name as teacher_first_name, 
                   tc.last_name as teacher_last_name
            FROM timetables t
            JOIN classes c ON t.class_id = c.id
            LEFT JOIN teachers tc ON t.teacher_id = tc.id
            ORDER BY t.class_id, t.day_of_week, t.start_time
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching timetables:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get timetable statistics
router.get('/stats', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_entries,
                COUNT(DISTINCT class_id) as total_classes_with_timetable,
                COUNT(DISTINCT teacher_id) as total_teachers_with_timetable,
                COUNT(DISTINCT day_of_week) as total_days
            FROM timetables
        `);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching timetable stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get timetable for a specific class
router.get('/class/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        
        const result = await pool.query(`
            SELECT t.*, 
                   tc.first_name as teacher_first_name, 
                   tc.last_name as teacher_last_name
            FROM timetables t
            LEFT JOIN teachers tc ON t.teacher_id = tc.id
            WHERE t.class_id = $1
            ORDER BY 
                CASE t.day_of_week
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                END,
                t.start_time
        `, [classId]);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching timetable:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get class subjects
router.get('/class/:classId/subjects', isAdmin, async (req, res) => {
    try {
        const { classId } = req.params;
        
        const result = await pool.query(`
            SELECT 
                cs.id,
                cs.subject_id,
                cs.hours_per_week,
                cs.periods_per_week,
                cs.priority,
                s.name as subject_name,
                s.code as subject_code,
                s.description
            FROM class_subjects cs
            JOIN subjects s ON cs.subject_id = s.id
            WHERE cs.class_id = $1
            ORDER BY cs.priority DESC, s.name
        `, [classId]);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching class subjects:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single timetable entry
router.get('/entry/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT t.*, c.class_name as class_name
            FROM timetables t
            JOIN classes c ON t.class_id = c.id
            WHERE t.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Entry not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching entry:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get teacher availability
router.get('/teacher-availability/:teacherId', isAdmin, async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        const result = await pool.query(`
            SELECT day_of_week, start_time, end_time, is_available
            FROM teacher_availability
            WHERE teacher_id = $1
            ORDER BY 
                CASE day_of_week
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                END,
                start_time
        `, [teacherId]);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error getting teacher availability:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// POST ROUTES - CREATE
// ============================================

// Create single timetable entry
router.post('/', isAdmin, async (req, res) => {
    try {
        const { class_id, teacher_id, subject, day_of_week, start_time, end_time, room, term, academic_year } = req.body;
        
        // Check for conflicts
        const conflict = await pool.query(`
            SELECT * FROM timetables 
            WHERE class_id = $1 AND day_of_week = $2 
            AND (
                (start_time < $4 AND end_time > $3) OR
                (start_time < $3 AND end_time > $3) OR
                (start_time >= $3 AND start_time < $4)
            )
        `, [class_id, day_of_week, start_time, end_time]);
        
        if (conflict.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                error: 'Schedule conflict! Another class is already scheduled at this time.' 
            });
        }
        
        const result = await pool.query(`
            INSERT INTO timetables (
                class_id, teacher_id, subject, day_of_week, 
                start_time, end_time, room, term, academic_year
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [class_id, teacher_id, subject, day_of_week, start_time, end_time, room, term || 1, academic_year || '2024-2025']);
        
        res.status(201).json({ success: true, data: result.rows[0], message: 'Timetable entry created' });
    } catch (error) {
        console.error('Error creating entry:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk create timetable entries
router.post('/bulk', isAdmin, async (req, res) => {
    try {
        const { entries } = req.body;
        
        if (!entries || entries.length === 0) {
            return res.status(400).json({ success: false, error: 'No entries provided' });
        }
        
        // Clear existing timetable for this class
        await pool.query(`DELETE FROM timetables WHERE class_id = $1`, [entries[0].class_id]);
        
        let savedCount = 0;
        for (const entry of entries) {
            await pool.query(`
                INSERT INTO timetables (
                    class_id, teacher_id, subject, day_of_week, 
                    start_time, end_time, room, term, academic_year
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [entry.class_id, entry.teacher_id, entry.subject, entry.day_of_week, 
                entry.start_time, entry.end_time, entry.room, entry.term || 1, entry.academic_year || '2024-2025']);
            savedCount++;
        }
        
        res.json({ success: true, message: `${savedCount} entries created`, count: savedCount });
    } catch (error) {
        console.error('Error bulk creating entries:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Auto-generate timetable for single class
router.post('/auto-generate', isAdmin, async (req, res) => {
    try {
        const { classId, term = 1, academic_year = '2024-2025' } = req.body;
        
        if (!classId) {
            return res.status(400).json({ success: false, error: 'Class ID is required' });
        }
        
        console.log(`🎓 Auto-generating timetable for class ${classId}`);
        
        const result = await timetableGenerator.generateTimetable(classId, term, academic_year);
        
        res.json({
            success: true,
            message: 'Timetable generated successfully',
            data: {
                entries_count: result.savedCount,
                subjects_used: result.subjects?.length || 0,
                className: result.className
            }
        });
    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Auto-generate for ALL classes
router.post('/auto-generate-all', isAdmin, async (req, res) => {
    try {
        const { term = 1, academic_year = '2024-2025' } = req.body;
        
        const classesResult = await pool.query('SELECT id, class_name FROM classes ORDER BY id');
        const classes = classesResult.rows;
        
        if (classes.length === 0) {
            return res.status(404).json({ success: false, error: 'No classes found' });
        }
        
        let results = [];
        let totalEntries = 0;
        
        for (const classItem of classes) {
            console.log(`🎓 Generating timetable for ${classItem.class_name} (ID: ${classItem.id})`);
            
            try {
                const result = await timetableGenerator.generateTimetable(classItem.id, term, academic_year);
                results.push({
                    class_id: classItem.id,
                    class_name: classItem.class_name,
                    status: 'success',
                    entries: result.savedCount
                });
                totalEntries += result.savedCount;
            } catch (error) {
                console.error(`Error generating for class ${classItem.id}:`, error);
                results.push({
                    class_id: classItem.id,
                    class_name: classItem.class_name,
                    status: 'error',
                    error: error.message
                });
            }
        }
        
        res.json({
            success: true,
            message: `Generated timetables for ${classes.length} classes`,
            data: {
                total_classes: classes.length,
                total_entries: totalEntries,
                results: results
            }
        });
        
    } catch (error) {
        console.error('Error generating all timetables:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate for SELECTED classes only
router.post('/auto-generate-selected', isAdmin, async (req, res) => {
    try {
        const { classIds, term = 1, academic_year = '2024-2025' } = req.body;
        
        if (!classIds || classIds.length === 0) {
            return res.status(400).json({ success: false, error: 'No class IDs provided' });
        }
        
        let results = [];
        let totalEntries = 0;
        
        for (const classId of classIds) {
            const classResult = await pool.query('SELECT class_name FROM classes WHERE id = $1', [classId]);
            const className = classResult.rows[0]?.class_name || `Class ${classId}`;
            
            console.log(`🎓 Generating timetable for ${className} (ID: ${classId})`);
            
            try {
                const result = await timetableGenerator.generateTimetable(classId, term, academic_year);
                results.push({
                    class_id: classId,
                    class_name: className,
                    status: 'success',
                    entries: result.savedCount
                });
                totalEntries += result.savedCount;
            } catch (error) {
                console.error(`Error generating for class ${classId}:`, error);
                results.push({
                    class_id: classId,
                    class_name: className,
                    status: 'error',
                    error: error.message
                });
            }
        }
        
        res.json({
            success: true,
            message: `Generated timetables for ${classIds.length} classes`,
            data: {
                total_classes: classIds.length,
                total_entries: totalEntries,
                results: results
            }
        });
        
    } catch (error) {
        console.error('Error generating selected timetables:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Set class subjects
router.post('/class/:classId/subjects', isAdmin, async (req, res) => {
    try {
        const { classId } = req.params;
        const { subjects } = req.body;
        
        if (!subjects) {
            return res.status(400).json({ 
                success: false, 
                error: 'Subjects are required' 
            });
        }
        
        // Clear existing subjects
        await pool.query('DELETE FROM class_subjects WHERE class_id = $1', [classId]);
        
        // Insert new subjects
        for (const subject of subjects) {
            await pool.query(`
                INSERT INTO class_subjects (class_id, subject_id, hours_per_week, periods_per_week, priority)
                VALUES ($1, $2, $3, $4, $5)
            `, [classId, subject.subject_id, subject.hours_per_week || 4, subject.periods_per_week || 3, subject.priority || 1]);
        }
        
        res.json({
            success: true,
            message: 'Class subjects updated successfully'
        });
    } catch (error) {
        console.error('Error setting class subjects:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Set teacher availability
router.post('/teacher-availability', isAdmin, async (req, res) => {
    try {
        const { teacher_id, availability } = req.body;
        
        if (!teacher_id || !availability) {
            return res.status(400).json({ 
                success: false, 
                error: 'Teacher ID and availability are required' 
            });
        }
        
        // Clear existing availability
        await pool.query('DELETE FROM teacher_availability WHERE teacher_id = $1', [teacher_id]);
        
        // Insert new availability
        for (const slot of availability) {
            await pool.query(`
                INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time, is_available)
                VALUES ($1, $2, $3, $4, true)
            `, [teacher_id, slot.day, slot.start_time, slot.end_time]);
        }
        
        res.json({
            success: true,
            message: 'Teacher availability updated successfully'
        });
    } catch (error) {
        console.error('Error setting teacher availability:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PUT ROUTES - UPDATE
// ============================================

// Update timetable entry
router.put('/entry/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { teacher_id, subject, day_of_week, start_time, end_time, room } = req.body;
        
        const result = await pool.query(`
            UPDATE timetables 
            SET teacher_id = COALESCE($1, teacher_id),
                subject = COALESCE($2, subject),
                day_of_week = COALESCE($3, day_of_week),
                start_time = COALESCE($4, start_time),
                end_time = COALESCE($5, end_time),
                room = COALESCE($6, room),
                updated_at = NOW()
            WHERE id = $7
            RETURNING *
        `, [teacher_id, subject, day_of_week, start_time, end_time, room, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Entry not found' });
        }
        
        res.json({ success: true, data: result.rows[0], message: 'Timetable entry updated' });
    } catch (error) {
        console.error('Error updating entry:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DELETE ROUTES
// ============================================

// Delete single entry
router.delete('/entry/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM timetables WHERE id = $1', [id]);
        res.json({ success: true, message: 'Entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting entry:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Clear all entries for a class
router.delete('/class/:classId', isAdmin, async (req, res) => {
    try {
        const { classId } = req.params;
        const result = await pool.query('DELETE FROM timetables WHERE class_id = $1 RETURNING id', [classId]);
        res.json({ success: true, message: `${result.rowCount} entries deleted` });
    } catch (error) {
        console.error('Error clearing entries:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// TEACHER DASHBOARD ROUTES
// ============================================

// Get teacher's complete dashboard timetable
router.get('/teacher/dashboard/:teacherId', isTeacher, async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        // Get teacher info
        const teacherResult = await pool.query(`
            SELECT id, first_name, last_name, email, department, subject_specialty
            FROM teachers 
            WHERE id = $1
        `, [teacherId]);
        
        if (teacherResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Teacher not found' 
            });
        }
        
        const teacher = teacherResult.rows[0];
        
        // Get teacher's timetable
        const timetableResult = await pool.query(`
            SELECT 
                t.*,
                c.class_name,
                c.level,
                c.room_number
            FROM timetables t
            JOIN classes c ON t.class_id = c.id
            WHERE t.teacher_id = $1
            ORDER BY 
                CASE t.day_of_week
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                END,
                t.start_time
        `, [teacherId]);
        
        // Get today's classes
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const todayClasses = timetableResult.rows.filter(t => t.day_of_week === today);
        
        // Get teacher's classes with student count
        const classesResult = await pool.query(`
            SELECT 
                c.id,
                c.class_name,
                c.level,
                c.stream,
                COUNT(DISTINCT s.id) as student_count
            FROM classes c
            LEFT JOIN students s ON s.class_id = c.id AND s.status = 'Active'
            WHERE c.teacher_id = $1
            GROUP BY c.id
            ORDER BY c.class_name
        `, [teacherId]);
        
        // Group timetable by day
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const weeklySchedule = daysOfWeek.map(day => ({
            day,
            classes: timetableResult.rows.filter(t => t.day_of_week === day)
        }));
        
        res.json({
            success: true,
            data: {
                teacher: {
                    id: teacher.id,
                    first_name: teacher.first_name,
                    last_name: teacher.last_name,
                    email: teacher.email,
                    department: teacher.department,
                    subject_specialty: teacher.subject_specialty
                },
                stats: {
                    total_classes_per_week: timetableResult.rows.length,
                    today_classes: todayClasses.length,
                    assigned_classes: classesResult.rows.length,
                    total_students: classesResult.rows.reduce((sum, c) => sum + parseInt(c.student_count || 0), 0)
                },
                timetable: timetableResult.rows,
                today_classes: todayClasses,
                weekly_schedule: weeklySchedule,
                classes: classesResult.rows
            }
        });
        
    } catch (error) {
        console.error('Error getting teacher dashboard:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get teacher's today's classes
router.get('/teacher/:teacherId/today', isTeacher, async (req, res) => {
    try {
        const { teacherId } = req.params;
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        
        const result = await pool.query(`
            SELECT 
                t.*,
                c.class_name,
                c.level,
                c.room_number
            FROM timetables t
            JOIN classes c ON t.class_id = c.id
            WHERE t.teacher_id = $1 AND t.day_of_week = $2
            ORDER BY t.start_time
        `, [teacherId, today]);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            day: today
        });
        
    } catch (error) {
        console.error('Error getting teacher today classes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get teacher's week schedule
router.get('/teacher/:teacherId/week', isTeacher, async (req, res) => {
    try {
        const { teacherId } = req.params;
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
        const result = await pool.query(`
            SELECT 
                t.*,
                c.class_name,
                c.level,
                c.room_number
            FROM timetables t
            JOIN classes c ON t.class_id = c.id
            WHERE t.teacher_id = $1
            ORDER BY 
                CASE t.day_of_week
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                END,
                t.start_time
        `, [teacherId]);
        
        const weeklySchedule = daysOfWeek.map(day => ({
            day,
            classes: result.rows.filter(t => t.day_of_week === day)
        }));
        
        res.json({
            success: true,
            data: weeklySchedule
        });
        
    } catch (error) {
        console.error('Error getting teacher week schedule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get teacher's timetable (basic)
router.get('/teacher/:teacherId', isTeacher, async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        const result = await pool.query(`
            SELECT t.*, c.class_name, c.level
            FROM timetables t
            JOIN classes c ON t.class_id = c.id
            WHERE t.teacher_id = $1
            ORDER BY 
                CASE t.day_of_week
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                END,
                t.start_time
        `, [teacherId]);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error getting teacher timetable:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// TEST ROUTE
// ============================================
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Timetable routes are working!' });
});

module.exports = router;