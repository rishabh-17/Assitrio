const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', activityController.getActivities);
router.post('/', activityController.createActivity);
router.post('/bulk', activityController.createManyActivities);
router.delete('/', activityController.clearAllActivities);

module.exports = router;
