import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

let db;

export function initDb() {
  if (db) return db;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, 'app.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      vehicle TEXT NOT NULL,
      service_type TEXT NOT NULL, -- 'carbon' or 'ceramic'
      date TEXT NOT NULL,   -- YYYY-MM-DD
      start_time TEXT NOT NULL, -- HH:mm
      end_time TEXT NOT NULL, -- HH:mm
      status TEXT NOT NULL, -- 'pending_payment' | 'deposit_paid' | 'cancelled'
      payment_intent_id TEXT,
      amount_total INTEGER NOT NULL, -- total service price, in smallest currency unit
      amount_deposit INTEGER NOT NULL, -- 50% of total
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

export function getDb() {
  if (!db) initDb();
  return db;
}
