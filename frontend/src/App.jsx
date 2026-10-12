import { apiFetch } from './services/api.js';
// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import ParentDashboard from './components/ParentDashboard';
import TeacherGrades from './pages/teacher/TeacherGrades';
import AssessmentEntryPage from './pages/teacher/AssessmentEntryPage';
import ExamEntryPage from './pages/teacher/ExamEntryPage';
import Dashboard from './components/Dashboard';
import StudentsPage from './components/StudentsPage';
import Classes from "./pages/Classes";
import Teachers from './pages/Teachers';  
import ToastNotification from './components/ToastNotification';
import UsersPage from './components/UsersPage';
import TimetablePage from './components/TimetablePage'; 
import Fees from './pages/Fees';
import Grades from './pages/Grades';
import Attendance from './components/Attendance';
import SettingsPage from './components/SettingsPage';
import Subjects from './pages/Subjects';
import geebzLogo from './assets/logo.png';



const AppContentWrapperForRoute = () => {
  // Reuse the legacy promotion content embedded in AppContent
  // while keeping the same auth wrapper/layout.
  const [_, _setTick] = useState(0);
  return (
    <AppContent key={_} />
  );
};




import './App.css';
import './mobileSidebarFix.css';
import PromotionModal from './components/promotion/promotionModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
/* eslint-disable no-unused-vars */
import { 
  faChartLine, faUserGraduate, faChalkboardUser, faBookOpen, faArrowUp,
  faCalendarCheck, faChartSimple, faCoins, faList, faUsers, faHistory,
  faCog, faSignOutAlt, faCalendarAlt, faBook
} from '@fortawesome/free-solid-svg-icons';

// ============================================
// HELPER FUNCTION  
// ============================================
const getOrdinal = (n) => {
  const num = parseInt(n, 10);
  if (num === 1) return 'st';
  if (num === 2) return 'nd';
  if (num === 3) return 'rd';
  return 'th';
};

// ============================================
// SUCCESS TOAST COMPONENT
// ============================================
const SuccessToast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="success-toast">
      <div className="toast-content">
        <span className="toast-icon">✅</span>
        <span className="toast-message">{message || 'Operation completed successfully!'}</span>
        <button className="toast-close" onClick={onClose}>&times;</button>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP CONTENT COMPONENT (uses Auth)
