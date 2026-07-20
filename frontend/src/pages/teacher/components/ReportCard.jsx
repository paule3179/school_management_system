// src/pages/teacher/components/ReportCard.jsx
import React, { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faPrint,
  faFileDownload,
  faUserGraduate,
  faSchool,
  faCalendarAlt,
  faTrophy,
  faBook,
  faStar,
} from '@fortawesome/free-solid-svg-icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const ReportCard = ({
  studentId,
  reportData,
  students,
  subjects,
  gradeDraft,
  classInfo,
  term,
  academicYear,
  onClose,
}) => {
  const reportRef = useRef(null);

  // Find student data
  const student = students.find((s) => s.student_id === studentId);
  
  if (!student) {
    return (
      <div className="report-card-modal">
        <div className="modal-overlay" onClick={onClose}></div>
        <div className="modal-content">
          <div className="modal-header">
            <h2>Error</h2>
            <button className="btn-close" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <div className="modal-body">
            <p>Student not found</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate student's grades
  const calculateStudentGrades = () => {
    const results = [];
    let caTotal = 0;
    let caCount = 0;
    let examTotal = 0;
    let examCount = 0;

    subjects.forEach((subject) => {
      const grades = gradeDraft[studentId]?.[subject.id] || {};
      
      const caMarks = ['CA1', 'CA2', 'CA3']
        .map((type) => grades[type])
        .filter((m) => m !== null && m !== undefined);

      const caAverage = caMarks.length > 0 
        ? caMarks.reduce((a, b) => a + b, 0) / caMarks.length 
        : 0;

      const examMark = grades['Exam'] || 0;

      // Subject total = 60% CA + 40% Exam
      const subjectTotal = (caAverage * 0.6) + (examMark * 0.4);

      if (caMarks.length > 0 || examMark > 0) {
        caTotal += caAverage;
        examTotal += examMark;
        caCount++;
        examCount++;
        
        results.push({
          subject: subject.name,
          code: subject.code,
          ca_average: caAverage,
          exam: examMark,
          total: subjectTotal,
          grade: getGradeLetter(subjectTotal),
        });
      }
    });

    const avgCA = caCount > 0 ? caTotal / caCount : 0;
    const avgExam = examCount > 0 ? examTotal / examCount : 0;
    const overallTotal = (avgCA * 0.6) + (avgExam * 0.4);

    return {
      subjects: results,
      ca_average: avgCA,
      exam_average: avgExam,
      total_average: overallTotal,
      grade: getGradeLetter(overallTotal),
    };
  };

  const getGradeLetter = (marks) => {
    if (marks === null || marks === undefined || marks === 0) return '-';
    if (marks >= 80) return 'A';
    if (marks >= 70) return 'B';
    if (marks >= 60) return 'C';
    if (marks >= 50) return 'D';
    return 'F';
  };

  const getGradeDescription = (grade) => {
    switch (grade) {
      case 'A': return 'Excellent';
      case 'B': return 'Very Good';
      case 'C': return 'Good';
      case 'D': return 'Satisfactory';
      case 'F': return 'Needs Improvement';
      default: return 'Not Graded';
    }
  };

  // Calculate class position
  const getPosition = () => {
    const allStudents = students.map((s) => ({
      id: s.student_id,
      name: `${s.first_name} ${s.last_name}`,
      average: calculateStudentGradesForStudent(s.student_id).total_average,
    }));

    const sorted = allStudents.sort((a, b) => b.average - a.average);
    const position = sorted.findIndex((s) => s.id === studentId) + 1;
    const total = sorted.length;

    if (position === 0) return 'N/A';
    return `${position} of ${total}`;
  };

  const calculateStudentGradesForStudent = (id) => {
    let caTotal = 0;
    let caCount = 0;
    let examTotal = 0;
    let examCount = 0;

    subjects.forEach((subject) => {
      const grades = gradeDraft[id]?.[subject.id] || {};
      
      const caMarks = ['CA1', 'CA2', 'CA3']
        .map((type) => grades[type])
        .filter((m) => m !== null && m !== undefined);

      const caAverage = caMarks.length > 0 
        ? caMarks.reduce((a, b) => a + b, 0) / caMarks.length 
        : 0;

      const examMark = grades['Exam'] || 0;

      if (caMarks.length > 0 || examMark > 0) {
        caTotal += caAverage;
        examTotal += examMark;
        caCount++;
        examCount++;
      }
    });

    const avgCA = caCount > 0 ? caTotal / caCount : 0;
    const avgExam = examCount > 0 ? examTotal / examCount : 0;
    return {
      total_average: (avgCA * 0.6) + (avgExam * 0.4),
    };
  };

  const studentGrades = calculateStudentGrades();
  const position = getPosition();

  // Get teacher's remarks based on performance
  const getTeacherRemarks = () => {
    const avg = studentGrades.total_average;
    
    if (avg >= 80) return 'Excellent performance! You are a role model to your peers. Keep up the great work!';
    if (avg >= 70) return 'Very good performance. Continue with this momentum and strive for excellence.';
    if (avg >= 60) return 'Good performance. With more effort, you can achieve even better results.';
    if (avg >= 50) return 'Satisfactory performance. More focus and dedication will help you improve.';
    return 'Needs improvement. Please pay more attention in class and seek help where needed.';
  };

  // Download PDF
  const downloadPDF = async () => {
    const element = reportRef.current;
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Report_Card_${student.admission_number}_${academicYear}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // Print
  const printReport = () => {
    window.print();
  };

  return (
    <div className="report-card-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      
      <div className="modal-content report-card-modal-content">
        <div className="modal-header">
          <h2>
            <FontAwesomeIcon icon={faUserGraduate} />
            Report Card
          </h2>
          <div className="header-actions">
            <button className="btn-print" onClick={printReport}>
              <FontAwesomeIcon icon={faPrint} /> Print
            </button>
            <button className="btn-download" onClick={downloadPDF}>
              <FontAwesomeIcon icon={faFileDownload} /> PDF
            </button>
            <button className="btn-close" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        {/* Report Card Content */}
        <div className="report-card" ref={reportRef}>
          {/* School Header */}
          <div className="report-header">
            <div className="school-info">
              <h1>🏫 Kings School</h1>
              <p className="school-motto">"Excellence in Education"</p>
              <p className="school-address">123 Education Avenue, Learning City</p>
              <p className="school-contact">Tel: 055-123-4567 | Email: info@kingschool.edu</p>
            </div>
            <div className="report-title">
              <h2>ACADEMIC REPORT CARD</h2>
              <p className="report-subtitle">
                {academicYear} | Term {term}
              </p>
            </div>
          </div>

          {/* Student Info */}
          <div className="student-info">
            <div className="info-row">
              <div className="info-item">
                <span className="label">Student Name:</span>
                <span className="value">{student.first_name} {student.last_name}</span>
              </div>
              <div className="info-item">
                <span className="label">Admission No:</span>
                <span className="value">{student.admission_number}</span>
              </div>
            </div>
            <div className="info-row">
              <div className="info-item">
                <span className="label">Class:</span>
                <span className="value">{classInfo?.name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Level:</span>
                <span className="value">{classInfo?.level || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Position:</span>
                <span className="value position">{position}</span>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="results-table-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Subject</th>
                  <th>CA Average</th>
                  <th>Exam</th>
                  <th>Total</th>
                  <th>Grade</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {studentGrades.subjects.map((subject, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{subject.name}</td>
                    <td>{subject.ca_average > 0 ? subject.ca_average.toFixed(1) : '-'}</td>
                    <td>{subject.exam > 0 ? subject.exam.toFixed(1) : '-'}</td>
                    <td className="total-column">
                      {subject.total > 0 ? subject.total.toFixed(1) : '-'}
                    </td>
                    <td className={`grade-column grade-${subject.grade?.toLowerCase() || 'none'}`}>
                      {subject.grade || '-'}
                    </td>
                    <td>{subject.grade ? getGradeDescription(subject.grade) : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="summary-row">
                  <td colSpan="2">
                    <strong>Overall Summary</strong>
                  </td>
                  <td>
                    <strong>{studentGrades.ca_average > 0 ? studentGrades.ca_average.toFixed(1) : '-'}</strong>
                  </td>
                  <td>
                    <strong>{studentGrades.exam_average > 0 ? studentGrades.exam_average.toFixed(1) : '-'}</strong>
                  </td>
                  <td className="total-column">
                    <strong>{studentGrades.total_average > 0 ? studentGrades.total_average.toFixed(1) : '-'}</strong>
                  </td>
                  <td className={`grade-column grade-${studentGrades.grade?.toLowerCase() || 'none'}`}>
                    <strong>{studentGrades.grade || '-'}</strong>
                  </td>
                  <td>
                    <strong>{studentGrades.grade ? getGradeDescription(studentGrades.grade) : '-'}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Remarks Section */}
          <div className="remarks-section">
            <div className="remark-box teacher-remark">
              <h4>Teacher's Remarks:</h4>
              <p>{getTeacherRemarks()}</p>
            </div>
            <div className="remark-box principal-remark">
              <h4>Principal's Remarks:</h4>
              <p>
                {studentGrades.total_average >= 70 
                  ? 'A commendable performance. Keep it up!' 
                  : studentGrades.total_average >= 50 
                  ? 'Encouraging progress. Work harder to reach your full potential.' 
                  : 'We believe in your abilities. Please put in more effort.'}
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="signatures">
            <div className="signature-line">
              <span>Class Teacher's Signature:</span>
              <span className="signature-line">________________________</span>
            </div>
            <div className="signature-line">
              <span>Principal's Signature:</span>
              <span className="signature-line">________________________</span>
            </div>
            <div className="signature-line">
              <span>Date:</span>
              <span className="signature-line">________________________</span>
            </div>
          </div>

          <div className="report-footer">
            <p className="footer-note">
              This report card is issued to the parent/guardian of the above-named student.
            </p>
            <p className="footer-date">
              Generated on: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;