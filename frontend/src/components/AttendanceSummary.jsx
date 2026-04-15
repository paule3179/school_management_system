import React from 'react';

const AttendanceSummary = ({ summary, closeModal }) => {
  return (
    <div className="attendance-summary-overlay">
      <div className="attendance-summary-card">
        <div className="summary-header">
          <h2>📊 Attendance Summary</h2>
          <button className="close-summary" onClick={closeModal}>×</button>
        </div>

        <div className="summary-stats-grid">
          <div className="stat-card present">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{summary.present || 0}</div>
            <div className="stat-label">Present Days</div>
          </div>
          <div className="stat-card absent">
            <div className="stat-icon">❌</div>
            <div className="stat-value">{summary.absent || 0}</div>
            <div className="stat-label">Absent Days</div>
          </div>
          <div className="stat-card late">
            <div className="stat-icon">⏰</div>
            <div className="stat-value">{summary.late || 0}</div>
            <div className="stat-label">Late Days</div>
          </div>
          <div className="stat-card excused">
            <div className="stat-icon">📝</div>
            <div className="stat-value">{summary.excused || 0}</div>
            <div className="stat-label">Excused Days</div>
          </div>
        </div>

        <div className="attendance-percentage">
          <div className="percentage-circle">
            <div className="percentage-text">{summary.attendance_percentage || 0}%</div>
          </div>
          <div className="percentage-label">Attendance Rate</div>
        </div>

        <div className="summary-footer">
          <div className="term-info">
            <strong>Term Total Days:</strong> {summary.term_total_days || 0}
          </div>
          <button className="btn-close" onClick={closeModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummary;