// ============================================
const AppContent = () => {
const { user, userRole, loading: authLoading, logout } = useAuth();  
  // NAVIGATION STATE
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // STUDENTS STATE
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({ students: 0, classes: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'M',
    class_id: '',
    level: 'Primary',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    address: ''
  });

  // CLASS STATE
  const [classFormData, setClassFormData] = useState({
    name: '',
    level: 'Primary',
    capacity: 30,
    teacher_id: '',
    classroom: '',
    academic_year: '2024-2025'
  });
  const [editingClass, setEditingClass] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedClassDetails, setSelectedClassDetails] = useState(null);
  const [showClassDetails, setShowClassDetails] = useState(false);
  const [classStudentsList, setClassStudentsList] = useState([]);
  const [showClassStudents, setShowClassStudents] = useState(false);
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [classTeachers, setClassTeachers] = useState([]);

  // REPORT CARD STATE
  const [showReportCard, setShowReportCard] = useState(false);

  // GRADES STATE
  const [subjects, setSubjects] = useState([]);
  const [selectedGradeClass, setSelectedGradeClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedYear, setSelectedYear] = useState('2024-2025');
  const [classStudents, setClassStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeError, setGradeError] = useState('');
  const [reportCardData, setReportCardData] = useState(null);

  // PROMOTION STATE
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [selectedClassForPromotion, setSelectedClassForPromotion] = useState(null);
  const [promotionHistory, setPromotionHistory] = useState([]);
  const [showPromotionHistory, setShowPromotionHistory] = useState(false);
  const [promotionFilters, setPromotionFilters] = useState({
    academic_year: '2024-2025',
    class_id: ''
  }); 
  const [promotionTab, setPromotionTab] = useState('classes');
  const [promotionFilterClass, setPromotionFilterClass] = useState('');
  const [promotionFilterStatus, setPromotionFilterStatus] = useState('all');
  const [allStudentsForPromotion, setAllStudentsForPromotion] = useState([]);
  const [selectedStudentsForList, setSelectedStudentsForList] = useState({});
  const [promotionSettings, setPromotionSettings] = useState({
    minPassingGrade: 50,
    minAttendanceRate: 75,
    defaultAcademicYear: '2025-2026',
    promotionDate: new Date().toISOString().split('T')[0]
  });
  
  // FEES STATE 
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

  // TERM SETTINGS STATE
  const [showTermSettings, setShowTermSettings] = useState(false);
  const [termSettings, setTermSettings] = useState({
    term1_total_days: 60,
    term2_total_days: 60,
    term3_total_days: 45,
    academic_year: '2024-2025'
  });

  // DASHBOARD STATE 
  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalFees: 0,
    attendanceRate: 92
  });

  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [toast, setToast] = useState(null);

  const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Listen for sidebar toggle events from child components
  useEffect(() => {
    const handler = (e) => {
      const next = e?.detail?.isOpen;
      if (typeof next === 'boolean') {
        setSidebarOpen(next);
      }
    };

    window.addEventListener('sidebarToggle', handler);
    return () => window.removeEventListener('sidebarToggle', handler);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };


  // Role-based menu items
  const getMenuItems = (role) => {
    const allItems = [
      { id: 'dashboard', name: 'Dashboard', icon: faChartLine },
      { id: 'students', name: 'Students', icon: faUserGraduate },
      { id: 'teachers', name: 'Teachers', icon: faChalkboardUser },
      { id: 'classes', name: 'Classes', icon: faBookOpen },
      { id: 'subjects', name: 'Subjects', icon: faBook },
      { id: 'timetable', name: 'Timetable', icon: faCalendarAlt },
      { id: 'users', name: 'Users', icon: faUsers },
      { id: 'promotion', name: 'Promotion', icon: faArrowUp },
      { id: 'attendance', name: 'Attendance', icon: faCalendarCheck },
      { id: 'grades', name: 'Grades', icon: faChartSimple },
      { id: 'fees', name: 'Fees', icon: faCoins }
    ];
    
    if (role === 'admin') return allItems;
    if (role === 'teacher') {
      return allItems.filter(item =>
        ['dashboard', 'attendance', 'grades', 'fees', 'classes'].includes(item.id)
      );
    }
    if (role === 'parent') {
      return allItems.filter(item => ['dashboard', 'grades', 'fees'].includes(item.id));
    }
    return allItems;
  };

  const menuItems = getMenuItems(userRole);

  // Redirect if current page is not allowed for user's role
  useEffect(() => {
    if (!user) return;
    const allowedIds = getMenuItems(userRole).map(item => item.id);
    if (!allowedIds.includes(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [user, userRole, currentPage]);

  // LOAD DATA ON PAGE CHANGE 
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
    } else if (currentPage === 'dashboard') {
      loadDashboardData();
    } else if (currentPage === 'classes') {
      loadClasses();
      loadClassTeachers();
    }
  }, [currentPage, loadSchoolFeeSummary]);

  // Auto-open Promotion modal when navigating to /admin/promotion
  useEffect(() => {
    try {
      const path = window.location.pathname || '';
      if (path !== '/admin/promotion') return;

      setCurrentPage('promotion');

      // If classes are already loaded, pick a class; otherwise trigger load.
      if (!classes || classes.length === 0) {
        loadClasses();
        return;
      }

      const classWithStudents = classes.find(c => (c.current_count || 0) > 0) || classes[0];
      if (classWithStudents) {
        setSelectedClassForPromotion(classWithStudents);
        setShowPromotionModal(true);
      }
    } catch (e) {
      console.error('Auto-open promotion modal failed:', e);
    }
  }, [classes]);

  // ============================================
  // LOAD FUNCTIONS
  // ============================================
  
  const loadTeachers = async () => {
    try {
      const response = await apiFetch(`${API_BASE}/teachers`);
      const result = await response.json();
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const loadClassTeachers = async () => {
    try {
      const response = await apiFetch(`${API_BASE}/teachers`);
      const result = await response.json();
      setClassTeachers(result.data || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const loadClasses = async () => {
    setLoading(true);
    try {
      const classesResponse = await apiFetch(`${API_BASE}/classes`);
      const classesResult = await classesResponse.json();
      const classesData = classesResult.data || [];
      
      const classesWithCounts = await Promise.all(
        classesData.map(async (cls) => {
          try {
            const studentsResponse = await apiFetch(`${API_BASE}/students/class/${cls.id}`);
            const studentsResult = await studentsResponse.json();
            return {
              ...cls,
              current_count: studentsResult.data?.length || 0
            };
          } catch (err) {
            return { ...cls, current_count: 0 };
          }
        })
      );
      
      setClasses(classesWithCounts);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [studentsRes, teachersRes, classesRes, feesRes] = await Promise.all([
        apiFetch(`${API_BASE}/students`).then(r => r.json()),
        apiFetch(`${API_BASE}/teachers`).then(r => r.json()),
        apiFetch(`${API_BASE}/classes`).then(r => r.json()),
        apiFetch(`${API_BASE}/fees/school-summary?academic_year=2024-2025`).then(r => r.json())
      ]);

      setDashboardStats({
        totalStudents: studentsRes.data?.length || 0,
        totalTeachers: teachersRes.data?.length || 0,
        totalClasses: classesRes.data?.length || 0,
        totalFees: feesRes.data?.summary?.collected || 0,
        attendanceRate: 92
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadTermSettings = async () => {
    try {
      const response = await apiFetch(`${API_BASE}/settings/term`);
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

  const loadFeeTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(`${API_BASE}/fees/types`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        setFeeTypes(result.data);
      } else {
        setFeeTypes([
          { id: 1, name: 'School Fees', amount: 350 },
          { id: 2, name: 'PTA Levy', amount: 50 },
          { id: 3, name: 'Development Levy', amount: 100 },
          { id: 4, name: 'Examination Fees', amount: 75 }
        ]);
      }
    } catch (error) {
      console.error('Error loading fee types:', error);
      setFeeTypes([
        { id: 1, name: 'School Fees', amount: 350 },
        { id: 2, name: 'PTA Levy', amount: 50 },
        { id: 3, name: 'Development Levy', amount: 100 },
        { id: 4, name: 'Examination Fees', amount: 75 }
      ]);
    }
  };

  const loadSchoolFeeSummary = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(
        `${API_BASE}/fees/school-summary?academic_year=${selectedFeeYear}`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      const result = await response.json();
      if (result.success) {
        setSchoolFeeSummary(result.data);
      }
    } catch (error) {
      console.error('Error loading school fee summary:', error);
    }
  }, [selectedFeeYear]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const classesResponse = await apiFetch(`${API_BASE}/classes`);
      const classesResult = await classesResponse.json();
      const classesData = classesResult.data || [];
      setClasses(classesData);
      
      const studentsResponse = await apiFetch(`${API_BASE}/students`);
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

  // ============================================
  // STUDENT FUNCTIONS
  // ============================================

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const submissionData = {
        ...formData,
        parent_name: formData.parent_name,
        parent_phone: formData.parent_phone,
        parent_email: formData.parent_email,
        status: 'active'
      };
      
      const url = editingStudent 
        ? `${API_BASE}/students/${editingStudent.id}`
        : `${API_BASE}/students`;
      const method = editingStudent ? 'PUT' : 'POST';
      
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        if (!editingStudent && formData.parent_email) {
          try {
            const token = localStorage.getItem('token');
            const studentId = result.data?.id || result.id;
            
            await apiFetch(`${API_BASE}/auth/notify-parent/${studentId}`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                parentEmail: formData.parent_email,
                parentName: formData.parent_name,
                studentName: `${formData.first_name} ${formData.last_name}`,
                studentAdmission: result.data?.admission_number || result.admission_number
              })
            });
          } catch (notifyError) {
            console.error('Notification error:', notifyError);
          }
        }
        
        showToast(editingStudent ? 'Student updated successfully!' : 'Student added successfully!', 'success');
        setShowModal(false);
        resetStudentForm();
        loadStudents();
      } else {
        showToast('Error: ' + (result.error || 'Failed to save student'), 'error');
      }
    } catch (error) {
      console.error('Error saving student:', error);
      showToast('Network error: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        const response = await apiFetch(`${API_BASE}/students/${id}`, { method: 'DELETE' });
        if (response.ok) {
          showToast('Student deleted successfully!', 'success');
          loadStudents();
        } else {
          showToast('Failed to delete student', 'error');
        }
      } catch (error) {
        showToast('Network error: ' + error.message, 'error');
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
      parent_email: student.parent_email || '',
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
      parent_email: '',
      address: ''
    });
  };

  // ============================================
  // CLASS FUNCTIONS
  // ============================================

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const submitData = {
        name: classFormData.name,
        level: classFormData.level,
        capacity: parseInt(classFormData.capacity) || 30,
        teacher_id: classFormData.teacher_id && classFormData.teacher_id !== '' ? parseInt(classFormData.teacher_id) : null,
        classroom: classFormData.classroom || null,
        academic_year: classFormData.academic_year || '2024-2025'
      };
      
      const url = editingClass 
        ? `${API_BASE}/classes/${editingClass.id}`
        : `${API_BASE}/classes`;
      const method = editingClass ? 'PUT' : 'POST';
      
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showToast(editingClass ? 'Class updated successfully!' : 'Class added successfully!', 'success');
        setShowClassModal(false);
        resetClassForm();
        loadClasses();
      } else {
        showToast('Error: ' + (data.error || 'Failed to save class'), 'error');
      }
    } catch (error) {
      console.error('Network error:', error);
      showToast('Network error: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClassEdit = (cls) => {
    setEditingClass(cls);
    setClassFormData({
      name: cls.name,
      level: cls.level,
      capacity: cls.capacity,
      teacher_id: cls.teacher_id || '',
      classroom: cls.classroom || '',
      academic_year: cls.academic_year || '2024-2025'
    });
    setShowClassModal(true);
  };

  const handleClassDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      setLoading(true);
      try {
        const response = await apiFetch(`${API_BASE}/classes/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
          showToast('Class deleted successfully!', 'success');
          loadClasses();
        } else {
          const data = await response.json();
          showToast('Error: ' + (data.error || 'Failed to delete class'), 'error');
        }
      } catch (error) {
        console.error('Error deleting class:', error);
        showToast('Network error: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetClassForm = () => {
    setEditingClass(null);
    setClassFormData({
      name: '',
      level: 'Primary',
      capacity: 30,
      teacher_id: '',
      classroom: '',
      academic_year: '2024-2025'
    });
  };

  // ============================================
  // PROMOTION FUNCTIONS
  // ============================================

  const getNextClassName = (currentClassName, level) => {
    if (!currentClassName) return 'Unknown';
    
    const classNum = parseInt(currentClassName.match(/(\d+)/)?.[1] || 0);
    if (level === 'KG') {
      if (classNum < 2) return 'Primary 1A';
    } else if (level === 'Primary') {
      if (classNum < 6) return `Primary ${classNum + 1}A`;
    } else if (level === 'JHS') {
      if (classNum < 3) return `JHS${classNum + 1}A`;
      return 'GRADUATED';
    }
    return 'GRADUATED';
  };

  const loadPromotionHistory = async () => {
    try {
      const response = await apiFetch(`${API_BASE}/promotion-history`);
      const result = await response.json();
      if (result.success) {
        setPromotionHistory(result.data || []);
      }
    } catch (error) {
      console.error('Error loading promotion history:', error);
    }
  };

  const loadAllStudentsForPromotion = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        class_id: promotionFilterClass || '',
        status: promotionFilterStatus
      });
      const response = await apiFetch(`${API_BASE}/promotion-history?${params}`);
      const result = await response.json();
      if (result.success) {
        setAllStudentsForPromotion(result.data || []);
      }
    } catch (error) {
      console.error('Error loading students for promotion:', error);
      showToast('Error loading students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const promoteAllEligibleClasses = async () => {
    if (!window.confirm('Promote all eligible classes? This will promote ALL students in classes ready for promotion.')) return;
    
    setLoading(true);
    try {
      const eligibleClasses = classes.filter(c => (c.current_count || 0) > 0);
      let totalPromoted = 0;
      
      for (const cls of eligibleClasses) {
        const nextClassName = getNextClassName(cls.name, cls.level);
        if (nextClassName !== 'GRADUATED') {
          const targetClass = classes.find(c => c.name === nextClassName);
          if (targetClass) {
            const response = await apiFetch(`${API_BASE}/classes/${cls.id}/promote`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                target_class_id: targetClass.id,
                new_academic_year: promotionSettings.defaultAcademicYear
              })
            });
            const result = await response.json();
            if (result.success) totalPromoted += result.promoted_count;
          }
        }
      }
      
      showToast(`Promotion complete! ${totalPromoted} students promoted.`, 'promotion');
      loadClasses();
      loadPromotionHistory();
    } catch (error) {
      console.error('Error:', error);
      showToast('Error during bulk promotion', 'error');
    } finally {
      setLoading(false);
    }
  };

  const promoteSelectedStudentsFromList = async () => {
    const selectedIds = Object.keys(selectedStudentsForList).filter(id => selectedStudentsForList[id]);
    if (selectedIds.length === 0) {
      showToast('No students selected', 'warning');
      return;
    }
    
    if (!window.confirm(`Promote ${selectedIds.length} selected students?`)) return;
    
    setLoading(true);
    try {
      const response = await apiFetch(`${API_BASE}/students/promote-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_ids: selectedIds.map(id => parseInt(id)),
          new_academic_year: promotionSettings.defaultAcademicYear
        })
      });
      const result = await response.json();
      if (result.success) {
        showToast(result.message, 'success');
        loadAllStudentsForPromotion();
        loadClasses();
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Error during promotion', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectAllStudentsForPromotion = (select) => {
    const newSelection = {};
    allStudentsForPromotion.forEach(student => {
      newSelection[student.id] = select;
    });
    setSelectedStudentsForList(newSelection);
  };

  const selectQualifiedStudentsOnly = () => {
    const qualifiedSelection = {};
    allStudentsForPromotion.forEach(student => {
      if (student.qualified) {
        qualifiedSelection[student.id] = true;
      }
    });
    setSelectedStudentsForList(qualifiedSelection);
  };

  const exportPromotionHistory = () => {
    if (promotionHistory.length === 0) {
      showToast('No history to export', 'warning');
      return;
    }
    const csv = [
      ['Date', 'Student', 'Admission', 'From', 'To', 'Year'],
      ...promotionHistory.map(r => [
        new Date(r.promotion_date).toLocaleDateString(),
        `${r.first_name} ${r.last_name}`,
        r.admission_number,
        r.from_class_name,
        r.to_class_name || 'GRADUATED',
        `${r.from_academic_year} → ${r.to_academic_year}`
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promotion-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const savePromotionSettings = () => {
    localStorage.setItem('promotionSettings', JSON.stringify(promotionSettings));
    showToast('Settings saved!', 'success');
  };

  // ============================================
  // GRADE FUNCTIONS
  // ============================================

  const loadClassStudents = async () => {
    if (!selectedGradeClass) {
      showToast('Please select a class', 'warning');
      return;
    }
    
    setLoading(true);
    setGradeError('');
    
    try {
      const token = localStorage.getItem('token');
      
      const studentsResponse = await apiFetch(`${API_BASE}/students/class/${selectedGradeClass}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const studentsResult = await studentsResponse.json();
      
      if (studentsResult.success) {
        setClassStudents(studentsResult.data || []);
      } else {
        showToast('Error loading students', 'error');
        setLoading(false);
        return;
      }
      
      try {
        const subjectsResponse = await apiFetch(`${API_BASE}/class-subjects/class/${selectedGradeClass}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const subjectsResult = await subjectsResponse.json();
        
        if (subjectsResult.success && subjectsResult.data.length > 0) {
          setSubjects(subjectsResult.data);
        } else {
          setSubjects([
            { id: 1, name: 'Mathematics' },
            { id: 2, name: 'English' },
            { id: 3, name: 'Science' },
            { id: 4, name: 'Social Studies' },
            { id: 5, name: 'Computing' }
          ]);
        }
      } catch (subjectsError) {
        setSubjects([
          { id: 1, name: 'Mathematics' },
          { id: 2, name: 'English' },
          { id: 3, name: 'Science' },
          { id: 4, name: 'Social Studies' },
          { id: 5, name: 'Computing' }
        ]);
      }
      
      try {
        const gradesResponse = await apiFetch(`${API_BASE}/grades/class/${selectedGradeClass}?term=${selectedTerm}&academic_year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const gradesResult = await gradesResponse.json();
        const existingGrades = gradesResult.data || [];
        
        const newGrades = {};
        studentsResult.data.forEach(student => {
          newGrades[student.id] = {};
          subjects.forEach(subject => {
            const existing = existingGrades.find(
              g => g.student_id === student.id && g.subject === subject.name
            );
            newGrades[student.id][subject.name] = {
              ca: existing?.continuous_assessment || '',
              exam: existing?.exam_score || ''
            };
          });
        });
        setGrades(newGrades);
      } catch (gradesError) {
        const newGrades = {};
        studentsResult.data.forEach(student => {
          newGrades[student.id] = {};
          subjects.forEach(subject => {
            newGrades[student.id][subject.name] = { ca: '', exam: '' };
          });
        });
        setGrades(newGrades);
      }
      
      showToast(`Loaded ${studentsResult.data?.length || 0} students`, 'success');
    } catch (error) {
      console.error('Error loading class students:', error);
      showToast('Error loading data: ' + error.message, 'error');
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
          ...prev[studentId]?.[subject],
          [field]: value
        }
      }
    }));
  };

  const saveAllGrades = async () => {
    setGradeLoading(true);
    setGradeError('');
    let savedCount = 0;
    let errorCount = 0;

    try {
      const token = localStorage.getItem('token');
      
      for (const student of classStudents) {
        for (const subject of subjects) {
          const gradeData = grades[student.id]?.[subject.name];
          if (gradeData && (gradeData.ca !== '' || gradeData.exam !== '')) {
            const ca = parseFloat(gradeData.ca) || 0;
            const exam = parseFloat(gradeData.exam) || 0;
            
            if (ca > 40) {
              setGradeError(`CA for ${subject.name} must be ≤ 40`);
              return;
            }
            if (exam > 60) {
              setGradeError(`Exam for ${subject.name} must be ≤ 60`);
              return;
            }
            
            const response = await apiFetch(`${API_BASE}/grades`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                student_id: student.id,
                subject: subject.name,
                term: parseInt(selectedTerm),
                academic_year: selectedYear,
                class_id: parseInt(selectedGradeClass),
                continuous_assessment: ca,
                exam_score: exam
              })
            });
            
            if (response.ok) savedCount++;
            else errorCount++;
          }
        }
      }
      
      showToast(`Saved ${savedCount} grades! Errors: ${errorCount}`, savedCount > 0 ? 'success' : 'warning');
      loadClassStudents();
    } catch (error) {
      setGradeError('Save failed: ' + error.message);
      showToast('Save error', 'error');
    } finally {
      setGradeLoading(false);
    }
  };

  const viewReportCard = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(`${API_BASE}/grades/report-card/${studentId}?term=${selectedTerm}&academic_year=${selectedYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        setReportCardData(result.data);
        setShowReportCard(true);
      } else {
        showToast(result.error || 'No report available', 'warning');
      }
    } catch (error) {
      showToast('Report error', 'error');
    }
  };

  // ============================================
  // FEE FUNCTIONS
  // ============================================

  const loadFeeStudents = async () => {
    if (!selectedFeeClass) {
      showToast('Please select a class', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(
        `${API_BASE}/fees/class/${selectedFeeClass}?term=${selectedFeeTerm}&academic_year=${selectedFeeYear}`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      const result = await response.json();
      setFeeStudents(result.data || []);
    } catch (error) {
      console.error('Error loading fee students:', error);
      showToast('Error loading students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = async (student) => {
    setSelectedStudentForPayment(student);
    
    if (feeTypes.length === 0) {
      await loadFeeTypes();
    }
    
    setPaymentData({
      fee_type: feeTypes.length > 0 ? feeTypes[0].name : '',
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
      const response = await apiFetch(`${API_BASE}/fees/payment`, {
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
        showToast('Payment recorded successfully!', 'success');
        setShowPaymentModal(false);
        loadFeeStudents();
        loadSchoolFeeSummary();
        
        if (result.data) {
          const token = localStorage.getItem('token');
          const receiptResponse = await apiFetch(`${API_BASE}/fees/receipt/${result.data.id}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          const receiptResult = await receiptResponse.json();
          if (receiptResult.success) {
            setReceiptData(receiptResult.data);
            setShowReceiptModal(true);
          }
        }
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      showToast('Error recording payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const viewStudentFeeSummary = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(
        `${API_BASE}/fees/student/${studentId}?academic_year=${selectedFeeYear}`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      const result = await response.json();
      
      if (result.success) {
        setFeeSummary(result.data);
      } else {
        if (result.student || result.summary) {
          setFeeSummary(result);
        } else {
          showToast('No fee data found for this student', 'warning');
        }
      }
    } catch (error) {
      console.error('Error loading fee summary:', error);
      showToast('Error loading fee summary', 'error');
    }
  };

  const saveTermSettings = async () => {
    try {
      const response = await apiFetch(`${API_BASE}/settings/term`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(termSettings)
      });
      
      if (response.ok) {
        showToast('Term settings saved successfully!', 'success');
        setShowTermSettings(false);
      } else {
        showToast('Error saving settings', 'error');
      }
    } catch (error) {
      console.error('Error saving term settings:', error);
      showToast('Error saving settings', 'error');
    }
  };

  // ============================================
  // USER PROFILE UPDATE FUNCTION
  // ============================================

  const handleUpdateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    showToast('Profile updated successfully!', 'success');
  };

  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        setProfilePicUrl(base64);
        localStorage.setItem('profilePicUrl', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // If loading, show loading spinner
if (authLoading) {
  return <div className="loading-container">Loading...</div>;
}

  // If no user, this shouldn't happen because AuthProvider handles it, but just in case
  if (!user) {
    return <Login />;
  }

  // FALLBACK: Original App Layout (for backward compatibility)
  return (
    <div className="app">
      <button 
        className="mobile-menu-toggle" 
        onClick={toggleSidebar}
        style={{
          position: 'fixed',
          top: '15px',
          left: '15px',
          width: '45px',
          height: '45px',
          background: '#3b82f6',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          display: window.innerWidth <= 768 ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}
      >
        <span style={{ color: 'white', fontSize: '22px' }}>☰</span>
      </button>

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <img 
              src={geebzLogo} 
              alt="Geebz SMS Logo" 
              className="logo-image"
            />
            <span className="logo-text">Geebz</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentPage(item.id);
                if (window.innerWidth <= 768) setSidebarOpen(false);
              }}
            >
              <span className="nav-icon">
                <FontAwesomeIcon icon={item.icon} />
              </span>
              <span className="nav-text">{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar-wrapper">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleProfilePicUpload}
                className="profile-upload-input"
                id="profile-upload-sidebar"
                style={{ display: 'none' }}
              />
              <label 
                htmlFor="profile-upload-sidebar" 
                className="user-avatar-label"
                style={{ cursor: 'pointer', display: 'block' }}
              >
                <div className="user-avatar">
                  {user?.first_name 
                    ? user.first_name.charAt(0).toUpperCase() 
                    : user?.email 
                      ? user.email.charAt(0).toUpperCase() 
                      : 'U'}
                </div>
              </label>
            </div>
            <div className="user-details">
              <span className="user-name">
                {user?.first_name && user?.last_name 
                  ? `${user.first_name} ${user.last_name}`
                  : user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="user-role">
                {user?.role === 'admin' ? 'Administrator' : 
                 user?.role === 'teacher' ? 'Teacher' : 
                 user?.role === 'parent' ? 'Parent' : 'Staff'}
              </span>
            </div>
          </div>
          {profilePicUrl && (
            <div className="user-profile-picture-container">
              <label 
                htmlFor="profile-upload-sidebar"
                className="user-profile-picture-display"
              >
                <img 
                  src={profilePicUrl} 
                  alt="Profile" 
                  className="user-profile-picture-img"
                />
                <span className="profile-picture-text">Click to change</span>
              </label>
            </div>
          )}
          
          <button className="logout-btn" onClick={logout}>
            <FontAwesomeIcon icon={faSignOutAlt} /> Logout
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Main Content */}
      <div className="main-content">
        <div className="content-wrapper">
          {/* DASHBOARD PAGE */}
          {currentPage === 'dashboard' && (
            <Dashboard 
              dashboardStats={dashboardStats}
              currentUser={user}
              setCurrentPage={setCurrentPage}
            />
          )}
          
          {/* STUDENTS PAGE */}
          {currentPage === 'students' && <StudentsPage API_BASE={API_BASE} />}
          
          {/* TEACHERS PAGE */}
          {currentPage === 'teachers' && <Teachers API_BASE={API_BASE} />}
          
          {/* CLASSES PAGE */}
          {currentPage === 'classes' && <Classes API_BASE={API_BASE} />}
          
          {/* SETTINGS PAGE */}
          {currentPage === 'settings' && (
            <SettingsPage 
              currentUser={user}
              onUpdateUser={handleUpdateUser}
              onClose={() => setCurrentPage('dashboard')}
            />
          )}
          
          {/* GRADES PAGE */}
          {currentPage === 'grades' && <Grades API_BASE={API_BASE} />}

          {/* SUBJECTS PAGE */}
          {currentPage === 'subjects' && <Subjects API_BASE={API_BASE} />}

          {/* TIMETABLE PAGE */}
          {currentPage === 'timetable' && <TimetablePage API_BASE={API_BASE} />}

          {/* ATTENDANCE PAGE */}
          {currentPage === 'attendance' && (
            <Attendance 
              API_BASE={API_BASE}
              classes={classes}
              termSettings={termSettings}
              loadTermSettings={loadTermSettings}
            />
          )}

          {/* USERS PAGE */}
          {currentPage === 'users' && <UsersPage />}
          
          {/* FEES PAGE */}
          {currentPage === 'fees' && <Fees API_BASE={API_BASE} />}

          {/* PROMOTION PAGE */}
          {currentPage === 'promotion' && (
            <div className="promotion-management-page">
              {/* Promotion content - keep your existing promotion JSX */}
              <div className="promotion-stats-grid">
                <div className="stat-card">
                  <div className="stat-icon"><FontAwesomeIcon icon={faBookOpen} /></div>
                  <div className="stat-info">
                    <h3>{classes.filter(c => (c.current_count || 0) > 0).length}</h3>
                    <p>Classes with Students</p>
                  </div>
                </div>
                {/* Add more stat cards as needed */}
              </div>
              <div className="promotion-tabs">
                <button className={`tab-btn ${promotionTab === 'classes' ? 'active' : ''}`} onClick={() => setPromotionTab('classes')}>
                  <FontAwesomeIcon icon={faList} /> By Class
                </button>
                <button className={`tab-btn ${promotionTab === 'all' ? 'active' : ''}`} onClick={() => { setPromotionTab('all'); loadAllStudentsForPromotion(); }}>
                  <FontAwesomeIcon icon={faUsers} /> All Students
                </button>
                <button className={`tab-btn ${promotionTab === 'history' ? 'active' : ''}`} onClick={() => { setPromotionTab('history'); loadPromotionHistory(); }}>
                  <FontAwesomeIcon icon={faHistory} /> History
                </button>
                <button className={`tab-btn ${promotionTab === 'settings' ? 'active' : ''}`} onClick={() => setPromotionTab('settings')}>
                  <FontAwesomeIcon icon={faCog} /> Settings
                </button>
              </div>
              {/* Add promotion content based on active tab */}
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleStudentSubmit}>
              <div className="form-row">
                <div className="form-group"><label>First Name *</label><input type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required /></div>
                <div className="form-group"><label>Last Name *</label><input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Date of Birth *</label><input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} required /></div>
                <div className="form-group"><label>Gender *</label><select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}><option value="M">Male</option><option value="F">Female</option></select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Class *</label><select value={formData.class_id} onChange={(e) => setFormData({...formData, class_id: e.target.value})} required><option value="">Select Class</option>{classes.map(cls => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}</select></div>
                <div className="form-group"><label>Level</label><select value={formData.level} onChange={(e) => setFormData({...formData, level: e.target.value})}><option value="KG">Kindergarten</option><option value="Primary">Primary</option><option value="JHS">Junior High School</option></select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Parent Name *</label><input type="text" value={formData.parent_name} onChange={(e) => setFormData({...formData, parent_name: e.target.value})} required /></div>
                <div className="form-group"><label>Parent Phone *</label><input type="tel" value={formData.parent_phone} onChange={(e) => setFormData({...formData, parent_phone: e.target.value})} required /></div>
              </div>
              <div className="form-group">
                <label>Parent Email <span style={{fontSize: '11px', color: '#999', marginLeft: '8px'}}>(For login notifications - Optional)</span></label>
                <input type="email" value={formData.parent_email || ''} onChange={(e) => setFormData({...formData, parent_email: e.target.value})} placeholder="parent@example.com" />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} rows="3" placeholder="Enter home address" />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-save" disabled={loading}>{loading ? 'Saving...' : (editingStudent ? 'Update Student' : 'Add Student')}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Modal */}
      {showClassModal && (
        <div className="modal" onClick={() => setShowClassModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingClass ? 'Edit Class' : 'Add New Class'}</h2>
              <button className="modal-close" onClick={() => setShowClassModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleClassSubmit}>
              <div className="form-group"><label>Class Name *</label><input type="text" value={classFormData.name} onChange={(e) => setClassFormData({...classFormData, name: e.target.value})} required /></div>
              <div className="form-group"><label>Level *</label><select value={classFormData.level} onChange={(e) => setClassFormData({...classFormData, level: e.target.value})}><option value="KG">Kindergarten</option><option value="Primary">Primary</option><option value="JHS">Junior High School</option></select></div>
              <div className="form-group"><label>Capacity *</label><input type="number" value={classFormData.capacity} onChange={(e) => setClassFormData({...classFormData, capacity: e.target.value})} min="1" max="60" required /></div>
              <div className="form-group"><label>Class Teacher</label><select value={classFormData.teacher_id} onChange={(e) => setClassFormData({...classFormData, teacher_id: e.target.value})}><option value="">Select Teacher</option>{classTeachers.map(t => (<option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>))}</select></div>
              <div className="form-group"><label>Classroom</label><input type="text" value={classFormData.classroom} onChange={(e) => setClassFormData({...classFormData, classroom: e.target.value})} placeholder="e.g., Room 101" /></div>
              <div className="form-group"><label>Academic Year</label><input type="text" value={classFormData.academic_year} onChange={(e) => setClassFormData({...classFormData, academic_year: e.target.value})} placeholder="2024-2025" /></div>
              <div className="modal-actions">
                <button type="submit" className="btn-save" disabled={loading}>{loading ? 'Saving...' : (editingClass ? 'Update Class' : 'Add Class')}</button>
                <button type="button" className="btn-cancel" onClick={() => setShowClassModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Promotion Modal */}
      <PromotionModal 
        isOpen={showPromotionModal}
        onClose={() => {
          setShowPromotionModal(false);
          setSelectedClassForPromotion(null);
        }}
        classData={selectedClassForPromotion}
        onPromote={() => {
          loadClasses();
          loadDashboardData();
          loadPromotionHistory();
        }} 
      />

      {/* Term Settings Modal */}
      {showTermSettings && (
        <div className="modal" onClick={() => setShowTermSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Term Settings</h2><button className="modal-close" onClick={() => setShowTermSettings(false)}>&times;</button></div>
            <form onSubmit={(e) => { e.preventDefault(); saveTermSettings(); }}>
              <div className="form-group"><label>Academic Year</label><input type="text" value={termSettings.academic_year} onChange={(e) => setTermSettings({...termSettings, academic_year: e.target.value})} /></div>
              <div className="form-group"><label>First Term Total Days</label><input type="number" value={termSettings.term1_total_days} onChange={(e) => setTermSettings({...termSettings, term1_total_days: parseInt(e.target.value)})} /></div>
              <div className="form-group"><label>Second Term Total Days</label><input type="number" value={termSettings.term2_total_days} onChange={(e) => setTermSettings({...termSettings, term2_total_days: parseInt(e.target.value)})} /></div>
              <div className="form-group"><label>Third Term Total Days</label><input type="number" value={termSettings.term3_total_days} onChange={(e) => setTermSettings({...termSettings, term3_total_days: parseInt(e.target.value)})} /></div>
              <div className="modal-actions"><button type="submit" className="btn-save">Save Settings</button><button type="button" className="btn-cancel" onClick={() => setShowTermSettings(false)}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedStudentForPayment && (
        <div className="modal" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Record Payment</h2><button className="modal-close" onClick={() => setShowPaymentModal(false)}>&times;</button></div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="form-group"><label>Fee Type</label><select value={paymentData.fee_type} onChange={(e) => setPaymentData({...paymentData, fee_type: e.target.value})} required><option value="">Select Fee Type</option>{feeTypes.map(type => (<option key={type.id} value={type.name}>{type.name} - ₵{type.amount}</option>))}</select></div>
              <div className="form-group"><label>Amount (₵)</label><input type="number" step="0.01" value={paymentData.amount} onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})} required /></div>
              <div className="form-group"><label>Payment Method</label><select value={paymentData.payment_method} onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}><option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="bank_transfer">Bank Transfer</option><option value="card">Card</option></select></div>
              <div className="form-group"><label>Transaction ID (Optional)</label><input type="text" value={paymentData.transaction_id} onChange={(e) => setPaymentData({...paymentData, transaction_id: e.target.value})} /></div>
              <div className="modal-actions"><button type="submit" className="btn-save">Record Payment</button><button type="button" className="btn-cancel" onClick={() => setShowPaymentModal(false)}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {showSuccessToast && <SuccessToast message="Student saved successfully!" onClose={() => setShowSuccessToast(false)} />}
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT (wraps with AuthProvider)
// ============================================
const LegacyApp = () => {
  // legacy UI (role-based) that AppContent renders
  return <AppContent />;
};

// Router wrapper so pages render under correct paths.
// NOTE: main.jsx already wraps with AuthProvider + BrowserRouter.
// src/App.jsx - Updated routing section

const RequireRole = ({ role, children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === role) return children;

  const homeByRole = {
    admin: '/admin',
    teacher: '/teacher',
    parent: '/parent',
  };
  return <Navigate to={homeByRole[user.role] || '/login'} replace />;
};

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Admin routes - all admin pages go here */}
      <Route path="/admin/*" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />

      {/* Teacher routes (keep all teacher pages inside TeacherDashboard layout to preserve sidebar) */}
      <Route path="/teacher/*" element={<RequireRole role="teacher"><TeacherDashboard /></RequireRole>} />


      {/* Parent routes */}

      <Route path="/parent/*" element={<RequireRole role="parent"><ParentDashboard /></RequireRole>} />

      {/* Default landing */}
      <Route path="/" element={<Login />} />

      {/* Fallback */}
      <Route path="*" element={<Login />} />
    </Routes>
  );
};

export default AppRouter;



