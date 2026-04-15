import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import Classes from './pages/Classes.jsx';
import Fees from './pages/Fees.jsx';
import Grades from './pages/Grades.jsx';
import StudentForm from './components/StudentForm.jsx';
import AttendanceSummary from './components/AttendanceSummary.jsx';






import './App.css';

function App() {
  // Navigation state
  const [currentPage, setCurrentPage] = useState('students');
  
  // Students state
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({ students: 0, classes: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'M',
    class_id: '',
    level: 'Primary',
    parent_name: '',
    parent_phone: '',
    address: ''
  });

  // Teachers state
  const [teachers, setTeachers] = useState([]);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [teacherFormData, setTeacherFormData] = useState({
    first_name: '',
    last_name: '',
    subject_specialty: '',
    phone: '',
    email: '',
    employment_date: ''
  });

  // Grades state
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedYear, setSelectedYear] = useState('2024-2025');
  const [classStudents, setClassStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [showReportCard, setShowReportCard] = useState(false);
  const [reportCardData, setReportCardData] = useState(null);
  
  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceClass, setAttendanceClass] = useState('');
  const [attendanceList, setAttendanceList] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [selectedStudentForSummary, setSelectedStudentForSummary] = useState(null);
  const [attendanceTerm, setAttendanceTerm] = useState('1');

// Currency state
const [currency, setCurrency] = useState({ symbol: '₵', name: 'Ghana Cedis', code: 'GHS' });
const [loadingCurrency, setLoadingCurrency] = useState(true);

// Fees Management state
const [feeStudents, setFeeStudents] = useState([]);
const [feeTypes, setFeeTypes] = useState([]);
const [selectedFeeClass, setSelectedFeeClass] = useState('');
const [selectedFeeTerm, setSelectedFeeTerm] = useState('1');
const [selectedFeeYear, setSelectedFeeYear] = useState('2024-2025');
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [selectedStudentForPayment, setSelectedStudentForPayment] = useState(null);
const [paymentData, setPaymentData] = useState({
  fee_type: '',
  amount: '',
  payment_method: 'cash',
  transaction_id: ''
});
const [feeSummary, setFeeSummary] = useState(null);
const [showReceiptModal, setShowReceiptModal] = useState(false);
const [receiptData, setReceiptData] = useState(null);
const [schoolFeeSummary, setSchoolFeeSummary] = useState(null);

