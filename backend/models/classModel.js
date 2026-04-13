const pool = require('../config/database');

class ClassModel {
  // Get all classes
  async getAllClasses(filters = {}) {
    try {
      let query = `
        SELECT c.*, 
               t.first_name as teacher_first_name, 
               t.last_name as teacher_last_name,
               COUNT(s.id) as student_count
        FROM classes c
        LEFT JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
      `;
      
      const conditions = [];
      const values = [];
      let paramCount = 1;
      
      if (filters.level) {
        conditions.push(`c.level = $${paramCount}`);
        values.push(filters.level);
        paramCount++;
      }
      
      if (filters.academic_year) {
        conditions.push(`c.academic_year = $${paramCount}`);
        values.push(filters.academic_year);
        paramCount++;
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' GROUP BY c.id, t.first_name, t.last_name ORDER BY c.name';
      
      const result = await pool.query(query, values);
      
      // Format the response
      const classes = result.rows.map(cls => ({
        id: cls.id,
        name: cls.name,
        level: cls.level,
        capacity: cls.capacity,
        current_count: parseInt(cls.student_count) || 0,
        teacher_id: cls.teacher_id,
        teacher_name: cls.teacher_first_name ? `${cls.teacher_first_name} ${cls.teacher_last_name}` : 'Not assigned',
        classroom: cls.classroom,
        academic_year: cls.academic_year
      }));
      
      return classes;
    } catch (error) {
      console.error('Error in getAllClasses:', error.message);
      // Return mock data as fallback
      return this.getMockClasses();
    }
  }
  
  // Get class by ID
  async getClassById(id) {
    try {
      const query = `
        SELECT c.*, 
               t.first_name as teacher_first_name, 
               t.last_name as teacher_last_name,
               json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', CONCAT(u.first_name, ' ', u.last_name), 'admission_number', s.admission_number)) FILTER (WHERE s.id IS NOT NULL) as students
        FROM classes c
        LEFT JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
        LEFT JOIN users u ON s.user_id = u.id
        WHERE c.id = $1
        GROUP BY c.id, t.first_name, t.last_name
      `;
      
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const cls = result.rows[0];
      return {
        id: cls.id,
        name: cls.name,
        level: cls.level,
        capacity: cls.capacity,
        current_count: cls.students ? cls.students.length : 0,
        teacher_id: cls.teacher_id,
        teacher_name: cls.teacher_first_name ? `${cls.teacher_first_name} ${cls.teacher_last_name}` : 'Not assigned',
        classroom: cls.classroom,
        academic_year: cls.academic_year,
        students: cls.students || []
      };
    } catch (error) {
      console.error('Error in getClassById:', error.message);
      // Return mock data as fallback
      const mockClasses = this.getMockClasses();
      return mockClasses.find(c => c.id === parseInt(id)) || null;
    }
  }
  
  // Create new class
  async createClass(classData) {
    try {
      const { name, level, capacity, teacher_id, classroom, academic_year } = classData;
      
      const query = `
        INSERT INTO classes (name, level, capacity, teacher_id, classroom, academic_year, current_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const result = await pool.query(query, [name, level, capacity, teacher_id || null, classroom, academic_year, 0]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in createClass:', error.message);
      throw new Error('Failed to create class: ' + error.message);
    }
  }
  
  // Update class
  async updateClass(id, updateData) {
    try {
      const { name, level, capacity, teacher_id, classroom, academic_year } = updateData;
      
      const query = `
        UPDATE classes 
        SET name = COALESCE($1, name),
            level = COALESCE($2, level),
            capacity = COALESCE($3, capacity),
            teacher_id = COALESCE($4, teacher_id),
            classroom = COALESCE($5, classroom),
            academic_year = COALESCE($6, academic_year)
        WHERE id = $7
        RETURNING *
      `;
      
      const result = await pool.query(query, [name, level, capacity, teacher_id, classroom, academic_year, id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in updateClass:', error.message);
      throw new Error('Failed to update class: ' + error.message);
    }
  }
  
  // Delete class
  async deleteClass(id) {
    try {
      // Check if class has students
      const checkQuery = 'SELECT COUNT(*) FROM students WHERE class_id = $1 AND status = $2';
      const checkResult = await pool.query(checkQuery, [id, 'active']);
      
      if (parseInt(checkResult.rows[0].count) > 0) {
        throw new Error('Cannot delete class with enrolled students');
      }
      
      const query = 'DELETE FROM classes WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in deleteClass:', error.message);
      throw new Error(error.message);
    }
  }
  
  // Get class subjects based on level
  async getClassSubjects(classId) {
    try {
      const query = 'SELECT level FROM classes WHERE id = $1';
      const result = await pool.query(query, [classId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const level = result.rows[0].level;
      
      const subjectsByLevel = {
        KG: ['Literacy', 'Numeracy', 'Creative Arts', 'Our World Our People', 'Physical Development'],
        Primary: ['English', 'Mathematics', 'Science', 'Ghanaian Language', 'Creative Arts', 'RME', 'PE', 'History', 'French'],
        JHS: ['Mathematics', 'English', 'Science', 'Social Studies', 'Computing', 'Career Technology', 'RME', 'Creative Arts', 'PE']
      };
      
      return subjectsByLevel[level] || subjectsByLevel.Primary;
    } catch (error) {
      console.error('Error in getClassSubjects:', error.message);
      return ['English', 'Mathematics', 'Science', 'Social Studies'];
    }
  }
  
  // Mock data fallback
  getMockClasses() {
    return [
      { id: 1, name: 'KG2A', level: 'KG', capacity: 25, current_count: 5, teacher_name: 'Not assigned', classroom: 'Room 101', academic_year: '2024-2025', students: [] },
      { id: 2, name: 'P5A', level: 'Primary', capacity: 35, current_count: 28, teacher_name: 'Not assigned', classroom: 'Room 205', academic_year: '2024-2025', students: [] },
      { id: 3, name: 'JHS2A', level: 'JHS', capacity: 40, current_count: 32, teacher_name: 'Not assigned', classroom: 'Room 301', academic_year: '2024-2025', students: [] }
    ];
  }
}

module.exports = new ClassModel();