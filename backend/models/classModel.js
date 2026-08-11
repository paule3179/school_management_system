// backend/models/classModel.js
const pool = require('../config/database');

const classModel = {
  // ============================================================
  // GET ALL CLASSES with student counts from student_classes
  // ============================================================
  async getAllClasses(filters = {}) {
    let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT sc.student_id) AS student_count,
        COUNT(DISTINCT cs.subject_id) AS subject_count
      FROM classes c
      LEFT JOIN student_classes sc ON c.id = sc.class_id AND sc.is_active = true
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
      query += ` AND sc.academic_year = $${paramCount++}`;
      values.push(filters.academic_year);
    }

    if (filters.term) {
      query += ` AND sc.term = $${paramCount++}`;
      values.push(filters.term);
    }

    if (filters.status) {
      query += ` AND c.status = $${paramCount++}`;
      values.push(filters.status);
    }

    if (filters.search) {
      query += ` AND (c.name ILIKE $${paramCount++} OR c.class_code ILIKE $${paramCount++})`;
      values.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ` GROUP BY c.id ORDER BY c.level, c.name ASC`;

    const result = await pool.query(query, values);
    return result.rows;
  },

  // ============================================================
  // GET CLASS BY ID with student counts from student_classes
  // ============================================================
  async getClassById(id) {
    const query = `
      SELECT 
        c.*,
        COUNT(DISTINCT sc.student_id) AS student_count,
        COUNT(DISTINCT cs.subject_id) AS subject_count,
        COUNT(DISTINCT CASE WHEN s.gender = 'M' THEN s.id END) AS male_count,
        COUNT(DISTINCT CASE WHEN s.gender = 'F' THEN s.id END) AS female_count
      FROM classes c
      LEFT JOIN student_classes sc ON c.id = sc.class_id AND sc.is_active = true
      LEFT JOIN students s ON sc.student_id = s.id
      LEFT JOIN class_subjects cs ON cs.class_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // ============================================================
  // CREATE NEW CLASS
  // ============================================================
  async createClass(data) {
    const {
      name,
      level,
      capacity,
      room_number,
      academic_year,
      class_code,
      description
    } = data;

    const query = `
      INSERT INTO classes (name, level, capacity, room_number, academic_year, class_code, description, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [
      name,
      level,
      capacity || 30,
      room_number || null,
      academic_year || '2025-2026',
      class_code || null,
      description || null
    ]);
    return result.rows[0];
  },

  // ============================================================
  // UPDATE CLASS
  // ============================================================
  async updateClass(id, data) {
    const { name, level, capacity, room_number, academic_year, class_code, description } = data;

    const query = `
      UPDATE classes 
      SET name = COALESCE($1, name),
          level = COALESCE($2, level),
          capacity = COALESCE($3, capacity),
          room_number = COALESCE($4, room_number),
          academic_year = COALESCE($5, academic_year),
          class_code = COALESCE($6, class_code),
          description = COALESCE($7, description),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;
    const result = await pool.query(query, [
      name, level, capacity, room_number, academic_year, class_code, description, id
    ]);
    return result.rows[0];
  },

  // ============================================================
  // DELETE CLASS – checks for active enrollments first
  // ============================================================
  async deleteClass(id) {
    // Check if students are actively enrolled
    const studentCheck = await pool.query(
      `SELECT COUNT(*) FROM student_classes WHERE class_id = $1 AND is_active = true`,
      [id]
    );

    if (parseInt(studentCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete class with actively enrolled students. Reassign or promote students first.');
    }

    // Delete the class
    const query = 'DELETE FROM classes WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows.length > 0;
  },

  // ============================================================
  // GET STUDENTS IN A CLASS (active enrollments only)
  // ============================================================
  async getClassStudents(classId, academicYear = null, term = null) {
    let query = `
      SELECT 
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        s.parent_name,
        s.parent_phone,
        s.status,
        sc.academic_year,
        sc.term,
        sc.enrolled_date
      FROM student_classes sc
      JOIN students s ON sc.student_id = s.id
      WHERE sc.class_id = $1 AND sc.is_active = true
    `;
    const params = [classId];
    let paramCount = 2;

    if (academic_year) {
      query += ` AND sc.academic_year = $${paramCount++}`;
      params.push(academic_year);
    }
    if (term) {
      query += ` AND sc.term = $${paramCount++}`;
      params.push(term);
    }

    query += ` ORDER BY s.last_name, s.first_name`;

    const result = await pool.query(query, params);
    return result.rows;
  },

  // ============================================================
  // GET CLASS SUBJECTS (unchanged – works with class_subjects)
  // ============================================================
  async getClassSubjects(classId) {
    const query = `
      SELECT 
        cs.id,
        cs.class_id,
        cs.subject_id,
        cs.hours_per_week,
        cs.teacher_id,
        cs.priority,
        s.name AS subject_name,
        s.code AS subject_code,
        s.description AS subject_description
      FROM class_subjects cs
      LEFT JOIN subjects s ON cs.subject_id = s.id
      WHERE cs.class_id = $1
      ORDER BY cs.priority DESC, s.name ASC
    `;
    const result = await pool.query(query, [classId]);
    return result.rows;
  },

  // ============================================================
  // ADD SUBJECT TO CLASS (unchanged)
  // ============================================================
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

  // ============================================================
  // UPDATE CLASS SUBJECT (unchanged)
  // ============================================================
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

  // ============================================================
  // REMOVE SUBJECT FROM CLASS (unchanged)
  // ============================================================
  async removeSubjectFromClass(id) {
    const query = 'DELETE FROM class_subjects WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows.length > 0;
  },

  // ============================================================
  // GET CLASS LEVELS (unchanged)
  // ============================================================
  async getLevels() {
    const result = await pool.query(`
      SELECT DISTINCT level 
      FROM classes 
      ORDER BY level
    `);
    return result.rows.map(row => row.level);
  },

  // ============================================================
  // GET CLASS STATISTICS (updated for student_classes)
  // ============================================================
  async getClassStatistics(academicYear = null, term = null) {
    let query = `
      SELECT 
        COUNT(DISTINCT c.id) AS total_classes,
        SUM(c.capacity) AS total_capacity,
        COUNT(DISTINCT sc.student_id) AS total_students
      FROM classes c
      LEFT JOIN student_classes sc ON c.id = sc.class_id AND sc.is_active = true
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (academicYear) {
      query += ` AND sc.academic_year = $${paramCount++}`;
      params.push(academicYear);
    }
    if (term) {
      query += ` AND sc.term = $${paramCount++}`;
      params.push(term);
    }

    const result = await pool.query(query, params);
    return result.rows[0] || { total_classes: 0, total_capacity: 0, total_students: 0 };
  },

  // ============================================================
  // GET CLASS BY NAME (helper)
  // ============================================================
  async getClassByName(name) {
    const result = await pool.query(`
      SELECT * FROM classes WHERE name = $1
    `, [name]);
    return result.rows[0] || null;
  },

  // ============================================================
  // GET CLASS ENROLLMENT SUMMARY (by academic year and term)
  // ============================================================
  async getClassEnrollmentSummary(classId, academicYear = null, term = null) {
    let query = `
      SELECT 
        sc.academic_year,
        sc.term,
        COUNT(*) AS enrolled_count,
        COUNT(CASE WHEN sc.is_active THEN 1 END) AS active_count,
        COUNT(CASE WHEN NOT sc.is_active THEN 1 END) AS inactive_count
      FROM student_classes sc
      WHERE sc.class_id = $1
    `;
    const params = [classId];
    let paramCount = 2;

    if (academicYear) {
      query += ` AND sc.academic_year = $${paramCount++}`;
      params.push(academicYear);
    }
    if (term) {
      query += ` AND sc.term = $${paramCount++}`;
      params.push(term);
    }

    query += ` GROUP BY sc.academic_year, sc.term ORDER BY sc.academic_year DESC, sc.term DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }
};

module.exports = classModel;