import React, { useEffect, useState } from 'react';
import { Check, Download, X } from 'lucide-react';
import { Employee, ProjectSite } from '../types';
import { DEFAULT_EXPORT_COLUMNS, EXPORT_COLUMNS } from '../utils/exportCsv';

const COLUMNS_KEY = 'cpr_export_columns';

export type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

// The same filters as the timesheets page: changing them here also changes the table
export interface TimesheetFilters {
  period: PeriodFilter;
  from: string; // YYYY-MM-DD, used when period is 'custom'
  to: string;
  employeeId: string; // 'all' or an id
  projectId: string;
  staffType: string; // 'all' or a contract type
}

// The columns chosen last time on this device
const storedColumns = (): string[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(COLUMNS_KEY) || 'null');
    if (Array.isArray(saved)) {
      const valid = saved.filter((k: unknown) => EXPORT_COLUMNS.some((c) => c.key === k));
      if (valid.length > 0) return valid;
    }
  } catch {
    // Private mode or bad data: use the defaults
  }
  return DEFAULT_EXPORT_COLUMNS;
};

interface ExportCsvModalProps {
  totalCount: number;
  filteredCount: number;
  filters: TimesheetFilters;
  onFiltersChange: (change: Partial<TimesheetFilters>) => void;
  employees: Employee[];
  projects: ProjectSite[];
  isAdminOrManager: boolean;
  onClose: () => void;
  onExport: (columns: string[], onlyFiltered: boolean) => void;
}

const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'custom', label: 'Dates' },
];

const selectClass =
  'w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer';

export const ExportCsvModal: React.FC<ExportCsvModalProps> = ({
  totalCount,
  filteredCount,
  filters,
  onFiltersChange,
  employees,
  projects,
  isAdminOrManager,
  onClose,
  onExport,
}) => {
  const [chosen, setChosen] = useState<string[]>(storedColumns);
  const filtered = filteredCount < totalCount;
  const [onlyFiltered, setOnlyFiltered] = useState(filtered);
  // Filters changed here: export what they show
  useEffect(() => setOnlyFiltered(filtered), [filtered]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = (key: string) => setChosen((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));

  const download = () => {
    // Kept in file order, whatever order they were ticked in
    const columns = EXPORT_COLUMNS.map((c) => c.key).filter((k) => chosen.includes(k));
    try {
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns));
    } catch {
      // Not remembered next time; the export still works
    }
    onExport(columns, onlyFiltered);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Filters */}
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-900">Filters</p>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => onFiltersChange({ period: p.value })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    filters.period === p.value ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {filters.period === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] font-bold text-slate-700">
                  From
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(e) => onFiltersChange({ from: e.target.value })}
                    className={`${selectClass} mt-1 font-mono`}
                  />
                </label>
                <label className="text-[11px] font-bold text-slate-700">
                  To
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(e) => onFiltersChange({ to: e.target.value })}
                    className={`${selectClass} mt-1 font-mono`}
                  />
                </label>
              </div>
            )}
            <div className={`grid grid-cols-1 gap-2 ${isAdminOrManager ? 'sm:grid-cols-3' : ''}`}>
              {isAdminOrManager && (
                <select value={filters.employeeId} onChange={(e) => onFiltersChange({ employeeId: e.target.value })} className={selectClass}>
                  <option value="all">All employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              )}
              {isAdminOrManager && (
                <select value={filters.staffType} onChange={(e) => onFiltersChange({ staffType: e.target.value })} className={selectClass}>
                  <option value="all">All staff types</option>
                  <option value="Internal Team">Internal Team</option>
                  <option value="CPR">CPR</option>
                  <option value="ASP Contratista">ASP Contractors</option>
                </select>
              )}
              <select value={filters.projectId} onChange={(e) => onFiltersChange({ projectId: e.target.value })} className={selectClass}>
                <option value="all">All sites</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Which entries */}
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-900">Shifts</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: false, label: `All shifts (${totalCount})` },
                { value: true, label: `Only filtered (${filteredCount})`, disabled: !filtered },
              ].map((o) => (
                <button
                  key={String(o.value)}
                  disabled={o.disabled}
                  onClick={() => setOnlyFiltered(o.value)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default ${
                    onlyFiltered === o.value
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Which columns */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-slate-900">Columns</p>
              <div className="flex gap-3 text-xs">
                <button onClick={() => setChosen(EXPORT_COLUMNS.map((c) => c.key))} className="font-bold text-blue-700 hover:underline cursor-pointer">
                  All
                </button>
                <button onClick={() => setChosen([])} className="font-bold text-slate-600 hover:underline cursor-pointer">
                  None
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {EXPORT_COLUMNS.map((c) => {
                const on = chosen.includes(c.key);
                return (
                  <button
                    key={c.key}
                    onClick={() => toggle(c.key)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-left rounded-lg border transition-colors cursor-pointer ${
                      on ? 'bg-blue-50 border-blue-200 text-slate-900' : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                        on ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {on && <Check className="w-3 h-3 text-white" />}
                    </span>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer">
            Cancel
          </button>
          <button
            onClick={download}
            disabled={chosen.length === 0 || (onlyFiltered ? filteredCount : totalCount) === 0}
            className="px-5 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};
