const mongoose = require('mongoose');
const Team = require('../models/Team');
const TeamInvite = require('../models/TeamInvite');
const User = require('../models/User');

function normalizeIdentifier(raw) {
  if (!raw) return '';
  return String(raw).trim();
}

async function findTeamForUser(userId) {
  const uid = userId.toString();
  return Team.findOne({
    $or: [
      { ownerId: uid },
      { members: { $elemMatch: { userId: uid } } }
    ]
  });
}

function isMember(team, userId) {
  const uid = userId.toString();
  if (!team) return false;
  if (team.ownerId?.toString?.() === uid) return true;
  return Array.isArray(team.members) && team.members.some(m => m.userId?.toString?.() === uid);
}

function isOwner(team, userId) {
  const uid = userId.toString();
  return team?.ownerId?.toString?.() === uid;
}

async function hydrateTeam(team) {
  if (!team) return null;
  const memberIds = new Set();
  memberIds.add(team.ownerId.toString());
  for (const m of (team.members || [])) {
    if (m?.userId) memberIds.add(m.userId.toString());
  }
  const users = await User.find({ _id: { $in: [...memberIds].map((id) => new mongoose.Types.ObjectId(id)) } })
    .select('_id username displayName email role plan');

  const byId = new Map(users.map(u => [u._id.toString(), u]));
  const ownerUser = byId.get(team.ownerId.toString());

  const members = [];
  if (ownerUser) {
    members.push({
      userId: ownerUser._id,
      username: ownerUser.username,
      displayName: ownerUser.displayName,
      email: ownerUser.email,
      teamRole: 'owner'
    });
  }
  for (const m of (team.members || [])) {
    const u = byId.get(m.userId.toString());
    if (!u) continue;
    if (u._id.toString() === team.ownerId.toString()) continue;
    members.push({
      userId: u._id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      teamRole: m.role || 'member'
    });
  }

  return {
    id: team._id,
    name: team.name,
    ownerId: team.ownerId,
    createdAt: team.createdAt,
    members
  };
}

exports.createTeam = async (req, res) => {
  try {
    const requester = await User.findById(req.user.id).select('_id accountType');
    if (!requester || requester.accountType !== 'team') {
      res.status(403).json({ error: 'Only team accounts can create teams' });
      return;
    }

    const name = normalizeIdentifier(req.body?.name) || 'My Team';
    const existing = await Team.findOne({ ownerId: req.user.id });
    if (existing) {
      const hydrated = await hydrateTeam(existing);
      res.json({ team: hydrated });
      return;
    }

    const team = new Team({
      name,
      ownerId: req.user.id,
      members: [{ userId: req.user.id, role: 'owner' }]
    });
    await team.save();
    const hydrated = await hydrateTeam(team);
    res.status(201).json({ team: hydrated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyTeam = async (req, res) => {
  try {
    const team = await findTeamForUser(req.user.id);
    if (!team) {
      res.json({ team: null });
      return;
    }
    const hydrated = await hydrateTeam(team);
    res.json({ team: hydrated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.inviteToTeam = async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const identifier = normalizeIdentifier(req.body?.identifier);
    if (!identifier) {
      res.status(400).json({ error: 'Missing identifier' });
      return;
    }

    const requester = await User.findById(req.user.id).select('_id accountType');
    if (!requester || requester.accountType !== 'team') {
      res.status(403).json({ error: 'Only team accounts can invite members' });
      return;
    }

    const team = await Team.findById(teamId);
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    if (!isOwner(team, req.user.id)) {
      res.status(403).json({ error: 'Only team owner can invite members' });
      return;
    }

    const user = await User.findOne({
      $or: [
        { username: identifier },
        { email: identifier }
      ]
    }).select('_id username displayName email');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (isMember(team, user._id)) {
      res.status(400).json({ error: 'User is already a team member' });
      return;
    }

    const existingInvite = await TeamInvite.findOne({
      teamId: team._id,
      inviteeUserId: user._id,
      status: 'pending'
    });
    if (existingInvite) {
      res.status(200).json({ invite: existingInvite });
      return;
    }

    const invite = new TeamInvite({
      teamId: team._id,
      inviterUserId: req.user.id,
      inviteeUserId: user._id,
      status: 'pending'
    });
    await invite.save();
    res.status(201).json({
      invite: {
        id: invite._id,
        teamId: invite.teamId,
        inviteeUserId: invite.inviteeUserId,
        status: invite.status,
        createdAt: invite.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyInvitations = async (req, res) => {
  try {
    const invites = await TeamInvite.find({ inviteeUserId: req.user.id, status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(50);

    const teamIds = [...new Set(invites.map(i => i.teamId.toString()))].map((id) => new mongoose.Types.ObjectId(id));
    const inviterIds = [...new Set(invites.map(i => i.inviterUserId.toString()))].map((id) => new mongoose.Types.ObjectId(id));

    const [teams, inviters] = await Promise.all([
      Team.find({ _id: { $in: teamIds } }).select('_id name ownerId'),
      User.find({ _id: { $in: inviterIds } }).select('_id username displayName email')
    ]);

    const teamById = new Map(teams.map(t => [t._id.toString(), t]));
    const inviterById = new Map(inviters.map(u => [u._id.toString(), u]));

    res.json({
      invitations: invites.map(i => {
        const t = teamById.get(i.teamId.toString());
        const inv = inviterById.get(i.inviterUserId.toString());
        return {
          id: i._id,
          team: t ? { id: t._id, name: t.name, ownerId: t.ownerId } : { id: i.teamId, name: 'Team' },
          inviter: inv ? { id: inv._id, username: inv.username, displayName: inv.displayName, email: inv.email } : null,
          status: i.status,
          createdAt: i.createdAt
        };
      })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.acceptInvitation = async (req, res) => {
  try {
    const inviteId = req.params.inviteId;
    const invite = await TeamInvite.findOne({ _id: inviteId, inviteeUserId: req.user.id, status: 'pending' });
    if (!invite) {
      res.status(404).json({ error: 'Invitation not found' });
      return;
    }

    const team = await Team.findById(invite.teamId);
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    if (!isMember(team, req.user.id)) {
      team.members = Array.isArray(team.members) ? team.members : [];
      team.members.push({ userId: req.user.id, role: 'member' });
      await team.save();
    }

    await User.updateOne({ _id: req.user.id }, { $set: { memberTeamId: team._id } }).catch(() => { });

    invite.status = 'accepted';
    invite.respondedAt = new Date();
    await invite.save();

    const hydrated = await hydrateTeam(team);
    res.json({ success: true, team: hydrated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectInvitation = async (req, res) => {
  try {
    const inviteId = req.params.inviteId;
    const invite = await TeamInvite.findOne({ _id: inviteId, inviteeUserId: req.user.id, status: 'pending' });
    if (!invite) {
      res.status(404).json({ error: 'Invitation not found' });
      return;
    }
    invite.status = 'rejected';
    invite.respondedAt = new Date();
    await invite.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
