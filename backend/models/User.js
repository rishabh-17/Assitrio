const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String },
  displayName: { type: String },
  email: { type: String },
  mobile: { type: String },
  profilePhoto: { type: String },
  plan: { type: String, default: 'Free' },
  googleSub: { type: String },
  usage: {
    listenSeconds: { type: Number, default: 0 },
    talkSeconds: { type: Number, default: 0 },
    listenSessions: { type: Number, default: 0 },
    talkSessions: { type: Number, default: 0 },
    notesCreated: { type: Number, default: 0 },
    tasksExtracted: { type: Number, default: 0 },
    periodKey: { type: String, default: '' }
  },
  googleToken: { type: Object },
  msToken: { type: Object },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
