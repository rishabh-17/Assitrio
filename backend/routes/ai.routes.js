const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const multer = require('multer');
const upload = multer();

router.post('/azure-openai', aiController.getChatResponse);
router.post('/azure-realtime', aiController.getRealtimeResponse);
router.post('/azure-stt', upload.single('audio'), aiController.processSTT);

module.exports = router;
