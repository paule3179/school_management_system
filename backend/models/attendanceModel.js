const mockData = require('../data/mockData');

class AttendanceModel {
  // Get all attendance records
  async getAllAttendance(filters = {}) {
    let attendance = [...mockData.attendance];
    
    if (filters.student_id) {
      attendance = attendance.filter(a => a.student_id === parseInt(filters.student_id));
    }
    if (filters.class_id) {
      const studentsInClass = mockData.getStudentsByClass(parseInt(filters.class_id));
      const studentIds = studentsInClass.map(s => s.id);
      attendance = attendance.filter(a => studentIds.includes(a.student_id));
    }
    if (filters.date) {
      attendance = attendance.filter(a => a.date === filters.date);
    }
    if (filters.status) {
      attendance = attendance.filter(a => a.status === filters.status);
    }
    
    // Add student names
    const attendanceWithNames = attendance.map(record => {
      const student = mockData.students.find(s => s.id === record.student_id);
      return {
        ...record,
        student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
        student_admission: student ? student.admission_number : 'Unknown'
      };
    });
    
    return attendanceWithNames;
  }
  
  // Get attendance by ID
  async getAttendanceById(id) {
    const attendance = mockData.attendance.find(a => a.id === parseInt(id));
    if (!attendance) return null;
    
    const student = mockData.students.find(s => s.id === attendance.student_id);
    return {
      ...attendance,
      student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown'
    };
  }
  
  // Mark attendance for a class
  async markClassAttendance(classId, date, attendanceList) {
    const students = mockData.getStudentsByClass(parseInt(classId));
    const recordedAttendance = [];
    
    for (const student of students) {
      const attendanceData = attendanceList.find(a => a.student_id === student.id);
      if (attendanceData) {
        const newAttendance = {
          id: mockData.getNextId('attendance'),
          student_id: student.id,
          date,
          status: attendanceData.status,
          check_in: attendanceData.check_in || null,
          check_out: attendanceData.check_out || null,
          term: attendanceData.term,
          term_name: attendanceData.term_name,
          academic_year: attendanceData.academic_year,
          remarks: attendanceData.remarks || ''
        };
        
        mockData.attendance.push(newAttendance);
        recordedAttendance.push(newAttendance);
      }
    }
    
    return recordedAttendance;
  }
  
  // Mark single student attendance
  async markStudentAttendance(attendanceData) {
    const newAttendance = {
      id: mockData.getNextId('attendance'),
      ...attendanceData,
      recorded_at: new Date().toISOString()
    };
    
    mockData.attendance.push(newAttendance);
    return newAttendance;
  }
  
  // Update attendance record
  async updateAttendance(id, updateData) {
    const index = mockData.attendance.findIndex(a => a.id === parseInt(id));
    if (index === -1) return null;
    
    mockData.attendance[index] = {
      ...mockData.attendance[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    return mockData.attendance[index];
  }
  
  // Get student attendance summary
  async getStudentAttendanceSummary(studentId, term, academicYear) {
    const student = mockData.students.find(s => s.id === parseInt(studentId));
    if (!student) return null;
    
    const attendance = mockData.attendance.filter(a => 
      a.student_id === parseInt(studentId) &&
      a.term === term &&
      a.academic_year === academicYear
    );
    
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const excused = attendance.filter(a => a.status === 'excused').length;
    const total = attendance.length;
    
    const attendanceRate = total > 0 ? ((present + excused) / total) * 100 : 0;
    
    return {
      student: {
        name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        class: student.class_id
      },
      term_info: {
        term,
        term_name: `Term ${term}`,
        academic_year
      },
      summary: {
        total_days: total,
        present,
        absent,
        late,
        excused,
        attendance_rate: attendanceRate.toFixed(2)
      },
      detailed_records: attendance
    };
  }
  
  // Get class attendance summary for a date range
  async getClassAttendanceSummary(classId, startDate, endDate, term, academicYear) {
    const students = mockData.getStudentsByClass(parseInt(classId));
    const classData = mockData.classes.find(c => c.id === parseInt(classId));
    
    const studentSummaries = students.map(student => {
      const attendance = mockData.attendance.filter(a => 
        a.student_id === student.id &&
        a.term === term &&
        a.academic_year === academicYear &&
        (!startDate || a.date >= startDate) &&
        (!endDate || a.date <= endDate)
      );
      
      const present = attendance.filter(a => a.status === 'present').length;
      const absent = attendance.filter(a => a.status === 'absent').length;
      const late = attendance.filter(a => a.status === 'late').length;
      const total = attendance.length;
      const rate = total > 0 ? (present / total) * 100 : 0;
      
      return {
        student_name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        present,
        absent,
        late,
        total_days: total,
        attendance_rate: rate.toFixed(2)
      };
    });
    
    const classAverage = studentSummaries.length > 0
      ? studentSummaries.reduce((sum, s) => sum + parseFloat(s.attendance_rate), 0) / studentSummaries.length
      : 0;
    
    return {
      class: classData.name,
      level: classData.level,
      period: { startDate, endDate },
      term,
      academic_year: academicYear,
      total_students: students.length,
      class_average_attendance: classAverage.toFixed(2),
      students: studentSummaries
    };
  }
}

module.exports = new AttendanceModel();
