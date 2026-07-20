const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');

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

const generateAccessToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

const storeRefreshToken = async (userId, token, expiresAt, userAgent, ipAddress) => {
    await pool.query(
        `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
        [userId]
    );
    
    await pool.query(`
        INSERT INTO refresh_tokens (user_id, token, expires_at, user_agent, ip_address)
        VALUES ($1, $2, $3, $4, $5)
    `, [userId, token, expiresAt, userAgent, ipAddress]);
};

const verifyRefreshToken = async (token, userAgent, ipAddress) => {
    const result = await pool.query(`
        SELECT * FROM refresh_tokens 
        WHERE token = $1 AND revoked = FALSE AND expires_at > NOW()
    `, [token]);
    
    if (result.rows.length === 0) return null;
    
    const refreshToken = result.rows[0];
    
    if (refreshToken.user_agent !== userAgent || refreshToken.ip_address !== ipAddress) {
        console.warn(`Suspicious refresh token usage for user ${refreshToken.user_id}`);
    }
    
    return refreshToken;
};

const revokeRefreshToken = async (token) => {
    await pool.query(
        `UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1`,
        [token]
    );
};

const revokeAllUserRefreshTokens = async (userId) => {
    await pool.query(
        `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
        [userId]
    );
};

const logUserActivity = async (userId, action, req) => {
    try {
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        await pool.query(`
            INSERT INTO user_activity (user_id, action, ip_address, device_info, login_time)
            VALUES ($1, $2, $3, $4, NOW())
        `, [userId, action, ipAddress, userAgent]);
    } catch (error) {
        console.error('Error logging activity:', error.message);
    }
};

