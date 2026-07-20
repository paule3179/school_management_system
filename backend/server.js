// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const classRoutes = require('./routes/classRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const parentRoutes = require('./routes/parentRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const feeRoutes = require('./routes/feeRoutes');
const examRoutes = require('./routes/examRoutes');
const messageRoutes = require('./routes/messageRoutes');
const documentRoutes = require('./routes/documentRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const transportRoutes = require('./routes/transportRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const exportRoutes = require('./routes/exportRoutes'); 
const promotionRoutes = require('./routes/promotionRoutes'); 
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Import auth middleware
const { verifyToken, enrichUserContext, logUser } = require('./middleware/auth');
const dashboardController = require('./controllers/dashboardController');

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'];
        if (allowedOrigins.indexOf(origin) !== -1 || origin.match(/^http:\/\/localhost:\d+$/)) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================
// API ROUTES
// ============================================

app.get('/', (req, res) => {
    res.json({
        message: 'Basic School Student Data System API',
        version: '4.0.0'
    });
});

// Public routes (no auth required)
app.use('/api/auth', authRoutes);

// ============================================
// PROTECTED ROUTES (require authentication)
// ============================================

// Apply auth middleware to all protected routes
app.use('/api/students', verifyToken, enrichUserContext, studentRoutes);
app.use('/api/classes', verifyToken, enrichUserContext, classRoutes);
app.use('/api/admin/classes', verifyToken, enrichUserContext, classRoutes);
app.use('/api/teachers', verifyToken, enrichUserContext, teacherRoutes);
app.use('/api/parents', verifyToken, enrichUserContext, parentRoutes);
app.use('/api/grades', verifyToken, enrichUserContext, gradeRoutes);
app.use('/api/attendance', verifyToken, enrichUserContext, attendanceRoutes);
app.use('/api/timetables', verifyToken, enrichUserContext, timetableRoutes);
app.use('/api/fees', verifyToken, enrichUserContext, feeRoutes);
app.use('/api/exams', verifyToken, enrichUserContext, examRoutes);
app.use('/api/messages', verifyToken, enrichUserContext, messageRoutes);
app.use('/api/documents', verifyToken, enrichUserContext, documentRoutes);
app.use('/api/calendar', verifyToken, enrichUserContext, calendarRoutes);
app.use('/api/library', verifyToken, enrichUserContext, libraryRoutes);
app.use('/api/transport', verifyToken, enrichUserContext, transportRoutes);
app.use('/api/inventory', verifyToken, enrichUserContext, inventoryRoutes);
app.use('/api/subjects', verifyToken, enrichUserContext, subjectRoutes);
app.use('/api/settings', verifyToken, enrichUserContext, settingsRoutes);
app.use('/api/export', verifyToken, enrichUserContext, exportRoutes);
app.use('/api/promotion', verifyToken, enrichUserContext, promotionRoutes);
app.use('/api/admin', verifyToken, enrichUserContext, adminRoutes);
app.use('/api/dashboard', verifyToken, enrichUserContext, dashboardRoutes);

// ============================================
// TEACHER DASHBOARD ROUTES
// ============================================

app.get('/api/teacher/stats', verifyToken, enrichUserContext, dashboardController.getTeacherStats);
app.get('/api/teacher/classes', verifyToken, enrichUserContext, dashboardController.getTeacherClasses);
app.get('/api/teacher/schedule', verifyToken, enrichUserContext, dashboardController.getTodaySchedule);
app.get('/api/teacher/notifications', verifyToken, enrichUserContext, dashboardController.getNotifications);
app.get('/api/teacher/activities', verifyToken, enrichUserContext, dashboardController.getRecentActivities);
app.get('/api/teacher/profile', verifyToken, enrichUserContext, dashboardController.getTeacherProfile);
app.get('/api/teacher/classes/:classId/students', verifyToken, enrichUserContext, dashboardController.getClassStudents);
app.post('/api/teacher/attendance', verifyToken, enrichUserContext, dashboardController.saveAttendance);
app.get('/api/teacher/attendance/:classId/:date', verifyToken, enrichUserContext, dashboardController.getAttendanceByClass);
app.post('/api/teacher/marks', verifyToken, enrichUserContext, dashboardController.saveMarks);
app.get('/api/teacher/marks/:classId', verifyToken, enrichUserContext, dashboardController.getMarksByClass);
// Report cards generation endpoint (used by TeacherGrades page)
app.post('/api/teacher/marks/report-cards', verifyToken, enrichUserContext, dashboardController.generateTeacherReportCards);
app.get('/api/teacher/subjects', verifyToken, enrichUserContext, dashboardController.getTeacherSubjects);


// ============================================
// ADMIN DASHBOARD ROUTES
// ============================================

app.get('/api/admin/stats', verifyToken, enrichUserContext, dashboardController.getAdminStats);
app.get('/api/admin/recent-activities', verifyToken, enrichUserContext, dashboardController.getRecentActivities);
app.get('/api/admin/system-health', verifyToken, enrichUserContext, dashboardController.getSystemHealth);

// ============================================
// PARENT DASHBOARD ROUTES
// ============================================

app.get('/api/parent/children', verifyToken, enrichUserContext, dashboardController.getParentChildren);
app.get('/api/parent/child/:childId/grades', verifyToken, enrichUserContext, dashboardController.getChildGrades);
app.get('/api/parent/child/:childId/attendance', verifyToken, enrichUserContext, dashboardController.getChildAttendance);
app.get('/api/parent/child/:childId/timetable', verifyToken, enrichUserContext, dashboardController.getChildTimetable);
app.get('/api/parent/child/:childId/fees', verifyToken, enrichUserContext, dashboardController.getChildFees);
// Parent performance
app.get('/api/parent/child/:childId/performance', verifyToken, enrichUserContext, dashboardController.getChildPerformance);
// Parent notifications, stats, performance, and subjects
app.get('/api/parent/notifications', verifyToken, enrichUserContext, dashboardController.getParentNotifications);
app.get('/api/parent/stats', verifyToken, enrichUserContext, dashboardController.getParentStats);
app.get('/api/parent/performance', verifyToken, enrichUserContext, dashboardController.getParentPerformance);
app.get('/api/parent/child/:childId/subjects', verifyToken, enrichUserContext, dashboardController.getChildSubjects);


// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).json({
        success: false,
        error: err.message || 'Something went wrong!'
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
    console.log(` API URL: http://localhost:${PORT}`);
    console.log('\n Teacher Dashboard routes loaded');
    console.log(' Admin Dashboard routes loaded');
    console.log(' Parent Dashboard routes loaded');
});

module.exports = app;