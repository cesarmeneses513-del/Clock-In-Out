import { Employee, ProjectSite, TimeEntry, contractTypeLabel } from '../types';
import { formatShortDate, formatTimeDisplay } from './storage';
import { siteTimeZone } from './timezone';

interface ExportColumn {
  key: string;
  label: string;
  // timeZone: the site's, so times read as local site time
  value: (entry: TimeEntry, employee: Employee | undefined, timeZone: string) => string | number;
}

const STATUS_LABEL = { completed: 'Completed', on_break: 'On Break', active: 'Active' } as const;

// Every column the CSV can have, in file order
export const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'employee', label: 'Employee', value: (e) => e.employeeName },
  { key: 'role', label: 'Role', value: (e) => e.employeeRole },
  { key: 'staff_type', label: 'Staff type', value: (_e, emp) => (emp ? contractTypeLabel(emp.contractType) : '') },
  { key: 'date', label: 'Date', value: (e) => formatShortDate(e.date) },
  { key: 'site', label: 'Site', value: (e) => e.projectName },
  { key: 'clock_in', label: 'Clock in', value: (e, _emp, tz) => (e.clockInTime ? formatTimeDisplay(e.clockInTime, tz) : '') },
  { key: 'clock_out', label: 'Clock out', value: (e, _emp, tz) => (e.clockOutTime ? formatTimeDisplay(e.clockOutTime, tz) : 'On shift') },
  { key: 'break', label: 'Break (min)', value: (e) => e.totalBreakMinutes || 0 },
  { key: 'hours', label: 'Net hours', value: (e) => (e.totalHours ? e.totalHours.toFixed(2) : '0.00') },
  { key: 'status', label: 'Status', value: (e) => STATUS_LABEL[e.status] },
  { key: 'auto_geofence', label: 'Auto geofence clock-out', value: (e) => (e.isAutoClockOut ? 'Yes' : '') },
  { key: 'manual', label: 'Manual entry', value: (e) => (e.isManual ? 'Yes' : '') },
  { key: 'notes', label: 'Notes', value: (e) => e.notes || '' },
  { key: 'location_in', label: 'Clock-in location', value: (e) => e.locationIn?.addressName || '' },
  { key: 'location_out', label: 'Clock-out location', value: (e) => e.locationOut?.addressName || '' },
  { key: 'device', label: 'Device', value: (e) => e.device || 'Web' },
  { key: 'id', label: 'Entry ID', value: (e) => e.id },
];

export const DEFAULT_EXPORT_COLUMNS = EXPORT_COLUMNS.map((c) => c.key).filter((k) => k !== 'id' && k !== 'device');

const cell = (value: string | number) => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Downloads the entries as CSV (UTF-8 BOM so Excel reads accents) with the chosen columns
export function exportEntriesToCSV(entries: TimeEntry[], columnKeys: string[], employees: Employee[], projects: ProjectSite[]) {
  const columns = EXPORT_COLUMNS.filter((c) => columnKeys.includes(c.key));
  const byId = new Map(employees.map((emp) => [emp.id, emp]));
  const siteById = new Map(projects.map((p) => [p.id, p]));
  const rows = entries.map((entry) => {
    const timeZone = siteTimeZone(siteById.get(entry.projectId));
    return columns.map((c) => cell(c.value(entry, byId.get(entry.employeeId), timeZone))).join(',');
  });
  const csv = '﻿' + [columns.map((c) => cell(c.label)).join(','), ...rows].join('\r\n');

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `CPR_Hours_Report_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
