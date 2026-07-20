// backend/models/classModel.js
const pool = require('../config/database');

const classModel = {
  // Get all classes with optional filters
  async getAllClasses(filters = {}) {
    let query = `
      SELECT c.*, 
             COUNT(DISTINCT s.id) as student_count,
             COUNT(DISTINCT cs.subject_id) as subject_count
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
      LEFT JOIN class_subjects cs ON cs.class_id = c.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;
    
    if (filters.level) {
      query += ` AND c.level = $${paramCount++}`;
      values.push(filters.level);
    }
    
    if (filters.academic_year) {
      query += ` AND c.academic_year = $${paramCount++}`;
      values.push(filters.academic_year);
    }
    
    if (filters.status) {
      query += ` AND c.status = $${paramCount++}`;
      values.push(filters.status);
    }
    
if (filters.search) {
      query += ` AND (c.class_name ILIKE $${paramCount++} OR c.class_code ILIKE $${paramCount++})`;
      values.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    
    query += ` GROUP BY c.id ORDER BY c.class_name ASC`;
    
    const result = await pool.query(query, values);
    return result.rows;
  },
  
  // Create new class
  async createClass(data) {
    const { 
      class_name, level, capacity, room_number, academic_year
    } = data;
    
    const query = `
      INSERT INTO classes (class_name, level, capacity, room_number, academic_year, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [
      class_name, 
      level, 
      capacity || 30, 
      room_number || null, 
      academic_year || '2024-2025'
    ]);
    return result.rows[0];
  },
  
// Update class
  async updateClass(id, data) {
    const { class_name, level, capacity, room_number, academic_year } = data;
    
    const query = `
      UPDATE classes 
      SET class_name = COALESCE($1, class_name),
          level = COALESCE($2, level),
          capacity = COALESCE($3, capacity),
          room_number = COALESCE($4, room_number),
          academic_year = COALESCE($5, academic_year),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;
    const result = await pool.query(query, [
      class_name, level, capacity, room_number, academic_year, id
    ]);
    return result.rows[0];
  },
  
  // Delete class
  async deleteClass(id) {
    // Check if students are enrolled
    const studentCheck = await pool.query(
      'SELECT COUNT(*) FROM students WHERE class_id = $1 AND status = $2',
      [id, 'active']
    );
    
    if (parseInt(studentCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete class with enrolled students. Reassign students first.');
    }
    
    // Delete the class
    const query = 'DELETE FROM classes WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows.length > 0;
  },
  
  // ============================================
  // CLASS SUBJECTS MANAGEMENT
  // ============================================
  
  // Get subjects for a specific class
  async getClassSubjects(classId) {
    const query = `
      SELECT 
        cs.id,
        cs.class_id,
        cs.subject_id,
        cs.hours_per_week,
        cs.teacher_id,
        cs.priority,
        s.name as subject_name,
        s.code as subject_code,
        s.description as subject_description
      FROM class_subjects cs
      LEFT JOIN subjects s ON cs.subject_id = s.id
      WHERE cs.class_id = $1
      ORDER BY cs.priority DESC, s.name ASC
    `;
    const result = await pool.query(query, [classId]);
    return result.rows;
  },
  
  // Add subject to class
  async addSubjectToClass(classId, data) {
    const { subject_id, hours_per_week, teacher_id, priority } = data;
    
    // Check if already exists
    const existing = await pool.query(
      'SELECT id FROM class_subjects WHERE class_id = $1 AND subject_id = $2',
      [classId, subject_id]
    );
    
    if (existing.rows.length > 0) {
      throw new Error('Subject already assigned to this class');
    }
    
    const query = `
      INSERT INTO class_subjects (class_id, subject_id, hours_per_week, teacher_id, priority)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      classId, 
      subject_id, 
      hours_per_week || 3, 
      teacher_id || null, 
      priority || 1
    ]);
    return result.rows[0];
  },
  
  // Update class subject
  async updateClassSubject(id, data) {
    const { hours_per_week, teacher_id, priority } = data;
    
    const query = `
      UPDATE class_subjects 
      SET hours_per_week = COALESCE($1, hours_per_week),
          teacher_id = COALESCE($2, teacher_id),
          priority = COALESCE($3, priority),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    const result = await pool.query(query, [hours_per_week, teacher_id, priority, id]);
    return result.rows[0];
  },
  
  // Remove subject from class
  async removeSubjectFromClass(id) {
    const query = 'DELETE FROM class_subjects WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows.length > 0;
  },
  
  // ============================================
  // ADDITIONAL HELPER METHODS
  // ============================================
  
  // Get class levels
  async getLevels() {
    const result = await pool.query(`
      SELECT DISTINCT level 
      FROM classes 
      ORDER BY level
    `);
    return result.rows.map(row => row.level);
  },
  
  // Get class statistics
  async getClassStatistics() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_classes,
        SUM(capacity) as total_capacity,
        (SELECT COUNT(*) FROM students WHERE status = 'active') as total_students
      FROM classes
    `);
    return result.rows[0];
  },
// Get single class by ID (overridden with gender counts)
  async getClassById(id) {
    const query = `
      SELECT c.*, 
             COUNT(DISTINCT s.id) as student_count,
             COUNT(DISTINCT cs.subject_id) as subject_count,
             COUNT(CASE WHEN s.gender = 'M' THEN 1 END) as male_count,
             COUNT(CASE WHEN s.gender = 'F' THEN 1 END) as female_count
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
      LEFT JOIN class_subjects cs ON cs.class_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },
  
  // Get students in a class
  async getClassStudents(classId) {
    const result = await pool.query(`
      SELECT 
        s.id, s.admission_number, s.first_name, s.last_name,
        s.gender, s.parent_name, s.parent_phone, s.status
      FROM students s
      WHERE s.class_id = $1 AND s.status = 'active'
      ORDER BY s.last_name
    `, [classId]);
    return result.rows;
  }

};

module.exports = classModel;