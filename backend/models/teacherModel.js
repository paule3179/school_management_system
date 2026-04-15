const pool = require('../config/database');

class TeacherModel {
  // Get all teachers
  async getAllTeachers(filters = {}) {
    let query = `
      SELECT 
        t.id,
        t.teacher_code,
        t.first_name,
        t.last_name,
        t.subject_specialty,
        t.phone,
        t.email,
        t.employment_date,
        t.status,
        c.name as assigned_class,
        c.id as class_id
      FROM teachers t
      LEFT JOIN classes c ON t.id = c.teacher_id
      WHERE t.status = 'active'
    `;
    
    const values = [];
    let paramCount = 1;
    
    if (filters.subject) {
      query += ` AND t.subject_specialty = $${paramCount}`;
      values.push(filters.subject);
      paramCount++;
    }
    if (filters.status) {
      query += ` AND t.status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }
    
    query += ` ORDER BY t.last_name`;
    
    const result = await pool.query(query, values);
    return result.rows;
  }
  
  // Get teacher by ID
  async getTeacherById(id) {
    const result = await pool.query(`
      SELECT 
        t.*,
        c.name as assigned_class,
        c.id as class_id,
        COUNT(DISTINCT s.id) as student_count
      FROM teachers t
      LEFT JOIN classes c ON t.id = c.teacher_id
      LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
      WHERE t.id = $1 AND t.status = 'active'
      GROUP BY t.id, c.id, c.name
    `, [id]);
    
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }
  
  // Create new teacher
  async createTeacher(teacherData) {
    // Generate teacher code
    const countResult = await pool.query('SELECT COUNT(*) FROM teachers');
    const count = parseInt(countResult.rows[0].count) + 1;
    const teacher_code = `TCH${String(count).padStart(3, '0')}`;
    
    const result = await pool.query(`
      INSERT INTO teachers (
        teacher_code, first_name, last_name, subject_specialty, 
        phone, email, employment_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      teacher_code,
      teacherData.first_name,
      teacherData.last_name,
      teacherData.subject_specialty,
      teacherData.phone,
      teacherData.email,
      teacherData.employment_date || new Date().toISOString().split('T')[0],
      'active'
    ]);
    
    return result.rows[0];
  }
  
  // Update teacher
  async updateTeacher(id, updateData) {
    const result = await pool.query(`
      UPDATE teachers 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          subject_specialty = COALESCE($3, subject_specialty),
          phone = COALESCE($4, phone),
          email = COALESCE($5, email),
          status = COALESCE($6, status)
      WHERE id = $7 AND status = 'active'
      RETURNING *
    `, [
      updateData.first_name,
      updateData.last_name,
      updateData.subject_specialty,
      updateData.phone,
      updateData.email,
      updateData.status,
      id
    ]);
    
    return result.rows[0] || null;
  }
  
  // Delete teacher (soft delete)
  async deleteTeacher(id) {
    // Check if teacher has assigned class
    const classCheck = await pool.query('SELECT id FROM classes WHERE teacher_id = $1', [id]);
    if (classCheck.rows.length > 0) {
      throw new Error('Cannot delete teacher assigned to a class');
    }
    
    const result = await pool.query(`
      UPDATE teachers SET status = 'inactive' WHERE id = $1 RETURNING *
    `, [id]);
    
    return result.rows.length > 0;
  }
  
  // Assign teacher to class
  async assignToClass(teacherId, classId) {
    const result = await pool.query(`
      UPDATE classes 
      SET teacher_id = $1 
      WHERE id = $2 
      RETURNING *
    `, [teacherId, classId]);
    
    return result.rows[0] || null;
  }
  
  // Get teacher's schedule
  async getTeacherSchedule(teacherId) {
    const result = await pool.query(`
      SELECT 
        t.id as teacher_id,
        t.first_name,
        t.last_name,
        c.name as class_name,
        c.level,
        c.classroom
      FROM teachers t
      LEFT JOIN classes c ON t.id = c.teacher_id
      WHERE t.id = $1
    `, [teacherId]);
    
    return result.rows[0];
  }
}

module.exports = new TeacherModel();