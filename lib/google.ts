import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/google/callback`
  );
}

/**
 * Generate the Google OAuth2 consent URL.
 */
export function getGoogleAuthUrl(state: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state,
  });
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Create a Google Calendar event using stored refresh token.
 */
export async function createCalendarEvent(
  refreshToken: string,
  event: {
    summary: string;
    description?: string;
    startTime: string; // ISO string
    endTime: string;
    attendeeEmail?: string;
    timezone?: string;
  }
) {
  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth: client });

  const calendarEvent = {
    summary: event.summary,
    description: event.description || "",
    start: {
      dateTime: event.startTime,
      timeZone: event.timezone || "Australia/Sydney",
    },
    end: {
      dateTime: event.endTime,
      timeZone: event.timezone || "Australia/Sydney",
    },
    ...(event.attendeeEmail && {
      attendees: [{ email: event.attendeeEmail }],
    }),
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 60 },
        { method: "popup", minutes: 15 },
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: calendarEvent,
    sendUpdates: event.attendeeEmail ? "all" : "none",
  });

  return response.data;
}
