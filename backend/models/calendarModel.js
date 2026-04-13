const mockData = require('../data/mockData');

class CalendarModel {
  // Get all events
  async getAllEvents(filters = {}) {
    let events = [...mockData.calendar_events];
    
    if (filters.event_type) {
      events = events.filter(e => e.event_type === filters.event_type);
    }
    if (filters.status) {
      events = events.filter(e => e.status === filters.status);
    }
    if (filters.start_date) {
      events = events.filter(e => e.start_date >= filters.start_date);
    }
    if (filters.end_date) {
      events = events.filter(e => e.end_date <= filters.end_date);
    }
    
    return events.sort((a, b) => a.start_date.localeCompare(b.start_date));
  }
  
  // Get event by ID
  async getEventById(id) {
    const event = mockData.calendar_events.find(e => e.id === parseInt(id));
    if (!event) return null;
    return event;
  }
  
  // Create new event
  async createEvent(eventData) {
    const newEvent = {
      id: mockData.getNextId('calendar_events'),
      ...eventData,
      created_at: new Date().toISOString().split('T')[0]
    };
    mockData.calendar_events.push(newEvent);
    return newEvent;
  }
  
  // Update event
  async updateEvent(id, updateData) {
    const index = mockData.calendar_events.findIndex(e => e.id === parseInt(id));
    if (index === -1) return null;
    
    mockData.calendar_events[index] = {
      ...mockData.calendar_events[index],
      ...updateData,
      updated_at: new Date().toISOString().split('T')[0]
    };
    return mockData.calendar_events[index];
  }
  
  // Delete event
  async deleteEvent(id) {
    const index = mockData.calendar_events.findIndex(e => e.id === parseInt(id));
    if (index === -1) return false;
    
    mockData.calendar_events.splice(index, 1);
    return true;
  }
  
  // Get upcoming events
  async getUpcomingEvents(days = 30) {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    return mockData.calendar_events.filter(e => 
      e.start_date >= today && e.start_date <= futureDateStr && e.status !== 'completed'
    ).sort((a, b) => a.start_date.localeCompare(b.start_date));
  }
  
  // Get event types
  async getEventTypes() {
    return mockData.event_types;
  }
}

module.exports = new CalendarModel();