// backend/src/store.js
import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// If you attach a Render Disk, set DATA_PATH=/data in your backend env
const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, '..', '..', 'data')

const FILES = {
  slots: path.join(DATA_PATH, 'slots.json'),
  shades: path.join(DATA_PATH, 'shades.json'),
  bookings: path.join(DATA_PATH, 'bookings.json'),
}

// ---- Default in-memory data (used on first run if files don’t exist) ----
export const db = {
  bookings: [],
  shades: {
    carbon: [
      { shade: '50%', available: true },
      { shade: '35%', available: true },
      { shade: '20%', available: true },
      { shade: '5%',  available: true },
      { shade: '1%',  available: true },
    ],
    ceramic: [
      { shade: '20%', available: true },
      { shade: '5%',  available: true },
    ],
  },

  // Weekday: 0=Sun … 6=Sat
  // NEW SCHEDULE:
  // Tue–Fri → 14:00 (2PM)
  // Sat     → 09:00, 10:00, 11:00, 12:00, 13:00, 14:00
  // Sun     → 10:00 (10AM)
  // Mon     → closed (no entries)
  slots: [
    // Tue–Fri 2PM
    { weekday: 2, start_time: '14:00', enabled: 1 }, // Tue
    { weekday: 3, start_time: '14:00', enabled: 1 }, // Wed
    { weekday: 4, start_time: '14:00', enabled: 1 }, // Thu
    { weekday: 5, start_time: '14:00', enabled: 1 }, // Fri

    // Saturday all hours listed
    { weekday: 6, start_time: '09:00', enabled: 1 },
    { weekday: 6, start_time: '10:00', enabled: 1 },
    { weekday: 6, start_time: '11:00', enabled: 1 },
    { weekday: 6, start_time: '12:00', enabled: 1 },
    { weekday: 6, start_time: '13:00', enabled: 1 },
    { weekday: 6, start_time: '14:00', enabled: 1 },

    // Sunday one slot
    { weekday: 0, start_time: '10:00', enabled: 1 },
  ],
}

// ---- Helpers for persistence ----
async function ensureDir() {
  await mkdir(DATA_PATH, { recursive: true })
}

async function loadJSON(file, fallback) {
  try {
    const txt = await readFile(file, 'utf8')
    return JSON.parse(txt)
  } catch {
    return fallback
  }
}

async function saveJSON(file, data) {
  await ensureDir()
  await writeFile(file, JSON.stringify(data, null, 2))
}

// ---- Public API used by routes/server ----
export async function loadAll() {
  await ensureDir()
  const [slots, shades, bookings] = await Promise.all([
    loadJSON(FILES.slots, db.slots),
    loadJSON(FILES.shades, db.shades),
    loadJSON(FILES.bookings, db.bookings),
  ])
  db.slots = slots
  db.shades = shades
  db.bookings = bookings
}

export async function saveSlots()    { await saveJSON(FILES.slots, db.slots) }
export async function saveShades()   { await saveJSON(FILES.shades, db.shades) }
export async function saveBookings() { await saveJSON(FILES.bookings, db.bookings) }
