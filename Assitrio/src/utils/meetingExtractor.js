/**
 * Meeting Extractor — AI-powered extraction of meeting details from transcription text.
 * Also includes a regex-based fallback for when AI is unavailable.
 */
import { getAIResponse } from '../services/azureAI';

const MEETING_EXTRACT_PROMPT = `You are a meeting scheduler AI. Analyze this conversation transcript and extract any meeting/appointment that was scheduled or discussed. Respond ONLY in this exact JSON format (no other text):

{
  "hasMeeting": true/false,
  "meetings": [
    {
      "title": "Short title for the meeting (e.g. 'Budget Review with Rahul')",
      "date": "YYYY-MM-DD format (resolve relative dates like 'tomorrow', 'next Monday' based on today being TODAY_DATE)",
      "startTime": "HH:MM in 24h format",
      "endTime": "HH:MM in 24h format (if not mentioned, add 30 min to startTime)",
      "attendees": ["email@example.com"],
      "description": "Brief description of what the meeting is about"
    }
  ]
}

RULES:
- hasMeeting should be true ONLY if the conversation explicitly mentions scheduling/booking/setting up a meeting, call, appointment, or discussion at a specific date/time
- If someone just mentions "we should meet sometime" without a concrete date, hasMeeting should be false
- Resolve relative dates: "tomorrow" = TOMORROW_DATE, "next Monday" = NEXT_MONDAY_DATE, "this Friday" = THIS_FRIDAY_DATE, etc.
- If end time is not mentioned, assume 30 minutes after start time
- attendees should only include email addresses if explicitly mentioned; otherwise use an empty array
- If no meeting is found, return: {"hasMeeting": false, "meetings": []}

Today's date is: TODAY_DATE
Current time is: CURRENT_TIME

Transcript:
`;

/**
 * Helper to resolve relative date tokens in the prompt.
 */
function buildPromptWithDates(transcript) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Next Monday
  const nextMonday = new Date(now);
  nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));

  // This Friday
  const thisFriday = new Date(now);
  thisFriday.setDate(thisFriday.getDate() + ((5 + 7 - thisFriday.getDay()) % 7 || 7));

  const fmt = (d) => d.toISOString().split('T')[0];
  const timeFmt = () => now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return MEETING_EXTRACT_PROMPT
    .replaceAll('TODAY_DATE', fmt(now))
    .replaceAll('TOMORROW_DATE', fmt(tomorrow))
    .replaceAll('NEXT_MONDAY_DATE', fmt(nextMonday))
    .replaceAll('THIS_FRIDAY_DATE', fmt(thisFriday))
    .replaceAll('CURRENT_TIME', timeFmt())
    + transcript;
}

/**
 * Extract meeting details from a transcript using AI.
 *
 * @param {string} transcript - The conversation transcript
 * @returns {Promise<{ hasMeeting: boolean, meetings: object[] }>}
 */
export async function extractMeetingDetails(transcript) {
  if (!transcript || transcript.trim().length < 20) {
    return { hasMeeting: false, meetings: [] };
  }

  // Truncate very long transcripts
  const maxLen = 8000;
  const input = transcript.length > maxLen
    ? transcript.slice(0, maxLen) + '\n[…truncated]'
    : transcript;

  try {
    const aiResult = await getAIResponse(buildPromptWithDates(input), [], true);

    if (aiResult && aiResult.length > 10) {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.hasMeeting && Array.isArray(parsed.meetings) && parsed.meetings.length > 0) {
          // Validate and normalize each meeting
          const meetings = parsed.meetings.map((m) => normalizeMeeting(m)).filter(Boolean);
          return { hasMeeting: meetings.length > 0, meetings };
        }

        return { hasMeeting: false, meetings: [] };
      }
    }
  } catch (err) {
    console.warn('AI meeting extraction failed, trying regex fallback:', err);
  }

  // Fallback: simple regex detection
  return regexFallbackExtract(transcript);
}

/**
 * Normalize and validate a meeting object.
 * Ensures ISO date-time format for start/end.
 */
function normalizeMeeting(m) {
  if (!m || !m.title || !m.date) return null;

  try {
    const date = m.date; // Expected YYYY-MM-DD
    const startTime = m.startTime || '10:00';
    const endTimeParsed = m.endTime || addMinutes(startTime, 30);

    // Build ISO strings
    const startISO = `${date}T${startTime}:00`;
    const endISO = `${date}T${endTimeParsed}:00`;

    // Validate dates are parseable
    if (isNaN(new Date(startISO).getTime())) return null;

    return {
      title: m.title,
      description: m.description || '',
      startTime: startISO,
      endTime: endISO,
      attendees: Array.isArray(m.attendees) ? m.attendees.filter((e) => typeof e === 'string' && e.includes('@')) : [],
    };
  } catch {
    return null;
  }
}

/**
 * Add minutes to a time string (HH:MM).
 */
function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMin = h * 60 + m + minutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/* ──────────────────────────────────────────
   Regex fallback — detects simple patterns
   ────────────────────────────────────────── */

const TIME_RE = /\b(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm|AM|PM)?\b/;
const DATE_WORDS = /\b(tomorrow|day after tomorrow|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i;
const DATE_EXPLICIT_RE = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/;

function regexFallbackExtract(transcript) {
  const text = transcript.toLowerCase();

  // Must contain scheduling language
  const hasScheduleLang = /\b(schedule|meeting|appointment|book|set up|catch up|let'?s meet|call at|meet at|meeting at)\b/i.test(text);
  if (!hasScheduleLang) return { hasMeeting: false, meetings: [] };

  // Must contain a time reference
  const timeMatch = text.match(TIME_RE);
  if (!timeMatch) return { hasMeeting: false, meetings: [] };

  // Parse basic time
  let hours = parseInt(timeMatch[1], 10);
  const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  const ampm = timeMatch[3]?.toLowerCase();
  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  const startTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  const endTime = addMinutes(startTime, 30);

  // Parse date
  let date;
  const dateWordMatch = text.match(DATE_WORDS);
  const dateExplicitMatch = text.match(DATE_EXPLICIT_RE);

  if (dateWordMatch) {
    date = resolveRelativeDate(dateWordMatch[1]);
  } else if (dateExplicitMatch) {
    const month = parseInt(dateExplicitMatch[1], 10);
    const day = parseInt(dateExplicitMatch[2], 10);
    const year = dateExplicitMatch[3] ? parseInt(dateExplicitMatch[3], 10) : new Date().getFullYear();
    const fullYear = year < 100 ? 2000 + year : year;
    date = `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  } else {
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    date = tomorrow.toISOString().split('T')[0];
  }

  return {
    hasMeeting: true,
    meetings: [
      {
        title: 'Meeting (auto-detected)',
        description: 'Auto-detected from conversation by Assistrio.',
        startTime: `${date}T${startTime}:00`,
        endTime: `${date}T${endTime}:00`,
        attendees: [],
      },
    ],
  };
}

function resolveRelativeDate(word) {
  const now = new Date();
  const lower = word.toLowerCase().trim();

  if (lower === 'tomorrow') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  if (lower === 'day after tomorrow') {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const match = lower.match(/(next|this)\s+(\w+)/);
  if (match) {
    const prefix = match[1];
    const dayName = match[2];
    const targetDay = dayNames.indexOf(dayName);
    if (targetDay >= 0) {
      const d = new Date(now);
      const currentDay = d.getDay();
      let diff = (targetDay - currentDay + 7) % 7;
      if (diff === 0) diff = 7;
      if (prefix === 'next') diff += 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split('T')[0];
    }
  }

  // Fallback: tomorrow
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
