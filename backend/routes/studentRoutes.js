const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.get('/', studentController.getAllStudents);
router.get('/search/:keyword', studentController.searchStudents);
router.get('/class/:classId', studentController.getStudentsByClass);
router.get('/:id', studentController.getStudentById);
router.post('/', studentController.createStudent);  // ← Make sure this exists
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

module.exports = router;