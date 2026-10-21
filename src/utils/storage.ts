import { TimeEntry } from '../types';

// Employees, projects and time entries live in Supabase (see ./db.ts).
// Only the per-device "last selected site" preference stays in localStorage.
const ACTIVE_PROJECT_ID_KEY = 'cpr_clock_active_proj_id_v1';

export function getActiveProjectId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ACTIVE_PROJECT_ID_KEY) || '';
}

export function setActiveProjectId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);
}

// Compute hours elapsed from clock in time until now (or end), subtracting breaks
export function calculateElapsedHours(
  clockInTime: string,
  clockOutTime?: string,
  breakPeriods: { start: string; end?: string; durationMinutes?: number }[] = []
): { totalDecimalHours: number; formatted: string; totalBreakMinutes: number } {
  const start = new Date(clockInTime).getTime();
  const end = clockOutTime ? new Date(clockOutTime).getTime() : Date.now();

  let grossDiffMs = Math.max(0, end - start);

  // Compute breaks
  let breakMs = 0;
  for (const b of breakPeriods) {
    if (b.durationMinutes) {
      breakMs += b.durationMinutes * 60 * 1000;
    } else if (b.start) {
      const bStart = new Date(b.start).getTime();
      const bEnd = b.end ? new Date(b.end).getTime() : Date.now();
      breakMs += Math.max(0, bEnd - bStart);
    }
  }

  const netDiffMs = Math.max(0, grossDiffMs - breakMs);
  const totalSeconds = Math.floor(netDiffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const totalDecimalHours = Number((netDiffMs / (1000 * 60 * 60)).toFixed(2));
  const totalBreakMinutes = Math.round(breakMs / (1000 * 60));

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return { totalDecimalHours, formatted, totalBreakMinutes };
}

// Format ISO date to human readable time e.g. "08:30 AM"; in the site's time zone when given, else the device's
export function formatTimeDisplay(isoString?: string, timeZone?: string): string {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone,
  });
}

// Format ISO date to local human readable date e.g. "Mon, 5 Oct 2026"
// 'YYYY-MM-DD' → 'DD/MM/YYYY' (string split, so the day never shifts with the time zone)
export function formatShortDate(date?: string): string {
  if (!date) return '';
  const [y, m, d] = date.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : date;
}

export function formatDateDisplay(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
