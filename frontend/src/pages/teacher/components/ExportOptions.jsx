// src/pages/teacher/components/ExportOptions.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileExcel, faPrint, faDownload, faFileExport, faTimes } from '@fortawesome/free-solid-svg-icons';

const ExportOptions = ({ students, classInfo, onClose }) => {
  const exportCSV = () => {
    let csv = 'Student Name,Admission No,CA,Exam,Total,Grade,Remarks\n';
    students.forEach(s => {
      csv += `${s.first_name} ${s.last_name},${s.admission_number || 'N/A'},${s.ca || 0},${s.exam || 0},${s.total || 0},${s.grade || '-'},${s.remarks || ''}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Grades_${classInfo?.name || 'Class'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export-options-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon"><FontAwesomeIcon icon={faFileExport} /></div>
            <div><h2>Export Options</h2></div>
          </div>
          <button className="modal-close" onClick={onClose}><FontAwesomeIcon icon={faTimes} /></button>
        </div>
        <div className="modal-body">
          <div className="export-buttons-grid">
            <button className="export-btn pdf" onClick={() => window.print()}><FontAwesomeIcon icon={faFilePdf} /> Export PDF</button>
            <button className="export-btn excel" onClick={exportCSV}><FontAwesomeIcon icon={faFileExcel} /> Export CSV</button>
            <button className="export-btn print" onClick={() => window.print()}><FontAwesomeIcon icon={faPrint} /> Print</button>
            <button className="export-btn download" onClick={exportCSV}><FontAwesomeIcon icon={faDownload} /> Download CSV</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportOptions;