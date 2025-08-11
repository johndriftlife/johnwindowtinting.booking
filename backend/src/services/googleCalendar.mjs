import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  SCOPES
);

const calendar = google.calendar({ version: "v3", auth });

export async function addBookingToCalendar(booking) {
  try {
    const event = {
      summary: `Booking - ${booking.name}`,
      description: `Service: ${booking.service}\nShade: ${booking.shade}\nPhone: ${booking.phone}`,
      start: {
        dateTime: `${booking.date}T${booking.time}:00`,
        timeZone: "America/Anguilla",
      },
      end: {
        dateTime: `${booking.date}T${booking.endTime || booking.time}:00`,
        timeZone: "America/Anguilla",
      },
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event,
    });

    console.log("Google Calendar event created:", response.data.id);
    return response.data;
  } catch (err) {
    console.error("Error adding booking to calendar:", err);
    throw err;
  }
}
