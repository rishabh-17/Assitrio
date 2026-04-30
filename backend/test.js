const Razorpay = require('razorpay');
const instance = new Razorpay({
  key_id: "rzp_test_SjdB",
  key_secret: "pdeyB5RI4PP0u2TW3U1zF7XL",
});
instance.orders.create({ amount: 100, currency: "INR" })
  .then(order => console.log('Success:', order))
  .catch(err => console.log('Error:', err.message || err));
