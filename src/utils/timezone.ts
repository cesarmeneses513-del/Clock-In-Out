import { ProjectSite } from '../types';

// Sites without a time zone (or before the column existed) are in Sydney, like in the database
export const DEFAULT_TIME_ZONE = 'Australia/Sydney';

export const siteTimeZone = (site?: ProjectSite) => site?.timezone || DEFAULT_TIME_ZONE;

const partsIn = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
};

const pad = (n: number) => String(n).padStart(2, '0');

// Calendar day ('YYYY-MM-DD') of an instant in the given time zone
export function dateInZone(date: Date, timeZone: string): string {
  const p = partsIn(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

// 'HH:MM' (24 h) of an instant in the given time zone
export function timeInZone(iso: string, timeZone: string): string {
  const p = partsIn(new Date(iso), timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

// Wall-clock day + time at a site → the real instant (handles daylight saving: Sydney moves, Brisbane does not)
export function zonedToIso(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const wanted = Date.UTC(y, m - 1, d, h, min);
  let guess = wanted;
  // Two passes settle the offset even right next to a daylight-saving change
  for (let i = 0; i < 2; i++) {
    const p = partsIn(new Date(guess), timeZone);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += wanted - shown;
  }
  return new Date(guess).toISOString();
}
