const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const pool = require('../config/database');
const bcrypt = require('bcrypt');

// Every endpoint in this router exposes or changes administrator data.
router.use(verifyToken, isAdmin);
 
// ============================================
// HELPER FUNCTION TO GENERATE TEACHER CODE (TCH00001 format)
// ============================================
const generateTeacherCode = async () => {
    try {
        // First, try to get the last sequential teacher code
        const result = await pool.query(`
            SELECT teacher_code FROM teachers 
            WHERE teacher_code ~ '^TCH[0-9]{5}$' 
            ORDER BY CAST(SUBSTRING(teacher_code FROM 4) AS INTEGER) DESC 
            LIMIT 1
        `);
        
        let nextNumber = 1;
        if (result.rows.length > 0) {
            const lastCode = result.rows[0].teacher_code;
            // Extract number from TCH00001 format
            const number = parseInt(lastCode.replace('TCH', ''));
            if (!isNaN(number) && number > 0) {
                nextNumber = number + 1;
            }
        } else {
            // If no existing codes found, check if there are any teacher records
            const countResult = await pool.query('SELECT COUNT(*) as count FROM teachers');
            const totalTeachers = parseInt(countResult.rows[0].count);
            if (totalTeachers > 0) {
                // Use total teachers + 1 as next number
                nextNumber = totalTeachers + 1;
            }
        }
        
        // Pad with zeros to make it 5 digits (TCH00001, TCH00002, etc.)
        const paddedNumber = String(nextNumber).padStart(5, '0');
        const newCode = `TCH${paddedNumber}`;
        
        console.log(` Generated teacher code: ${newCode} (next number: ${nextNumber})`);
        return newCode;
        
    } catch (error) {
        console.error('Error generating teacher code:', error);
        // Fallback: use timestamp-based code
        const timestamp = Date.now().toString().slice(-6);
        const newCode = `TCH${timestamp}`;
        console.log(` Generated fallback teacher code: ${newCode}`);
        return newCode;
    }
};

// ============================================
// HELPER FUNCTION TO GENERATE STUDENT CODE
// ============================================
const generateStudentCode = async () => {
    try {
        const result = await pool.query(`
            SELECT admission_number FROM students 
            WHERE admission_number ~ '^STU[0-9]+$' 
            ORDER BY id DESC LIMIT 1
        `);
        
        let nextNumber = 1;
        if (result.rows.length > 0) {
            const lastCode = result.rows[0].admission_number;
            const number = parseInt(lastCode.replace('STU', ''));
            if (!isNaN(number)) {
                nextNumber = number + 1;
            }
        }
        
        const paddedNumber = String(nextNumber).padStart(5, '0');
        return `STU${paddedNumber}`;
    } catch (error) {
        console.error('Error generating student code:', error);
        const timestamp = Date.now().toString().slice(-5);
        return `STU${timestamp}`;
    }
};

// ============================================
// HELPER FUNCTION TO GENERATE TEACHER EMAIL
// ============================================
const generateTeacherEmail = (firstName, lastName) => {
    // Clean the name: remove extra spaces, convert to lowercase
    const cleanFirstName = firstName.trim().toLowerCase();
    const cleanLastName = lastName.trim().toLowerCase();
    
    // Generate base email: firstname.lastname@kingschool.edu
    let email = `${cleanFirstName}.${cleanLastName}@kingschool.edu`;
    
    // If first name or last name has spaces, remove them
    email = email.replace(/\s+/g, '');
    
    return email;
};

// ============================================
// HELPER FUNCTION TO GENERATE TEMPORARY PASSWORD
// ============================================
const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// ============================================
// HELPER FUNCTION TO SEND EMAIL WITH TERMINAL LOGGING
// ============================================
const sendTeacherEmail = async (teacherEmail, teacherName, teacherCode, tempPassword) => {
    console.log('\n ========== TEACHER LOGIN CREDENTIALS ==========');
    console.log(`To: ${teacherEmail}`);
    console.log(`Subject: Teacher Account Created - ${teacherName}`);
    console.log('-------------------------------------------');
    console.log(`Dear ${teacherName},`);
    console.log(`\nYour teacher account has been created successfully.`);
    console.log(`\n LOGIN CREDENTIALS:`);
    console.log(`   Email: ${teacherEmail}`);
    console.log(`   Teacher Code: ${teacherCode}`);
    console.log(`   Password: ${tempPassword}`);
    console.log(`\n Login Link: http://localhost:3000/login`);
    console.log(`\n Or use these credentials  `);
    console.log(`\n  IMPORTANT: Please change your password after first login.`);
    console.log('===========================================\n');
    return true;
};

