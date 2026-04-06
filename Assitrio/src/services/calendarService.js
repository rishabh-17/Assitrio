/**
 * Calendar Service — OAuth2 token management + API abstraction
 * for Google Calendar and Microsoft (Outlook) Calendar.
 *
 * Both providers are supported simultaneously.
 * Tokens are stored in localStorage (standard SPA pattern).
 */
import { userService } from './apiService';

// ── Placeholder Client IDs (swap with real ones) ──
const GOOGLE_CAL_CLIENT_ID = '832218498414-your-client-id.apps.googleusercontent.com';
const GOOGLE_CAL_SCOPES = 'https://www.googleapis.com/auth/calendar.events';

const MS_CLIENT_ID = 'YOUR-AZURE-AD-APP-CLIENT-ID';
const MS_SCOPES = ['Calendars.ReadWrite'];
const MS_AUTHORITY = 'https://login.microsoftonline.com/common';

const STORAGE_KEYS = {
  googleToken: 'assistrio-google-cal-token',
  msToken: 'assistrio-ms-cal-token',
};

/* ══════════════════════════════════════════
   Google Calendar
   ══════════════════════════════════════════ */

/** @returns {{ access_token: string, expires_at: number } | null} */
function getGoogleTokenData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.googleToken);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Token expired?
    if (data.expires_at && Date.now() > data.expires_at) {
      localStorage.removeItem(STORAGE_KEYS.googleToken);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function isGoogleConnected() {
  return !!getGoogleTokenData();
}

export function disconnectGoogle() {
  localStorage.removeItem(STORAGE_KEYS.googleToken);
  userService.updateCalendarToken('google', null).catch(console.error);
}

/**
 * Initiate Google OAuth2 consent popup.
 * Returns a Promise that resolves with { access_token } on success.
 */
export function connectGoogle() {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded yet'));
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CAL_CLIENT_ID,
      scope: GOOGLE_CAL_SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        const tokenData = {
          access_token: response.access_token,
          expires_at: Date.now() + (response.expires_in || 3600) * 1000,
        };
        localStorage.setItem(STORAGE_KEYS.googleToken, JSON.stringify(tokenData));
        resolve(tokenData);
      },
    });

    client.requestAccessToken();
  }).then(tokenData => {
    // Background sync to backend
    userService.updateCalendarToken('google', tokenData).catch(console.error);
    return tokenData;
  });
}

/**
 * Create a Google Calendar event.
 * @param {{ title: string, description?: string, startTime: string, endTime: string, attendees?: string[] }}
 * @returns {Promise<object>} Created event data
 */
export async function createGoogleEvent({ title, description, startTime, endTime, attendees = [] }) {
  const token = getGoogleTokenData();
  if (!token) throw new Error('Google Calendar not connected');

  const event = {
    summary: title,
    description: description || `Auto-scheduled by Assistrio from conversation transcript.`,
    start: { dateTime: startTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: endTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    reminders: { useDefault: true },
  };

  if (attendees.length > 0) {
    event.attendees = attendees.map((email) => ({ email }));
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const errText = await res.text();
    // Token expired — clear it
    if (res.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.googleToken);
    }
    throw new Error(`Google Calendar API error (${res.status}): ${errText.slice(0, 200)}`);
  }

  return res.json();
}

/**
 * Get upcoming Google Calendar events.
 * @param {number} maxResults
 */
