const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// Check if controller and functions exist
console.log('Message Controller loaded:', Object.keys(messageController));

// Message routes
router.get('/', messageController.getAllMessages);
router.get('/unread/:receiverId/:receiverType', messageController.getUnreadCount);
router.get('/:id', messageController.getMessageById);
router.post('/', messageController.sendMessage);
router.put('/:id/read', messageController.markAsRead);

// Announcement routes
router.get('/announcements/all', messageController.getAllAnnouncements);
router.post('/announcements', messageController.createAnnouncement);
router.delete('/announcements/:id', messageController.deleteAnnouncement);

module.exports = router;