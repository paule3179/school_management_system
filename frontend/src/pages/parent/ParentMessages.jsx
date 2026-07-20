// src/pages/parent/ParentMessages.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faReply, faSpinner, faPaperPlane, faTimes } from '@fortawesome/free-solid-svg-icons';

const ParentMessages = ({ API_BASE }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState({ to: '', subject: '', content: '' });
  const [showModal, setShowModal] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setMessages(data.data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const loadTeachers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setTeachers(data.data || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  }, [API_BASE]);

  useEffect(() => {
    loadMessages();
    loadTeachers();
  }, [loadMessages, loadTeachers]);

  const openModal = () => {
    setNewMessage({ to: '', subject: '', content: '' });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const sendMessage = async () => {
    if (!newMessage.to || !newMessage.subject || !newMessage.content) {
      alert('Please fill all fields');
      return;
    }
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newMessage)
      });
      const data = await response.json();
      if (data.success) {
        alert('Message sent successfully');
        closeModal();
        loadMessages(); // refresh list
      } else {
        alert(data.error || 'Failed to send');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Network error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="parent-messages-page">
      <div className="section-header">
        <h2>Messages</h2>
        <button className="btn-primary" onClick={openModal}>
          <FontAwesomeIcon icon={faEnvelope} /> New Message
        </button>
      </div>

      {/* Messages List */}
      {loading ? (
        <div className="loading-state"><FontAwesomeIcon icon={faSpinner} spin /> Loading messages...</div>
      ) : messages.length === 0 ? (
        <div className="empty-state">No messages found.</div>
      ) : (
        <div className="messages-list">
          {messages.map(msg => (
            <div key={msg.id} className="message-card">
              <div className="message-header">
                <strong>{msg.subject}</strong>
                <span className="message-date">{new Date(msg.created_at).toLocaleDateString()}</span>
              </div>
              <div className="message-sender">From: {msg.sender_name}</div>
              <div className="message-content">{msg.content}</div>
              <div className="message-actions">
                <button className="btn-reply" onClick={() => alert('Reply feature coming soon')}>
                  <FontAwesomeIcon icon={faReply} /> Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Professional Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon"><FontAwesomeIcon icon={faEnvelope} /></div>
                <div>
                  <h2>Compose New Message</h2>
                  <p className="modal-subtitle">Send a message to a teacher</p>
                </div>
              </div>
              <button className="modal-close" onClick={closeModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>To (Teacher) <span className="required">*</span></label>
                <select
                  value={newMessage.to}
                  onChange={(e) => setNewMessage({ ...newMessage, to: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subject <span className="required">*</span></label>
                <input
                  type="text"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                  placeholder="Enter subject"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Message <span className="required">*</span></label>
                <textarea
                  rows="5"
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                  placeholder="Type your message here..."
                  className="form-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel-modal" onClick={closeModal}>Cancel</button>
              <button className="btn-save-modal" onClick={sendMessage} disabled={sending}>
                <FontAwesomeIcon icon={sending ? faSpinner : faPaperPlane} spin={sending} />
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentMessages;