const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id: { type: Number },
  // Human-readable log fields
  time: { type: String },
  title: { type: String, required: true },
  sub: { type: String },
  // Icon/type for display: 'mic' | 'task' | 'calendar' | 'shield' | 'archive' | 'note'
  icon: { type: String, default: 'note' },
  // Structured type for filtering: 'recording' | 'task' | 'note' | 'schedule' | 'delete' | 'restore' | 'ai'
  type: { type: String, default: 'note' },
  // Optional link back to a note
  noteId: { type: Number },
  // Arbitrary metadata (source, duration, taskCount, etc.)
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

// Compound index: efficient per-user time-sorted queries
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
