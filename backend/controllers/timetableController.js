const timetableModel = require('../models/timetableModel');
const timetableGenerator = require('../utils/timetableGenerator');
const pool = require('../config/database');

const timetableController = {
  // ============================================
  // ADMIN ROUTES
  // ============================================

  // GET /api/timetables - Get all timetables
  async getAllTimetables(req, res) {
    try {
      const { class_id, day } = req.query;
      const filters = { class_id, day };
      
      const timetables = await timetableModel.getAllTimetables(filters);
      res.json({
        success: true,
        count: timetables.length,
        data: timetables
      });
    } catch (error) {
      console.error('Error getting all timetables:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/timetables/:id - Get single timetable entry
  async getTimetableById(req, res) {
    try {
      const timetable = await timetableModel.getTimetableById(req.params.id);
      if (!timetable) {
        return res.status(404).json({ success: false, error: 'Timetable not found' });
      }
      res.json({ success: true, data: timetable });
    } catch (error) {
      console.error('Error getting timetable by ID:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/timetables/class/:classId - Get class timetable
  async getClassTimetable(req, res) {
    try {
      const timetable = await timetableModel.getClassTimetable(req.params.classId);
      if (!timetable) {
        return res.status(404).json({ success: false, error: 'No timetable found for this class' });
      }
      res.json({ success: true, data: timetable });
    } catch (error) {
      console.error('Error getting class timetable:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/timetables/teacher/:teacherId - Get teacher timetable
  async getTeacherTimetable(req, res) {
    try {
      const timetable = await timetableModel.getTeacherTimetable(req.params.teacherId);
      res.json({ success: true, data: timetable });
    } catch (error) {
      console.error('Error getting teacher timetable:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/timetables - Create single timetable entry
  async createTimetable(req, res) {
    try {
      const { class_id, teacher_id, subject, day_of_week, start_time, end_time, room, term, academic_year } = req.body;
      
      // Check for conflicts
      const conflict = await pool.query(`
        SELECT * FROM timetables 
        WHERE class_id = $1 AND day_of_week = $2 
        AND (
          (start_time < $4 AND end_time > $3) OR
          (start_time < $3 AND end_time > $3) OR
          (start_time >= $3 AND start_time < $4)
        )
      `, [class_id, day_of_week, start_time, end_time]);
      
      if (conflict.rows.length > 0) {
        return res.status(409).json({ 
          success: false, 
          error: 'Schedule conflict! Another class is already scheduled at this time.' 
        });
      }
      
      const newTimetable = await timetableModel.createTimetable(req.body);
      res.status(201).json({ 
        success: true, 
        data: newTimetable,
        message: 'Timetable entry created successfully'
      });
    } catch (error) {
      console.error('Error creating timetable:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // PUT /api/timetables/entry/:id - Update timetable entry
  async updateTimetable(req, res) {
    try {
      const { id } = req.params;
      const { teacher_id, subject, day_of_week, start_time, end_time, room } = req.body;
      
      // Check if entry exists
      const existing = await pool.query('SELECT * FROM timetables WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Timetable entry not found' });
      }
      
      // Check for conflicts (excluding current entry)
      const conflict = await pool.query(`
        SELECT * FROM timetables 
        WHERE class_id = $1 AND day_of_week = $2 AND id != $3
        AND (
          (start_time < $5 AND end_time > $4) OR
          (start_time < $4 AND end_time > $4) OR
          (start_time >= $4 AND start_time < $5)
        )
      `, [existing.rows[0].class_id, day_of_week, id, start_time, end_time]);
      
      if (conflict.rows.length > 0) {
        return res.status(409).json({ 
          success: false, 
          error: 'Schedule conflict! Another class is already scheduled at this time.' 
        });
      }
      
      const updated = await timetableModel.updateTimetable(id, {
        teacher_id,
        subject,
        day_of_week,
        start_time,
        end_time,
        room,
        updated_at: new Date()
      });
      
      res.json({ 
        success: true, 
        data: updated,
        message: 'Timetable entry updated successfully'
      });
    } catch (error) {
      console.error('Error updating timetable:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // DELETE /api/timetables/entry/:id - Delete timetable entry
  async deleteTimetable(req, res) {
    try {
      const deleted = await timetableModel.deleteTimetable(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Timetable entry not found' });
      }
      res.json({ success: true, message: 'Timetable entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting timetable:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // DELETE /api/timetables/class/:classId - Clear all entries for a class
  async clearClassTimetable(req, res) {
    try {
      const { classId } = req.params;
      const result = await pool.query('DELETE FROM timetables WHERE class_id = $1 RETURNING id', [classId]);
      res.json({ 
        success: true, 
        message: `${result.rowCount} entries deleted`,
        count: result.rowCount
      });
    } catch (error) {
      console.error('Error clearing class timetable:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ============================================
  // AUTO-GENERATE TIMETABLE
  // ============================================
  
  // POST /api/timetables/auto-generate - Generate for single class
  async autoGenerateTimetable(req, res) {
    try {
      const { classId, term = 1, academic_year = '2024-2025' } = req.body;
      
      if (!classId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Class ID is required' 
        });
      }
      
      console.log(`🎓 Auto-generating timetable for class ${classId}`);
      
      const result = await timetableGenerator.generateTimetable(classId, term, academic_year);
      
      res.json({
        success: true,
        message: 'Timetable generated successfully',
        data: result
      });
    } catch (error) {
      console.error('Generation error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // POST /api/timetables/auto-generate-all - Generate for all classes
  async autoGenerateAllTimetables(req, res) {
    try {
      const { term = 1, academic_year = '2024-2025' } = req.body;
      
      // Get all classes
      const classesResult = await pool.query('SELECT id, class_name FROM classes ORDER BY id');
      const classes = classesResult.rows;
      
      if (classes.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'No classes found' 
        });
      }
      
      let results = [];
      let totalEntries = 0;
      
      for (const classItem of classes) {
        console.log(`🎓 Generating timetable for ${classItem.class_name} (ID: ${classItem.id})`);
        
        try {
          const result = await timetableGenerator.generateTimetable(classItem.id, term, academic_year);
          results.push({
            class_id: classItem.id,
            class_name: classItem.class_name,
            status: 'success',
            entries: result.savedCount
          });
          totalEntries += result.savedCount;
        } catch (error) {
          console.error(`Error generating for class ${classItem.id}:`, error);
          results.push({
            class_id: classItem.id,
            class_name: classItem.class_name,
            status: 'error',
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        message: `Generated timetables for ${classes.length} classes`,
        data: {
          total_classes: classes.length,
          total_entries: totalEntries,
          results: results
        }
      });
      
    } catch (error) {
      console.error('Error generating all timetables:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/timetables/auto-generate-selected - Generate for selected classes
  async autoGenerateSelectedTimetables(req, res) {
    try {
      const { classIds, term = 1, academic_year = '2024-2025' } = req.body;
      
      if (!classIds || classIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'No class IDs provided' 
        });
      }
      
      let results = [];
      let totalEntries = 0;
      
      for (const classId of classIds) {
        const classResult = await pool.query('SELECT class_name FROM classes WHERE id = $1', [classId]);
        const className = classResult.rows[0]?.class_name || `Class ${classId}`;
        
        console.log(`🎓 Generating timetable for ${className} (ID: ${classId})`);
        
        try {
          const result = await timetableGenerator.generateTimetable(classId, term, academic_year);
          results.push({
            class_id: classId,
            class_name: className,
            status: 'success',
            entries: result.savedCount
          });
          totalEntries += result.savedCount;
        } catch (error) {
          console.error(`Error generating for class ${classId}:`, error);
          results.push({
            class_id: classId,
            class_name: className,
            status: 'error',
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        message: `Generated timetables for ${classIds.length} classes`,
        data: {
          total_classes: classIds.length,
          total_entries: totalEntries,
          results: results
        }
      });
      
    } catch (error) {
      console.error('Error generating selected timetables:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ============================================
  // TEACHER DASHBOARD ROUTES
  // ============================================

  // GET /api/timetables/teacher/dashboard/:teacherId - Get teacher's timetable for dashboard
  async getTeacherDashboardTimetable(req, res) {
    try {
      const { teacherId } = req.params;
      
      // Get teacher info
      const teacherResult = await pool.query(`
        SELECT id, first_name, last_name, email, department, subject_specialty
        FROM teachers 
        WHERE id = $1
      `, [teacherId]);
      
      if (teacherResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Teacher not found' 
        });
      }
      
      const teacher = teacherResult.rows[0];
      
      // Get teacher's timetable
      const timetable = await pool.query(`
        SELECT 
          t.*,
          c.class_name,
          c.level,
          c.room_number
        FROM timetables t
        JOIN classes c ON t.class_id = c.id
        WHERE t.teacher_id = $1
        ORDER BY 
          CASE t.day_of_week
            WHEN 'Monday' THEN 1
            WHEN 'Tuesday' THEN 2
            WHEN 'Wednesday' THEN 3
            WHEN 'Thursday' THEN 4
            WHEN 'Friday' THEN 5
          END,
          t.start_time
      `, [teacherId]);
      
      // Get today's classes
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const todayClasses = timetable.rows.filter(t => t.day_of_week === today);
      
      // Get teacher's classes
      const classesResult = await pool.query(`
        SELECT 
          c.id,
          c.class_name,
          c.level,
          c.stream,
          COUNT(DISTINCT s.id) as student_count
        FROM classes c
        LEFT JOIN students s ON s.class_id = c.id AND s.status = 'Active'
        WHERE c.teacher_id = $1
        GROUP BY c.id
        ORDER BY c.class_name
      `, [teacherId]);
      
      // Get upcoming classes for the week
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const weeklySchedule = daysOfWeek.map(day => ({
        day,
        classes: timetable.rows.filter(t => t.day_of_week === day)
      }));
      
      res.json({
        success: true,
        data: {
          teacher: {
            id: teacher.id,
            first_name: teacher.first_name,
            last_name: teacher.last_name,
            email: teacher.email,
            department: teacher.department,
            subject_specialty: teacher.subject_specialty
          },
          stats: {
            total_classes_per_week: timetable.rows.length,
            today_classes: todayClasses.length,
            assigned_classes: classesResult.rows.length,
            total_students: classesResult.rows.reduce((sum, c) => sum + parseInt(c.student_count || 0), 0)
          },
          timetable: timetable.rows,
          today_classes: todayClasses,
          weekly_schedule: weeklySchedule,
          classes: classesResult.rows
        }
      });
      
    } catch (error) {
      console.error('Error getting teacher dashboard timetable:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/timetables/teacher/:teacherId/today - Get today's classes for a teacher
  async getTeacherTodayClasses(req, res) {
    try {
      const { teacherId } = req.params;
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      
      const result = await pool.query(`
        SELECT 
          t.*,
          c.class_name,
          c.level,
          c.room_number
        FROM timetables t
        JOIN classes c ON t.class_id = c.id
        WHERE t.teacher_id = $1 AND t.day_of_week = $2
        ORDER BY t.start_time
      `, [teacherId, today]);
      
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
        day: today
      });
      
    } catch (error) {
      console.error('Error getting teacher today classes:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/timetables/teacher/:teacherId/week - Get week's schedule for a teacher
  async getTeacherWeekSchedule(req, res) {
    try {
      const { teacherId } = req.params;
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      
      const result = await pool.query(`
        SELECT 
          t.*,
          c.class_name,
          c.level,
          c.room_number
        FROM timetables t
        JOIN classes c ON t.class_id = c.id
        WHERE t.teacher_id = $1
        ORDER BY 
          CASE t.day_of_week
            WHEN 'Monday' THEN 1
            WHEN 'Tuesday' THEN 2
            WHEN 'Wednesday' THEN 3
            WHEN 'Thursday' THEN 4
            WHEN 'Friday' THEN 5
          END,
          t.start_time
      `, [teacherId]);
      
      // Group by day
      const weeklySchedule = daysOfWeek.map(day => ({
        day,
        classes: result.rows.filter(t => t.day_of_week === day)
      }));
      
      res.json({
        success: true,
        data: weeklySchedule
      });
      
    } catch (error) {
      console.error('Error getting teacher week schedule:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ============================================
  // SET TEACHER AVAILABILITY
  // ============================================
  
  async setTeacherAvailability(req, res) {
    try {
      const { teacher_id, availability } = req.body;
      
      if (!teacher_id || !availability) {
        return res.status(400).json({ 
          success: false, 
          error: 'Teacher ID and availability are required' 
        });
      }
      
      // Clear existing availability
      await pool.query('DELETE FROM teacher_availability WHERE teacher_id = $1', [teacher_id]);
      
      // Insert new availability
      for (const slot of availability) {
        await pool.query(`
          INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time, is_available)
          VALUES ($1, $2, $3, $4, true)
        `, [teacher_id, slot.day, slot.start_time, slot.end_time]);
      }
      
      res.json({
        success: true,
        message: 'Teacher availability updated successfully'
      });
    } catch (error) {
      console.error('Error setting teacher availability:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/timetables/teacher/:teacherId/availability - Get teacher availability
  async getTeacherAvailability(req, res) {
    try {
      const { teacherId } = req.params;
      
      const result = await pool.query(`
        SELECT day_of_week, start_time, end_time, is_available
        FROM teacher_availability
        WHERE teacher_id = $1
        ORDER BY 
          CASE day_of_week
            WHEN 'Monday' THEN 1
            WHEN 'Tuesday' THEN 2
            WHEN 'Wednesday' THEN 3
            WHEN 'Thursday' THEN 4
            WHEN 'Friday' THEN 5
          END,
          start_time
      `, [teacherId]);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('Error getting teacher availability:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ============================================
  // SET CLASS SUBJECTS
  // ============================================
  
  async setClassSubjects(req, res) {
    try {
      const { class_id, subjects } = req.body;
      
      if (!class_id || !subjects) {
        return res.status(400).json({ 
          success: false, 
          error: 'Class ID and subjects are required' 
        });
      }
      
      // Clear existing subjects
      await pool.query('DELETE FROM class_subjects WHERE class_id = $1', [class_id]);
      
      // Insert new subjects
      for (const subject of subjects) {
        await pool.query(`
          INSERT INTO class_subjects (class_id, subject_id, hours_per_week, periods_per_week, priority)
          VALUES ($1, $2, $3, $4, $5)
        `, [class_id, subject.subject_id, subject.hours_per_week || 4, subject.periods_per_week || 3, subject.priority || 1]);
      }
      
      res.json({
        success: true,
        message: 'Class subjects updated successfully'
      });
    } catch (error) {
      console.error('Error setting class subjects:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/timetables/class/:classId/subjects - Get class subjects
  async getClassSubjects(req, res) {
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
          s.description
        FROM class_subjects cs
        JOIN subjects s ON cs.subject_id = s.id
        WHERE cs.class_id = $1
        ORDER BY cs.priority DESC, s.name
      `, [classId]);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('Error getting class subjects:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ============================================
  // BULK OPERATIONS
  // ============================================
  
  // POST /api/timetables/bulk - Bulk create timetable entries
  async bulkCreateTimetable(req, res) {
    try {
      const { entries } = req.body;
      
      if (!entries || entries.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'No entries provided' 
        });
      }
      
      // Clear existing timetable for this class
      await pool.query('DELETE FROM timetables WHERE class_id = $1', [entries[0].class_id]);
      
      let savedCount = 0;
      for (const entry of entries) {
        await pool.query(`
          INSERT INTO timetables (
            class_id, teacher_id, subject, day_of_week, 
            start_time, end_time, room, term, academic_year
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          entry.class_id, 
          entry.teacher_id || null,
          entry.subject, 
          entry.day_of_week, 
          entry.start_time, 
          entry.end_time, 
          entry.room || null,
          entry.term || 1, 
          entry.academic_year || '2024-2025'
        ]);
        savedCount++;
      }
      
      res.json({ 
        success: true, 
        message: `${savedCount} entries created`, 
        count: savedCount 
      });
    } catch (error) {
      console.error('Error bulk creating entries:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ============================================
  // GET TIMETABLE STATISTICS
  // ============================================
  
  async getTimetableStats(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(DISTINCT class_id) as total_classes_with_timetable,
          COUNT(DISTINCT teacher_id) as total_teachers_with_timetable,
          COUNT(DISTINCT day_of_week) as total_days
        FROM timetables
      `);
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error getting timetable stats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = timetableController;