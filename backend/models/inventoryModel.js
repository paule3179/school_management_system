const mockData = require('../data/mockData');

class InventoryModel {
  // Get all inventory items
  async getAllItems(filters = {}) {
    let items = [...mockData.inventory_items];
    
    if (filters.category) {
      items = items.filter(i => i.category === filters.category);
    }
    if (filters.status) {
      items = items.filter(i => i.status === filters.status);
    }
    if (filters.condition) {
      items = items.filter(i => i.condition === filters.condition);
    }
    
    return items;
  }
  
  // Get item by ID
  async getItemById(id) {
    const item = mockData.inventory_items.find(i => i.id === parseInt(id));
    if (!item) return null;
    
    const transactions = mockData.inventory_transactions.filter(t => t.item_id === item.id);
    return {
      ...item,
      transactions
    };
  }
  
  // Create new item
  async createItem(itemData) {
    const newItem = {
      id: mockData.getNextId('inventory_items'),
      ...itemData,
      total_value: itemData.quantity * itemData.unit_price,
      last_inventory_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString().split('T')[0]
    };
    mockData.inventory_items.push(newItem);
    return newItem;
  }
  
  // Update item
  async updateItem(id, updateData) {
    const index = mockData.inventory_items.findIndex(i => i.id === parseInt(id));
    if (index === -1) return null;
    
    if (updateData.quantity || updateData.unit_price) {
      const newQuantity = updateData.quantity || mockData.inventory_items[index].quantity;
      const newPrice = updateData.unit_price || mockData.inventory_items[index].unit_price;
      updateData.total_value = newQuantity * newPrice;
    }
    
    mockData.inventory_items[index] = {
      ...mockData.inventory_items[index],
      ...updateData,
      updated_at: new Date().toISOString().split('T')[0]
    };
    return mockData.inventory_items[index];
  }
  
  // Delete item
  async deleteItem(id) {
    const index = mockData.inventory_items.findIndex(i => i.id === parseInt(id));
    if (index === -1) return false;
    
    mockData.inventory_items.splice(index, 1);
    return true;
  }
  
  // Record transaction (issue, receive, damaged, etc.)
  async recordTransaction(transactionData) {
    const newTransaction = {
      id: mockData.getNextId('inventory_transactions'),
      ...transactionData,
      date: new Date().toISOString().split('T')[0],
      status: 'pending'
    };
    mockData.inventory_transactions.push(newTransaction);
    
    // Update item quantity based on transaction type
    const itemIndex = mockData.inventory_items.findIndex(i => i.id === transactionData.item_id);
    if (itemIndex !== -1) {
      const item = mockData.inventory_items[itemIndex];
      if (transactionData.transaction_type === 'issued') {
        item.quantity -= transactionData.quantity;
        item.total_value = item.quantity * item.unit_price;
      } else if (transactionData.transaction_type === 'purchased') {
        item.quantity += transactionData.quantity;
        item.total_value = item.quantity * item.unit_price;
      } else if (transactionData.transaction_type === 'damaged') {
        item.quantity -= transactionData.quantity;
        item.total_value = item.quantity * item.unit_price;
        item.condition = 'damaged';
      }
      item.last_inventory_date = new Date().toISOString().split('T')[0];
    }
    
    return newTransaction;
  }
  
  // Approve transaction
  async approveTransaction(transactionId, approvedBy) {
    const index = mockData.inventory_transactions.findIndex(t => t.id === parseInt(transactionId));
    if (index === -1) return null;
    
    mockData.inventory_transactions[index].status = 'approved';
    mockData.inventory_transactions[index].approved_by = approvedBy;
    mockData.inventory_transactions[index].approved_at = new Date().toISOString().split('T')[0];
    
    return mockData.inventory_transactions[index];
  }
  
  // Get inventory summary by category
  async getInventorySummary() {
    const summary = {};
    const categories = mockData.inventory_categories;
    
    categories.forEach(category => {
      const items = mockData.inventory_items.filter(i => i.category === category);
      const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
      const totalValue = items.reduce((sum, i) => sum + i.total_value, 0);
      
      summary[category] = {
        item_count: items.length,
        total_quantity: totalItems,
        total_value: totalValue
      };
    });
    
    return summary;
  }
  
  // Get low stock alerts
  async getLowStockAlerts() {
    const alerts = mockData.stock_alerts.filter(a => a.status === 'active');
    
    const alertsWithDetails = alerts.map(alert => {
      const item = mockData.inventory_items.find(i => i.id === alert.item_id);
      return {
        ...alert,
        item_name: item ? item.name : 'Unknown',
        current_quantity: item ? item.quantity : 0,
        recommended_action: `Order ${alert.threshold - item.quantity} more units`
      };
    });
    
    return alertsWithDetails;
  }
  
  // Get inventory categories
  async getInventoryCategories() {
    return mockData.inventory_categories;
  }
  
  // Search inventory
  async searchInventory(keyword) {
    const keywordLower = keyword.toLowerCase();
    return mockData.inventory_items.filter(i => 
      i.name.toLowerCase().includes(keywordLower) ||
      i.category.toLowerCase().includes(keywordLower) ||
      i.location.toLowerCase().includes(keywordLower)
    );
  }
}

module.exports = new InventoryModel();