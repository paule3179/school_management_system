const mockData = require('../data/mockData');

class MessageModel {
  // Get all messages
  async getAllMessages(filters = {}) {
    let messages = [...mockData.messages];
    
    if (filters.receiver_id) {
      messages = messages.filter(m => m.receiver_id === filters.receiver_id || m.receiver_id === "all_parents");
    }
    if (filters.status) {
      messages = messages.filter(m => m.status === filters.status);
    }
    
    return messages.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  }
  
  // Get message by ID
  async getMessageById(id) {
    const message = mockData.messages.find(m => m.id === parseInt(id));
    if (!message) return null;
    return message;
  }
  
  // Send new message
  async sendMessage(messageData) {
    const newMessage = {
      id: mockData.getNextId('messages'),
      ...messageData,
      status: 'sent',
      sent_at: new Date().toISOString(),
      read_at: null
    };
    mockData.messages.push(newMessage);
    return newMessage;
  }
  
  // Mark message as read
  async markAsRead(id) {
    const index = mockData.messages.findIndex(m => m.id === parseInt(id));
    if (index === -1) return null;
    
    mockData.messages[index].read_at = new Date().toISOString();
    mockData.messages[index].status = 'read';
    return mockData.messages[index];
  }
  
  // Get unread count for a user
  async getUnreadCount(receiverId, receiverType) {
    const unread = mockData.messages.filter(m => 
      (m.receiver_id === receiverId || m.receiver_id === "all_parents") &&
      m.receiver_type === receiverType &&
      m.read_at === null
    );
    return unread.length;
  }
  
  // Get all announcements
  async getAllAnnouncements() {
    const now = new Date().toISOString().split('T')[0];
    const announcements = mockData.announcements.filter(a => 
      !a.expiry_date || a.expiry_date >= now
    );
    return announcements.sort((a, b) => new Date(b.posted_date) - new Date(a.posted_date));
  }
  
  // Create announcement
  async createAnnouncement(announcementData) {
    const newAnnouncement = {
      id: mockData.getNextId('announcements'),
      ...announcementData,
      posted_date: new Date().toISOString().split('T')[0]
    };
    mockData.announcements.push(newAnnouncement);
    return newAnnouncement;
  }
  
  // Delete announcement
  async deleteAnnouncement(id) {
    const index = mockData.announcements.findIndex(a => a.id === parseInt(id));
    if (index === -1) return false;
    
    mockData.announcements.splice(index, 1);
    return true;
  }
}

module.exports = new MessageModel();