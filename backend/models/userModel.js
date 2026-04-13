const mockData = require('../data/mockData');
const bcrypt = require('bcryptjs');

class UserModel {
  // Get all users
  async getAllUsers(filters = {}) {
    let users = [...(mockData.users || [])];
    
    if (filters.role) {
      users = users.filter(u => u.role === filters.role);
    }
    if (filters.status) {
      users = users.filter(u => u.status === filters.status);
    }
    
    // Remove sensitive data
    return users.map(user => {
      const { password, mfa_secret, ...safeUser } = user;
      return safeUser;
    });
  }
  
  // Get user by ID
  async getUserById(id) {
    const user = mockData.users.find(u => u.id === parseInt(id));
    if (!user) return null;
    
    const { password, mfa_secret, ...safeUser } = user;
    return safeUser;
  }
  
  // Get user by email
  async getUserByEmail(email) {
    return mockData.users.find(u => u.email === email);
  }
  
  // Create new user
  async createUser(userData) {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    const newUser = {
      id: mockData.getNextId('users'),
      ...userData,
      password: hashedPassword,
      mfa_enabled: false,
      mfa_secret: null,
      status: 'active',
      last_login: null,
      created_at: new Date().toISOString()
    };
    
    if (!mockData.users) mockData.users = [];
    mockData.users.push(newUser);
    
    const { password, mfa_secret, ...safeUser } = newUser;
    return safeUser;
  }
  
  // Update user
  async updateUser(id, updateData) {
    const index = mockData.users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return null;
    
    // If updating password, hash it
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }
    
    mockData.users[index] = {
      ...mockData.users[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    const { password, mfa_secret, ...safeUser } = mockData.users[index];
    return safeUser;
  }
  
  // Delete user
  async deleteUser(id) {
    const index = mockData.users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return false;
    
    mockData.users.splice(index, 1);
    return true;
  }
  
  // Verify password
  async verifyPassword(email, password) {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;
    
    return user;
  }
  
  // Enable MFA for user
  async enableMFA(userId, secret) {
    const index = mockData.users.findIndex(u => u.id === parseInt(userId));
    if (index === -1) return null;
    
    mockData.users[index].mfa_enabled = true;
    mockData.users[index].mfa_secret = secret;
    
    return { mfa_enabled: true };
  }
  
  // Disable MFA for user
  async disableMFA(userId) {
    const index = mockData.users.findIndex(u => u.id === parseInt(userId));
    if (index === -1) return null;
    
    mockData.users[index].mfa_enabled = false;
    mockData.users[index].mfa_secret = null;
    
    return { mfa_enabled: false };
  }
  
  // Update last login
  async updateLastLogin(userId) {
    const index = mockData.users.findIndex(u => u.id === parseInt(userId));
    if (index === -1) return null;
    
    mockData.users[index].last_login = new Date().toISOString();
    return mockData.users[index];
  }
  
  // Get user by role
  async getUsersByRole(role) {
    const users = mockData.users.filter(u => u.role === role);
    return users.map(user => {
      const { password, mfa_secret, ...safeUser } = user;
      return safeUser;
    });
  }
}

module.exports = new UserModel();