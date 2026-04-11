const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// Get activity log (supports ?limit, ?skip, ?type, ?from, ?to, ?q)
router.get('/', activityController.getActivities);
// Get stats breakdown (per type + daily last 30 days)
router.get('/stats', activityController.getActivityStats);
// Create a single activity log entry
router.post('/', activityController.createActivity);
// Bulk create activity entries
router.post('/bulk', activityController.createManyActivities);
// Clear activities (optionally scoped: ?type=recording)
router.delete('/', activityController.clearAllActivities);

module.exports = router;
