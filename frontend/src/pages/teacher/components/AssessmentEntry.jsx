// src/pages/teacher/components/AssessmentEntry.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faCheckCircle, faExclamationTriangle, faArrowRight } from '@fortawesome/free-solid-svg-icons';

const AssessmentEntry = ({ students, subjects, gradeDraft, onGradeUpdate, onViewReport, onNext }) => {
  // Check if CA is complete for a student-subject
  const getCAStatus = (studentId, subjectId) => {
    const grades = gradeDraft[studentId]?.[subjectId] || {};
    const caMarks = ['CA1', 'CA2', 'CA3']
      .map((type) => grades[type])
      .filter((m) => m !== null && m !== undefined);

    if (caMarks.length === 3) return 'complete';
    if (caMarks.length > 0) return 'partial';
    return 'empty';
  };

  // Calculate CA average for a student
  const calculateCAAverage = (studentId) => {
    let total = 0;
    let count = 0;

    subjects.forEach((subject) => {
      const grades = gradeDraft[studentId]?.[subject.id] || {};
      ['CA1', 'CA2', 'CA3'].forEach((type) => {
        const mark = grades[type];
        if (mark !== null && mark !== undefined) {
          total += mark;
          count++;
        }
      });
    });

    return count > 0 ? total / count : 0;
  };

  // Check if all CA is complete for a student
  const isAllCAComplete = (studentId) => {
    let complete = true;
    subjects.forEach((subject) => {
      if (getCAStatus(studentId, subject.id) !== 'complete') {
        complete = false;
      }
    });
    return complete;
  };

  return (
    <div className="assessment-entry">
      <div className="section-header">
        <h2>📝 Continuous Assessment (CA1, CA2, CA3)</h2>
        <div className="info-badges">
          <span className="info-badge">Max: 40 each</span>
          <span className="info-badge">Total: 120</span>
          <span className="info-badge">Weight: 60%</span>
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
                <th key={subject.id} colSpan="3" className="subject-header">
                  {subject.name}
                  <span className="subject-code">({subject.code})</span>
                </th>
              ))}
              <th rowSpan="2">CA Avg</th>
              <th rowSpan="2">Status</th>
              <th rowSpan="2">Action</th>
            </tr>
            <tr>
              {subjects.map((subject) => (
                <React.Fragment key={`${subject.id}-ca-headers`}>
                  <th>CA1</th>
                  <th>CA2</th>
                  <th>CA3</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => {
              const caAvg = calculateCAAverage(student.student_id);
              const allComplete = isAllCAComplete(student.student_id);

              return (
                <tr key={student.student_id} className={allComplete ? 'row-complete' : 'row-pending'}>
                  <td>{index + 1}</td>
                  <td className="student-name">
                    <strong>
                      {student.first_name} {student.last_name}
                    </strong>
                  </td>
                  <td>{student.admission_number}</td>

                  {subjects.map((subject) => {
                    const grades = gradeDraft[student.student_id]?.[subject.id] || {};

                    return ['CA1', 'CA2', 'CA3'].map((caType) => (
                      <td key={`${student.student_id}-${subject.id}-${caType}`}>
                        <input
                          type="number"
                          className="grade-input ca-input"
                          value={grades[caType] !== undefined && grades[caType] !== null ? grades[caType] : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              onGradeUpdate(student.student_id, subject.id, caType, null);
                              return;
                            }
                            const num = parseFloat(value);
                            if (!isNaN(num) && num >= 0 && num <= 40) {
                              onGradeUpdate(student.student_id, subject.id, caType, num);
                            }
                          }}
                          placeholder="-"
                          min="0"
                          max="40"
                          step="0.5"
                        />
                      </td>
                    ));
                  })}

                  <td className="student-average">{caAvg > 0 ? caAvg.toFixed(1) : '-'}</td>

                  <td className={`status-cell ${allComplete ? 'status-complete' : 'status-pending'}`}>
                    <FontAwesomeIcon icon={allComplete ? faCheckCircle : faExclamationTriangle} />
                    <span>{allComplete ? 'Complete' : 'Pending'}</span>
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
        <div className="summary-stats">
          <div className="stat">
            <span>Students:</span>
            <strong>{students.length}</strong>
          </div>
          <div className="stat">
            <span>Subjects:</span>
            <strong>{subjects.length}</strong>
          </div>
          <div className="stat">
            <span>Complete:</span>
            <strong>{students.filter((s) => isAllCAComplete(s.student_id)).length}/{students.length}</strong>
          </div>
        </div>
        <button className="btn-next" onClick={onNext}>
          Proceed to Exam <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>
    </div>
  );
};

export default AssessmentEntry;