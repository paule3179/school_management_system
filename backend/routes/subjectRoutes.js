// backend/routes/subjectRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, isAdmin } = require('../middleware/auth');

// ============================================
// GET ROUTES
// ============================================

// GET all subjects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subjects ORDER BY name ASC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET subjects by class name (distinct)
router.get('/class/:className', async (req, res) => {
  const className = req.params.className;
  console.log('Fetching subjects for class:', className);
  
  try {
    const query = `
      SELECT DISTINCT
        s.id,
        s.name,
        s.code,
        s.level,
        s.description
      FROM subjects s
      INNER JOIN class_subjects cs ON cs.subject_id = s.id
      INNER JOIN classes c ON c.id = cs.class_id
      WHERE c.class_name = $1
      ORDER BY s.name
    `;

    const result = await pool.query(query, [className]);
    console.log(`Found ${result.rows.length} subjects for class: ${className}`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching subjects by class name:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET class-subject mapping by class ID (distinct)
router.get('/class-subjects/:classId', async (req, res) => {
  const classId = req.params.classId;
  console.log('Fetching subjects for class ID:', classId);
  
  try {
    const query = `
      SELECT DISTINCT
        s.id,
        s.name,
        s.code,
        s.level,
        s.description
      FROM subjects s
      INNER JOIN class_subjects cs ON cs.subject_id = s.id
      WHERE cs.class_id = $1
      ORDER BY s.name
    `;

    const result = await pool.query(query, [classId]);
    console.log(`Found ${result.rows.length} subjects for class ID: ${classId}`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching class subjects:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET subjects by level
router.get('/level/:level', async (req, res) => {
  const level = req.params.level;
  console.log('Fetching subjects for level:', level);
  
  try {
    const query = `
      SELECT 
        id,
        name,
        code,
        level,
        description
      FROM subjects
      WHERE level = $1
      ORDER BY name
    `;

    const result = await pool.query(query, [level]);
    console.log(`Found ${result.rows.length} subjects for level: ${level}`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching subjects by level:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single subject
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM subjects WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET subjects with classes
router.get('/with-classes', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id,
        s.name,
        s.code,
        s.level,
        s.description,
        json_agg(DISTINCT jsonb_build_object(
          'class_id', c.id,
          'class_name', c.class_name,
          'level', c.level
        )) FILTER (WHERE c.id IS NOT NULL) AS classes
      FROM subjects s
      LEFT JOIN class_subjects cs ON cs.subject_id = s.id
      LEFT JOIN classes c ON c.id = cs.class_id
      GROUP BY s.id, s.name, s.code, s.level, s.description
      ORDER BY s.name
    `;

    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching subjects with classes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET subjects not assigned to any class
router.get('/unassigned/all', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id,
        s.name,
        s.code,
        s.level,
        s.description
      FROM subjects s
      LEFT JOIN class_subjects cs ON cs.subject_id = s.id
      WHERE cs.subject_id IS NULL
      ORDER BY s.name
    `;

    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching unassigned subjects:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// POST, PUT, DELETE ROUTES (Admin only)
// ============================================

// POST - Create new subject
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, code, level, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Subject name is required' });
    }
    
    // Check if subject already exists
    const existing = await pool.query('SELECT id FROM subjects WHERE name = $1', [name]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Subject already exists' });
    }
    
    const result = await pool.query(
      `INSERT INTO subjects (name, code, level, description, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW()) 
       RETURNING *`,
      [name, code || null, level || null, description || null]
    );
    
    res.status(201).json({ 
      success: true, 
      data: result.rows[0], 
      message: 'Subject created successfully' 
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Update subject
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, level, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Subject name is required' });
    }
    
    // Check if subject exists
    const existing = await pool.query('SELECT id FROM subjects WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    
    // Check for duplicate name (excluding current subject)
    const duplicate = await pool.query(
      'SELECT id FROM subjects WHERE name = $1 AND id != $2',
      [name, id]
    );
    if (duplicate.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Subject name already exists' });
    }
    
    const result = await pool.query(
      `UPDATE subjects 
       SET name = $1, code = $2, level = $3, description = $4, updated_at = NOW() 
       WHERE id = $5 
       RETURNING *`,
      [name, code || null, level || null, description || null, id]
    );
    
    res.json({ 
      success: true, 
      data: result.rows[0], 
      message: 'Subject updated successfully' 
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Delete subject
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if subject exists
    const existing = await pool.query('SELECT id, name FROM subjects WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    
    // Check if subject is used in class_subjects
    const inUse = await pool.query(
      'SELECT id FROM class_subjects WHERE subject_id = $1 LIMIT 1',
      [id]
    );
    
    if (inUse.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete subject that is assigned to classes. Remove it from classes first.' 
      });
    }
    
    await pool.query('DELETE FROM subjects WHERE id = $1', [id]);
    
    res.json({ 
      success: true, 
      message: `Subject "${existing.rows[0].name}" deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CLASS-SUBJECT MAPPING ROUTES (Admin only)
// ============================================

// POST - Assign subject to class
router.post('/assign', verifyToken, isAdmin, async (req, res) => {
  try {
    const { class_id, subject_id, teacher_id, academic_year } = req.body;
    
    if (!class_id || !subject_id) {
      return res.status(400).json({ success: false, error: 'Class ID and Subject ID are required' });
    }
    
    // Check if mapping already exists
    const existing = await pool.query(
      'SELECT id FROM class_subjects WHERE class_id = $1 AND subject_id = $2',
      [class_id, subject_id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Subject already assigned to this class' });
    }
    
    const result = await pool.query(
      `INSERT INTO class_subjects (class_id, subject_id, teacher_id, academic_year, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW()) 
       RETURNING *`,
      [class_id, subject_id, teacher_id || null, academic_year || null]
    );
    
    res.status(201).json({ 
      success: true, 
      data: result.rows[0], 
      message: 'Subject assigned to class successfully' 
    });
  } catch (error) {
    console.error('Error assigning subject to class:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Remove subject from class
router.delete('/unassign/:classId/:subjectId', verifyToken, isAdmin, async (req, res) => {
  try {
    const { classId, subjectId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM class_subjects WHERE class_id = $1 AND subject_id = $2 RETURNING id',
      [classId, subjectId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Mapping not found' });
    }
    
    res.json({ success: true, message: 'Subject removed from class successfully' });
  } catch (error) {
    console.error('Error removing subject from class:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;