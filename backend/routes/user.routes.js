const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/usage', userController.getUsage);
router.put('/usage', userController.updateUsage);
router.put('/profile', userController.updateProfile);
router.get('/calendar-tokens', userController.getCalendarTokens);
router.put('/calendar-token', userController.updateCalendarToken);
router.get('/export', userController.exportData);
router.delete('/erase-all', userController.deleteAllData);
router.get('/config', userController.getGlobalConfig);

module.exports = router;
