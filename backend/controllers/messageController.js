const messageModel = require('../models/messageModel');

const messageController = {
  // GET /api/messages - Get all messages
  async getAllMessages(req, res) {
    try {
      const { receiver_id, status } = req.query;
      const filters = { receiver_id, status };
      
      const messages = await messageModel.getAllMessages(filters);
      res.json({ success: true, count: messages.length, data: messages });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/messages/:id - Get single message
  async getMessageById(req, res) {
    try {
      const message = await messageModel.getMessageById(req.params.id);
      if (!message) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }
      res.json({ success: true, data: message });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/messages - Send message
  async sendMessage(req, res) {
    try {
      const newMessage = await messageModel.sendMessage(req.body);
      res.status(201).json({ success: true, data: newMessage });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // PUT /api/messages/:id/read - Mark as read
  async markAsRead(req, res) {
    try {
      const message = await messageModel.markAsRead(req.params.id);
      if (!message) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }
      res.json({ success: true, data: message });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/messages/unread/:receiverId/:receiverType - Get unread count
  async getUnreadCount(req, res) {
    try {
      const count = await messageModel.getUnreadCount(req.params.receiverId, req.params.receiverType);
      res.json({ success: true, data: { unread_count: count } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/announcements/all - Get all announcements
  async getAllAnnouncements(req, res) {
    try {
      const announcements = await messageModel.getAllAnnouncements();
      res.json({ success: true, count: announcements.length, data: announcements });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/announcements - Create announcement
  async createAnnouncement(req, res) {
    try {
      const announcement = await messageModel.createAnnouncement(req.body);
      res.status(201).json({ success: true, data: announcement });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // DELETE /api/announcements/:id - Delete announcement
  async deleteAnnouncement(req, res) {
    try {
      const deleted = await messageModel.deleteAnnouncement(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Announcement not found' });
      }
      res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = messageController;