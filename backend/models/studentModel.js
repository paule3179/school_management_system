const pool = require('../config/database');

class StudentModel {
  // Get all students
  async getAllStudents(filters = {}) {
    let query = `
      SELECT s.*, c.name as class_name 
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.status = 'active'
    `;
    const values = [];
    let paramCount = 1;
    
    if (filters.class_id) {
      query += ` AND s.class_id = $${paramCount}`;
      values.push(filters.class_id);
      paramCount++;
    }
    if (filters.level) {
      query += ` AND s.level = $${paramCount}`;
      values.push(filters.level);
      paramCount++;
    }
    
    query += ` ORDER BY s.last_name`;
    
    const result = await pool.query(query, values);
    return result.rows;
  }// Get all students
async getAllStudents(filters = {}) {
  let query = `
    SELECT 
      s.*,
      c.name as class_name,
      p.first_name as parent_first_name,
      p.last_name as parent_last_name,
      p.phone as parent_phone
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN parents p ON s.parent_id = p.id
    WHERE s.status = 'active'
  `;
  const values = [];
  let paramCount = 1;
  
  if (filters.class_id) {
    query += ` AND s.class_id = $${paramCount}`;
    values.push(filters.class_id);
    paramCount++;
  }
  if (filters.level) {
    query += ` AND s.level = $${paramCount}`;
    values.push(filters.level);
    paramCount++;
  }
  
  query += ` ORDER BY s.last_name`;
  
  const result = await pool.query(query, values);
  
  // Format the response to include parent_name
  return result.rows.map(row => ({
    ...row,
    parent_name: row.parent_first_name && row.parent_last_name 
      ? `${row.parent_first_name} ${row.parent_last_name}` 
      : null,
    parent_phone: row.parent_phone || null
  }));
}
  
  // Get student by ID
  async getStudentById(id) {
    const result = await pool.query(`
      SELECT s.*, c.name as class_name 
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = $1 AND s.status = 'active'
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    // Get grades for this student
    const grades = await pool.query(`
      SELECT * FROM grades WHERE student_id = $1
    `, [id]);
    
    // Get attendance for this student
    const attendance = await pool.query(`
      SELECT * FROM attendance WHERE student_id = $1
    `, [id]);
    
    return {
      ...result.rows[0],
      grades: grades.rows,
      attendance: attendance.rows
    };
  }
  
  // Create new student
  async createStudent(studentData) {
    // Generate admission number
    const year = new Date().getFullYear();
    const countResult = await pool.query('SELECT COUNT(*) FROM students');
    const count = parseInt(countResult.rows[0].count) + 1;
    const admission_number = `${year}-${String(count).padStart(3, '0')}`;
    
    const result = await pool.query(`
      INSERT INTO students (
        admission_number, first_name, last_name, date_of_birth, 
        gender, class_id, level, parent_name, parent_phone, address, enrollment_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      admission_number,
      studentData.first_name,
      studentData.last_name,
      studentData.date_of_birth,
      studentData.gender,
      studentData.class_id,
      studentData.level,
      studentData.parent_name,
      studentData.parent_phone,
      studentData.address,
      studentData.enrollment_date || new Date().toISOString().split('T')[0]
    ]);
    
    return result.rows[0];
  }
  
  // Update student
  async updateStudent(id, updateData) {
    const result = await pool.query(`
      UPDATE students 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          class_id = COALESCE($3, class_id),
          parent_name = COALESCE($4, parent_name),
          parent_phone = COALESCE($5, parent_phone),
          address = COALESCE($6, address)
      WHERE id = $7 AND status = 'active'
      RETURNING *
    `, [
      updateData.first_name,
      updateData.last_name,
      updateData.class_id,
      updateData.parent_name,
      updateData.parent_phone,
      updateData.address,
      id
    ]);
    
    return result.rows[0] || null;
  }
  
  // Delete student (soft delete)
  async deleteStudent(id) {
    const result = await pool.query(`
      UPDATE students SET status = 'inactive' WHERE id = $1 RETURNING *
    `, [id]);
    
    return result.rows.length > 0;
  }
  
  // Search students
  async searchStudents(keyword) {
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
  }
  
  // Get students by class
  async getStudentsByClass(classId) {
    const result = await pool.query(`
      SELECT s.*, c.name as class_name 
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.class_id = $1 AND s.status = 'active'
      ORDER BY s.last_name
    `, [classId]);
    
    return result.rows;
  }
}

module.exports = new StudentModel();