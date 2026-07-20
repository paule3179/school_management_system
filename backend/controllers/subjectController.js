 // backend/controllers/subjectController.js
const pool = require('../config/database');

const subjectController = {
  async getAllSubjects(req, res) {
    try {
      const result = await pool.query('SELECT * FROM subjects ORDER BY name ASC');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  async getSubjectById(req, res) {
    try {
      const result = await pool.query('SELECT * FROM subjects WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Subject not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  async createSubject(req, res) {
    try {
      const { name, code, description } = req.body;
      const result = await pool.query(
        'INSERT INTO subjects (name, code, description) VALUES ($1, $2, $3) RETURNING *',
        [name, code, description]
      );
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  async updateSubject(req, res) {
    try {
      const { name, code, description } = req.body;
      const result = await pool.query(
        'UPDATE subjects SET name = $1, code = $2, description = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [name, code, description, req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Subject not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  async deleteSubject(req, res) {
    try {
      // Check if subject is used in any class
      const check = await pool.query('SELECT id FROM class_subjects WHERE subject_id = $1', [req.params.id]);
      if (check.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot delete subject that is assigned to classes' 
        });
      }
      
      const result = await pool.query('DELETE FROM subjects WHERE id = $1 RETURNING id', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Subject not found' });
      }
      res.json({ success: true, message: 'Subject deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = subjectController;