const pool = require('../config/database');

class StudentModel {
  // Get all students
  async getAllStudents(filters = {}) {
  let query = `
    SELECT 
      s.id,
      s.admission_number,
      s.first_name,
      s.last_name,
      s.date_of_birth,
      s.gender,
      s.class_id,
      s.level,
      s.address,
      s.enrollment_date,
      s.status,
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
  
  // Format parent_name from first and last name
  return result.rows.map(row => ({
    id: row.id,
    admission_number: row.admission_number,
    first_name: row.first_name,
    last_name: row.last_name,
    date_of_birth: row.date_of_birth,
    gender: row.gender,
    class_id: row.class_id,
    class_name: row.class_name,
    level: row.level,
    address: row.address,
    enrollment_date: row.enrollment_date,
    status: row.status,
    parent_name: row.parent_first_name && row.parent_last_name 
      ? `${row.parent_first_name} ${row.parent_last_name}` 
      : null,
    parent_phone: row.parent_phone || null
  }));
}
  
  // Get student by ID
  async getStudentById(id) {
    const result = await pool.query(`
      SELECT 
        s.*,
        c.name as class_name,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name,
        p.phone as parent_phone
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.id = $1 AND s.status = 'active'
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    const student = {
      ...row,
      parent_name: row.parent_first_name && row.parent_last_name 
        ? `${row.parent_first_name} ${row.parent_last_name}` 
        : null,
      parent_phone: row.parent_phone || null
    };
    
    // Get grades for this student
    const grades = await pool.query(`
      SELECT * FROM grades WHERE student_id = $1
    `, [id]);
    
    // Get attendance for this student
    const attendance = await pool.query(`
      SELECT * FROM attendance WHERE student_id = $1
    `, [id]);
    
    return {
      ...student,
      grades: grades.rows,
      attendance: attendance.rows
    };
  }
  
  // Create new student
async createStudent(studentData) {
  console.log('=== CREATING STUDENT WITH PARENT ===');
  console.log('Parent Name:', studentData.parent_name);
  console.log('Parent Phone:', studentData.parent_phone);
  
  // Generate admission number
  const year = new Date().getFullYear();
  const countResult = await pool.query('SELECT COUNT(*) FROM students');
  const count = parseInt(countResult.rows[0].count) + 1;
  const admission_number = `${year}-${String(count).padStart(3, '0')}`;
  
  let parentId = null;
  
  // Create parent record if parent name is provided
  if (studentData.parent_name && studentData.parent_name.trim() !== '') {
    const nameParts = studentData.parent_name.trim().split(' ');
    const parentFirstName = nameParts[0];
    const parentLastName = nameParts.slice(1).join(' ') || '';
    const parentPhone = studentData.parent_phone || '';
    
    const parentResult = await pool.query(`
      INSERT INTO parents (first_name, last_name, phone)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [parentFirstName, parentLastName, parentPhone]);
    
    parentId = parentResult.rows[0].id;
    console.log('Parent created with ID:', parentId);
  }
  
  // Insert student
  const result = await pool.query(`
    INSERT INTO students (
      admission_number, first_name, last_name, date_of_birth, 
      gender, class_id, level, parent_id, address, enrollment_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE)
    RETURNING *
  `, [
    admission_number,
    studentData.first_name,
    studentData.last_name,
    studentData.date_of_birth,
    studentData.gender,
    studentData.class_id,
    studentData.level,
    parentId,
    studentData.address || null
  ]);
  
  const newStudent = result.rows[0];
  console.log('Student created:', newStudent);
  
  // Return the student with parent info
  return {
    ...newStudent,
    parent_name: studentData.parent_name || null,
    parent_phone: studentData.parent_phone || null
  };
}
  
  // Update student
  async updateStudent(id, updateData) {
    // Get current student to check parent
    const currentStudent = await pool.query('SELECT parent_id FROM students WHERE id = $1', [id]);
    
    let parentId = currentStudent.rows[0]?.parent_id;
    
    // If parent name is provided, update or create parent
    if (updateData.parent_name && updateData.parent_name.trim() !== '') {
      const nameParts = updateData.parent_name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';
      
      if (parentId) {
        // Update existing parent
        await pool.query(`
          UPDATE parents 
          SET first_name = $1, last_name = $2, phone = $3
          WHERE id = $4
        `, [firstName, lastName, updateData.parent_phone, parentId]);
      } else {
        // Create new parent
        const parentResult = await pool.query(`
          INSERT INTO parents (first_name, last_name, phone)
          VALUES ($1, $2, $3)
          RETURNING id
        `, [firstName, lastName, updateData.parent_phone]);
        parentId = parentResult.rows[0].id;
      }
    }
    
    const result = await pool.query(`
      UPDATE students 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          date_of_birth = COALESCE($3, date_of_birth),
          gender = COALESCE($4, gender),
          class_id = COALESCE($5, class_id),
          level = COALESCE($6, level),
          parent_id = COALESCE($7, parent_id),
          address = COALESCE($8, address)
      WHERE id = $9 AND status = 'active'
      RETURNING *
    `, [
      updateData.first_name,
      updateData.last_name,
      updateData.date_of_birth,
      updateData.gender,
      updateData.class_id,
      updateData.level,
      parentId,
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
      SELECT 
        s.*,
        c.name as class_name,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name,
        p.phone as parent_phone
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE (s.first_name ILIKE $1 
         OR s.last_name ILIKE $1 
         OR s.admission_number ILIKE $1)
      AND s.status = 'active'
      ORDER BY s.last_name
    `, [`%${keyword}%`]);
    
    return result.rows.map(row => ({
      ...row,
      parent_name: row.parent_first_name && row.parent_last_name 
        ? `${row.parent_first_name} ${row.parent_last_name}` 
        : null,
      parent_phone: row.parent_phone || null
    }));
  }
  
  // Get students by class
  async getStudentsByClass(classId) {
    const result = await pool.query(`
      SELECT 
        s.*,
        c.name as class_name,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name,
        p.phone as parent_phone
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.class_id = $1 AND s.status = 'active'
      ORDER BY s.last_name
    `, [classId]);
    
    return result.rows.map(row => ({
      ...row,
      parent_name: row.parent_first_name && row.parent_last_name 
        ? `${row.parent_first_name} ${row.parent_last_name}` 
        : null,
      parent_phone: row.parent_phone || null
    }));
  }
}

module.exports = new StudentModel();