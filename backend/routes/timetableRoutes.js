const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');

router.get('/', timetableController.getAllTimetables);
router.get('/class/:classId', timetableController.getClassTimetable);
router.get('/teacher/:teacherId', timetableController.getTeacherTimetable);
router.get('/:id', timetableController.getTimetableById);
router.post('/', timetableController.createTimetable);
router.put('/:id', timetableController.updateTimetable);
router.delete('/:id', timetableController.deleteTimetable);

module.exports = router;