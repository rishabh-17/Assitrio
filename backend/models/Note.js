const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  text: { type: String, required: true },
  done: { type: Boolean, default: false },
  date: { type: String },
  priority: { type: String, default: 'Normal' },
  assignee: { type: String }
});

const momSchema = new mongoose.Schema({
  title: { type: String },
  date: { type: String },
  participants: [String],
  agenda: [String],
  discussion: [String],
  decisions: [String],
  action_items: [String]
});

const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id: { type: Number, required: true }, // Logic ID for frontend sync
  title: { type: String, required: true },
  date: { type: String },
  time: { type: String },
  duration: { type: String },
  transcript: { type: String },
  summary: { type: String }, // Legacy, used for backward compat
  summaryShort: { type: String },
  summaryDetailed: { type: String },
  mom: { type: String }, // Plain text MOM
  detailedMom: momSchema,
  diarization: [String],
  tasks: [taskSchema],
  keywords: [String],
  sentiment: { type: String },
  callStatus: { type: String, default: 'completed' },
  audioUrl: { type: String },
  source: { type: String, enum: ['talk', 'listen'], default: 'listen' },
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Note', noteSchema);
