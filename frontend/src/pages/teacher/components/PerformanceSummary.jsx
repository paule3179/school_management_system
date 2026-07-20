// src/pages/teacher/components/PerformanceSummary.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faTrophy, faExclamationTriangle, faCheckCircle, faTimesCircle, faUsers, faPercent, faStar } from '@fortawesome/free-solid-svg-icons';

const PerformanceSummary = ({ students, gradingSystem }) => {
  const scores = students.map(s => s.total).filter(s => s !== null && s !== undefined && !isNaN(s));
  
  if (scores.length === 0) {
    return (
      <div className="performance-summary">
        <div className="summary-header">
          <h3><FontAwesomeIcon icon={faChartBar} /> Performance Summary</h3>
          <span className="summary-badge">No grades entered yet</span>
        </div>
      </div>
    );
  }

  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);
  const passMark = gradingSystem?.passMark || 50;
  const passCount = scores.filter(s => s >= passMark).length;
  const failCount = scores.filter(s => s < passMark).length;
  const passRate = Math.round((passCount / scores.length) * 100);

  return (
    <div className="performance-summary">
      <div className="summary-header">
        <h3><FontAwesomeIcon icon={faChartBar} /> Performance Summary</h3>
        <span className="summary-badge">{scores.length} of {students.length} graded</span>
      </div>

      <div className="summary-stats-grid">
        <div className="summary-stat-card">
          <div className="stat-icon blue"><FontAwesomeIcon icon={faUsers} /></div>
          <div className="stat-info">
            <span className="stat-label">Class Average</span>
            <span className="stat-value">{Math.round(average)}%</span>
          </div>
        </div>
        <div className="summary-stat-card">
          <div className="stat-icon gold"><FontAwesomeIcon icon={faTrophy} /></div>
          <div className="stat-info">
            <span className="stat-label">Highest Score</span>
            <span className="stat-value">{Math.round(highest)}%</span>
          </div>
        </div>
        <div className="summary-stat-card">
          <div className="stat-icon red"><FontAwesomeIcon icon={faExclamationTriangle} /></div>
          <div className="stat-info">
            <span className="stat-label">Lowest Score</span>
            <span className="stat-value">{Math.round(lowest)}%</span>
          </div>
        </div>
        <div className="summary-stat-card">
          <div className="stat-icon green"><FontAwesomeIcon icon={faCheckCircle} /></div>
          <div className="stat-info">
            <span className="stat-label">Pass Rate</span>
            <span className="stat-value">{passRate}%</span>
          </div>
        </div>
      </div>

      <div className="pass-fail-summary">
        <div className="pass-count"><FontAwesomeIcon icon={faCheckCircle} className="pass-icon" /> Passed: <strong>{passCount}</strong></div>
        <div className="fail-count"><FontAwesomeIcon icon={faTimesCircle} className="fail-icon" /> Failed: <strong>{failCount}</strong></div>
      </div>
    </div>
  );
};

export default PerformanceSummary;