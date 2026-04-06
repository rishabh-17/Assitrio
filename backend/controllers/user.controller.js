const User = require('../models/User');
const Config = require('../models/Config');

exports.getUsage = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('usage plan');
    res.json({
      usage: user.usage,
      plan: user.plan
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUsage = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { usage: req.body } },
      { new: true }
    );
    res.json(user.usage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: req.body },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.getCalendarTokens = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('googleToken msToken');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.updateCalendarToken = async (req, res) => {
    try {
        const { provider, tokenData } = req.body;
        const field = provider === 'google' ? 'googleToken' : 'msToken';
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { [field]: tokenData } },
            { new: true }
        );
        res.json({ success: true, [field]: user[field] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.exportData = async (req, res) => {
    try {
        const Note = require('../models/Note');
        const Activity = require('../models/Activity');
        
        const [notes, activities, user] = await Promise.all([
            Note.find({ userId: req.user.id }),
            Activity.find({ userId: req.user.id }),
            User.findById(req.user.id).select('-password')
        ]);

        res.json({
            exportDate: new Date().toISOString(),
            profile: user,
            notes,
            activities
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteAllData = async (req, res) => {
    try {
        const Note = require('../models/Note');
        const Activity = require('../models/Activity');
        
        await Promise.all([
            Note.deleteMany({ userId: req.user.id }),
            Activity.deleteMany({ userId: req.user.id })
        ]);

        res.json({ success: true, message: 'All personal data has been erased.' });
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
