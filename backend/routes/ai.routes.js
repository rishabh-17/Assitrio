const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth.middleware');
const multer = require('multer');
const upload = multer();

router.post('/azure-openai', aiController.getChatResponse);
router.post('/azure-realtime', aiController.getRealtimeResponse);
router.post('/azure-stt', upload.single('audio'), aiController.processSTT);
router.post('/livekit/token', authMiddleware, aiController.getLivekitToken);

module.exports = router;
