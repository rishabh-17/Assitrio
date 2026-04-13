const User = require('../models/User');
const Team = require('../models/Team');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function normalizeString(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function normalizeAccountType(v) {
  const s = normalizeString(v).toLowerCase();
  return s === 'team' ? 'team' : 'personal';
}

function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role,
      accountType: user.accountType,
      ownedTeamId: user.ownedTeamId || null,
      memberTeamId: user.memberTeamId || null
    },
    process.env.JWT_SECRET || 'your_jwt_secret'
  );
}

exports.signup = async (req, res) => {
  try {
    const { username, password, displayName, accountType, teamName } = req.body;
    const normalizedAccountType = normalizeAccountType(accountType);

    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ error: 'Username already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username,
      password: hashedPassword,
      displayName: displayName || username,
      plan: 'Free',
      accountType: normalizedAccountType
    });

    await user.save();

    let createdTeamId = null;
    if (normalizedAccountType === 'team') {
      const tn = normalizeString(teamName) || `${user.displayName || user.username}'s Team`;
      const team = new Team({
        name: tn,
        ownerId: user._id,
        members: [{ userId: user._id, role: 'owner' }]
      });
      await team.save();
      user.ownedTeamId = team._id;
      user.memberTeamId = team._id;
      await user.save();
      createdTeamId = team._id;
    }

    const token = signToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        plan: user.plan,
        role: user.role,
        accountType: user.accountType,
        ownedTeamId: user.ownedTeamId || null,
        memberTeamId: user.memberTeamId || null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        mobile: user.mobile,
        profilePhoto: user.profilePhoto,
        plan: user.plan,
        role: user.role,
        accountType: user.accountType,
        ownedTeamId: user.ownedTeamId || null,
        memberTeamId: user.memberTeamId || null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { email, name, picture, sub } = req.body;

    let user = await User.findOne({ $or: [{ email }, { googleSub: sub }] });

    if (user) {
      user.email = email;
      user.displayName = name;
      user.profilePhoto = picture || user.profilePhoto;
      user.googleSub = sub;
      await user.save();
    } else {
      user = new User({
        username: email.split('@')[0],
        displayName: name,
        email,
        profilePhoto: picture || '',
        googleSub: sub,
        plan: 'Free'
      });
      await user.save();
    }

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        profilePhoto: user.profilePhoto,
        plan: user.plan,
        role: user.role,
        accountType: user.accountType,
        ownedTeamId: user.ownedTeamId || null,
        memberTeamId: user.memberTeamId || null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.convertToTeam = async (req, res) => {
  try {
    const teamName = normalizeString(req.body?.teamName);
    if (!teamName) return res.status(400).json({ error: 'Please enter a team name' });

    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.accountType === 'team' && user.ownedTeamId) {
      return res.status(400).json({ error: 'Account is already a team account' });
    }

    const oldTeamId = user.memberTeamId ? String(user.memberTeamId) : null;

    const team = new Team({
      name: teamName,
      ownerId: user._id,
      members: [{ userId: user._id, role: 'owner' }]
    });
    await team.save();

    if (oldTeamId && String(team._id) !== oldTeamId) {
      try {
        await Team.updateOne({ _id: oldTeamId }, { $pull: { members: { userId: user._id } } });
      } catch (e) {
      }
    }

    user.accountType = 'team';
    user.ownedTeamId = team._id;
    user.memberTeamId = team._id;
    await user.save();

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        mobile: user.mobile,
        profilePhoto: user.profilePhoto,
        plan: user.plan,
        role: user.role,
        accountType: user.accountType,
        ownedTeamId: user.ownedTeamId || null,
        memberTeamId: user.memberTeamId || null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
