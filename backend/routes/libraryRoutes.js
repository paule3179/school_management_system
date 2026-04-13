const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');

// Book routes
router.get('/books', libraryController.getAllBooks);
router.get('/books/search/:keyword', libraryController.searchBooks);
router.get('/books/categories', libraryController.getBookCategories);
router.get('/books/overdue', libraryController.getOverdueBooks);
router.get('/books/:id', libraryController.getBookById);
router.post('/books', libraryController.createBook);
router.put('/books/:id', libraryController.updateBook);
router.delete('/books/:id', libraryController.deleteBook);

// Borrow/Return routes
router.post('/borrow', libraryController.borrowBook);
router.put('/return/:borrowId', libraryController.returnBook);
router.get('/student/:studentId/history', libraryController.getStudentBorrowHistory);

module.exports = router;