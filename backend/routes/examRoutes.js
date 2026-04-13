const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');

router.get('/', examController.getAllExams);
router.get('/:id', examController.getExamById);
router.get('/:id/timetable', examController.getExamTimetable);
router.get('/student/:studentId/:examId', examController.getStudentExamResults);
router.post('/', examController.createExam);
router.post('/timetable', examController.addExamTimetableEntry);
router.put('/:id', examController.updateExam);
router.delete('/:id', examController.deleteExam);

module.exports = router;