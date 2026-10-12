const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { isAdmin } = require('../middleware/auth');

router.get('/', calendarController.getAllEvents);
router.get('/upcoming', calendarController.getUpcomingEvents);
router.get('/types', calendarController.getEventTypes);
router.get('/:id', calendarController.getEventById);
router.post('/', isAdmin, calendarController.createEvent);
router.put('/:id', isAdmin, calendarController.updateEvent);
router.delete('/:id', isAdmin, calendarController.deleteEvent);

module.exports = router;
