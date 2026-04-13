const mockData = require('../data/mockData');

class LibraryModel {
  // Get all books
  async getAllBooks(filters = {}) {
    let books = [...mockData.books];
    
    if (filters.category) {
      books = books.filter(b => b.category === filters.category);
    }
    if (filters.author) {
      books = books.filter(b => b.author.toLowerCase().includes(filters.author.toLowerCase()));
    }
    if (filters.status) {
      books = books.filter(b => b.status === filters.status);
    }
    
    return books;
  }
  
  // Get book by ID
  async getBookById(id) {
    const book = mockData.books.find(b => b.id === parseInt(id));
    if (!book) return null;
    
    const borrowHistory = mockData.borrow_records.filter(br => br.book_id === book.id);
    return {
      ...book,
      borrow_history: borrowHistory
    };
  }
  
  // Create new book
  async createBook(bookData) {
    const newBook = {
      id: mockData.getNextId('books'),
      ...bookData,
      available: bookData.quantity,
      status: 'available',
      added_date: new Date().toISOString().split('T')[0]
    };
    mockData.books.push(newBook);
    return newBook;
  }
  
  // Update book
  async updateBook(id, updateData) {
    const index = mockData.books.findIndex(b => b.id === parseInt(id));
    if (index === -1) return null;
    
    mockData.books[index] = {
      ...mockData.books[index],
      ...updateData,
      updated_at: new Date().toISOString().split('T')[0]
    };
    return mockData.books[index];
  }
  
  // Delete book
  async deleteBook(id) {
    const index = mockData.books.findIndex(b => b.id === parseInt(id));
    if (index === -1) return false;
    
    const hasActiveBorrow = mockData.borrow_records.some(br => 
      br.book_id === parseInt(id) && br.status === 'borrowed'
    );
    if (hasActiveBorrow) {
      throw new Error('Cannot delete book with active borrow records');
    }
    
    mockData.books.splice(index, 1);
    return true;
  }
  
  // Borrow book
  async borrowBook(borrowData) {
    const book = await this.getBookById(borrowData.book_id);
    if (!book) throw new Error('Book not found');
    if (book.available <= 0) throw new Error('No copies available');
    
    const newBorrow = {
      id: mockData.getNextId('borrow_records'),
      ...borrowData,
      borrow_date: new Date().toISOString().split('T')[0],
      status: 'borrowed',
      fine: 0
    };
    
    mockData.borrow_records.push(newBorrow);
    
    // Update book availability
    const bookIndex = mockData.books.findIndex(b => b.id === borrowData.book_id);
    mockData.books[bookIndex].available--;
    
    return newBorrow;
  }
  
  // Return book
  async returnBook(borrowId, returnData) {
    const index = mockData.borrow_records.findIndex(br => br.id === parseInt(borrowId));
    if (index === -1) throw new Error('Borrow record not found');
    
    const borrow = mockData.borrow_records[index];
    const returnDate = new Date();
    const dueDate = new Date(borrow.due_date);
    
    let fine = 0;
    if (returnDate > dueDate) {
      const daysLate = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
      fine = daysLate * 1.00; // GHS 1 per day late
    }
    
    borrow.return_date = returnData.return_date || new Date().toISOString().split('T')[0];
    borrow.status = fine > 0 ? 'returned_late' : 'returned';
    borrow.fine = fine;
    borrow.remarks = returnData.remarks || '';
    
    // Update book availability
    const bookIndex = mockData.books.findIndex(b => b.id === borrow.book_id);
    if (bookIndex !== -1) {
      mockData.books[bookIndex].available++;
    }
    
    return borrow;
  }
  
  // Get student borrow history
  async getStudentBorrowHistory(studentId) {
    const borrows = mockData.borrow_records.filter(br => br.student_id === parseInt(studentId));
    
    const borrowsWithDetails = borrows.map(borrow => {
      const book = mockData.books.find(b => b.id === borrow.book_id);
      return {
        ...borrow,
        book_title: book ? book.title : 'Unknown',
        book_author: book ? book.author : 'Unknown'
      };
    });
    
    return borrowsWithDetails;
  }
  
  // Get book categories
  async getBookCategories() {
    return mockData.book_categories;
  }
  
  // Search books
  async searchBooks(keyword) {
    const keywordLower = keyword.toLowerCase();
    return mockData.books.filter(b => 
      b.title.toLowerCase().includes(keywordLower) ||
      b.author.toLowerCase().includes(keywordLower) ||
      b.isbn.includes(keyword)
    );
  }
  
  // Get overdue books
  async getOverdueBooks() {
    const today = new Date().toISOString().split('T')[0];
    const overdueBorrows = mockData.borrow_records.filter(br => 
      br.status === 'borrowed' && br.due_date < today
    );
    
    const overdueWithDetails = overdueBorrows.map(borrow => {
      const book = mockData.books.find(b => b.id === borrow.book_id);
      const student = mockData.students.find(s => s.id === borrow.student_id);
      return {
        ...borrow,
        book_title: book ? book.title : 'Unknown',
        student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
        days_overdue: Math.ceil((new Date(today) - new Date(borrow.due_date)) / (1000 * 60 * 60 * 24))
      };
    });
    
    return overdueWithDetails;
  }
}

module.exports = new LibraryModel();