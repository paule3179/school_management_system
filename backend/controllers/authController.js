const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { sendEmail, getStudentCreatedTemplate, getParentWelcomeTemplate, getTeacherWelcomeTemplate } = require('../config/email');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_this';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret_change_this';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// ============================================
// REFRESH TOKEN HELPER FUNCTIONS
// ============================================

const generateRandomRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

const generateAccessToken = (user, role, extraData = {}) => {
  const payload = {
    id: user.id,
    role: role,
    ...extraData
  };
  
  // Add role-specific data to token
  if (role === 'admin') {
    payload.username = user.username || user.email;
    payload.email = user.email;
    payload.user_id = user.id;
  } else if (role === 'teacher') {
    payload.teacher_id = user.id;
    payload.email = user.email;
    payload.user_id = user.user_id || user.id;
    payload.first_name = user.first_name;
    payload.last_name = user.last_name;
    if (user.class_id) payload.class_id = user.class_id;
  } else if (role === 'parent') {
    payload.parent_id = user.id;
    payload.email = user.email;
    payload.user_id = user.user_id || user.id;
    payload.first_name = user.first_name;
    payload.last_name = user.last_name;
    if (user.children) payload.children = user.children;
  }
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

const storeRefreshToken = async (userId, userRole, token, expiresAt, userAgent, ipAddress) => {
  await pool.query(
    `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND user_role = $2`,
    [userId, userRole]
  );
  
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, user_role, token, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, userRole, token, expiresAt, userAgent, ipAddress]
  );
};

const verifyRefreshToken = async (token, userAgent, ipAddress) => {
  const result = await pool.query(
    `SELECT * FROM refresh_tokens 
     WHERE token = $1 AND revoked = FALSE AND expires_at > NOW()`,
    [token]
  );
  
  if (result.rows.length === 0) return null;
  
  const refreshToken = result.rows[0];
  
  if (refreshToken.user_agent !== userAgent || refreshToken.ip_address !== ipAddress) {
    console.warn(`Suspicious refresh token usage for user ${refreshToken.user_id}`);
  }
  
  return refreshToken;
};

const revokeRefreshToken = async (token) => {
  await pool.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1`, [token]);
};

const revokeAllUserRefreshTokens = async (userId, userRole) => {
  await pool.query(
    `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND user_role = $2`,
    [userId, userRole]
  );
};

const getDeviceInfo = (userAgent) => {
  if (!userAgent) return 'Unknown Device';
  
  const ua = userAgent.toLowerCase();
  
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'MacOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
  let browser = 'Unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera')) browser = 'Opera';
  
  let deviceType = 'Desktop';
  if (/(tablet|ipad|playbook|kindle)/i.test(ua)) deviceType = 'Tablet';
  else if (/(mobile|iphone|ipod|android phone)/i.test(ua)) deviceType = 'Mobile';
  
  return `${deviceType} - ${os} - ${browser}`;
};

const logActivity = async (userId, userRole, username, action, ipAddress, deviceInfo, success = null) => {
  try {
    await pool.query(`
      INSERT INTO user_activity_log (user_id, user_role, username, action, ip_address, device_info, login_time, success)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
    `, [
      userId,
      userRole || 'unknown',
      username,
      action,
      ipAddress,
      deviceInfo,
      success
    ]);
  } catch (error) {
    // Don't break login if logging fails
    console.error('Error logging activity:', error);
  }
};

const updateSystemUser = async (userId, userRole, username, firstName, lastName, email, ipAddress, deviceInfo) => {
  try {
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();
    
    await pool.query(`
      INSERT INTO system_users (user_id, user_role, username, email, full_name, last_login, last_login_ip, last_login_device, total_logins, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, 1, NOW())
      ON CONFLICT (user_id, user_role) 
      DO UPDATE SET 
        last_login = NOW(),
        last_login_ip = $6,
        last_login_device = $7,
        total_logins = system_users.total_logins + 1,
        email = COALESCE($4, system_users.email),
        full_name = COALESCE($5, system_users.full_name),
        updated_at = NOW()
    `, [userId, userRole, username, email, fullName, ipAddress, deviceInfo]);
  } catch (error) {
    console.error('Error updating system user:', error);
  }
};

const generateTempPassword = () => {
  const length = 8;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

const generateParentId = async () => {
  const result = await pool.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(parent_id FROM 7) AS INTEGER)), 0) as max_id 
    FROM parents 
    WHERE parent_id ~ '^PARENT[0-9]+$'
  `);
  const nextId = parseInt(result.rows[0].max_id) + 1;
  return `PARENT${nextId}`;
};

