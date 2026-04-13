const mongoose = require('mongoose');

const IST_OFFSET_MINUTES = 330;

function istIsoFromDate(d) {
  const ms = (d instanceof Date ? d.getTime() : Date.now()) + IST_OFFSET_MINUTES * 60 * 1000;
  const ist = new Date(ms);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ist.getUTCDate()).padStart(2, '0');
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const mm = String(ist.getUTCMinutes()).padStart(2, '0');
  const ss = String(ist.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}+05:30`;
}

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
  createdAt: { type: Date, default: Date.now },
  createdAtIST: { type: String, default: () => istIsoFromDate(new Date()) }
});

// Compound index: efficient per-user time-sorted queries
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
