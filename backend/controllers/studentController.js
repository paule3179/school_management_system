// backend/controllers/studentController.js - CORRECTED

const StudentModel = require('../models/StudentModel');
const bcrypt = require('bcrypt');
const { sendEmail } = require('../config/email');
const pool = require('../config/database');

const generateRandomPassword = () => {
    const length = 10;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

const generateAdmissionNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `STU${year}${random}`;
};

const studentController = {
    // Get all students
    async getAllStudents(req, res) {
        try {
            const { class_id, status, gender, search } = req.query;
            const filters = { class_id, status, gender, search };
            const students = await StudentModel.getAllStudents(filters);
            res.json({ success: true, data: students });
        } catch (error) {
            console.error('Error fetching students:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Search students
    async searchStudents(req, res) {
        try {
            const { keyword } = req.params;
            const students = await StudentModel.searchStudents(keyword);
            res.json({ success: true, data: students });
        } catch (error) {
            console.error('Error searching students:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get students by class - FIXED: c.class_name instead of c.name
    async getStudentsByClass(req, res) {
        try {
            const { classId } = req.params;
            const academicYear = req.query.academic_year || '2024-2025';
            
            const result = await pool.query(`
                SELECT 
                    s.id,
                    s.admission_number,
                    s.first_name,
                    s.last_name,
                    s.gender,
                    s.date_of_birth,
                    s.status,
                    s.parent_name,
                    s.parent_phone,
                    s.parent_email,
                    s.address,
                    s.ghana_card_number,
                    s.emergency_contact_name,
                    s.emergency_contact_phone,
                    s.emergency_contact_relationship,
                    s.blood_group,
                    s.allergies,
                    s.medical_conditions,
                    s.enrollment_date,
                    c.class_name as class_name,
                    c.level as class_level
                FROM students s
                JOIN class_students cs ON s.id = cs.student_id
                LEFT JOIN classes c ON cs.class_id = c.id
                WHERE cs.class_id = $1 AND cs.academic_year = $2 AND s.status = 'Active'
                ORDER BY s.first_name, s.last_name
            `, [classId, academicYear]);
            
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Error fetching students by class:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get parent's children - FIXED: c.class_name instead of c.name
    async getParentChildren(req, res) {
        try {
            const { parentId } = req.params;
            
            const result = await pool.query(`
                SELECT 
                    s.id, s.admission_number,
                    s.first_name, s.last_name, s.gender,
                    s.date_of_birth, s.class_id,
                    s.status, s.enrollment_date,
                    c.class_name as class_name,
                    c.level as class_level
                FROM students s
                LEFT JOIN classes c ON s.class_id = c.id
                WHERE s.parent_email = (
                    SELECT email FROM users WHERE id = $1 AND role = 'parent'
                ) AND s.status = 'Active'
                ORDER BY s.first_name
            `, [parentId]);
            
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Error fetching parent children:', error);
            res.json({ success: true, data: [] });
        }
    },

    // Get student by ID
    async getStudentById(req, res) {
        try {
            const { id } = req.params;
            const student = await StudentModel.getStudentById(id);
            if (!student) {
                return res.status(404).json({ success: false, error: 'Student not found' });
            }
            res.json({ success: true, data: student });
        } catch (error) {
            console.error('Error fetching student:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Create student
    async createStudent(req, res) {
        try {
            const {
                first_name, last_name, date_of_birth, gender,
                class_id, parent_name, parent_phone, parent_email, address,
                ghana_card_number,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                blood_group, allergies, medical_conditions
            } = req.body;
            
            if (!first_name || !last_name) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'First name and last name are required' 
                });
            }
            
            if (!parent_email || parent_email.trim() === '') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Parent email is required to send login credentials' 
                });
            }
            
            const admission_number = generateAdmissionNumber();
            const parentFirstName = parent_name?.split(' ')[0]?.toLowerCase() || 'parent';
            const schoolEmail = `${parentFirstName}${Math.floor(Math.random() * 1000)}@kingschool.edu`;
            const tempPassword = generateRandomPassword();
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                const studentResult = await client.query(`
                    INSERT INTO students (
                        admission_number, first_name, last_name, date_of_birth, gender,
                        class_id, parent_name, parent_phone, parent_email, address,
                        ghana_card_number,
                        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                        blood_group, allergies, medical_conditions, status, enrollment_date
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'Active', NOW())
                    RETURNING *
                `, [
                    admission_number, first_name, last_name, date_of_birth, gender,
                    class_id || null, parent_name, parent_phone, parent_email, address || null,
                    ghana_card_number || null,
                    emergency_contact_name || null, emergency_contact_phone || null, emergency_contact_relationship || null,
                    blood_group || null, allergies || null, medical_conditions || null
                ]);
                
                const student = studentResult.rows[0];
                
                const existingUser = await client.query(
                    'SELECT id FROM users WHERE email = $1',
                    [schoolEmail]
                );
                
                if (existingUser.rows.length === 0) {
                    await client.query(`
                        INSERT INTO users (email, password, first_name, last_name, role, phone, status)
                        VALUES ($1, $2, $3, $4, 'parent', $5, 'active')
                    `, [schoolEmail, hashedPassword, parentFirstName, '', parent_phone || null]);
                }
                
                if (class_id) {
                    await client.query(`
                        INSERT INTO class_students (class_id, student_id, academic_year)
                        VALUES ($1, $2, $3)
                        ON CONFLICT DO NOTHING
                    `, [class_id, student.id, '2024-2025']);
                }
                
                await client.query('COMMIT');
                
                const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
                
                console.log('\n=========================================');
                console.log('✅ STUDENT ENROLLED');
                console.log('=========================================');
                console.log(`👤 Student: ${first_name} ${last_name}`);
                console.log(`📧 Parent Email: ${parent_email}`);
                console.log(`🔑 Temporary Password: ${tempPassword}`);
                console.log(`🪪 Ghana Card: ${ghana_card_number || 'N/A'}`);
                console.log(`🔗 Login URL: ${loginUrl}`);
                console.log('=========================================\n');
                
                res.status(201).json({
                    success: true,
                    data: student,
                    parent_account: { 
                        email: parent_email,
                        school_email: schoolEmail,
                        password: tempPassword
                    },
                    message: 'Student enrolled successfully'
                });
                
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
            
        } catch (error) {
            console.error('Error creating student:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Update student
    async updateStudent(req, res) {
        try {
            const { id } = req.params;
            const {
                first_name, last_name, date_of_birth, gender,
                class_id, parent_name, parent_phone, parent_email, address,
                ghana_card_number,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                blood_group, allergies, medical_conditions, status
            } = req.body;
            
            const result = await pool.query(`
                UPDATE students 
                SET first_name = COALESCE($1, first_name),
                    last_name = COALESCE($2, last_name),
                    date_of_birth = COALESCE($3, date_of_birth),
                    gender = COALESCE($4, gender),
                    class_id = COALESCE($5, class_id),
                    parent_name = COALESCE($6, parent_name),
                    parent_phone = COALESCE($7, parent_phone),
                    parent_email = COALESCE($8, parent_email),
                    address = COALESCE($9, address),
                    ghana_card_number = COALESCE($10, ghana_card_number),
                    emergency_contact_name = COALESCE($11, emergency_contact_name),
                    emergency_contact_phone = COALESCE($12, emergency_contact_phone),
                    emergency_contact_relationship = COALESCE($13, emergency_contact_relationship),
                    blood_group = COALESCE($14, blood_group),
                    allergies = COALESCE($15, allergies),
                    medical_conditions = COALESCE($16, medical_conditions),
                    status = COALESCE($17, status),
                    updated_at = NOW()
                WHERE id = $18
                RETURNING *
            `, [
                first_name, last_name, date_of_birth, gender,
                class_id, parent_name, parent_phone, parent_email, address,
                ghana_card_number,
                emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
                blood_group, allergies, medical_conditions, status, id
            ]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Student not found' });
            }
            
            res.json({ success: true, data: result.rows[0], message: 'Student updated successfully' });
        } catch (error) {
            console.error('Error updating student:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Hard delete student
    async deleteStudent(req, res) {
        try {
            const { id } = req.params;
            
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                const studentCheck = await client.query(
                    'SELECT id, first_name, last_name FROM students WHERE id = $1',
                    [id]
                );
                
                if (studentCheck.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ success: false, error: 'Student not found' });
                }
                
                const studentName = `${studentCheck.rows[0].first_name} ${studentCheck.rows[0].last_name}`;
                
                await client.query('DELETE FROM class_students WHERE student_id = $1', [id]);
                await client.query('DELETE FROM attendance WHERE student_id = $1', [id]);
                await client.query('DELETE FROM marks WHERE student_id = $1', [id]);
                await client.query('DELETE FROM grades WHERE student_id = $1', [id]);
                await client.query('DELETE FROM parent_students WHERE student_id = $1', [id]);
                await client.query('DELETE FROM fees WHERE student_id = $1', [id]);
                await client.query('DELETE FROM students WHERE id = $1', [id]);
                
                await client.query('COMMIT');
                
                console.log(`✅ Student "${studentName}" (ID: ${id}) has been permanently deleted`);
                
                res.json({ 
                    success: true, 
                    message: `Student "${studentName}" has been permanently deleted`,
                    deletedId: id
                });
                
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Error deleting student:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Reset parent password
    async resetParentPassword(req, res) {
        try {
            const { parentId } = req.params;
            
            const newPassword = generateRandomPassword();
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            const result = await pool.query(`
                UPDATE users 
                SET password = $1, updated_at = NOW() 
                WHERE id = $2 AND role = 'parent'
                RETURNING email, first_name, last_name
            `, [hashedPassword, parentId]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Parent not found' });
            }
            
            const parent = result.rows[0];
            
            console.log('\n=========================================');
            console.log('🔐 PARENT PASSWORD RESET');
            console.log('=========================================');
            console.log(`📧 Email: ${parent.email}`);
            console.log(`🔑 New Password: ${newPassword}`);
            console.log('=========================================\n');
            
            res.json({
                success: true,
                message: 'Password reset successfully',
                data: { email: parent.email, temporary_password: newPassword }
            });
        } catch (error) {
            console.error('Error resetting password:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get student statistics
    async getStudentStatistics(req, res) {
        try {
            const stats = await StudentModel.getStudentStatistics();
            res.json({ success: true, data: stats });
        } catch (error) {
            console.error('Error fetching statistics:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = studentController;