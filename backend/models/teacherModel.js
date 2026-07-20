// backend/models/TeacherModel.js
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { sendEmail } = require('../config/email');

// Generate random temporary password
const generateTempPassword = () => {
    const length = 10;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Generate teacher school email from first name and last name
const generateTeacherSchoolEmail = (firstName, lastName) => {
    if (!firstName) return null;
    const cleanFirstName = firstName.trim().toLowerCase().replace(/[^a-z]/g, '');
    const cleanLastName = lastName.trim().toLowerCase().replace(/[^a-z]/g, '');
    return `${cleanFirstName}.${cleanLastName}@kingschool.edu`;
};

// Generate teacher code
const generateTeacherCode = () => {
    const prefix = 'TCH';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
};

class TeacherModel {
    // Get all teachers with filters
    async getAllTeachers(filters = {}) {
        let query = `
            SELECT 
                id, teacher_code, first_name, last_name, gender, date_of_birth,
                email, phone, address, department, qualification,
                years_of_experience, date_hired, ghana_card_number, 
                ssn, religion, bank_account, status
            FROM teachers
            WHERE 1=1
        `;
        
        const values = [];
        let paramCount = 1;
        
        if (filters.department) {
            query += ` AND department = $${paramCount}`;
            values.push(filters.department);
            paramCount++;
        }
        if (filters.status) {
            query += ` AND status = $${paramCount}`;
            values.push(filters.status);
            paramCount++;
        }
        if (filters.search) {
            query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR teacher_code ILIKE $${paramCount} OR ghana_card_number ILIKE $${paramCount} OR ssn ILIKE $${paramCount} OR religion ILIKE $${paramCount})`;
            values.push(`%${filters.search}%`);
            paramCount++;
        }
        
        query += ` ORDER BY last_name`;
        
        const result = await pool.query(query, values);
        return result.rows;
    }
    
    // Get teacher by ID
    async getTeacherById(id) {
        const result = await pool.query(`
            SELECT 
                id, teacher_code, first_name, last_name, gender, date_of_birth,
                email, phone, address, department, qualification,
                years_of_experience, date_hired, ghana_card_number,
                ssn, religion, bank_account, status
            FROM teachers 
            WHERE id = $1
        `, [id]);
        
        return result.rows[0] || null;
    }
    
    // Fix the getTeacherByEmail method to search correctly
        async getTeacherByEmail(email) {
            const result = await pool.query(`
                SELECT id, teacher_code, first_name, last_name, email, department, 
                    ghana_card_number, ssn, religion, status
                FROM teachers 
                WHERE email = $1
            `, [email]);
            
            return result.rows[0] || null;
        }
            // Get teacher by Ghana Card number
    async getTeacherByGhanaCard(ghanaCardNumber) {
        if (!ghanaCardNumber) return null;
        
        const result = await pool.query(`
            SELECT id, teacher_code, first_name, last_name, email, department, 
                   ghana_card_number, ssn, religion, status
            FROM teachers 
            WHERE ghana_card_number = $1
        `, [ghanaCardNumber]);
        
        return result.rows[0] || null;
    }
    
    // Get teacher by SSN
    async getTeacherBySSN(ssn) {
        if (!ssn) return null;
        
        const result = await pool.query(`
            SELECT id, teacher_code, first_name, last_name, email, ssn, status
            FROM teachers 
            WHERE ssn = $1
        `, [ssn]);
        
        return result.rows[0] || null;
    }
    
    // backend/models/TeacherModel.js - Fixed createTeacher method

async createTeacher(teacherData) {
    const {
        first_name,
        last_name,
        gender,
        date_of_birth,
        email,  // personal email
        phone,
        address,
        department,
        qualification,
        years_of_experience,
        date_hired,
        ghana_card_number,
        ssn,
        religion,
        bankAccount,
        status
    } = teacherData;
    
    if (!first_name || !last_name) {
        throw new Error('First name and last name are required');
    }
    
    if (!email) {
        throw new Error('Personal email is required to send login credentials');
    }
    
    console.log('Creating teacher with data:', {
        first_name,
        last_name,
        gender,
        date_of_birth,
        email
    });
    
    const teacher_code = generateTeacherCode();
    const schoolEmail = generateTeacherSchoolEmail(first_name, last_name);
    
    let finalSchoolEmail = schoolEmail;
    let counter = 1;
    while (await this.getTeacherByEmail(finalSchoolEmail)) {
        const [name, domain] = schoolEmail.split('@');
        finalSchoolEmail = `${name}${counter}@${domain}`;
        counter++;
    }
    
    const autoPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(autoPassword, 10);
    
    if (ghana_card_number) {
        const existingGhanaCard = await this.getTeacherByGhanaCard(ghana_card_number);
        if (existingGhanaCard) {
            throw new Error('Ghana Card number already registered to another teacher');
        }
    }
    
    if (ssn) {
        const existingSSN = await this.getTeacherBySSN(ssn);
        if (existingSSN) {
            throw new Error('SSN already registered to another teacher');
        }
    }
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Create user account for login
        const userQuery = `
            INSERT INTO users (
                email, password, first_name, last_name, role, phone, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `;
        
        const userResult = await client.query(userQuery, [
            finalSchoolEmail, 
            hashedPassword, 
            first_name,
            last_name,
            'teacher', 
            phone || null, 
            'active'
        ]);
        
        const userId = userResult.rows[0].id;
        
        // Create teacher record - matching your exact table columns
        // DO NOT include created_at or updated_at - they have DEFAULT values
        const teacherQuery = `
            INSERT INTO teachers (
                teacher_code, first_name, last_name, gender, date_of_birth,
                email, phone, address, department, qualification, 
                years_of_experience, date_hired, ghana_card_number,
                ssn, religion, bank_account, status, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING 
                id, teacher_code, first_name, last_name, gender, date_of_birth,
                email, phone, address, department, qualification,
                years_of_experience, date_hired, ghana_card_number,
                ssn, religion, bank_account, status
        `;
        
        const teacherResult = await client.query(teacherQuery, [
            teacher_code,
            first_name,
            last_name,
            gender || null,
            date_of_birth || null,
            finalSchoolEmail,  // This is the school email stored in teachers table
            phone || null,
            address || null,
            department || null,
            qualification || null,
            years_of_experience ? parseInt(years_of_experience) : null,
            date_hired || null,
            ghana_card_number || null,
            ssn || null,
            religion || null,
            bankAccount || null,
            status || 'Active',
            userId
        ]);
        
        await client.query('COMMIT');
        
        const teacher = teacherResult.rows[0];
        
        const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
        
        console.log('\n=========================================');
        console.log('✅ NEW TEACHER ACCOUNT CREATED');
        console.log('=========================================');
        console.log(`👤 Name: ${first_name} ${last_name}`);
        console.log(`📧 Personal Email: ${email}`);
        console.log(`🔐 School Email (Username): ${finalSchoolEmail}`);
        console.log(`🔑 Temporary Password: ${autoPassword}`);
        console.log(`🆔 Teacher Code: ${teacher_code}`);
        console.log(`📚 Department: ${department || 'Not assigned'}`);
        console.log(`🪪 Ghana Card: ${ghana_card_number || 'Not provided'}`);
        console.log(`🔢 SSN: ${ssn || 'Not provided'}`);
        console.log(`⛪ Religion: ${religion || 'Not provided'}`);
        console.log(`🏦 Bank Account: ${bankAccount || 'Not provided'}`);
        console.log(`📞 Phone: ${phone || 'Not provided'}`);
        console.log(`🏠 Address: ${address || 'Not provided'}`);
        console.log(`⚥ Gender: ${gender || 'Not specified'}`);
        console.log(`🎂 Date of Birth: ${date_of_birth || 'Not provided'}`);
        console.log('=========================================');
        console.log(`🔗 Login URL: ${loginUrl}`);
        console.log('=========================================\n');
        
        return {
            ...teacher,
            temp_password: autoPassword,
            school_email: finalSchoolEmail,
            personal_email: email
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
    
    // Update teacher
    async updateTeacher(id, updateData) {
        const updates = [];
        const values = [];
        let paramCount = 1;
        
        const allowedFields = [
            'first_name', 'last_name', 'gender', 'date_of_birth',
            'phone', 'address', 'department', 'qualification', 
            'years_of_experience', 'date_hired', 'ghana_card_number',
            'ssn', 'religion', 'bank_account', 'status'
        ];
        
        let newSchoolEmail = null;
        if (updateData.first_name || updateData.last_name) {
            const currentTeacher = await this.getTeacherById(id);
            const firstName = updateData.first_name || currentTeacher.first_name;
            const lastName = updateData.last_name || currentTeacher.last_name;
            newSchoolEmail = generateTeacherSchoolEmail(firstName, lastName);
            
            const existingEmail = await this.getTeacherByEmail(newSchoolEmail);
            if (existingEmail && existingEmail.id !== parseInt(id)) {
                throw new Error('School email already exists for another teacher');
            }
            updates.push(`email = $${paramCount++}`);
            values.push(newSchoolEmail);
        }
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                if (field === 'ghana_card_number' && updateData.ghana_card_number) {
                    const existing = await this.getTeacherByGhanaCard(updateData.ghana_card_number);
                    if (existing && existing.id !== parseInt(id)) {
                        throw new Error('Ghana Card number already registered to another teacher');
                    }
                }
                
                if (field === 'ssn' && updateData.ssn) {
                    const existing = await this.getTeacherBySSN(updateData.ssn);
                    if (existing && existing.id !== parseInt(id)) {
                        throw new Error('SSN already registered to another teacher');
                    }
                }
                
                updates.push(`${field} = $${paramCount++}`);
                let value = updateData[field];
                if (field === 'years_of_experience' && value) {
                    value = parseInt(value);
                }
                values.push(value || null);
            }
        }
        
        if (updates.length === 0) {
            return null;
        }
        
        values.push(id);
        
        const query = `
            UPDATE teachers 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING 
                id, teacher_code, first_name, last_name, gender, date_of_birth,
                email, phone, address, department, qualification,
                years_of_experience, date_hired, ghana_card_number,
                ssn, religion, bank_account, status
        `;
        
        const result = await pool.query(query, values);
        
        if (result.rows[0]) {
            const updateEmail = newSchoolEmail || result.rows[0].email;
            await pool.query(`
                UPDATE users 
                SET email = $1, first_name = $2, last_name = $3, phone = $4
                WHERE email = $5 AND role = 'teacher'
            `, [updateEmail, updateData.first_name, updateData.last_name, updateData.phone || null, result.rows[0].email]);
            
            return result.rows[0];
        }
        
        return null;
    }
    
    // Delete teacher
    async deleteTeacher(id) {
        const teacherCheck = await pool.query('SELECT * FROM teachers WHERE id = $1', [id]);
        
        if (teacherCheck.rows.length === 0) {
            throw new Error('Teacher not found');
        }
        
        const classCheck = await pool.query('SELECT * FROM teacher_classes WHERE teacher_id = $1', [id]);
        
        if (classCheck.rows.length > 0) {
            throw new Error('Cannot delete teacher assigned to a class');
        }
        
        const result = await pool.query('DELETE FROM teachers WHERE id = $1 RETURNING id', [id]);
        
        return result.rows.length > 0;
    }
    
    // Reset teacher password
    async resetPassword(id) {
        const teacher = await this.getTeacherById(id);
        if (!teacher) {
            throw new Error('Teacher not found');
        }
        
        const newPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await pool.query(`
            UPDATE users 
            SET password = $1
            WHERE email = $2 AND role = 'teacher'
        `, [hashedPassword, teacher.email]);
        
        const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
        
        console.log('\n=========================================');
        console.log('🔐 TEACHER PASSWORD RESET');
        console.log('=========================================');
        console.log(`👤 Name: ${teacher.first_name} ${teacher.last_name}`);
        console.log(`🔐 School Email: ${teacher.email}`);
        console.log(`🔑 New Temporary Password: ${newPassword}`);
        console.log('=========================================\n');
        
        return {
            school_email: teacher.email,
            temporary_password: newPassword
        };
    }
    
    // Get teacher statistics
    async getTeacherStatistics() {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_teachers,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_teachers,
                COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_teachers,
                COUNT(CASE WHEN status = 'On Leave' THEN 1 END) as on_leave_teachers,
                COUNT(DISTINCT department) as total_departments,
                ROUND(AVG(years_of_experience), 1) as avg_experience,
                COUNT(CASE WHEN qualification IS NOT NULL THEN 1 END) as teachers_with_qualification,
                COUNT(CASE WHEN ghana_card_number IS NOT NULL THEN 1 END) as teachers_with_ghana_card
            FROM teachers
        `);
        
        return result.rows[0];
    }
    
    // Get teachers by department
    async getTeachersByDepartment(department) {
        const result = await pool.query(`
            SELECT 
                id, teacher_code, first_name, last_name, email, phone, department, qualification, 
                ghana_card_number, ssn, religion, status
            FROM teachers 
            WHERE department = $1
            ORDER BY last_name
        `, [department]);
        
        return result.rows;
    }
    
    // Get all unique departments
    async getDepartments() {
        const result = await pool.query(`
            SELECT DISTINCT department 
            FROM teachers 
            WHERE department IS NOT NULL 
            ORDER BY department
        `);
        
        return result.rows.map(row => row.department);
    }
}

module.exports = new TeacherModel();