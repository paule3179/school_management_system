const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

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


// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Basic School Student Data System API',
    version: '4.0.0',
    modules: {
      students: '/api/students',
      classes: '/api/classes',
      teachers: '/api/teachers',
      parents: '/api/parents',
      grades: '/api/grades',
      attendance: '/api/attendance',
      timetables: '/api/timetables',
      fees: '/api/fees',
      exams: '/api/exams',
      messages: '/api/messages',
      documents: '/api/documents',
      calendar: '/api/calendar',
      library: '/api/library',
      transport: '/api/transport',
      inventory: '/api/inventory'
    }
  });
});

// API routes
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/settings', settingsRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` API URL: http://localhost:${PORT}`);
  console.log('\nAvailable Modules (15 Total):');
  console.log('   1. Students     - /api/students');
  console.log('   2. Classes      - /api/classes');
  console.log('   3. Teachers     - /api/teachers');
  console.log('   4. Parents      - /api/parents');
  console.log('   5. Grades       - /api/grades');
  console.log('   6. Attendance   - /api/attendance');
  console.log('   7. Timetables   - /api/timetables');
  console.log('   8. Fees         - /api/fees');
  console.log('   9. Exams        - /api/exams');
  console.log('   10. Messages    - /api/messages');
  console.log('   11. Documents   - /api/documents');
  console.log('   12. Calendar    - /api/calendar');
  console.log('   13. Library     - /api/library');
  console.log('   14. Transport   - /api/transport');
  console.log('   15. Inventory   - /api/inventory');
  console.log("DATABASE_URL =", process.env.DATABASE_URL);
});