// ============================================
// GET ROLE-SPECIFIC DASHBOARD DATA
// ============================================

const getTeacherDashboardData = async (teacherId) => {
  try {
    // Get teacher info
    const teacherResult = await pool.query(`
      SELECT t.*, u.email 
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = $1
    `, [teacherId]);
    
    if (teacherResult.rows.length === 0) {
      return null;
    }
    
    const teacher = teacherResult.rows[0];
    
    // Get assigned classes
    const classesResult = await pool.query(`
      SELECT 
        c.id,
        c.class_name,
        c.level,
        c.stream,
        c.capacity,
        COUNT(DISTINCT s.id) as student_count
      FROM classes c
      LEFT JOIN student_classes sc ON c.id = sc.class_id
      LEFT JOIN students s ON sc.student_id = s.id AND s.status = 'Active'
      WHERE c.teacher_id = $1 OR c.id IN (
        SELECT class_id FROM teacher_classes WHERE teacher_id = $1
      )
      GROUP BY c.id
      ORDER BY c.class_name
    `, [teacherId]);
    
    // Get today's timetable
    const timetableResult = await pool.query(`
      SELECT 
        t.*,
        c.class_name,
        c.level
      FROM timetables t
      JOIN classes c ON t.class_id = c.id
      WHERE t.teacher_id = $1
        AND t.day_of_week = TO_CHAR(CURRENT_DATE, 'Day')
      ORDER BY t.start_time
    `, [teacherId]);
    
    // Get upcoming classes (next 7 days)
    const upcomingResult = await pool.query(`
      SELECT 
        t.*,
        c.class_name,
        c.level
      FROM timetables t
      JOIN classes c ON t.class_id = c.id
      WHERE t.teacher_id = $1
        AND t.day_of_week IN (
          SELECT TO_CHAR(d, 'Day') 
          FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', '1 day') d
        )
      ORDER BY 
        CASE t.day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
        END,
        t.start_time
    `, [teacherId]);
    
    // Get recent students
    const studentsResult = await pool.query(`
      SELECT 
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        c.class_name
      FROM students s
      JOIN student_classes sc ON s.id = sc.student_id
      JOIN classes c ON sc.class_id = c.id
      WHERE c.teacher_id = $1 AND s.status = 'Active'
      ORDER BY s.last_name, s.first_name
      LIMIT 10
    `, [teacherId]);
    
    return {
      teacher: {
        id: teacher.id,
        teacher_id: teacher.teacher_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email,
        department: teacher.department,
        subject_specialty: teacher.subject_specialty
      },
      stats: {
        total_classes: classesResult.rows.length,
        total_students: classesResult.rows.reduce((sum, c) => sum + parseInt(c.student_count || 0), 0),
        today_classes: timetableResult.rows.length,
        upcoming_classes: upcomingResult.rows.length
      },
      classes: classesResult.rows,
      timetable: timetableResult.rows,
      upcoming: upcomingResult.rows,
      recent_students: studentsResult.rows
    };
  } catch (error) {
    console.error('Error fetching teacher dashboard data:', error);
    throw error;
  }
};

