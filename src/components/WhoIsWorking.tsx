import React, { useState } from 'react';
import {
  Users,
  Search,
  Building2,
  Clock,
  Phone,
  Mail,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { Employee, ProjectSite, TimeEntry } from '../types';
import { calculateElapsedHours, formatTimeDisplay } from '../utils/storage';

interface WhoIsWorkingProps {
  currentUser: Employee;
  employees: Employee[];
  projects: ProjectSite[];
  entries: TimeEntry[];
  onSelectEmployeeForPunch: (employee: Employee) => void;
  onGoToPunchTab: () => void;
}

export const WhoIsWorking: React.FC<WhoIsWorkingProps> = ({
  currentUser,
  employees,
  projects,
  entries,
  onSelectEmployeeForPunch,
  onGoToPunchTab,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'clocked_in' | 'clocked_out'>('all');
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('all');
  const [projectLocationFilter, setProjectLocationFilter] = useState<string>('all');

  const isAdminOrManager = currentUser.systemRole === 'admin' || currentUser.systemRole === 'manager';

  // If standard collaborator, show only personal status
  if (!isAdminOrManager) {
    const activeShift = entries.find(
      (e) => e.employeeId === currentUser.id && e.status === 'active'
    );
    const activeProject = activeShift
      ? projects.find((p) => p.id === activeShift.projectId)
      : null;

    const elapsedInfo =
      activeShift && activeShift.clockInTime
        ? calculateElapsedHours(activeShift.clockInTime, undefined, activeShift.breakPeriods)
        : null;

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-8">
        {/* Main Personal Shift Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl ${currentUser.avatarBg} flex items-center justify-center text-xl font-black text-white shadow-md`}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{currentUser.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-slate-700">{currentUser.role}</span>
                  <span className="text-slate-400 font-bold">·</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      currentUser.contractType === 'Internal Team'
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : 'bg-purple-100 text-purple-900 border-purple-300'
                    }`}
                  >
                    {currentUser.contractType || 'Internal Team'}
                  </span>
                </div>
                <div className="mt-2.5">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      currentUser.status === 'clocked_in'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-slate-100 text-slate-800 border-slate-300'
                    }`}
                  >
                    {currentUser.status === 'clocked_in' ? '● En Turno Activo' : '○ Fuera de Turno'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onGoToPunchTab}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{currentUser.status === 'clocked_in' ? 'Registrar Salida' : 'Registrar Entrada'}</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Shift Details */}
          <div className="py-6 space-y-4">
            {activeShift ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    Sede / Obra Asignada
                  </span>
                  <div className="text-base font-bold text-slate-900">{activeShift.projectName}</div>
                  <p className="text-xs text-slate-600 font-medium">{activeProject?.address || 'Ubicación de trabajo'}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-700" />
                    Hora de Ingreso
                  </span>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {formatTimeDisplay(activeShift.clockInTime)}
                  </div>
                  {elapsedInfo && (
                    <div className="text-xs text-emerald-800 font-mono font-bold">
                      Tiempo transcurrido: {elapsedInfo.formatted}
                    </div>
                  )}
                </div>

                {activeShift.notes && (
                  <div className="col-span-full bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700 block mb-1">Notas del turno:</span>
                    <p className="text-xs text-slate-800 italic font-medium">"{activeShift.notes}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <Clock className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900">No tienes un turno activo en este momento</h3>
                <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
                  Dirígete a la pestaña Marcador para registrar tu entrada oficial cuando inicies labores.
                </p>
                <div className="pt-2">
                  <button
                    onClick={onGoToPunchTab}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                  >
                    Abrir Marcador
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Admin & Manager View: Full Team Attendance Board
  const clockedInCount = employees.filter((e) => e.status === 'clocked_in').length;
  const clockedOutCount = employees.filter((e) => e.status === 'clocked_out').length;

  const filtered = employees.filter((emp) => {
    // Search match
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        (emp.email && emp.email.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && emp.status !== statusFilter) return false;

    // Contract type filter
    if (contractTypeFilter !== 'all' && emp.contractType !== contractTypeFilter) return false;

    // Location filter
    if (projectLocationFilter !== 'all') {
      const shift = entries.find((e) => e.employeeId === emp.id && e.status === 'active');
      if (!shift || shift.projectId !== projectLocationFilter) return false;
    }

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-8">
      {/* Admin header notice */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3 text-xs text-slate-800">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong className="text-slate-900 font-bold">Vista de Supervisión:</strong> Tienes permisos de {currentUser.systemRole === 'admin' ? 'Administrador' : 'Manager'} para visualizar a todos los trabajadores de la empresa.
          </span>
        </div>
        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white text-blue-800 border border-blue-200 shrink-0 shadow-2xs">
          Acceso Total
        </span>
      </div>

      {/* Top Header & Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Total Equipo
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-1">
            {employees.length}
          </div>
          <span className="text-xs text-slate-500 font-medium mt-1">Colaboradores registrados</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            En Turno
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-900 mt-1">
            {clockedInCount}
          </div>
          <span className="text-xs text-emerald-800 font-medium mt-1">Laborando actualmente</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Fuera de Turno
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-800 mt-1">
            {clockedOutCount}
          </div>
          <span className="text-xs text-slate-500 font-medium mt-1">Sin turno activo</span>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-700" />
            Sedes CPR
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-blue-900 mt-1">
            {projects.length}
          </div>
          <span className="text-xs text-blue-800 font-medium mt-1">Centros de trabajo</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          {/* Status Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white'
              }`}
            >
              Todos ({employees.length})
            </button>
            <button
              onClick={() => setStatusFilter('clocked_in')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === 'clocked_in'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              En Turno ({clockedInCount})
            </button>
            <button
              onClick={() => setStatusFilter('clocked_out')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === 'clocked_out'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              Fuera ({clockedOutCount})
            </button>
          </div>
        </div>

        {/* Contract Type and Location filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-xs font-bold text-slate-700 shrink-0">Personal:</span>
            <button
              onClick={() => setContractTypeFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                contractTypeFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setContractTypeFilter('Internal Team')}
              className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                contractTypeFilter === 'Internal Team'
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-800 hover:bg-blue-50'
              }`}
            >
              Internal Team
            </button>
            <button
              onClick={() => setContractTypeFilter('ASP Contratista')}
              className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                contractTypeFilter === 'ASP Contratista'
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-800 hover:bg-purple-50'
              }`}
            >
              ASP Contratistas
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 shrink-0">Sede:</span>
            <select
              value={projectLocationFilter}
              onChange={(e) => setProjectLocationFilter(e.target.value)}
              className="bg-white border-2 border-slate-300 rounded-lg px-3 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="all">Todas las Sedes ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Employees Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm font-medium text-slate-600 bg-white rounded-3xl border border-slate-200">
            No hay colaboradores que coincidan con los filtros seleccionados.
          </div>
        ) : (
          filtered.map((emp) => {
            const activeShift = entries.find(
              (e) => e.employeeId === emp.id && e.status === 'active'
            );
            const elapsedInfo =
              activeShift && activeShift.clockInTime
                ? calculateElapsedHours(activeShift.clockInTime, undefined, activeShift.breakPeriods)
                : null;

            return (
              <div
                key={emp.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-300 transition-all shadow-xs hover:shadow-md group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl ${emp.avatarBg} flex items-center justify-center text-sm font-black text-white shadow-xs shrink-0`}
                      >
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {emp.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-slate-600 font-medium">{emp.role}</p>
                          <span className="text-slate-400 font-bold">·</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              emp.contractType === 'Internal Team'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-purple-100 text-purple-900 border-purple-300'
                            }`}
                          >
                            {emp.contractType || 'Internal Team'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 border ${
                        emp.status === 'clocked_in'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {emp.status === 'clocked_in' ? 'En Turno' : 'Fuera'}
                    </span>
                  </div>

                  {/* Shift Context Info */}
                  <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-xs">
                    {activeShift ? (
                      <>
                        <div className="flex items-center gap-2 text-slate-900">
                          <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                          <span className="truncate font-bold">{activeShift.projectName}</span>
                        </div>

                        <div className="flex items-center justify-between text-slate-700">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            Entrada: {formatTimeDisplay(activeShift.clockInTime)}
                          </span>
                          {elapsedInfo && (
                            <span className="font-mono font-bold text-blue-800 tabular-nums">
                              {elapsedInfo.formatted}
                            </span>
                          )}
                        </div>

                        {activeShift.notes && (
                          <p className="text-xs text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-200 truncate font-medium">
                            "{activeShift.notes}"
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="text-slate-500 text-xs py-2 font-medium">
                        Sin turno activo el día de hoy.
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom CTA */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-600">
                    {emp.phone && (
                      <a
                        href={`tel:${emp.phone}`}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title={emp.phone}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {emp.email && (
                      <a
                        href={`mailto:${emp.email}`}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title={emp.email}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectEmployeeForPunch(emp)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-800 hover:text-white border border-blue-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Ver Marcador
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
