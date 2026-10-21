import React, { useState } from 'react';
import {
  Search,
  Download,
  Plus,
  Trash2,
  Lock,
  Shield,
  MapPin,
  Radio,
  ClipboardCheck,
  X,
} from 'lucide-react';
import { Employee, ProjectSite, TimeEntry } from '../types';
import { formatTimeDisplay, formatShortDate, calculateElapsedHours } from '../utils/storage';
import { exportEntriesToCSV } from '../utils/exportCsv';
import { dateInZone, siteTimeZone, timeInZone, zonedToIso } from '../utils/timezone';
import { ShiftDetails } from './ShiftDetails';
import { ExportCsvModal, PeriodFilter, TimesheetFilters } from './ExportCsvModal';

interface TimesheetsViewProps {
  currentUser: Employee;
  entries: TimeEntry[];
  employees: Employee[];
  projects: ProjectSite[];
  onDeleteEntry: (id: string) => void;
  onUpdateEntry: (entry: TimeEntry) => void;
  onOpenManualEntry: () => void;
  // False while only recent entries are loaded; "All" asks for the rest
  fullHistory: boolean;
  onLoadFullHistory: () => void;
}

export const TimesheetsView: React.FC<TimesheetsViewProps> = ({
  currentUser,
  entries,
  employees,
  projects,
  onDeleteEntry,
  onUpdateEntry,
  onOpenManualEntry,
  fullHistory,
  onLoadFullHistory,
}) => {
  const [search, setSearch] = useState('');
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [filters, setFilters] = useState<TimesheetFilters>({
    period: fullHistory ? 'all' : 'month',
    from: todayIso.slice(0, 8) + '01',
    to: todayIso,
    employeeId: 'all',
    projectId: 'all',
    staffType: 'all',
  });
  const [showExport, setShowExport] = useState(false);

  // Older shifts are only downloaded when a filter can reach them
  const updateFilters = (change: Partial<TimesheetFilters>) => {
    if (change.period === 'all' || change.period === 'custom') onLoadFullHistory();
    setFilters((prev) => ({ ...prev, ...change }));
  };
  const setPeriodFilter = (period: PeriodFilter) => updateFilters({ period });
  const periodFilter = filters.period;

  const [reviewOnly, setReviewOnly] = useState(false);

  // Entry whose times an admin is correcting, and the HH:MM typed for each
  const [reviewEntry, setReviewEntry] = useState<TimeEntry | null>(null);
  const [reviewInTime, setReviewInTime] = useState('');
  const [reviewOutTime, setReviewOutTime] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Shift opened in the details pop-up (by id, so it shows the latest version after an edit)
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const detailsEntry = detailsId ? entries.find((e) => e.id === detailsId) : undefined;

  const isAdminOrManager = currentUser.systemRole === 'admin' || currentUser.systemRole === 'manager';

  // Accepts an automatic geofence clock-out; the original note stays as the record of what happened
  const approveGeofence = (entry: TimeEntry) => {
    onUpdateEntry({ ...entry, isAutoClockOut: false });
  };

  // Shift times are shown and edited in the site's local time (Sydney or Brisbane)
  const zoneOf = (entry: TimeEntry) => siteTimeZone(projects.find((p) => p.id === entry.projectId));

  const openReview = (entry: TimeEntry) => {
    const timeZone = zoneOf(entry);
    setReviewInTime(timeInZone(entry.clockInTime, timeZone));
    setReviewOutTime(timeInZone(entry.clockOutTime || entry.clockInTime, timeZone));
    setReviewError(null);
    setReviewEntry(entry);
  };

  const saveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewEntry) return;
    // Both times stay on the shift's original calendar day at the site
    const timeZone = zoneOf(reviewEntry);
    const day = dateInZone(new Date(reviewEntry.clockInTime), timeZone);
    const atTime = (hhmm: string) => new Date(zonedToIso(day, hhmm, timeZone));
    const clockIn = atTime(reviewInTime);
    const clockOut = atTime(reviewOutTime);
    if (isNaN(clockIn.getTime()) || isNaN(clockOut.getTime()) || clockOut.getTime() <= clockIn.getTime()) {
      setReviewError('Clock-out time must be after clock-in time');
      return;
    }
    const inIso = clockIn.toISOString();
    const outIso = clockOut.toISOString();
    const { totalDecimalHours, totalBreakMinutes } = calculateElapsedHours(
      inIso,
      outIso,
      reviewEntry.breakPeriods
    );
    onUpdateEntry({
      ...reviewEntry,
      clockInTime: inIso,
      clockOutTime: outIso,
      totalHours: totalDecimalHours,
      totalBreakMinutes,
      needsReview: reviewEntry.needsReview === undefined ? undefined : false,
    });
    setReviewEntry(null);
  };

  // Role-based scoping: standard collaborator can ONLY see their own entries
  const visibleEntries = isAdminOrManager
    ? entries
    : entries.filter((e) => e.employeeId === currentUser.id);

  const employeeById = new Map(employees.map((emp) => [emp.id, emp]));

  // Filtered dataset
  const needsReviewCount = visibleEntries.filter((e) => e.needsReview).length;

  const filtered = visibleEntries.filter((entry) => {
    if (reviewOnly && !entry.needsReview) return false;

    // Employee filter
    if (filters.employeeId !== 'all' && entry.employeeId !== filters.employeeId) {
      return false;
    }

    // Project filter
    if (filters.projectId !== 'all' && entry.projectId !== filters.projectId) {
      return false;
    }

    // Staff type filter
    if (filters.staffType !== 'all' && employeeById.get(entry.employeeId)?.contractType !== filters.staffType) {
      return false;
    }

    // Date range (YYYY-MM-DD strings compare in date order)
    if (periodFilter === 'custom') {
      if (filters.from && entry.date < filters.from) return false;
      if (filters.to && entry.date > filters.to) return false;
    }

    // Period filter
    if (periodFilter !== 'all' && periodFilter !== 'custom') {
      const entryDate = new Date(entry.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (periodFilter === 'today') {
        if (entry.date !== todayIso) return false;
      } else if (periodFilter === 'week') {
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 7);
        if (entryDate < oneWeekAgo) return false;
      } else if (periodFilter === 'month') {
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(today.getMonth() - 1);
        if (entryDate < oneMonthAgo) return false;
      }
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        entry.employeeName.toLowerCase().includes(q) ||
        entry.projectName.toLowerCase().includes(q) ||
        (entry.notes && entry.notes.toLowerCase().includes(q)) ||
        entry.date.includes(q) ||
        formatShortDate(entry.date).includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Calculate totals
  const totalHoursWorked = filtered.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
  const totalShifts = filtered.length;
  const completedShifts = filtered.filter((e) => e.status === 'completed').length;
  const overtimeHours = filtered.reduce(
    (acc, curr) => acc + (curr.totalHours > 8 ? curr.totalHours - 8 : 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-8">
      {/* Role notice banner */}
      {!isAdminOrManager ? (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3 text-xs text-slate-800">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              <strong className="text-slate-900 font-bold">My Timesheets:</strong> You only see your own time entries and accumulated hours.
            </span>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white text-slate-800 border border-slate-300 shrink-0 shadow-2xs">
            {currentUser.name}
          </span>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3 text-xs text-slate-800">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              <strong className="text-slate-900 font-bold">Full Audit ({currentUser.systemRole === 'admin' ? 'Administrator' : 'Manager'}):</strong> You can view, filter and export the hours of every worker in the company.
            </span>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white text-blue-800 border border-blue-200 shrink-0 shadow-2xs">
            All Workers
          </span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            {isAdminOrManager ? 'Total Hours (Team)' : 'My Total Hours'}
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-800 mt-1 tabular-nums">
            {totalHoursWorked.toFixed(2)}h
          </div>
          <span className="text-xs text-slate-500 font-medium mt-0.5">In the selected period</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Overtime (&gt;8h)
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-700 mt-1 tabular-nums">
            {overtimeHours.toFixed(2)}h
          </div>
          <span className="text-xs text-slate-500 font-medium mt-0.5">Extended shifts</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            {isAdminOrManager ? 'Total Shifts' : 'My Shifts'}
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-1 tabular-nums">
            {totalShifts}
          </div>
          <span className="text-xs text-slate-500 font-medium mt-0.5">
            {completedShifts} completed · {totalShifts - completedShifts} active
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Daily Average
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-blue-700 mt-1 tabular-nums">
            {completedShifts > 0 ? (totalHoursWorked / completedShifts).toFixed(1) : '0.0'}h
          </div>
          <span className="text-xs text-slate-500 font-medium mt-0.5">Per completed shift</span>
        </div>
      </div>

      {/* Control Bar: Filters, Export, and Manual Entry */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3.5 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                isAdminOrManager
                  ? 'Search by employee, project or notes...'
                  : 'Search my entries...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => {
                onLoadFullHistory();
                setShowExport(true);
              }}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-700" />
              <span>Export CSV</span>
            </button>

            {isAdminOrManager && (needsReviewCount > 0 || reviewOnly) && (
              <button
                onClick={() => setReviewOnly(!reviewOnly)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-2 transition-colors cursor-pointer ${
                  reviewOnly
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Needs review ({needsReviewCount})</span>
              </button>
            )}

            {isAdminOrManager && (
              <button
                onClick={onOpenManualEntry}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Manual Entry</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns & Period selector */}
        <div className={`grid grid-cols-1 gap-3 pt-2 border-t border-slate-200 ${isAdminOrManager ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {/* Period selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setPeriodFilter('all')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                periodFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPeriodFilter('today')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                periodFilter === 'today'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriodFilter('week')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                periodFilter === 'week'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setPeriodFilter('month')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                periodFilter === 'month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setPeriodFilter('custom')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                periodFilter === 'custom'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Dates
            </button>
          </div>

          {/* Employee dropdown: ONLY shown to Admin/Manager */}
          {isAdminOrManager ? (
            <select
              value={filters.employeeId}
              onChange={(e) => updateFilters({ employeeId: e.target.value })}
              className="bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="all">All employees ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Worker:</span>
              <span className="font-bold text-slate-900 truncate">{currentUser.name}</span>
            </div>
          )}

          {/* Project dropdown */}
          <select
            value={filters.projectId}
            onChange={(e) => updateFilters({ projectId: e.target.value })}
            className="bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="all">All sites / projects ({projects.length})</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name} ({proj.code})
              </option>
            ))}
          </select>

          {isAdminOrManager && (
            <select
              value={filters.staffType}
              onChange={(e) => updateFilters({ staffType: e.target.value })}
              className="bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="all">All staff types</option>
              <option value="Internal Team">Internal Team</option>
              <option value="CPR">CPR</option>
              <option value="ASP Contratista">ASP Contractors</option>
            </select>
          )}
        </div>

        {periodFilter === 'custom' && (
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <label className="text-xs font-bold text-slate-700 sm:flex sm:items-center sm:gap-2">
              From
              <input
                type="date"
                value={filters.from}
                onChange={(e) => updateFilters({ from: e.target.value })}
                className="w-full sm:w-auto mt-1 sm:mt-0 bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold font-mono text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </label>
            <label className="text-xs font-bold text-slate-700 sm:flex sm:items-center sm:gap-2">
              To
              <input
                type="date"
                value={filters.to}
                onChange={(e) => updateFilters({ to: e.target.value })}
                className="w-full sm:w-auto mt-1 sm:mt-0 bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold font-mono text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </label>
          </div>
        )}
      </div>

      {showExport && (
        <ExportCsvModal
          totalCount={visibleEntries.length}
          filteredCount={filtered.length}
          filters={filters}
          onFiltersChange={updateFilters}
          employees={employees}
          projects={projects}
          isAdminOrManager={isAdminOrManager}
          onClose={() => setShowExport(false)}
          onExport={(columns, onlyFiltered) => {
            exportEntriesToCSV(onlyFiltered ? filtered : visibleEntries, columns, employees, projects);
            setShowExport(false);
          }}
        />
      )}

      {/* Timesheets Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 font-extrabold">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                {isAdminOrManager && <th className="py-3.5 px-4">Employee</th>}
                <th className="py-3.5 px-4">Site / Project</th>
                <th className="py-3.5 px-4">Clock In</th>
                <th className="py-3.5 px-4">Clock Out</th>
                <th className="py-3.5 px-4">Total Hours</th>
                <th className="py-3.5 px-4">Status</th>
                {isAdminOrManager && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdminOrManager ? 8 : 6} className="py-12 text-center text-slate-600 font-medium">
                    No time entries found for this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => {
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setDetailsId(entry.id)}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono font-semibold whitespace-nowrap text-slate-900">
                        {formatShortDate(entry.date)}
                        {entry.isManual && (
                          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            Manual
                          </span>
                        )}
                      </td>

                      {/* Employee (visible if admin/manager) */}
                      {isAdminOrManager && (
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 whitespace-nowrap">
                            {entry.employeeName}
                          </div>
                          <div className="text-xs text-slate-600 font-medium">{entry.employeeRole}</div>
                        </td>
                      )}

                      {/* Project */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 font-bold whitespace-nowrap">
                          {entry.projectName}
                        </div>
                        {entry.notes && (
                          <div
                            className={`text-xs mt-0.5 truncate max-w-[220px] font-medium ${
                              entry.isAutoClockOut
                                ? 'text-rose-700 font-bold'
                                : 'text-slate-600'
                            }`}
                            title={entry.notes}
                          >
                            {entry.notes}
                          </div>
                        )}
                        {entry.locationIn && (
                          <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                            <MapPin className="w-3 h-3 text-blue-700 shrink-0" />
                            <span className="truncate max-w-[150px]">
                              {entry.locationIn.addressName}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Clock In */}
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap text-emerald-800">
                        {formatTimeDisplay(entry.clockInTime, zoneOf(entry))}
                      </td>

                      {/* Clock Out */}
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap text-slate-800">
                        {entry.clockOutTime ? (
                          formatTimeDisplay(entry.clockOutTime, zoneOf(entry))
                        ) : (
                          <span className="text-blue-700 font-sans text-xs font-bold">
                            On shift...
                          </span>
                        )}
                      </td>

                      {/* Total Hours */}
                      <td className="py-3.5 px-4 font-mono font-black whitespace-nowrap tabular-nums text-slate-900">
                        {entry.totalHours > 0 ? (
                          <span
                            className={
                              entry.totalHours > 8
                                ? 'text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200'
                                : 'text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200'
                            }
                          >
                            {entry.totalHours.toFixed(2)}h
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-xs">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                              entry.status === 'completed'
                                ? 'bg-slate-100 text-slate-800 border-slate-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            {entry.status === 'completed' ? 'Completed' : 'Active'}
                          </span>
                          {entry.isAutoClockOut && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 font-mono inline-flex items-center gap-1">
                              <Radio className="w-2.5 h-2.5 text-rose-600" />
                              Auto Geofence
                            </span>
                          )}
                          {entry.needsReview && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                              <ClipboardCheck className="w-2.5 h-2.5 text-amber-700" />
                              Auto closed · Review
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions (Only Admin/Manager) */}
                      {isAdminOrManager && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {entry.status === 'completed' && (
                            <button
                              onClick={() => openReview(entry)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                entry.needsReview
                                  ? 'text-amber-700 hover:text-amber-900 hover:bg-amber-50'
                                  : 'text-slate-500 hover:text-blue-700 hover:bg-blue-50'
                              }`}
                              title="Review / correct shift times"
                            >
                              <ClipboardCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to delete the entry for ${entry.employeeName} on ${formatShortDate(entry.date)}?`
                                )
                              ) {
                                onDeleteEntry(entry.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailsEntry && (
        <ShiftDetails
          entry={detailsEntry}
          site={projects.find((p) => p.id === detailsEntry.projectId)}
          canManage={isAdminOrManager}
          onClose={() => setDetailsId(null)}
          onApproveGeofence={() => approveGeofence(detailsEntry)}
          onEditTimes={() => {
            setDetailsId(null);
            openReview(detailsEntry);
          }}
        />
      )}

      {/* Review / correct clock-out (Admin / Manager) */}
      {reviewEntry && (
        <div className="fixed inset-0 z-50 flex overflow-y-auto p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={saveReview}
            className="m-auto w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-black text-slate-900">Review Shift Times</h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {reviewEntry.employeeName} · {formatShortDate(reviewEntry.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewEntry(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold">
                {reviewError}
              </div>
            )}

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Site:</span>
                <span className="font-bold text-slate-900 truncate max-w-[180px]">{reviewEntry.projectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Recorded:</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatTimeDisplay(reviewEntry.clockInTime, zoneOf(reviewEntry))} – {formatTimeDisplay(reviewEntry.clockOutTime, zoneOf(reviewEntry))}
                </span>
              </div>
            </div>

            <div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">Clock-In Time</label>
                  <input
                    type="time"
                    required
                    value={reviewInTime}
                    onChange={(e) => setReviewInTime(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">Clock-Out Time</label>
                  <input
                    type="time"
                    required
                    value={reviewOutTime}
                    onChange={(e) => setReviewOutTime(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Saving recalculates the hours and marks the entry as reviewed.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReviewEntry(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
