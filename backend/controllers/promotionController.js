// backend/controllers/promotionController.js
const promotionModel = require('../models/promotionModel');
const studentModel = require('../models/studentModel');
const classModel = require('../models/classModel');
const pool = require('../config/database');

const promotionController = {};

// ============================================
// GET PROMOTION PREVIEW
// ============================================
promotionController.getPromotionPreview = async (req, res) => {
  try {
    const { classId } = req.params;
    
    const classData = await classModel.getClassById(parseInt(classId));
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }
    
    const students = await promotionModel.getEligibleStudents(parseInt(classId), '2024-2025');
    const nextClass = await promotionModel.getNextClass(parseInt(classId));
    
    let targetClassId = null;
    let targetClassExists = false;
    
    if (nextClass && nextClass.next_class_name !== 'GRADUATED') {
      const allClasses = await classModel.getAllClasses();
const targetClass = allClasses.find(c => c.class_name === nextClass.next_class_name);
      targetClassExists = !!targetClass;
      targetClassId = targetClass ? targetClass.id : null;
    }
    
    res.json({
      success: true,
      data: {
        current_class: {
          id: classData.id,
          name: classData.name,
          level: classData.level,
          capacity: classData.capacity
        },
        total_students: students.length,
        students_list: students,
        suggested_next_class: nextClass?.next_class_name || 'GRADUATED',
        target_class_exists: targetClassExists,
        target_class_id: targetClassId,
        is_graduation: nextClass?.next_class_name === 'GRADUATED'
      }
    });
    
  } catch (error) {
    console.error('Error getting promotion preview:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// PROMOTE ENTIRE CLASS
// ============================================
promotionController.promoteClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { target_class_id, new_academic_year } = req.body;
    
    const students = await promotionModel.getEligibleStudents(parseInt(classId), '2024-2025');
    
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No students found in this class'
      });
    }
    
    let promotedCount = 0;
    const errors = [];
    
    for (const student of students) {
      try {
        await studentModel.updateStudent(student.id, {
          class_id: target_class_id ? parseInt(target_class_id) : null,
          academic_year: new_academic_year,
          previous_class_id: parseInt(classId)
        });
        
        await promotionModel.recordHistory(
          student.id, 
          parseInt(classId), 
          target_class_id ? parseInt(target_class_id) : null, 
          '2024-2025', 
          new_academic_year
        );
        
        promotedCount++;
      } catch (err) {
        errors.push({ student_id: student.id, error: err.message });
      }
    }
    
    res.json({
      success: true,
      promoted_count: promotedCount,
      errors: errors,
      message: `Successfully promoted ${promotedCount} out of ${students.length} students`
    });
    
  } catch (error) {
    console.error('Promotion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET PROMOTION HISTORY
// ============================================
promotionController.getPromotionHistory = async (req, res) => {
  try {
    const { student_id, class_id, academic_year } = req.query;
    
    const filters = {};
    if (student_id) filters.student_id = parseInt(student_id);
    if (class_id) filters.class_id = parseInt(class_id);
    if (academic_year) filters.academic_year = academic_year;
    
    const history = await promotionModel.getPromotionHistory(filters);
    
    res.json({
      success: true,
      data: history,
      count: history.length
    });
    
  } catch (error) {
    console.error('Error fetching promotion history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// PROMOTE SINGLE STUDENT
// ============================================
promotionController.promoteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { new_class_id, new_academic_year } = req.body;
    
    const student = await studentModel.getStudentById(parseInt(studentId));
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }
    
    const oldClassId = student.class_id;
    
    await studentModel.updateStudent(parseInt(studentId), {
      class_id: parseInt(new_class_id),
      academic_year: new_academic_year,
      previous_class_id: oldClassId
    });
    
    await promotionModel.recordHistory(
      parseInt(studentId), 
      oldClassId, 
      parseInt(new_class_id),
      student.academic_year || '2024-2025', 
      new_academic_year
    );
    
    res.json({
      success: true,
      message: 'Student promoted successfully'
    });
    
  } catch (error) {
    console.error('Error promoting student:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// CHECK STUDENT QUALIFICATION
// ============================================
promotionController.checkStudentQualification = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { term, academic_year } = req.query;
    
    // Get student's average grade
    const gradesResult = await pool.query(`
      SELECT COALESCE(AVG((continuous_assessment + exam_score)), 0) as average
      FROM grades 
      WHERE student_id = $1 AND term = $2 AND academic_year = $3
    `, [studentId, term || 1, academic_year || '2024-2025']);
    
    const averageGrade = parseFloat(gradesResult.rows[0]?.average) || 0;
    
    // Get attendance rate
    const attendanceResult = await pool.query(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days
      FROM attendance 
      WHERE student_id = $1 AND term = $2 AND academic_year = $3
    `, [studentId, term || 1, academic_year || '2024-2025']);
    
    const totalDays = parseInt(attendanceResult.rows[0]?.total_days) || 1;
    const presentDays = parseInt(attendanceResult.rows[0]?.present_days) || 0;
    const attendanceRate = (presentDays / totalDays) * 100;
    
    // Qualification criteria
    const hasPassingGrades = averageGrade >= 50;
    const hasGoodAttendance = attendanceRate >= 75;
    
    res.json({
      success: true,
      data: {
        student_id: parseInt(studentId),
        qualified: hasPassingGrades && hasGoodAttendance,
        average_grade: averageGrade,
        attendance_rate: attendanceRate,
        reasons: {
          low_grades: !hasPassingGrades,
          poor_attendance: !hasGoodAttendance
        }
      }
    });
    
  } catch (error) {
    console.error('Error checking qualification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// PROMOTE SELECTED STUDENTS
// ============================================
promotionController.promoteSelectedStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    const { student_ids, target_class_id, new_academic_year } = req.body;
    
    if (!student_ids || student_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No students selected for promotion'
      });
    }
    
    let promotedCount = 0;
    const notPromoted = [];
    
    for (const studentId of student_ids) {
      try {
        await studentModel.updateStudent(parseInt(studentId), {
          class_id: target_class_id ? parseInt(target_class_id) : null,
          academic_year: new_academic_year,
          previous_class_id: parseInt(classId)
        });
        
        await promotionModel.recordHistory(
          parseInt(studentId), 
          parseInt(classId), 
          target_class_id ? parseInt(target_class_id) : null, 
          '2024-2025', 
          new_academic_year
        );
        
        promotedCount++;
      } catch (err) {
        notPromoted.push({ student_id: studentId, error: err.message });
      }
    }
    
    res.json({
      success: true,
      promoted_count: promotedCount,
      not_promoted_count: notPromoted.length,
      not_promoted: notPromoted,
      message: `Successfully promoted ${promotedCount} out of ${student_ids.length} selected students`
    });
    
  } catch (error) {
    console.error('Promotion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// BULK PROMOTE STUDENTS
// ============================================
promotionController.promoteBulkStudents = async (req, res) => {
  try {
    const { student_ids, new_academic_year } = req.body;
    
    if (!student_ids || student_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No students selected for promotion'
      });
    }
    
    let promotedCount = 0;
    const notPromoted = [];
    
    for (const studentId of student_ids) {
      try {
        // Get current student info
        const student = await studentModel.getStudentById(parseInt(studentId));
        if (!student) {
          notPromoted.push({ student_id: studentId, error: 'Student not found' });
          continue;
        }
        
        // Get next class based on current class
        const nextClassInfo = await promotionModel.getNextClass(student.class_id);
        if (!nextClassInfo || nextClassInfo.next_class_name === 'GRADUATED') {
          notPromoted.push({ student_id: studentId, error: 'No target class found' });
          continue;
        }
        
        // Find target class ID
        const allClasses = await classModel.getAllClasses();
const targetClass = allClasses.find(c => c.class_name === nextClassInfo.next_class_name);
        
        if (!targetClass) {
          notPromoted.push({ student_id: studentId, error: 'Target class does not exist' });
          continue;
        }
        
        // Update student
        await studentModel.updateStudent(parseInt(studentId), {
          class_id: targetClass.id,
          academic_year: new_academic_year,
          previous_class_id: student.class_id
        });
        
        // Record promotion history
        await promotionModel.recordHistory(
          parseInt(studentId), 
          student.class_id, 
          targetClass.id, 
          '2024-2025', 
          new_academic_year
        );
        
        promotedCount++;
      } catch (err) {
        notPromoted.push({ student_id: studentId, error: err.message });
      }
    }
    
    res.json({
      success: true,
      promoted_count: promotedCount,
      not_promoted_count: notPromoted.length,
      not_promoted: notPromoted,
      message: `Successfully promoted ${promotedCount} out of ${student_ids.length} students`
    });
    
  } catch (error) {
    console.error('Bulk promotion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = promotionController;