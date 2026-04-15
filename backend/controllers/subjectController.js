const pool = require('../config/database');

const subjectController = {
  // GET /api/subjects - Get all subjects
  async getAllSubjects(req, res) {
    try {
      const result = await pool.query(`
        SELECT * FROM subjects 
        ORDER BY 
          CASE level 
            WHEN 'KG' THEN 1 
            WHEN 'Primary' THEN 2 
            WHEN 'JHS' THEN 3 
          END, 
          name
      `);
      
      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      console.error('Error in getAllSubjects:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/subjects/level/:level - Get subjects by level
  async getSubjectsByLevel(req, res) {
    try {
      const { level } = req.params;
      const validLevels = ['KG', 'Primary', 'JHS'];
      
      if (!validLevels.includes(level)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid level. Must be KG, Primary, or JHS'
        });
      }
      
      const result = await pool.query(`
        SELECT * FROM subjects 
        WHERE level = $1 
        ORDER BY name
      `, [level]);
      
      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      console.error('Error in getSubjectsByLevel:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/subjects/:id - Get single subject by ID
  async getSubjectById(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT * FROM subjects WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Subject not found'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error in getSubjectById:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // POST /api/subjects - Create new subject
  async createSubject(req, res) {
    try {
      const { name, level, code, description } = req.body;
      
      // Validate required fields
      if (!name || !level || !code) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, level, code'
        });
      }
      
      // Check if subject code already exists
      const existing = await pool.query('SELECT id FROM subjects WHERE code = $1', [code]);
      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Subject code already exists'
        });
      }
      
      const result = await pool.query(`
        INSERT INTO subjects (name, level, code, description)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [name, level, code, description || null]);
      
      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Subject created successfully'
      });
    } catch (error) {
      console.error('Error in createSubject:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // PUT /api/subjects/:id - Update subject
  async updateSubject(req, res) {
    try {
      const { id } = req.params;
      const { name, level, code, description } = req.body;
      
      const result = await pool.query(`
        UPDATE subjects 
        SET name = COALESCE($1, name),
            level = COALESCE($2, level),
            code = COALESCE($3, code),
            description = COALESCE($4, description)
        WHERE id = $5
        RETURNING *
      `, [name, level, code, description, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Subject not found'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0],
        message: 'Subject updated successfully'
      });
    } catch (error) {
      console.error('Error in updateSubject:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // DELETE /api/subjects/:id - Delete subject
  async deleteSubject(req, res) {
    try {
      const { id } = req.params;
      
      // Check if subject is being used in grades
      const gradeCheck = await pool.query('SELECT id FROM grades WHERE subject = (SELECT name FROM subjects WHERE id = $1) LIMIT 1', [id]);
      if (gradeCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete subject that has grades recorded'
        });
      }
      
      const result = await pool.query('DELETE FROM subjects WHERE id = $1 RETURNING *', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Subject not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Subject deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteSubject:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/subjects/class/:classId - Get subjects for a specific class based on its level
  async getSubjectsByClass(req, res) {
    try {
      const { classId } = req.params;
      
      // Get the class level
      const classResult = await pool.query('SELECT level FROM classes WHERE id = $1', [classId]);
      
      if (classResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Class not found'
        });
      }
      
      const level = classResult.rows[0].level;
      
      // Get subjects for that level
      const subjectsResult = await pool.query(`
        SELECT * FROM subjects 
        WHERE level = $1 
        ORDER BY name
      `, [level]);
      
      res.json({
        success: true,
        count: subjectsResult.rows.length,
        data: subjectsResult.rows
      });
    } catch (error) {
      console.error('Error in getSubjectsByClass:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = subjectController;