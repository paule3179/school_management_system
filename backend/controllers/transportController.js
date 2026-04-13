const transportModel = require('../models/transportModel');

const transportController = {
  // Vehicle routes
  // GET /api/transport/vehicles - Get all vehicles
  async getAllVehicles(req, res) {
    try {
      const { status, type } = req.query;
      const filters = { status, type };
      
      const vehicles = await transportModel.getAllVehicles(filters);
      res.json({ success: true, count: vehicles.length, data: vehicles });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/transport/vehicles/:id - Get single vehicle
  async getVehicleById(req, res) {
    try {
      const vehicle = await transportModel.getVehicleById(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ success: false, error: 'Vehicle not found' });
      }
      res.json({ success: true, data: vehicle });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/transport/vehicles - Create vehicle
  async createVehicle(req, res) {
    try {
      const newVehicle = await transportModel.createVehicle(req.body);
      res.status(201).json({ success: true, data: newVehicle });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // PUT /api/transport/vehicles/:id - Update vehicle
  async updateVehicle(req, res) {
    try {
      const updated = await transportModel.updateVehicle(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Vehicle not found' });
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // DELETE /api/transport/vehicles/:id - Delete vehicle
  async deleteVehicle(req, res) {
    try {
      const deleted = await transportModel.deleteVehicle(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Vehicle not found' });
      }
      res.json({ success: true, message: 'Vehicle deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
  
  // Route routes
  // GET /api/transport/routes - Get all routes
  async getAllRoutes(req, res) {
    try {
      const { active } = req.query;
      const filters = { active };
      
      const routes = await transportModel.getAllRoutes(filters);
      res.json({ success: true, count: routes.length, data: routes });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/transport/routes/:id - Get single route
  async getRouteById(req, res) {
    try {
      const route = await transportModel.getRouteById(req.params.id);
      if (!route) {
        return res.status(404).json({ success: false, error: 'Route not found' });
      }
      res.json({ success: true, data: route });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/transport/routes/:id/students - Get students on route
  async getRouteStudents(req, res) {
    try {
      const students = await transportModel.getRouteStudents(req.params.id);
      res.json({ success: true, count: students.length, data: students });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/transport/routes - Create route
  async createRoute(req, res) {
    try {
      const newRoute = await transportModel.createRoute(req.body);
      res.status(201).json({ success: true, data: newRoute });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // PUT /api/transport/routes/:id - Update route
  async updateRoute(req, res) {
    try {
      const updated = await transportModel.updateRoute(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Route not found' });
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // DELETE /api/transport/routes/:id - Delete route
  async deleteRoute(req, res) {
    try {
      const deleted = await transportModel.deleteRoute(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Route not found' });
      }
      res.json({ success: true, message: 'Route deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
  
  // Assignment routes
  // POST /api/transport/assign - Assign student to transport
  async assignStudent(req, res) {
    try {
      const assignment = await transportModel.assignStudent(req.body);
      res.status(201).json({ success: true, data: assignment });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // DELETE /api/transport/assign/:assignmentId - Remove assignment
  async removeAssignment(req, res) {
    try {
      const removed = await transportModel.removeAssignment(req.params.assignmentId);
      if (!removed) {
        return res.status(404).json({ success: false, error: 'Assignment not found' });
      }
      res.json({ success: true, message: 'Assignment removed successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/transport/student/:studentId - Get student transport info
  async getStudentTransport(req, res) {
    try {
      const { term, academic_year } = req.query;
      if (!term || !academic_year) {
        return res.status(400).json({ success: false, error: 'Term and academic year required' });
      }
      
      const info = await transportModel.getStudentTransport(req.params.studentId, parseInt(term), academic_year);
      if (!info) {
        return res.status(404).json({ success: false, error: 'Transport info not found for this student' });
      }
      res.json({ success: true, data: info });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = transportController;