// Settings state
const [showSettingsModal, setShowSettingsModal] = useState(false);
const [settingsForm, setSettingsForm] = useState({
  currency_symbol: '₵',
  currency_name: 'Ghana Cedis',
  currency_code: 'GHS',
  daily_fine_rate: 1.00
});

  // Term Settings state
  const [showTermSettings, setShowTermSettings] = useState(false);
  const [termSettings, setTermSettings] = useState({
    term1_total_days: 60,
    term2_total_days: 60,
    term3_total_days: 45,
    academic_year: '2024-2025'
  });
  
  const API_BASE = 'http://localhost:5000/api';

  // Load currency on app start
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        setLoadingCurrency(true);
        const response = await fetch(`${API_BASE}/settings/currency`);
        const result = await response.json();
        if (result.success) {
          setCurrency(result.data);
        }
      } catch (error) {
        console.error('Error loading currency:', error);
        // Fallback to default
        setCurrency({ symbol: '₵', name: 'Ghana Cedis', code: 'GHS' });
      } finally {
        setLoadingCurrency(false);
      }
    };
    loadCurrency();
  }, []);

  // Load data based on current page when it changes 
  useEffect(() => {
    if (currentPage === 'students') {
      loadStudents();
    } else if (currentPage === 'teachers') {
      loadTeachers();
    } else if (currentPage === 'grades') {
      loadClasses();
    } else if (currentPage === 'attendance') {
      loadClasses();
      loadTermSettings();
    } else if (currentPage === 'fees') {
      loadClasses();
      loadFeeTypes();
      loadSchoolFeeSummary();
    }
  }, [currentPage]);

  // ==================== TERM SETTINGS FUNCTIONS ====================
  const loadTermSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/term`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setTermSettings(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading term settings:', error);
    }
  };

  const saveTermSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/term`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(termSettings)
      });
      
      if (response.ok) {
        alert('Term settings saved successfully!');
        setShowTermSettings(false);
      } else {
        alert('Error saving settings');
      }
    } catch (error) {
      console.error('Error saving term settings:', error);
      alert('Error saving settings');
    }
  };

  // ==================== STUDENT FUNCTIONS ====================
  const loadStudents = async () => {
    setLoading(true);
    try {
      const classesResponse = await fetch(`${API_BASE}/classes`);
      const classesResult = await classesResponse.json();
      const classesData = classesResult.data || [];
      setClasses(classesData);
      
      const studentsResponse = await fetch(`${API_BASE}/students`);
      const studentsResult = await studentsResponse.json();
      const studentsData = studentsResult.data || [];
      
      setStudents(studentsData);
      setStats({
        students: studentsData.length,
        classes: classesData.length
      });
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    
    const parentNameInput = document.querySelector('input[name="parent_name"]');
    const parentPhoneInput = document.querySelector('input[name="parent_phone"]');
    
    const directParentName = parentNameInput ? parentNameInput.value : formData.parent_name;
    const directParentPhone = parentPhoneInput ? parentPhoneInput.value : formData.parent_phone;
    
    const submissionData = {
      ...formData,
      parent_name: directParentName || formData.parent_name,
      parent_phone: directParentPhone || formData.parent_phone
    };
    
    if (!submissionData.parent_name || submissionData.parent_name.trim() === '') {
      alert('Please enter parent name');
      return;
    }
    if (!submissionData.parent_phone || submissionData.parent_phone.trim() === '') {
      alert('Please enter parent phone number');
      return;
    }
    
    try {
      const url = editingStudent 
        ? `${API_BASE}/students/${editingStudent.id}`
        : `${API_BASE}/students`;
      const method = editingStudent ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Student saved successfully!');
        setShowModal(false);
        resetStudentForm();
        loadStudents();
      } else {
        alert('Error: ' + (data.error || 'Failed to save student'));
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Network error: ' + error.message);
    }
  };

  const handleStudentDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        const response = await fetch(`${API_BASE}/students/${id}`, { method: 'DELETE' });
        if (response.ok) {
          alert('Student deleted successfully');
          loadStudents();
        } else {
          alert('Failed to delete student');
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Network error: ' + error.message);
      }
    }
  };

  const handleStudentEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      first_name: student.first_name,
      last_name: student.last_name,
      date_of_birth: student.date_of_birth?.split('T')[0] || '',
      gender: student.gender,
      class_id: student.class_id,
      level: student.level,
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      address: student.address || ''
    });
    setShowModal(true);
  };

  const resetStudentForm = () => {
    setEditingStudent(null);
    setFormData({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: 'M',
      class_id: '',
      level: 'Primary',
      parent_name: '',
      parent_phone: '',
      address: ''
    });
  };

  // ==================== TEACHER FUNCTIONS ====================
  const loadTeachers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/teachers`);
      const result = await response.json();
      setTeachers(result.data || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingTeacher 
        ? `${API_BASE}/teachers/${editingTeacher.id}`
        : `${API_BASE}/teachers`;
      const method = editingTeacher ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacherFormData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Teacher saved successfully!');
        setShowTeacherModal(false);
        resetTeacherForm();
        loadTeachers();
      } else {
        alert('Error: ' + (data.error || 'Failed to save teacher'));
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Network error: ' + error.message);
    }
  };

  const handleTeacherDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        const response = await fetch(`${API_BASE}/teachers/${id}`, { method: 'DELETE' });
        if (response.ok) {
          alert('Teacher deleted successfully');
          loadTeachers();
        } else {
          const data = await response.json();
          alert('Error: ' + (data.error || 'Failed to delete teacher'));
        }
      } catch (error) {
        console.error('Error deleting teacher:', error);
        alert('Network error: ' + error.message);
      }
    }
  };

  const handleTeacherEdit = (teacher) => {
    setEditingTeacher(teacher);
    setTeacherFormData({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      subject_specialty: teacher.subject_specialty,
      phone: teacher.phone,
      email: teacher.email,
      employment_date: teacher.employment_date?.split('T')[0] || ''
    });
    setShowTeacherModal(true);
  };

  const resetTeacherForm = () => {
    setEditingTeacher(null);
    setTeacherFormData({
      first_name: '',
      last_name: '',
      subject_specialty: '',
      phone: '',
      email: '',
      employment_date: ''
    });
  };

  // ==================== GRADE FUNCTIONS ====================
  const loadClasses = async () => {
    try {
      const response = await fetch(`${API_BASE}/classes`);
      const result = await response.json();
      setClasses(result.data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadSubjectsForClass = async (classId) => {
    if (!classId) return;
    try {
      const classResponse = await fetch(`${API_BASE}/classes/${classId}`);
      const classResult = await classResponse.json();
      const classLevel = classResult.data?.level;
      
      if (classLevel) {
        const subjectsResponse = await fetch(`${API_BASE}/subjects/level/${classLevel}`);
        const subjectsResult = await subjectsResponse.json();
        setSubjects(subjectsResult.data || []);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadClassStudents = async () => {
    if (!selectedClass) {
      alert('Please select a class');
      return;
    }
    
    setLoading(true);
    try {
      await loadSubjectsForClass(selectedClass);
      
      const response = await fetch(`${API_BASE}/students/class/${selectedClass}`);
      const result = await response.json();
      setClassStudents(result.data || []);
      
      const gradesResponse = await fetch(`${API_BASE}/grades?class_id=${selectedClass}&term=${selectedTerm}&academic_year=${selectedYear}`);
      const gradesResult = await gradesResponse.json();
      const existingGrades = gradesResult.data || [];
      
      const initialGrades = {};
      result.data.forEach(student => {
        initialGrades[student.id] = {};
        subjects.forEach(subject => {
          const existingGrade = existingGrades.find(g => g.student_id === student.id && g.subject === subject.name);
          if (existingGrade) {
            initialGrades[student.id][subject.name] = { 
              ca: existingGrade.continuous_assessment, 
              exam: existingGrade.exam_score 
            };
          } else {
            initialGrades[student.id][subject.name] = { ca: '', exam: '' };
          }
        });
      });
      setGrades(initialGrades);
      
    } catch (error) {
      console.error('Error loading class students:', error);
      alert('Error loading students');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId, subject, field, value) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subject]: {
          ...prev[studentId][subject],
          [field]: value
        }
      }
    }));
  };

  const saveAllGrades = async () => {
    setLoading(true);
    let savedCount = 0;
    let errorCount = 0;
    
    try {
      for (const studentId of Object.keys(grades)) {
        for (const subject of Object.keys(grades[studentId])) {
          const gradeData = grades[studentId][subject];
          if (gradeData.ca && gradeData.exam) {
            const ca = parseFloat(gradeData.ca);
            const exam = parseFloat(gradeData.exam);
            
            if (ca < 0 || ca > 40) {
              alert(`CA for ${subject} must be between 0 and 40`);
              continue;
            }
            if (exam < 0 || exam > 60) {
              alert(`Exam score for ${subject} must be between 0 and 60`);
              continue;
            }
            
            const response = await fetch(`${API_BASE}/grades`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                student_id: parseInt(studentId),
                subject: subject,
                term: parseInt(selectedTerm),
                term_name: `Term ${selectedTerm}`,
                academic_year: selectedYear,
                class_id: parseInt(selectedClass),
                continuous_assessment: ca,
                exam_score: exam
              })
            });
            
            if (response.ok) {
              savedCount++;
            } else {
              errorCount++;
            }
          }
        }
      }
      
      alert(`Saved ${savedCount} grades successfully! ${errorCount > 0 ? `Errors: ${errorCount}` : ''}`);
      await loadClassStudents();
      
    } catch (error) {
      console.error('Error saving grades:', error);
      alert('Error saving grades: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const viewReportCard = async (studentId) => {
    try {
      const response = await fetch(`${API_BASE}/grades/report-card/${studentId}?term=${selectedTerm}&academic_year=${selectedYear}`);
      const result = await response.json();
      if (result.success && result.data) {
        setReportCardData(result.data);
        setShowReportCard(true);
      } else {
        alert('No grades found for this student');
      }
    } catch (error) {
      console.error('Error loading report card:', error);
      alert('Error loading report card');
    }
  };

  // ==================== FEE MANAGEMENT FUNCTIONS ====================
const loadFeeStudents = async () => {
  if (!selectedFeeClass) {
    alert('Please select a class');
    return;
  }
  
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE}/fees/class/${selectedFeeClass}?term=${selectedFeeTerm}&academic_year=${selectedFeeYear}`);
    const result = await response.json();
    setFeeStudents(result.data || []);
  } catch (error) {
    console.error('Error loading fee students:', error);
    alert('Error loading students');
  } finally {
    setLoading(false);
  }
};

