const studentModel = require('../models/studentModel');

const studentController = {
  // GET /api/students - Get all students
  async getAllStudents(req, res) {
    try {
      const { class_id, level, status } = req.query;
      const filters = { class_id, level, status };
      
      const students = await studentModel.getAllStudents(filters);
      
      console.log(`Returning ${students.length} students with parent data`);
      
      res.json({
        success: true,
        count: students.length,
        data: students
      });
    } catch (error) {
      console.error('Error in getAllStudents:', error.message);
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
      console.error('Error in getStudentById:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // POST /api/students - Create student
  async createStudent(req, res) {
    try {
      console.log('Creating student with data:', req.body);
      
      // Validate required fields
      const required = ['first_name', 'last_name', 'date_of_birth', 'gender', 'class_id', 'level'];
      const missing = required.filter(field => !req.body[field]);
      
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missing.join(', ')}`
        });
      }
      
      const newStudent = await studentModel.createStudent(req.body);
      
      // Fetch the complete student with parent info
      const completeStudent = await studentModel.getStudentById(newStudent.id);
      
      console.log('Student created successfully:', completeStudent);
      
      res.status(201).json({
        success: true,
        data: completeStudent,
        message: 'Student created successfully'
      });
    } catch (error) {
      console.error('Error in createStudent:', error.message);
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
      
      // Fetch the complete student with parent info
      const completeStudent = await studentModel.getStudentById(updatedStudent.id);
      
      res.json({
        success: true,
        data: completeStudent,
        message: 'Student updated successfully'
      });
    } catch (error) {
      console.error('Error in updateStudent:', error.message);
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
      console.error('Error in deleteStudent:', error.message);
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
      console.error('Error in searchStudents:', error.message);
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
      console.error('Error in getStudentsByClass:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = studentController;