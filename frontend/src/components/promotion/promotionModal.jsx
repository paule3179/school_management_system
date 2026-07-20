import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGraduationCap, 
  faUsers, 
  faSchool, 
  faArrowRight, 
  faExclamationTriangle, 
  faUserGraduate,
  faVenusMars,
  faSpinner,
  faTimes,
  faCheck,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from '../ToastNotification';
import './PromotionModal.css';

const PromotionModal = ({ isOpen, onClose, classData, onPromote }) => {
    const [promotionData, setPromotionData] = useState({
        target_class_id: '',
        new_academic_year: '2025-2026',
        preview_students: []
    });
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'success') => setToast({ message, type });
    const hideToast = () => setToast(null);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);

    // Load promotion preview when modal opens
    useEffect(() => {
        if (isOpen && classData) {
            loadPromotionPreview();
        }
    }, [isOpen, classData]);

    const loadPromotionPreview = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `http://localhost:5000/api/classes/${classData.id}/promotion-preview`
            );
            const result = await response.json();
            
            if (result.success) {
                setPreview(result.data);
                if (result.data.target_class_id) {
                    setPromotionData(prev => ({
                        ...prev,
                        target_class_id: result.data.target_class_id
                    }));
                }
            } else {
                showToast('Error loading promotion preview: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error loading preview:', error);
            showToast('Error loading promotion preview. Make sure the backend server is running.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePromote = async () => {
        if (!window.confirm(`Are you sure you want to promote ${preview?.total_students || 0} students?`)) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `http://localhost:5000/api/classes/${classData.id}/promote`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        target_class_id: promotionData.target_class_id,
                        new_academic_year: promotionData.new_academic_year
                    })
                }
            );
            
            const result = await response.json();
            
            if (result.success) {
                showToast(`Success! ${result.promoted_count} students promoted.`, 'success');
                if (onPromote) onPromote(); // Refresh data
                setTimeout(() => onClose(), 1500); // Close modal after toast
            } else {
                showToast('Error: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error promoting:', error);
            showToast('Error promoting students. Make sure the backend server is running.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="promotion-modal-overlay" onClick={onClose}>
            <div className="promotion-modal-content" onClick={e => e.stopPropagation()}>
                {/* STATS CARDS - AT THE VERY TOP (like student page) */}
                {preview && !loading && (
                    <div className="promotion-stats-grid promotion-stats-grid--modal-top">

                        <div className="promotion-stat-card">
                            <div className="stat-card-icon">
                                <FontAwesomeIcon icon={faUsers} />
                            </div>
                            <div className="stat-card-info">
                                <h4>Total Students</h4>
                                <div className="promotion-stat-value primary">{preview.total_students}</div>
                            </div>
                        </div>
                        <div className="promotion-stat-card">
                            <div className="stat-card-icon">
                                <FontAwesomeIcon icon={faSchool} />
                            </div>
                            <div className="stat-card-info">
                                <h4>Current Class</h4>
                                <div className="promotion-stat-value">{preview.current_class?.name}</div>
                            </div>
                        </div>
                        <div className="promotion-stat-card">
                            <div className="stat-card-icon">
                                <FontAwesomeIcon icon={faArrowRight} />
                            </div>
                            <div className="stat-card-info">
                                <h4>Next Class</h4>
                                <div className={`promotion-stat-value ${preview.suggested_next_class === 'GRADUATED' ? 'warning' : 'success'}`}>
                                    {preview.suggested_next_class === 'GRADUATED' ? 'GRADUATION' : preview.suggested_next_class}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL HEADER */}
                <div className="promotion-modal-header">
                    <h2>
                        <FontAwesomeIcon icon={faGraduationCap} /> Promote Students - {classData?.name}
                    </h2>
                    <button className="promotion-modal-close" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div className="promotion-modal-body">
                    {loading ? (
                        <div className="promotion-loading">
                            <div className="promotion-spinner"></div>
                            <p>Loading promotion preview...</p>
                        </div>
                    ) : (
                        <>
                            {preview && (
                                <>
                                    {/* Graduation Alert */}
                                    {preview.is_graduation && (
                                        <div className="promotion-graduation-alert">
                                            <FontAwesomeIcon icon={faExclamationTriangle} className="alert-icon" />
                                            <p className="alert-text">These students are graduating! They will be marked as alumni.</p>
                                        </div>
                                    )}

                                    {/* Target Class Selection */}
                                    <div className="promotion-form-group">
                                        <label>Target Class <span className="required">*</span></label>
                                        <select 
                                            className="promotion-select"
                                            value={promotionData.target_class_id}
                                            onChange={e => setPromotionData({
                                                ...promotionData,
                                                target_class_id: e.target.value
                                            })}
                                            disabled={preview.is_graduation}
                                        >
                                            <option value="">Select Target Class</option>
                                            {!preview.is_graduation && preview.target_class_id && (
                                                <option value={preview.target_class_id}>
                                                    {preview.suggested_next_class}
                                                </option>
                                            )}
                                            {preview.is_graduation && (
                                                <option value="graduated">Graduated</option>
                                            )}
                                        </select>
                                    </div>

                                    {/* Academic Year */}
                                    <div className="promotion-form-group">
                                        <label>New Academic Year <span className="required">*</span></label>
                                        <input 
                                            type="text"
                                            className="promotion-input"
                                            value={promotionData.new_academic_year}
                                            onChange={e => setPromotionData({
                                                ...promotionData,
                                                new_academic_year: e.target.value
                                            })}
                                            placeholder="e.g., 2025-2026"
                                        />
                                    </div>

                                    {/* Students List */}
                                    {preview.students_list && preview.students_list.length > 0 && (
                                        <div className="promotion-student-list">
                                            <h4>
                                                <FontAwesomeIcon icon={faUserGraduate} /> Students to Promote ({preview.total_students})
                                            </h4>
                                            <div className="promotion-student-table-container">
                                                <table className="promotion-student-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Admission No</th>
                                                            <th>Student Name</th>
                                                            <th><FontAwesomeIcon icon={faVenusMars} /> Gender</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {preview.students_list.map(student => (
                                                            <tr key={student.id}>
                                                                <td>{student.admission_number}</td>
                                                                <td>{student.first_name} {student.last_name}</td>
                                                                <td>{student.gender === 'M' ? 'Male' : 'Female'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {!preview && !loading && (
                                <div className="promotion-empty-state">
                                    <div className="promotion-empty-icon">
                                        <FontAwesomeIcon icon={faGraduationCap} />
                                    </div>
                                    <p>No promotion data available</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="promotion-modal-footer">
                    <button 
                        className="promotion-btn-secondary" 
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button 
                        className="promotion-btn-primary" 
                        onClick={handlePromote}
                        disabled={loading || !preview?.total_students}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Promoting...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faCheck} /> Confirm Promotion
                            </>
                        )}
                    </button>
                </div>
            </div>

            {toast && (
                <ToastNotification message={toast.message} type={toast.type} onClose={hideToast} />
            )}
        </div>
    );
};

export default PromotionModal;