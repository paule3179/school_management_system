const studentModel = require('../models/studentModel');

const studentController = {
  // GET /api/students - Get all students
  async getAllStudents(req, res) {
    try {
      const students = await studentModel.getAllStudents();
      res.json({
        success: true,
        count: students.length,
        data: students
      });
    } catch (error) {
      console.error('Error in getAllStudents:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // POST /api/students - Create student
  async createStudent(req, res) {
    try {
      console.log('📝 Creating student with data:', req.body);
      
      const newStudent = await studentModel.createStudent(req.body);
      
      console.log('✅ Student created:', newStudent);
      
      res.status(201).json({
        success: true,
        data: newStudent,
        message: 'Student created successfully'
      });
    } catch (error) {
      console.error('❌ Error in createStudent:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/students/:id - Get single student
  async getStudentById(req, res) {
    try {
      const student = await studentModel.getStudentById(req.params.id);
      if (!student) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
      res.json({
        success: true,
        data: student
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // PUT /api/students/:id - Update student
  async updateStudent(req, res) {
    try {
      const updatedStudent = await studentModel.updateStudent(req.params.id, req.body);
      if (!updatedStudent) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
      res.json({
        success: true,
        data: updatedStudent
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // DELETE /api/students/:id - Delete student
  async deleteStudent(req, res) {
    try {
      const deleted = await studentModel.deleteStudent(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
      res.json({
        success: true,
        message: 'Student deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/students/search/:keyword - Search students
  async searchStudents(req, res) {
    try {
      const students = await studentModel.searchStudents(req.params.keyword);
      res.json({
        success: true,
        count: students.length,
        data: students
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/students/class/:classId - Get students by class
  async getStudentsByClass(req, res) {
    try {
      const students = await studentModel.getStudentsByClass(req.params.classId);
      res.json({
        success: true,
        count: students.length,
        data: students
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = studentController;