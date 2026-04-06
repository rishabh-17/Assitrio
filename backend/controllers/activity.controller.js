const Activity = require('../models/Activity');

exports.getActivities = async (req, res) => {
  try {
    const activities = await Activity.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createActivity = async (req, res) => {
  try {
    const activity = new Activity({
      ...req.body,
      userId: req.user.id,
      id: Date.now()
    });
    await activity.save();
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createManyActivities = async (req, res) => {
  try {
    const activitiesData = req.body.map(a => ({
      ...a,
      userId: req.user.id,
      id: a.id || Date.now() + Math.random()
    }));
    const activities = await Activity.insertMany(activitiesData);
    res.status(201).json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
