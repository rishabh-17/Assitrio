const User = require('../models/User');
const Config = require('../models/Config');

const checkUsageLimit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('usage plan');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let config = await Config.findOne({ key: 'global' });
    if (!config) {
      // Fallback if config is missing
      config = {
        plans: [
          { name: 'Free', monthlyLimit: 60 },
          { name: 'Pro', monthlyLimit: 500 },
          { name: 'Premium', monthlyLimit: 9999 }
        ]
      };
    }

    const planConfig = config.plans.find(p => p.name === (user.plan || 'Free'));
    const limitMinutes = planConfig ? planConfig.monthlyLimit : 60;

    // Calculate total usage in minutes
    const listenSeconds = user.usage?.listenSeconds || 0;
    const talkSeconds = user.usage?.talkSeconds || 0;
    const totalUsageMinutes = (listenSeconds + talkSeconds) / 60;

    if (totalUsageMinutes >= limitMinutes) {
      return res.status(403).json({ 
        error: `You have reached the monthly usage limit for your ${user.plan || 'Free'} plan. Please upgrade your plan to continue.`,
        code: 'USAGE_LIMIT_EXCEEDED'
      });
    }

    next();
  } catch (err) {
    console.error('Error checking usage limit:', err);
    res.status(500).json({ error: 'Internal server error while checking usage limits' });
  }
};

module.exports = {
  checkUsageLimit
};
