// src/pages/teacher/TeacherGrades.jsx
import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import schoolLogo from '../../assets/logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faChartLine,
  faSearch,
  faBookOpen,
  faUserGraduate,
  faFilePdf,
  faSpinner,
  faCheckCircle,
  faAward,
  faEye,
  faExclamationTriangle,
  faUserTie,
  faDownload,
  faChevronLeft,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from '../../components/ToastNotification';
import './TeacherGrades.css';

const TeacherGrades = ({ API_BASE = 'http://localhost:5000/api' }) => {
  // ============================================================
  // STATE DECLARATIONS
  // ============================================================
  
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedYear, setSelectedYear] = useState('2024-2025');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [error, setError] = useState(null);
  
  const [toast, setToast] = useState(null);
  
  // Marks data structure: marks[studentId][subjectId] = {ca, exam, total, grade, ca_id, exam_id}
  const [marks, setMarks] = useState({});
  
  // Teacher remarks - PER SUBJECT per student: teacherRemarks[studentId][subjectId] = remark (string or null)
  const [teacherRemarks, setTeacherRemarks] = useState({});
  const [classTeacherRemarks, setClassTeacherRemarks] = useState('');
  
  // Report Card Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Pagination for subjects
  const [currentSubjectPage, setCurrentSubjectPage] = useState(0);
  const subjectsPerPage = 4;
  
  const [stats, setStats] = useState({
    totalStudents: 0,
    gradedStudents: 0,
    averageScore: 0
  });

  const tableRef = useRef(null);

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  
  const getCurrentTeacherId = () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        return userData.id || userData.teacher_id || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    };
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ============================================================
  // GRADE CALCULATION FUNCTIONS
  // ============================================================
  
  const calculateGrade = (score) => {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A': '#10b981',
      'B': '#3b82f6',
      'C': '#f59e0b',
      'D': '#f97316',
      'F': '#ef4444'
    };
    return colors[grade] || '#6b7280';
  };

  // ============================================================
  // REMARK GENERATION - PER SUBJECT
  // ============================================================
  
  const generateRemark = (score) => {
    if (!score || score === 0 || score === '' || score === null) {
      return null;
    }
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Very Good';
    if (score >= 60) return 'Good';
    if (score >= 50) return 'Average';
    if (score >= 40) return 'Below Average';
    return 'Needs Improvement';
  };

  const getRemarkColor = (remark) => {
    const colors = {
      'Excellent': '#10b981',
      'Very Good': '#3b82f6',
      'Good': '#f59e0b',
      'Average': '#f97316',
      'Below Average': '#ef4444',
      'Needs Improvement': '#dc2626'
    };
    return colors[remark] || '#6b7280';
  };

  // ============================================================
  // HANDLE GRADE CHANGES - UPDATE PER-SUBJECT REMARK
  // ============================================================
  
  const handleGradeChange = (studentId, subjectId, field, value) => {
    const numValue = value === '' ? '' : parseFloat(value);
    
    setMarks(prev => {
      const updated = { ...prev };
      if (!updated[studentId]) {
        updated[studentId] = {};
      }
      if (!updated[studentId][subjectId]) {
        updated[studentId][subjectId] = { ca: '', exam: '', total: 0, grade: '', ca_id: null, exam_id: null };
      }
      
      updated[studentId][subjectId][field] = numValue;
      
      const ca = parseFloat(updated[studentId][subjectId].ca) || 0;
      const exam = parseFloat(updated[studentId][subjectId].exam) || 0;
      const total = ca + exam;
      
      updated[studentId][subjectId].total = total;
      updated[studentId][subjectId].grade = calculateGrade(total);
      
      const subjectRemark = generateRemark(total);
      
      setTeacherRemarks(prevRemarks => {
        const updatedRemarks = { ...prevRemarks };
        if (!updatedRemarks[studentId]) {
          updatedRemarks[studentId] = {};
        }
        updatedRemarks[studentId][subjectId] = subjectRemark;
        return updatedRemarks;
      });
      
      updateStats(updated);
      
      return updated;
    });
  };

  // ============================================================
  // UPDATE STATS
  // ============================================================
  
  const updateStats = (currentMarks) => {
    let gradedCount = 0;
    let totalScoreSum = 0;
    
    Object.values(currentMarks).forEach(studentMarks => {
      Object.values(studentMarks).forEach(mark => {
        if (mark.ca !== '' && mark.exam !== '') {
          gradedCount++;
          totalScoreSum += mark.total || 0;
        }
      });
    });
    
    setStats({
      ...stats,
      gradedStudents: gradedCount,
      averageScore: gradedCount > 0 ? Math.round(totalScoreSum / gradedCount) : 0
    });
  };

  // ============================================================
  // CALCULATE STUDENT TOTALS / AVERAGES / POSITION
  // ============================================================
  
  const calculateStudentTotal = (studentId) => {
    const studentMarks = marks[studentId] || {};
    let total = 0;
    let count = 0;
    
    subjects.forEach(subject => {
      const mark = studentMarks[subject.id];
      if (mark && mark.ca !== '' && mark.exam !== '') {
        total += (mark.total || 0);
        count++;
      }
    });
    
    return count > 0 ? total : 0;
  };

  const calculateStudentAverage = (studentId) => {
    const studentMarks = marks[studentId] || {};
    let total = 0;
    let count = 0;
    
    subjects.forEach(subject => {
      const mark = studentMarks[subject.id];
      if (mark && mark.ca !== '' && mark.exam !== '') {
        total += (mark.total || 0);
        count++;
      }
    });
    
    return count > 0 ? Math.round(total / count) : 0;
  };

  const getStudentPosition = (studentId) => {
    const averages = classStudents.map(student => ({
      id: student.id,
      average: calculateStudentAverage(student.id)
    }));
    
    averages.sort((a, b) => b.average - a.average);
    
    const position = averages.findIndex(s => s.id === studentId) + 1;
    return position > 0 ? position : '-';
  };

  // ============================================================
  // LOAD DATA FUNCTIONS
  // ============================================================
  
  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassData();
      setCurrentSubjectPage(0);
    }
  }, [selectedClass, selectedTerm, selectedYear]);

  const loadClasses = async () => {
    setLoadingClasses(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      let classesData = [];
      
      try {
        const response = await fetch(`${API_BASE}/teacher/classes`, { headers });
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
          classesData = data.data;
        } else {
          const dashboardResponse = await fetch(`${API_BASE}/teacher/dashboard/classes`, { headers });
          const dashboardData = await dashboardResponse.json();
          if (dashboardData.success && dashboardData.data && dashboardData.data.length > 0) {
            classesData = dashboardData.data;
          } else {
            const publicResponse = await fetch(`${API_BASE}/classes`, { headers });
            const publicData = await publicResponse.json();
            if (publicData.success && publicData.data) {
              classesData = publicData.data;
            }
          }
        }
      } catch (error) {
        console.error('API error:', error);
        showToast('Could not connect to server. Please try again.', 'error');
      }
      
      const mappedClasses = classesData.map(cls => ({
        id: cls.id,
        class_name: cls.class_name || cls.name || `Class ${cls.id}`,
        level: cls.level || cls.class_level || cls.grade_level || 'N/A'
      }));
      
      setClasses(mappedClasses);
      
      if (mappedClasses.length > 0 && !selectedClass) {
        setSelectedClass(mappedClasses[0].id.toString());
      }
      
      if (mappedClasses.length === 0) {
        setError('No classes found.');
        showToast('No classes found', 'warning');
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setError('Failed to load classes.');
      showToast('Failed to load classes', 'error');
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadClassData = async () => {
    if (!selectedClass) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const headers = getAuthHeaders();
      const classId = selectedClass;
      
      const selectedClassData = classes.find(c => c.id?.toString() === classId);
      const className = selectedClassData?.class_name || '';
      
      // Load students
      let students = [];
      try {
        let response = await fetch(
          `${API_BASE}/teacher/classes/${classId}/students`,
          { headers }
        );
        let data = await response.json();
        
        if (data.success && data.data) {
          students = data.data;
        } else {
          response = await fetch(
            `${API_BASE}/teacher/dashboard/class/${classId}/students`,
            { headers }
          );
          data = await response.json();
          if (data.success && data.data) {
            students = data.data;
          } else {
            response = await fetch(`${API_BASE}/classes/${classId}/students`, { headers });
            data = await response.json();
            if (data.success && data.data) {
              students = data.data;
            }
          }
        }
      } catch (error) {
        console.error('Failed to load students:', error);
      }
      
      setClassStudents(students);
      setStats(prev => ({ ...prev, totalStudents: students.length }));
      
      // Load subjects
      let subjectsData = [];
      
      if (className) {
        try {
          const response = await fetch(
            `${API_BASE}/subjects/class/${encodeURIComponent(className)}`,
            { headers }
          );
          const data = await response.json();
          if (data.success) {
            subjectsData = data.data || [];
          }
        } catch (e) {}
      }
      
      if (subjectsData.length === 0) {
        try {
          const response = await fetch(
            `${API_BASE}/subjects/class-subjects/${classId}`,
            { headers }
          );
          const data = await response.json();
          if (data.success) {
            subjectsData = data.data || [];
          }
        } catch (e) {}
      }
      
      if (subjectsData.length === 0 && selectedClassData?.level) {
        try {
          const response = await fetch(
            `${API_BASE}/subjects/level/${selectedClassData.level}`,
            { headers }
          );
          const data = await response.json();
          if (data.success) {
            subjectsData = data.data || [];
          }
        } catch (e) {}
      }
      
      if (subjectsData.length === 0) {
        try {
          const response = await fetch(`${API_BASE}/subjects`, { headers });
          const data = await response.json();
          if (data.success) {
            subjectsData = data.data || [];
          }
        } catch (e) {}
      }
      
      // Deduplicate subjects
      const subjectMap = new Map();
      subjectsData.forEach(subject => {
        const key = subject.name?.toLowerCase().trim() || '';
        if (key && !subjectMap.has(key)) {
          subjectMap.set(key, subject);
        }
      });
      subjectsData = Array.from(subjectMap.values());
      
      if (subjectsData.length === 0) {
        setError(`No subjects found for ${className || 'this class'}`);
        showToast(`No subjects found for ${className || 'this class'}`, 'error');
        setSubjects([]);
        setLoading(false);
        return;
      }
      
      setSubjects(subjectsData);
      
      // Load existing marks
      let existingMarks = [];
      try {
        const response = await fetch(
          `${API_BASE}/teacher/marks/${classId}?term=${selectedTerm}&academic_year=${selectedYear}`,
          { headers }
        );
        const data = await response.json();
        if (data.success) {
          existingMarks = data.data || [];
        }
      } catch (e) {
        console.log('No existing marks found');
      }
      
      // Initialize marks and remarks structures
      const initialMarks = {};
      const initialRemarks = {};
      
      students.forEach((student) => {
        initialMarks[student.id] = {};
        initialRemarks[student.id] = {};
        
        subjectsData.forEach((subject) => {
          const caMark = existingMarks.find(
            (m) => m.student_id === student.id && 
                   m.subject_id === subject.id && 
                   m.exam_type === 'CA'
          );
          const examMark = existingMarks.find(
            (m) => m.student_id === student.id && 
                   m.subject_id === subject.id && 
                   m.exam_type === 'EXAM'
          );
          
          const caScore = caMark?.marks || '';
          const examScore = examMark?.marks || '';
          const total = (caScore && examScore) ? parseFloat(caScore) + parseFloat(examScore) : 0;
          
          initialMarks[student.id][subject.id] = {
            ca: caScore,
            exam: examScore,
            total: total,
            grade: total > 0 ? calculateGrade(total) : '',
            ca_id: caMark?.id || null,
            exam_id: examMark?.id || null
          };
          
          // Generate remark for this subject
          initialRemarks[student.id][subject.id] = generateRemark(total);
        });
      });
      
      setMarks(initialMarks);
      setTeacherRemarks(initialRemarks);
      
      // Calculate stats
      let gradedCount = 0;
      let totalScoreSum = 0;
      Object.values(initialMarks).forEach(studentMarks => {
        Object.values(studentMarks).forEach(mark => {
          if (mark.ca !== '' && mark.exam !== '') {
            gradedCount++;
            totalScoreSum += mark.total || 0;
          }
        });
      });
      
      setStats(prev => ({
        ...prev,
        gradedStudents: gradedCount,
        averageScore: gradedCount > 0 ? Math.round(totalScoreSum / gradedCount) : 0
      }));
      
      showToast(`Loaded ${students.length} students with ${subjectsData.length} subjects`, 'success');
    } catch (error) {
      console.error('Error loading class data:', error);
      setError(error.message || 'Error loading class data');
      showToast(error.message || 'Error loading class data', 'error');
    } finally {
      setLoading(false);
    }
  };

   
   const saveAllGrades = async () => {
  if (!selectedClass) {
    showToast('Please select a class', 'warning');
    return;
  }

  setSaving(true);
  const teacherId = getCurrentTeacherId();

  if (!teacherId) {
    showToast('Teacher ID not found. Please login again.', 'error');
    setSaving(false);
    return;
  }

  try {
    const headers = getAuthHeaders();
    const marksData = [];

    for (const studentId of Object.keys(marks)) {
      for (const subjectId of Object.keys(marks[studentId])) {
        const markData = marks[studentId][subjectId];
        const remark = teacherRemarks[studentId]?.[subjectId] || '';

        if (markData.ca !== '' && markData.ca !== null) {
          const ca = parseFloat(markData.ca);
          if (!isNaN(ca) && ca >= 0 && ca <= 40) {
            marksData.push({
              student_id: parseInt(studentId),
              subject_id: parseInt(subjectId),
              class_id: parseInt(selectedClass),
              teacher_id: teacherId,
              exam_type: 'CA',
              marks: ca,
              grade: markData.grade || '',
              remarks: remark,
              academic_year: selectedYear,
              mark_id: markData.ca_id || null
            });
          }
        }

        if (markData.exam !== '' && markData.exam !== null) {
          const exam = parseFloat(markData.exam);
          if (!isNaN(exam) && exam >= 0 && exam <= 60) {
            marksData.push({
              student_id: parseInt(studentId),
              subject_id: parseInt(subjectId),
              class_id: parseInt(selectedClass),
              teacher_id: teacherId,
              exam_type: 'EXAM',
              marks: exam,
              grade: markData.grade || '',
              remarks: remark,
              academic_year: selectedYear,
              mark_id: markData.exam_id || null
            });
          }
        }
      }
    }

    if (marksData.length === 0) {
      showToast('No grades to save. Please enter some marks first.', 'warning');
      setSaving(false);
      return;
    }

    console.log('📤 Sending marks payload:', JSON.stringify(marksData, null, 2));

    const response = await fetch(`${API_BASE}/teacher/marks`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ marks: marksData })
    });

    const result = await response.json();
    console.log('📥 Server response:', result);

    if (result.success) {
      showToast(`${marksData.length} grades saved successfully!`, 'success');

      // ✅ NEW: Update the local mark_id fields if the server returns them
      if (result.data && Array.isArray(result.data)) {
        // Assume the server returns an array of saved marks with their new IDs
        // Map them back to the local state
        setMarks(prevMarks => {
          const updated = { ...prevMarks };
          result.data.forEach(savedMark => {
            const studentId = savedMark.student_id;
            const subjectId = savedMark.subject_id;
            const examType = savedMark.exam_type;
            const newId = savedMark.id;
            if (updated[studentId] && updated[studentId][subjectId]) {
              if (examType === 'CA') {
                updated[studentId][subjectId].ca_id = newId;
              } else if (examType === 'EXAM') {
                updated[studentId][subjectId].exam_id = newId;
              }
            }
          });
          return updated;
        });
      }
 
      // The user can manually refresh if they want to see updated data from the server.
    } else {
      const errorMsg = result.error || 'Failed to save grades';
      showToast(errorMsg, 'error');
      if (result.details) console.error('Server details:', result.details);
    }
  } catch (error) {
    console.error('Save error:', error);
    showToast('Network error. Please try again.', 'error');
  } finally {
    setSaving(false);
  }
};

  // ============================================================
  // VIEW REPORT CARD
  // ============================================================
  
  const viewReportCard = (student) => {
    setSelectedStudent(student);
    setShowReportModal(true);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setSelectedStudent(null);
  };
 

  const printReportCard = () => {
    // Ensure React has rendered the modal before we query DOM.
    // (Prevents "Report card not found" when user clicks print quickly.)
    const attempt = () => {
      const reportElement = document.getElementById('report-card-content');
      if (!reportElement) {
        return false;
      }

      showToast('Preparing report card for printing...', 'info');

      // Store original styles of all ancestors up to body
      const styleBackup = [];
      let el = reportElement;
      while (el && el !== document.body) {
        const computed = getComputedStyle(el);
        styleBackup.push({
          element: el,
          overflow: el.style.overflow || computed.overflow,
          maxHeight: el.style.maxHeight || computed.maxHeight,
          height: el.style.height || computed.height
        });
        // Remove clipping constraints
        el.style.overflow = 'visible';
        el.style.maxHeight = 'none';
        el.style.height = 'auto';
        el = el.parentElement;
      }
      // Also ensure body doesn't clip
      document.body.style.overflow = 'visible';

      // Capture the full element
      html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: false,
        height: reportElement.scrollHeight,
        width: reportElement.scrollWidth,
        windowHeight: reportElement.scrollHeight,
        windowWidth: reportElement.scrollWidth
      }).then((canvas) => {
        // Restore original styles
        styleBackup.forEach(({ element, overflow, maxHeight, height }) => {
          element.style.overflow = overflow;
          element.style.maxHeight = maxHeight;
          element.style.height = height;
        });
        document.body.style.overflow = '';

        const imgData = canvas.toDataURL('image/png');
        const win = window.open('', '_blank');
        if (!win) {
          showToast('Popup blocked. Please allow popups to print.', 'error');
          return;
        }

        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Student report</title>
              <style>
                body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; }
                img { max-width: 100%; height: auto; display: block; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                @media print { body { margin: 0; padding: 0; } img { max-width: 100%; height: auto; box-shadow: none; } }
              </style>
            </head>
            <body>
              <img src="${imgData}" alt="Report Card" />
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                    // setTimeout(() => window.close(), 500);
                  }, 300);
                };
              </script>
            </body>
          </html>
        `);
        win.document.close();

        showToast('Print window opened. Please print from the dialog.', 'success');
      }).catch((error) => {
        // Restore styles on error
        styleBackup.forEach(({ element, overflow, maxHeight, height }) => {
          element.style.overflow = overflow;
          element.style.maxHeight = maxHeight;
          element.style.height = height;
        });
        document.body.style.overflow = '';
        console.error('html2canvas error:', error);
        showToast('Failed to generate report card image. Please try again.', 'error');
      });

      return true;
    };

    // Try immediately, then once more on next tick.
    if (attempt()) return;
    setTimeout(() => {
      if (!attempt()) {
        showToast('Report card not found. Please open the modal first.', 'error');
      }
    }, 50);
  }

  // ============================================================
  // PAGINATION FUNCTIONS
  // ============================================================
  
  const totalSubjectPages = Math.ceil(subjects.length / subjectsPerPage);
  
  const getCurrentPageSubjects = () => {
    const start = currentSubjectPage * subjectsPerPage;
    const end = start + subjectsPerPage;
    return subjects.slice(start, end);
  };


  const nextSubjectPage = () => {
    if (currentSubjectPage < totalSubjectPages - 1) {
      setCurrentSubjectPage(currentSubjectPage + 1);
      if (tableRef.current) {
        tableRef.current.scrollLeft = 0;
      }
    }
  };

  const prevSubjectPage = () => {
    if (currentSubjectPage > 0) {
      setCurrentSubjectPage(currentSubjectPage - 1);
      if (tableRef.current) {
        tableRef.current.scrollLeft = 0;
      }
    }
  };

  // ============================================================
  // RENDER REPORT CARD MODAL
  // ============================================================
  
  const renderReportCardModal = () => {
    if (!showReportModal || !selectedStudent) return null;

    const studentMarks = marks[selectedStudent.id] || {};
    let totalScore = 0;
    let gradedSubjects = 0;

    subjects.forEach(subject => {
      const mark = studentMarks[subject.id] || { ca: '', exam: '', total: 0, grade: '' };
      if (mark.ca !== '' && mark.exam !== '') {
        totalScore += mark.total || 0;
        gradedSubjects++;
      }
    });

    const averageScore = gradedSubjects > 0 ? Math.round(totalScore / gradedSubjects) : 0;
    const overallGrade = calculateGrade(averageScore);
    const position = getStudentPosition(selectedStudent.id);
    const totalMarks = calculateStudentTotal(selectedStudent.id);

    return (
      <div className="modal-overlay" onClick={closeReportModal}>
        <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="report-modal-header" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <div className="report-modal-header-left" style={{ flex: 'none', justifyContent: 'center' }}>
              <div>
                <h2>Student Report Card</h2>
                <p className="report-modal-subtitle">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                  <span className="report-modal-admission">({selectedStudent.admission_number})</span>
                </p>
              </div>
            </div>
          </div>

          {/* Report Card Body */}
          <div className="report-card-body" id="report-card-content">
            <div className="report-card-container">
              {/* School Header */}
              <div className="report-card-header">
                <div className="report-card-school-info">
                  <div className="report-card-logo">
                    <img
                      src={schoolLogo}
                      alt="School Logo"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '50%'
                      }}
                    />
                  </div>
                  <div className="report-card-school-details">
                    <h1 className="report-card-school-name">THE KING'S SCHOOL - BONTANGA</h1>
                    <p className="report-card-address">P.O.BOX 2018, TAMALE, GHANA</p>
                    <p className="report-card-contact">Tel: 0244895665 | Email: admin@thekingsvillage.org</p>
                    <p className="report-card-motto">"Godliness, Diligence and Excellence"</p>
                  </div>
                </div>
                <div className="report-card-badge">
                  <span>ACADEMIC</span>
                  <span>REPORT</span>
                </div>
              </div>

              {/* Report Title */}
              <div className="report-card-title">
                <h2>STUDENT PROGRESS REPORT</h2>
                <div className="report-card-meta">
                  <div className="meta-item">
                    <span><strong>Academic Year:</strong> {selectedYear}</span>
                  </div>
                  <div className="meta-item">
                    <span><strong>Term:</strong> {selectedTerm}</span>
                  </div>
                  <div className="meta-item">
                    <span><strong>Class:</strong> {classes.find(c => c.id.toString() === selectedClass)?.class_name || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Student Information */}
              <div className="report-card-student-info">
                <div className="student-info-grid">
                  <div className="student-info-item">
                    <span className="info-label">Student Name:</span>
                    <span className="info-value">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                  </div>
                  <div className="student-info-item">
                    <span className="info-label">Admission No:</span>
                    <span className="info-value">{selectedStudent.admission_number}</span>
                  </div>
                  <div className="student-info-item">
                    <span className="info-label">Gender:</span>
                    <span className="info-value">{selectedStudent.gender || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="report-card-performance-summary">
                <div className="performance-card">
                  <div className="performance-card-content">
                    <span className="performance-label">Total Marks</span>
                    <span className="performance-value">{totalMarks}</span>
                  </div>
                </div>
                <div className="performance-card">
                  <div className="performance-card-content">
                    <span className="performance-label">Average Score</span>
                    <span className="performance-value">{averageScore}%</span>
                  </div>
                </div>
                <div className="performance-card">
                  <div className="performance-card-content">
                    <span className="performance-label">Overall Grade</span>
                    <span className="performance-value">{overallGrade}</span>
                  </div>
                </div>
                <div className="performance-card">
                  <div className="performance-card-content">
                    <span className="performance-label">Position</span>
                    <span className="performance-value">{position} / {classStudents.length}</span>
                  </div>
                </div>
              </div>

              {/* Marks Table */}
              <div className="report-card-table-wrapper">
                <table className="report-card-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>CA (40%)</th>
                      <th>Exam (60%)</th>
                      <th>Total</th>
                      <th>Grade</th>
                      <th>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => {
                      const mark = marks[selectedStudent.id]?.[subject.id] || {
                        ca: '',
                        exam: '',
                        total: 0,
                        grade: ''
                      };
                      const remark = teacherRemarks[selectedStudent.id]?.[subject.id] || null;
                      return (
                        <tr key={subject.id}>
                          <td className="report-subject-name">{subject.name}</td>
                          <td className="report-score-cell">{mark.ca || '-'}</td>
                          <td className="report-score-cell">{mark.exam || '-'}</td>
                          <td className="report-total-cell">{mark.total || 0}</td>
                          <td className="report-grade-cell">
                            <span className={`report-grade-badge grade-${mark.grade?.toLowerCase() || 'na'}`}>
                              {mark.grade || '-'}
                            </span>
                          </td>
                          <td className="report-remark-cell">
                            {remark ? (
                              <span style={{ color: getRemarkColor(remark) }}>{remark}</span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Class Teacher's Remark */}
              <div className="report-card-remarks">
                <div className="remarks-column">
                  <div className="remarks-header">
                    <h4>Class Teacher's Remark</h4>
                  </div>
                  <p className="remarks-text">{classTeacherRemarks || 'No class remarks provided'}</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="report-card-signatures">
                <div className="signature-box">
                  <div className="signature-box-content">
                    <span className="signature-label">Teacher's Signature</span>
                    <div className="signature-line"></div>
                    <span className="signature-name">_________________</span>
                    <span className="signature-date">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="signature-box">
                  <div className="signature-box-content">
                    <span className="signature-label">Head Teacher's Signature</span>
                    <div className="signature-line"></div>
                    <span className="signature-name">_________________________</span>
                    <span className="signature-date">Date: _______</span>
                  </div>
                </div>
                <div className="signature-box">
                  <div className="signature-box-content">
                    <span className="signature-label">Parent's Signature</span>
                    <div className="signature-line"></div>
                    <span className="signature-name">_________________________</span>
                    <span className="signature-date">Date: _______</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="report-card-footer">
                <div className="report-card-footer-text">
                  <p>This is a system-generated report card</p>
                  <small>Generated on: {new Date().toLocaleString()}</small>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="report-modal-footer">
            <button className="report-modal-btn-close-modal" onClick={closeReportModal}>
              Cancel
            </button>
            <button className="report-modal-btn-print-modal" onClick={() => { printReportCard(); }}>
              Print Report Card
            </button>

            <button className="report-modal-btn-download" onClick={() => {
              showToast('Downloading report card...', 'info');
            }}>
              <FontAwesomeIcon icon={faDownload} /> Download PDF
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER COMPONENT
  // ============================================================
  
  const currentSubjects = getCurrentPageSubjects();

  return (
    <div className="teacher-grades-page">
      {/* Page Header */}
      <div className="section-header">
        <div className="header-left">
          <h2>
            <FontAwesomeIcon icon={faChartLine} className="header-icon" />
            Grade Entry System
          </h2>
          <p className="header-subtitle">Record CA and Exam scores for students</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green">
            <FontAwesomeIcon icon={faUserGraduate} />
          </div>
          <div className="stat-info">
            <h3>{stats.totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className="stat-info">
            <h3>{stats.gradedStudents}</h3>
            <p>Grades Entered</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FontAwesomeIcon icon={faAward} />
          </div>
          <div className="stat-info">
            <h3>{stats.averageScore}%</h3>
            <p>Average Score</p>
          </div>
        </div>
      </div>

      {/* Filters – Academic Year smaller, Load Class in same row */}
      <div className="filters-row">
        <div className="filter-group" style={{ flex: '1 1 150px', minWidth: '120px' }}>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="filter-select"
            disabled={loadingClasses}
          >
            <option value="">Select Class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.class_name} ({cls.level})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ flex: '0 1 120px', minWidth: '100px' }}>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="filter-select"
          >
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>

        <div className="filter-group" style={{ flex: '0 1 100px', minWidth: '80px' }}>
          <input
            type="text"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            placeholder="e.g., 2024-2025"
            className="filter-input"
            style={{ width: '100%' }}
          />
        </div>

        <div className="filter-group" style={{ flex: '0 1 auto', minWidth: '100px' }}>
          <button
            className="btn-load"
            onClick={loadClassData}
            disabled={loading || !selectedClass}
          >
            <FontAwesomeIcon icon={loading ? faSpinner : faSearch} spin={loading} />
            {loading ? 'Loading...' : 'Load Class'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Subject Pagination Controls */}
      {classStudents.length > 0 && subjects.length > 0 && (
        <div className="subject-pagination">
          <div className="subject-pagination-info">
            <span className="subject-count">
              {subjects.length} Subjects • Page {currentSubjectPage + 1} of {totalSubjectPages}
            </span>
            <div className="subject-pagination-buttons">
              <button 
                onClick={prevSubjectPage} 
                disabled={currentSubjectPage === 0}
                className="pagination-btn"
              >
                <FontAwesomeIcon icon={faChevronLeft} /> Previous
              </button>
              <button 
                onClick={nextSubjectPage} 
                disabled={currentSubjectPage === totalSubjectPages - 1}
                className="pagination-btn"
              >
                Next <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>
          <div className="subject-indicators">
            {Array.from({ length: totalSubjectPages }).map((_, index) => (
              <span 
                key={index}
                className={`subject-dot ${index === currentSubjectPage ? 'active' : ''}`}
                onClick={() => setCurrentSubjectPage(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grades Table */}
      {classStudents.length > 0 && subjects.length > 0 && (
        <>
          <div className="table-wrapper" ref={tableRef}>
            <table className="grades-table">
              <thead>
                <tr>
                  <th className="student-col">Student</th>
                  {currentSubjects.map((subject) => (
                    <th key={subject.id} colSpan="3" className="subject-header">
                      {subject.name}
                      <span className="score-labels">
                        <span className="ca-label">CA</span>
                        <span className="exam-label">EXAM</span>
                        <span className="grade-label">GRD</span>
                      </span>
                    </th>
                  ))}
                  <th className="action-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((student) => {
                  const studentMarks = marks[student.id] || {};
                  return (
                    <tr key={student.id}>
                      <td className="student-name">
                        <strong>{student.first_name} {student.last_name}</strong>
                        <span className="admission-no">{student.admission_number}</span>
                      </td>
                      {currentSubjects.map((subject) => {
                        const mark = studentMarks[subject.id] || { ca: '', exam: '', total: 0, grade: '' };
                        return (
                          <React.Fragment key={subject.id}>
                            <td className="grade-cell ca-cell">
                              <input
                                type="number"
                                value={mark.ca}
                                onChange={(e) =>
                                  handleGradeChange(
                                    student.id,
                                    subject.id,
                                    'ca',
                                    e.target.value
                                  )
                                }
                                min="0"
                                max="40"
                                step="0.5"
                                placeholder="0-40"
                                className="grade-input ca-input"
                              />
                            </td>
                            <td className="grade-cell exam-cell">
                              <input
                                type="number"
                                value={mark.exam}
                                onChange={(e) =>
                                  handleGradeChange(
                                    student.id,
                                    subject.id,
                                    'exam',
                                    e.target.value
                                  )
                                }
                                min="0"
                                max="60"
                                step="0.5"
                                placeholder="0-60"
                                className="grade-input exam-input"
                              />
                            </td>
                            <td className="grade-cell grade-display-cell">
                              {mark.grade ? (
                                <span 
                                  className="grade-badge" 
                                  style={{ 
                                    background: getGradeColor(mark.grade),
                                    color: '#fff',
                                    fontWeight: 700
                                  }}
                                >
                                  {mark.grade}
                                </span>
                              ) : (
                                <span className="grade-placeholder">-</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className="action-cell">
                        <button
                          className="btn-view-report"
                          onClick={() => viewReportCard(student)}
                          title="View Report Card"
                          type="button"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Class Teacher Remarks */}
          <div className="class-remarks-section">
            <div className="remarks-header">
              <FontAwesomeIcon icon={faUserTie} />
              <h4>Class Teacher Remarks</h4>
            </div>
            <textarea
              value={classTeacherRemarks}
              onChange={(e) => setClassTeacherRemarks(e.target.value)}
              className="class-remarks-input"
              placeholder="Enter general remarks for the whole class..."
              rows="2"
            />
          </div>

          {/* Action Buttons */}
          <div className="actions-section">
            <div className="actions-spacer"></div>
            <div className="actions-buttons">
              <button
                className="btn-save"
                onClick={saveAllGrades}
                disabled={saving || !selectedClass || classStudents.length === 0}
              >
                <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} />
                {saving ? 'Saving...' : 'Save All'}
              </button>
             
            </div>
          </div>
        </>
      )}

      {/* No Data States */}
      {classStudents.length === 0 && selectedClass && !loading && !error && (
        <div className="no-data">
          <FontAwesomeIcon icon={faUserGraduate} size="2x" />
          <p>No students found in this class</p>
          <p className="no-data-sub">Click "Load Class" to refresh or select a different class</p>
        </div>
      )}

      {!selectedClass && !loadingClasses && (
        <div className="no-data">
          <FontAwesomeIcon icon={faBookOpen} size="2x" />
          <p>Select a class to enter grades</p>
        </div>
      )}

      {subjects.length === 0 && selectedClass && !loading && classStudents.length > 0 && !error && (
        <div className="no-data">
          <FontAwesomeIcon icon={faBookOpen} size="2x" />
          <p>No subjects found for this class</p>
          <p className="no-data-sub">Please ensure subjects are assigned to this class.</p>
        </div>
      )}

      {(loading || loadingClasses) && classStudents.length === 0 && (
        <div className="loading-state">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          <p>{loadingClasses ? 'Loading classes...' : 'Loading class data...'}</p>
        </div>
      )}

      {/* Report Card Modal */}
      {renderReportCardModal()}

      {/* Toast Notification */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default TeacherGrades;