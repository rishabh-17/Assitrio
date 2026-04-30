require('dotenv').config({ path: './.env' });
const Razorpay = require('razorpay');

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

instance.orders.create({ amount: 100, currency: "INR" })
  .then(order => console.log('Order created:', order.id))
  .catch(err => console.error('Error:', err.message || err));
