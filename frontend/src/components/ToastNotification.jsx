// frontend/src/components/ToastNotification.jsx
import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle, 
  faExclamationCircle, 
  faInfoCircle, 
  faTimes,
  faGraduationCap,
  faWarning
} from '@fortawesome/free-solid-svg-icons';

const ToastNotification = ({ message, type = 'success', onClose, duration = 4000 }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        onClose();
      }, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: { 
      bg: '#d4edda', 
      border: '#28a745', 
      text: '#155724', 
      icon: faCheckCircle,
      title: 'Success'
    },
    error: { 
      bg: '#f8d7da', 
      border: '#dc3545', 
      text: '#721c24', 
      icon: faExclamationCircle,
      title: 'Error'
    },
    warning: { 
      bg: '#fff3cd', 
      border: '#ffc107', 
      text: '#856404', 
      icon: faWarning,
      title: 'Warning'
    },
    info: { 
      bg: '#d1ecf1', 
      border: '#17a2b8', 
      text: '#0c5460', 
      icon: faInfoCircle,
      title: 'Info'
    },
    promotion: { 
      bg: '#e8f5e9', 
      border: '#4caf50', 
      text: '#1b5e20', 
      icon: faGraduationCap,
      title: 'Promotion Complete'
    }
  };

  const { bg, border, text, icon, title } = config[type] || config.success;

  return (
    <div 
      className={`toast-notification ${exiting ? 'exiting' : ''}`}
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 9999,
      }}
    >
      <div style={{
        background: bg,
        borderLeft: `4px solid ${border}`,
        borderRadius: '8px',
        padding: '12px 20px',
        minWidth: '300px',
        maxWidth: '450px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <FontAwesomeIcon icon={icon} style={{ color: border, fontSize: '22px', marginTop: '2px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', color: text, marginBottom: '4px', fontSize: '14px' }}>
            {title}
          </div>
          <div style={{ color: text, fontSize: '13px', lineHeight: '1.4' }}>
            {message}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: text,
          opacity: 0.6,
          padding: '4px',
          borderRadius: '4px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;