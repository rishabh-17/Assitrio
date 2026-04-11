const Activity = require('../models/Activity');

/**
 * Map icon → structured type for backend consistency
 */
function iconToType(icon) {
  const map = { mic: 'recording', task: 'task', calendar: 'schedule', shield: 'ai', archive: 'delete', note: 'note' };
  return map[icon] || icon || 'note';
}

/**
 * GET /api/activities
 * Supports: ?limit=N &skip=N &type=recording|task|... &from=ISO &to=ISO &q=search
 */
exports.getActivities = async (req, res) => {
  try {
    const { limit = 500, skip = 0, type, from, to, q } = req.query;

    const filter = { userId: req.user.id };

    if (type) filter.type = type;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [{ title: regex }, { sub: regex }];
    }

    const activities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Math.min(Number(limit), 500));

    // Return plain array so the frontend doesn't need special unwrapping
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/activities/stats
 * Returns per-type counts, daily totals for last 30 days, and quick summary
 */
exports.getActivityStats = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const userId = new mongoose.Types.ObjectId(req.user.id.toString());
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [typeCounts, dailyCounts, total] = await Promise.all([
      // Count per type
      Activity.aggregate([
        { $match: { userId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      // Daily counts last 30 days
      Activity.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Activity.countDocuments({ userId: req.user.id })
    ]);

    const typeMap = {};
    typeCounts.forEach(t => { typeMap[t._id] = t.count; });

    res.json({
      total,
      byType: typeMap,
      recordings: typeMap.recording || 0,
      tasks: typeMap.task || 0,
      schedules: typeMap.schedule || 0,
      dailyLast30: dailyCounts.map(d => ({ date: d._id, count: d.count }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/activities
 */
exports.createActivity = async (req, res) => {
  try {
    const data = req.body;
    const activity = new Activity({
      ...data,
      userId: req.user.id,
      id: data.id || Date.now(),
      type: data.type || iconToType(data.icon),
    });
    await activity.save();
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/activities/bulk
 */
exports.createManyActivities = async (req, res) => {
  try {
    const activitiesData = req.body.map(a => ({
      ...a,
      userId: req.user.id,
      id: a.id || Date.now() + Math.random(),
      type: a.type || iconToType(a.icon),
    }));
    const activities = await Activity.insertMany(activitiesData);
    res.status(201).json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/activities
 * Optionally scoped: ?type=recording clears only that type
 */
exports.clearAllActivities = async (req, res) => {
  try {
    const filter = { userId: req.user.id };
    if (req.query.type) filter.type = req.query.type;
    const result = await Activity.deleteMany(filter);
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
