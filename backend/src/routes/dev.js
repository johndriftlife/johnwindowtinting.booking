// backend/src/routes/dev.js
import express from 'express'
import { google } from 'googleapis'

const router = express.Router()

// quick sanity endpoint so you can test routing without Google
router.get('/ping', (req, res) => res.json({ ok: true, msg: 'dev router mounted' }))

function getJwt() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  let privateKey = process.env.GOOGLE_PRIVATE_KEY
  if (!clientEmail || !privateKey) {
    throw new Error('Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY')
  }
  // Render env often stores newlines as "\n"
  privateKey = privateKey.replace(/\\n/g, '\n')

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
}

router.get('/calendar-ping', async (req, res) => {
  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID
    if (!calendarId) return res.status(400).json({ ok: false, error: 'GOOGLE_CALENDAR_ID missing' })

    const auth = getJwt()
    const calendar = google.calendar({ version: 'v3', auth })

    const start = new Date(Date.now() + 2 * 60 * 1000)
    const end = new Date(start.getTime() + 10 * 60 * 1000)

    const created = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: 'API test (auto-delete)',
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    })

    await calendar.events.delete({ calendarId, eventId: created.data.id })
    return res.json({ ok: true, message: 'Calendar write OK (insert+delete succeeded)' })
  } catch (err) {
    console.error('calendar-ping error:', err?.response?.data || err?.message || err)
    const details = err?.response?.data || { error: String(err?.message || err) }
    return res.status(500).json({ ok: false, ...details })
  }
})

export default router
