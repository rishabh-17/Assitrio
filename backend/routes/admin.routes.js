const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// All admin routes are protected by auth and admin role check
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', adminController.getAllUsers);
router.get('/users/:userId/details', adminController.getUserDetails);
router.post('/users', adminController.createUser);
router.put('/users', adminController.updateUser);
router.put('/users/plan', adminController.updateUserPlan);
router.delete('/users/:userId', adminController.deleteUser);

router.get('/stats', adminController.getGlobalStats);
router.get('/activities', adminController.getGlobalActivities);

router.get('/config', adminController.getGlobalConfig);
router.put('/config', adminController.updateGlobalConfig);

module.exports = router;
