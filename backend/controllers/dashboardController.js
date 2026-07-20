// backend/controllers/dashboardController.js
const pool = require('../config/database');

const dashboardController = {};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get parent ID from user ID
 */
const getParentId = async (userId, userEmail) => {
    // Try both id and user_id since the JWT may store either value
    // Join with users table because 'email' is stored in users, not parents
    let result = await pool.query(
        `SELECT p.id, u.email 
         FROM parents p 
         JOIN users u ON p.user_id = u.id 
         WHERE p.id = $1 OR p.user_id = $1`,
        [userId]
    );
    
    if (result.rows.length === 0 && userEmail) {
        // Fallback: try to find parent by email (join with users table)
        result = await pool.query(
            `SELECT p.id, u.email 
             FROM parents p 
             JOIN users u ON p.user_id = u.id 
             WHERE u.email = $1 OR LOWER(u.email) = LOWER($2)`,
            [userEmail, userEmail]
        );
    }
    
    return result.rows[0] || null;
};

/**
 * Verify if a child belongs to a parent using multiple methods
 */
const verifyChildOwnership = async (parentId, childId, userId) => {
    // First get parent email from users table (email is not in parents table)
    const parentResult = await pool.query(
        `SELECT u.email 
         FROM parents p 
         JOIN users u ON p.user_id = u.id 
         WHERE p.id = $1`,
        [parentId]
    );
    const parentEmail = parentResult.rows[0]?.email;

    // Check multiple linking methods
    const result = await pool.query(`
        SELECT 1
        FROM students s
        WHERE s.id = $1
        AND (
            -- Method 1: Direct parent_id link
            s.parent_id = $2
            OR
            -- Method 2: Through parent_email matching
            (s.parent_email IS NOT NULL AND s.parent_email = $3)
        )
        LIMIT 1
    `, [childId, parentId, parentEmail]);

    return result.rows.length > 0;
};

/**
 * Process class data to combine subjects
 */
function processClassData(rows) {
    // Group by class_id to combine subjects
    const classMap = {};
    
    rows.forEach(row => {
        if (!classMap[row.id]) {
            classMap[row.id] = {
                id: row.id,
                class_name: row.class_name,
                level: row.level,
                academic_year: row.academic_year,
                student_count: parseInt(row.student_count) || 0,
                subjects: [],
                subject: null
            };
        }
        
        // Add subject if not already in array
        if (row.subject && row.subject.trim() !== '' && 
            !classMap[row.id].subjects.includes(row.subject)) {
            classMap[row.id].subjects.push(row.subject);
        }
        
        // Also use the subjects array from aggregation if available
        if (row.subjects && Array.isArray(row.subjects)) {
            row.subjects.forEach(subj => {
                if (subj && subj.trim() !== '' && 
                    !classMap[row.id].subjects.includes(subj)) {
                    classMap[row.id].subjects.push(subj);
                }
            });
        }
    });
    
    // Set the first subject as the primary subject for backward compatibility
    Object.keys(classMap).forEach(key => {
        if (classMap[key].subjects.length > 0) {
            classMap[key].subject = classMap[key].subjects[0];
        } else {
            classMap[key].subject = 'No subjects assigned';
        }
    });
    
    return Object.values(classMap);
}

// ============================================
// TEACHER DASHBOARD CONTROLLERS
// ============================================

