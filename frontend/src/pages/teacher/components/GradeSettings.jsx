// src/pages/teacher/components/GradeSettings.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

const GradeSettings = ({ gradingSystem, onSave, onClose }) => {
  const [settings, setSettings] = useState(gradingSystem);

  const handleSave = () => {
    const totalWeight = settings.weightDistribution.ca + settings.weightDistribution.exam;
    if (totalWeight !== 100) {
      alert(`Total weight must equal 100%. Currently: ${totalWeight}%`);
      return;
    }
    onSave(settings);
  };

  return (
    <div className="grade-settings-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content large">
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon"><FontAwesomeIcon icon={faCog} /></div>
            <div><h2>Grading System Settings</h2></div>
          </div>
          <button className="modal-close" onClick={onClose}><FontAwesomeIcon icon={faTimes} /></button>
        </div>
        <div className="modal-body">
          <div className="settings-section">
            <h3>Weight Distribution</h3>
            <div className="weight-inputs">
              <div className="weight-group">
                <label>CA Weight</label>
                <input type="number" min="0" max="100" value={settings.weightDistribution.ca} 
                  onChange={(e) => setSettings({...settings, weightDistribution: {...settings.weightDistribution, ca: parseFloat(e.target.value) || 0}})} />
                <span>%</span>
              </div>
              <div className="weight-group">
                <label>Exam Weight</label>
                <input type="number" min="0" max="100" value={settings.weightDistribution.exam} 
                  onChange={(e) => setSettings({...settings, weightDistribution: {...settings.weightDistribution, exam: parseFloat(e.target.value) || 0}})} />
                <span>%</span>
              </div>
              <div className="weight-total">Total: <span className={settings.weightDistribution.ca + settings.weightDistribution.exam === 100 ? 'valid' : 'invalid'}>{settings.weightDistribution.ca + settings.weightDistribution.exam}%</span></div>
            </div>
          </div>
          <div className="settings-section">
            <h3>Pass Mark</h3>
            <div className="pass-mark-input">
              <input type="number" min="0" max="100" value={settings.passMark} 
                onChange={(e) => setSettings({...settings, passMark: parseFloat(e.target.value) || 0})} />
              <span>%</span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel-modal" onClick={onClose}>Cancel</button>
          <button className="btn-save-modal" onClick={handleSave}><FontAwesomeIcon icon={faSave} /> Save Settings</button>
        </div>
      </div>
    </div>
  );
};

export default GradeSettings;