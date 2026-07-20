import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCog, faTimes, faUserCircle, faSave, faLock, 
  faUser, faEnvelope, faPhone, faMapMarkerAlt,
  faCheckCircle, faEye, faEyeSlash, faIdCard,
  faShieldAlt, faKey, faUserTag, faBuilding,
  faExclamationTriangle, faSpinner, faCamera
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
      await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });

      onUpdateUser(profileForm);
      setSaveSuccess(true);
    } catch {
      setSaveError('Error saving profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      return setSaveError("Passwords don't match");
    }

    try {
      await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm)
      });

      setSaveSuccess(true);
    } catch {
      setSaveError('Error changing password');
    }
  };

  const handleLogoutAll = async () => {
    await fetch('/api/auth/logout-all', { method: 'POST' });
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

        {/* HEADER */}
        <div className="settings-modal-header">
          <h2>Settings</h2>
          <button onClick={onClose}><FontAwesomeIcon icon={faTimes} /></button>
        </div>

        {/* TABS */}
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button key={tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              <FontAwesomeIcon icon={tab.icon} /> {tab.label}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div className="settings-modal-body">

          {/* PROFILE */}
          {activeTab === 'profile' && (
            <>
              <div>
                <img src={profilePicPreview || ''} alt="" width="80" />
                <input type="file" onChange={handleProfilePicUpload} />
              </div>

              <input name="first_name" value={profileForm.first_name} onChange={handleProfileChange} placeholder="First Name"/>
              <input name="last_name" value={profileForm.last_name} onChange={handleProfileChange} placeholder="Last Name"/>
              <input name="phone" value={profileForm.phone} onChange={handleProfileChange} placeholder="Phone"/>
              <input name="address" value={profileForm.address} onChange={handleProfileChange} placeholder="Address"/>

              <button onClick={handleSaveProfile}>
                <FontAwesomeIcon icon={faSave}/> Save
              </button>
            </>
          )}

          {/* SECURITY */}
          {activeTab === 'security' && (
            <>
              <input type="password" name="current_password" placeholder="Current Password" onChange={handlePasswordChange}/>
              <input type="password" name="new_password" placeholder="New Password" onChange={handlePasswordChange}/>
              <input type="password" name="confirm_password" placeholder="Confirm Password" onChange={handlePasswordChange}/>

              <p>Strength: {passwordStrength}/4</p>

              <button onClick={handleChangePassword}>
                <FontAwesomeIcon icon={faLock}/> Change Password
              </button>

              <hr />

              <button onClick={handleLogoutAll}>
                Logout all devices
              </button>
            </>
          )}

          {/* PREFERENCES */}
          {activeTab === 'preferences' && (
            <>
              <label>
                Email Notifications
                <input type="checkbox"
                  checked={preferences.email_notifications}
                  onChange={(e)=>setPreferences({...preferences, email_notifications:e.target.checked})}
                />
              </label>

              <label>
                SMS Notifications
                <input type="checkbox"
                  checked={preferences.sms_notifications}
                  onChange={(e)=>setPreferences({...preferences, sms_notifications:e.target.checked})}
                />
              </label>

              <select value={preferences.theme}
                onChange={(e)=>setPreferences({...preferences, theme:e.target.value})}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>

              <button>
                <FontAwesomeIcon icon={faSave}/> Save Preferences
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;