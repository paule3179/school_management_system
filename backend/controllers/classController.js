// backend/controllers/classController.js
const pool = require('../config/database');

const classController = {};

// ============================================
// GET ALL CLASSES WITH SUBJECTS AND TEACHERS
// ============================================
classController.getAllClasses = async (req, res) => {
  try {
    console.log('📚 Fetching all classes...');
    
    const result = await pool.query(`
      SELECT 
        c.id,
        c.class_name,
        c.class_name as name,
        c.level,
        c.stream,
        c.section,
        c.grade_level,
        c.capacity,
        c.current_students,
        c.room_number,
        c.teacher_id,
        c.academic_year,
        c.term,
        c.gender_type,
        c.created_at,
        c.updated_at,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        t.email as teacher_email,
        (
          SELECT COUNT(*)
          FROM (
            SELECT student_id FROM student_classes sc WHERE sc.class_id = c.id AND sc.is_active = true
            UNION
            SELECT s.id FROM students s WHERE s.class_id = c.id AND s.status = 'Active'
          ) active_students
        ) as student_count,
        (
          SELECT json_agg(
            json_build_object(
              'subject_id', s.id,
              'subject_name', s.name,
              'subject_code', s.code,
              'teacher_id', cs.teacher_id,
              'teacher_name', CONCAT(t2.first_name, ' ', t2.last_name)
            )
          )
          FROM class_subjects cs
          JOIN subjects s ON cs.subject_id = s.id
          LEFT JOIN teachers t2 ON cs.teacher_id = t2.id
          WHERE cs.class_id = c.id
        ) as subjects
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE (c.is_archived = false OR c.is_archived IS NULL)
      ORDER BY c.class_name
    `);
    
    console.log(`✅ Found ${result.rows.length} classes`);
    
    const classes = result.rows.map(cls => ({
      ...cls,
      name: cls.class_name || cls.name || `Class ${cls.id}`,
      display_name: `${cls.class_name || `Class ${cls.id}`}${cls.stream ? ` (${cls.stream})` : ''}`,
      subjects: cls.subjects || []
    }));
    
    res.json({
      success: true,
      data: classes,
      count: classes.length
    });
    
  } catch (error) {
    console.error('❌ Error in getAllClasses:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET CLASS BY ID WITH SUBJECTS
// ============================================
classController.getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        c.*,
        c.class_name as name,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        t.email as teacher_email,
        (
          SELECT COUNT(*) 
          FROM students s 
          WHERE s.class_id = c.id 
          AND s.status = 'Active'
        ) as student_count,
        (
          SELECT json_agg(
            json_build_object(
              'subject_id', s.id,
              'subject_name', s.name,
              'subject_code', s.code,
              'hours_per_week', cs.hours_per_week,
              'periods_per_week', cs.periods_per_week,
              'teacher_id', cs.teacher_id,
              'teacher_name', CONCAT(t2.first_name, ' ', t2.last_name)
            )
          )
          FROM class_subjects cs
          JOIN subjects s ON cs.subject_id = s.id
          LEFT JOIN teachers t2 ON cs.teacher_id = t2.id
          WHERE cs.class_id = c.id
        ) as subjects
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }
    
    const classData = result.rows[0];
    classData.name = classData.class_name || `Class ${classData.id}`;
    classData.subjects = classData.subjects || [];
    
    res.json({
      success: true,
      data: classData
    });
    
  } catch (error) {
    console.error('Error in getClassById:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// CREATE CLASS
// ============================================
classController.createClass = async (req, res) => {
  try {
    const {
      class_name,
      level,
      stream,
      section,
      grade_level,
      capacity,
      current_students,
      room_number,
      teacher_id,
      academic_year,
      term,
      gender_type,
      subject_ids
    } = req.body;
    
    if (!class_name || !level) {
      return res.status(400).json({
        success: false,
        error: 'Class name and level are required'
      });
    }
    
    await pool.query('BEGIN');
    
    const existing = await pool.query(
      'SELECT id FROM classes WHERE class_name = $1 AND level = $2',
      [class_name, level]
    );
    
    if (existing.rows.length > 0) {
      await pool.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: 'A class with this name and level already exists'
      });
    }
    
    const result = await pool.query(`
      INSERT INTO classes (
        class_name,
        level,
        stream,
        section,
        grade_level,
        capacity,
        current_students,
        room_number,
        teacher_id,
        academic_year,
        term,
        gender_type,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `, [
      class_name,
      level,
      stream || null,
      section || null,
      grade_level || null,
      capacity || 40,
      current_students || 0,
      room_number || null,
      teacher_id || null,
      academic_year || '2024-2025',
      term || '1',
      gender_type || 'Mixed'
    ]);
    
    const newClass = result.rows[0];
    newClass.name = newClass.class_name;
    
    if (subject_ids && subject_ids.length > 0) {
      for (const subjectId of subject_ids) {
        const subjectCheck = await pool.query('SELECT id FROM subjects WHERE id = $1', [subjectId]);
        if (subjectCheck.rows.length > 0) {
          await pool.query(`
            INSERT INTO class_subjects (class_id, subject_id, hours_per_week, periods_per_week)
            VALUES ($1, $2, 4, 3)
            ON CONFLICT (class_id, subject_id) DO NOTHING
          `, [newClass.id, subjectId]);
        }
      }
      console.log(`📚 Assigned subjects to class ${newClass.class_name}`);
    }
    
    await pool.query('COMMIT');
    
    console.log(`✅ Class created: ${newClass.class_name} (ID: ${newClass.id})`);
    
    res.status(201).json({
      success: true,
      data: newClass,
      message: 'Class created successfully'
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error in createClass:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// UPDATE CLASS
// ============================================
classController.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      class_name,
      level,
      stream,
      section,
      grade_level,
      capacity,
      current_students,
      room_number,
      teacher_id,
      academic_year,
      term,
      gender_type,
      subject_ids
    } = req.body;
    
    const check = await pool.query('SELECT id FROM classes WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }
    
    await pool.query('BEGIN');
    
    const result = await pool.query(`
      UPDATE classes SET
        class_name = COALESCE($1, class_name),
        level = COALESCE($2, level),
        stream = COALESCE($3, stream),
        section = COALESCE($4, section),
        grade_level = COALESCE($5, grade_level),
        capacity = COALESCE($6, capacity),
        current_students = COALESCE($7, current_students),
        room_number = COALESCE($8, room_number),
        teacher_id = COALESCE($9, teacher_id),
        academic_year = COALESCE($10, academic_year),
        term = COALESCE($11, term),
        gender_type = COALESCE($12, gender_type),
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      class_name,
      level,
      stream,
      section,
      grade_level,
      capacity,
      current_students,
      room_number,
      teacher_id,
      academic_year,
      term,
      gender_type,
      id
    ]);
    
    const updatedClass = result.rows[0];
    updatedClass.name = updatedClass.class_name;
    
    if (subject_ids !== undefined) {
      await pool.query('DELETE FROM class_subjects WHERE class_id = $1', [id]);
      
      for (const subjectId of subject_ids) {
        const subjectCheck = await pool.query('SELECT id FROM subjects WHERE id = $1', [subjectId]);
        if (subjectCheck.rows.length > 0) {
          await pool.query(`
            INSERT INTO class_subjects (class_id, subject_id, hours_per_week, periods_per_week)
            VALUES ($1, $2, 4, 3)
            ON CONFLICT (class_id, subject_id) DO NOTHING
          `, [id, subjectId]);
        }
      }
      console.log(`📚 Updated subjects for class ${updatedClass.class_name}`);
    }
    
    await pool.query('COMMIT');
    
    res.json({
      success: true,
      data: updatedClass,
      message: 'Class updated successfully'
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error in updateClass:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// DELETE CLASS
// ============================================
classController.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    
    const studentCheck = await pool.query(
      'SELECT COUNT(*) as count FROM students WHERE class_id = $1',
      [id]
    );
    
    if (parseInt(studentCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete class with enrolled students. Remove or transfer students first.'
      });
    }
    
    await pool.query('DELETE FROM class_subjects WHERE class_id = $1', [id]);
    
    const result = await pool.query('DELETE FROM classes WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Class deleted successfully'
    });
    
  } catch (error) {
    console.error('Error in deleteClass:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET CLASS STUDENTS
// ============================================
classController.getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        s.date_of_birth,
        s.parent_name,
        s.parent_phone,
        s.parent_email,
        s.status,
        s.enrollment_date
      FROM students s
      WHERE s.class_id = $1 AND LOWER(TRIM(s.status)) = 'active'
      ORDER BY s.last_name, s.first_name

    `, [classId]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error in getClassStudents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET CLASS SUBJECTS
// ============================================
classController.getClassSubjects = async (req, res) => {
  try {
    const { classId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        cs.id,
        cs.subject_id,
        cs.hours_per_week,
        cs.periods_per_week,
        cs.priority,
        s.name as subject_name,
        s.code as subject_code,
        s.description as subject_description,
        s.level as subject_level,
        t.id as teacher_id,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        t.email as teacher_email
      FROM class_subjects cs
      JOIN subjects s ON cs.subject_id = s.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      WHERE cs.class_id = $1
      ORDER BY cs.priority DESC, s.name
    `, [classId]);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error in getClassSubjects:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// UPDATE CLASS SUBJECT
// ============================================
classController.updateClassSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { hours_per_week, periods_per_week, priority, teacher_id } = req.body;
    
    // Check if class subject exists
    const check = await pool.query(
      'SELECT id FROM class_subjects WHERE id = $1',
      [id]
    );
    
    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Class subject not found'
      });
    }
    
    const result = await pool.query(`
      UPDATE class_subjects SET
        hours_per_week = COALESCE($1, hours_per_week),
        periods_per_week = COALESCE($2, periods_per_week),
        priority = COALESCE($3, priority),
        teacher_id = COALESCE($4, teacher_id),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [hours_per_week, periods_per_week, priority, teacher_id, id]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Class subject updated successfully'
    });
    
  } catch (error) {
    console.error('Error in updateClassSubject:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// REMOVE SUBJECT FROM CLASS
// ============================================
classController.removeSubjectFromClass = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM class_subjects WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Class subject not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Subject removed from class successfully'
    });
    
  } catch (error) {
    console.error('Error in removeSubjectFromClass:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// ASSIGN TEACHER TO CLASS SUBJECT
// ============================================
classController.assignTeacherToSubject = async (req, res) => {
  try {
    const { classSubjectId } = req.params;
    const { teacher_id } = req.body;
    
    if (!teacher_id) {
      return res.status(400).json({
        success: false,
        error: 'Teacher ID is required'
      });
    }
    
    const teacherCheck = await pool.query(
      'SELECT id, first_name, last_name FROM teachers WHERE id = $1 AND status = $2',
      [teacher_id, 'Active']
    );
    
    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found or not active'
      });
    }
    
    const csCheck = await pool.query(
      'SELECT id FROM class_subjects WHERE id = $1',
      [classSubjectId]
    );
    
    if (csCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Class subject not found'
      });
    }
    
    const result = await pool.query(`
      UPDATE class_subjects 
      SET teacher_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [teacher_id, classSubjectId]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Teacher assigned to subject successfully'
    });
    
  } catch (error) {
    console.error('Error in assignTeacherToSubject:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET ALL SUBJECTS
// ============================================
classController.getAllSubjects = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        code,
        description,
        level,
        status,
        created_at,
        updated_at
      FROM subjects
      WHERE status = 'active'
      ORDER BY level, name
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error in getAllSubjects:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// ASSIGN TEACHER TO CLASS (Updates class teacher)
// ============================================
classController.assignTeacherToClass = async (req, res) => {
  try {
    const { teacher_id, class_id } = req.body;
    
    if (!teacher_id || !class_id) {
      return res.status(400).json({
        success: false,
        error: 'Teacher ID and Class ID are required'
      });
    }
    
    const teacherCheck = await pool.query(
      'SELECT id, first_name, last_name FROM teachers WHERE id = $1 AND status = $2',
      [teacher_id, 'Active']
    );
    
    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found or not active'
      });
    }
    
    const classCheck = await pool.query(
      'SELECT id, class_name FROM classes WHERE id = $1',
      [class_id]
    );
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }
    
    const result = await pool.query(`
      UPDATE classes 
      SET teacher_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [teacher_id, class_id]);
    
    const teacher = teacherCheck.rows[0];
    const classData = classCheck.rows[0];
    
    console.log(`✅ Teacher ${teacher.first_name} ${teacher.last_name} assigned to class ${classData.class_name}`);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: `Teacher ${teacher.first_name} ${teacher.last_name} assigned to ${classData.class_name} successfully`
    });
    
  } catch (error) {
    console.error('Error in assignTeacherToClass:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// REMOVE TEACHER FROM CLASS
// ============================================
classController.removeTeacherFromClass = async (req, res) => {
  try {
    const { classId, teacherId } = req.params;
    
    const classCheck = await pool.query(
      'SELECT id, class_name FROM classes WHERE id = $1 AND teacher_id = $2',
      [classId, teacherId]
    );
    
    if (classCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Class not found or teacher not assigned to this class'
      });
    }
    
    const result = await pool.query(`
      UPDATE classes 
      SET teacher_id = NULL, updated_at = NOW()
      WHERE id = $1 AND teacher_id = $2
      RETURNING id
    `, [classId, teacherId]);
    
    console.log(`✅ Teacher ${teacherId} removed from class ${classCheck.rows[0].class_name}`);
    
    res.json({
      success: true,
      message: 'Teacher removed from class successfully'
    });
    
  } catch (error) {
    console.error('Error in removeTeacherFromClass:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET CLASSES WITH TEACHERS
// ============================================
classController.getClassesWithTeachers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.class_name as name,
        c.level,
        c.stream,
        c.capacity,
        c.current_students,
        t.id as teacher_id,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name,
        t.email as teacher_email,
        t.teacher_code,
        (
          SELECT json_agg(
            json_build_object(
              'subject_id', s.id,
              'subject_name', s.name,
              'subject_code', s.code,
              'hours_per_week', cs.hours_per_week,
              'teacher_id', cs.teacher_id
            )
          )
          FROM class_subjects cs
          JOIN subjects s ON cs.subject_id = s.id
          WHERE cs.class_id = c.id
        ) as subjects
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE (c.is_archived = false OR c.is_archived IS NULL)
      ORDER BY c.level, c.class_name
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error in getClassesWithTeachers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET AVAILABLE TEACHERS
// ============================================
classController.getAvailableTeachers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id,
        t.first_name,
        t.last_name,
        t.email,
        t.phone,
        t.department,
        t.subject_specialty,
        t.status,
        COUNT(DISTINCT c.id) as assigned_classes
      FROM teachers t
      LEFT JOIN classes c ON c.teacher_id = t.id
      WHERE t.status = 'Active' OR t.status IS NULL
      GROUP BY t.id
      HAVING COUNT(DISTINCT c.id) < 3
      ORDER BY t.last_name, t.first_name
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error in getAvailableTeachers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET LEVELS
// ============================================
classController.getLevels = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT 
        level,
        grade_level,
        COUNT(*) as class_count
      FROM classes 
      WHERE level IS NOT NULL
      GROUP BY level, grade_level
      ORDER BY grade_level, level
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error in getLevels:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET CLASS STATISTICS
// ============================================
classController.getClassStatistics = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_classes,
        SUM(capacity) as total_capacity,
        SUM(current_students) as total_students,
        ROUND(AVG(current_students::float / NULLIF(capacity, 0) * 100), 2) as avg_occupancy,
        COUNT(DISTINCT level) as total_levels,
        COUNT(DISTINCT stream) as total_streams
      FROM classes
      WHERE is_archived = false OR is_archived IS NULL
    `);
    
    res.json({
      success: true,
      data: result.rows[0] || { total_classes: 0, total_capacity: 0, total_students: 0 }
    });
    
  } catch (error) {
    console.error('Error in getClassStatistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// PROMOTE STUDENTS
// ============================================
classController.promoteClassStudents = async (req, res) => {
  try {
    const { currentClassId, nextClassId } = req.params;
    const { academic_year, new_academic_year } = req.body;
    
    const currentYear = academic_year || '2024-2025';
    const newYear = new_academic_year || '2025-2026';
    
    const result = await pool.query(`
      UPDATE students 
      SET class_id = $1, 
          academic_year = $2, 
          updated_at = NOW()
      WHERE class_id = $3 
      AND status = 'Active'
      RETURNING id
    `, [nextClassId, newYear, currentClassId]);
    
    const promotedCount = result.rows.length;
    
    await pool.query(`
      UPDATE classes 
      SET current_students = (
        SELECT COUNT(*) FROM students WHERE class_id = classes.id AND status = 'Active'
      ),
      updated_at = NOW()
      WHERE id = $1 OR id = $2
    `, [currentClassId, nextClassId]);
    
    res.json({
      success: true,
      promoted_count: promotedCount,
      message: `${promotedCount} students promoted successfully`
    });
    
  } catch (error) {
    console.error('Error in promoteClassStudents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// BULK PROMOTE STUDENTS
// ============================================
classController.bulkPromoteStudents = async (req, res) => {
  try {
    const { promotions } = req.body;
    
    if (!promotions || !Array.isArray(promotions)) {
      return res.status(400).json({
        success: false,
        error: 'Promotions array is required'
      });
    }
    
    let totalPromoted = 0;
    const results = [];
    
    for (const promo of promotions) {
      const { currentClassId, nextClassId, academic_year, new_academic_year } = promo;
      
      const currentYear = academic_year || '2024-2025';
      const newYear = new_academic_year || '2025-2026';
      
      const result = await pool.query(`
        UPDATE students 
        SET class_id = $1, 
            academic_year = $2, 
            updated_at = NOW()
        WHERE class_id = $3 
        AND status = 'Active'
        RETURNING id
      `, [nextClassId, newYear, currentClassId]);
      
      results.push({
        from_class: currentClassId,
        to_class: nextClassId,
        promoted_count: result.rows.length
      });
      totalPromoted += result.rows.length;
    }
    
    const allClassIds = [...new Set([...promotions.map(p => p.currentClassId), ...promotions.map(p => p.nextClassId)])];
    for (const classId of allClassIds) {
      await pool.query(`
        UPDATE classes 
        SET current_students = (
          SELECT COUNT(*) FROM students WHERE class_id = classes.id AND status = 'Active'
        ),
        updated_at = NOW()
        WHERE id = $1
      `, [classId]);
    }
    
    res.json({
      success: true,
      total_promoted: totalPromoted,
      details: results,
      message: `Successfully promoted ${totalPromoted} students`
    });
    
  } catch (error) {
    console.error('Error in bulkPromoteStudents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// ARCHIVE CLASS
// ============================================
classController.archiveClass = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE classes 
      SET is_archived = true, 
          archived_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, class_name, is_archived, archived_at
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Class archived successfully'
    });
    
  } catch (error) {
    console.error('Error in archiveClass:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// RESTORE CLASS
// ============================================
classController.restoreClass = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE classes 
      SET is_archived = false, 
          archived_at = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, class_name, is_archived
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Class restored successfully'
    });
    
  } catch (error) {
    console.error('Error in restoreClass:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET ARCHIVED CLASSES
// ============================================
classController.getArchivedClasses = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        c.class_name as name,
        (
          SELECT COUNT(*) 
          FROM students s 
          WHERE s.class_id = c.id 
          AND s.status = 'Active'
        ) as student_count
      FROM classes c
      WHERE c.is_archived = true
      ORDER BY c.archived_at DESC
    `);
    
    const classes = result.rows.map(cls => ({
      ...cls,
      name: cls.class_name || `Class ${cls.id}`
    }));
    
    res.json({
      success: true,
      data: classes,
      count: classes.length
    });
    
  } catch (error) {
    console.error('Error in getArchivedClasses:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = classController;