const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { isAdmin, isTeacher } = require('../middleware/auth');

router.use(isTeacher);

router.get('/', documentController.getAllDocuments);
router.get('/categories', documentController.getDocumentCategories);
router.get('/student/:studentId', documentController.getStudentDocuments);
router.get('/:id', documentController.getDocumentById);
router.post('/', documentController.uploadDocument);
router.put('/:id', documentController.updateDocument);
router.put('/:id/approve', isAdmin, documentController.approveDocument);
router.delete('/:id', isAdmin, documentController.deleteDocument);

module.exports = router;
