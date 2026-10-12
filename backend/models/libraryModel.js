const pool = require('../config/database');
const settingsModel = require('./settingsModel');

class LibraryModel {
  async getAllBooks(filters = {}) {
    const values = [];
    const conditions = ["status <> 'removed'"];
    if (filters.category) { values.push(filters.category); conditions.push(`category = $${values.length}`); }
    if (filters.author) { values.push(`%${filters.author}%`); conditions.push(`author ILIKE $${values.length}`); }
    if (filters.status) { values.push(filters.status); conditions.push(`status = $${values.length}`); }
    const result = await pool.query(`SELECT * FROM books WHERE ${conditions.join(' AND ')} ORDER BY title`, values);
    return result.rows;
  }

  async getBookById(id) {
    const book = await pool.query("SELECT * FROM books WHERE id = $1 AND status <> 'removed'", [id]);
    if (!book.rows[0]) return null;
    const history = await pool.query(`
      SELECT * FROM borrow_records WHERE book_id = $1 ORDER BY borrow_date DESC, id DESC
    `, [id]);
    return { ...book.rows[0], borrow_history: history.rows };
  }

  async createBook(data) {
    const quantity = Number(data.quantity);
    if (typeof data.title !== 'string' || !data.title.trim() || !Number.isInteger(quantity) || quantity < 0) {
      throw new Error('Book title and a non-negative whole-number quantity are required');
    }
    const result = await pool.query(`
      INSERT INTO books (isbn, title, author, publisher, publication_year, category, quantity, available, location, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,'available') RETURNING *
    `, [data.isbn || null, data.title.trim(), data.author || null, data.publisher || null,
      data.publication_year || null, data.category || null, quantity, data.location || null]);
    return result.rows[0];
  }

  async updateBook(id, data) {
    const fields = ['isbn', 'title', 'author', 'publisher', 'publication_year', 'category', 'quantity', 'location', 'status'];
    const updates = fields.filter(field => data[field] !== undefined);
    if (updates.length === 0) return this.getBookById(id);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query('SELECT quantity, available FROM books WHERE id = $1 FOR UPDATE', [id]);
      if (!current.rows[0]) { await client.query('ROLLBACK'); return null; }
      const values = updates.map(field => data[field]);
      const quantityIndex = updates.indexOf('quantity');
      if (quantityIndex >= 0) {
        const quantity = Number(data.quantity);
        if (!Number.isInteger(quantity) || quantity < 0 || quantity < current.rows[0].quantity - current.rows[0].available) {
          throw new Error('Quantity cannot be lower than the number of borrowed copies');
        }
        values[quantityIndex] = quantity;
      }
      const setSql = updates.map((field, index) => `${field} = $${index + 1}`);
      if (quantityIndex >= 0) setSql.push(`available = available + ($${quantityIndex + 1} - quantity)`);
      values.push(id);
      const result = await client.query(`UPDATE books SET ${setSql.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`, values);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async deleteBook(id) {
    const activeLoans = await pool.query("SELECT 1 FROM borrow_records WHERE book_id = $1 AND status = 'borrowed' LIMIT 1", [id]);
    if (activeLoans.rows.length) throw new Error('Cannot delete a book with active borrow records');
    const result = await pool.query("UPDATE books SET status = 'removed', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id", [id]);
    return result.rowCount > 0;
  }

  async borrowBook(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const book = await client.query("SELECT id, available FROM books WHERE id = $1 AND status <> 'removed' FOR UPDATE", [data.book_id]);
      if (!book.rows[0]) throw new Error('Book not found');
      if (book.rows[0].available < 1) throw new Error('No copies available');
      const student = await client.query('SELECT id FROM students WHERE id = $1', [data.student_id]);
      if (!student.rows[0]) throw new Error('Student not found');
      const result = await client.query(`
        INSERT INTO borrow_records (book_id, student_id, borrow_date, due_date, status, fine, remarks)
        VALUES ($1, $2, CURRENT_DATE, $3, 'borrowed', 0, $4) RETURNING *
      `, [data.book_id, data.student_id, data.due_date, data.remarks || null]);
      await client.query('UPDATE books SET available = available - 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [data.book_id]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async returnBook(borrowId, returnData = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`
        SELECT br.*, b.id AS locked_book_id FROM borrow_records br
        JOIN books b ON b.id = br.book_id
        WHERE br.id = $1 AND br.status = 'borrowed' FOR UPDATE OF br, b
      `, [borrowId]);
      const loan = result.rows[0];
      if (!loan) throw new Error('Active borrow record not found');
      const returnDate = returnData.return_date ? new Date(returnData.return_date) : new Date();
      const dueDate = new Date(loan.due_date);
      const daysLate = Math.max(0, Math.ceil((returnDate - dueDate) / 86400000));
      const fine = daysLate * await settingsModel.getDailyFineRate();
      const updated = await client.query(`
        UPDATE borrow_records
        SET return_date = $1, status = $2, fine = $3, remarks = COALESCE($4, remarks)
        WHERE id = $5 RETURNING *
      `, [returnDate.toISOString().slice(0, 10), fine > 0 ? 'returned_late' : 'returned', fine, returnData.remarks || null, borrowId]);
      await client.query('UPDATE books SET available = available + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [loan.book_id]);
      await client.query('COMMIT');
      return updated.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async getStudentBorrowHistory(studentId) {
    const result = await pool.query(`
      SELECT br.*, b.title AS book_title, b.author AS book_author
      FROM borrow_records br JOIN books b ON b.id = br.book_id
      WHERE br.student_id = $1 ORDER BY br.borrow_date DESC, br.id DESC
    `, [studentId]);
    return result.rows;
  }

  async getBookCategories() {
    const result = await pool.query("SELECT DISTINCT category FROM books WHERE category IS NOT NULL AND category <> '' ORDER BY category");
    return result.rows.map(row => row.category);
  }

  async searchBooks(keyword) {
    const term = `%${keyword}%`;
    const result = await pool.query(`
      SELECT * FROM books WHERE status <> 'removed'
        AND (title ILIKE $1 OR author ILIKE $1 OR isbn ILIKE $1)
      ORDER BY title
    `, [term]);
    return result.rows;
  }

  async getOverdueBooks() {
    const result = await pool.query(`
      SELECT br.*, b.title AS book_title,
             CONCAT_WS(' ', s.first_name, s.last_name) AS student_name,
             CURRENT_DATE - br.due_date AS days_overdue
      FROM borrow_records br
      JOIN books b ON b.id = br.book_id
      JOIN students s ON s.id = br.student_id
      WHERE br.status = 'borrowed' AND br.due_date < CURRENT_DATE
      ORDER BY br.due_date
    `);
    return result.rows;
  }
}

module.exports = new LibraryModel();
