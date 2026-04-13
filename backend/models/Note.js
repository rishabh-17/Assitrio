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

const taskSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  text: { type: String, required: true },
  done: { type: Boolean, default: false },
  date: { type: String },
  priority: { type: String, default: 'Normal' },
  assignee: { type: String },
  assigneeUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
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
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assigneeUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdAtIST: { type: String, default: () => istIsoFromDate(new Date()) },
  updatedAtIST: { type: String, default: () => istIsoFromDate(new Date()) }
});

noteSchema.pre('save', function () {
  try {
    const now = new Date();
    if (!this.createdAt) this.createdAt = now;
    if (!this.createdAtIST) this.createdAtIST = istIsoFromDate(this.createdAt);
    this.updatedAt = now;
    this.updatedAtIST = istIsoFromDate(now);
  } catch (e) {
  }
});

module.exports = mongoose.model('Note', noteSchema);
