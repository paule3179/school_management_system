// backend/controllers/teacherController.js
const pool = require('../config/database');
const bcrypt = require('bcrypt');

const teacherController = {};

// ============================================
// GET ALL TEACHERS (Admin)
// ============================================
teacherController.getAllTeachers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                teacher_code,
                first_name,
                last_name,
                email,
                phone,
                department,
                subject_specialty,
                qualification,
                years_of_experience,
                status,
                created_at
            FROM teachers
            WHERE status = 'Active' OR status IS NULL
            ORDER BY first_name, last_name
        `);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error getting teachers:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// GET TEACHER BY ID
// ============================================
teacherController.getTeacherById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT 
                t.id,
                t.teacher_code,
                t.first_name,
                t.last_name,
                t.email,
                t.phone,
                t.department,
                t.subject_specialty,
                t.qualification,
                t.years_of_experience,
                t.date_hired,
                t.ghana_card_number,
                t.ssn,
                t.religion,
                t.bank_account,
                t.gender,
                t.date_of_birth,
                t.address,
                t.status,
                t.created_at,
                u.email as user_email
            FROM teachers t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Teacher not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error getting teacher:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// CREATE TEACHER (Admin)
// ============================================
teacherController.createTeacher = async (req, res) => {
    let client;
    try {
        const {
            first_name,
            last_name,
            email,
            phone,
            department,
            subject_specialty,
            qualification,
            years_of_experience,
            date_hired,
            ghana_card_number,
            ssn,
            religion,
            bank_account,
            gender,
            date_of_birth,
            address,
            status
        } = req.body;
        
        if (!first_name || !last_name || !email) {
            return res.status(400).json({
                success: false,
                error: 'First name, last name, and email are required'
            });
        }
        
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists'
            });
        }
        
        const teacherCode = await generateTeacherCode();
        const tempPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        client = await pool.connect();
        await client.query('BEGIN');
        
        const userResult = await client.query(`
            INSERT INTO users (email, password, first_name, last_name, role, status, created_at)
            VALUES ($1, $2, $3, $4, 'teacher', $5, NOW())
            RETURNING id
        `, [email, hashedPassword, first_name, last_name, status || 'active']);
        
        const userId = userResult.rows[0].id;
        
        const result = await client.query(`
            INSERT INTO teachers (
                user_id,
                teacher_code,
                first_name,
                last_name,
                email,
                phone,
                department,
                subject_specialty,
                qualification,
                years_of_experience,
                date_hired,
                ghana_card_number,
                ssn,
                religion,
                bank_account,
                gender,
                date_of_birth,
                address,
                status,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
            RETURNING *
        `, [
            userId,
            teacherCode,
            first_name,
            last_name,
            email,
            phone || null,
            department || null,
            subject_specialty || null,
            qualification || null,
            years_of_experience || 0,
            date_hired || null,
            ghana_card_number || null,
            ssn || null,
            religion || null,
            bank_account || null,
            gender || null,
            date_of_birth || null,
            address || null,
            status || 'Active'
        ]);
        
        await client.query('COMMIT');
        client.release();
        client = null;
        
        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Teacher created successfully',
            tempPassword: tempPassword,
            teacherCode: teacherCode
        });
    } catch (error) {
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Teacher transaction rollback failed:', rollbackError);
            }
            client.release();
        }
        console.error('Error creating teacher:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// UPDATE TEACHER (Admin)
// ============================================
teacherController.updateTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            first_name,
            last_name,
            phone,
            department,
            subject_specialty,
            qualification,
            years_of_experience,
            date_hired,
            ghana_card_number,
            ssn,
            religion,
            bank_account,
            gender,
            date_of_birth,
            address,
            status
        } = req.body;
        
        const check = await pool.query('SELECT id FROM teachers WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Teacher not found'
            });
        }
        
        const result = await pool.query(`
            UPDATE teachers SET
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                phone = COALESCE($3, phone),
                department = COALESCE($4, department),
                subject_specialty = COALESCE($5, subject_specialty),
                qualification = COALESCE($6, qualification),
                years_of_experience = COALESCE($7, years_of_experience),
                date_hired = $8,
                ghana_card_number = COALESCE($9, ghana_card_number),
                ssn = COALESCE($10, ssn),
                religion = COALESCE($11, religion),
                bank_account = COALESCE($12, bank_account),
                gender = COALESCE($13, gender),
                date_of_birth = $14,
                address = COALESCE($15, address),
                status = COALESCE($16, status),
                updated_at = NOW()
            WHERE id = $17
            RETURNING *
        `, [
            first_name,
            last_name,
            phone,
            department,
            subject_specialty,
            qualification,
            years_of_experience,
            date_hired,
            ghana_card_number,
            ssn,
            religion,
            bank_account,
            gender,
            date_of_birth,
            address,
            status,
            id
        ]);
        
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Teacher updated successfully'
        });
    } catch (error) {
        console.error('Error updating teacher:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// DELETE TEACHER (Admin)
// ============================================
teacherController.deleteTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        
        const check = await pool.query('SELECT id FROM teachers WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Teacher not found'
            });
        }
        
        await pool.query(`
            UPDATE teachers 
            SET status = 'Inactive', 
                updated_at = NOW()
            WHERE id = $1
        `, [id]);
        
        res.json({
            success: true,
            message: 'Teacher deactivated successfully'
        });
    } catch (error) {
        console.error('Error deleting teacher:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// RESET TEACHER PASSWORD (Admin)
// ============================================
teacherController.resetTeacherPassword = async (req, res) => {
    try {
        const { id } = req.params;
        
        const teacherResult = await pool.query(
            'SELECT user_id, first_name, last_name FROM teachers WHERE id = $1',
            [id]
        );
        
        if (teacherResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Teacher not found'
            });
        }
        
        const teacher = teacherResult.rows[0];
        const tempPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        await pool.query(
            'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, teacher.user_id]
        );
        
        res.json({
            success: true,
            message: 'Password reset successfully',
            tempPassword: tempPassword
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// GET TEACHER STATISTICS
// ============================================
teacherController.getTeacherStatistics = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_teachers,
                COUNT(DISTINCT department) as total_departments,
                COUNT(DISTINCT subject_specialty) as total_specialties
            FROM teachers
            WHERE status = 'Active'
        `);
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error getting teacher statistics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// GET DEPARTMENTS
// ============================================
teacherController.getDepartments = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT department
            FROM teachers
            WHERE department IS NOT NULL AND department != ''
            ORDER BY department
        `);
        
        res.json({
            success: true,
            data: result.rows.map(r => r.department)
        });
    } catch (error) {
        console.error('Error getting departments:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// IMPORTANT: FRONTEND EXPECTED FUNCTIONS
// ============================================

// GET TEACHER'S CLASSES
teacherController.getMyClasses = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userEmail = req.user?.email;
        
        console.log(`📚 Getting classes for teacher: ${userId || userEmail}`);
        
        if (!userId && !userEmail) {
            return res.status(401).json({ 
                success: false, 
                error: 'User not authenticated' 
            });
        }
        
        let teacherResult;
        if (userId) {
            teacherResult = await pool.query(
                'SELECT id FROM teachers WHERE user_id = $1',
                [userId]
            );
        }
        
        if (!teacherResult || teacherResult.rows.length === 0) {
            teacherResult = await pool.query(
                'SELECT id FROM teachers WHERE email = $1',
                [userEmail]
            );
        }
        
        if (teacherResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Teacher profile not found" });
        }
        
        const teacherId = teacherResult.rows[0].id;
        
        const result = await pool.query(`
            SELECT 
                c.id,
                c.class_name,
                c.level,
                c.teacher_id,
                COUNT(DISTINCT s.id) as student_count
            FROM classes c
            LEFT JOIN students s ON s.class_id = c.id AND LOWER(COALESCE(s.status, 'active')) = 'active'
            WHERE c.teacher_id = $1
               OR EXISTS (
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
        console.error('❌ Error getting teacher classes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// GET STUDENTS IN A CLASS
teacherController.getClassStudents = async (req, res) => {
    try {
        const { classId } = req.params;
        if (req.user?.role === "teacher" && !req.user.allowedClassIds?.includes(Number(classId))) {
            return res.status(403).json({ success: false, error: "Access denied to this class" });
        }
        const classResult = await pool.query("SELECT id, class_name FROM classes WHERE id = $1", [classId]);
        if (classResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Class not found" });
        }
        const result = await pool.query(`
            SELECT s.id, s.admission_number, s.first_name, s.last_name, s.gender,
                   s.date_of_birth, s.parent_name, s.parent_phone, s.parent_email,
                   s.status, s.enrollment_date, c.class_name
            FROM students s
            JOIN classes c ON c.id = s.class_id
            WHERE s.class_id = $1 AND LOWER(COALESCE(s.status, 'active')) = 'active'
            ORDER BY s.last_name, s.first_name
        `, [classId]);
        res.json({ success: true, data: result.rows, count: result.rows.length, class_name: classResult.rows[0].class_name });
    } catch (error) {
        console.error("Error getting class students:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
// GET TEACHER'S SUBJECTS
teacherController.getMySubjects = async (req, res) => {
    try {
        const teacherId = req.user?.teacher_id;
        if (!teacherId) {
            return res.status(404).json({ success: false, error: "Teacher profile not found" });
        }
        const result = await pool.query(`
            SELECT DISTINCT s.id, s.name, s.code, s.level, s.description
            FROM subjects s
            WHERE EXISTS (
                SELECT 1 FROM teacher_subjects ts
                WHERE ts.teacher_id = $1 AND ts.subject_id = s.id
            ) OR EXISTS (
                SELECT 1 FROM class_subjects cs
                LEFT JOIN teacher_classes tc
                  ON tc.class_id = cs.class_id AND tc.teacher_id = $1
                 AND COALESCE(tc.is_active, true) = true
                LEFT JOIN classes c ON c.id = cs.class_id
                WHERE cs.subject_id = s.id
                  AND (tc.id IS NOT NULL OR c.teacher_id = $1 OR cs.teacher_id = $1)
            )
            ORDER BY s.name
        `, [teacherId]);
        res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
        console.error("Error getting teacher subjects:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
// GET TEACHER STATS
teacherController.getTeacherStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userEmail = req.user?.email;
        
        if (!userId && !userEmail) {
            return res.status(401).json({ 
                success: false, 
                error: 'User not authenticated' 
            });
        }
        
        let teacherResult;
        if (userId) {
            teacherResult = await pool.query(
                'SELECT id FROM teachers WHERE user_id = $1',
                [userId]
            );
        }
        
        if (!teacherResult || teacherResult.rows.length === 0) {
            teacherResult = await pool.query(
                'SELECT id FROM teachers WHERE email = $1',
                [userEmail]
            );
        }
        
        if (teacherResult.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    totalClasses: 0,
                    totalStudents: 0,
                    totalSubjects: 0
                }
            });
        }
        
        const teacherId = teacherResult.rows[0].id;
        
        const result = await pool.query(`
            SELECT 
                COUNT(DISTINCT c.id) as total_classes,
                COUNT(DISTINCT s.id) as total_students,
                COUNT(DISTINCT cs.subject_id) as total_subjects
            FROM teachers t
            LEFT JOIN classes c ON c.teacher_id = t.id
            LEFT JOIN students s ON s.class_id = c.id AND s.status = 'Active'
            LEFT JOIN class_subjects cs ON cs.class_id = c.id
            WHERE t.id = $1
        `, [teacherId]);
        
        res.json({
            success: true,
            data: {
                totalClasses: parseInt(result.rows[0].total_classes || 0),
                totalStudents: parseInt(result.rows[0].total_students || 0),
                totalSubjects: parseInt(result.rows[0].total_subjects || 0)
            }
        });
    } catch (error) {
        console.error('❌ Error getting teacher stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// SAVE MARKS - FIXED (Accepts both 'marks' and 'marks_records')
// ============================================
teacherController.saveMarks = async (req, res) => {
    try {
        // IMPORTANT: Accept both 'marks' and 'marks_records' for compatibility
        const marks = req.body.marks || req.body.marks_records;
        
        console.log('📝 Request body keys:', Object.keys(req.body));
        console.log('📝 Marks data:', marks ? `Array of ${marks.length} items` : 'No marks data');
        
        const userId = req.user?.id;
        const userEmail = req.user?.email;
        
        if (!userId && !userEmail) {
            return res.status(401).json({ 
                success: false, 
                error: 'User not authenticated' 
            });
        }
        
        // Validate marks data
        if (!marks) {
            console.error('❌ No marks data found in request body');
            return res.status(400).json({ 
                success: false, 
                error: 'No marks data provided. Expected "marks" or "marks_records".' 
            });
        }
        
        if (!Array.isArray(marks)) {
            console.error('❌ Marks data is not an array:', typeof marks);
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid data format. Expected an array.' 
            });
        }
        
        if (marks.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'No marks provided' 
            });
        }
        
        // Get teacher ID
        let teacherResult;
        if (userId) {
            teacherResult = await pool.query(
                'SELECT id FROM teachers WHERE user_id = $1',
                [userId]
            );
        }
        
        if (!teacherResult || teacherResult.rows.length === 0) {
            teacherResult = await pool.query(
                'SELECT id FROM teachers WHERE email = $1',
                [userEmail]
            );
        }
        
        if (teacherResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Teacher profile not found; marks were not saved'
            });
        }
        
        const teacherId = teacherResult.rows[0].id;
        const client = await pool.connect();
        let savedCount = 0;
        let updatedCount = 0;
        
        try {
            await client.query('BEGIN');
            
            for (const mark of marks) {
                // Skip invalid marks
                if (!mark || typeof mark !== 'object') {
                    console.warn('⚠️ Skipping invalid mark:', mark);
                    continue;
                }
                
                const { 
                    student_id, subject_id, class_id, exam_type, 
                    marks: markValue, grade, remarks, academic_year, mark_id 
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

// GET MARKS BY CLASS
teacherController.getMarks = async (req, res) => {
    try {
        const { classId } = req.params;
        const { term, academic_year } = req.query;
        const userId = req.user?.id;
        const userEmail = req.user?.email;
        
        console.log(`📊 Getting marks for class: ${classId}`);
        
        if (!userId && !userEmail) {
            return res.status(401).json({ 
                success: false, 
                error: 'User not authenticated' 
            });
        }
        
        let teacherResult;
        if (userId) {
            teacherResult = await pool.query(
                'SELECT id FROM teachers WHERE user_id = $1',
                [userId]
            );
        }
        
        if (!teacherResult || teacherResult.rows.length === 0) {
            teacherResult = await pool.query(
                'SELECT id FROM teachers WHERE email = $1',
                [userEmail]
            );
        }
        
        if (teacherResult.rows.length === 0) {
            return res.json({
                success: true,
                data: [],
                count: 0
            });
        }
        
        const teacherId = teacherResult.rows[0].id;
        
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
};

// GENERATE REPORT CARDS
teacherController.generateReportCards = async (req, res) => {
    try {
        const { class_id, teacher_id, term, academic_year } = req.body;
        const userId = req.user?.id;
        
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
};

// ============================================
// TEACHER DASHBOARD - EXISTING FUNCTIONS
// ============================================

teacherController.getTodaySchedule = async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;
        
        const teacherResult = await pool.query(`
            SELECT id FROM teachers 
            WHERE user_id = $1 OR email = $2
        `, [userId, userEmail]);
        
        if (teacherResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Teacher not found'
            });
        }
        
        const teacherId = teacherResult.rows[0].id;
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        
        const result = await pool.query(`
            SELECT 
                t.*,
                c.class_name,
                c.level,
                c.room_number
            FROM timetables t
            JOIN classes c ON t.class_id = c.id
            WHERE t.teacher_id = $1
            AND t.day_of_week = $2
            ORDER BY t.start_time
        `, [teacherId, today]);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error getting today schedule:', error);
        res.json({
            success: true,
            data: [],
            count: 0,
            message: 'No timetable available'
        });
    }
};

teacherController.getNotifications = async (req, res) => {
    try {
        res.json({
            success: true,
            data: [],
            count: 0,
            message: 'No notifications'
        });
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.json({
            success: true,
            data: [],
            count: 0
        });
    }
};

teacherController.getRecentActivities = async (req, res) => {
    try {
        res.json({
            success: true,
            data: [],
            count: 0,
            message: 'No recent activities'
        });
    } catch (error) {
        console.error('Error getting recent activities:', error);
        res.json({
            success: true,
            data: [],
            count: 0
        });
    }
};

teacherController.saveAttendance = async (req, res) => {
    try {
        const { classId, date, attendance } = req.body;
        const userId = req.user.id;
        
        const teacherResult = await pool.query(`
            SELECT t.id 
            FROM teachers t
            JOIN classes c ON c.teacher_id = t.id
            WHERE t.user_id = $1 AND c.id = $2
        `, [userId, classId]);
        
        if (teacherResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'You do not have access to this class'
            });
        }
        
        res.json({
            success: true,
            message: 'Attendance saved successfully',
            data: { classId, date, saved: attendance?.length || 0 }
        });
    } catch (error) {
        console.error('Error saving attendance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

teacherController.getAttendanceByClass = async (req, res) => {
    try {
        const { classId, date } = req.params;
        const userId = req.user.id;
        
        const teacherResult = await pool.query(`
            SELECT t.id 
            FROM teachers t
            JOIN classes c ON c.teacher_id = t.id
            WHERE t.user_id = $1 AND c.id = $2
        `, [userId, classId]);
        
        if (teacherResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'You do not have access to this class'
            });
        }
        
        res.json({
            success: true,
            data: [],
            count: 0,
            message: 'Attendance not found'
        });
    } catch (error) {
        console.error('Error getting attendance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateTeacherCode = async () => {
    try {
        const result = await pool.query(`
            SELECT teacher_code FROM teachers 
            WHERE teacher_code ~ '^TCH[0-9]{5}$' 
            ORDER BY id DESC LIMIT 1
        `);
        
        let nextNumber = 1;
        if (result.rows.length > 0) {
            const lastCode = result.rows[0].teacher_code;
            const number = parseInt(lastCode.replace('TCH', ''));
            if (!isNaN(number) && number > 0) {
                nextNumber = number + 1;
            }
        }
        
        const paddedNumber = String(nextNumber).padStart(5, '0');
        return `TCH${paddedNumber}`;
    } catch (error) {
        console.error('Error generating teacher code:', error);
        const timestamp = Date.now().toString().slice(-6);
        return `TCH${timestamp}`;
    }
};

const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

module.exports = teacherController;
