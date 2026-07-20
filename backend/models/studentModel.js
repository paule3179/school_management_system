// backend/models/StudentModel.js
const pool = require('../config/database');

class StudentModel {
    // Get all students - FIXED: c.class_name instead of c.name
    async getAllStudents(filters = {}) {
        let query = `
            SELECT 
                s.id, s.admission_number,
                s.first_name, s.last_name,
                s.date_of_birth, s.gender,
                s.class_id, s.parent_name, s.parent_phone, s.parent_email,
                s.address, s.enrollment_date, s.status,
                s.emergency_contact_name, s.emergency_contact_phone, s.emergency_contact_relationship,
                s.blood_group, s.allergies, s.medical_conditions,
                c.class_name as class_name
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE 1=1
        `;
        
        const values = [];
        let paramCount = 1;
        
        if (filters.class_id) {
            query += ` AND s.class_id = $${paramCount}`;
            values.push(filters.class_id);
            paramCount++;
        }
        if (filters.status) {
            query += ` AND s.status = $${paramCount}`;
            values.push(filters.status);
            paramCount++;
        }
        if (filters.gender) {
            query += ` AND s.gender = $${paramCount}`;
            values.push(filters.gender);
            paramCount++;
        }
        if (filters.search) {
            query += ` AND (s.first_name ILIKE $${paramCount} OR s.last_name ILIKE $${paramCount} OR s.admission_number ILIKE $${paramCount} OR s.parent_name ILIKE $${paramCount} OR s.parent_phone ILIKE $${paramCount})`;
            values.push(`%${filters.search}%`);
            paramCount++;
        }
        
        query += ` ORDER BY s.last_name`;
        
        const result = await pool.query(query, values);
        return result.rows;
    }
    
    // Get student by ID - FIXED: c.class_name instead of c.name
    async getStudentById(id) {
        const result = await pool.query(`
            SELECT 
                s.id, s.admission_number,
                s.first_name, s.last_name,
                s.date_of_birth, s.gender,
                s.class_id, s.parent_name, s.parent_phone, s.parent_email,
                s.address, s.enrollment_date, s.status,
                s.emergency_contact_name, s.emergency_contact_phone, s.emergency_contact_relationship,
                s.blood_group, s.allergies, s.medical_conditions,
                c.class_name as class_name
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.id = $1
        `, [id]);
        
        return result.rows[0] || null;
    }
    
    // Get student by admission number
    async getStudentByAdmissionNumber(admissionNumber) {
        const result = await pool.query(`
            SELECT * FROM students WHERE admission_number = $1
        `, [admissionNumber]);
        
        return result.rows[0] || null;
    }
    
    // Create new student
    async createStudent(studentData) {
        const {
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
            medical_conditions
        } = studentData;
        
        const result = await pool.query(`
            INSERT INTO students (
                admission_number, first_name, last_name,
                date_of_birth, gender, class_id, parent_name,
                parent_phone, parent_email, address, enrollment_date,
                status, emergency_contact_name, emergency_contact_phone,
                emergency_contact_relationship, blood_group, allergies,
                medical_conditions
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *
        `, [
            admission_number, first_name, last_name,
            date_of_birth, gender, class_id || null, parent_name || null,
            parent_phone || null, parent_email || null, address || null,
            enrollment_date || new Date(), status || 'Active',
            emergency_contact_name || null, emergency_contact_phone || null,
            emergency_contact_relationship || null, blood_group || null,
            allergies || null, medical_conditions || null
        ]);
        
        return result.rows[0];
    }
    
    // Update student
    async updateStudent(id, updateData) {
        const updates = [];
        const values = [];
        let paramCount = 1;
        
        const allowedFields = [
            'first_name', 'last_name', 'date_of_birth', 'gender',
            'class_id', 'parent_name', 'parent_phone', 'parent_email',
            'address', 'enrollment_date', 'status',
            'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relationship', 'blood_group', 'allergies',
            'medical_conditions'
        ];
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = $${paramCount++}`);
                values.push(updateData[field] || null);
            }
        }
        
        if (updates.length === 0) {
            return null;
        }
        
        updates.push(`updated_at = NOW()`);
        values.push(id);
        
        const query = `
            UPDATE students 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;
        
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    }
    
    // Delete student (soft delete)
    async deleteStudent(id) {
        const result = await pool.query(`
            UPDATE students 
            SET status = 'Inactive', updated_at = NOW()
            WHERE id = $1 
            RETURNING id
        `, [id]);
        
        console.log(`✅ Student with ID ${id} has been deactivated`);
        return result.rows.length > 0;
    }
    
    // Get students by class - FIXED: c.class_name instead of c.name
    async getStudentsByClass(classId) {
        const result = await pool.query(`
            SELECT 
                s.id, s.admission_number,
                s.first_name, s.last_name, s.gender,
                s.parent_name, s.parent_phone, s.status,
                c.class_name as class_name
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.class_id = $1 AND s.status = 'Active'
            ORDER BY s.last_name
        `, [classId]);
        
        return result.rows;
    }
    
    // Search students - FIXED: c.class_name instead of c.name
    async searchStudents(keyword) {
        const result = await pool.query(`
            SELECT 
                s.id, s.admission_number,
                s.first_name, s.last_name, s.gender,
                s.parent_name, s.parent_phone, s.status,
                c.class_name as class_name
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.first_name ILIKE $1 
               OR s.last_name ILIKE $1 
               OR s.admission_number ILIKE $1
               OR s.parent_name ILIKE $1
               OR s.parent_phone ILIKE $1
            ORDER BY s.last_name
        `, [`%${keyword}%`]);
        
        return result.rows;
    }
    
    // Get student statistics - FIXED: removed c.name reference
    async getStudentStatistics() {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_students,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_students,
                COUNT(CASE WHEN status = 'anactive' THEN 1 END) as inactive_students,
                COUNT(DISTINCT class_id) as total_classes,
                COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_students,
                COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_students
            FROM students
        `);
        
        return result.rows[0];
    }
    
    // Bulk promote students
    async promoteStudents(studentIds, newClassId) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            const placeholders = studentIds.map((_, i) => `$${i + 1}`).join(',');
            
            const result = await client.query(`
                UPDATE students 
                SET class_id = $${studentIds.length + 1}, 
                    updated_at = NOW()
                WHERE id IN (${placeholders})
                RETURNING id, first_name, last_name
            `, [...studentIds, newClassId]);
            
            await client.query('COMMIT');
            
            return {
                success: true,
                count: result.rowCount,
                students: result.rows
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    // Bulk delete students
    async bulkDeleteStudents(studentIds) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            const placeholders = studentIds.map((_, i) => `$${i + 1}`).join(',');
            
            const result = await client.query(`
                UPDATE students 
                SET status = 'Inactive', updated_at = NOW()
                WHERE id IN (${placeholders})
                RETURNING id, first_name, last_name
            `, studentIds);
            
            await client.query('COMMIT');
            
            return {
                success: true,
                count: result.rowCount,
                students: result.rows
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    // Get students by parent email (for parent login) - FIXED: c.class_name instead of c.name
    async getStudentsByParentEmail(email) {
        const result = await pool.query(`
            SELECT 
                s.id, s.admission_number,
                s.first_name, s.last_name, s.gender,
                s.class_id, s.status,
                c.class_name as class_name
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.parent_email = $1 AND s.status = 'Active'
            ORDER BY s.first_name
        `, [email]);
        
        return result.rows;
    }
}

module.exports = new StudentModel();