const getParentDashboardData = async (parentId) => {
  try {
    // Get parent info
    const parentResult = await pool.query(`
      SELECT p.*, u.email 
      FROM parents p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [parentId]);
    
    if (parentResult.rows.length === 0) {
      return null;
    }
    
    const parent = parentResult.rows[0];
    
    // Get children
    const childrenResult = await pool.query(`
      SELECT 
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        s.date_of_birth,
        s.status,
        c.id as class_id,
        c.class_name,
        c.level,
        c.stream,
        t.first_name as teacher_first_name,
        t.last_name as teacher_last_name
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE s.parent_id = $1 AND s.status = 'Active'
      ORDER BY s.last_name, s.first_name
    `, [parentId]);
    
    // Get children's performance (grades)
    const gradeResult = await pool.query(`
      SELECT 
        g.*,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        sub.name as subject_name
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN subjects sub ON g.subject_id = sub.id
      WHERE s.parent_id = $1
      ORDER BY g.created_at DESC
      LIMIT 20
    `, [parentId]);
    
    // Get children's attendance
    const attendanceResult = await pool.query(`
      SELECT 
        a.*,
        s.first_name as student_first_name,
        s.last_name as student_last_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE s.parent_id = $1
      ORDER BY a.date DESC
      LIMIT 20
    `, [parentId]);
    
    // Get children's timetable
    let allTimetable = [];
    if (childrenResult.rows.length > 0) {
      const classIds = childrenResult.rows.map(c => c.class_id);
      const timetableResult = await pool.query(`
        SELECT 
          t.*,
          c.class_name,
          c.level,
          sub.name as subject_name
        FROM timetables t
        JOIN classes c ON t.class_id = c.id
        LEFT JOIN subjects sub ON t.subject_id = sub.id
        WHERE t.class_id = ANY($1::int[])
        AND t.day_of_week = TO_CHAR(CURRENT_DATE, 'Day')
        ORDER BY t.start_time
      `, [classIds]);
      allTimetable = timetableResult.rows;
    }
    
    return {
      parent: {
        id: parent.id,
        parent_id: parent.parent_id,
        first_name: parent.first_name,
        last_name: parent.last_name,
        email: parent.email,
        phone: parent.phone
      },
      stats: {
        total_children: childrenResult.rows.length,
        total_assignments: 0,
        upcoming_events: 0
      },
      children: childrenResult.rows,
      grades: gradeResult.rows,
      attendance: attendanceResult.rows,
      timetable: allTimetable
    };
  } catch (error) {
    console.error('Error fetching parent dashboard data:', error);
    throw error;
  }
};

const getAdminDashboardData = async (adminId) => {
  try {
    // Get admin info
    const adminResult = await pool.query(`
      SELECT u.* 
      FROM users u
      WHERE u.id = $1 AND u.role = 'admin'
    `, [adminId]);
    
    if (adminResult.rows.length === 0) {
      return null;
    }
    
    // Get total counts
    const countsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active') as total_admins,
        (SELECT COUNT(*) FROM teachers WHERE is_active = true) as total_teachers,
        (SELECT COUNT(*) FROM parents WHERE is_active = true) as total_parents,
        (SELECT COUNT(*) FROM students WHERE status = 'Active') as total_students,
        (SELECT COUNT(*) FROM classes) as total_classes,
        (SELECT COUNT(*) FROM subjects) as total_subjects
    `);
    
    // Get recent activities
    const recentActivities = await pool.query(`
      SELECT * FROM user_activity_log 
      ORDER BY login_time DESC 
      LIMIT 20
    `);
    
    // Get today's statistics
    const todayResult = await pool.query(`
      SELECT 
        COUNT(*) as total_attendance
      FROM attendance 
      WHERE date = CURRENT_DATE
    `);
    
    return {
      admin: adminResult.rows[0],
      stats: {
        total_admins: parseInt(countsResult.rows[0].total_admins || 0),
        total_teachers: parseInt(countsResult.rows[0].total_teachers || 0),
        total_parents: parseInt(countsResult.rows[0].total_parents || 0),
        total_students: parseInt(countsResult.rows[0].total_students || 0),
        total_classes: parseInt(countsResult.rows[0].total_classes || 0),
        total_subjects: parseInt(countsResult.rows[0].total_subjects || 0),
        today_attendance: parseInt(todayResult.rows[0].total_attendance || 0)
      },
      recent_activities: recentActivities.rows
    };
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    throw error;
  }
};

// ============================================
// AUTH CONTROLLER - COMPLETE
// ============================================

