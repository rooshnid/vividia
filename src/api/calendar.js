const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';

let tokenClient;
let gapiReadyPromise;
let gisReadyPromise;

function loadScriptReady(checker) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (checker()) {
        clearInterval(timer);
        resolve();
      } else if (tries > 120) {
        clearInterval(timer);
        reject(new Error('Google client failed to load.'));
      }
    }, 100);
  });
}

export function isGoogleConfigured() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_API_KEY);
}

export async function initGoogleCalendar() {
  if (!isGoogleConfigured()) {
    return false;
  }

  if (!gapiReadyPromise) {
    gapiReadyPromise = loadScriptReady(() => window.gapi?.load);
  }
  if (!gisReadyPromise) {
    gisReadyPromise = loadScriptReady(() => window.google?.accounts?.oauth2);
  }

  await Promise.all([gapiReadyPromise, gisReadyPromise]);

  await new Promise((resolve) => {
    window.gapi.load('client', resolve);
  });

  await window.gapi.client.init({
    apiKey: GOOGLE_API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });

  tokenClient =
    tokenClient ||
    window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: () => {},
    });

  return true;
}

export async function authorizeCalendar() {
  await initGoogleCalendar();

  if (!tokenClient) {
    throw new Error('Calendar sync paused — tap to reconnect');
  }

  return new Promise((resolve, reject) => {
    tokenClient.callback = (response) => {
      if (response?.error) {
        reject(new Error('Calendar sync paused — tap to reconnect'));
        return;
      }
      resolve(true);
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function parseFreeBlocks(busyBlocks, start, end) {
  const free = [];
  let cursor = new Date(start);
  const busy = [...busyBlocks].sort((a, b) => new Date(a.start) - new Date(b.start));

  for (const block of busy) {
    const busyStart = new Date(block.start);
    const busyEnd = new Date(block.end);

    if (busyStart > cursor) {
      free.push(`${formatTime(cursor)}–${formatTime(busyStart)}`);
    }

    if (busyEnd > cursor) {
      cursor = busyEnd;
    }
  }

  if (cursor < end) {
    free.push(`${formatTime(cursor)}–${formatTime(end)}`);
  }

  return free.filter(Boolean);
}

export async function getTodayFreeBlocks() {
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 0, 0);

  if (!window.gapi?.client?.calendar) {
    return mockFreeBlocks();
  }

  const response = await window.gapi.client.calendar.freebusy.query({
    timeMin: now.toISOString(),
    timeMax: endOfDay.toISOString(),
    items: [{ id: 'primary' }],
  });

  const busy = response.result.calendars.primary.busy;
  return parseFreeBlocks(busy, now, endOfDay);
}

export async function createCalendarEvent({ task, isoStart, isoEnd, goalTitle }) {
  if (!window.gapi?.client?.calendar) {
    window.open('https://calendar.google.com/calendar/u/0/r/eventedit', '_blank');
    return;
  }

  await window.gapi.client.calendar.events.insert({
    calendarId: 'primary',
    resource: {
      summary: task,
      start: { dateTime: isoStart, timeZone: 'America/Los_Angeles' },
      end: { dateTime: isoEnd, timeZone: 'America/Los_Angeles' },
      description: `Vividia goal task: ${goalTitle}`,
    },
  });
}

export function mockFreeBlocks() {
  return ['9:00 AM–10:30 AM', '1:00 PM–2:00 PM', '4:00 PM–5:30 PM'];
}
