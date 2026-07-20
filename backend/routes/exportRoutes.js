const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { optionalAuth, enrichUserContext } = require('../middleware/auth');

// optionalAuth + enrichUserContext so export endpoints can enforce parent/teacher access.
router.get('/students/excel', optionalAuth, enrichUserContext, exportController.exportStudentsToExcel);
router.get('/fees/excel', optionalAuth, enrichUserContext, exportController.exportFeesReport);
router.get('/attendance/excel', optionalAuth, enrichUserContext, exportController.exportAttendanceReport);
router.get('/report-card/pdf', optionalAuth, enrichUserContext, exportController.generatePDFReportCard);


module.exports = router;