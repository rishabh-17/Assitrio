import { userService } from './apiService';

const USAGE_KEY = 'assistrio-usage-v2';
const CONFIG_KEY = 'assistrio-global-config';

const DEFAULT_USAGE = {
  listenSeconds: 0,
  talkSeconds: 0,
  listenSessions: 0,
  talkSessions: 0,
  notesCreated: 0,
  tasksExtracted: 0,
  periodKey: '',
};

/** Default tier limits - will be overwritten by dynamic config */
export let PLAN_LIMITS = {
  Free: {
    monthlyMinutes: 60,
    maxNotes: 50,
    name: 'Free',
  },
  Pro: {
    monthlyMinutes: 500,
    maxNotes: 500,
    name: 'Pro',
  },
  Premium: {
    monthlyMinutes: 9999,
    maxNotes: 9999,
    name: 'Premium',
  },
};

// Sync limits from localized storage if exists
try {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.plans) {
            config.plans.forEach(p => {
                PLAN_LIMITS[p.name] = {
                    monthlyMinutes: p.monthlyLimit,
                    maxNotes: p.name === 'Free' ? 50 : 9999,
                    name: p.name
                };
            });
        }
    }
} catch (e) {}

export async function syncGlobalConfig() {
    try {
        const config = await userService.getConfig();
        if (config && config.plans) {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
            config.plans.forEach(p => {
                PLAN_LIMITS[p.name] = {
                    monthlyMinutes: p.monthlyLimit,
                    maxNotes: p.name === 'Free' ? 50 : 9999,
                    name: p.name
                };
            });
            return config;
        }
    } catch (err) {
        console.warn('Failed to sync global config:', err);
    }
    return null;
}

function getCurrentPeriodKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getUsage() {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    const usage = raw ? JSON.parse(raw) : { ...DEFAULT_USAGE };
    const currentPeriod = getCurrentPeriodKey();

    if (usage.periodKey !== currentPeriod) {
      usage.listenSeconds = 0;
      usage.talkSeconds = 0;
      usage.listenSessions = 0;
      usage.talkSessions = 0;
      usage.notesCreated = 0;
      usage.tasksExtracted = 0;
      usage.periodKey = currentPeriod;
      saveUsage(usage);
    }

    return usage;
  } catch {
    return { ...DEFAULT_USAGE, periodKey: getCurrentPeriodKey() };
  }
}

function saveUsage(usage) {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch (e) {
    console.warn('Failed to save usage:', e);
  }
}

export function setUsage(newUsage) {
  if (!newUsage) return;
  saveUsage(newUsage);
  return newUsage;
}

export async function pushUsage() {
  const usage = getUsage();
  try {
    const backendUsage = await userService.updateUsage(usage);
    if (backendUsage) {
      saveUsage(backendUsage);
    }
  } catch (err) {
    console.warn('Silent usage sync failed:', err);
  }
}

export function recordListenUsage(durationSeconds) {
  const usage = getUsage();
  usage.listenSeconds += Math.max(0, durationSeconds);
  usage.listenSessions += 1;
  saveUsage(usage);
  pushUsage();
  return usage;
}

export function recordTalkUsage(durationSeconds) {
  const usage = getUsage();
  usage.talkSeconds += Math.max(0, durationSeconds);
  usage.talkSessions += 1;
  saveUsage(usage);
  pushUsage();
  return usage;
}

export function recordNoteCreated() {
  const usage = getUsage();
  usage.notesCreated += 1;
  saveUsage(usage);
  return usage;
}

export function recordTasksExtracted(count = 1) {
  const usage = getUsage();
  usage.tasksExtracted += Math.max(0, count);
  saveUsage(usage);
  return usage;
}

export function getUsageStats(plan = 'Free') {
  const usage = getUsage();
  // Ensure we match case and default correctly
  const normalizedPlan = plan === 'free' ? 'Free' : plan;
  const limits = PLAN_LIMITS[normalizedPlan] || PLAN_LIMITS.Free;

  const totalSeconds = usage.listenSeconds + usage.talkSeconds;
  const totalMinutes = Math.round(totalSeconds / 60);
  const listenMinutes = Math.round(usage.listenSeconds / 60);
  const talkMinutes = Math.round(usage.talkSeconds / 60);

  const minutesUsed = totalMinutes;
  const minutesLimit = limits.monthlyMinutes;
  const minutesRemaining = Math.max(0, minutesLimit - minutesUsed);
  const usagePercent = minutesLimit === Infinity || minutesLimit >= 9000 ? 0 : Math.min(100, Math.round((minutesUsed / minutesLimit) * 100));

  return {
    listenMinutes,
    talkMinutes,
    totalMinutes: minutesUsed,
    minutesLimit,
    minutesRemaining,
    usagePercent,
    listenSessions: usage.listenSessions,
    talkSessions: usage.talkSessions,
    totalSessions: usage.listenSessions + usage.talkSessions,
    notesCreated: usage.notesCreated,
    tasksExtracted: usage.tasksExtracted,
    planName: limits.name,
    isOverLimit: minutesUsed >= minutesLimit,
    periodKey: usage.periodKey,
  };
}
