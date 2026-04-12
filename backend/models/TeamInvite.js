const mongoose = require('mongoose');

const teamInviteSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  inviterUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviteeUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'revoked'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  respondedAt: { type: Date }
});

teamInviteSchema.index({ inviteeUserId: 1, status: 1, createdAt: -1 });
teamInviteSchema.index({ teamId: 1, inviteeUserId: 1, status: 1 });

module.exports = mongoose.model('TeamInvite', teamInviteSchema);