const sendParentEmail = async (parentEmail, parentName, studentName, credentials) => {
    console.log('\n ========== PARENT LOGIN CREDENTIALS ==========');
    console.log(`To: ${parentEmail}`);
    console.log(`Subject: Student Enrollment Confirmation - ${studentName}`);
    console.log('-------------------------------------------');
    console.log(`Dear ${parentName},`);
    console.log(`\nYour child ${studentName} has been successfully enrolled.`);
    console.log(`\n LOGIN CREDENTIALS:`);
    console.log(`   Email: ${credentials.email}`);
    console.log(`   Password: ${credentials.password}`);
    console.log(`\n Login Link: http://localhost:3000/login`);
    console.log(`\n Or use these credentials  `);
    console.log('===========================================\n');
    return true;
};

// ============================================
// GET DASHBOARD STATISTICS - ROLE BASED
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const userRole = req.user.role;
        const userId = req.user.id;
        const userEmail = req.user.email;
        
        console.log(`📊 Fetching stats for ${userRole}: ${userEmail}`);
        
        let stats = {};
        
        if (userRole === 'admin') {
            const [studentsCount, teachersCount, classesCount] = await Promise.all([
                pool.query("SELECT COUNT(*) as count FROM students"),
                pool.query("SELECT COUNT(*) as count FROM teachers WHERE status = $1", ['Active']),
                pool.query("SELECT COUNT(*) as count FROM classes")
            ]);
            
            stats = {
                total_students: parseInt(studentsCount.rows[0]?.count || 0),
                total_teachers: parseInt(teachersCount.rows[0]?.count || 0),
                total_classes: parseInt(classesCount.rows[0]?.count || 0),
                role: 'admin'
            };
        } 
        else if (userRole === 'teacher') {
            const teacherResult = await pool.query(
                'SELECT id FROM teachers WHERE user_id = $1 OR email = $2',
                [userId, userEmail]
            );
            
            if (teacherResult.rows.length > 0) {
                const teacherId = teacherResult.rows[0].id;
                
                const classesResult = await pool.query(`
                    SELECT COUNT(DISTINCT tc.class_id) as count
                    FROM teacher_classes tc
                    WHERE tc.teacher_id = $1 AND COALESCE(tc.is_active, true) = true
                `, [teacherId]);
                
                const studentsResult = await pool.query(`
                    SELECT COUNT(DISTINCT s.id) as count
                    FROM teacher_classes tc
                    JOIN student_classes sc ON tc.class_id = sc.class_id AND sc.is_active = true
                    JOIN students s ON sc.student_id = s.id
                    WHERE tc.teacher_id = $1 AND COALESCE(tc.is_active, true) = true
                      AND LOWER(COALESCE(s.status, 'active')) = 'active'
                `, [teacherId]);
                
                stats = {
                    total_classes: parseInt(classesResult.rows[0]?.count || 0),
                    total_students: parseInt(studentsResult.rows[0]?.count || 0),
                    role: 'teacher'
                };
            } else {
                stats = { total_classes: 0, total_students: 0, role: 'teacher' };
            }
        }
        else if (userRole === 'parent') {
            const childrenResult = await pool.query(`
                SELECT COUNT(*) as count
                FROM students
                WHERE parent_email = $1 AND status = 'Active'
            `, [userEmail]);
            
            stats = {
                total_children: parseInt(childrenResult.rows[0]?.count || 0),
                role: 'parent'
            };
        }
        else {
            stats = { role: userRole };
        }
        
        console.log(`✅ Stats for ${userRole}:`, stats);
        res.json({ success: true, data: stats });
        
    } catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET CLASSES - ROLE BASED
