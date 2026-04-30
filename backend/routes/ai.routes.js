const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { checkUsageLimit } = require('../middleware/usage.middleware');
const multer = require('multer');
const upload = multer();

// AI endpoints are auth-gated to prevent API key leakage
router.post('/azure-openai', authMiddleware, checkUsageLimit, aiController.getChatResponse);
router.post('/azure-realtime', authMiddleware, checkUsageLimit, aiController.getRealtimeResponse);
router.post('/azure-stt', authMiddleware, checkUsageLimit, upload.single('audio'), aiController.processSTT);
router.post('/livekit/token', authMiddleware, checkUsageLimit, aiController.getLivekitToken);

// Context endpoint: returns user's full notes + tasks from MongoDB for chatbot
router.get('/chat-context', authMiddleware, aiController.getChatContext);

module.exports = router;
