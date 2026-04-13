const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');

router.get('/', gradeController.getAllGrades);
router.get('/report-card/:studentId', gradeController.getStudentReportCard);
router.get('/class-performance/:classId', gradeController.getClassPerformance);
router.get('/:id', gradeController.getGradeById);
router.post('/', gradeController.createGrade);
router.put('/:id', gradeController.updateGrade);
router.delete('/:id', gradeController.deleteGrade);

module.exports = router;