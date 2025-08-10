// Simple slot math helpers (no external deps)
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function toHHMM(minutes) {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function generateSlotsForDate(dateStr, hours, slotMin) {
  // dateStr: 'YYYY-MM-DD' (weekday determines which hours apply)
  // hours: array of {start,end} HH:mm
  const slots = [];
  for (const block of hours) {
    let cur = toMinutes(block.start);
    const end = toMinutes(block.end);
    while (cur + slotMin <= end) {
      const startHH = toHHMM(cur);
      const endHH = toHHMM(cur + slotMin);
      slots.push({ start: startHH, end: endHH });
      cur += slotMin;
    }
  }
  return slots;
}

export function isOverlap(aStart, aEnd, bStart, bEnd) {
  // HH:mm strings
  const aS = toMinutes(aStart), aE = toMinutes(aEnd);
  const bS = toMinutes(bStart), bE = toMinutes(bEnd);
  return aS < bE && bS < aE;
}
