/**
 * Auto-Scheduler — Orchestrates detect → extract → schedule pipeline.
 *
 * After a note is saved with a transcript, this module:
 * 1. Checks if any calendar is connected
 * 2. Detects meeting scheduling intent in the transcript
 * 3. Extracts meeting details via AI
 * 4. Creates events on ALL connected calendars simultaneously
 * 5. Returns results for UI toast + activity feed
 */
import { isAnyCalendarConnected, createEventOnAllConnected } from './calendarService';
import { extractMeetingDetails } from '../utils/meetingExtractor';
import { userAskedToScheduleMeeting } from '../utils/noteIntents';

/**
 * Attempt to auto-schedule meetings from a note's transcript.
 *
 * @param {{ id: number, title: string, transcript?: string, summary?: string, mom?: string }} note
 * @param {string} [rawTranscript] — optional override transcript (e.g. from Talk session)
 * @returns {Promise<{ scheduled: boolean, events: object[], results: object[] }>}
 */
export async function attemptAutoSchedule(note, rawTranscript) {
  const result = { scheduled: false, events: [], results: [] };

  // 1. Check if any calendar is connected
  if (!isAnyCalendarConnected()) {
    return result;
  }

  // 2. Get the best transcript text
  const transcript = rawTranscript || note.transcript || note.mom || note.summary || '';
  if (transcript.trim().length < 20) {
    return result;
  }

  // 3. Quick check: is there meeting-scheduling language?
  if (!userAskedToScheduleMeeting(transcript)) {
    return result;
  }

  // 4. Extract meeting details via AI
  let extracted;
  try {
    extracted = await extractMeetingDetails(transcript);
  } catch (err) {
    console.warn('Auto-schedule: meeting extraction failed:', err);
    return result;
  }

  if (!extracted.hasMeeting || !extracted.meetings.length) {
    return result;
  }

  // 5. Create events on all connected calendars for each detected meeting
  for (const meeting of extracted.meetings) {
    try {
      const eventData = {
        title: meeting.title,
        description: meeting.description || `From conversation: "${note.title}"`,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        attendees: meeting.attendees || [],
      };

      const calResults = await createEventOnAllConnected(eventData);
      const anySuccess = calResults.some((r) => r.success);

      if (anySuccess) {
        result.scheduled = true;
        result.events.push(meeting);
        result.results.push(...calResults);
      }
    } catch (err) {
      console.warn('Auto-schedule: event creation failed for meeting:', meeting.title, err);
    }
  }

  return result;
}

/**
 * Format a meeting for display in toast/activity.
 * @param {object} meeting
 * @returns {{ displayDate: string, displayTime: string }}
 */
export function formatMeetingForDisplay(meeting) {
  try {
    const start = new Date(meeting.startTime);
    const displayDate = start.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const displayTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return { displayDate, displayTime };
  } catch {
    return { displayDate: 'Soon', displayTime: '' };
  }
}