export async function getGoogleUpcomingEvents(maxResults = 5) {
  const token = getGoogleTokenData();
  if (!token) return [];

  try {
    const now = new Date().toISOString();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&timeMin=${encodeURIComponent(now)}&orderBy=startTime&singleEvents=true`,
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
      }
    );
    if (!res.ok) {
      if (res.status === 401) localStorage.removeItem(STORAGE_KEYS.googleToken);
      return [];
    }
    const data = await res.json();
    return (data.items || []).map((e) => ({
      id: e.id,
      title: e.summary || 'Untitled',
      start: e.start?.dateTime || e.start?.date || '',
      end: e.end?.dateTime || e.end?.date || '',
      provider: 'google',
    }));
  } catch {
    return [];
  }
}

/* ══════════════════════════════════════════
   Microsoft (Outlook) Calendar
   ══════════════════════════════════════════ */

let msalInstance = null;

function getMsalInstance() {
  if (msalInstance) return msalInstance;
  if (!window.msal?.PublicClientApplication) return null;

  msalInstance = new window.msal.PublicClientApplication({
    auth: {
      clientId: MS_CLIENT_ID,
      authority: MS_AUTHORITY,
      redirectUri: window.location.origin,
    },
    cache: { cacheLocation: 'localStorage' },
  });

  return msalInstance;
}

/** @returns {{ access_token: string, expires_at: number } | null} */
function getMsTokenData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.msToken);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.expires_at && Date.now() > data.expires_at) {
      localStorage.removeItem(STORAGE_KEYS.msToken);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function isMicrosoftConnected() {
  return !!getMsTokenData();
}

export function disconnectMicrosoft() {
  localStorage.removeItem(STORAGE_KEYS.msToken);
  msalInstance = null;
  userService.updateCalendarToken('microsoft', null).catch(console.error);
}

/**
 * Initiate Microsoft OAuth2 popup login.
 */
export async function connectMicrosoft() {
  const msal = getMsalInstance();
  if (!msal) throw new Error('MSAL.js not loaded yet');

  // MSAL v2 requires initialize() before any interactive calls
  await msal.initialize();

  const result = await msal.loginPopup({
    scopes: MS_SCOPES,
  });

  if (result?.accessToken) {
    const tokenData = {
      access_token: result.accessToken,
      expires_at: result.expiresOn ? result.expiresOn.getTime() : Date.now() + 3600 * 1000,
      account: result.account,
    };
    localStorage.setItem(STORAGE_KEYS.msToken, JSON.stringify(tokenData));
    return tokenData;
  }

  // Try silent token acquisition
  const accounts = msal.getAllAccounts();
  if (accounts.length > 0) {
    const silent = await msal.acquireTokenSilent({
      scopes: MS_SCOPES,
      account: accounts[0],
    });
    const tokenData = {
      access_token: silent.accessToken,
      expires_at: silent.expiresOn ? silent.expiresOn.getTime() : Date.now() + 3600 * 1000,
      account: silent.account,
    };
    localStorage.setItem(STORAGE_KEYS.msToken, JSON.stringify(tokenData));
    return tokenData;
  }

  throw new Error('Microsoft login cancelled or failed');
}

/**
 * Load tokens from backend to local storage
 */
export async function syncCalendarTokensFromBackend() {
  try {
    const { googleToken, msToken } = await userService.getCalendarTokens();
    if (googleToken) localStorage.setItem(STORAGE_KEYS.googleToken, JSON.stringify(googleToken));
    if (msToken) localStorage.setItem(STORAGE_KEYS.msToken, JSON.stringify(msToken));
  } catch (err) {
    console.warn('Failed to sync calendar tokens from backend:', err);
  }
}

/**
 * Create a Microsoft Calendar event.
 */
export async function createMicrosoftEvent({ title, description, startTime, endTime, attendees = [] }) {
  const token = getMsTokenData();
  if (!token) throw new Error('Microsoft Calendar not connected');

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const event = {
    subject: title,
    body: {
      contentType: 'Text',
      content: description || 'Auto-scheduled by Assistrio from conversation transcript.',
    },
    start: { dateTime: startTime, timeZone: tz },
    end: { dateTime: endTime, timeZone: tz },
    isReminderOn: true,
    reminderMinutesBeforeStart: 15,
  };

  if (attendees.length > 0) {
    event.attendees = attendees.map((email) => ({
      emailAddress: { address: email },
      type: 'required',
    }));
  }

  const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401) localStorage.removeItem(STORAGE_KEYS.msToken);
    throw new Error(`Microsoft Graph API error (${res.status}): ${errText.slice(0, 200)}`);
  }

  return res.json();
}

/**
 * Get upcoming Microsoft Calendar events.
 */
export async function getMicrosoftUpcomingEvents(maxResults = 5) {
  const token = getMsTokenData();
  if (!token) return [];

  try {
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(now)}&endDateTime=${encodeURIComponent(future)}&$top=${maxResults}&$orderby=start/dateTime`,
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
      }
    );
    if (!res.ok) {
      if (res.status === 401) localStorage.removeItem(STORAGE_KEYS.msToken);
      return [];
    }
    const data = await res.json();
    return (data.value || []).map((e) => ({
      id: e.id,
      title: e.subject || 'Untitled',
      start: e.start?.dateTime || '',
      end: e.end?.dateTime || '',
      provider: 'microsoft',
    }));
  } catch {
    return [];
  }
}

/* ══════════════════════════════════════════
   Unified API
   ══════════════════════════════════════════ */

/**
 * Create a calendar event on a specific provider.
 * @param {'google' | 'microsoft'} provider
 * @param {object} eventData - { title, description, startTime, endTime, attendees }
 */
export async function createCalendarEvent(provider, eventData) {
  if (provider === 'google') return createGoogleEvent(eventData);
  if (provider === 'microsoft') return createMicrosoftEvent(eventData);
  throw new Error(`Unknown calendar provider: ${provider}`);
}

/**
 * Create events on ALL connected calendars simultaneously.
 * @returns {Promise<{ provider: string, success: boolean, error?: string }[]>}
 */
export async function createEventOnAllConnected(eventData) {
  const results = [];
  const providers = [];

  if (isGoogleConnected()) providers.push('google');
  if (isMicrosoftConnected()) providers.push('microsoft');

  if (providers.length === 0) return results;

  const promises = providers.map(async (provider) => {
    try {
      await createCalendarEvent(provider, eventData);
      return { provider, success: true };
    } catch (err) {
      console.warn(`Calendar event creation failed for ${provider}:`, err);
      return { provider, success: false, error: err.message };
    }
  });

  return Promise.all(promises);
}

/**
 * Get upcoming events from all connected calendars.
 */
export async function getAllUpcomingEvents(maxPerProvider = 3) {
  const events = [];

  if (isGoogleConnected()) {
    const gEvents = await getGoogleUpcomingEvents(maxPerProvider);
    events.push(...gEvents);
  }

  if (isMicrosoftConnected()) {
    const mEvents = await getMicrosoftUpcomingEvents(maxPerProvider);
    events.push(...mEvents);
  }

  // Sort by start time
  events.sort((a, b) => new Date(a.start) - new Date(b.start));
  return events;
}

/**
 * Check if any calendar is connected.
 */
export function isAnyCalendarConnected() {
  return isGoogleConnected() || isMicrosoftConnected();
}
