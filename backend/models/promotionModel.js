const pool = require('../config/database');

class PromotionModel {
  // Get students eligible for promotion from a class
  async getEligibleStudents(classId, academicYear) {
    try {
      const query = `
        SELECT 
          s.id,
          s.admission_number,
          s.first_name,
          s.last_name,
          s.gender,
          s.class_id,
c.class_name as current_class_name,
          c.level
        FROM students s
        JOIN classes c ON s.class_id = c.id
        WHERE s.class_id = $1 
        AND s.status = 'active'
        ORDER BY s.last_name, s.first_name
      `;
      
      const result = await pool.query(query, [classId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting eligible students:', error);
      return [];
    }
  }
  
  // Get next class based on current class
  async getNextClass(currentClassId) {
    try {
      const classQuery = `SELECT * FROM classes WHERE id = $1`;
      const classResult = await pool.query(classQuery, [currentClassId]);
      
      if (classResult.rows.length === 0) return null;
      
      const currentClass = classResult.rows[0];
      
      const promotionMap = {
        'P1A': 'P2A', 'P2A': 'P3A', 'P3A': 'P4A',
        'P4A': 'P5A', 'P5A': 'P6A', 'P6A': 'JHS1A',
        'JHS1A': 'JHS2A', 'JHS2A': 'JHS3A', 'JHS3A': 'GRADUATED'
      };
      
const nextClassName = promotionMap[currentClass.class_name] || 'GRADUATED';
      
      return {
        ...currentClass,
        next_class_name: nextClassName
      };
    } catch (error) {
      console.error('Error getting next class:', error);
      return null;
    }
  }
  
  // Record promotion history
  async recordHistory(studentId, fromClassId, toClassId, fromAcademicYear, toAcademicYear) {
    try {
      const query = `
        INSERT INTO promotion_history 
        (student_id, from_class_id, to_class_id, 
         from_academic_year, to_academic_year, promotion_date)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      `;
      
      const result = await pool.query(query, [
        studentId, fromClassId, toClassId, fromAcademicYear, toAcademicYear
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error recording promotion history:', error);
      throw error;
    }
  }
  
  // Get promotion history with filters
  async getPromotionHistory(filters = {}) {
    try {
      let query = `
        SELECT 
          ph.*,
          s.first_name,
          s.last_name,
          s.admission_number,
from_c.class_name as from_class_name,
          to_c.class_name as to_class_name
        FROM promotion_history ph
        JOIN students s ON ph.student_id = s.id
        JOIN classes from_c ON ph.from_class_id = from_c.id
        LEFT JOIN classes to_c ON ph.to_class_id = to_c.id
        WHERE 1=1
      `;
      
      const values = [];
      let paramCount = 1;
      
      if (filters.student_id) {
        query += ` AND ph.student_id = $${paramCount}`;
        values.push(filters.student_id);
        paramCount++;
      }
      
      if (filters.class_id) {
        query += ` AND (ph.from_class_id = $${paramCount} OR ph.to_class_id = $${paramCount})`;
        values.push(filters.class_id);
        paramCount++;
      }
      
      if (filters.academic_year) {
        query += ` AND (ph.from_academic_year = $${paramCount} OR ph.to_academic_year = $${paramCount})`;
        values.push(filters.academic_year);
        paramCount++;
      }
      
      query += ` ORDER BY ph.promotion_date DESC LIMIT 100`;
      
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error fetching promotion history:', error);
      return [];
    }
  }
}

module.exports = new PromotionModel();