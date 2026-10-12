const pool = require('../config/database');

class DocumentModel {
  async getAllDocuments(filters = {}) {
    const values = [];
    const conditions = [];
    for (const field of ['category', 'student_id', 'type']) {
      if (filters[field] !== undefined && filters[field] !== '') {
        values.push(field === 'student_id' ? Number(filters[field]) : filters[field]);
        conditions.push(`${field} = $${values.length}`);
      }
    }
    const result = await pool.query(`
      SELECT * FROM documents ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY upload_date DESC, id DESC
    `, values);
    return result.rows;
  }

  async getDocumentById(id) {
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async uploadDocument(data, userId) {
    if (typeof data.title !== 'string' || !data.title.trim() || typeof data.file_name !== 'string' || !data.file_name.trim()) {
      throw new Error('Document title and file name are required');
    }
    const result = await pool.query(`
      INSERT INTO documents (
        title, type, category, student_id, class_id, term, academic_year,
        uploaded_by, file_name, file_size, mime_type, file_url, status, target_audience
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending',$13)
      RETURNING *
    `, [data.title.trim(), data.type || null, data.category || null, data.student_id || null,
      data.class_id || null, data.term || null, data.academic_year || null, userId,
      data.file_name.trim(), data.file_size || null, data.mime_type || null,
      data.file_url || null, Array.isArray(data.target_audience) ? data.target_audience : []]);
    return result.rows[0];
  }

  async updateDocument(id, data) {
    const fields = ['title', 'type', 'category', 'student_id', 'class_id', 'term', 'academic_year', 'file_name', 'file_size', 'mime_type', 'file_url', 'target_audience'];
    const updates = fields.filter(field => data[field] !== undefined);
    if (!updates.length) return this.getDocumentById(id);
    const values = updates.map(field => data[field]);
    const result = await pool.query(`
      UPDATE documents SET ${updates.map((field, index) => `${field} = $${index + 1}`).join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.push(id)} RETURNING *
    `, values);
    return result.rows[0] || null;
  }

  async deleteDocument(id) {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  async getStudentDocuments(studentId) {
    const student = await pool.query(`
      SELECT id, first_name, last_name FROM students WHERE id = $1
    `, [studentId]);
    if (!student.rows[0]) return null;
    const documents = await pool.query('SELECT * FROM documents WHERE student_id = $1 ORDER BY upload_date DESC, id DESC', [studentId]);
    return {
      student: `${student.rows[0].first_name} ${student.rows[0].last_name}`,
      documents: documents.rows
    };
  }

  async getDocumentCategories() {
    const result = await pool.query("SELECT DISTINCT category FROM documents WHERE category IS NOT NULL AND category <> '' ORDER BY category");
    return result.rows.map(row => row.category);
  }

  async approveDocument(id, approvedBy) {
    const result = await pool.query(`
      UPDATE documents SET status = 'approved', approved_by = $1,
        approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 RETURNING *
    `, [approvedBy, id]);
    return result.rows[0] || null;
  }
}

module.exports = new DocumentModel();
