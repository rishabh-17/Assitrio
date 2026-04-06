/** User asked to capture / create a note (Talk text, Talk transcript, or Listen STT). */
export const CREATE_NOTE_PHRASE_RE =
  /(create|save|make)\s+(a\s+)?note|save\s+this\s+(as\s+a\s+)?note|note\s+this(\s+down)?|remember\s+this(\s+as\s+a\s+note)?|add\s+(a\s+)?note|write\s+(this\s+)?down\s+as\s+a\s+note/i;

export function userAskedToCreateNote(text) {
  if (!text || typeof text !== 'string') return false;
  return CREATE_NOTE_PHRASE_RE.test(text.trim());
}

/** User asked to create a task / todo / reminder from the conversation. */
export const CREATE_TASK_PHRASE_RE =
  /(create|add|make|set)\s+(a\s+)?task|add\s+(a\s+)?(to-?do|action\s+item)|remind\s+me\s+to|set\s+(a\s+)?reminder|make\s+(a\s+)?to-?do|add\s+this\s+(as\s+)?a\s+task/i;

export function userAskedToCreateTask(text) {
  if (!text || typeof text !== 'string') return false;
  return CREATE_TASK_PHRASE_RE.test(text.trim());
}

/**
 * User discussed scheduling a meeting / appointment / call.
 * This is broader than "create task" — it detects when the conversation mentions
 * scheduling, booking, or setting up a meeting at a specific date/time.
 */
export const SCHEDULE_MEETING_RE =
  /\b(schedule|book|set\s+up|arrange|plan|fix|confirm)\s+(a\s+)?(meeting|call|appointment|catch[\s-]?up|discussion|sync|huddle|standup|review|session)/i;

export const MEETING_TIME_INDICATOR_RE =
  /\b(at\s+\d{1,2}|tomorrow|next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|\d{1,2}\s*(am|pm)|let'?s\s+meet|meet\s+(me\s+)?at|meeting\s+at|call\s+at|catch\s+up\s+(on|at)|booked\s+for)\b/i;

/**
 * Detect if the transcript contains meeting scheduling intent.
 * Uses a two-pass approach:
 * 1. First checks for explicit scheduling language ("schedule a meeting")
 * 2. Then checks for time/date indicators alongside meeting-related words
 *
 * @param {string} text
 * @returns {boolean}
 */
export function userAskedToScheduleMeeting(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();

  // Pass 1: Explicit scheduling phrases
  if (SCHEDULE_MEETING_RE.test(t)) return true;

  // Pass 2: Meeting + time indicator combo
  const hasMeetingWord = /\b(meeting|appointment|call|sync|huddle|discussion|catch[\s-]?up)\b/i.test(t);
  const hasTimeIndicator = MEETING_TIME_INDICATOR_RE.test(t);

  return hasMeetingWord && hasTimeIndicator;
}
