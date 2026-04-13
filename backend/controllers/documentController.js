const documentModel = require('../models/documentModel');

const documentController = {
  // GET /api/documents - Get all documents
  async getAllDocuments(req, res) {
    try {
      const { category, student_id, type } = req.query;
      const filters = { category, student_id, type };
      
      const documents = await documentModel.getAllDocuments(filters);
      res.json({ success: true, count: documents.length, data: documents });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/documents/:id - Get single document
  async getDocumentById(req, res) {
    try {
      const document = await documentModel.getDocumentById(req.params.id);
      if (!document) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }
      res.json({ success: true, data: document });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/documents/student/:studentId - Get student documents
  async getStudentDocuments(req, res) {
    try {
      const documents = await documentModel.getStudentDocuments(req.params.studentId);
      res.json({ success: true, data: documents });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/documents - Upload document
  async uploadDocument(req, res) {
    try {
      const newDocument = await documentModel.uploadDocument(req.body);
      res.status(201).json({ success: true, data: newDocument });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // PUT /api/documents/:id - Update document
  async updateDocument(req, res) {
    try {
      const updated = await documentModel.updateDocument(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // DELETE /api/documents/:id - Delete document
  async deleteDocument(req, res) {
    try {
      const deleted = await documentModel.deleteDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }
      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/documents/categories - Get document categories
  async getDocumentCategories(req, res) {
    try {
      const categories = await documentModel.getDocumentCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // PUT /api/documents/:id/approve - Approve document
  async approveDocument(req, res) {
    try {
      const approved = await documentModel.approveDocument(req.params.id, req.body.approved_by);
      if (!approved) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }
      res.json({ success: true, data: approved });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = documentController;