const authController = {
  // ============================================
  // LOGIN - With full dashboard data loading
  // ============================================
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
      const userAgent = req.headers['user-agent'];
      const deviceInfo = getDeviceInfo(userAgent);
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }
      
      console.log(`🔐 Login attempt for email: ${email}`);
      
      let user = null;
      let userRole = null;
      let extraData = {};
      let userId = null;
      let usernameValue = email;
      
      // Try ADMIN login first
      const adminResult = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND role = $2 AND status = $3',
        [email, 'admin', 'active']
      );
      
      if (adminResult.rows.length > 0) {
        user = adminResult.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (validPassword) {
          userRole = 'admin';
          userId = user.id;
          usernameValue = user.username || user.email;
          extraData = { username: user.username, email: user.email };
          
          await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
          console.log(`✅ Admin login successful: ${email}`);
        }
      }
      
      // If not admin, try TEACHER login
      if (!userRole) {
        const teacherResult = await pool.query(
          `SELECT t.*, 
            (SELECT id FROM classes WHERE teacher_id = t.id LIMIT 1) as class_id,
            (SELECT class_name FROM classes WHERE teacher_id = t.id LIMIT 1) as class_name
           FROM teachers t
           WHERE t.email = $1 AND t.is_active = true`,
          [email]
        );
        
        if (teacherResult.rows.length > 0) {
          user = teacherResult.rows[0];
          const validPassword = await bcrypt.compare(password, user.password);
          
          if (validPassword) {
            userRole = 'teacher';
            userId = user.id;
            usernameValue = user.teacher_id || user.email;
            extraData = { 
              teacher_id: user.id,
              class_id: user.class_id,
              class_name: user.class_name,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email
            };
            
            console.log(`✅ Teacher login successful: ${email} (ID: ${user.id})`);
          }
        }
      }
      
      // If not admin or teacher, try PARENT login
      if (!userRole) {
        const parentResult = await pool.query(
          'SELECT * FROM parents WHERE email = $1 AND is_active = true',
          [email]
        );
        
        if (parentResult.rows.length > 0) {
          user = parentResult.rows[0];
          const validPassword = await bcrypt.compare(password, user.password);
          
          if (validPassword) {
            userRole = 'parent';
            userId = user.id;
            usernameValue = user.parent_id || user.email;
            
            const children = await pool.query(
              `SELECT 
                s.id, 
                s.admission_number, 
                s.first_name, 
                s.last_name, 
                s.class_id,
                c.class_name,
                c.level
               FROM students s
               LEFT JOIN classes c ON s.class_id = c.id
               WHERE s.parent_id = $1 AND s.status = 'Active'`,
              [user.id]
            );
            
            extraData = { 
              parent_id: user.parent_id, 
              children: children.rows,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email
            };
            
            console.log(`✅ Parent login successful: ${email} (ID: ${user.id})`);
          }
        }
      }
      
      // If no user found with any role
      if (!userRole) {
        console.log(`❌ Failed login attempt for email: ${email}`);
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }
      
