import React, { useState, useEffect } from 'react';
import {
  Building2,
  Play,
  Square,
  CheckCircle2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Employee, ProjectSite, TimeEntry, LocationStamp } from '../types';
import { calculateElapsedHours, formatTimeDisplay, formatDateDisplay } from '../utils/storage';
import { sound } from '../utils/audio';
import { captureCurrentLocation, getDistanceMeters } from '../utils/geo';

interface ClockPunchCardProps {
  activeEmployee: Employee;
  projects: ProjectSite[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  activeShift: TimeEntry | null;
  onClockIn: (projectId: string, notes?: string, location?: LocationStamp) => Promise<void>;
  onClockOut: (notes?: string, location?: LocationStamp, isAuto?: boolean) => Promise<void>;
  recentEntries: TimeEntry[];
}

export const ClockPunchCard: React.FC<ClockPunchCardProps> = ({
  activeEmployee,
  projects,
  activeProjectId,
  onSelectProject,
  activeShift,
  onClockIn,
  onClockOut,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [elapsedString, setElapsedString] = useState<string>('00:00:00');
  const [notes, setNotes] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<'clock_in' | 'clock_out' | null>(null);
  const [gpsLocation, setGpsLocation] = useState<LocationStamp | null>(null);
  const [, setGpsLoading] = useState(false);
  const [lastNotification, setLastNotification] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Live Timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (activeShift && activeShift.clockInTime) {
        const { formatted } = calculateElapsedHours(
          activeShift.clockInTime,
          undefined,
          activeShift.breakPeriods
        );
        setElapsedString(formatted);
      } else {
        setElapsedString('00:00:00');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeShift]);

  // Silently auto-fetch and synchronize GPS location whenever the app opens or window gains focus
  const handleRefreshLocation = async () => {
    setGpsLoading(true);
    try {
      const loc = await captureCurrentLocation();
      if (loc) {
        setGpsLocation(loc);
      }
    } catch {
      // Background silent capture
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    handleRefreshLocation();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRefreshLocation();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleRefreshLocation);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleRefreshLocation);
    };
  }, []);

  const isClockedIn = activeEmployee.status === 'clocked_in';
  const selectedProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  // Geofence Radius calculations (active in background)
  const radius = selectedProject?.geofenceRadius || 150;
  const distanceToProject =
    gpsLocation && selectedProject?.latitude !== undefined && selectedProject?.longitude !== undefined
      ? getDistanceMeters(
          gpsLocation.latitude,
          gpsLocation.longitude,
          selectedProject.latitude,
          selectedProject.longitude
        )
      : null;

  const isOutsidePerimeter = distanceToProject !== null && distanceToProject > radius;

  // Auto-clockout detection in background when clocked in and exiting perimeter
  useEffect(() => {
    if (
      activeEmployee.status === 'clocked_in' &&
      isOutsidePerimeter &&
      selectedProject?.autoClockOut !== false &&
      !loadingAction
    ) {
      handleClockOutAction(true, distanceToProject);
    }
  }, [activeEmployee.status, isOutsidePerimeter, selectedProject?.autoClockOut]);

  const handleClockInAction = async () => {
    if (!selectedProject) return;
    setLoadingAction('clock_in');
    sound.playClockIn();
    try {
      await onClockIn(selectedProject.id, notes, gpsLocation || undefined);
      setLastNotification({
        type: 'success',
        message: `¡Entrada registrada con éxito para ${activeEmployee.name} a las ${formatTimeDisplay(new Date().toISOString())}!`,
      });
      setNotes('');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClockOutAction = async (isAuto = false, distance?: number | null) => {
    setLoadingAction('clock_out');
    if (isAuto) {
      sound.playGeofenceAlert();
    } else {
      sound.playClockOut();
    }
    try {
      const autoNote = isAuto
        ? `[SALIDA AUTOMÁTICA POR GEOCERCA] Colaborador detectado a ${distance || 'más de ' + radius}m fuera del perímetro de ${selectedProject.name}.`
        : undefined;
      const finalNotes = notes ? (autoNote ? `${autoNote} | ${notes}` : notes) : autoNote;

      await onClockOut(finalNotes, gpsLocation || undefined, isAuto);
      setLastNotification({
        type: isAuto ? 'warning' : 'info',
        message: isAuto
          ? `¡Salida automática registrada! Saliste del radio de ${radius}m permitido de ${selectedProject.name} (detectado a ${distance}m).`
          : `¡Salida registrada a las ${formatTimeDisplay(new Date().toISOString())}! Jornada completada.`,
      });
      setNotes('');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 md:pb-6">
      {/* Feedback Toast Banner */}
      {lastNotification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-medium transition-all ${
            lastNotification.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
              : lastNotification.type === 'warning'
              ? 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
              : 'bg-sky-950/80 border border-sky-500/40 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {lastNotification.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span>{lastNotification.message}</span>
          </div>
          <button
            onClick={() => setLastNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 underline ml-2 cursor-pointer"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Main Punch Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        {/* Ambient Top Glow according to status */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700 ${
            isClockedIn ? 'bg-blue-500' : 'bg-sky-400'
          }`}
        />

        {/* 1. Worker Header: Name and adjusted small Internal Team badge (User badge removed) */}
        <div className="flex items-center justify-between gap-3 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl ${activeEmployee.avatarBg} flex items-center justify-center text-base font-black text-white shadow-md shrink-0`}
            >
              {activeEmployee.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {activeEmployee.name}
                </h1>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                    isClockedIn
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  {isClockedIn ? '● En Turno' : '○ Fuera de Turno'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-semibold text-slate-700">{activeEmployee.role}</span>
                <span className="text-slate-400 font-bold">·</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                    activeEmployee.contractType === 'Internal Team'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-purple-100 text-purple-900 border-purple-300'
                  }`}
                >
                  {activeEmployee.contractType || 'Internal Team'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Central Display: TIEMPO TRANSCURRIDO */}
        <div className="py-6 sm:py-8 text-center flex flex-col items-center justify-center">
          <div className="inline-flex items-center gap-2 mb-2 bg-blue-50 border border-blue-200 px-3.5 py-1 rounded-full shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isClockedIn ? 'bg-blue-600 animate-ping' : 'bg-slate-500'
              }`}
            />
            <span
              className={`text-xs font-black uppercase tracking-wider ${
                isClockedIn ? 'text-blue-900' : 'text-slate-700'
              }`}
            >
              Tiempo Transcurrido
            </span>
          </div>

          {/* Big Digital Elapsed Time Counter */}
          <div
            className={`text-6xl sm:text-7xl md:text-8xl font-black font-mono tracking-tight tabular-nums py-1 ${
              isClockedIn ? 'text-blue-700' : 'text-slate-900'
            }`}
          >
            {isClockedIn ? elapsedString : '00:00:00'}
          </div>

          {/* Subtext and Context */}
          <div className="mt-2 space-y-0.5">
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              {isClockedIn && activeShift ? (
                <span>
                  Jornada iniciada a las{' '}
                  <strong className="text-blue-800 font-mono font-bold text-sm">
                    {formatTimeDisplay(activeShift.clockInTime)}
                  </strong>
                </span>
              ) : (
                <span>Sin turno activo · Listo para iniciar jornada</span>
              )}
            </p>

            <p className="text-[11px] text-slate-600 font-mono font-medium">
              Hora local: {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · {formatDateDisplay(currentTime.toISOString())}
            </p>
          </div>
        </div>

        {/* 5. Main Action Button: Registrar Salida / Registrar Entrada UBICADO ARRIBA DE SEDE */}
        <div className="pt-2 pb-5">
          {isClockedIn ? (
            <button
              onClick={() => handleClockOutAction(false)}
              disabled={loadingAction !== null}
              className="w-full py-4 sm:py-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-base sm:text-lg shadow-lg shadow-rose-600/30 flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>
                {loadingAction === 'clock_out' ? 'Registrando Salida...' : 'REGISTRAR SALIDA (CLOCK OUT)'}
              </span>
            </button>
          ) : (
            <button
              onClick={handleClockInAction}
              disabled={loadingAction !== null}
              className="w-full py-4 sm:py-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base sm:text-lg shadow-lg shadow-blue-600/30 flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {loadingAction === 'clock_in' ? 'Registrando Entrada...' : 'REGISTRAR ENTRADA (CLOCK IN)'}
              </span>
            </button>
          )}
        </div>

        {/* 2. Sede Ubicación: Que solo salga la dirección */}
        <div className="pt-4 border-t border-slate-200">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-700" />
              Sede / Ubicación
            </label>

            <select
              value={activeProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              disabled={isClockedIn}
              className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-75 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  📍 {proj.address || proj.name}
                </option>
              ))}
            </select>

            <p className="text-xs font-semibold text-slate-700 truncate pl-0.5">
              {selectedProject?.address}
            </p>
          </div>
        </div>

        {/* 7. Notas que salgan al final */}
        <div className="pt-4">
          <div className="bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-300 flex items-start gap-3 focus-within:border-blue-600 focus-within:bg-white transition-colors">
            <FileText className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <input
              type="text"
              placeholder={
                isClockedIn
                  ? 'Notas del turno o reporte de salida (opcional)...'
                  : 'Notas de inicio o tarea a realizar (opcional)...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-900 placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
