import React, { useState } from 'react';
import { X, Calendar, Clock, Building2, User, FileText, CheckCircle2 } from 'lucide-react';
import { Employee, ProjectSite, TimeEntry } from '../types';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  projects: ProjectSite[];
  onSubmitEntry: (entry: Omit<TimeEntry, 'id'>) => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  employees,
  projects,
  onSubmitEntry,
}) => {
  const [employeeId, setEmployeeId] = useState<string>(employees[0]?.id || '');
  const [projectId, setProjectId] = useState<string>(projects[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [clockInTime, setClockInTime] = useState<string>('08:00');
  const [clockOutTime, setClockOutTime] = useState<string>('17:00');
  const [notes, setNotes] = useState<string>('Manual entry / adjustment');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emp = employees.find((e) => e.id === employeeId);
    const proj = projects.find((p) => p.id === projectId);

    if (!emp || !proj) {
      setError('Select a valid employee and project');
      return;
    }

    const clockInIso = `${date}T${clockInTime}:00`;
    const clockOutIso = `${date}T${clockOutTime}:00`;

    const startMs = new Date(clockInIso).getTime();
    const endMs = new Date(clockOutIso).getTime();

    if (endMs <= startMs) {
      setError('Clock-out time must be after clock-in time');
      return;
    }

    const grossDiffMinutes = (endMs - startMs) / (1000 * 60);
    const totalHours = Number((grossDiffMinutes / 60).toFixed(2));

    onSubmitEntry({
      employeeId: emp.id,
      employeeName: emp.name,
      employeeRole: emp.role,
      projectId: proj.id,
      projectName: proj.name,
      clockInTime: clockInIso,
      clockOutTime: clockOutIso,
      date,
      totalHours,
      status: 'completed',
      breakPeriods: [],
      totalBreakMinutes: 0,
      isManual: true,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-black text-slate-900">Add Manual Entry</h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Record past hours or missed punches
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Employee */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-700" />
              Employee
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-700" />
              Project / Site
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} ({proj.code})
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-700" />
              Shift Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
            />
          </div>

          {/* Clock-in and clock-out times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-700" />
                Clock-In Time
              </label>
              <input
                type="time"
                value={clockInTime}
                onChange={(e) => setClockInTime(e.target.value)}
                className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-700" />
                Clock-Out Time
              </label>
              <input
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                required
              />
            </div>
          </div>

          {/* Reason / Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-600" />
              Reason or Justification
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Forgot to clock out, approved by supervisor..."
              className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Entry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
