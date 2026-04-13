const timetableModel = require('../models/timetableModel');

const timetableController = {
  // GET /api/timetables - Get all timetables
  async getAllTimetables(req, res) {
    try {
      const { class_id, day } = req.query;
      const filters = { class_id, day };
      
      const timetables = await timetableModel.getAllTimetables(filters);
      res.json({
        success: true,
        count: timetables.length,
        data: timetables
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/timetables/:id - Get single timetable
  async getTimetableById(req, res) {
    try {
      const timetable = await timetableModel.getTimetableById(req.params.id);
      if (!timetable) {
        return res.status(404).json({ success: false, error: 'Timetable not found' });
      }
      res.json({ success: true, data: timetable });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/timetables/class/:classId - Get class timetable
  async getClassTimetable(req, res) {
    try {
      const timetable = await timetableModel.getClassTimetable(req.params.classId);
      if (!timetable) {
        return res.status(404).json({ success: false, error: 'No timetable found for this class' });
      }
      res.json({ success: true, data: timetable });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/timetables/teacher/:teacherId - Get teacher timetable
  async getTeacherTimetable(req, res) {
    try {
      const timetable = await timetableModel.getTeacherTimetable(req.params.teacherId);
      res.json({ success: true, data: timetable });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/timetables - Create timetable
  async createTimetable(req, res) {
    try {
      const newTimetable = await timetableModel.createTimetable(req.body);
      res.status(201).json({ success: true, data: newTimetable });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // PUT /api/timetables/:id - Update timetable
  async updateTimetable(req, res) {
    try {
      const updated = await timetableModel.updateTimetable(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Timetable not found' });
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // DELETE /api/timetables/:id - Delete timetable
  async deleteTimetable(req, res) {
    try {
      const deleted = await timetableModel.deleteTimetable(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Timetable not found' });
      }
      res.json({ success: true, message: 'Timetable deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = timetableController;