// Log activity and update system user
      await logActivity(userId, userRole, usernameValue, 'login', ipAddress, deviceInfo, true);
      await updateSystemUser(userId, userRole, usernameValue, user.first_name, user.last_name, user.email, ipAddress, deviceInfo);
      
      // Generate access token with full user data
      const accessToken = generateAccessToken(
        { 
          id: userId, 
          ...user, 
          children: extraData.children,
          class_id: extraData.class_id,
          class_name: extraData.class_name,
          teacher_id: extraData.teacher_id,
          parent_id: extraData.parent_id
        },
        userRole,
        extraData
      );
      
      // Generate refresh token
      const refreshToken = generateRandomRefreshToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      await storeRefreshToken(userId, userRole, refreshToken, expiresAt, userAgent, ipAddress);
      
      // Set refresh token cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      
      // Prepare user response with dashboard data
      let userResponse = {};
      let dashboardData = null;
      
      if (userRole === 'admin') {
        const { password: _, ...userWithoutPassword } = user;
        userResponse = {
          ...userWithoutPassword,
          role: 'admin'
        };
        dashboardData = await getAdminDashboardData(userId);
      } else if (userRole === 'teacher') {
        userResponse = {
          id: user.id,
          teacher_id: user.teacher_id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: 'teacher',
          class_id: user.class_id,
          class_name: user.class_name,
          department: user.department,
          subject_specialty: user.subject_specialty
        };
        dashboardData = await getTeacherDashboardData(userId);
      } else if (userRole === 'parent') {
        userResponse = {
          id: user.id,
          parent_id: user.parent_id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: 'parent',
          children: extraData.children || []
        };
        dashboardData = await getParentDashboardData(userId);
      }
      
      console.log(`✅ Login complete for ${userRole}: ${email}`);
      
      return res.json({
        success: true,
        accessToken,
        user: userResponse,
        dashboard: dashboardData,
        expiresIn: 15 * 60,
        message: `${userRole} login successful`
      });
      
    } catch (error) {
      console.error('❌ Login error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Login failed: ' + error.message 
      });
    }
  },
  
  // ============================================
  // GET DASHBOARD DATA
  // ============================================
  async getDashboard(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const userRole = req.user.role;
      const userId = req.user.id;
      
      console.log(`📊 Fetching dashboard for ${userRole} (ID: ${userId})`);
      
      let dashboardData = null;
      
      if (userRole === 'admin') {
        dashboardData = await getAdminDashboardData(userId);
      } else if (userRole === 'teacher') {
        dashboardData = await getTeacherDashboardData(userId);
      } else if (userRole === 'parent') {
        dashboardData = await getParentDashboardData(userId);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid user role'
        });
      }
      
      if (!dashboardData) {
        return res.status(404).json({
          success: false,
          error: 'Dashboard data not found'
        });
      }
      
      res.json({
        success: true,
        data: dashboardData
      });
      
    } catch (error) {
      console.error('❌ Dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load dashboard: ' + error.message
      });
    }
  },
  
  // ============================================
  // REFRESH TOKEN
  // ============================================
  async refreshToken(req, res) {
    const refreshToken = req.cookies?.refreshToken;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required'
      });
    }
    
    try {
      const tokenRecord = await verifyRefreshToken(refreshToken, userAgent, ipAddress);
      
      if (!tokenRecord) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token. Please login again.'
        });
      }
      
      let user = null;
      let extraData = {};
      
      if (tokenRecord.user_role === 'admin') {
        const result = await pool.query(
          'SELECT id, username, email, first_name, last_name, role FROM users WHERE id = $1 AND status = $2',
          [tokenRecord.user_id, 'active']
        );
        if (result.rows.length === 0) {
          return res.status(401).json({ success: false, error: 'User not found or inactive' });
        }
        user = result.rows[0];
        extraData = { username: user.username, email: user.email };
      } 
      else if (tokenRecord.user_role === 'teacher') {
        const result = await pool.query(
          `SELECT t.*, 
            (SELECT id FROM classes WHERE teacher_id = t.id LIMIT 1) as class_id,
            (SELECT class_name FROM classes WHERE teacher_id = t.id LIMIT 1) as class_name
           FROM teachers t
           WHERE t.id = $1 AND t.is_active = true`,
          [tokenRecord.user_id]
        );
        if (result.rows.length === 0) {
          return res.status(401).json({ success: false, error: 'Teacher not found or inactive' });
        }
        user = result.rows[0];
        extraData = { 
          teacher_id: user.id, 
          class_id: user.class_id,
          class_name: user.class_name
        };
      }
      else if (tokenRecord.user_role === 'parent') {
        const result = await pool.query(
          'SELECT * FROM parents WHERE id = $1 AND is_active = true',
          [tokenRecord.user_id]
        );
        if (result.rows.length === 0) {
          return res.status(401).json({ success: false, error: 'Parent not found or inactive' });
        }
        user = result.rows[0];
        
        const children = await pool.query(
          'SELECT id, admission_number, first_name, last_name, class_id FROM students WHERE parent_id = $1 AND status = $2',
          [user.id, 'active']
        );
        extraData = { parent_id: user.parent_id, children: children.rows };
      }
      
      const newAccessToken = generateAccessToken(
        { id: tokenRecord.user_id, ...user, children: extraData.children },
        tokenRecord.user_role,
        extraData
      );
      
      const newRefreshToken = generateRandomRefreshToken();
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);
      
      await revokeRefreshToken(refreshToken);
      await storeRefreshToken(tokenRecord.user_id, tokenRecord.user_role, newRefreshToken, newExpiresAt, userAgent, ipAddress);
      
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      
      res.json({
        success: true,
        accessToken: newAccessToken,
        expiresIn: 15 * 60
      });
      
    } catch (error) {
      console.error('❌ Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh token'
      });
    }
  },
  
  // ============================================
  // LOGOUT
  // ============================================
  async logout(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const username = req.user?.username || req.user?.teacher_id || req.user?.parent_id;
      
      if (refreshToken) {
        await revokeRefreshToken(refreshToken);
      }
      
      if (userId) {
        await logActivity(userId, userRole, username, 'logout', null, null);
      }
      
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      res.json({ success: true, message: 'Logged out successfully' });
    }
  },
  
  // ============================================
  // LOGOUT FROM ALL DEVICES
  // ============================================
  async logoutAll(req, res) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (userId && userRole) {
        await revokeAllUserRefreshTokens(userId, userRole);
      }
      
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      res.json({ success: true, message: 'Logged out from all devices successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // ============================================
  // GET CURRENT USER
  // ============================================
  async getCurrentUser(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }
      
      // Get fresh user data from database
      let userData = null;
      
      if (req.user.role === 'admin') {
        const result = await pool.query(
          'SELECT id, email, username, first_name, last_name, role, status FROM users WHERE id = $1',
          [req.user.id]
        );
        userData = result.rows[0];
      } else if (req.user.role === 'teacher') {
        const result = await pool.query(
          `SELECT t.*, u.email 
           FROM teachers t
           LEFT JOIN users u ON t.user_id = u.id
           WHERE t.id = $1`,
          [req.user.id]
        );
        userData = result.rows[0];
      } else if (req.user.role === 'parent') {
        const result = await pool.query(
          `SELECT p.*, u.email 
           FROM parents p
           LEFT JOIN users u ON p.user_id = u.id
           WHERE p.id = $1`,
          [req.user.id]
        );
        userData = result.rows[0];
      }
      
      res.json({
        success: true,
        user: userData || req.user
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // ============================================
  // CHANGE PASSWORD
  // ============================================
  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      if (!current_password || !new_password) {
        return res.status(400).json({ success: false, error: 'Current password and new password are required' });
      }
      
      let user;
      if (userRole === 'admin') {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        user = result.rows[0];
      } else if (userRole === 'teacher') {
        const result = await pool.query('SELECT * FROM teachers WHERE id = $1', [userId]);
        user = result.rows[0];
      } else {
        const result = await pool.query('SELECT * FROM parents WHERE id = $1', [userId]);
        user = result.rows[0];
      }
      
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      const isValid = await bcrypt.compare(current_password, user.password);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }
      
      const hashedPassword = await bcrypt.hash(new_password, 10);
      
      if (userRole === 'admin') {
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
      } else if (userRole === 'teacher') {
        await pool.query('UPDATE teachers SET password = $1 WHERE id = $2', [hashedPassword, userId]);
      } else {
        await pool.query('UPDATE parents SET password = $1 WHERE id = $2', [hashedPassword, userId]);
      }
      
      await revokeAllUserRefreshTokens(userId, userRole);
      
      res.json({ success: true, message: 'Password changed successfully. Please login again.' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // ============================================
  // REGISTER NEW USER (Admin only)
  // ============================================
  async register(req, res) {
    try {
      const { email, password, role, first_name, last_name, phone } = req.body;
      
      if (!email || !password || !role) {
        return res.status(400).json({ success: false, error: 'Email, password, and role are required' });
      }
      
      const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'User already exists' });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await pool.query(`
        INSERT INTO users (email, password, role, first_name, last_name, phone, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING id, email, role, first_name, last_name
      `, [email, hashedPassword, role, first_name, last_name, phone]);
      
      res.status(201).json({ success: true, data: result.rows[0], message: 'User created successfully' });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // ============================================
  // GET ALL USERS (Admin only)
  // ============================================
  async getAllUsers(req, res) {
    try {
      const { role } = req.query;
      let query = 'SELECT id, email, first_name, last_name, role, phone, status, last_login, created_at FROM users';
      let params = [];
      
      if (role) {
        query += ' WHERE role = $1 ORDER BY created_at DESC';
        params.push(role);
      } else {
        query += ' ORDER BY created_at DESC';
      }
      
      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // ============================================
  // TOGGLE USER STATUS (Admin only)
  // ============================================
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const result = await pool.query(`
        UPDATE users 
        SET status = $1, updated_at = NOW()
        WHERE id = $2 
        RETURNING id, email, role, status
      `, [status, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      res.json({ success: true, data: result.rows[0], message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
      console.error('Toggle user status error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // ============================================
  // GET ALL SYSTEM USERS (Admin only)
  // ============================================
  async getAllSystemUsers(req, res) {
    try {
      const result = await pool.query(`
        SELECT su.*, 
               COUNT(ual.id) as total_activities,
               MAX(ual.login_time) as last_activity_time
        FROM system_users su
        LEFT JOIN user_activity_log ual ON su.user_id = ual.user_id AND su.user_role = ual.user_role
        GROUP BY su.id
        ORDER BY su.last_login DESC
      `);
      
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Get system users error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // ============================================
  // GET USER ACTIVITY LOGS (Admin only)
  // ============================================
  async getUserActivityLogs(req, res) {
    try {
      const { userId, userRole, limit = 100 } = req.query;
      
      let query = `SELECT * FROM user_activity_log WHERE 1=1`;
      const params = [];
      let paramCount = 1;
      
      if (userId && userId !== 'undefined') {
        query += ` AND user_id = $${paramCount}`;
        params.push(userId);
        paramCount++;
      }
      
      if (userRole && userRole !== 'undefined') {
        query += ` AND user_role = $${paramCount}`;
        params.push(userRole);
        paramCount++;
      }
      
      query += ` ORDER BY login_time DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Get activity logs error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // ============================================
  // SEND STUDENT NOTIFICATION TO PARENT
  // ============================================
  async sendStudentNotification(req, res) {
    try {
      const { studentId } = req.params;
      const { parentEmail, parentName, studentName, studentAdmission } = req.body;
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
      
      const parentResult = await pool.query(
        'SELECT id, parent_id FROM parents WHERE email = $1',
        [parentEmail]
      );
      
      let parentIdValue = parentEmail;
      let actualParentId = null;
      
      if (parentResult.rows.length > 0) {
        actualParentId = parentResult.rows[0].id;
        parentIdValue = parentResult.rows[0].parent_id;
      }
      
      const tempPassword = generateTempPassword();
      
      if (actualParentId) {
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        await pool.query(
          'UPDATE parents SET password = $1 WHERE id = $2',
          [hashedPassword, actualParentId]
        );
      }
      
      const emailResult = await sendEmail(
        parentEmail,
        'Your Child Has Been Registered - School Management System',
        getStudentCreatedTemplate(parentName, studentName, studentAdmission, parentIdValue, tempPassword, loginUrl)
      );
      
      if (emailResult.success) {
        console.log('✅ Email sent with login credentials. Parent ID:', parentIdValue);
      }
      
      res.json({ 
        success: true, 
        message: 'Notification sent to parent with login credentials',
        parentId: parentIdValue
      });
    } catch (error) {
      console.error('Send notification error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // ============================================
  // REGISTER PARENT (Admin only)
  // ============================================
  async registerParent(req, res) {
    try {
      const {
        first_name, last_name, email, phone, address, student_ids
      } = req.body;
      
      if (!first_name || !last_name || !email) {
        return res.status(400).json({ 
          success: false, 
          error: 'Required fields missing: first_name, last_name, email' 
        });
      }
      
      const existing = await pool.query(
        'SELECT id FROM parents WHERE email = $1',
        [email]
      );
      
      if (existing.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Parent with this email already exists' 
        });
      }
      
      const parentIdValue = await generateParentId();
      const tempPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      const result = await pool.query(`
        INSERT INTO parents (
          parent_id, first_name, last_name, email, phone, address, password, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING id, parent_id, first_name, last_name, email
      `, [parentIdValue, first_name, last_name, email, phone || null, address || null, hashedPassword]);
      
      const parentRecord = result.rows[0];
      const parentDbId = parentRecord.id;
      
      if (student_ids && student_ids.length > 0) {
        for (const studentId of student_ids) {
          await pool.query(
            'UPDATE students SET parent_id = $1 WHERE id = $2',
            [parentDbId, studentId]
          );
        }
      }
      
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
      
      let childName = 'Your Child';
      let childAdmission = '';
      if (student_ids && student_ids.length > 0) {
        const studentResult = await pool.query(
          'SELECT first_name, last_name, admission_number FROM students WHERE id = $1',
          [student_ids[0]]
        );
        if (studentResult.rows.length > 0) {
          childName = `${studentResult.rows[0].first_name} ${studentResult.rows[0].last_name}`;
          childAdmission = studentResult.rows[0].admission_number;
        }
      }
      
      await sendEmail(
        email,
        'Welcome to Parent Portal - School Management System',
        getParentWelcomeTemplate(first_name, childName, childAdmission, parentIdValue, tempPassword, loginUrl)
      );
      
      res.json({
        success: true,
        message: 'Parent registered successfully. Login credentials sent to email.',
        data: {
          id: parentRecord.id,
          parent_id: parentRecord.parent_id,
          first_name: parentRecord.first_name,
          last_name: parentRecord.last_name,
          email: parentRecord.email
        }
      });
      
    } catch (error) {
      console.error('Register parent error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // ============================================
  // REGISTER TEACHER (Admin only)
  // ============================================
  async registerTeacher(req, res) {
    try {
      const {
        teacher_id, first_name, last_name, ghana_card_id, teacher_license_id,
        subject_specialty, phone, email, password, assigned_class_id
      } = req.body;
      
      if (!teacher_id || !first_name || !last_name || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Required fields missing: teacher_id, first_name, last_name, email, password' 
        });
      }
      
      const existing = await pool.query(
        'SELECT id FROM teachers WHERE teacher_id = $1 OR email = $2',
        [teacher_id, email]
      );
      
      if (existing.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Teacher ID or Email already exists' 
        });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await pool.query(`
        INSERT INTO teachers (
          teacher_id, first_name, last_name, ghana_card_id, teacher_license_id,
          subject_specialty, phone, email, password, assigned_class_id, role, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'teacher', true)
        RETURNING id, teacher_id, first_name, last_name, email, assigned_class_id
      `, [
        teacher_id, first_name, last_name, ghana_card_id || null, teacher_license_id || null,
        subject_specialty || null, phone || null, email, hashedPassword, assigned_class_id || null
      ]);
      
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
      const fullName = `${first_name} ${last_name}`;
      
      await sendEmail(
        email,
        'Welcome to School Management System - Your Teacher Account',
        getTeacherWelcomeTemplate(fullName, teacher_id, password, loginUrl)
      );
      
      res.json({
        success: true,
        message: 'Teacher registered successfully. Login credentials sent to email.',
        data: result.rows[0]
      });
      
    } catch (error) {
      console.error('Register teacher error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // ============================================
  // TOGGLE SYSTEM USER STATUS (Admin only)
  // ============================================
  async toggleSystemUserStatus(req, res) {
    try {
      const { userId, userRole } = req.params;
      const { is_active } = req.body;
      
      let tableName = '';
      let idField = '';
      
      if (userRole === 'admin') {
        tableName = 'users';
        idField = 'id';
      } else if (userRole === 'teacher') {
        tableName = 'teachers';
        idField = 'id';
      } else if (userRole === 'parent') {
        tableName = 'parents';
        idField = 'id';
      } else {
        return res.status(400).json({ success: false, error: 'Invalid user role' });
      }
      
      await pool.query(
        `UPDATE ${tableName} SET is_active = $1 WHERE ${idField} = $2`,
        [is_active, userId]
      );
      
      await pool.query(
        `UPDATE system_users SET is_active = $1, updated_at = NOW() WHERE user_id = $2 AND user_role = $3`,
        [is_active, userId, userRole]
      );
      
      if (!is_active) {
        await revokeAllUserRefreshTokens(parseInt(userId), userRole);
      }
      
      res.json({ success: true, message: `User ${is_active ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
      console.error('Toggle system user status error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = authController;