const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/convert-to-team', authMiddleware, authController.convertToTeam);

module.exports = router;