// ============================================
// LOGIN ROUTE - FIXED FOR YOUR DATABASE SCHEMA
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        console.log(`🔐 Login attempt: ${email}`);
        
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

        // Find user by email in users table (normalize email before lookup)
        const userResult = await pool.query(`
            SELECT id, email, password, role, first_name, last_name, phone, status
            FROM users 
            WHERE LOWER(email) = $1
            AND LOWER(status) = 'active'
        `, [normalizedEmail]);

        if (userResult.rows.length === 0) {
            // Extra diagnostics: see if the email exists but is inactive / different status
            const userAnyStatus = await pool.query(`
                SELECT id, email, role, status
                FROM users
                WHERE LOWER(email) = $1
                LIMIT 1
            `, [normalizedEmail]);

            console.log(`❌ User not found (or not active): ${email}`, {
                normalizedEmail,
                foundRow: userAnyStatus.rows[0] || null
            });

            await logUserActivity(null, 'failed_login', req);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password',
                debug: { normalizedEmail }
            });
        }

        const user = userResult.rows[0];
        
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log(`❌ Invalid password for: ${email}`);
            await logUserActivity(user.id, 'failed_login', req);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }
        
        console.log(`✅ Login successful: ${email} as ${user.role}`);
        
        // Update last login
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );
        
        // Log successful login
        await logUserActivity(user.id, 'login', req);
        
        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRandomRefreshToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        // Store refresh token
        await storeRefreshToken(user.id, refreshToken, expiresAt, userAgent, ipAddress);
        
        // Set HTTP-only cookie for refresh token
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        // Get role-specific data - FIXED for your schema
        let roleData = {};
        
        if (user.role === 'teacher') {
            // Find teacher by user_id first, then by email
            let teacherResult = await pool.query(`
                SELECT 
                    t.id as teacher_id,
                    t.employee_number,
                    t.department,
                    t.first_name,
                    t.last_name,
                    t.email
                FROM teachers t
                WHERE t.user_id = $1
            `, [user.id]);
            
            if (teacherResult.rows.length === 0 && user.email) {
                teacherResult = await pool.query(`
                    SELECT 
                        t.id as teacher_id,
                        t.employee_number,
                        t.department,
                        t.first_name,
                        t.last_name,
                        t.email
                    FROM teachers t
                    WHERE t.email = $1
                `, [user.email]);
            }
            
            if (teacherResult.rows.length > 0) {
                const teacherId = teacherResult.rows[0].teacher_id;
                
                // Get assigned classes
                const classesResult = await pool.query(`
                    SELECT COALESCE(array_agg(DISTINCT c.id), '{}') as class_ids,
                           COALESCE(array_agg(DISTINCT c.class_name), '{}') as class_names
                    FROM teacher_classes tc
                    JOIN classes c ON tc.class_id = c.id
                    WHERE tc.teacher_id = $1
                `, [teacherId]);
                
                roleData.teacher_info = teacherResult.rows[0];
                roleData.allowedClassIds = classesResult.rows[0]?.class_ids || [];
                roleData.allowedClassNames = classesResult.rows[0]?.class_names || [];
            } else {
                roleData.teacher_info = null;
                roleData.allowedClassIds = [];
            }
        }
        else if (user.role === 'parent') {
            // Find parent by user_id first, then by email
            let parentResult = await pool.query(`
                SELECT id as parent_id, first_name, last_name, email, phone
                FROM parents
                WHERE user_id = $1
            `, [user.id]);
            
            if (parentResult.rows.length === 0 && user.email) {
                parentResult = await pool.query(`
                    SELECT id as parent_id, first_name, last_name, email, phone
                    FROM parents
                    WHERE email = $1
                `, [user.email]);
            }
            
            if (parentResult.rows.length > 0) {
                const parentId = parentResult.rows[0].parent_id;
                roleData.parent_info = parentResult.rows[0];
                
                // Get children from students table using parent_email
                const childrenResult = await pool.query(`
                    SELECT 
                        s.id, 
                        s.first_name, 
                        s.last_name, 
                        s.admission_number,
                        s.class_id,
                        COALESCE(c.class_name, 'Not Assigned') as class_name
                    FROM students s
                    LEFT JOIN classes c ON s.class_id = c.id
                    WHERE s.parent_email = $1 AND s.status = 'Active'
                `, [user.email]);
                
                roleData.children = childrenResult.rows;
                roleData.childIds = childrenResult.rows.map(s => s.id);
            } else {
                roleData.parent_info = null;
                roleData.children = [];
                roleData.childIds = [];
            }
        }
        else if (user.role === 'admin') {
            // Get admin statistics
            const stats = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM students WHERE status = 'Active') as total_students,
                    (SELECT COUNT(*) FROM teachers WHERE status = 'active') as total_teachers,
                    (SELECT COUNT(*) FROM classes) as total_classes,
                    (SELECT COUNT(*) FROM users WHERE role = 'parent' AND status = 'active') as total_parents
            `);
            roleData.stats = stats.rows[0];
        }
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            accessToken,
            user: userWithoutPassword,
            expiresIn: 15 * 60,
            ...roleData
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// REFRESH TOKEN ROUTE
// ============================================
router.post('/refresh-token', async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
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
        
        const userResult = await pool.query(`
            SELECT id, email, role, first_name, last_name, status
            FROM users 
            WHERE id = $1
        `, [tokenRecord.user_id]);
        
        if (userResult.rows.length === 0 || userResult.rows[0].status !== 'active') {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive. Please login again.'
            });
        }
        
        const user = userResult.rows[0];
        
        const newAccessToken = generateAccessToken(user);
        
        const newRefreshToken = generateRandomRefreshToken();
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);
        
        await revokeRefreshToken(refreshToken);
        await storeRefreshToken(user.id, newRefreshToken, newExpiresAt, userAgent, ipAddress);
        
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        res.json({
            success: true,
            data: {
                accessToken: newAccessToken,
                expiresIn: 15 * 60
            }
        });
        
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh token'
        });
    }
});

// ============================================
// CHANGE PASSWORD ROUTE
// ============================================
router.post('/change-password', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const { oldPassword, newPassword } = req.body;
        
        const userResult = await pool.query(
            'SELECT id, password FROM users WHERE id = $1',
            [decoded.id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const user = userResult.rows[0];
        
        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await pool.query(
            'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, user.id]
        );
        
        await revokeAllUserRefreshTokens(user.id);
        
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        
        res.json({ 
            success: true, 
            message: 'Password changed successfully. Please login again.' 
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET CURRENT USER ROUTE
// ============================================
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const userResult = await pool.query(`
            SELECT id, email, role, first_name, last_name, phone, status, created_at, last_login
            FROM users 
            WHERE id = $1
        `, [decoded.id]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const user = userResult.rows[0];
        
        // Get role-specific data
        let roleData = {};
        
        if (user.role === 'teacher') {
            const teacherData = await pool.query(`
                SELECT id as teacher_id, employee_number, department
                FROM teachers 
                WHERE user_id = $1 OR email = $2
            `, [user.id, user.email]);
            roleData.teacher_info = teacherData.rows[0];
        } else if (user.role === 'parent') {
            const childrenData = await pool.query(`
                SELECT s.id, s.first_name, s.last_name, s.admission_number
                FROM students s
                WHERE s.parent_email = $1 AND s.status = 'Active'
            `, [user.email]);
            roleData.children = childrenData.rows;
        }
        
        res.json({ 
            success: true, 
            data: { ...user, ...roleData }
        });
        
    } catch (error) {
        console.error('Get user error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, error: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// LOGOUT ROUTE
// ============================================
router.post('/logout', async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    
    if (refreshToken) {
        await revokeRefreshToken(refreshToken);
    }
    
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    
    res.json({ success: true, message: 'Logged out successfully' });
});

// ============================================
// LOGOUT FROM ALL DEVICES
// ============================================
router.post('/logout-all', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        await revokeAllUserRefreshTokens(decoded.id);
        
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        
        res.json({ success: true, message: 'Logged out from all devices successfully' });
        
    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;