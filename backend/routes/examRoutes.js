const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { isAdmin } = require('../middleware/auth');

router.get('/', examController.getAllExams);
router.get('/:id', examController.getExamById);
router.get('/:id/timetable', examController.getExamTimetable);
router.get('/student/:studentId/:examId', examController.getStudentExamResults);
router.post('/', isAdmin, examController.createExam);
router.post('/timetable', isAdmin, examController.addExamTimetableEntry);
router.put('/:id', isAdmin, examController.updateExam);
router.delete('/:id', isAdmin, examController.deleteExam);

module.exports = router;