const loadFeeTypes = async () => {
  try {
    const response = await fetch(`${API_BASE}/fees/types`);
    const result = await response.json();
    setFeeTypes(result.data || []);
  } catch (error) {
    console.error('Error loading fee types:', error);
  }
};

const loadSchoolFeeSummary = async () => {
  try {
    const response = await fetch(`${API_BASE}/fees/school-summary?academic_year=${selectedFeeYear}`);
    const result = await response.json();
    if (result.success) {
      setSchoolFeeSummary(result.data);
    }
  } catch (error) {
    console.error('Error loading school fee summary:', error);
  }
};

const openPaymentModal = (student) => {
  setSelectedStudentForPayment(student);
  setPaymentData({
    fee_type: feeTypes[0]?.name || '',
    amount: '',
    payment_method: 'cash',
    transaction_id: ''
  });
  setShowPaymentModal(true);
};

const handlePaymentSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    const response = await fetch(`${API_BASE}/fees/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: selectedStudentForPayment.student_id,
        fee_type: paymentData.fee_type,
        term: parseInt(selectedFeeTerm),
        term_name: `Term ${selectedFeeTerm}`,
        academic_year: selectedFeeYear,
        amount: parseFloat(paymentData.amount),
        payment_method: paymentData.payment_method,
        transaction_id: paymentData.transaction_id || null,
        recorded_by: 1
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('Payment recorded successfully!');
      setShowPaymentModal(false);
      loadFeeStudents();
      loadSchoolFeeSummary();
      
      // Load receipt
      if (result.data) {
        const receiptResponse = await fetch(`${API_BASE}/fees/receipt/${result.data.id}`);
        const receiptResult = await receiptResponse.json();
        if (receiptResult.success) {
          setReceiptData(receiptResult.data);
          setShowReceiptModal(true);
        }
      }
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error recording payment:', error);
    alert('Error recording payment');
  } finally {
    setLoading(false);
  }
};

const viewStudentFeeSummary = async (studentId) => {
  try {
    const response = await fetch(`${API_BASE}/fees/student/${studentId}?academic_year=${selectedFeeYear}`);
    const result = await response.json();
    if (result.success) {
      setFeeSummary(result.data);
    }
  } catch (error) {
    console.error('Error loading fee summary:', error);
    alert('Error loading fee summary');
  }
};

  // ==================== ATTENDANCE FUNCTIONS ====================
  const loadAttendanceStudents = async () => {
    if (!attendanceClass) {
      alert('Please select a class');
      return;
    }
    
    setLoading(true);
    try {
      const studentsResponse = await fetch(`${API_BASE}/students/class/${attendanceClass}`);
      const studentsResult = await studentsResponse.json();
      const students = studentsResult.data || [];
      
      const existingAttendanceResponse = await fetch(
        `${API_BASE}/attendance/class/${attendanceClass}?date=${attendanceDate}&term=${attendanceTerm}&academic_year=2024-2025`
      );
      const existingAttendance = await existingAttendanceResponse.json();
      
      const initialAttendance = students.map(student => {
        const existing = existingAttendance.data?.find(a => a.student_id === student.id);
        return {
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          admission_number: student.admission_number,
          status: existing ? existing.status : 'present',
          remarks: existing ? existing.remarks : ''
        };
      });
      
      setAttendanceList(initialAttendance);
    } catch (error) {
      console.error('Error loading attendance students:', error);
      alert('Error loading students');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendanceList(prev =>
      prev.map(student =>
        student.student_id === studentId
          ? { ...student, status }
          : student
      )
    );
  };

  const saveAttendance = async () => {
    setLoading(true);
    try {
      const attendanceData = {
        class_id: parseInt(attendanceClass),
        date: attendanceDate,
        attendance_list: attendanceList.map(a => ({
          student_id: a.student_id,
          status: a.status,
          remarks: a.remarks
        })),
        term: parseInt(attendanceTerm),
        academic_year: '2024-2025'
      };
      
      const response = await fetch(`${API_BASE}/attendance/class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert(`Attendance saved successfully! ${result.count} records updated.`);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Error saving attendance');
    } finally {
      setLoading(false);
    }
  };

  const viewStudentAttendanceSummary = async (studentId) => {
    try {
      const response = await fetch(
        `${API_BASE}/attendance/student-summary/${studentId}?term=${attendanceTerm}&academic_year=2024-2025`
      );
      const result = await response.json();
      if (result.success) {
        // Calculate percentage based on term total days
        let termTotalDays = 60;
        if (attendanceTerm === '1') termTotalDays = termSettings.term1_total_days;
        else if (attendanceTerm === '2') termTotalDays = termSettings.term2_total_days;
        else if (attendanceTerm === '3') termTotalDays = termSettings.term3_total_days;
        
        const presentDays = result.data.present || 0;
        const percentage = termTotalDays > 0 ? (presentDays / termTotalDays) * 100 : 0;
        
        setAttendanceSummary({
          ...result.data,
          term_total_days: termTotalDays,
          attendance_percentage: percentage.toFixed(2)
        });
        setSelectedStudentForSummary(studentId);
      }
    } catch (error) {
      console.error('Error loading attendance summary:', error);
      alert('Error loading attendance summary');
    }
  };

