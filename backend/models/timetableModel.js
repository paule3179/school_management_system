const mockData = require('../data/mockData');

class TimetableModel {
  // Get all timetables
  async getAllTimetables(filters = {}) {
    let timetables = [...mockData.timetables];
    
    if (filters.class_id) {
      timetables = timetables.filter(t => t.class_id === parseInt(filters.class_id));
    }
    if (filters.day) {
      timetables = timetables.filter(t => t.day === filters.day);
    }
    
    const timetablesWithDetails = timetables.map(timetable => {
      const classData = mockData.classes.find(c => c.id === timetable.class_id);
      return {
        ...timetable,
        class_name: classData ? classData.name : 'Unknown'
      };
    });
    
    return timetablesWithDetails;
  }
  
  // Get timetable by ID
  async getTimetableById(id) {
    const timetable = mockData.timetables.find(t => t.id === parseInt(id));
    if (!timetable) return null;
    
    const classData = mockData.classes.find(c => c.id === timetable.class_id);
    return {
      ...timetable,
      class_name: classData ? classData.name : 'Unknown'
    };
  }
  
  // Get timetable for a class
  async getClassTimetable(classId) {
    const timetables = mockData.timetables.filter(t => t.class_id === parseInt(classId));
    if (!timetables.length) return null;
    
    const classData = mockData.classes.find(c => c.id === parseInt(classId));
    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    
    const weeklyTimetable = weekDays.map(day => {
      const daySchedule = timetables.find(t => t.day === day);
      return {
        day,
        periods: daySchedule ? daySchedule.periods : []
      };
    });
    
    return {
      class_id: parseInt(classId),
      class_name: classData ? classData.name : 'Unknown',
      level: classData ? classData.level : 'Unknown',
      weekly_schedule: weeklyTimetable
    };
  }
  
  // Create new timetable
  async createTimetable(timetableData) {
    const newTimetable = {
      id: mockData.getNextId('timetables'),
      ...timetableData,
      created_at: new Date().toISOString()
    };
    mockData.timetables.push(newTimetable);
    return newTimetable;
  }
  
  // Update timetable
  async updateTimetable(id, updateData) {
    const index = mockData.timetables.findIndex(t => t.id === parseInt(id));
    if (index === -1) return null;
    
    mockData.timetables[index] = {
      ...mockData.timetables[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    return mockData.timetables[index];
  }
  
  // Delete timetable
  async deleteTimetable(id) {
    const index = mockData.timetables.findIndex(t => t.id === parseInt(id));
    if (index === -1) return false;
    
    mockData.timetables.splice(index, 1);
    return true;
  }
  
  // Get teacher's timetable
  async getTeacherTimetable(teacherId) {
    const timetables = mockData.timetables.filter(t => 
      t.periods.some(p => p.teacher_id === parseInt(teacherId))
    );
    
    return timetables.map(timetable => {
      const classData = mockData.classes.find(c => c.id === timetable.class_id);
      const teacherPeriods = timetable.periods.filter(p => p.teacher_id === parseInt(teacherId));
      
      return {
        day: timetable.day,
        class_name: classData ? classData.name : 'Unknown',
        periods: teacherPeriods
      };
    });
  }
}

module.exports = new TimetableModel();