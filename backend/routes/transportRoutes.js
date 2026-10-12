const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');
const { hasRole, isAdmin, isTeacher } = require('../middleware/auth');

// Vehicle routes
router.get('/vehicles', isTeacher, transportController.getAllVehicles);
router.get('/vehicles/:id', isTeacher, transportController.getVehicleById);
router.post('/vehicles', isAdmin, transportController.createVehicle);
router.put('/vehicles/:id', isAdmin, transportController.updateVehicle);
router.delete('/vehicles/:id', isAdmin, transportController.deleteVehicle);

// Route routes
router.get('/routes', isTeacher, transportController.getAllRoutes);
router.get('/routes/:id', isTeacher, transportController.getRouteById);
router.get('/routes/:id/students', isTeacher, transportController.getRouteStudents);
router.post('/routes', isAdmin, transportController.createRoute);
router.put('/routes/:id', isAdmin, transportController.updateRoute);
router.delete('/routes/:id', isAdmin, transportController.deleteRoute);

// Assignment routes
router.post('/assign', isAdmin, transportController.assignStudent);
router.delete('/assign/:assignmentId', isAdmin, transportController.removeAssignment);
router.get('/student/:studentId', hasRole('admin', 'teacher', 'parent'), transportController.getStudentTransport);

module.exports = router;
