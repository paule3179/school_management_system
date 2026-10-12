import { apiFetch } from '../services/api.js';
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCog, faTimes, faUserCircle, faSave, faLock, 
  faUser, faEnvelope, faPhone, faMapMarkerAlt,
  faEye, faEyeSlash, faIdCard,
  faShieldAlt, faKey, faUserTag, faBuilding,
  faCamera
} from '@fortawesome/free-solid-svg-icons';
import './SettingsPage.css';

const SettingsPage = ({ currentUser, onUpdateUser, onClose }) => {

  // ================= STATE =================
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    employee_id: '',
    department: '',
    role: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [preferences, setPreferences] = useState({
    email_notifications: true,
    sms_notifications: false,
    theme: 'light',
    language: 'en'
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [profilePicPreview, setProfilePicPreview] = useState(null);

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordErrors, setPasswordErrors] = useState([]);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ================= INIT =================
  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        ...currentUser
      });

      const savedPic = localStorage.getItem('profilePicUrl');
      if (savedPic) setProfilePicPreview(savedPic);
    }
  }, [currentUser]);

  // ================= HANDLERS =================
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    if (name === 'new_password') validatePassword(value);
  };

  const validatePassword = (password) => {
    let strength = 0;
    const errors = [];

    if (password.length >= 8) strength++; else errors.push('Min 8 chars');
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++; else errors.push('Upper & lower');
    if (/[0-9]/.test(password)) strength++; else errors.push('Number required');
    if (/[!@#$%^&*]/.test(password)) strength++; else errors.push('Special char');

    setPasswordStrength(strength);
    setPasswordErrors(errors);
  };

  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Only images allowed");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Max size 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setProfilePicPreview(base64);
      localStorage.setItem('profilePicUrl', base64);
    };
    reader.readAsDataURL(file);
  };

  // ================= API =================
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Unable to save profile');
      }

      onUpdateUser(result.data);
      setSaveSuccess(true);
    } catch (error) {
      setSaveError(error.message || 'Error saving profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      return setSaveError("Passwords don't match");
    }

    try {
      const response = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: passwordForm.current_password,
          newPassword: passwordForm.new_password
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Unable to change password');
      }

      setSaveSuccess(true);
    } catch (error) {
      setSaveError(error.message || 'Error changing password');
    }
  };

  const handleLogoutAll = async () => {
    await apiFetch('/api/auth/logout-all', { method: 'POST' });
    alert("Logged out everywhere");
  };

  // ================= UI =================
  const tabs = [
    { id: 'profile', label: 'Profile', icon: faUserCircle },
    { id: 'security', label: 'Security', icon: faLock },
    { id: 'preferences', label: 'Preferences', icon: faUserTag }
  ];

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal">
        <div className="settings-modal-header">
          <div className="settings-header-title">
            <FontAwesomeIcon icon={faCog} />
            <h2>Settings</h2>
          </div>
          <button type="button" className="settings-close-btn" onClick={onClose} aria-label="Close settings">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              <FontAwesomeIcon icon={tab.icon} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-modal-body">
          {saveSuccess && <p className="settings-success-message" role="status">Changes saved successfully.</p>}
          {saveError && <p className="settings-error-message" role="alert">{saveError}</p>}
          {activeTab === 'profile' && (
            <div className="settings-profile-section">
              <div className="settings-profile-header">
                <div className="settings-avatar-wrapper">
                  <div className="profile-avatar-circle">
                    {profilePicPreview ? (
                      <img className="profile-avatar-image" src={profilePicPreview} alt="Profile" />
                    ) : (
                      <span className="profile-avatar-initials">
                        {(profileForm.first_name || 'U').charAt(0)}{(profileForm.last_name || 'S').charAt(0)}
                      </span>
                    )}

                    <label className="profile-upload-overlay" htmlFor="profile-upload-input">
                      <FontAwesomeIcon icon={faCamera} />
                      <span>Upload</span>
                    </label>
                    <input id="profile-upload-input" className="profile-upload-input" type="file" onChange={handleProfilePicUpload} />
                  </div>
                </div>

                <div className="settings-profile-info">
                  <h3>{profileForm.first_name || 'User'} {profileForm.last_name || ''}</h3>
                  <p className="profile-role">{profileForm.role || 'Member'}</p>
                  <p className="profile-id">
                    <FontAwesomeIcon icon={faIdCard} /> {profileForm.employee_id || 'Employee ID'}
                  </p>
                </div>
              </div>

              <div className="settings-form">
                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label><FontAwesomeIcon icon={faUser} /> First name</label>
                    <input className="settings-input" name="first_name" value={profileForm.first_name} onChange={handleProfileChange} placeholder="First Name" />
                  </div>
                  <div className="settings-form-group">
                    <label><FontAwesomeIcon icon={faUser} /> Last name</label>
                    <input className="settings-input" name="last_name" value={profileForm.last_name} onChange={handleProfileChange} placeholder="Last Name" />
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label><FontAwesomeIcon icon={faEnvelope} /> Email</label>
                    <input className="settings-input" name="email" value={profileForm.email} onChange={handleProfileChange} placeholder="Email address" />
                  </div>
                  <div className="settings-form-group">
                    <label><FontAwesomeIcon icon={faPhone} /> Phone</label>
                    <input className="settings-input" name="phone" value={profileForm.phone} onChange={handleProfileChange} placeholder="Phone" />
                  </div>
                </div>

                <div className="settings-form-group">
                  <label><FontAwesomeIcon icon={faMapMarkerAlt} /> Address</label>
                  <input className="settings-input" name="address" value={profileForm.address} onChange={handleProfileChange} placeholder="Address" />
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label><FontAwesomeIcon icon={faBuilding} /> Department</label>
                    <input className="settings-input" name="department" value={profileForm.department} onChange={handleProfileChange} placeholder="Department" />
                  </div>
                  <div className="settings-form-group">
                    <label><FontAwesomeIcon icon={faUserTag} /> Role</label>
                    <input className="settings-input" name="role" value={profileForm.role} onChange={handleProfileChange} placeholder="Role" />
                  </div>
                </div>

                <div className="settings-form-actions">
                  <button type="button" className="settings-save-btn" onClick={handleSaveProfile} disabled={loading}>
                    <FontAwesomeIcon icon={faSave} /> {loading ? 'Saving...' : 'Save profile'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-security-section">
              <div className="settings-security-info">
                <div className="settings-security-icon">
                  <FontAwesomeIcon icon={faShieldAlt} />
                </div>
                <div>
                  <h3>Account security</h3>
                  <p>Update your password and manage sign-in security.</p>
                </div>
              </div>

              <div className="settings-form">
                <div className="settings-form-group">
                  <label><FontAwesomeIcon icon={faLock} /> Current password</label>
                  <div className="settings-password-input">
                    <input className="settings-input" type={showCurrentPassword ? 'text' : 'password'} name="current_password" placeholder="Current Password" onChange={handlePasswordChange} />
                    <button type="button" className="password-toggle-btn" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                      <FontAwesomeIcon icon={showCurrentPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>

                <div className="settings-form-group">
                  <label><FontAwesomeIcon icon={faKey} /> New password</label>
                  <div className="settings-password-input">
                    <input className="settings-input" type={showNewPassword ? 'text' : 'password'} name="new_password" placeholder="New Password" onChange={handlePasswordChange} />
                    <button type="button" className="password-toggle-btn" onClick={() => setShowNewPassword(!showNewPassword)}>
                      <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>

                <div className="settings-form-group">
                  <label><FontAwesomeIcon icon={faKey} /> Confirm password</label>
                  <div className="settings-password-input">
                    <input className="settings-input" type={showConfirmPassword ? 'text' : 'password'} name="confirm_password" placeholder="Confirm Password" onChange={handlePasswordChange} />
                    <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>

                <div className="password-strength-container">
                  <div className="password-strength-bar">
                    <div className="password-strength-fill" style={{ width: `${(passwordStrength / 4) * 100}%`, background: passwordStrength >= 3 ? '#22c55e' : passwordStrength >= 2 ? '#fbbf24' : '#ef4444' }} />
                  </div>
                  <div className="password-strength-label">Strength: {passwordStrength}/4</div>
                  {passwordErrors.length > 0 && <small>{passwordErrors.join(' · ')}</small>}
                </div>

                <div className="settings-form-actions">
                  <button type="button" className="settings-save-btn" onClick={handleChangePassword}>
                    <FontAwesomeIcon icon={faLock} /> Change password
                  </button>
                  <button type="button" className="settings-danger-btn" onClick={handleLogoutAll}>
                    Logout all devices
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="settings-preferences-section">
              <div className="settings-preference-item">
                <label htmlFor="email_notifications">
                  <FontAwesomeIcon icon={faEnvelope} /> Email notifications
                </label>
                <label className="switch">
                  <input id="email_notifications" type="checkbox" checked={preferences.email_notifications} onChange={(e) => setPreferences({ ...preferences, email_notifications: e.target.checked })} />
                  <span className="slider" />
                </label>
              </div>

              <div className="settings-preference-item">
                <label htmlFor="sms_notifications">
                  <FontAwesomeIcon icon={faPhone} /> SMS notifications
                </label>
                <label className="switch">
                  <input id="sms_notifications" type="checkbox" checked={preferences.sms_notifications} onChange={(e) => setPreferences({ ...preferences, sms_notifications: e.target.checked })} />
                  <span className="slider" />
                </label>
              </div>

              <div className="settings-select-group">
                <label htmlFor="theme-select">Theme</label>
                <select id="theme-select" className="settings-select" value={preferences.theme} onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div className="settings-form-actions">
                <button type="button" className="settings-save-btn">
                  <FontAwesomeIcon icon={faSave} /> Save preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
