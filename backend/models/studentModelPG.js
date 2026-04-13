const pool = require('../config/database');

class StudentModel {
  // Get all students
  async getAllStudents() {
    try {
      const result = await pool.query(`
        SELECT s.*, c.name as class_name 
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.status = 'active'
        ORDER BY s.last_name
      `);
      return result.rows;
    } catch (error) {
      console.error('Error in getAllStudents:', error);
      return [];
    }
  }
  
  // Get student by ID
  async getStudentById(id) {
    try {
      const result = await pool.query(`
        SELECT s.*, c.name as class_name 
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.id = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error in getStudentById:', error);
      return null;
    }
  }
  
  // Create new student
  async createStudent(studentData) {
    try {
      // Generate admission number
      const year = new Date().getFullYear();
      const countResult = await pool.query('SELECT COUNT(*) FROM students');
      const count = parseInt(countResult.rows[0].count) + 1;
      const admission_number = `${year}-${String(count).padStart(3, '0')}`;
      
      const query = `
        INSERT INTO students (
          admission_number, first_name, last_name, date_of_birth, 
          gender, class_id, level, parent_name, parent_phone, address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        admission_number,
        studentData.first_name,
        studentData.last_name,
        studentData.date_of_birth,
        studentData.gender,
        studentData.class_id,
        studentData.level,
        studentData.parent_name || null,
        studentData.parent_phone || null,
        studentData.address || null
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in createStudent:', error);
      throw new Error('Failed to create student: ' + error.message);
    }
  }
  
  // Update student
  async updateStudent(id, updateData) {
    try {
      const query = `
        UPDATE students 
        SET first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            class_id = COALESCE($3, class_id),
            parent_name = COALESCE($4, parent_name),
            parent_phone = COALESCE($5, parent_phone),
            address = COALESCE($6, address)
        WHERE id = $7
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        updateData.first_name,
        updateData.last_name,
        updateData.class_id,
        updateData.parent_name,
        updateData.parent_phone,
        updateData.address,
        id
      ]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error in updateStudent:', error);
      throw new Error('Failed to update student: ' + error.message);
    }
  }
  
  // Delete student (soft delete)
  async deleteStudent(id) {
    try {
      const result = await pool.query(`
        UPDATE students SET status = 'inactive' WHERE id = $1 RETURNING *
      `, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in deleteStudent:', error);
      return false;
    }
  }
  
  // Search students
  async searchStudents(keyword) {
    try {
      const result = await pool.query(`
        SELECT s.*, c.name as class_name 
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE (s.first_name ILIKE $1 
           OR s.last_name ILIKE $1 
           OR s.admission_number ILIKE $1)
        AND s.status = 'active'
        ORDER BY s.last_name
      `, [`%${keyword}%`]);
      return result.rows;
    } catch (error) {
      console.error('Error in searchStudents:', error);
      return [];
    }
  }
  
  // Get students by class
  async getStudentsByClass(classId) {
    try {
      const result = await pool.query(`
        SELECT s.*, c.name as class_name 
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.class_id = $1 AND s.status = 'active'
        ORDER BY s.last_name
      `, [classId]);
      return result.rows;
    } catch (error) {
      console.error('Error in getStudentsByClass:', error);
      return [];
    }
  }
}

module.exports = new StudentModel();