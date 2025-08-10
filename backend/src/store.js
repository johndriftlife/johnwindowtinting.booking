// backend/src/store.js
import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Use a persistent disk if you add one on Render and set DATA_PATH=/data
const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, '..', '..', 'data')
const FILES = {
  slots: path.join(DATA_PATH, 'slots.json'),
  shades: path.join(DATA_PATH, 'shades.json'),
  bookings: path.join(DATA_PATH, 'bookings.json'),
}

// Default in-memory data (used on first run if files don’t exist)
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
  slots: [
    { weekday: 2, start_time: '14:00', enabled: 1 }, // Tue
    { weekday: 3, start_time: '14:00', enabled: 1 }, // Wed
    { weekday: 4, start_time: '14:00', enabled: 1 }, // Thu
    { weekday: 5, start_time: '14:00', enabled: 1 }, // Fri
    { weekday: 6, start_time: '09:00', enabled: 1 }, // Sat
    { weekday: 6, start_time: '11:00', enabled: 1 },
    { weekday: 6, start_time: '14:00', enabled: 1 },
    { weekday: 0, start_time: '10:00', enabled: 1 }, // Sun
  ],
}

// Ensure folder exists
async function ensureDir() {
  await mkdir(DATA_PATH, { recursive: true })
}

// Generic helpers
async function loadJSON(file, fallback) {
  try {
    const buf = await readFile(file, 'utf8')
    return JSON.parse(buf)
  } catch {
    return fallback
  }
}
async function saveJSON(file, data) {
  await ensureDir()
  await writeFile(file, JSON.stringify(data, null, 2))
}

// Public API used by routes
export async function loadAll() {
  await ensureDir()
  // Merge loaded data into db (so defaults remain if any file missing)
  const [slots, shades, bookings] = await Promise.all([
    loadJSON(FILES.slots, db.slots),
    loadJSON(FILES.shades, db.shades),
    loadJSON(FILES.bookings, db.bookings),
  ])
  db.slots = slots
  db.shades = shades
  db.bookings = bookings
}

export async function saveSlots()   { await saveJSON(FILES.slots, db.slots) }
export async function saveShades()  { await saveJSON(FILES.shades, db.shades) }
export async function saveBookings(){ await saveJSON(FILES.bookings, db.bookings) }
