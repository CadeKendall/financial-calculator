import { attempt, integer, requireValue, type Result } from './numeric.js';
export type DayBasis = 'ACT' | '360';
const DAY = 86400000;
export function dateParts(iso: string, internalCoupon = false): [number, number, number] {
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(iso), 'Use an ISO date YYYY-MM-DD.', 6);
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  const d = new Date(Date.UTC(year, month - 1, day));
  requireValue(year >= (internalCoupon ? 1979 : 1980) && year <= 2079 && d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day, 'Date must be valid and between 1980 and 2079.', 6);
  return [year, month, day];
}
export function isoDate(year: number, month: number, day: number): string { return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }
export function dateSerial(iso: string, internalCoupon = false): number { const [y, m, d] = dateParts(iso, internalCoupon); return Date.UTC(y, m - 1, d) / DAY; }
export function daysBetween(start: string, end: string, basis: DayBasis = 'ACT', internalCoupon = false): number {
  const a = dateParts(start, internalCoupon), b = dateParts(end, internalCoupon);
  if (basis === 'ACT') return dateSerial(end, internalCoupon) - dateSerial(start, internalCoupon);
  requireValue(basis === '360', 'Invalid day-count basis.');
  if (end < start) return -daysBetween(end, start, basis, internalCoupon);
  let d1 = a[2], d2 = b[2]; if (d1 === 31) d1 = 30; if (d2 === 31 && d1 === 30) d2 = 30;
  return (b[0] - a[0]) * 360 + (b[1] - a[1]) * 30 + d2 - d1;
}
export function parseCalculatorDate(entry: string, format: 'US' | 'EUR'): string {
  requireValue(/^\d{1,2}\.\d{1,4}$/.test(entry), 'Enter dates as MM.DDYY or DD.MMYY.', 6);
  const [head, tail] = entry.split('.'); const digits = tail!.padEnd(4, '0');
  const a = Number(head), b = Number(digits.slice(0, 2)), yy = Number(digits.slice(2)), year = yy >= 80 ? 1900 + yy : 2000 + yy;
  const iso = isoDate(year, format === 'US' ? a : b, format === 'US' ? b : a); dateParts(iso); return iso;
}
export function displayDate(iso: string, format: 'US' | 'EUR'): string {
  const [y, m, d] = dateParts(iso); return format === 'US' ? `${m}-${String(d).padStart(2, '0')}-${y}` : `${d}-${String(m).padStart(2, '0')}-${y}`;
}
export function weekday(iso: string): string { return ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(dateSerial(iso) * DAY).getUTCDay()]!; }
export function calculateDate(target: 'DT1' | 'DT2' | 'DBD', v: { DT1: string; DT2: string; DBD: string | number; basis: DayBasis }): Result<string> {
  return attempt(() => {
    requireValue(['DT1','DT2','DBD'].includes(target), 'Invalid date target.');
    if (target === 'DBD') return String(daysBetween(v.DT1, v.DT2, v.basis));
    requireValue(v.basis === 'ACT', 'Dates can only be computed in ACT mode.');
    const days = integer(v.DBD, -36524, 36524, 'Days');
    const d = new Date((dateSerial(target === 'DT1' ? v.DT2 : v.DT1) + (target === 'DT1' ? -days : days)) * DAY);
    const iso = isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); dateParts(iso); return iso;
  });
}
export function monthsBefore(anchor: string, months: number): string {
  const [y, m, d] = dateParts(anchor), index = y * 12 + m - 1 - months, year = Math.floor(index / 12), month = index % 12 + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const anchorLast = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return isoDate(year, month, d === anchorLast ? last : Math.min(d, last));
}
