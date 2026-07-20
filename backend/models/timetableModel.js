
const pool = require('../config/database');

class TimetableModel {
  // Get all timetables
  async getAllTimetables(filters = {}) {
    try {
      let query = `
        SELECT t.*, 
c.class_name as class_name,
               c.level as class_level
        FROM timetables t
        LEFT JOIN classes c ON t.class_id = c.id
      `;
      let params = [];
      let paramIndex = 1;

      if (filters.class_id) {
        query += ` WHERE t.class_id = $${paramIndex}`;
        params.push(filters.class_id);
        paramIndex++;
      }
      if (filters.day) {
        query += (filters.class_id ? ' AND' : ' WHERE') + ` t.day_of_week = $${paramIndex}`;
        params.push(filters.day);
        paramIndex++;
      }

      query += ` ORDER BY t.day_of_week, t.start_time`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('getAllTimetables error:', error);
      return [];
    }
  }
  
  // Get timetable by ID
  async getTimetableById(id) {
    try {
      const result = await pool.query(`
c.class_name as class_name, c.level as class_level
        FROM timetables t
        LEFT JOIN classes c ON t.class_id = c.id
        WHERE t.id = $1
      `, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('getTimetableById error:', error);
      return null;
    }
  }
  
  // Get timetable for a class - FLAT ARRAY for frontend
  async getClassTimetable(classId) {
    try {
      const result = await pool.query(`
        SELECT t.*, 
c.class_name as class_name,
               c.level as class_level,
               CONCAT(tt.first_name, ' ', tt.last_name) as teacher_name
        FROM timetables t
        LEFT JOIN classes c ON t.class_id = c.id
        LEFT JOIN teachers tt ON t.teacher_id = tt.id
        WHERE t.class_id = $1
        ORDER BY 
          CASE t.day_of_week
            WHEN 'Monday' THEN 1
            WHEN 'Tuesday' THEN 2
            WHEN 'Wednesday' THEN 3
            WHEN 'Thursday' THEN 4
            WHEN 'Friday' THEN 5
          END,
          t.start_time
      `, [classId]);
      
      if (result.rows.length === 0) return null;
      return result.rows;
    } catch (error) {
      console.error('Timetable query error:', error);
      return null;
    }
  }
  
  // Create new timetable entry
  async createTimetable(timetableData) {
    try {
      const result = await pool.query(`
        INSERT INTO timetables (
          class_id, teacher_id, subject, day_of_week, 
          start_time, end_time, room, term, academic_year
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        timetableData.class_id,
        timetableData.teacher_id || null,
        timetableData.subject,
        timetableData.day_of_week,
        timetableData.start_time,
        timetableData.end_time,
        timetableData.room || null,
        timetableData.term || 1,
        timetableData.academic_year || '2024-2025'
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('createTimetable error:', error);
      throw error;
    }
  }
  
  // Update timetable entry
  async updateTimetable(id, updateData) {
    try {
      const setClause = Object.keys(updateData).map((key, index) => 
        `${key} = $${index + 1}`
      ).join(', ');
      const values = Object.values(updateData);
      values.push(id);
      
      const result = await pool.query(`
        UPDATE timetables 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING *
      `, values);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('updateTimetable error:', error);
      return null;
    }
  }
  
  // Delete timetable entry
  async deleteTimetable(id) {
    try {
      const result = await pool.query(
        'DELETE FROM timetables WHERE id = $1 RETURNING *', 
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('deleteTimetable error:', error);
      return false;
    }
  }
  
  // Get teacher's timetable
  async getTeacherTimetable(teacherId) {
    try {
      const result = await pool.query(`
SELECT t.*, c.class_name as class_name
        FROM timetables t
        LEFT JOIN classes c ON t.class_id = c.id
        WHERE t.teacher_id = $1
        ORDER BY 
          CASE t.day_of_week
            WHEN 'Monday' THEN 1
            WHEN 'Tuesday' THEN 2
            WHEN 'Wednesday' THEN 3
            WHEN 'Thursday' THEN 4
            WHEN 'Friday' THEN 5
          END, t.start_time
      `, [teacherId]);
      return result.rows;
    } catch (error) {
      console.error('getTeacherTimetable error:', error);
      return [];
    }
  }
}

module.exports = new TimetableModel();
