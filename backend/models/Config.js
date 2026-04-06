const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Free, Pro, Premium
  monthlyLimit: { type: Number, required: true }, // in minutes
  aiModel: { type: String, required: true }, // gpt-4o, gpt-3.5-turbo, etc.
  realtimeModel: { type: String, required: true }, // gpt-realtime-1.5
  price: { type: Number, required: true },
  features: [String]
});

const configSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global' },
  plans: [planSchema],
  systemMaintenance: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Config', configSchema);