dashboardController.getTeacherStats = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const teacherQuery = await pool.query(`
            SELECT id FROM teachers WHERE user_id = $1
        `, [userId]);
        
        if (teacherQuery.rows.length === 0) {
            return res.json({ 
                success: true, 
                data: {
                    totalClasses: 0,
                    totalStudents: 0,
                    pendingTasks: 0,
                    attendanceToday: 0
                }
            });
        }
        
        const teacherId = teacherQuery.rows[0].id;
        const academicYear = '2024-2025';
        
        const classesResult = await pool.query(`
            SELECT COUNT(*) as count FROM teacher_classes 
            WHERE teacher_id = $1 AND academic_year = $2
        `, [teacherId, academicYear]);
        
        const studentsResult = await pool.query(`
            SELECT COUNT(DISTINCT cs.student_id) as count
            FROM teacher_classes tc
            JOIN class_students cs ON tc.class_id = cs.class_id
            WHERE tc.teacher_id = $1 AND cs.academic_year = $2
        `, [teacherId, academicYear]);
        
        const today = new Date().toISOString().split('T')[0];
        const attendanceResult = await pool.query(`
            SELECT COUNT(*) as count FROM attendance 
            WHERE teacher_id = $1 AND date = $2
        `, [teacherId, today]);
        
        res.json({
            success: true,
            data: {
                totalClasses: parseInt(classesResult.rows[0]?.count) || 0,
                totalStudents: parseInt(studentsResult.rows[0]?.count) || 0,
                pendingTasks: 0,
                attendanceToday: parseInt(attendanceResult.rows[0]?.count) || 0
            }
        });
    } catch (error) {
        console.error('Error in getTeacherStats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

dashboardController.getTeacherClasses = async (req, res) => {
    try {
        const userId = req.user.id;
        const academicYear = req.query.academic_year || '2024-2025';

        console.log('[getTeacherClasses] userId:', userId);
        console.log('[getTeacherClasses] academicYear:', academicYear);

        const teacherQuery = await pool.query(
            `SELECT id FROM teachers WHERE user_id = $1`,
            [userId]
        );

        if (teacherQuery.rows.length === 0) {
            return res.json({ success: true, data: [], message: 'Teacher profile not found' });
        }

        const teacherId = teacherQuery.rows[0].id;

        const result = await pool.query(
            `SELECT
                c.id,
                c.class_name,
                c.level,
                tc.academic_year,
                tc.subject,
                COUNT(DISTINCT cs.student_id) as student_count,
                ARRAY_AGG(DISTINCT tc.subject)
                  FILTER (WHERE tc.subject IS NOT NULL AND tc.subject != '') as subjects
            FROM teacher_classes tc
            JOIN classes c ON tc.class_id = c.id
            LEFT JOIN class_students cs
              ON c.id = cs.class_id AND cs.academic_year = $1
            WHERE tc.teacher_id = $2 AND tc.academic_year = $3
            GROUP BY c.id, c.class_name, c.level, tc.academic_year, tc.subject
            ORDER BY c.class_name`,
            [academicYear, teacherId, academicYear]
        );

        if (result.rows.length === 0) {
            const fallbackResult = await pool.query(
                `SELECT
                    c.id,
                    c.class_name,
                    c.level,
                    tc.academic_year,
                    tc.subject,
                    COUNT(DISTINCT cs.student_id) as student_count,
                    ARRAY_AGG(DISTINCT tc.subject)
                      FILTER (WHERE tc.subject IS NOT NULL AND tc.subject != '') as subjects
                FROM teacher_classes tc
                JOIN classes c ON tc.class_id = c.id
                LEFT JOIN class_students cs ON c.id = cs.class_id
                WHERE tc.teacher_id = $1
                GROUP BY c.id, c.class_name, c.level, tc.academic_year, tc.subject
                ORDER BY c.class_name`,
                [teacherId]
            );

            const processedData = processClassData(fallbackResult.rows);
            return res.json({
                success: true,
                data: processedData,
                message: 'Showing all classes (no academic year filter)'
            });
        }

        const processedData = processClassData(result.rows);

        return res.json({ success: true, data: processedData });
    } catch (error) {
        console.error('Error in getTeacherClasses:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

dashboardController.getClassStudents = async (req, res) => {
    try {
        const { classId } = req.params;
        const userId = req.user.id;
        const academicYear = req.query.academic_year || '2024-2025';
        
        const teacherQuery = await pool.query(`
            SELECT t.id FROM teachers t
            WHERE t.user_id = $1
        `, [userId]);
        
        if (teacherQuery.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Teacher not found' });
        }
        
        const teacherId = teacherQuery.rows[0].id;
        
        const verifyQuery = await pool.query(`
            SELECT * FROM teacher_classes 
            WHERE teacher_id = $1 AND class_id = $2 AND academic_year = $3
        `, [teacherId, classId, academicYear]);
        
        if (verifyQuery.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'You do not have access to this class' });
        }
        
        const studentsQuery = await pool.query(`
            SELECT 
                s.id,
                s.admission_number,
                s.first_name,
                s.last_name,
                s.gender,
                s.date_of_birth,
                s.status,
                s.parent_name,
                s.parent_phone
            FROM students s
            JOIN class_students cs ON s.id = cs.student_id
            WHERE cs.class_id = $1 AND cs.academic_year = $2
            ORDER BY s.first_name, s.last_name
        `, [classId, academicYear]);
        
        res.json({ success: true, data: studentsQuery.rows });
    } catch (error) {
        console.error('Error in getClassStudents:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

dashboardController.getTeacherSubjects = async (req, res) => {
    try {
        const userId = req.user.id;
        const academicYear = req.query.academic_year || '2024-2025';
        
        const teacherQuery = await pool.query(`
            SELECT id FROM teachers WHERE user_id = $1
        `, [userId]);
        
        if (teacherQuery.rows.length === 0) {
            return res.json({ success: true, data: [] });
        }
        
        const teacherId = teacherQuery.rows[0].id;
        
        const result = await pool.query(`
            SELECT DISTINCT
                tc.subject,
                tc.class_id,
                c.class_name,
                c.level
            FROM teacher_classes tc
            JOIN classes c ON tc.class_id = c.id
            WHERE tc.teacher_id = $1 AND tc.academic_year = $2
            ORDER BY c.class_name, tc.subject
        `, [teacherId, academicYear]);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error in getTeacherSubjects:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

dashboardController.getTodaySchedule = async (req, res) => {
    try {
        const userId = req.user.id;
        const academicYear = req.query.academic_year || '2024-2025';

        const teacherQuery = await pool.query(`
            SELECT id FROM teachers WHERE user_id = $1
        `, [userId]);

        if (teacherQuery.rows.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const teacherId = teacherQuery.rows[0].id;
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

        const result = await pool.query(`
            SELECT 
                t.start_time,
                t.end_time,
                t.subject,
                t.room,
                c.class_name,
                c.level
            FROM timetables t
            JOIN classes c ON t.class_id = c.id
            WHERE t.teacher_id = $1
              AND t.day_of_week = $2
              AND (t.academic_year = $3 OR t.academic_year IS NULL)
            ORDER BY t.start_time
        `, [teacherId, today, academicYear]);

        const rows = (result.rows || []).map(r => ({
            time: r.start_time && r.end_time ? `${r.start_time} - ${r.end_time}` : (r.start_time || 'N/A'),
            subject: r.subject || 'General',
            class_name: r.class_name || 'N/A',
            class_level: r.level || '',
            room: r.room || 'TBD'
        }));

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error in getTodaySchedule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

dashboardController.getTeacherProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(`
            SELECT 
                id, 
                first_name, 
                last_name, 
                email, 
                phone, 
                employee_id, 
                department,
                user_id
            FROM teachers 
            WHERE user_id = $1
        `, [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Teacher profile not found' 
            });
        }
        
        res.json({ 
            success: true, 
            data: result.rows[0] 
        });
    } catch (error) {
        console.error('Error in getTeacherProfile:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

dashboardController.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(`
            SELECT 
                id,
                title,
                message,
                type,
                is_read,
                created_at
            FROM notifications
            WHERE user_id = $1 OR user_type = 'teacher'
            ORDER BY created_at DESC
            LIMIT 10
        `, [userId]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: [
                    {
                        id: 1,
                        title: 'Welcome',
                        message: 'Welcome to your teacher dashboard',
                        type: 'info',
                        is_read: false,
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 2,
                        title: 'Staff Meeting',
                        message: 'Staff meeting tomorrow at 2:00 PM',
                        type: 'warning',
                        is_read: false,
                        created_at: new Date().toISOString()
                    }
                ]
            });
        }
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error in getNotifications:', error);
        res.json({ success: true, data: [] });
    }
};

dashboardController.getRecentActivities = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const teacherQuery = await pool.query(`
            SELECT id FROM teachers WHERE user_id = $1
        `, [userId]);
        
        if (teacherQuery.rows.length === 0) {
            return res.json({ success: true, data: [] });
        }
        
        const teacherId = teacherQuery.rows[0].id;
        
        const result = await pool.query(`
            SELECT 
                activity_type,
                description,
                created_at
            FROM teacher_activities
            WHERE teacher_id = $1
            ORDER BY created_at DESC
            LIMIT 10
        `, [teacherId]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: [
                    { activity_type: 'login', description: 'Logged into the system', created_at: new Date().toISOString() }
                ]
            });
        }
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error in getRecentActivities:', error);
        res.json({ success: true, data: [] });
    }
};

dashboardController.saveAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { class_id, date, attendance_records } = req.body;
        
        if (!class_id || !date || !attendance_records || !Array.isArray(attendance_records)) {
            return res.status(400).json({ success: false, error: 'Invalid request data' });
        }
        
        const teacherQuery = await pool.query(`
            SELECT id FROM teachers WHERE user_id = $1
        `, [userId]);
        
        if (teacherQuery.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Teacher not found' });
        }
        
        const teacherId = teacherQuery.rows[0].id;
        
        await pool.query('BEGIN');
        
        for (const record of attendance_records) {
            await pool.query(`
                INSERT INTO attendance (student_id, class_id, teacher_id, date, status, remarks, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (student_id, class_id, date) 
                DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks, updated_at = NOW()
            `, [record.student_id, class_id, teacherId, date, record.status, record.remarks || null]);
        }
        
        await pool.query('COMMIT');
        
        res.json({ success: true, message: `Attendance saved for ${attendance_records.length} students` });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error in saveAttendance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

dashboardController.getAttendanceByClass = async (req, res) => {
    try {
        const { classId, date } = req.params;
        const userId = req.user.id;
        
        const teacherQuery = await pool.query(`
            SELECT id FROM teachers WHERE user_id = $1
        `, [userId]);
        
        if (teacherQuery.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Teacher not found' });
        }
        
        const result = await pool.query(`
            SELECT 
                a.student_id,
                s.first_name,
                s.last_name,
                s.admission_number,
                a.status,
                a.remarks
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE a.class_id = $1 AND a.date = $2
            ORDER BY s.first_name
        `, [classId, date]);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error in getAttendanceByClass:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// SAVE MARKS - FIXED (uses subject_id)
// ============================================
dashboardController.saveMarks = async (req, res) => {
    try {
        // Accept both 'marks' and 'marks_records' for compatibility
        const marks = req.body.marks || req.body.marks_records;
        
        console.log('📝 Saving marks:', marks ? `Array of ${marks.length} items` : 'No marks data');
        console.log('📝 Request body keys:', Object.keys(req.body));
        
        const userId = req.user.id;
        
        if (!marks || !Array.isArray(marks) || marks.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'No marks provided' 
            });
        }
        
        // Get teacher ID
        const teacherResult = await pool.query(
            'SELECT id FROM teachers WHERE user_id = $1',
            [userId]
        );
        
        if (teacherResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Teacher not found'
            });
        }
        
        const teacherId = teacherResult.rows[0].id;
        const client = await pool.connect();
        let savedCount = 0;
        let updatedCount = 0;
        
        try {
            await client.query('BEGIN');
            
            for (const mark of marks) {
                if (!mark || typeof mark !== 'object') {
                    console.warn('⚠️ Skipping invalid mark:', mark);
                    continue;
                }
                
                // Use subject_id (NOT subject)
                const { 
                    student_id, 
                    subject_id,  // ← CORRECT: Use subject_id
                    class_id, 
                    exam_type, 
                    marks: markValue, 
                    grade, 
                    remarks, 
                    academic_year, 
                    mark_id 
                } = mark;
                
                // Validate required fields
                if (!student_id || !subject_id || !class_id) {
                    console.warn('⚠️ Skipping mark with missing required fields:', mark);
                    continue;
                }
                
                if (mark_id) {
                    const updateResult = await client.query(`
                        UPDATE marks 
                        SET marks = $1, grade = $2, remarks = $3, updated_at = NOW()
                        WHERE id = $4 AND teacher_id = $5
                        RETURNING id
                    `, [markValue, grade, remarks, mark_id, teacherId]);
                    
                    if (updateResult.rows.length > 0) {
                        updatedCount++;
                    }
                } else {
                    const insertResult = await client.query(`
                        INSERT INTO marks (
                            student_id, class_id, subject_id, teacher_id, 
                            exam_type, marks, grade, remarks, academic_year
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        RETURNING id
                    `, [
                        student_id, class_id, subject_id, teacherId,
                        exam_type, markValue, grade, remarks, academic_year
                    ]);
                    
                    if (insertResult.rows.length > 0) {
                        savedCount++;
                    }
                }
            }
            
            await client.query('COMMIT');
            
            console.log(`✅ Saved ${savedCount} marks, updated ${updatedCount} marks`);
            
            res.json({ 
                success: true, 
                message: `${savedCount} marks saved, ${updatedCount} updated`,
                saved: savedCount,
                updated: updatedCount
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error saving marks:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// ============================================
// GET MARKS BY CLASS - FIXED (uses subject_id)
// ============================================
dashboardController.getMarksByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const { term, academic_year, subject_id } = req.query;
        const userId = req.user.id;
        
        console.log(`📊 Getting marks for class: ${classId}`);
        
        // Get teacher ID
        const teacherResult = await pool.query(
            'SELECT id FROM teachers WHERE user_id = $1',
            [userId]
        );
        
        if (teacherResult.rows.length === 0) {
            return res.json({
                success: true,
                data: [],
                count: 0
            });
        }
        
        const teacherId = teacherResult.rows[0].id;
        
        // Use subject_id (NOT subject)
        let query = `
            SELECT 
                m.id,
                m.student_id,
                m.subject_id,  /* ← CORRECT: Use subject_id */
                s.name AS subject_name,
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
            LEFT JOIN subjects s ON s.id = m.subject_id
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
            paramIndex++;
        }
        
        if (subject_id) {
            query += ` AND m.subject_id = $${paramIndex}`;
            params.push(subject_id);
            paramIndex++;
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
};

// ============================================
// GET CLASS SUBJECTS WITH GRADE ENTRY FIELDS
// ============================================

dashboardController.getClassSubjectsForGrading = async (req, res) => {
    try {
        const userId = req.user.id;
        const { classId } = req.params;
        const { academic_year, term_id } = req.query;

        const teacherQuery = await pool.query(`
            SELECT id, first_name, last_name FROM teachers WHERE user_id = $1
        `, [userId]);

        if (teacherQuery.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'Teacher not found' 
            });
        }

        const teacherId = teacherQuery.rows[0].id;
        const currentAcademicYear = academic_year || '2024-2025';
        const currentTerm = term_id || 1;

        // Verify teacher has access to this class
        const verifyQuery = await pool.query(`
            SELECT * FROM teacher_classes 
            WHERE teacher_id = $1 
            AND class_id = $2 
            AND academic_year = $3
        `, [teacherId, classId, currentAcademicYear]);

        if (verifyQuery.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have access to this class' 
            });
        }

        // Get ALL subjects for this class from class_subjects
        let subjects = [];

        const classSubjectsResult = await pool.query(`
            SELECT 
                cs.id,
                cs.class_id,
                cs.subject_id,
                cs.teacher_id,
                cs.academic_year,
                s.name as subject_name,
                s.code as subject_code,
                s.description as subject_description
            FROM class_subjects cs
            JOIN subjects s ON cs.subject_id = s.id
            WHERE cs.class_id = $1 
            AND cs.academic_year = $2
            ORDER BY s.name
        `, [classId, currentAcademicYear]);

        if (classSubjectsResult.rows.length > 0) {
            subjects = classSubjectsResult.rows.map(row => ({
                id: row.subject_id,
                name: row.subject_name,
                code: row.subject_code,
                description: row.subject_description,
                teacher_id: row.teacher_id,
                class_subject_id: row.id
            }));
        } else {
            // Fallback: Get from teacher_classes
            const teacherSubjectsResult = await pool.query(`
                SELECT DISTINCT
                    tc.subject as subject_name,
                    s.id as subject_id,
                    s.code as subject_code,
                    s.description as subject_description
                FROM teacher_classes tc
                LEFT JOIN subjects s ON LOWER(s.name) = LOWER(tc.subject) OR s.code = tc.subject
                WHERE tc.class_id = $1 
                AND tc.academic_year = $2
                ORDER BY tc.subject
            `, [classId, currentAcademicYear]);

            subjects = teacherSubjectsResult.rows.map(row => ({
                id: row.subject_id,
                name: row.subject_name,
                code: row.subject_code,
                description: row.subject_description,
                teacher_id: null,
                class_subject_id: null
            }));
        }

        // If still no subjects, get from subjects table (last resort)
        if (subjects.length === 0) {
            const allSubjectsResult = await pool.query(`
                SELECT 
                    id,
                    name as subject_name,
                    code as subject_code,
                    description as subject_description
                FROM subjects
                WHERE status = 'active'
                ORDER BY name
                LIMIT 10
            `, []);

            subjects = allSubjectsResult.rows.map(row => ({
                id: row.id,
                name: row.subject_name,
                code: row.subject_code,
                description: row.subject_description,
                teacher_id: null,
                class_subject_id: null
            }));
        }

        // Get students in this class
        const studentsResult = await pool.query(`
            SELECT 
                s.id,
                s.admission_number,
                s.first_name,
                s.last_name,
                s.gender,
                s.status
            FROM students s
            JOIN class_students cs ON s.id = cs.student_id
            WHERE cs.class_id = $1 
            AND cs.academic_year = $2
            AND s.status = 'active'
            ORDER BY s.first_name, s.last_name
        `, [classId, currentAcademicYear]);

        // Get existing grades for CA and Exam
        const studentIds = studentsResult.rows.map(s => s.id);
        let gradesMap = {};

        if (studentIds.length > 0 && subjects.length > 0) {
            const subjectIds = subjects.map(s => s.id);

            const gradesResult = await pool.query(`
                SELECT 
                    m.student_id,
                    m.subject_id,
                    m.exam_type,
                    m.marks,
                    m.grade,
                    m.remarks,
                    m.term_id,
                    m.class_id
                FROM marks m
                WHERE m.class_id = $1
                AND m.term_id = $2
                AND m.student_id = ANY($3::int[])
                AND m.subject_id = ANY($4::int[])
                ORDER BY m.student_id, m.subject_id, m.exam_type
            `, [classId, currentTerm, studentIds, subjectIds]);

            gradesResult.rows.forEach(row => {
                if (!gradesMap[row.student_id]) {
                    gradesMap[row.student_id] = {};
                }
                if (!gradesMap[row.student_id][row.subject_id]) {
                    gradesMap[row.student_id][row.subject_id] = {};
                }
                gradesMap[row.student_id][row.subject_id][row.exam_type] = {
                    marks: row.marks,
                    grade: row.grade,
                    remarks: row.remarks,
                    term_id: row.term_id
                };
            });
        }

        // Build the response with grade entry fields
        const studentsWithGrades = studentsResult.rows.map(student => {
            const studentGrades = gradesMap[student.id] || {};

            const subjectGrades = subjects.map(subject => {
                const gradeData = studentGrades[subject.id] || {};

                return {
                    subject_id: subject.id,
                    subject_name: subject.name,
                    subject_code: subject.code,
                    ca1: gradeData['CA1'] ? {
                        marks: parseFloat(gradeData['CA1'].marks),
                        grade: gradeData['CA1'].grade,
                        remarks: gradeData['CA1'].remarks
                    } : null,
                    ca2: gradeData['CA2'] ? {
                        marks: parseFloat(gradeData['CA2'].marks),
                        grade: gradeData['CA2'].grade,
                        remarks: gradeData['CA2'].remarks
                    } : null,
                    ca3: gradeData['CA3'] ? {
                        marks: parseFloat(gradeData['CA3'].marks),
                        grade: gradeData['CA3'].grade,
                        remarks: gradeData['CA3'].remarks
                    } : null,
                    exam: gradeData['Exam'] ? {
                        marks: parseFloat(gradeData['Exam'].marks),
                        grade: gradeData['Exam'].grade,
                        remarks: gradeData['Exam'].remarks
                    } : null
                };
            });

            let totalCA = 0;
            let totalExam = 0;
            let caCount = 0;
            let examCount = 0;

            subjectGrades.forEach(s => {
                if (s.ca1?.marks !== null && s.ca1?.marks !== undefined) {
                    totalCA += s.ca1.marks;
                    caCount++;
                }
                if (s.ca2?.marks !== null && s.ca2?.marks !== undefined) {
                    totalCA += s.ca2.marks;
                    caCount++;
                }
                if (s.ca3?.marks !== null && s.ca3?.marks !== undefined) {
                    totalCA += s.ca3.marks;
                    caCount++;
                }
                if (s.exam?.marks !== null && s.exam?.marks !== undefined) {
                    totalExam += s.exam.marks;
                    examCount++;
                }
            });

            const avgCA = caCount > 0 ? totalCA / caCount : null;
            const avgExam = examCount > 0 ? totalExam / examCount : null;
            const totalAverage = (avgCA !== null && avgExam !== null) ? (avgCA + avgExam) / 2 : null;

            return {
                student_id: student.id,
                admission_number: student.admission_number,
                first_name: student.first_name,
                last_name: student.last_name,
                full_name: `${student.first_name} ${student.last_name}`,
                gender: student.gender,
                status: student.status,
                subjects: subjectGrades,
                summary: {
                    ca_average: avgCA !== null ? Math.round(avgCA * 10) / 10 : null,
                    exam_average: avgExam !== null ? Math.round(avgExam * 10) / 10 : null,
                    total_average: totalAverage !== null ? Math.round(totalAverage * 10) / 10 : null,
                    subjects_graded: subjectGrades.filter(s => 
                        s.ca1?.marks !== null || s.ca2?.marks !== null || 
                        s.ca3?.marks !== null || s.exam?.marks !== null
                    ).length,
                    total_subjects: subjects.length
                }
            };
        });

        const classResult = await pool.query(`
            SELECT 
                id,
                class_name,
                level,
                academic_year
            FROM classes
            WHERE id = $1
        `, [classId]);

        res.json({
            success: true,
            data: {
                class: {
                    id: classResult.rows[0]?.id || classId,
                    name: classResult.rows[0]?.class_name || 'Unknown Class',
                    level: classResult.rows[0]?.level || 'N/A',
                    academic_year: currentAcademicYear
                },
                term: {
                    id: parseInt(currentTerm),
                    name: `Term ${currentTerm}`
                },
                exam_types: ['CA1', 'CA2', 'CA3', 'Exam'],
                subjects: subjects.map(s => ({
                    id: s.id,
                    name: s.name,
                    code: s.code,
                    has_ca: true,
                    has_exam: true
                })),
                students: studentsWithGrades,
                summary: {
                    total_students: studentsResult.rows.length,
                    total_subjects: subjects.length,
                    has_grades: studentsWithGrades.some(s => s.summary.subjects_graded > 0)
                }
            }
        });

    } catch (error) {
        console.error('Error in getClassSubjectsForGrading:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// ============================================
// SAVE GRADES FOR MULTIPLE SUBJECTS (CA + Exam)
// ============================================

dashboardController.saveSubjectGrades = async (req, res) => {
    try {
        const userId = req.user.id;
        const { class_id, term_id, academic_year, grades } = req.body;

        if (!class_id || !grades || !Array.isArray(grades) || grades.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid request data' 
            });
        }

        const teacherQuery = await pool.query(`
            SELECT id FROM teachers WHERE user_id = $1
        `, [userId]);

        if (teacherQuery.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'Teacher not found' 
            });
        }

        const teacherId = teacherQuery.rows[0].id;
        const currentAcademicYear = academic_year || '2024-2025';
        const currentTerm = term_id || 1;

        const verifyQuery = await pool.query(`
            SELECT * FROM teacher_classes 
            WHERE teacher_id = $1 
            AND class_id = $2 
            AND academic_year = $3
        `, [teacherId, class_id, currentAcademicYear]);

        if (verifyQuery.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have access to this class' 
            });
        }

        await pool.query('BEGIN');

        let savedCount = 0;
        let errors = [];
        const examTypes = ['CA1', 'CA2', 'CA3', 'Exam'];

        for (const grade of grades) {
            const { student_id, subject_id, exam_type, marks, grade: letterGrade, remarks } = grade;

            if (!student_id || !subject_id || !exam_type) {
                errors.push({ student_id, subject_id, exam_type, error: 'Missing required fields' });
                continue;
            }

            if (!examTypes.includes(exam_type)) {
                errors.push({ student_id, subject_id, exam_type, error: 'Invalid exam type' });
                continue;
            }

            try {
                const result = await pool.query(`
                    INSERT INTO marks (
                        student_id, 
                        class_id, 
                        teacher_id, 
                        subject_id, 
                        exam_type, 
                        marks, 
                        grade, 
                        remarks,
                        term_id,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                    ON CONFLICT (student_id, class_id, subject_id, exam_type) 
                    DO UPDATE SET 
                        marks = EXCLUDED.marks,
                        grade = EXCLUDED.grade,
                        remarks = EXCLUDED.remarks,
                        teacher_id = EXCLUDED.teacher_id,
                        updated_at = NOW()
                    RETURNING id
                `, [
                    student_id, 
                    class_id, 
                    teacherId, 
                    subject_id, 
                    exam_type, 
                    marks !== null && marks !== '' ? parseFloat(marks) : null,
                    letterGrade || null,
                    remarks || null,
                    currentTerm
                ]);

                if (result.rows.length > 0) {
                    savedCount++;
                }

            } catch (err) {
                console.error('[saveSubjectGrades] Error:', err);
                errors.push({ 
                    student_id, 
                    subject_id, 
                    exam_type, 
                    error: err.message 
                });
            }
        }

        await pool.query('COMMIT');

        await pool.query(`
            INSERT INTO teacher_activities (teacher_id, activity_type, description, created_at)
            VALUES ($1, $2, $3, NOW())
        `, [teacherId, 'grade_entry', `Saved ${savedCount} grades for class ${class_id}`]);

        res.json({
            success: true,
            message: `Successfully saved ${savedCount} grades`,
            data: {
                saved_count: savedCount,
                total_attempted: grades.length,
                errors: errors.length > 0 ? errors : null
            }
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error in saveSubjectGrades:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// ============================================
// GET TEACHER'S CLASSES WITH SUBJECT COUNTS
// ============================================

dashboardController.getTeacherClassSubjects = async (req, res) => {
    try {
        const userId = req.user.id;
        const academicYear = req.query.academic_year || '2024-2025';

        const teacherQuery = await pool.query(`
            SELECT id, first_name, last_name FROM teachers WHERE user_id = $1
        `, [userId]);

        if (teacherQuery.rows.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const teacherId = teacherQuery.rows[0].id;

        const result = await pool.query(`
            SELECT 
                c.id as class_id,
                c.class_name,
                c.level,
                c.academic_year,
                COUNT(DISTINCT cs.subject_id) as subject_count,
                COUNT(DISTINCT cs2.student_id) as student_count,
                ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as subject_names
            FROM teacher_classes tc
            JOIN classes c ON tc.class_id = c.id
            LEFT JOIN class_subjects cs ON c.id = cs.class_id AND cs.academic_year = $1
            LEFT JOIN subjects s ON cs.subject_id = s.id
            LEFT JOIN class_students cs2 ON c.id = cs2.class_id AND cs2.academic_year = $1
            WHERE tc.teacher_id = $2 
            AND tc.academic_year = $3
            GROUP BY c.id, c.class_name, c.level, c.academic_year
            ORDER BY c.class_name
        `, [academicYear, teacherId, academicYear]);

        res.json({
            success: true,
            data: result.rows.map(row => ({
                ...row,
                subject_count: parseInt(row.subject_count) || 0,
                student_count: parseInt(row.student_count) || 0,
                subject_names: row.subject_names || []
            }))
        });

    } catch (error) {
        console.error('Error in getTeacherClassSubjects:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

dashboardController.getStudentProfile = async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const result = await pool.query(`
            SELECT 
                s.*,
                c.class_name as class_name,
                c.level
            FROM students s
            LEFT JOIN class_students cs ON s.id = cs.student_id
            LEFT JOIN classes c ON cs.class_id = c.id
            WHERE s.id = $1
        `, [studentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error in getStudentProfile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// PARENT DASHBOARD CONTROLLERS
// ============================================

dashboardController.getParentChildren = async (req, res) => {
    try {
        const userId = req.user.id;

        console.log('[getParentChildren] userId:', userId);

        // First try using enriched context from middleware (already enriched by enrichUserContext)
        let parentId = req.user?.parent_id;
        let parentEmail = req.user?.parent?.email;

        console.log('[getParentChildren] enriched parentId:', parentId);
        console.log('[getParentChildren] enriched parentEmail:', parentEmail);

        // If enrichment didn't find a parent, try the direct DB lookup (including email-based fallback)
        if (!parentId) {
            const parentInfo = await getParentId(userId);
            console.log('[getParentChildren] parentInfo from DB:', parentInfo);

            if (!parentInfo) {
                // Try looking up parent by email from the users table
                if (req.user?.email) {
                    const emailResult = await pool.query(
                        `SELECT p.id, u.email 
                         FROM parents p 
                         JOIN users u ON p.user_id = u.id 
                         WHERE u.email = $1 OR LOWER(u.email) = LOWER($2)`,
                        [req.user.email, req.user.email.toLowerCase()]
                    );
                    if (emailResult.rows.length > 0) {
                        parentId = emailResult.rows[0].id;
                        parentEmail = emailResult.rows[0].email;
                        console.log('[getParentChildren] Found parent by email:', parentId);
                    }
                }

                if (!parentId) {
                    console.log('[getParentChildren] No parent found for user');
                    return res.json({ success: true, data: [] });
                }
            } else {
                parentId = parentInfo.id;
                parentEmail = parentInfo.email;
            }
        }

      const result = await pool.query(`
            SELECT DISTINCT
                s.id,
                s.admission_number,
                s.first_name,
                s.last_name,
                s.gender,
                s.class_id,
                s.parent_id,
                s.parent_email,
                c.class_name,
                c.level
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE 
                s.parent_id = $1
                OR
                (s.parent_email IS NOT NULL AND s.parent_email = $2)
            ORDER BY s.first_name, s.last_name
        `, [parentId, parentEmail]);

        console.log('[getParentChildren] Found', result.rows.length, 'children');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error in getParentChildren:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

dashboardController.getChildGrades = async (req, res) => {
    try {
        const userId = req.user.id;
        const { childId } = req.params;

        const parentInfo = await getParentId(userId, req.user?.email);
        if (!parentInfo) {
            return res.json({ success: true, data: [] });
        }

        const ownsChild = await verifyChildOwnership(parentInfo.id, childId, userId);
        if (!ownsChild) {
            return res.json({ success: true, data: [] });
        }

        const result = await pool.query(`
            SELECT 
                m.*,
                s.first_name,
                s.last_name
            FROM marks m
            JOIN students s ON m.student_id = s.id
            WHERE m.student_id = $1
            ORDER BY m.exam_type, m.subject_id
        `, [childId]);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error in getChildGrades:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

dashboardController.getChildAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { childId } = req.params;

        const parentInfo = await getParentId(userId, req.user?.email);
        if (!parentInfo) {
            return res.json({ success: true, data: [] });
        }

        const ownsChild = await verifyChildOwnership(parentInfo.id, childId, userId);
        if (!ownsChild) {
            return res.json({ success: true, data: [] });
        }

        const result = await pool.query(`
            SELECT 
                date,
                status,
                remarks
            FROM attendance
            WHERE student_id = $1
            ORDER BY date DESC
            LIMIT 30
        `, [childId]);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error in getChildAttendance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

dashboardController.getChildTimetable = async (req, res) => {
    try {
        const userId = req.user.id;
        const { childId } = req.params;

        const parentInfo = await getParentId(userId, req.user?.email);
        if (!parentInfo) {
            return res.json({ success: true, data: [] });
        }

        const ownsChild = await verifyChildOwnership(parentInfo.id, childId, userId);
        if (!ownsChild) {
            return res.json({ success: true, data: [] });
        }

        const result = await pool.query(`
            SELECT 
                tt.*,
                s.name as subject_name,
                t.first_name || ' ' || t.last_name as teacher_name
            FROM timetable tt
            JOIN subjects s ON tt.subject_id = s.id
            JOIN teachers t ON tt.teacher_id = t.id
            JOIN class_students cs ON tt.class_id = cs.class_id
            WHERE cs.student_id = $1
            ORDER BY tt.day_of_week, tt.start_time
        `, [childId]);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error in getChildTimetable:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

dashboardController.getChildFees = async (req, res) => {
    try {
        const userId = req.user.id;
        const { childId } = req.params;

        const parentInfo = await getParentId(userId, req.user?.email);
        if (!parentInfo) {
            return res.json({ success: true, data: { total: 0, paid: 0, balance: 0, history: [] } });
        }

        const ownsChild = await verifyChildOwnership(parentInfo.id, childId, userId);
        if (!ownsChild) {
            return res.json({ success: true, data: { total: 0, paid: 0, balance: 0, history: [] } });
        }

        // Raw fee rows
        const result = await pool.query(`
            SELECT 
                f.*, 
                ft.name as fee_type_name,
                ft.amount as expected_amount
            FROM fees f
            JOIN fee_types ft ON f.fee_type_id = ft.id
            WHERE f.student_id = $1
            ORDER BY f.created_at DESC
        `, [childId]);

        const rows = result.rows || [];

        // Normalize into a "history" list.
        // Try multiple common column names for amount/paid/balance/status/receipt.
        const toNumber = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
        };

        const history = rows.map((r) => {
            return {
                id: r.id,
                date: r.created_at || r.date || r.payment_date || r.updated_at,
                amount: toNumber(r.amount || r.paid_amount || r.payment_amount || r.paid || 0),
                receipt: r.receipt_number || r.receipt_no || r.receipt || r.reference || null,
                fee_type: r.fee_type_name || r.fee_type || null
            };
        });

        // Totals
        // - total: prefer expected_amount * occurrences; fallback to amount
        // - paid: prefer paid_amount/amount; fallback to amount
        // - balance: if explicit balance exists, sum it; else total-paid
        const total = rows.reduce((sum, r) => sum + toNumber(r.expected_amount || r.expected || r.total || r.amount || 0), 0);
        const paid = rows.reduce((sum, r) => sum + toNumber(r.paid_amount || r.paid || r.payment_amount || r.amount || 0), 0);

        const explicitBalance = rows.reduce((sum, r) => {
            const b = toNumber(r.balance || r.outstanding_balance || 0);
            // only sum if it looks non-zero field exists
            return sum + b;
        }, 0);

        const balance = explicitBalance > 0 ? explicitBalance : (total - paid);

        res.json({
            success: true,
            data: {
                total,
                paid,
                balance,
                history
            }
        });
    } catch (error) {
        console.error('Error in getChildFees:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};


// ============================================
// ADMIN DASHBOARD CONTROLLERS
// ============================================

dashboardController.getAdminStats = async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM students) as total_students,
                (SELECT COUNT(*) FROM teachers) as total_teachers,
                (SELECT COUNT(*) FROM classes) as total_classes,
                (SELECT COUNT(*) FROM users WHERE role = 'parent') as total_parents,
                (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins
        `);
        
        res.json({ success: true, data: stats.rows[0] });
    } catch (error) {
        console.error('Error in getAdminStats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

dashboardController.getAdminRecentActivities = async (req, res) => {
    try {
        res.json({
            success: true,
            data: [
                { activity: 'New student registered', time: new Date().toISOString() },
                { activity: 'Teacher assigned to class', time: new Date().toISOString() }
            ]
        });
    } catch (error) {
        console.error('Error in getAdminRecentActivities:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

dashboardController.getSystemHealth = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                status: 'healthy',
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error in getSystemHealth:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// GET ALL SUBJECTS (For Teacher Grades)
// ============================================

dashboardController.getAllSubjects = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const teacherQuery = await pool.query(`
            SELECT id FROM teachers WHERE user_id = $1
        `, [userId]);
        
        if (teacherQuery.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'Teacher not found' 
            });
        }
        
        const result = await pool.query(`
            SELECT 
                id,
                name,
                code,
                description
            FROM subjects
            WHERE status = 'active' OR status IS NULL
            ORDER BY name
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error in getAllSubjects:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// ============================================
// GET SUBJECTS FOR A CLASS
// ============================================

dashboardController.getClassSubjects = async (req, res) => {
    try {
        const { classId } = req.params;
        const userId = req.user.id;
        const academicYear = req.query.academic_year || '2024-2025';
        
        console.log('[getClassSubjects] classId:', classId);
        console.log('[getClassSubjects] academicYear:', academicYear);
        
        const teacherQuery = await pool.query(`
            SELECT id FROM teachers WHERE user_id = $1
        `, [userId]);
        
        if (teacherQuery.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'Teacher not found' 
            });
        }
        
        const teacherId = teacherQuery.rows[0].id;
        
        const verifyQuery = await pool.query(`
            SELECT * FROM teacher_classes 
            WHERE teacher_id = $1 AND class_id = $2
        `, [teacherId, classId]);
        
        if (verifyQuery.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have access to this class' 
            });
        }
        
        // Get subjects from class_subjects table with academic_year
        const result = await pool.query(`
            SELECT 
                cs.id,
                cs.class_id,
                cs.subject_id,
                cs.hours_per_week,
                cs.teacher_id,
                cs.priority,
                cs.academic_year,
                s.id as subject_id,
                s.name,
                s.code,
                s.description
            FROM class_subjects cs
            JOIN subjects s ON cs.subject_id = s.id
            WHERE cs.class_id = $1 
            AND cs.academic_year = $2
            ORDER BY s.name
        `, [classId, academicYear]);
        
        console.log('[getClassSubjects] Found subjects:', result.rows.length);
        
        if (result.rows.length === 0) {
            console.log('[getClassSubjects] No subjects found, trying fallback...');
            
            const fallbackResult = await pool.query(`
                SELECT DISTINCT
                    tc.subject as name,
                    tc.subject as code,
                    tc.class_id
                FROM teacher_classes tc
                WHERE tc.teacher_id = $1 AND tc.class_id = $2
                ORDER BY tc.subject
            `, [teacherId, classId]);
            
            if (fallbackResult.rows.length > 0) {
                return res.json({
                    success: true,
                    data: fallbackResult.rows.map(row => ({
                        id: row.code || row.name,
                        name: row.name,
                        code: row.code,
                        class_id: row.class_id
                    })),
                    message: 'Subjects loaded from teacher_classes (no class_subjects found)'
                });
            }
            
            const allSubjectsResult = await pool.query(`
                SELECT id, name, code
                FROM subjects
                ORDER BY name
            `);
            
            return res.json({
                success: true,
                data: allSubjectsResult.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    code: row.code
                })),
                message: 'No class-specific subjects found. Showing all subjects.'
            });
        }
        
        res.json({
            success: true,
            data: result.rows.map(row => ({
                id: row.subject_id,
                name: row.name,
                code: row.code,
                description: row.description,
                hours_per_week: row.hours_per_week,
                teacher_id: row.teacher_id,
                priority: row.priority,
                academic_year: row.academic_year,
                class_subject_id: row.id
            }))
        });
        
    } catch (error) {
        console.error('Error in getClassSubjects:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// ============================================
// GET MARKS BY CLASS AND SUBJECT
// ============================================

dashboardController.getMarksByClassAndSubject = async (req, res) => {
    try {
        const { classId } = req.params;
        const { subject_id, exam_type } = req.query;
        const userId = req.user.id;
        
        const teacherQuery = await pool.query(`
            SELECT id FROM teachers WHERE user_id = $1
        `, [userId]);
        
        if (teacherQuery.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'Teacher not found' 
            });
        }
        
        const teacherId = teacherQuery.rows[0].id;
        
        const verifyQuery = await pool.query(`
            SELECT * FROM teacher_classes 
            WHERE teacher_id = $1 AND class_id = $2
        `, [teacherId, classId]);
        
        if (verifyQuery.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have access to this class' 
            });
        }
        
        let query = `
            SELECT 
                m.student_id,
                m.subject_id,
                m.exam_type,
                m.marks,
                m.grade,
                m.remarks,
                m.term_id,
                m.class_id
            FROM marks m
            WHERE m.class_id = $1
        `;
        const params = [classId];
        let paramCount = 2;
        
        if (subject_id) {
            query += ` AND m.subject_id = $${paramCount}`;
            params.push(subject_id);
            paramCount++;
        }
        
        if (exam_type) {
            query += ` AND m.exam_type = $${paramCount}`;
            params.push(exam_type);
            paramCount++;
        }
        
        query += ` ORDER BY m.student_id, m.subject_id, m.exam_type`;
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error in getMarksByClassAndSubject:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// ============================================
// GET PARENT NOTIFICATIONS
// ============================================

dashboardController.getParentNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(`
            SELECT 
                id,
                title,
                message,
                type,
                is_read,
                created_at
            FROM notifications
            WHERE user_id = $1 OR user_type = 'parent'
            ORDER BY created_at DESC
            LIMIT 20
        `, [userId]);

        res.json({ success: true, data: result.rows || [] });
    } catch (error) {
        console.error('Error in getParentNotifications:', error);
        res.json({ success: true, data: [] });
    }
};

// ============================================
// GET PARENT STATS (aggregate across all children)
// ============================================

dashboardController.getParentStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const parentInfo = await getParentId(userId, req.user?.email);
        if (!parentInfo) {
            return res.json({ success: true, data: { average_performance: 0, attendance_rate: 0 } });
        }

        const parentId = parentInfo.id;

        // Get average performance across all children
        const perfResult = await pool.query(`
            SELECT 
                COALESCE(AVG(m.marks), 0) as average_performance
            FROM marks m
            JOIN students s ON m.student_id = s.id
            WHERE (s.parent_id = $1 OR s.parent_email = $2)
        `, [parentId, parentInfo.email]);

        // Get average attendance across all children
        const attResult = await pool.query(`
            SELECT 
                COALESCE(
                    (SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)) * 100,
                    0
                ) as attendance_rate
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE (s.parent_id = $1 OR s.parent_email = $2)
        `, [parentId, parentInfo.email]);

        const average_performance = Math.round(parseFloat(perfResult.rows[0]?.average_performance) || 0);
        const attendance_rate = Math.round(parseFloat(attResult.rows[0]?.attendance_rate) || 0);

        res.json({
            success: true,
            data: {
                average_performance,
                attendance_rate
            }
        });
    } catch (error) {
        console.error('Error in getParentStats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// GET PARENT PERFORMANCE (overall across all children)
// ============================================

dashboardController.getParentPerformance = async (req, res) => {
    try {
        const userId = req.user.id;

        const parentInfo = await getParentId(userId, req.user?.email);
        if (!parentInfo) {
            return res.json({ success: true, data: [] });
        }

        const parentId = parentInfo.id;
        const parentEmail = parentInfo.email;

        // Get all children
        const childrenResult = await pool.query(`
            SELECT DISTINCT
                s.id,
                s.first_name,
                s.last_name,
                s.class_id,
                c.class_name
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE 
                s.parent_id = $1
                OR
                (s.parent_email IS NOT NULL AND s.parent_email = $2)
            ORDER BY s.first_name
        `, [parentId, parentEmail]);

        const childrenWithPerformance = [];

        for (const child of childrenResult.rows) {
            const perfResult = await pool.query(`
                SELECT 
                    COALESCE(AVG(m.marks), 0) as average_score
                FROM marks m
                WHERE m.student_id = $1
            `, [child.id]);

            const attResult = await pool.query(`
                SELECT 
                    COALESCE(
                        (SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)) * 100,
                        0
                    ) as attendance_rate
                FROM attendance a
                WHERE a.student_id = $1
            `, [child.id]);

            childrenWithPerformance.push({
                id: child.id,
                first_name: child.first_name,
                last_name: child.last_name,
                class_name: child.class_name || 'Not assigned',
                class_id: child.class_id,
                average_score: Math.round(parseFloat(perfResult.rows[0]?.average_score) || 0),
                attendance_rate: Math.round(parseFloat(attResult.rows[0]?.attendance_rate) || 0)
            });
        }

        res.json({ success: true, data: childrenWithPerformance });
    } catch (error) {
        console.error('Error in getParentPerformance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// GET CHILD SUBJECTS
// ============================================

dashboardController.getChildSubjects = async (req, res) => {
    try {
        const userId = req.user.id;
        const { childId } = req.params;

        const parentInfo = await getParentId(userId, req.user?.email);
        if (!parentInfo) {
            return res.json({ success: true, data: [] });
        }

        const ownsChild = await verifyChildOwnership(parentInfo.id, childId, userId);
        if (!ownsChild) {
            return res.json({ success: true, data: [] });
        }

        // Get class_id from student
        const studentResult = await pool.query(`
            SELECT class_id FROM students WHERE id = $1
        `, [childId]);

        if (studentResult.rows.length === 0 || !studentResult.rows[0].class_id) {
            return res.json({ success: true, data: [] });
        }

        const classId = studentResult.rows[0].class_id;

        // Get subjects for the class
        const subjectsResult = await pool.query(`
            SELECT 
                s.id,
                s.name,
                s.code,
                s.description
            FROM class_subjects cs
            JOIN subjects s ON cs.subject_id = s.id
            WHERE cs.class_id = $1
            ORDER BY s.name
        `, [classId]);

        if (subjectsResult.rows.length === 0) {
            // Fallback: Get subjects from the subjects table
            const fallbackResult = await pool.query(`
                SELECT id, name, code, description
                FROM subjects
                WHERE status = 'active' OR status IS NULL
                ORDER BY name
                LIMIT 20
            `);
            return res.json({ success: true, data: fallbackResult.rows });
        }

        res.json({ success: true, data: subjectsResult.rows });
    } catch (error) {
        console.error('Error in getChildSubjects:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// ============================================
// GET CHILD PERFORMANCE - FIXED (Removed class_rank)
// ============================================

dashboardController.getChildPerformance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { childId } = req.params;

        console.log('[getChildPerformance] Starting...');
        console.log('[getChildPerformance] userId:', userId);
        console.log('[getChildPerformance] childId:', childId);

        const parentInfo = await getParentId(userId, req.user?.email);
        console.log('[getChildPerformance] parentInfo:', parentInfo);
        
        if (!parentInfo) {
            console.log('[getChildPerformance] No parent found for user');
            return res.json({ success: true, data: null });
        }
        
        const parentId = parentInfo.id;
        const parentEmail = parentInfo.email;
        
        console.log('[getChildPerformance] parentId:', parentId);
        console.log('[getChildPerformance] parentEmail:', parentEmail);

        const studentResult = await pool.query(`
            SELECT 
                s.id,
                s.first_name,
                s.last_name,
                s.parent_id,
                s.parent_email,
                s.class_id,
                c.class_name
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.id = $1
        `, [childId]);
        
        console.log('[getChildPerformance] studentResult:', studentResult.rows);
        
        if (studentResult.rows.length === 0) {
            console.log('[getChildPerformance] Student not found');
            return res.json({ success: true, data: null });
        }
        
        const student = studentResult.rows[0];

        const ownsChild = await verifyChildOwnership(parentId, childId, userId);
        console.log('[getChildPerformance] ownsChild:', ownsChild);
        
        if (!ownsChild) {
            console.log('[getChildPerformance] ❌ Parent does NOT own this child');
            return res.json({ 
                success: true, 
                data: null,
                debug: {
                    child_id: childId,
                    parent_id: parentId,
                    student_parent_id: student.parent_id,
                    student_parent_email: student.parent_email,
                    parent_email: parentEmail
                }
            });
        }

        console.log('[getChildPerformance] ✅ Parent owns this child');

        // Get average score and calculate rank using RANK() instead of class_rank
        const gradesResult = await pool.query(`
            WITH student_marks AS (
                SELECT 
                    m.student_id,
                    AVG(m.marks)::float as avg_score,
                    COUNT(*) as total_scores
                FROM marks m
                WHERE m.student_id = $1
                GROUP BY m.student_id
            ),
            class_ranks AS (
                SELECT 
                    sm.student_id,
                    sm.avg_score,
                    RANK() OVER (ORDER BY sm.avg_score DESC) as rank_position
                FROM student_marks sm
                JOIN students s ON s.id = sm.student_id
                WHERE s.class_id = (
                    SELECT class_id FROM students WHERE id = $1
                )
            )
            SELECT 
                sm.avg_score as average_score,
                sm.total_scores,
                cr.rank_position as rank
            FROM student_marks sm
            LEFT JOIN class_ranks cr ON cr.student_id = sm.student_id
            WHERE sm.student_id = $1
        `, [childId]);

        console.log('[getChildPerformance] gradesResult:', gradesResult.rows);

        const attendanceResult = await pool.query(`
            SELECT
                (SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)) * 100 as attendance_rate
            FROM attendance a
            WHERE a.student_id = $1
            ORDER BY a.date DESC
            LIMIT 30
        `, [childId]);

        console.log('[getChildPerformance] attendanceResult:', attendanceResult.rows);

        const subjectsResult = await pool.query(`
            SELECT
                s.name as subject,
                AVG(m.marks)::float as score,
                MAX(m.grade) as grade,
                COUNT(*) as samples
            FROM marks m
            JOIN subjects s ON s.id = m.subject_id
            WHERE m.student_id = $1
            GROUP BY s.name
            ORDER BY s.name
        `, [childId]);

        console.log('[getChildPerformance] subjectsResult:', subjectsResult.rows);

        const average_score = gradesResult.rows[0]?.average_score;
        const rank = gradesResult.rows[0]?.rank || 'N/A';
        const attendance_rate = attendanceResult.rows[0]?.attendance_rate || 0;

        const subjects = subjectsResult.rows.map(r => ({
            id: r.subject,
            name: r.subject,
            score: Number.isFinite(r.score) ? Math.round(r.score * 10) / 10 : 0,
            grade: r.grade || 'N/A',
            samples: parseInt(r.samples) || 0
        }));

        let performance_grade = 'N/A';
        if (average_score !== null && Number.isFinite(average_score)) {
            const avg = parseFloat(average_score);
            if (avg >= 80) performance_grade = 'A';
            else if (avg >= 70) performance_grade = 'B';
            else if (avg >= 60) performance_grade = 'C';
            else if (avg >= 50) performance_grade = 'D';
            else performance_grade = 'F';
        }

        const trendResult = await pool.query(`
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                AVG(marks)::float as avg_score,
                COUNT(*) as count
            FROM marks
            WHERE student_id = $1
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
            LIMIT 6
        `, [childId]);

        const trend = trendResult.rows.map(r => ({
            month: r.month,
            average_score: Number.isFinite(r.avg_score) ? Math.round(r.avg_score * 10) / 10 : 0,
            count: parseInt(r.count) || 0
        }));

        const gradeDistribution = subjectsResult.rows.reduce((acc, r) => {
            const grade = r.grade || 'N/A';
            acc[grade] = (acc[grade] || 0) + 1;
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                average_score: Number.isFinite(average_score) ? Math.round(average_score * 10) / 10 : 0,
                attendance_rate: Number.isFinite(attendance_rate) ? Math.round(attendance_rate * 10) / 10 : 0,
                rank: rank,
                performance_grade: performance_grade,
                subjects: subjects,
                subjects_count: subjects.length,
                trend: trend,
                grade_distribution: gradeDistribution,
                total_scores: parseInt(gradesResult.rows[0]?.total_scores) || 0,
                total_subjects: subjects.length
            }
        });
    } catch (error) {
        console.error('Error in getChildPerformance:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.stack 
        });
    }
};

// ============================================================
// REPORT CARDS (Teacher) - minimal route to avoid 'Route not found'
// ============================================================
// Frontend calls: POST /api/teacher/marks/report-cards
// Currently this endpoint may not have full PDF generation implemented in this controller.
// It returns a 200 with a consistent payload so UI can proceed.
//
// If you later add real PDF generation, replace the body below.
dashboardController.generateTeacherReportCards = async (req, res) => {
    try {
        const { class_id, teacher_id, term, academic_year } = req.body || {};

        // Basic validation for debugging
        if (!class_id || !teacher_id) {
            return res.status(400).json({
                success: false,
                error: 'class_id and teacher_id are required'
            });
        }

        // Placeholder response: frontend expects data.data?.students?.length and optional pdf_url
        return res.json({
            success: true,
            data: {
                students: [],
                class_id,
                teacher_id,
                term: term ?? 1,
                academic_year: academic_year ?? '2024-2025'
            },
            message: 'Report cards generation endpoint reached (PDF generation not implemented here yet).'
        });
    } catch (error) {
        console.error('Error in generateTeacherReportCards:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = dashboardController;

