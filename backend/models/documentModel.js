const mockData = require('../data/mockData');

class DocumentModel {
  // Get all documents
  async getAllDocuments(filters = {}) {
    let documents = [...mockData.documents];
    
    if (filters.category) {
      documents = documents.filter(d => d.category === filters.category);
    }
    if (filters.student_id) {
      documents = documents.filter(d => d.student_id === parseInt(filters.student_id));
    }
    if (filters.type) {
      documents = documents.filter(d => d.type === filters.type);
    }
    
    return documents;
  }
  
  // Get document by ID
  async getDocumentById(id) {
    const document = mockData.documents.find(d => d.id === parseInt(id));
    if (!document) return null;
    return document;
  }
  
  // Upload new document
  async uploadDocument(documentData) {
    const newDocument = {
      id: mockData.getNextId('documents'),
      ...documentData,
      upload_date: new Date().toISOString().split('T')[0],
      status: 'pending'
    };
    mockData.documents.push(newDocument);
    return newDocument;
  }
  
  // Update document
  async updateDocument(id, updateData) {
    const index = mockData.documents.findIndex(d => d.id === parseInt(id));
    if (index === -1) return null;
    
    mockData.documents[index] = {
      ...mockData.documents[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    return mockData.documents[index];
  }
  
  // Delete document
  async deleteDocument(id) {
    const index = mockData.documents.findIndex(d => d.id === parseInt(id));
    if (index === -1) return false;
    
    mockData.documents.splice(index, 1);
    return true;
  }
  
  // Get student documents
  async getStudentDocuments(studentId) {
    const documents = mockData.documents.filter(d => d.student_id === parseInt(studentId));
    const student = mockData.students.find(s => s.id === parseInt(studentId));
    
    return {
      student: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
      documents
    };
  }
  
  // Get document categories
  async getDocumentCategories() {
    return mockData.document_categories;
  }
  
  // Approve document
  async approveDocument(id, approvedBy) {
    const index = mockData.documents.findIndex(d => d.id === parseInt(id));
    if (index === -1) return null;
    
    mockData.documents[index].status = 'approved';
    mockData.documents[index].approved_by = approvedBy;
    mockData.documents[index].approved_at = new Date().toISOString();
    
    return mockData.documents[index];
  }
}

module.exports = new DocumentModel();