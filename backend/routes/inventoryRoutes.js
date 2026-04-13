const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.get('/', inventoryController.getAllItems);
router.get('/summary', inventoryController.getInventorySummary);
router.get('/alerts', inventoryController.getLowStockAlerts);
router.get('/categories', inventoryController.getInventoryCategories);
router.get('/search/:keyword', inventoryController.searchInventory);
router.get('/:id', inventoryController.getItemById);
router.post('/', inventoryController.createItem);
router.put('/:id', inventoryController.updateItem);
router.delete('/:id', inventoryController.deleteItem);
router.post('/transaction', inventoryController.recordTransaction);
router.put('/transaction/:transactionId/approve', inventoryController.approveTransaction);

module.exports = router;