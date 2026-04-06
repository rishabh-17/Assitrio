const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YourKeyHere',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YourSecretHere',
});

const PLAN_PRICES = {
    Free: 0,
    Pro: 99900,         // Rs. 999.00 in paise
    Premium: 199900     // Rs. 1999.00 in paise
};

exports.createOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    const amount = PLAN_PRICES[plan];
    if (!amount) return res.status(400).json({ error: 'Invalid plan or amount' });

    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}_${req.user.id.slice(-4)}`
    };

    const order = await instance.orders.create(options);

    // Initial transaction log
    await Transaction.create({
      userId: req.user.id,
      razorpayOrderId: order.id,
      amount: amount / 100,
      plan: plan,
      status: 'created'
    });

    res.json({
        id: order.id,
        currency: order.currency,
        amount: order.amount,
        plan: plan
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'YourSecretHere')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Payment is successful
      await Transaction.findOneAndUpdate(
          { razorpayOrderId: razorpay_order_id },
          { razorpayPaymentId: razorpay_payment_id, status: 'captured' }
      );

      // Upgrade user plan
      await User.findByIdAndUpdate(req.user.id, { plan: plan });

      res.json({ success: true, message: 'Payment verified successfully and plan updated' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserPayments = async (req, res) => {
    try {
        const history = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAdminPayments = async (req, res) => {
    try {
        const history = await Transaction.find().populate('userId', 'username displayName').sort({ createdAt: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
