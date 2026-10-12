const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { jwtSecret: JWT_SECRET } = require('../config/secrets');

// ============================================
// VERIFY TOKEN - Check if user is authenticated
// ============================================
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Some routers verify the token again after the app-level middleware has
    // already attached teacher/parent access context. Preserve that trusted
    // server-side context while refreshing identity fields from the signed token.
    req.user = { ...(req.user || {}), ...decoded };
    
    // Log user for debugging
    console.log('🔐 User authenticated:', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    });
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid token.'
    });
  }
};

// ============================================
// OPTIONAL AUTH - Verifies token if present
// ============================================
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { ...(req.user || {}), ...decoded };
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};

// ============================================
// IS ADMIN
// ============================================
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

// ============================================
// IS TEACHER
// ============================================
const isTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Teacher access required'
    });
  }
  next();
};

// ============================================
// IS PARENT
// ============================================
const isParent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  if (req.user.role !== 'parent' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Parent access required'
    });
  }
  next();
};

// ============================================
// IS STUDENT
// ============================================
const isStudent = (req, res, next) => {
  if (!req.user || (req.user.role !== 'student' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      error: 'Student access required'
    });
  }
  next();
};

// ============================================
// HAS ROLE - Flexible role checking
// ============================================
const hasRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }
    
    next();
  };
};

// ============================================
// ENRICH USER WITH ROLE-BASED FILTER IDS - FIXED
// ============================================
const enrichUserContext = async (req, res, next) => {
  if (!req.user) {
    console.log('⚠️ No user found in request, skipping enrichment');
    return next();
  }

  try {
    console.log(`🔍 Enriching user context for: ${req.user.role} (ID: ${req.user.id}, Email: ${req.user.email})`);
    
    // TEACHER ENRICHMENT
    if (req.user.role === 'teacher') {
      // Try to find teacher by user_id first
      let result = await pool.query(
        'SELECT * FROM teachers WHERE user_id = $1',
        [req.user.id]
      );
      
      // If not found, try by email
      if (result.rows.length === 0 && req.user.email) {
        console.log(`🔍 Teacher not found by user_id, trying by email: ${req.user.email}`);
        result = await pool.query(
          'SELECT * FROM teachers WHERE email = $1 OR email = $2',
          [req.user.email, req.user.email.toLowerCase()]
        );
      }
      
      if (result.rows.length > 0) {
        const teacher = result.rows[0];
        req.user.teacher_id = teacher.id;
        req.user.teacher = teacher;
        
        console.log(`✅ Teacher found: ${teacher.first_name} ${teacher.last_name} (ID: ${teacher.id})`);
        
        // Get assigned class IDs
        const classesResult = await pool.query(
          `SELECT class_id FROM teacher_classes
           WHERE teacher_id = $1 AND COALESCE(is_active, true) = true
           UNION
           SELECT id AS class_id FROM classes WHERE teacher_id = $1`,
          [teacher.id]
        );
        req.user.allowedClassIds = classesResult.rows.map(r => Number(r.class_id));
        console.log(`📚 Teacher has ${req.user.allowedClassIds.length} assigned classes`);
      } else {
        console.log(`⚠️ No teacher found for user ${req.user.id} (${req.user.email})`);
        req.user.teacher_id = null;
        req.user.allowedClassIds = [];
        req.user.teacher = null;
      }
    }
    
    // PARENT ENRICHMENT
    else if (req.user.role === 'parent') {
      // Try to find parent by user_id
      let result = await pool.query(
        'SELECT * FROM parents WHERE user_id = $1',
        [req.user.id]
      );
      
      // If not found, try by email (via users table since email is stored in users, not parents)
      if (result.rows.length === 0 && req.user.email) {
        console.log(`🔍 Parent not found by user_id, trying by email: ${req.user.email}`);
        result = await pool.query(
          `SELECT p.*, u.email 
           FROM parents p 
           JOIN users u ON p.user_id = u.id 
           WHERE u.email = $1 OR u.email = $2`,
          [req.user.email, req.user.email.toLowerCase()]
        );
      }
      
      if (result.rows.length > 0) {
        const parent = result.rows[0];
        req.user.parent_id = parent.id;
        req.user.parent = parent;
        
        console.log(`✅ Parent found: ${parent.first_name} ${parent.last_name} (ID: ${parent.id})`);
        
        // Get children students
        const studentsResult = await pool.query(`
          SELECT DISTINCT s.*
          FROM students s
          LEFT JOIN parent_students ps ON ps.student_id = s.id AND ps.parent_id = $1
          WHERE (s.parent_id = $1 OR ps.parent_id = $1)
            AND LOWER(COALESCE(s.status, 'active')) = 'active'
        `, [parent.id]);
        
        // Also try by parent_email if parent_id didn't work
        if (studentsResult.rows.length === 0 && req.user.email) {
          const emailResult = await pool.query(`
            SELECT s.* 
            FROM students s
            WHERE LOWER(s.parent_email) = LOWER($1)
              AND LOWER(COALESCE(s.status, 'active')) = 'active'
          `, [req.user.email]);
          
          if (emailResult.rows.length > 0) {
            studentsResult.rows = emailResult.rows;
          }
        }
        
        req.user.children = studentsResult.rows;
          req.user.allowedStudentIds = studentsResult.rows.map(r => Number(r.id));
        
        console.log(`👶 Parent has ${req.user.children.length} children`);
        
        // Get classes from children
        if (req.user.allowedStudentIds.length > 0) {
          const classesResult = await pool.query(`
            SELECT DISTINCT c.id, c.class_name, c.level
            FROM classes c
            WHERE c.id IN (
              SELECT s.class_id FROM students s WHERE s.id = ANY($1::int[]) AND s.class_id IS NOT NULL
              UNION
              SELECT sc.class_id FROM student_classes sc WHERE sc.student_id = ANY($1::int[])
            )
          `, [req.user.allowedStudentIds]);
          req.user.allowedClassIds = classesResult.rows.map(r => Number(r.id));
          console.log(`📚 Parent has ${req.user.allowedClassIds.length} associated classes`);
        } else {
          req.user.allowedClassIds = [];
        }
      } else {
        console.log(`⚠️ No parent found for user ${req.user.id} (${req.user.email})`);
        req.user.parent_id = null;
        req.user.allowedStudentIds = [];
        req.user.allowedClassIds = [];
        req.user.children = [];
        req.user.parent = null;
      }
    }
    
    console.log(`✅ User enrichment complete for ${req.user.role}`);
    
    next();
  } catch (err) {
    console.error('❌ Error enriching user context:', err.message);
    console.error('Stack:', err.stack);
    // Continue even if enrichment fails - don't block the request
    next();
  }
};

// ============================================
// DEBUG MIDDLEWARE - Log user info
// ============================================
const logUser = (req, res, next) => {
  if (req.user) {
    console.log(`📋 User: ${req.user.email} (${req.user.role})`);
    if (req.user.teacher_id) console.log(`   Teacher ID: ${req.user.teacher_id}`);
    if (req.user.parent_id) console.log(`   Parent ID: ${req.user.parent_id}`);
    if (req.user.allowedClassIds) console.log(`   Classes: ${req.user.allowedClassIds.length}`);
  }
  next();
};

module.exports = {
  verifyToken,
  optionalAuth,
  isAdmin,
  isTeacher,
  isParent,
  isStudent,
  hasRole,
  enrichUserContext,
  logUser
};
