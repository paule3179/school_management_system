const mockData = require('../data/mockData');

class TransportModel {
  // Get all vehicles
  async getAllVehicles(filters = {}) {
    let vehicles = [...mockData.vehicles];
    
    if (filters.status) {
      vehicles = vehicles.filter(v => v.status === filters.status);
    }
    if (filters.type) {
      vehicles = vehicles.filter(v => v.type === filters.type);
    }
    
    return vehicles;
  }
  
  // Get vehicle by ID
  async getVehicleById(id) {
    const vehicle = mockData.vehicles.find(v => v.id === parseInt(id));
    if (!vehicle) return null;
    
    const route = mockData.transport_routes.find(r => r.vehicle_id === vehicle.id);
    const assignments = mockData.transport_assignments.filter(a => a.vehicle_id === vehicle.id);
    
    return {
      ...vehicle,
      route: route ? route.name : 'Not assigned',
      assignments_count: assignments.length
    };
  }
  
  // Create new vehicle
  async createVehicle(vehicleData) {
    const newVehicle = {
      id: mockData.getNextId('vehicles'),
      ...vehicleData,
      created_at: new Date().toISOString().split('T')[0]
    };
    mockData.vehicles.push(newVehicle);
    return newVehicle;
  }
  
  // Update vehicle
  async updateVehicle(id, updateData) {
    const index = mockData.vehicles.findIndex(v => v.id === parseInt(id));
    if (index === -1) return null;
    
    mockData.vehicles[index] = {
      ...mockData.vehicles[index],
      ...updateData,
      updated_at: new Date().toISOString().split('T')[0]
    };
    return mockData.vehicles[index];
  }
  
  // Delete vehicle
  async deleteVehicle(id) {
    const index = mockData.vehicles.findIndex(v => v.id === parseInt(id));
    if (index === -1) return false;
    
    const hasAssignments = mockData.transport_assignments.some(a => a.vehicle_id === parseInt(id));
    if (hasAssignments) {
      throw new Error('Cannot delete vehicle with active assignments');
    }
    
    mockData.vehicles.splice(index, 1);
    return true;
  }
  
  // Get all routes
  async getAllRoutes(filters = {}) {
    let routes = [...mockData.transport_routes];
    
    if (filters.active !== undefined) {
      routes = routes.filter(r => r.active === (filters.active === 'true'));
    }
    
    return routes;
  }
  
  // Get route by ID
  async getRouteById(id) {
    const route = mockData.transport_routes.find(r => r.id === parseInt(id));
    if (!route) return null;
    
    const vehicle = mockData.vehicles.find(v => v.id === route.vehicle_id);
    const assignments = mockData.transport_assignments.filter(a => a.route_id === route.id);
    const students = assignments.map(a => {
      const student = mockData.students.find(s => s.id === a.student_id);
      return student ? `${student.first_name} ${student.last_name}` : null;
    }).filter(s => s);
    
    return {
      ...route,
      vehicle_info: vehicle,
      students_count: assignments.length,
      students_list: students
    };
  }
  
  // Create new route
  async createRoute(routeData) {
    const newRoute = {
      id: mockData.getNextId('transport_routes'),
      ...routeData,
      created_at: new Date().toISOString().split('T')[0]
    };
    mockData.transport_routes.push(newRoute);
    return newRoute;
  }
  
  // Update route
  async updateRoute(id, updateData) {
    const index = mockData.transport_routes.findIndex(r => r.id === parseInt(id));
    if (index === -1) return null;
    
    mockData.transport_routes[index] = {
      ...mockData.transport_routes[index],
      ...updateData,
      updated_at: new Date().toISOString().split('T')[0]
    };
    return mockData.transport_routes[index];
  }
  
  // Delete route
  async deleteRoute(id) {
    const index = mockData.transport_routes.findIndex(r => r.id === parseInt(id));
    if (index === -1) return false;
    
    const hasAssignments = mockData.transport_assignments.some(a => a.route_id === parseInt(id));
    if (hasAssignments) {
      throw new Error('Cannot delete route with active assignments');
    }
    
    mockData.transport_routes.splice(index, 1);
    return true;
  }
  
  // Assign student to transport
  async assignStudent(assignmentData) {
    const newAssignment = {
      id: mockData.getNextId('transport_assignments'),
      ...assignmentData,
      status: 'active',
      created_at: new Date().toISOString().split('T')[0]
    };
    mockData.transport_assignments.push(newAssignment);
    return newAssignment;
  }
  
  // Remove student assignment
  async removeAssignment(assignmentId) {
    const index = mockData.transport_assignments.findIndex(a => a.id === parseInt(assignmentId));
    if (index === -1) return false;
    
    mockData.transport_assignments[index].status = 'inactive';
    mockData.transport_assignments[index].ended_at = new Date().toISOString().split('T')[0];
    return true;
  }
  
  // Get student transport info
  async getStudentTransport(studentId, term, academicYear) {
    const assignment = mockData.transport_assignments.find(a => 
      a.student_id === parseInt(studentId) && 
      a.term === term && 
      a.academic_year === academicYear &&
      a.status === 'active'
    );
    
    if (!assignment) return null;
    
    const route = await this.getRouteById(assignment.route_id);
    const vehicle = await this.getVehicleById(assignment.vehicle_id);
    
    const student = mockData.students.find(s => s.id === parseInt(studentId));
    
    return {
      student: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
      route: route ? route.name : 'Unknown',
      pickup_point: assignment.pickup_point,
      dropoff_point: assignment.dropoff_point,
      morning_pickup: route ? route.morning_pickup : 'N/A',
      afternoon_dropoff: route ? route.afternoon_dropoff : 'N/A',
      vehicle: vehicle ? {
        registration: vehicle.registration_number,
        driver: vehicle.driver_name,
        driver_phone: vehicle.driver_phone
      } : null
    };
  }
  
  // Get route students list
  async getRouteStudents(routeId) {
    const assignments = mockData.transport_assignments.filter(a => 
      a.route_id === parseInt(routeId) && a.status === 'active'
    );
    
    const students = assignments.map(assignment => {
      const student = mockData.students.find(s => s.id === assignment.student_id);
      return {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        pickup_point: assignment.pickup_point,
        dropoff_point: assignment.dropoff_point,
        parent_phone: student.parent_phone
      };
    });
    
    return students;
  }
}

module.exports = new TransportModel();