export const TIMEZONE = process.env.TZ || 'America/Guadeloupe';
export const FIXED_SLOTS = {
  0: [{ start: '10:00', end: '12:00' }],
  1: [],
  2: [{ start: '14:00', end: '16:00' }],
  3: [{ start: '14:00', end: '16:00' }],
  4: [{ start: '14:00', end: '16:00' }],
  5: [{ start: '14:00', end: '16:00' }],
  6: [{ start: '09:00', end: '11:00' }, { start: '11:00', end: '13:00' }, { start: '14:00', end: '16:00' }]
};
export const SLOT_MIN = 120;
export const CURRENCY = (process.env.CURRENCY || 'eur').toLowerCase();
export const PRICES = {
  carbon: { front_doors: 4000, rear_doors: 4000, front_windshield: 8000, rear_windshield: 8000 },
  ceramic:{ front_doors: 6000, rear_doors: 6000, front_windshield:10000, rear_windshield:10000 }
};
export const DEFAULT_SHADES = { carbon: ['50%','35%','20%','5%','1%'], ceramic: ['20%','5%'] };
