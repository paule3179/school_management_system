// src/pages/teacher/components/ExamEntry.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faCheckCircle,
  faExclamationTriangle,
  faArrowLeft,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons';

const ExamEntry = ({
  students,
  subjects,
  gradeDraft,
  onGradeUpdate,
  onViewReport,
  onBack,
  calculateAverage,
  calculateGrade,
}) => {
  const [filter, setFilter] = useState('all');

  // Get exam status for a student
  const getExamStatus = (studentId) => {
    let hasExam = false;
    let allComplete = true;

    subjects.forEach((subject) => {
      const examMark = gradeDraft[studentId]?.[subject.id]?.['Exam'];
      if (examMark !== null && examMark !== undefined) {
        hasExam = true;
      } else {
        allComplete = false;
      }
    });

    if (!hasExam) return 'empty';
    return allComplete ? 'complete' : 'partial';
  };

  // Filter students
  const filteredStudents = students.filter((student) => {
    if (filter === 'all') return true;
    const status = getExamStatus(student.student_id);
    if (filter === 'complete') return status === 'complete';
    if (filter === 'incomplete') return status === 'empty' || status === 'partial';
    return true;
  });

  // Find top student
  const topStudent = students.reduce((a, b) => {
    const scoreA = calculateAverage(a.student_id);
    const scoreB = calculateAverage(b.student_id);
    return scoreA > scoreB ? a : b;
  }, students[0]);

  return (
    <div className="exam-entry">
      <div className="section-header">
        <h2>📊 Exam Scores</h2>
        <div className="info-badges">
          <span className="info-badge">Max: 60 each</span>
          <span className="info-badge">Weight: 40%</span>
        </div>
      </div>

      {/* Top Student Banner */}
      {topStudent && calculateAverage(topStudent.student_id) > 0 && (
        <div className="top-student-banner">
          <FontAwesomeIcon icon={faTrophy} className="trophy-icon" />
          <span>
            <strong>Top Student:</strong> {topStudent.first_name} {topStudent.last_name} (
            {calculateAverage(topStudent.student_id).toFixed(1)}%)
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="exam-filters">
        <div className="filter-group">
          <label>Filter:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Students</option>
            <option value="complete">Exam Complete</option>
            <option value="incomplete">Exam Incomplete</option>
          </select>
        </div>
        <div className="filter-info">
          Showing {filteredStudents.length} of {students.length} students
        </div>
      </div>

      <div className="table-responsive">
        <table className="grades-table">
          <thead>
            <tr>
              <th rowSpan="2">#</th>
              <th rowSpan="2">Student</th>
              <th rowSpan="2">Admission</th>
              {subjects.map((subject) => (
                <th key={subject.id} className="subject-header">
                  {subject.name}
                  <span className="subject-code">({subject.code})</span>
                </th>
              ))}
              <th rowSpan="2">Total</th>
              <th rowSpan="2">Grade</th>
              <th rowSpan="2">Status</th>
              <th rowSpan="2">Action</th>
            </tr>
            <tr>
              {subjects.map((subject) => (
                <th key={`${subject.id}-exam`}>Exam</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, index) => {
              const avg = calculateAverage(student.student_id);
              const grade = calculateGrade(avg);
              const status = getExamStatus(student.student_id);
              const complete = status === 'complete';

              return (
                <tr key={student.student_id} className={complete ? 'row-complete' : 'row-pending'}>
                  <td>{index + 1}</td>
                  <td className="student-name">
                    <strong>
                      {student.first_name} {student.last_name}
                    </strong>
                  </td>
                  <td>{student.admission_number}</td>

                  {subjects.map((subject) => {
                    const examMark = gradeDraft[student.student_id]?.[subject.id]?.['Exam'];

                    return (
                      <td key={`${student.student_id}-${subject.id}-Exam`}>
                        <input
                          type="number"
                          className="grade-input exam-input"
                          value={examMark !== undefined && examMark !== null ? examMark : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              onGradeUpdate(student.student_id, subject.id, 'Exam', null);
                              return;
                            }
                            const num = parseFloat(value);
                            if (!isNaN(num) && num >= 0 && num <= 60) {
                              onGradeUpdate(student.student_id, subject.id, 'Exam', num);
                            }
                          }}
                          placeholder="-"
                          min="0"
                          max="60"
                          step="0.5"
                        />
                      </td>
                    );
                  })}

                  <td className="student-total">{avg > 0 ? avg.toFixed(1) + '%' : '-'}</td>

                  <td className={`student-grade grade-${grade?.toLowerCase() || 'none'}`}>
                    {grade || '-'}
                  </td>

                  <td className={`status-cell status-${status}`}>
                    <FontAwesomeIcon icon={complete ? faCheckCircle : faExclamationTriangle} />
                    <span>{complete ? 'Complete' : 'Pending'}</span>
                  </td>

                  <td>
                    <button className="btn-view" onClick={() => onViewReport(student.student_id)} title="View Report">
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="entry-footer">
        <button className="btn-back" onClick={onBack}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to CA
        </button>
        <div className="summary-stats">
          <div className="stat">
            <span>Complete:</span>
            <strong>{students.filter((s) => getExamStatus(s.student_id) === 'complete').length}/{students.length}</strong>
          </div>
          <div className="stat">
            <span>Class Avg:</span>
            <strong>
              {(() => {
                const avg = students.reduce((sum, s) => sum + calculateAverage(s.student_id), 0);
                return students.length > 0 ? (avg / students.length).toFixed(1) + '%' : '-';
              })()}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamEntry;