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
import { formatTimeDisplay, exportEntriesToCSV, calculateElapsedHours } from '../utils/storage';

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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>(fullHistory ? 'all' : 'month');

  const [reviewOnly, setReviewOnly] = useState(false);

  // Entry whose clock-out an admin is correcting, and the HH:MM typed for it
  const [reviewEntry, setReviewEntry] = useState<TimeEntry | null>(null);
  const [reviewOutTime, setReviewOutTime] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const isAdminOrManager = currentUser.systemRole === 'admin' || currentUser.systemRole === 'manager';

  const openReview = (entry: TimeEntry) => {
    const out = new Date(entry.clockOutTime || entry.clockInTime);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setReviewOutTime(`${pad(out.getHours())}:${pad(out.getMinutes())}`);
    setReviewError(null);
    setReviewEntry(entry);
  };

  const saveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewEntry) return;
    const [hours, minutes] = reviewOutTime.split(':').map(Number);
    // Same calendar day as the clock-in, at the corrected time
    const out = new Date(reviewEntry.clockInTime);
    out.setHours(hours, minutes, 0, 0);
    if (isNaN(out.getTime()) || out.getTime() <= new Date(reviewEntry.clockInTime).getTime()) {
      setReviewError('Clock-out time must be after clock-in time');
      return;
    }
    const outIso = out.toISOString();
    const { totalDecimalHours, totalBreakMinutes } = calculateElapsedHours(
      reviewEntry.clockInTime,
      outIso,
      reviewEntry.breakPeriods
    );
    onUpdateEntry({
      ...reviewEntry,
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

  // Filtered dataset
  const needsReviewCount = visibleEntries.filter((e) => e.needsReview).length;

  const filtered = visibleEntries.filter((entry) => {
    if (reviewOnly && !entry.needsReview) return false;

    // Employee filter
    if (selectedEmployeeId !== 'all' && entry.employeeId !== selectedEmployeeId) {
      return false;
    }

    // Project filter
    if (selectedProjectId !== 'all' && entry.projectId !== selectedProjectId) {
      return false;
    }

    // Period filter
    if (periodFilter !== 'all') {
      const entryDate = new Date(entry.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (periodFilter === 'today') {
        const entryStr = entry.date;
        const todayStr = today.toISOString().split('T')[0];
        if (entryStr !== todayStr) return false;
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
        entry.date.includes(q);
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
              onClick={() => exportEntriesToCSV(filtered)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-700" />
              <span>{isAdminOrManager ? 'Export to Excel (CSV)' : 'Download My Hours (CSV)'}</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
          {/* Period selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                setPeriodFilter('all');
                onLoadFullHistory();
              }}
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
          </div>

          {/* Employee dropdown: ONLY shown to Admin/Manager */}
          {isAdminOrManager ? (
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
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
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="all">All sites / projects ({projects.length})</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name} ({proj.code})
              </option>
            ))}
          </select>
        </div>
      </div>

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
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono font-semibold whitespace-nowrap text-slate-900">
                        {entry.date}
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
                        {formatTimeDisplay(entry.clockInTime)}
                      </td>

                      {/* Clock Out */}
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap text-slate-800">
                        {entry.clockOutTime ? (
                          formatTimeDisplay(entry.clockOutTime)
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
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {entry.status === 'completed' && (
                            <button
                              onClick={() => openReview(entry)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                entry.needsReview
                                  ? 'text-amber-700 hover:text-amber-900 hover:bg-amber-50'
                                  : 'text-slate-500 hover:text-blue-700 hover:bg-blue-50'
                              }`}
                              title="Review / correct clock-out time"
                            >
                              <ClipboardCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to delete the entry for ${entry.employeeName} on ${entry.date}?`
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

      {/* Review / correct clock-out (Admin / Manager) */}
      {reviewEntry && (
        <div className="fixed inset-0 z-50 flex overflow-y-auto p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={saveReview}
            className="m-auto w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-black text-slate-900">Review Clock-Out</h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {reviewEntry.employeeName} · {reviewEntry.date}
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
                <span className="text-slate-600 font-medium">Clock in:</span>
                <span className="font-mono font-bold text-emerald-800">{formatTimeDisplay(reviewEntry.clockInTime)}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">Clock-Out Time</label>
              <input
                type="time"
                required
                value={reviewOutTime}
                onChange={(e) => setReviewOutTime(e.target.value)}
                className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
              />
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