// ============================================
router.get('/classes', async (req, res) => {
    try {
        const userRole = req.user.role;
        const userId = req.user.id;
        const userEmail = req.user.email;
        
        let query = `
            SELECT 
                c.id,
                c.class_name,
                c.level,
                c.capacity,
                c.room_number,
                c.academic_year,
                c.teacher_id,
                t.first_name as teacher_first_name,
                t.last_name as teacher_last_name,
                t.email as teacher_email
            FROM classes c
            LEFT JOIN teachers t ON c.teacher_id = t.id
        `;
        let params = [];
        
        if (userRole === 'teacher') {
            query = `
                SELECT DISTINCT
                    c.id,
                    c.class_name,
                    c.level,
                    c.capacity,
                    c.room_number,
                    c.academic_year
                FROM classes c
                JOIN teacher_classes tc ON c.id = tc.class_id
                JOIN teachers t ON tc.teacher_id = t.id
                WHERE t.user_id = $1 OR t.email = $2
                ORDER BY c.class_name
            `;
            params = [userId, userEmail];
        }
        else if (userRole === 'parent') {
            query = `
                SELECT DISTINCT
                    c.id,
                    c.class_name,
                    c.level,
                    c.capacity,
                    c.room_number,
                    c.academic_year
                FROM classes c
                JOIN student_classes sc ON c.id = sc.class_id AND sc.is_active = true
                JOIN students s ON sc.student_id = s.id
                WHERE s.parent_email = $1 AND LOWER(COALESCE(s.status, 'active')) = 'active'
                ORDER BY c.class_name
            `;
            params = [userEmail];
        }
        else {
            query += " ORDER BY c.class_name";
        }
        
        const result = await pool.query(query, params);
        console.log(`✅ Classes returned for ${userRole}: ${result.rows.length}`);
        
        res.json({ success: true, data: result.rows });
        
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET SINGLE CLASS
// ============================================
router.get('/classes/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                c.id,
                c.class_name,
                c.level,
                c.capacity,
                c.room_number,
                c.academic_year,
                c.teacher_id,
                t.first_name as teacher_first_name,
                t.last_name as teacher_last_name,
                t.email as teacher_email
            FROM classes c
            LEFT JOIN teachers t ON c.teacher_id = t.id
            WHERE c.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Get class error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CREATE CLASS (Admin only)
// ============================================
router.post('/classes', isAdmin, async (req, res) => {
    try {
        const { class_name, level, capacity, room_number, academic_year } = req.body;
        const teacher_id = req.body.teacher_id != null && req.body.teacher_id !== ''
            ? parseInt(req.body.teacher_id, 10)
            : null;
        
        const result = await pool.query(`
            INSERT INTO classes (class_name, level, capacity, room_number, academic_year, teacher_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *
        `, [class_name, level, capacity, room_number, academic_year || '2024-2025', teacher_id]);
        
        res.status(201).json({ success: true, data: result.rows[0], message: 'Class created successfully' });
    } catch (error) {
        console.error('Create class error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// UPDATE CLASS (Admin only)
// ============================================
router.put('/classes/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { class_name, level, capacity, room_number, academic_year } = req.body;
        const teacher_id = req.body.teacher_id != null && req.body.teacher_id !== ''
            ? parseInt(req.body.teacher_id, 10)
            : null;
        
        const result = await pool.query(`
            UPDATE classes 
            SET class_name = $1, 
                level = $2, 
                capacity = $3, 
                room_number = $4, 
                academic_year = $5,
                teacher_id = $6,
                updated_at = NOW()
            WHERE id = $7
            RETURNING *
        `, [class_name, level, capacity, room_number, academic_year, teacher_id, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }
        
        res.json({ success: true, data: result.rows[0], message: 'Class updated successfully' });
    } catch (error) {
        console.error('Update class error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DELETE CLASS (Admin only)
// ============================================
router.delete('/classes/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const studentCheck = await pool.query(`
            SELECT COUNT(*) FROM student_classes WHERE class_id = $1
        `, [id]);
        
        if (parseInt(studentCheck.rows[0].count) > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete class with enrolled students.' 
            });
        }
        
        const result = await pool.query('DELETE FROM classes WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }
        
        res.json({ success: true, message: 'Class deleted successfully' });
    } catch (error) {
        console.error('Delete class error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET STUDENTS - WITH ALL FIELDS
// ============================================
router.get('/students', isAdmin, async (req, res) => {
    try {
        const userRole = req.user.role;
        const userEmail = req.user.email;
        
        let query = `
            SELECT 
                s.id,
                s.admission_number,
                s.first_name,
                s.last_name,
                s.date_of_birth,
                s.gender,
                s.address,
                s.parent_name,
                s.parent_phone,
                s.parent_email,
                s.class_id,
                COALESCE(c.class_name, 'Not Assigned') as class_name,
                s.enrollment_date,
                s.status,
                s.emergency_contact_name,
                s.emergency_contact_phone,
                s.emergency_contact_relationship,
                s.blood_group,
                s.allergies,
                s.medical_conditions,
                s.created_at
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
        `;
        let params = [];
        
        if (userRole === 'parent') {
            query += ` WHERE s.parent_email = $1 AND s.status = 'Active'`;
            params = [userEmail];
        }
        
        query += ` ORDER BY s.created_at DESC`;
        
        const result = await pool.query(query, params);
        console.log(`✅ Students returned for ${userRole}: ${result.rows.length}`);
        
        res.json({ success: true, data: result.rows });
        
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CREATE STUDENT  
// ============================================
router.post('/students', isAdmin, async (req, res) => {
    let client;
    try {
        const {
            admission_number,
            first_name,
            last_name,
            date_of_birth,
            gender,
            phone,
            address,
            parent_name,
            parent_phone,
            parent_email,
            class_id,
            enrollment_date,
            status,
            medical_info,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship,
            blood_group,
            allergies,
            medical_conditions,
            nationality,
            religion,
            previous_school
        } = req.body;

        // Normalize inputs (trim whitespace)
        const normalizedFirstName = typeof first_name === 'string' ? first_name.trim() : first_name;
        const normalizedLastName = typeof last_name === 'string' ? last_name.trim() : last_name;
        const normalizedParentName = typeof parent_name === 'string' ? parent_name.trim() : parent_name;
        const normalizedParentEmail = typeof parent_email === 'string' ? parent_email.trim() : parent_email;

        console.log('📝 Creating student with data:', { 
            first_name: normalizedFirstName, 
            last_name: normalizedLastName, 
            class_id,
            parent_name: normalizedParentName,
            parent_email: normalizedParentEmail 
        });

        // Validate required fields
        const missingFields = [];
        if (!normalizedFirstName) missingFields.push('first_name');
        if (!normalizedLastName) missingFields.push('last_name');
        if (!class_id) missingFields.push('class_id');
        if (!normalizedParentEmail) missingFields.push('parent_email');
        if (!normalizedParentName) missingFields.push('parent_name');

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`,
                missingFields: missingFields
            });
        }

        // Start transaction
        client = await pool.connect();
        await client.query('BEGIN');

        // Generate temporary password
        const tempPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Check if user already exists with this parent email
        let userId = null;
        const existingUser = await client.query(
            'SELECT id, first_name, last_name FROM users WHERE LOWER(email) = LOWER($1)',
            [normalizedParentEmail]
        );

        if (existingUser.rows.length > 0) {
            userId = existingUser.rows[0].id;
            console.log(`📧 User already exists with email: ${normalizedParentEmail} (ID: ${userId})`);
        } else {
            // Create new user for parent with proper names
            const nameParts = normalizedParentName.split(' ');
            const userFirstName = nameParts[0] || 'Parent';
            const userLastName = nameParts.slice(1).join(' ') || 'User';
            
            const newUser = await client.query(`
                INSERT INTO users (
                    email, 
                    password, 
                    first_name, 
                    last_name, 
                    role, 
                    status, 
                    created_at,
                    updated_at
                ) VALUES ($1, $2, $3, $4, 'parent', 'active', NOW(), NOW())
                RETURNING id
            `, [
                normalizedParentEmail.toLowerCase(), 
                hashedPassword, 
                userFirstName,
                userLastName
            ]);
            
            userId = newUser.rows[0].id;
            console.log(`✅ New parent user created with ID: ${userId}`);
        }

        // Check if student already exists
        const existingStudent = await client.query(
            `SELECT id FROM students WHERE parent_email = $1 OR admission_number = $2`,
            [normalizedParentEmail, admission_number]
        );

        if (existingStudent.rows.length > 0) {
            await client.query('ROLLBACK');
            client.release();
            client = null;
            return res.status(409).json({
                success: false,
                error: 'Student with this parent email or admission number already exists',
                code: 'DUPLICATE_STUDENT'
            });
        }

        // Generate admission number if not provided
        const finalAdmissionNumber = admission_number || await generateStudentCode();

        // Insert student
        const result = await client.query(`
            INSERT INTO students (
                user_id,
                admission_number,
                first_name,
                last_name,
                date_of_birth,
                gender,
                class_id,
                parent_name,
                parent_phone,
                parent_email,
                address,
                enrollment_date,
                status,
                emergency_contact_name,
                emergency_contact_phone,
                emergency_contact_relationship,
                blood_group,
                allergies,
                medical_conditions,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
            RETURNING *
        `, [
            userId,
            finalAdmissionNumber,
            normalizedFirstName,
            normalizedLastName,
            date_of_birth || null,
            gender || null,
            class_id,
            normalizedParentName,
            parent_phone || null,
            normalizedParentEmail,
            address || null,
            enrollment_date || new Date().toISOString().split('T')[0],
            status || 'Active',
            emergency_contact_name || null,
            emergency_contact_phone || null,
            emergency_contact_relationship || null,
            blood_group || null,
            allergies || null,
            medical_conditions || null
        ]);

        await client.query('COMMIT');
        client.release();
        client = null;

        const newStudent = result.rows[0];
        console.log(`✅ Student created: ${normalizedFirstName} ${normalizedLastName} (ID: ${newStudent.id})`);
        console.log(`📋 Admission Number: ${finalAdmissionNumber}`);

        // Log credentials
        console.log('\n ========== PARENT LOGIN CREDENTIALS ==========');
        console.log(`👤 Student: ${normalizedFirstName} ${normalizedLastName}`);
        console.log(` Parent Email: ${normalizedParentEmail}`);
        console.log(` Password: ${tempPassword}`);
        console.log(` Login URL: http://localhost:3000/login`);
        console.log('===========================================\n');

        res.status(201).json({
            success: true,
            data: newStudent,
            message: 'Student created successfully.',
            credentials: {
                email: normalizedParentEmail,
                password: tempPassword,
                login_url: 'http://localhost:3000/login'
            }
        });

    } catch (error) {
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Student transaction rollback failed:', rollbackError);
            }
            client.release();
        }
        console.error(' Error creating student:', error);
        
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                error: 'Duplicate entry. This parent email or admission number already exists.',
                code: 'DUPLICATE_ENTRY'
            });
        }
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// UPDATE STUDENT
// ============================================
router.put('/students/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            first_name, last_name, date_of_birth, gender, address,
            parent_name, parent_phone, parent_email, class_id, enrollment_date, status,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            blood_group, allergies, medical_conditions
        } = req.body;
        
        const validDateOfBirth = date_of_birth && date_of_birth.trim() !== '' ? date_of_birth : null;
        const validEnrollmentDate = enrollment_date && enrollment_date.trim() !== '' ? enrollment_date : null;
        const validClassId = class_id && class_id !== '' ? parseInt(class_id) : null;
        
        const result = await pool.query(`
            UPDATE students SET
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                date_of_birth = $3,
                gender = COALESCE($4, gender),
                address = COALESCE($5, address),
                parent_name = COALESCE($6, parent_name),
                parent_phone = COALESCE($7, parent_phone),
                parent_email = COALESCE($8, parent_email),
                class_id = $9,
                enrollment_date = $10,
                status = COALESCE($11, status),
                emergency_contact_name = COALESCE($12, emergency_contact_name),
                emergency_contact_phone = COALESCE($13, emergency_contact_phone),
                emergency_contact_relationship = COALESCE($14, emergency_contact_relationship),
                blood_group = COALESCE($15, blood_group),
                allergies = COALESCE($16, allergies),
                medical_conditions = COALESCE($17, medical_conditions),
                updated_at = NOW()
            WHERE id = $18
            RETURNING *
        `, [
            first_name, last_name, validDateOfBirth, gender, address,
            parent_name, parent_phone, parent_email, validClassId, validEnrollmentDate, status,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            blood_group, allergies, medical_conditions, id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        console.log(`✅ Student ${id} updated successfully`);
        
        res.json({ success: true, data: result.rows[0], message: 'Student updated successfully' });
        
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DELETE STUDENT
// ============================================
router.delete('/students/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const studentInfo = await pool.query(`
            SELECT first_name, last_name, admission_number FROM students WHERE id = $1
        `, [id]);
        
        if (studentInfo.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        console.log(`✅ Student deleted: ${studentInfo.rows[0].first_name} ${studentInfo.rows[0].last_name}`);
        
        res.json({ success: true, message: 'Student deleted successfully' });
        
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET ALL TEACHERS
// ============================================
router.get('/teachers', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                user_id,
                teacher_code,
                first_name,
                last_name,
                email,
                phone,
                employee_number,
                department,
                status,
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
                created_at
            FROM teachers
            ORDER BY first_name, last_name
        `);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get teachers error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET SINGLE TEACHER
// ============================================
router.get('/teachers/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                id,
                user_id,
                teacher_code,
                first_name,
                last_name,
                email,
                phone,
                employee_number,
                department,
                status,
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
                created_at
            FROM teachers
            WHERE id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Get teacher error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CREATE TEACHER - WITH AUTO-GENERATED EMAIL, PASSWORD, AND TEACHER CODE
// ============================================
router.post('/teachers', isAdmin, async (req, res) => {
    let client;
    try {
        const {
            first_name, 
            last_name, 
            phone, 
            employee_number, 
            department, 
            status,
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
            address
        } = req.body;

        console.log('📝 Creating teacher with data:', { 
            first_name, 
            last_name,
            date_hired, 
            date_of_birth 
        });

        // Validate required fields
        if (!first_name || !last_name) {
            return res.status(400).json({
                success: false,
                error: 'First name and last name are required'
            });
        }

        // ============================================
        // GENERATE TEACHER EMAIL
        // ============================================
        const teacherEmail = generateTeacherEmail(first_name, last_name);
        console.log(`📧 Generated teacher email: ${teacherEmail}`);

        // ============================================
        // GENERATE TEACHER CODE (TCH00001 format)
        // ============================================
        const teacherCode = await generateTeacherCode();
        console.log(`📋 Generated teacher code: ${teacherCode}`);

        // ============================================
        // GENERATE TEMPORARY PASSWORD
        // ============================================
        const tempPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        console.log(`🔑 Generated temporary password: ${tempPassword}`);

        // ============================================
        // CHECK IF TEACHER EMAIL ALREADY EXISTS
        // ============================================
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [teacherEmail]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: `Teacher email ${teacherEmail} already exists. Please use a different name.`,
                code: 'DUPLICATE_EMAIL'
            });
        }

        // ============================================
        // CHECK IF TEACHER CODE ALREADY EXISTS
        // ============================================
        const existingTeacher = await pool.query(
            'SELECT id FROM teachers WHERE teacher_code = $1',
            [teacherCode]
        );

        if (existingTeacher.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: `Teacher code ${teacherCode} already exists.`,
                code: 'DUPLICATE_TEACHER_CODE'
            });
        }

        // Start transaction
        client = await pool.connect();
        await client.query('BEGIN');

        // ============================================
        // CREATE USER IN USERS TABLE
        // ============================================
        const userResult = await client.query(`
            INSERT INTO users (
                email, 
                password, 
                first_name, 
                last_name, 
                role, 
                status, 
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, 'teacher', $5, NOW(), NOW()) 
            RETURNING id
        `, [
            teacherEmail, 
            hashedPassword, 
            first_name, 
            last_name, 
            status || 'active'
        ]);
        
        const userId = userResult.rows[0].id;
        console.log(`✅ User created with ID: ${userId}`);

        // ============================================
        // CONVERT EMPTY STRINGS TO NULL FOR DATE FIELDS
        // ============================================
        const validDateHired = date_hired && date_hired.trim() !== '' ? date_hired : null;
        const validDateOfBirth = date_of_birth && date_of_birth.trim() !== '' ? date_of_birth : null;
        const validYearsOfExperience = years_of_experience && years_of_experience !== '' ? parseInt(years_of_experience) : 0;

        // ============================================
        // CREATE TEACHER RECORD
        // ============================================
        const result = await client.query(`
            INSERT INTO teachers (
                user_id, 
                teacher_code,
                first_name, 
                last_name, 
                email, 
                phone, 
                employee_number, 
                department, 
                status,
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
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
            RETURNING *
        `, [
            userId,
            teacherCode,
            first_name, 
            last_name, 
            teacherEmail, 
            phone || null, 
            employee_number || null, 
            department || null, 
            status || 'active',
            subject_specialty || null, 
            qualification || null, 
            validYearsOfExperience,
            validDateHired,
            ghana_card_number || null, 
            ssn || null, 
            religion || null, 
            bank_account || null, 
            gender || null, 
            validDateOfBirth,
            address || null
        ]);

        await client.query('COMMIT');
        client.release();
        client = null;

        const newTeacher = result.rows[0];
        console.log(`✅ Teacher created: ${first_name} ${last_name}`);
        console.log(`📋 Teacher Code: ${teacherCode}`);
        console.log(`📧 Email: ${teacherEmail}`);

        // ============================================
        // LOG CREDENTIALS TO TERMINAL
        // ============================================
        console.log('\n🔐 ========== TEACHER LOGIN CREDENTIALS ==========');
        console.log(`👤 Teacher: ${first_name} ${last_name}`);
        console.log(`📋 Teacher Code: ${teacherCode}`);
        console.log(`📧 Email: ${teacherEmail}`);
        console.log(`🔑 Temporary Password: ${tempPassword}`);
        console.log(`🔗 Login URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`);
        console.log(`⚠️  IMPORTANT: Teacher must change password after first login.`);
        console.log('===========================================\n');

        // Send email notification
        try {
            await sendTeacherEmail(
                teacherEmail,
                `${first_name} ${last_name}`,
                teacherCode,
                tempPassword
            );
            console.log(`📧 Teacher email sent to: ${teacherEmail}`);
        } catch (emailError) {
            console.warn('⚠️ Email notification failed:', emailError.message);
            console.log('📧 Please manually share these credentials:');
            console.log(`   Email: ${teacherEmail}`);
            console.log(`   Password: ${tempPassword}`);
            console.log(`   Teacher Code: ${teacherCode}`);
        }

        res.status(201).json({ 
            success: true, 
            data: newTeacher, 
            message: 'Teacher created successfully',
            credentials: {
                email: teacherEmail,
                password: tempPassword,
                teacher_code: teacherCode,
                login_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
            }
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
        console.error('❌ Create teacher error:', error);
        
        // Handle PostgreSQL unique violation
        if (error.code === '23505') {
            const detail = error.detail || '';
            if (detail.includes('email')) {
                return res.status(409).json({
                    success: false,
                    error: 'This email already exists. Please use a different name.',
                    code: 'DUPLICATE_EMAIL'
                });
            } else if (detail.includes('teacher_code')) {
                return res.status(409).json({
                    success: false,
                    error: 'Teacher code already exists. Please try again.',
                    code: 'DUPLICATE_TEACHER_CODE'
                });
            }
            return res.status(409).json({
                success: false,
                error: 'Duplicate entry. Please check the data and try again.',
                code: 'DUPLICATE_ENTRY'
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// UPDATE TEACHER
// ============================================
router.put('/teachers/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            first_name, last_name, phone, employee_number, department, status,
            subject_specialty, qualification, years_of_experience, date_hired,
            ghana_card_number, ssn, religion, bank_account, gender, date_of_birth, address
        } = req.body;
        
        // Check if teacher exists
        const checkTeacher = await pool.query('SELECT id FROM teachers WHERE id = $1', [id]);
        if (checkTeacher.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }
        
        // Convert empty strings to NULL for date fields
        const validDateHired = date_hired && date_hired.trim() !== '' ? date_hired : null;
        const validDateOfBirth = date_of_birth && date_of_birth.trim() !== '' ? date_of_birth : null;
        const validYearsOfExperience = years_of_experience && years_of_experience !== '' ? parseInt(years_of_experience) : 0;
        
        const result = await pool.query(`
            UPDATE teachers SET
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                phone = COALESCE($3, phone),
                employee_number = COALESCE($4, employee_number),
                department = COALESCE($5, department),
                status = COALESCE($6, status),
                subject_specialty = COALESCE($7, subject_specialty),
                qualification = COALESCE($8, qualification),
                years_of_experience = COALESCE($9, years_of_experience),
                date_hired = $10,
                ghana_card_number = COALESCE($11, ghana_card_number),
                ssn = COALESCE($12, ssn),
                religion = COALESCE($13, religion),
                bank_account = COALESCE($14, bank_account),
                gender = COALESCE($15, gender),
                date_of_birth = $16,
                address = COALESCE($17, address),
                updated_at = NOW()
            WHERE id = $18
            RETURNING *
        `, [
            first_name, last_name, phone, employee_number, department, status,
            subject_specialty, qualification, validYearsOfExperience, validDateHired,
            ghana_card_number, ssn, religion, bank_account, gender, validDateOfBirth, address, id
        ]);
        
        console.log(`✅ Teacher ${id} updated successfully`);
        
        res.json({ success: true, data: result.rows[0], message: 'Teacher updated successfully' });
    } catch (error) {
        console.error('❌ Update teacher error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DELETE TEACHER
// ============================================
router.delete('/teachers/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if teacher exists
        const checkTeacher = await pool.query('SELECT id FROM teachers WHERE id = $1', [id]);
        if (checkTeacher.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }
        
        // Check if teacher has assigned classes
        const classCheck = await pool.query(`
            SELECT COUNT(*) as count FROM classes WHERE teacher_id = $1
        `, [id]);
        
        if (parseInt(classCheck.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete teacher with assigned classes. Please reassign classes first.'
            });
        }
        
        const result = await pool.query('DELETE FROM teachers WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }
        
        console.log(`✅ Teacher ${id} deleted successfully`);
        
        res.json({ success: true, message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('❌ Delete teacher error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET ALL USERS (Admin only)
// ============================================
router.get('/users', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id as user_id,
                u.email,
                CONCAT(u.first_name, ' ', u.last_name) as full_name,
                u.first_name,
                u.last_name,
                u.role as user_role,
                u.status as is_active,
                u.phone,
                u.last_login,
                u.created_at
            FROM users u
            ORDER BY u.created_at DESC
        `);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET USER ACTIVITY (Admin only)
// ============================================
router.get('/user-activity', isAdmin, async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        
        const result = await pool.query(`
            SELECT 
                ua.*,
                u.email as username,
                u.role as user_role
            FROM user_activity ua
            JOIN users u ON ua.user_id = u.id
            ORDER BY ua.login_time DESC
            LIMIT $1
        `, [parseInt(limit)]);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// SUBJECT MANAGEMENT
// ============================================

// Get all subjects
router.get('/subjects', isAdmin, async (req, res) => {
    try {
        console.log('📋 Fetching all subjects...');
        
        const result = await pool.query(`
            SELECT 
                id,
                name,
                code,
                description,
                level,
                COALESCE(status, 'active') as status
            FROM subjects
            ORDER BY name
        `);
        
        console.log(`✅ Found ${result.rows.length} subjects`);
        
        res.json({ 
            success: true, 
            data: result.rows 
        });
    } catch (error) {
        console.error('❌ Get subjects error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get single subject
router.get('/subjects/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT * FROM subjects WHERE id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Subject not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Get subject error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create subject
router.post('/subjects', isAdmin, async (req, res) => {
    try {
        const { name, code, description, level } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: 'Subject name is required' });
        }
        
        const result = await pool.query(`
            INSERT INTO subjects (name, code, description, level, status, created_at)
            VALUES ($1, $2, $3, $4, 'active', NOW())
            RETURNING *
        `, [name, code, description, level || 'Primary']);
        
        res.status(201).json({ success: true, data: result.rows[0], message: 'Subject created successfully' });
    } catch (error) {
        console.error('Create subject error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update subject
router.put('/subjects/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, description, level, status } = req.body;
        
        const result = await pool.query(`
            UPDATE subjects 
            SET name = COALESCE($1, name),
                code = COALESCE($2, code),
                description = COALESCE($3, description),
                level = COALESCE($4, level),
                status = COALESCE($5, status),
                updated_at = NOW()
            WHERE id = $6
            RETURNING *
        `, [name, code, description, level, status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Subject not found' });
        }
        
        res.json({ success: true, data: result.rows[0], message: 'Subject updated successfully' });
    } catch (error) {
        console.error('Update subject error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete subject
router.delete('/subjects/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const checkResult = await pool.query(`
            SELECT COUNT(*) FROM class_subjects WHERE subject_id = $1
        `, [id]);
        
        if (parseInt(checkResult.rows[0].count) > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete subject that is assigned to classes. Remove it from classes first.' 
            });
        }
        
        const result = await pool.query('DELETE FROM subjects WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Subject not found' });
        }
        
        res.json({ success: true, message: 'Subject deleted successfully' });
    } catch (error) {
        console.error('Delete subject error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get subjects for a class
router.get('/classes/:classId/subjects', isAdmin, async (req, res) => {
    try {
        const { classId } = req.params;
        
        const result = await pool.query(`
            SELECT 
                cs.id,
                cs.subject_id,
                cs.hours_per_week,
                s.name as subject_name,
                s.code as subject_code,
                s.level
            FROM class_subjects cs
            JOIN subjects s ON cs.subject_id = s.id
            WHERE cs.class_id = $1
            ORDER BY s.name
        `, [classId]);
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get class subjects error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Assign subject to class
router.post('/classes/:classId/subjects', isAdmin, async (req, res) => {
    try {
        const { classId } = req.params;
        const { subject_id, hours_per_week } = req.body;
        
        const existing = await pool.query(`
            SELECT id FROM class_subjects 
            WHERE class_id = $1 AND subject_id = $2
        `, [classId, subject_id]);
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Subject already assigned to this class' });
        }
        
        const result = await pool.query(`
            INSERT INTO class_subjects (class_id, subject_id, hours_per_week, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING *
        `, [classId, subject_id, hours_per_week || 3]);
        
        res.status(201).json({ success: true, data: result.rows[0], message: 'Subject assigned successfully' });
    } catch (error) {
        console.error('Assign subject error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Remove subject from class
router.delete('/class-subjects/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM class_subjects WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Class-subject relationship not found' });
        }
        
        res.json({ success: true, message: 'Subject removed from class successfully' });
    } catch (error) {
        console.error('Remove class subject error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DEBUG ENDPOINT
// ============================================
router.get('/debug', isAdmin, async (req, res) => {
    try {
        const teachers = await pool.query("SELECT COUNT(*) as count FROM teachers WHERE status = 'Active'");
        const students = await pool.query("SELECT COUNT(*) as count FROM students WHERE status = 'Active'");
        const classes = await pool.query("SELECT COUNT(*) as count FROM classes");
        
        res.json({
            success: true,
            data: {
                counts: {
                    teachers: parseInt(teachers.rows[0]?.count || 0),
                    students: parseInt(students.rows[0]?.count || 0),
                    classes: parseInt(classes.rows[0]?.count || 0)
                }
            }
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
