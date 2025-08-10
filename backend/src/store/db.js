import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { FIXED_SLOTS, DEFAULT_SHADES } from '../config/businessHours.js'

let db
export function initDb() {
  if (db) return db
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const dataDir = path.join(__dirname, '../../data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  const dbPath = path.join(dataDir, 'app.db')
  db = new Database(dbPath)

  db.exec(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    vehicle TEXT NOT NULL,
    tint_quality TEXT NOT NULL,
    tint_shade TEXT NOT NULL,
    windows_json TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL,
    payment_intent_id TEXT,
    amount_total INTEGER NOT NULL,
    amount_deposit INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );`)

  db.exec(`CREATE TABLE IF NOT EXISTS slot_toggles (
    weekday INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (weekday, start_time)
  );`)
  const hasSlots = db.prepare('SELECT COUNT(*) as c FROM slot_toggles').get().c
  if (!hasSlots) {
    for (const [wd, slots] of Object.entries(FIXED_SLOTS)) {
      for (const s of slots) {
        db.prepare('INSERT OR IGNORE INTO slot_toggles (weekday, start_time, enabled) VALUES (?,?,1)').run(parseInt(wd,10), s.start)
      }
    }
  }

  db.exec(`CREATE TABLE IF NOT EXISTS shade_availability (
    quality TEXT NOT NULL,
    shade TEXT NOT NULL,
    available INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (quality, shade)
  );`)
  const hasShades = db.prepare('SELECT COUNT(*) as c FROM shade_availability').get().c
  if (!hasShades) {
    for (const [q, arr] of Object.entries(DEFAULT_SHADES)) {
      for (const sh of arr) {
        db.prepare('INSERT OR IGNORE INTO shade_availability (quality, shade, available) VALUES (?,?,1)').run(q, sh)
      }
    }
  }

  return db
}
export function getDb(){ if(!db) initDb(); return db }
