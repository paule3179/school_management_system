const calendarModel = require('../models/calendarModel');

const calendarController = {
  // GET /api/calendar - Get all events
  async getAllEvents(req, res) {
    try {
      const { event_type, status, start_date, end_date } = req.query;
      const filters = { event_type, status, start_date, end_date };
      
      const events = await calendarModel.getAllEvents(filters);
      res.json({ success: true, count: events.length, data: events });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/calendar/upcoming - Get upcoming events
  async getUpcomingEvents(req, res) {
    try {
      const days = req.query.days ? parseInt(req.query.days) : 30;
      const events = await calendarModel.getUpcomingEvents(days);
      res.json({ success: true, count: events.length, data: events });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/calendar/types - Get event types
  async getEventTypes(req, res) {
    try {
      const types = await calendarModel.getEventTypes();
      res.json({ success: true, data: types });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/calendar/:id - Get single event
  async getEventById(req, res) {
    try {
      const event = await calendarModel.getEventById(req.params.id);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }
      res.json({ success: true, data: event });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/calendar - Create event
  async createEvent(req, res) {
    try {
      const { title, event_type, start_date, end_date, target_audience } = req.body || {};
      if (typeof title !== 'string' || !title.trim() || typeof event_type !== 'string' || !event_type.trim() ||
          typeof start_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(start_date) ||
          (end_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) ||
          (target_audience !== undefined && (!Array.isArray(target_audience) || target_audience.some(value => typeof value !== 'string')))) {
        return res.status(400).json({ success: false, error: 'Title, event type, and a valid start date are required' });
      }
      const newEvent = await calendarModel.createEvent({ ...req.body, title: title.trim(), created_by: req.user.id });
      res.status(201).json({ success: true, data: newEvent });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // PUT /api/calendar/:id - Update event
  async updateEvent(req, res) {
    try {
      const updated = await calendarModel.updateEvent(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // DELETE /api/calendar/:id - Delete event
  async deleteEvent(req, res) {
    try {
      const deleted = await calendarModel.deleteEvent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }
      res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = calendarController;
