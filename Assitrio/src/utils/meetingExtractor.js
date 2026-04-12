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
      "date": "YYYY-MM-DD format (resolve relative dates like 'tomorrow', 'next Monday' based on today being TODAY_DATE_LOCAL)",
      "startTime": "HH:MM in 24h format (local time in USER_TIMEZONE)",
      "endTime": "HH:MM in 24h format (if not mentioned, add 30 min to startTime)",
      "timeZone": "IANA timezone string, must equal USER_TIMEZONE",
      "startISO": "RFC3339 timestamp including timezone offset, e.g. 2026-04-12T17:30:00+05:30",
      "endISO": "RFC3339 timestamp including timezone offset, e.g. 2026-04-12T18:00:00+05:30",
      "attendees": ["email@example.com"],
      "attendeeUserIds": ["<TEAM_MEMBER_ID>"],
      "description": "Brief description of what the meeting is about"
    }
  ]
}

RULES:
- hasMeeting should be true ONLY if the conversation explicitly mentions scheduling/booking/setting up a meeting, call, appointment, or discussion at a specific date/time
- If someone just mentions "we should meet sometime" without a concrete date, hasMeeting should be false
- Resolve relative dates using the user's local timezone: "tomorrow" = TOMORROW_DATE_LOCAL, "next Monday" = NEXT_MONDAY_DATE_LOCAL, "this Friday" = THIS_FRIDAY_DATE_LOCAL, etc.
- If the meeting is scheduled for "today" but the time has already passed, schedule it for the next valid future occurrence (usually tomorrow) unless the transcript explicitly indicates it already happened.
- Always include both: (date/startTime/endTime/timeZone) AND (startISO/endISO) to avoid timezone mistakes.
- If the transcript refers to a team member by name (e.g. "with Rahul" / "invite Rahul"), you MUST include that member in attendeeUserIds using the TEAM_MEMBERS directory. Also include their email in attendees if available.
- attendees should only include email addresses if explicitly mentioned OR if it comes from TEAM_MEMBERS (then it's allowed).
- If no meeting is found, return: {"hasMeeting": false, "meetings": []}

User timezone is: USER_TIMEZONE
Today's local date is: TODAY_DATE_LOCAL
Current local time is: CURRENT_TIME_LOCAL

TEAM_MEMBERS (use these ids/emails only when matching names mentioned in transcript):
TEAM_MEMBERS_BLOCK

Transcript:
`;

/**
 * Helper to resolve relative date tokens in the prompt.
 */
function buildPromptWithDates(transcript, teamMembers = []) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Next Monday
  const nextMonday = new Date(now);
  nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));

  // This Friday
  const thisFriday = new Date(now);
  thisFriday.setDate(thisFriday.getDate() + ((5 + 7 - thisFriday.getDay()) % 7 || 7));

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const localIsoDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const timeFmt = () => now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const teamBlock = Array.isArray(teamMembers) && teamMembers.length > 0
    ? teamMembers.map((m) => {
      const id = m?.userId || m?.id || '';
      const name = m?.displayName || '';
      const username = m?.username || '';
      const email = m?.email || '';
      return `- id: ${id} | name: ${name} | username: ${username} | email: ${email}`;
    }).join('\n')
    : '- (none)';

  return MEETING_EXTRACT_PROMPT
    .replaceAll('USER_TIMEZONE', tz)
    .replaceAll('TODAY_DATE_LOCAL', localIsoDate(now))
    .replaceAll('TOMORROW_DATE_LOCAL', localIsoDate(tomorrow))
    .replaceAll('NEXT_MONDAY_DATE_LOCAL', localIsoDate(nextMonday))
    .replaceAll('THIS_FRIDAY_DATE_LOCAL', localIsoDate(thisFriday))
    .replaceAll('CURRENT_TIME_LOCAL', timeFmt())
    .replaceAll('TEAM_MEMBERS_BLOCK', teamBlock)
    + transcript;
}

/**
 * Extract meeting details from a transcript using AI.
 *
 * @param {string} transcript - The conversation transcript
 * @returns {Promise<{ hasMeeting: boolean, meetings: object[] }>}
 */
export async function extractMeetingDetails(transcript, teamMembers = []) {
  if (!transcript || transcript.trim().length < 20) {
    return { hasMeeting: false, meetings: [] };
  }

  // Truncate very long transcripts
  const maxLen = 8000;
  const input = transcript.length > maxLen
    ? transcript.slice(0, maxLen) + '\n[…truncated]'
    : transcript;

  try {
    const aiResult = await getAIResponse(buildPromptWithDates(input, teamMembers), [], true);

    if (aiResult && aiResult.length > 10) {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.hasMeeting && Array.isArray(parsed.meetings) && parsed.meetings.length > 0) {
          // Validate and normalize each meeting
          const meetings = parsed.meetings.map((m) => normalizeMeeting(m, teamMembers)).filter(Boolean);
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
function normalizeMeeting(m, teamMembers = []) {
  if (!m || !m.title) return null;

  try {
    const title = m.title;
    const description = m.description || '';
    const attendees = Array.isArray(m.attendees) ? m.attendees.filter((e) => typeof e === 'string' && e.includes('@')) : [];
    const attendeeUserIds = Array.isArray(m.attendeeUserIds) ? m.attendeeUserIds.map((x) => String(x)).filter(Boolean) : [];
    const memberById = new Map(
      (Array.isArray(teamMembers) ? teamMembers : []).map((mem) => [String(mem?.userId || mem?.id || ''), mem])
    );
    for (const id of attendeeUserIds) {
      const mem = memberById.get(String(id));
      const email = mem?.email;
      if (email && typeof email === 'string' && email.includes('@') && !attendees.includes(email)) attendees.push(email);
    }

    const preferISO = typeof m.startISO === 'string' && typeof m.endISO === 'string';
    if (preferISO) {
      const start = new Date(m.startISO);
      const end = new Date(m.endISO);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return { title, description, startTime: start.toISOString(), endTime: end.toISOString(), attendees };
      }
    }

    const date = m.date;
    if (!date || typeof date !== 'string') return null;
    const startTime = m.startTime || '10:00';
    const endTimeParsed = m.endTime || addMinutes(startTime, 30);

    const [y, mo, d] = date.split('-').map((x) => Number(x));
    const [sh, sm] = String(startTime).split(':').map((x) => Number(x));
    const [eh, em] = String(endTimeParsed).split(':').map((x) => Number(x));
    if (![y, mo, d, sh, sm, eh, em].every((n) => Number.isFinite(n))) return null;

    let startLocal = new Date(y, mo - 1, d, sh, sm, 0, 0);
    let endLocal = new Date(y, mo - 1, d, eh, em, 0, 0);
    if (Number.isNaN(startLocal.getTime()) || Number.isNaN(endLocal.getTime())) return null;
    if (endLocal <= startLocal) endLocal = new Date(startLocal.getTime() + 30 * 60 * 1000);

    const now = new Date();
    const isSameLocalDay = startLocal.getFullYear() === now.getFullYear() &&
      startLocal.getMonth() === now.getMonth() &&
      startLocal.getDate() === now.getDate();
    if (isSameLocalDay && startLocal.getTime() < now.getTime() - 2 * 60 * 1000) {
      startLocal = new Date(startLocal.getTime() + 24 * 60 * 60 * 1000);
      endLocal = new Date(endLocal.getTime() + 24 * 60 * 60 * 1000);
    }

    return {
      title,
      description,
      startTime: startLocal.toISOString(),
      endTime: endLocal.toISOString(),
      attendees,
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

  const now = new Date();
  const [y, mo, d] = date.split('-').map((x) => Number(x));
  const [sh, sm] = startTime.split(':').map((x) => Number(x));
  const [eh, em] = endTime.split(':').map((x) => Number(x));
  if (![y, mo, d, sh, sm, eh, em].every((n) => Number.isFinite(n))) {
    return { hasMeeting: false, meetings: [] };
  }
  let startLocal = new Date(y, mo - 1, d, sh, sm, 0, 0);
  let endLocal = new Date(y, mo - 1, d, eh, em, 0, 0);
  if (Number.isNaN(startLocal.getTime()) || Number.isNaN(endLocal.getTime())) {
    return { hasMeeting: false, meetings: [] };
  }
  if (endLocal <= startLocal) endLocal = new Date(startLocal.getTime() + 30 * 60 * 1000);
  const isSameLocalDay = startLocal.getFullYear() === now.getFullYear() &&
    startLocal.getMonth() === now.getMonth() &&
    startLocal.getDate() === now.getDate();
  if (isSameLocalDay && startLocal.getTime() < now.getTime() - 2 * 60 * 1000) {
    startLocal = new Date(startLocal.getTime() + 24 * 60 * 60 * 1000);
    endLocal = new Date(endLocal.getTime() + 24 * 60 * 60 * 1000);
  }

  return {
    hasMeeting: true,
    meetings: [
      {
        title: 'Meeting (auto-detected)',
        description: 'Auto-detected from conversation by Assistrio.',
        startTime: startLocal.toISOString(),
        endTime: endLocal.toISOString(),
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
