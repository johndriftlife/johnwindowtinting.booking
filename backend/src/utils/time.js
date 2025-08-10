export function isOverlap(aStart, aEnd, bStart, bEnd) {
  const toM = (t)=>{ const [h,m]=t.split(':').map(Number); return h*60+m; }
  const aS = toM(aStart), aE = toM(aEnd), bS = toM(bStart), bE = toM(bEnd);
  return aS < bE && bS < aE;
}
