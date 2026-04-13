const libraryModel = require('../models/libraryModel');

const libraryController = {
  // GET /api/library/books - Get all books
  async getAllBooks(req, res) {
    try {
      const { category, author, status } = req.query;
      const filters = { category, author, status };
      
      const books = await libraryModel.getAllBooks(filters);
      res.json({ success: true, count: books.length, data: books });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/library/books/search/:keyword - Search books
  async searchBooks(req, res) {
    try {
      const books = await libraryModel.searchBooks(req.params.keyword);
      res.json({ success: true, count: books.length, data: books });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/library/books/categories - Get book categories
  async getBookCategories(req, res) {
    try {
      const categories = await libraryModel.getBookCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/library/books/overdue - Get overdue books
  async getOverdueBooks(req, res) {
    try {
      const overdue = await libraryModel.getOverdueBooks();
      res.json({ success: true, count: overdue.length, data: overdue });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/library/books/:id - Get single book
  async getBookById(req, res) {
    try {
      const book = await libraryModel.getBookById(req.params.id);
      if (!book) {
        return res.status(404).json({ success: false, error: 'Book not found' });
      }
      res.json({ success: true, data: book });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/library/books - Create book
  async createBook(req, res) {
    try {
      const newBook = await libraryModel.createBook(req.body);
      res.status(201).json({ success: true, data: newBook });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // PUT /api/library/books/:id - Update book
  async updateBook(req, res) {
    try {
      const updated = await libraryModel.updateBook(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Book not found' });
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // DELETE /api/library/books/:id - Delete book
  async deleteBook(req, res) {
    try {
      const deleted = await libraryModel.deleteBook(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Book not found' });
      }
      res.json({ success: true, message: 'Book deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/library/borrow - Borrow book
  async borrowBook(req, res) {
    try {
      const borrow = await libraryModel.borrowBook(req.body);
      res.status(201).json({ success: true, data: borrow });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
  
  // PUT /api/library/return/:borrowId - Return book
  async returnBook(req, res) {
    try {
      const returned = await libraryModel.returnBook(req.params.borrowId, req.body);
      res.json({ success: true, data: returned });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/library/student/:studentId/history - Get student borrow history
  async getStudentBorrowHistory(req, res) {
    try {
      const history = await libraryModel.getStudentBorrowHistory(req.params.studentId);
      res.json({ success: true, count: history.length, data: history });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = libraryController;