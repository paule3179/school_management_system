// backend/models/promotionModel.js
const pool = require('../config/database');

class PromotionModel {
  /**
   * Get students eligible for promotion from a class for a given academic year and term.
   * Uses active enrollments from student_classes.
   */
  async getEligibleStudents(classId, academicYear, term = 1) {
    try {
      const query = `
        SELECT 
          s.id,
          s.admission_number,
          s.first_name,
          s.last_name,
          s.gender,
          c.id AS class_id,
          c.name AS current_class_name,
          c.level,
          sc.academic_year,
          sc.term
        FROM students s
        JOIN student_classes sc ON s.id = sc.student_id AND sc.is_active = true
        JOIN classes c ON sc.class_id = c.id
        WHERE sc.class_id = $1
          AND sc.academic_year = $2
          AND sc.term = $3
        ORDER BY s.last_name, s.first_name
      `;
      const result = await pool.query(query, [classId, academicYear, term]);
      return result.rows;
    } catch (error) {
      console.error('Error getting eligible students:', error);
      return [];
    }
  }

  /**
   * Get next class name based on current class (using class mapping or level).
   * You can also retrieve from a 'class_flow' table if you have one.
   */
  async getNextClass(currentClassId) {
    try {
      const classQuery = `SELECT id, name, level FROM classes WHERE id = $1`;
      const classResult = await pool.query(classQuery, [currentClassId]);
      if (classResult.rows.length === 0) return null;

      const currentClass = classResult.rows[0];
      const className = currentClass.name;
      const level = currentClass.level;

      // Simple promotion logic – replace with your own if needed
      const promotionMap = {
        'KG 1A': 'KG 2A',
        'KG 2A': 'Primary 1A',
        'Primary 1A': 'Primary 2A',
        'Primary 2A': 'Primary 3A',
        'Primary 3A': 'Primary 4A',
        'Primary 4A': 'Primary 5A',
        'Primary 5A': 'Primary 6A',
        'Primary 6A': 'JHS 1A',
        'JHS 1A': 'JHS 2A',
        'JHS 2A': 'JHS 3A',
        'JHS 3A': 'GRADUATED'
      };

      // Handle generic names like "Primary 1A" -> "Primary 2A" etc.
      let nextName = promotionMap[className] || 'GRADUATED';

      // If not in map, try to extract number and increment
      if (!nextName) {
        const match = className.match(/(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (level === 'Primary' && num < 6) {
            nextName = `Primary ${num + 1}A`;
          } else if (level === 'JHS' && num < 3) {
            nextName = `JHS ${num + 1}A`;
          } else {
            nextName = 'GRADUATED';
          }
        } else {
          nextName = 'GRADUATED';
        }
      }

      return {
        ...currentClass,
        next_class_name: nextName
      };
    } catch (error) {
      console.error('Error getting next class:', error);
      return null;
    }
  }

  /**
   * Record promotion history – inserts into `promotions` table.
   * Includes `term` and `recorded_by` (user id).
   */
  async recordHistory(studentId, fromClassId, toClassId, fromAcademicYear, toAcademicYear, term = 1, recordedBy = null) {
    try {
      const query = `
        INSERT INTO promotions (
          student_id, from_class_id, to_class_id,
          from_academic_year, to_academic_year, term,
          recorded_by, promotion_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
        RETURNING id
      `;
      const result = await pool.query(query, [
        studentId, fromClassId, toClassId,
        fromAcademicYear, toAcademicYear,
        term, recordedBy
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Error recording promotion history:', error);
      throw error;
    }
  }

  /**
   * Get promotion history with filters (student, class, academic_year).
   * Joins with students, classes (from and to), and users for recorded_by name.
   */
  async getPromotionHistory(filters = {}) {
    try {
      let query = `
        SELECT 
          p.id,
          p.promotion_date,
          p.from_academic_year,
          p.to_academic_year,
          p.term,
          p.status,
          p.remarks,
          s.first_name,
          s.last_name,
          s.admission_number,
          fc.name AS from_class_name,
          tc.name AS to_class_name,
          u.username AS recorded_by_name
        FROM promotions p
        JOIN students s ON p.student_id = s.id
        LEFT JOIN classes fc ON p.from_class_id = fc.id
        LEFT JOIN classes tc ON p.to_class_id = tc.id
        LEFT JOIN users u ON p.recorded_by = u.id
        WHERE 1=1
      `;
      const values = [];
      let paramCount = 1;

      if (filters.student_id) {
        query += ` AND p.student_id = $${paramCount}`;
        values.push(filters.student_id);
        paramCount++;
      }

      if (filters.class_id) {
        query += ` AND (p.from_class_id = $${paramCount} OR p.to_class_id = $${paramCount})`;
        values.push(filters.class_id);
        paramCount++;
      }

      if (filters.academic_year) {
        query += ` AND (p.from_academic_year = $${paramCount} OR p.to_academic_year = $${paramCount})`;
        values.push(filters.academic_year);
        paramCount++;
      }

      query += ` ORDER BY p.promotion_date DESC, p.created_at DESC LIMIT 100`;

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error fetching promotion history:', error);
      return [];
    }
  }
}

module.exports = new PromotionModel();