if (loading) {
  return <div className="loading">Loading...</div>;
}

// Render the dashboard with navigation and conditional content based on currentPage
return (
  <div className="app">
    <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
    
    <div className="main-content">
      <div className="content-wrapper">
        {/* DASHBOARD PAGE */}
        {currentPage === 'dashboard' && (
          <Dashboard API_BASE={API_BASE} />
        )}

        {/* STUDENTS PAGE */}
        {currentPage === 'students' && (
          <>
            <div className="stats">
              <div className="stat-card">
                <h3>Total Students</h3>
                <div className="stat-number">{stats.students}</div>
              </div>
              <div className="stat-card">
                <h3>Total Classes</h3>
                <div className="stat-number">{stats.classes}</div>
              </div>
            </div>

            <div className="students-section">
              <div className="section-header">
                <h2>Student Management</h2>
                <button className="btn-add" onClick={() => setShowModal(true)}>
                  + Add Student
                </button>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Admission No</th>
                      <th>Name</th>
                      <th>Class</th>
                      <th>Parent Name</th>
                      <th>Parent Phone</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr><td colSpan="6" style={{textAlign: 'center'}}>No students found.</td></tr>
                    ) : (
                      students.map(student => (
                        <tr key={student.id}>
                          <td>{student.admission_number}</td>
                          <td>{student.first_name} {student.last_name}</td>
                          <td>{student.class_name || student.class_id}</td>
                          <td style={{color: student.parent_name ? 'green' : 'red'}}>
                            {student.parent_name || 'MISSING'}
                          </td>
                          <td>{student.parent_phone || '-'}</td>
                          <td>
                            <button className="btn-edit" onClick={() => handleStudentEdit(student)}>Edit</button>
                            <button className="btn-delete" onClick={() => handleStudentDelete(student.id)}>Delete</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* CLASSES PAGE */}
        {currentPage === 'classes' && (
          <Classes API_BASE={API_BASE} />
        )}

        {/* TEACHERS PAGE */}
        {currentPage === 'teachers' && (
          <div className="students-section">
            <div className="section-header">
              <h2>Teacher Management</h2>
              <button className="btn-add" onClick={() => setShowTeacherModal(true)}>
                + Add Teacher
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Teacher Code</th>
                    <th>Name</th>
                    <th>Subject</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.length === 0 ? (
                    <tr><td colSpan="6" style={{textAlign: 'center'}}>No teachers found.</td></tr>
                  ) : (
                    teachers.map(teacher => (
                      <tr key={teacher.id}>
                        <td>{teacher.teacher_code}</td>
                        <td>{teacher.first_name} {teacher.last_name}</td>
                        <td>{teacher.subject_specialty}</td>
                        <td>{teacher.phone}</td>
                        <td>{teacher.email}</td>
                        <td>
                          <button className="btn-edit" onClick={() => handleTeacherEdit(teacher)}>Edit</button>
                          <button className="btn-delete" onClick={() => handleTeacherDelete(teacher.id)}>Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* ATTENDANCE PAGE */}
        {currentPage === 'attendance' && (
          <div className="students-section">
            <div className="section-header">
              <h2>Attendance Tracking</h2>
              <button className="btn-secondary" onClick={() => setShowTermSettings(true)}>
                ⚙️ Term Settings
              </button>
            </div>

            <div className="filters">
              <select 
                value={attendanceClass} 
                onChange={(e) => setAttendanceClass(e.target.value)}
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name} ({cls.level})</option>
                ))}
              </select>
              
              <select 
                value={attendanceTerm} 
                onChange={(e) => setAttendanceTerm(e.target.value)}
              >
                <option value="1">First Term</option>
                <option value="2">Second Term</option>
                <option value="3">Third Term</option>
              </select>
              
              <input 
                type="date" 
                value={attendanceDate} 
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
              
              <button className="btn-primary" onClick={loadAttendanceStudents}>Load Students</button>
            </div>

            {attendanceList.length > 0 && (
              <>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Admission No</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceList.map(student => (
                        <tr key={student.student_id}>
                          <td>{student.student_name}</td>
                          <td>{student.admission_number || '-'}</td>
                          <td>
                            <select 
                              value={student.status}
                              onChange={(e) => handleAttendanceChange(student.student_id, e.target.value)}
                            >
                              <option value="present">✅ Present</option>
                              <option value="absent">❌ Absent</option>
                              <option value="late">⏰ Late</option>
                              <option value="excused">📝 Excused</option>
                            </select>
                          </td>
                          <td>
        <button className="btn-edit" onClick={() => viewStudentAttendanceSummary(student.student_id)}>
          View Summary
        </button>
      </td>
    </tr>
  ))}
</tbody>
</table>
</div>

<div className="save-button-container">
  <button className="btn-primary" onClick={saveAttendance}>💾 Save Attendance</button>
</div>
</>
)}
          </div>
        )}

        {/* FEES PAGE */}
        {currentPage === 'fees' && (
          <Fees API_BASE={API_BASE} />
        )}

        {/* GRADES PAGE */}
{currentPage === 'grades' && (
          <Grades API_BASE={API_BASE} />
        )}


        {/* FEES PAGE */}
{currentPage === 'fees' && (
          <Fees API_BASE={API_BASE} />
        )}

      </div>
    </div>

    {/* Student Modal */}
    {showModal && (
      <StudentForm 
        formData={formData}
        onChange={(field, value) => setFormData({...formData, [field]: value})}
        onSubmit={handleStudentSubmit}
        editingStudent={editingStudent}
        classes={classes}
        closeModal={() => setShowModal(false)}
      />
    )}


    {/* Teacher Modal */}
    {showTeacherModal && (
      <div className="modal">
        <div className="modal-content">
          <span className="close" onClick={() => setShowTeacherModal(false)}>&times;</span>
          <h2>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</h2>
          <form onSubmit={handleTeacherSubmit}>
            <input type="text" placeholder="First Name" value={teacherFormData.first_name} onChange={(e) => setTeacherFormData({...teacherFormData, first_name: e.target.value})} required />
            <input type="text" placeholder="Last Name" value={teacherFormData.last_name} onChange={(e) => setTeacherFormData({...teacherFormData, last_name: e.target.value})} required />
            <input type="text" placeholder="Subject Specialty" value={teacherFormData.subject_specialty} onChange={(e) => setTeacherFormData({...teacherFormData, subject_specialty: e.target.value})} required />
            <input type="tel" placeholder="Phone" value={teacherFormData.phone} onChange={(e) => setTeacherFormData({...teacherFormData, phone: e.target.value})} required />
            <input type="email" placeholder="Email" value={teacherFormData.email} onChange={(e) => setTeacherFormData({...teacherFormData, email: e.target.value})} required />
            <input type="date" placeholder="Employment Date" value={teacherFormData.employment_date} onChange={(e) => setTeacherFormData({...teacherFormData, employment_date: e.target.value})} required />
            <button type="submit">{editingTeacher ? 'Update' : 'Add'} Teacher</button>
          </form>
        </div>
      </div>
    )}

    {/* Report Card Modal */}
    {showReportCard && reportCardData && (
      <div className="modal">
        <div className="modal-content">
          <span className="close" onClick={() => setShowReportCard(false)}>&times;</span>
          <h2>Report Card</h2>
          <p><strong>Student:</strong> {reportCardData.student_name}</p>
          <div className="report-card">
            {reportCardData.grades?.map(grade => (
              <div key={grade.subject} className="grade-item">
                <span>{grade.subject}: {grade.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Term Settings Modal */}
    {showTermSettings && (
      <div className="modal">
        <div className="modal-content">
          <span className="close" onClick={() => setShowTermSettings(false)}>&times;</span>
          <h2>Term Settings</h2>
          <form onSubmit={(e) => { e.preventDefault(); saveTermSettings(); }}>
            <input type="text" placeholder="Academic Year" value={termSettings.academic_year} onChange={(e) => setTermSettings({...termSettings, academic_year: e.target.value})} />
            <input type="number" placeholder="Term 1 Days" value={termSettings.term1_total_days} onChange={(e) => setTermSettings({...termSettings, term1_total_days: parseInt(e.target.value)})} />
            <input type="number" placeholder="Term 2 Days" value={termSettings.term2_total_days} onChange={(e) => setTermSettings({...termSettings, term2_total_days: parseInt(e.target.value)})} />
            <input type="number" placeholder="Term 3 Days" value={termSettings.term3_total_days} onChange={(e) => setTermSettings({...termSettings, term3_total_days: parseInt(e.target.value)})} />
            <button type="submit">Save Settings</button>
          </form>
        </div>
      </div>
    )}

    {/* Payment Modal */}
    {showPaymentModal && selectedStudentForPayment && (
      <div className="modal">
        <div className="modal-content">
          <span className="close" onClick={() => setShowPaymentModal(false)}>&times;</span>
          <h2>Record Payment</h2>
          <form onSubmit={handlePaymentSubmit}>
            <select value={paymentData.fee_type} onChange={(e) => setPaymentData({...paymentData, fee_type: e.target.value})} required>
              <option value="">Select Fee Type</option>
              {feeTypes.map(type => (<option key={type.id} value={type.name}>{type.name}</option>))}
            </select>
            <input type="number" placeholder="Amount" value={paymentData.amount} onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})} required />
            <select value={paymentData.payment_method} onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="transfer">Bank Transfer</option>
            </select>
            <input type="text" placeholder="Transaction ID" value={paymentData.transaction_id} onChange={(e) => setPaymentData({...paymentData, transaction_id: e.target.value})} />
            <button type="submit">Record Payment</button>
          </form>
        </div>
      </div>
    )}

    {/* Receipt Modal */}
    {showReceiptModal && receiptData && (
      <div className="modal">
        <div className="modal-content">
          <span className="close" onClick={() => setShowReceiptModal(false)}>&times;</span>
          <h2>Payment Receipt</h2>
          <div className="receipt">
            <p><strong>Student:</strong> {receiptData.student_name}</p>
            <p><strong>Fee Type:</strong> {receiptData.fee_type}</p>
            <p><strong>Amount:</strong> {currency.symbol}{receiptData.amount}</p>
            <p><strong>Date:</strong> {new Date(receiptData.payment_date).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    )}

    {/* Fee Summary Modal */}
    {feeSummary && (
      <div className="modal">
        <div className="modal-content">
          <span className="close" onClick={() => setFeeSummary(null)}>&times;</span>
          <h2>Fee Summary</h2>
          <div className="summary">
            <p><strong>Expected:</strong> {currency.symbol}{feeSummary.expected}</p>
            <p><strong>Paid:</strong> {currency.symbol}{feeSummary.paid}</p>
            <p><strong>Balance:</strong> {currency.symbol}{feeSummary.balance}</p>
          </div>
        </div>
      </div>
    )}

    {/* Attendance Summary Modal */}
    {attendanceSummary && selectedStudentForSummary && (
      <AttendanceSummary 
        summary={attendanceSummary} 
        closeModal={() => { setAttendanceSummary(null); setSelectedStudentForSummary(null); }} 
      />
    )}
  </div>  
)};

export default App;

