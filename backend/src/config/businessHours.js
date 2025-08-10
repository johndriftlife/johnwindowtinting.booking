export const TIMEZONE = process.env.TZ || 'America/Guadeloupe';

// Business hours (24h) for each weekday (0=Sun...6=Sat)
export const HOURS = {
  0: [{ start: '10:00', end: '12:00' }],       // Sunday
  1: [],                                       // Monday (closed)
  2: [{ start: '14:00', end: '17:00' }],       // Tuesday
  3: [{ start: '14:00', end: '17:00' }],       // Wednesday
  4: [{ start: '14:00', end: '17:00' }],       // Thursday
  5: [{ start: '14:00', end: '17:00' }],       // Friday
  6: [{ start: '09:00', end: '17:00' }],       // Saturday
};

export const SLOT_MIN = parseInt(process.env.SLOT_DURATION_MIN || '60', 10);

export const SERVICES = {
  carbon: parseInt(process.env.PRICE_CARBON || '20000', 10),
  ceramic: parseInt(process.env.PRICE_CERAMIC || '35000', 10)
};

export const CURRENCY = (process.env.CURRENCY || 'usd').toLowerCase();
