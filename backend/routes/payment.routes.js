const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const paymentController = require('../controllers/payment.controller');

router.use(authMiddleware);

router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);
router.get('/history', paymentController.getUserPayments);
router.get('/admin/history', adminMiddleware, paymentController.getAdminPayments);

module.exports = router;
