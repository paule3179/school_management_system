const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');

// Vehicle routes
router.get('/vehicles', transportController.getAllVehicles);
router.get('/vehicles/:id', transportController.getVehicleById);
router.post('/vehicles', transportController.createVehicle);
router.put('/vehicles/:id', transportController.updateVehicle);
router.delete('/vehicles/:id', transportController.deleteVehicle);

// Route routes
router.get('/routes', transportController.getAllRoutes);
router.get('/routes/:id', transportController.getRouteById);
router.get('/routes/:id/students', transportController.getRouteStudents);
router.post('/routes', transportController.createRoute);
router.put('/routes/:id', transportController.updateRoute);
router.delete('/routes/:id', transportController.deleteRoute);

// Assignment routes
router.post('/assign', transportController.assignStudent);
router.delete('/assign/:assignmentId', transportController.removeAssignment);
router.get('/student/:studentId', transportController.getStudentTransport);

module.exports = router;