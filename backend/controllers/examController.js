const examModel = require('../models/examModel');
const pool = require('../config/database');

const examController = {
  // GET /api/exams - Get all exams
  async getAllExams(req, res) {
    try {
      const { term, status, academic_year } = req.query;
      const filters = { term, status, academic_year };
      
      const exams = await examModel.getAllExams(filters);
      res.json({ success: true, count: exams.length, data: exams });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/exams/:id - Get single exam
  async getExamById(req, res) {
    try {
      const exam = await examModel.getExamById(req.params.id);
      if (!exam) {
        return res.status(404).json({ success: false, error: 'Exam not found' });
      }
      res.json({ success: true, data: exam });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/exams/:id/timetable - Get exam timetable
  async getExamTimetable(req, res) {
    try {
      const timetable = await examModel.getExamTimetable(req.params.id);
      if (!timetable) {
        return res.status(404).json({ success: false, error: 'Exam not found' });
      }
      res.json({ success: true, data: timetable });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/exams/student/:studentId/:examId - Get student exam results
  async getStudentExamResults(req, res) {
    try {
      const studentId = Number(req.params.studentId);
      if (req.user.role === 'parent' && !req.user.allowedStudentIds?.includes(studentId)) {
        return res.status(403).json({ success: false, error: 'Access denied to this student' });
      }
      if (req.user.role === 'teacher') {
        const student = await pool.query(
          'SELECT class_id FROM students WHERE id = $1', [studentId]
        );
        if (!student.rows[0] || !req.user.allowedClassIds?.includes(student.rows[0].class_id)) {
          return res.status(403).json({ success: false, error: 'Access denied to this student' });
        }
      }
      if (!['admin', 'parent', 'teacher'].includes(req.user.role)) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      const results = await examModel.getStudentExamResults(studentId, req.params.examId);
      if (!results) {
        return res.status(404).json({ success: false, error: 'Student or exam not found' });
      }
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/exams - Create exam
  async createExam(req, res) {
    try {
      const newExam = await examModel.createExam(req.body);
      res.status(201).json({ success: true, data: newExam });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/exams/timetable - Add exam timetable entry
  async addExamTimetableEntry(req, res) {
    try {
      const entry = await examModel.addExamTimetableEntry(req.body);
      res.status(201).json({ success: true, data: entry });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // PUT /api/exams/:id - Update exam
  async updateExam(req, res) {
    try {
      const updated = await examModel.updateExam(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Exam not found' });
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // DELETE /api/exams/:id - Delete exam
  async deleteExam(req, res) {
    try {
      const deleted = await examModel.deleteExam(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Exam not found' });
      }
      res.json({ success: true, message: 'Exam deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = examController;
