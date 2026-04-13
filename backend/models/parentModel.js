const mockData = require('../data/mockData');

class ParentModel {
  // Get all parents
  async getAllParents() {
    const parents = [...mockData.parents];
    
    // Add children info for each parent
    const parentsWithChildren = parents.map(parent => {
      const children = mockData.students.filter(s => s.parent_id === parent.id);
      return {
        ...parent,
        children_count: children.length,
        children: children.map(c => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          class_id: c.class_id,
          admission_number: c.admission_number
        }))
      };
    });
    
    return parentsWithChildren;
  }
  
  // Get parent by ID
  async getParentById(id) {
    const parent = mockData.parents.find(p => p.id === parseInt(id));
    if (!parent) return null;
    
    const children = mockData.students.filter(s => s.parent_id === parent.id);
    return {
      ...parent,
      children: children.map(c => ({
        ...c,
        full_name: `${c.first_name} ${c.last_name}`
      }))
    };
  }
  
  // Create new parent
  async createParent(parentData) {
    const newParent = {
      id: mockData.getNextId('parents'),
      ...parentData,
      created_at: new Date().toISOString()
    };
    
    mockData.parents.push(newParent);
    return newParent;
  }
  
  // Update parent
  async updateParent(id, updateData) {
    const index = mockData.parents.findIndex(p => p.id === parseInt(id));
    if (index === -1) return null;
    
    mockData.parents[index] = {
      ...mockData.parents[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    return mockData.parents[index];
  }
  
  // Delete parent
  async deleteParent(id) {
    const index = mockData.parents.findIndex(p => p.id === parseInt(id));
    if (index === -1) return false;
    
    // Check if parent has children
    const hasChildren = mockData.students.some(s => s.parent_id === parseInt(id));
    if (hasChildren) {
      throw new Error('Cannot delete parent with registered children');
    }
    
    mockData.parents.splice(index, 1);
    return true;
  }
  
  // Get parent dashboard (children's performance)
  async getParentDashboard(parentId) {
    const parent = await this.getParentById(parentId);
    if (!parent) return null;
    
    const childrenPerformance = parent.children.map(child => {
      const childGrades = mockData.grades.filter(g => g.student_id === child.id);
      const average = childGrades.length > 0 
        ? childGrades.reduce((sum, g) => sum + g.total_score, 0) / childGrades.length 
        : 0;
      const attendance = mockData.attendance.filter(a => a.student_id === child.id);
      const attendanceRate = attendance.length > 0
        ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100
        : 0;
      
      return {
        student_name: child.full_name,
        class: child.class_id,
        average_grade: average.toFixed(2),
        attendance_rate: attendanceRate.toFixed(2),
        recent_grades: childGrades.slice(0, 5)
      };
    });
    
    return {
      parent_info: {
        name: `${parent.first_name} ${parent.last_name}`,
        email: parent.email,
        phone: parent.phone
      },
      children: childrenPerformance
    };
  }
}

module.exports = new ParentModel();