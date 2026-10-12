const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { isAdmin, isTeacher } = require('../middleware/auth');

router.use(isTeacher);

router.get('/', inventoryController.getAllItems);
router.get('/summary', inventoryController.getInventorySummary);
router.get('/alerts', inventoryController.getLowStockAlerts);
router.get('/categories', inventoryController.getInventoryCategories);
router.get('/search/:keyword', inventoryController.searchInventory);
router.get('/:id', inventoryController.getItemById);
router.post('/', isAdmin, inventoryController.createItem);
router.put('/:id', isAdmin, inventoryController.updateItem);
router.delete('/:id', isAdmin, inventoryController.deleteItem);
router.post('/transaction', inventoryController.recordTransaction);
router.put('/transaction/:transactionId/approve', isAdmin, inventoryController.approveTransaction);

module.exports = router;
