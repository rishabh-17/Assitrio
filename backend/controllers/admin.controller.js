const User = require('../models/User');
const Note = require('../models/Note');
const Activity = require('../models/Activity');
const Transaction = require('../models/Transaction');
const Config = require('../models/Config');
const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const notes = await Note.find({ userId }).sort({ createdAt: -1 });
    const activities = await Activity.find({ userId }).sort({ createdAt: -1 }).limit(50);
    
    res.json({
      user,
      notes,
      activities
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUserPlan = async (req, res) => {
  try {
    const { userId, plan } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { plan } },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndDelete(userId);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { username, password, role, plan, displayName, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
        username,
        password: hashedPassword,
        role: role || 'user',
        plan: plan || 'Free',
        displayName,
        email
    });
    await newUser.save();
    const userJson = newUser.toObject();
    delete userJson.password;
    res.status(201).json(userJson);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId, ...updates } = req.body;
    if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
    }
    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGlobalStats = async (req, res) => {
  try {
    const [totalUsers, totalTransactions, totalNotes, users, capturedTransactions] = await Promise.all([
      User.countDocuments(),
      Transaction.countDocuments(),
      Note.countDocuments(),
      User.find(),
      Transaction.find({ status: 'captured' })
    ]);

    const totalListenSec = users.reduce((acc, u) => acc + (u.usage?.listenSeconds || 0), 0);
    const totalTalkSec = users.reduce((acc, u) => acc + (u.usage?.talkSeconds || 0), 0);
    const totalRevenue = capturedTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    
    res.json({
      totalUsers,
      totalTransactions,
      totalNotes,
      totalRevenue,
      totalMinutesUsed: Math.round((totalListenSec + totalTalkSec) / 60),
      planDistribution: {
        Free: users.filter(u => u.plan === 'Free').length,
        Pro: users.filter(u => u.plan === 'Pro').length,
        Premium: users.filter(u => u.plan === 'Premium').length,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGlobalActivities = async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate('userId', 'username displayName profilePhoto email')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGlobalConfig = async (req, res) => {
    try {
        let config = await Config.findOne({ key: 'global' });
        if (!config) {
            config = new Config({
                key: 'global',
                plans: [
                    { name: 'Free', monthlyLimit: 60, aiModel: 'gpt-4o', realtimeModel: 'gpt-realtime-1.5', price: 0 },
                    { name: 'Pro', monthlyLimit: 500, aiModel: 'gpt-4o', realtimeModel: 'gpt-realtime-1.5', price: 999 },
                    { name: 'Premium', monthlyLimit: 9999, aiModel: 'gpt-4o', realtimeModel: 'gpt-realtime-1.5', price: 2999 }
                ]
            });
            await config.save();
        }
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateGlobalConfig = async (req, res) => {
    try {
        const { plans, systemMaintenance } = req.body;
        const config = await Config.findOneAndUpdate(
            { key: 'global' },
            { $set: { plans, systemMaintenance, updatedAt: Date.now() } },
            { new: true, upsert: true }
        );
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
