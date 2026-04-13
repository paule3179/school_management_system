const mockData = require('../data/mockData');

class TeacherModel {
  // Get all teachers
  async getAllTeachers(filters = {}) {
    let teachers = [...mockData.teachers];
    
    if (filters.status) {
      teachers = teachers.filter(t => t.status === filters.status);
    }
    if (filters.subject) {
      teachers = teachers.filter(t => t.subject_specialty === filters.subject);
    }
    
    // Add assigned class info
    const teachersWithClasses = teachers.map(teacher => {
      const assignedClass = mockData.classes.find(c => c.teacher_id === teacher.id);
      return {
        ...teacher,
        assigned_class: assignedClass ? assignedClass.name : 'Not assigned',
        class_id: assignedClass ? assignedClass.id : null
      };
    });
    
    return teachersWithClasses;
  }
  
  // Get teacher by ID
  async getTeacherById(id) {
    const teacher = mockData.teachers.find(t => t.id === parseInt(id));
    if (!teacher) return null;
    
    const assignedClass = mockData.classes.find(c => c.teacher_id === teacher.id);
    const students = assignedClass ? mockData.getStudentsByClass(assignedClass.id) : [];
    
    return {
      ...teacher,
      assigned_class: assignedClass ? assignedClass.name : null,
      students_teaching: students
    };
  }
  
  // Create new teacher
  async createTeacher(teacherData) {
    const newTeacher = {
      id: mockData.getNextId('teachers'),
      teacher_code: `TCH${String(mockData.teachers.length + 1).padStart(3, '0')}`,
      ...teacherData,
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    mockData.teachers.push(newTeacher);
    return newTeacher;
  }
  
  // Update teacher
  async updateTeacher(id, updateData) {
    const index = mockData.teachers.findIndex(t => t.id === parseInt(id));
    if (index === -1) return null;
    
    mockData.teachers[index] = {
      ...mockData.teachers[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    return mockData.teachers[index];
  }
  
  // Delete teacher
  async deleteTeacher(id) {
    const index = mockData.teachers.findIndex(t => t.id === parseInt(id));
    if (index === -1) return false;
    
    // Check if teacher is assigned to a class
    const hasClass = mockData.classes.some(c => c.teacher_id === parseInt(id));
    if (hasClass) {
      throw new Error('Cannot delete teacher assigned to a class');
    }
    
    mockData.teachers.splice(index, 1);
    return true;
  }
  
  // Get teacher's class schedule
  async getTeacherSchedule(teacherId) {
    const teacher = await this.getTeacherById(teacherId);
    if (!teacher) return null;
    
    // This would be expanded with actual timetable data
    return {
      teacher: `${teacher.first_name} ${teacher.last_name}`,
      assigned_class: teacher.assigned_class,
      subjects: teacher.subject_specialty
    };
  }
}

module.exports = new TeacherModel();