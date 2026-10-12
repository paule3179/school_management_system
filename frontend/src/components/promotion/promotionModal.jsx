import { apiFetch } from '../../services/api.js';
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGraduationCap, 
  faUsers, 
  faSchool, 
  faArrowRight, 
  faExclamationTriangle, 
  faUserGraduate,
  faSpinner,
  faTimes,
  faClock,
  faSave,
  faTimesCircle,
  faArrowUp
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from '../ToastNotification';
import './PromotionModal.css';

const PromotionModal = ({ isOpen, onClose, classData, onPromote, API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api') }) => {
    // State
    const [promotionData, setPromotionData] = useState({
        target_class_id: '',
        new_academic_year: '2026-2027',
        term: 1,
        students: [] // Each student will have a 'status' field
    });
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState(null);
    const [availableClasses, setAvailableClasses] = useState([]);
    const [academicYears] = useState(['2025-2026', '2026-2027', '2027-2028']);
    const [terms] = useState([1, 2, 3]);

    const showToast = (message, type = 'success') => setToast({ message, type });
    const hideToast = () => setToast(null);

    // Load promotion preview when modal opens
    useEffect(() => {
        if (isOpen && classData) {
            loadPromotionPreview();
            loadAvailableClasses();
        }
    }, [isOpen, classData]);

    const loadAvailableClasses = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await apiFetch(`${API_BASE}/classes`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const result = await response.json();
            if (result.success) {
                // Exclude current class
                const filtered = (result.data || []).filter(c => c.id !== classData?.id);
                setAvailableClasses(filtered);
            }
        } catch (error) {
            console.error('Error loading classes:', error);
        }
    };

    const loadPromotionPreview = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await apiFetch(
                `${API_BASE}/classes/${classData.id}/promotion-preview`,
                { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
            );
            const result = await response.json();
            
            if (result.success) {
                setPreview(result.data);
                // Initialize students with default status 'Promoted'
                const studentsWithStatus = (result.data.students_list || []).map(s => ({
                    ...s,
                    status: 'Promoted' // Default
                }));
                setPromotionData(prev => ({
                    ...prev,
                    students: studentsWithStatus,
                    target_class_id: result.data.target_class_id || '',
                    new_academic_year: result.data.next_academic_year || '2026-2027'
                }));
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

    // Handle student status change
    const handleStudentStatusChange = (studentId, newStatus) => {
        setPromotionData(prev => ({
            ...prev,
            students: prev.students.map(s =>
                s.id === studentId ? { ...s, status: newStatus } : s
            )
        }));
    };

    // Bulk actions
    const promoteAll = () => {
        setPromotionData(prev => ({
            ...prev,
            students: prev.students.map(s => ({ ...s, status: 'Promoted' }))
        }));
    };

    const retainAll = () => {
        setPromotionData(prev => ({
            ...prev,
            students: prev.students.map(s => ({ ...s, status: 'Retained' }))
        }));
    };

    const handlePromote = async () => {
        // Validate: all students must have a status
        const pending = promotionData.students.filter(s => !s.status || s.status === 'pending');
        if (pending.length > 0) {
            showToast(`Please select a status for ${pending.length} student(s).`, 'error');
            return;
        }

        // Validate target class for non-graduating students
        const promotedStudents = promotionData.students.filter(s => s.status === 'Promoted');
        if (promotedStudents.length > 0 && !promotionData.target_class_id) {
            showToast('Please select a target class for promoted students.', 'error');
            return;
        }

        if (!window.confirm(`Are you sure you want to process promotions for ${promotionData.students.length} students?`)) {
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                from_academic_year: classData?.academic_year || preview?.academic_year || '2025-2026',
                to_academic_year: promotionData.new_academic_year,
                term: promotionData.term,
                from_class_id: classData?.id,
                to_class_id: parseInt(promotionData.target_class_id) || null,
                is_graduation: preview?.is_graduation || false,
                students: promotionData.students.map(s => ({
                    student_id: s.id,
                    status: s.status,
                    remarks: s.remarks || ''
                }))
            };

            const response = await apiFetch(
                `${API_BASE}/admin/promotion/save`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify(payload)
                }
            );
            
            const result = await response.json();
            
            if (result.success) {
                const promoted = result.promoted_count || 0;
                const retained = result.retained_count || 0;
                showToast(`Success! ${promoted} promoted, ${retained} retained.`, 'success');
                if (onPromote) onPromote(); // Refresh parent data
                setTimeout(() => onClose(), 1500);
            } else {
                showToast('Error: ' + (result.error || result.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error promoting:', error);
            showToast('Error promoting students. Make sure the backend server is running.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Count stats
    const promotedCount = promotionData.students.filter(s => s.status === 'Promoted').length;
    const retainedCount = promotionData.students.filter(s => s.status === 'Retained').length;
    const graduatedCount = promotionData.students.filter(s => s.status === 'Graduated').length;
    const pendingCount = promotionData.students.filter(s => !s.status || s.status === 'pending').length;

    if (!isOpen) return null;

    return (
        <div className="promotion-modal-overlay" onClick={onClose}>
            <div className="promotion-modal-content" onClick={e => e.stopPropagation()}>

                {/* STATS CARDS */}
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
                                <div className="promotion-stat-value">{preview.current_class?.name || preview.current_class?.class_name || 'Class'}</div>
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
                        <div className="promotion-stat-card">
                            <div className="stat-card-icon">
                                <FontAwesomeIcon icon={faClock} />
                            </div>
                            <div className="stat-card-info">
                                <h4>Status</h4>
                                <div className="promotion-stat-value">
                                    {pendingCount > 0 ? `${pendingCount} pending` : 'Ready'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL HEADER */}
                <div className="promotion-modal-header">
                    <h2>
                        <FontAwesomeIcon icon={faGraduationCap} /> Promote Students – {classData?.name}
                    </h2>
                    <button className="promotion-modal-close" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div className="promotion-modal-body">
                    {loading ? (
                        <div className="promotion-loading">
                            <FontAwesomeIcon icon={faSpinner} spin />
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

                                    {/* Form Row: Term + Target Class */}
                                    <div className="promotion-form-row">
                                        <div className="promotion-form-group" style={{ flex: 1 }}>
                                            <label>Term <span className="required">*</span></label>
                                            <select 
                                                className="promotion-select"
                                                value={promotionData.term}
                                                onChange={e => setPromotionData({
                                                    ...promotionData,
                                                    term: parseInt(e.target.value)
                                                })}
                                            >
                                                {terms.map(t => (
                                                    <option key={t} value={t}>Term {t}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="promotion-form-group" style={{ flex: 2 }}>
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
                                                {availableClasses.map(cls => (
                                                    <option key={cls.id} value={cls.id}>
                                                        {cls.class_name || cls.name || `Class ${cls.id}`} ({cls.level})
                                                    </option>
                                                ))}
                                                {preview.is_graduation && (
                                                    <option value="graduated">Graduated</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Academic Year */}
                                    <div className="promotion-form-group">
                                        <label>New Academic Year <span className="required">*</span></label>
                                        <select 
                                            className="promotion-select"
                                            value={promotionData.new_academic_year}
                                            onChange={e => setPromotionData({
                                                ...promotionData,
                                                new_academic_year: e.target.value
                                            })}
                                        >
                                            {academicYears.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Bulk Actions */}
                                    {promotionData.students.length > 0 && (
                                        <div className="promotion-bulk-actions">
                                            <button className="promotion-bulk-btn promote" onClick={promoteAll}>
                                                <FontAwesomeIcon icon={faArrowUp} /> Promote All
                                            </button>
                                            <button className="promotion-bulk-btn retain" onClick={retainAll}>
                                                <FontAwesomeIcon icon={faTimesCircle} /> Retain All
                                            </button>
                                            <span className="promotion-counts">
                                                <span className="count promoted">{promotedCount} Promoted</span>
                                                <span className="count retained">{retainedCount} Retained</span>
                                                {graduatedCount > 0 && (
                                                    <span className="count graduated">{graduatedCount} Graduated</span>
                                                )}
                                            </span>
                                        </div>
                                    )}

                                    {/* Students List with Status Dropdown */}
                                    {promotionData.students.length > 0 && (
                                        <div className="promotion-student-list">
                                            <h4>
                                                <FontAwesomeIcon icon={faUserGraduate} /> Students ({preview.total_students})
                                            </h4>
                                            <div className="promotion-student-table-container">
                                                <table className="promotion-student-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Admission No</th>
                                                            <th>Student Name</th>
                                                            <th>Gender</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {promotionData.students.map(student => (
                                                            <tr key={student.id}>
                                                                <td>{student.admission_number}</td>
                                                                <td>{student.first_name} {student.last_name}</td>
                                                                <td>{student.gender === 'M' ? 'Male' : 'Female'}</td>
                                                                <td>
                                                                    <select
                                                                        className="promotion-status-select"
                                                                        value={student.status || 'pending'}
                                                                        onChange={(e) => handleStudentStatusChange(student.id, e.target.value)}
                                                                    >
                                                                        <option value="pending">-- Select --</option>
                                                                        <option value="Promoted">Promoted</option>
                                                                        <option value="Retained">Retained</option>
                                                                        <option value="Graduated">Graduated</option>
                                                                        <option value="Transferred">Transferred</option>
                                                                    </select>
                                                                </td>
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
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button 
                        className="promotion-btn-primary" 
                        onClick={handlePromote}
                        disabled={saving || loading || pendingCount > 0 || promotionData.students.length === 0}
                    >
                        {saving ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSave} /> Finalize Promotions
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
