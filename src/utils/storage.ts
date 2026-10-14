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

// Format ISO date to local human readable time e.g. "08:30 AM"
export function formatTimeDisplay(isoString?: string): string {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Format ISO date to local human readable date e.g. "Mon, 5 Oct 2026"
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

// Export timesheets to CSV with UTF-8 BOM for Excel
export function exportEntriesToCSV(entries: TimeEntry[]) {
  const headers = [
    'Entry ID',
    'Employee',
    'Role',
    'Date',
    'Project',
    'Clock In',
    'Clock Out',
    'Break (min)',
    'Net Hours',
    'Status',
    'Notes',
    'Clock-In Location',
    'Device',
  ];

  const rows = entries.map((e) => [
    e.id,
    `"${e.employeeName.replace(/"/g, '""')}"`,
    `"${e.employeeRole.replace(/"/g, '""')}"`,
    e.date,
    `"${e.projectName.replace(/"/g, '""')}"`,
    e.clockInTime ? formatTimeDisplay(e.clockInTime) : '',
    e.clockOutTime ? formatTimeDisplay(e.clockOutTime) : 'On shift',
    e.totalBreakMinutes || 0,
    e.totalHours ? e.totalHours.toFixed(2) : '0.00',
    e.status === 'completed' ? 'Completed' : e.status === 'on_break' ? 'On Break' : 'Active',
    `"${(e.notes || '').replace(/"/g, '""')}"`,
    `"${(e.locationIn?.addressName || '').replace(/"/g, '""')}"`,
    e.device || 'Web',
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `CPR_Hours_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
