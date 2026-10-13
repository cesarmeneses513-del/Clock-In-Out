import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Employee,
  ProjectSite,
  TimeEntry,
  ViewTab,
  LocationStamp,
} from './types';
import {
  getStoredEmployees,
  saveStoredEmployees,
  getStoredProjects,
  saveStoredProjects,
  getStoredEntries,
  saveStoredEntries,
  getActiveEmployeeId,
  setActiveEmployeeId,
  getActiveProjectId,
  setActiveProjectId,
  DEFAULT_EMPLOYEES,
  DEFAULT_PROJECTS,
  DEFAULT_ENTRIES,
  calculateElapsedHours,
} from './utils/storage';
import { getDistanceMeters, watchLocation } from './utils/geo';
import { sound } from './utils/audio';
import { Radio, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { ClockPunchCard } from './components/ClockPunchCard';
import { WhoIsWorking } from './components/WhoIsWorking';
import { TimesheetsView } from './components/TimesheetsView';
import { TeamManagement } from './components/TeamManagement';
import { ManualEntryModal } from './components/ManualEntryModal';
import { LoginScreen } from './components/LoginScreen';

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>(() => getStoredEmployees());
  const [projects, setProjects] = useState<ProjectSite[]>(() => getStoredProjects());
  const [entries, setEntries] = useState<TimeEntry[]>(() => getStoredEntries());

  // User session state
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    if (typeof window === 'undefined') return null;
    const allEmps = getStoredEmployees();
    const savedUserId = localStorage.getItem('cpr_clock_current_user_id');
    if (savedUserId) {
      const found = allEmps.find((e) => e.id === savedUserId);
      if (found) return found;
    }
    // Return César Meneses (admin) by default so app is immediately interactive or login
    return allEmps[0] || null;
  });

  const [activeEmployeeId, setActiveEmpId] = useState<string>(() => {
    return currentUser?.id || getActiveEmployeeId();
  });
  const [activeProjectId, setActiveProjId] = useState<string>(() => getActiveProjectId());

  const [currentTab, setCurrentTab] = useState<ViewTab>('punch');
  const [showManualEntryModal, setShowManualEntryModal] = useState<boolean>(false);

  // Modal alert when automatic clock-out is triggered by geofence exit
  const [geofenceAlertModal, setGeofenceAlertModal] = useState<{
    employeeName: string;
    siteName: string;
    distance: number;
    radius: number;
    time: string;
  } | null>(null);

  // Prevent multiple duplicate auto-clockout triggers
  const isAutoClockingOutRef = useRef(false);

  // Sync state to local storage whenever updated
  useEffect(() => {
    saveStoredEmployees(employees);
  }, [employees]);

  useEffect(() => {
    saveStoredProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveStoredEntries(entries);
  }, [entries]);

  // Sync currentUser with employees updates
  useEffect(() => {
    if (currentUser) {
      const updated = employees.find((e) => e.id === currentUser.id);
      if (updated) {
        setCurrentUser(updated);
      }
    }
  }, [employees]);

  // Current active employee object
  const activeEmployee = useMemo(() => {
    return currentUser || employees.find((e) => e.id === activeEmployeeId) || employees[0] || null;
  }, [employees, currentUser, activeEmployeeId]);

  // Current active shift for the active employee (if in turn)
  const activeShift = useMemo(() => {
    if (!activeEmployee) return null;
    return (
      entries.find(
        (e) =>
          e.employeeId === activeEmployee.id &&
          e.status === 'active'
      ) || null
    );
  }, [entries, activeEmployee]);

  // Count active workers currently on clock
  const activeCount = useMemo(() => {
    return employees.filter((e) => e.status === 'clocked_in').length;
  }, [employees]);

  // Login handler
  const handleLogin = (emp: Employee) => {
    setCurrentUser(emp);
    setActiveEmpId(emp.id);
    setActiveEmployeeId(emp.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cpr_clock_current_user_id', emp.id);
    }
    if (emp.activeProjectId) {
      setActiveProjId(emp.activeProjectId);
      setActiveProjectId(emp.activeProjectId);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cpr_clock_current_user_id');
    }
  };

  // Switch active employee / profile
  const handleSelectEmployee = (emp: Employee) => {
    handleLogin(emp);
  };

  // Switch active project
  const handleSelectProject = (projId: string) => {
    setActiveProjId(projId);
    setActiveProjectId(projId);
  };

  // Clock In handler
  const handleClockIn = async (
    targetEmpId: string,
    projectId: string,
    notes?: string,
    location?: LocationStamp
  ) => {
    const emp = employees.find((e) => e.id === targetEmpId);
    const proj = projects.find((p) => p.id === projectId);
    if (!emp || !proj) return;

    const now = new Date();
    const newShiftId = `shift-${Date.now()}`;
    const dateStr = now.toISOString().split('T')[0];

    const newEntry: TimeEntry = {
      id: newShiftId,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeRole: emp.role,
      projectId: proj.id,
      projectName: proj.name,
      date: dateStr,
      clockInTime: now.toISOString(),
      status: 'active',
      breakPeriods: [],
      totalBreakMinutes: 0,
      totalHours: 0,
      notes: notes || undefined,
      locationIn: location,
      device: 'Portal CPR',
      verified: true,
    };

    // Update entries list
    setEntries((prev) => [newEntry, ...prev]);

    // Update employee status
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === emp.id
          ? {
              ...e,
              status: 'clocked_in',
              currentShiftId: newShiftId,
              activeProjectId: proj.id,
            }
          : e
      )
    );
  };

  // Clock Out handler
  const handleClockOut = async (
    targetEmpId: string,
    notes?: string,
    location?: LocationStamp,
    isAutoClockOut?: boolean
  ) => {
    const emp = employees.find((e) => e.id === targetEmpId);
    if (!emp) return;

    const now = new Date();
    const nowIso = now.toISOString();

    // Find shift to close
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.employeeId === emp.id && entry.status === 'active') {
          const { totalDecimalHours, totalBreakMinutes } = calculateElapsedHours(
            entry.clockInTime,
            nowIso,
            entry.breakPeriods
          );

          return {
            ...entry,
            clockOutTime: nowIso,
            status: 'completed',
            totalBreakMinutes,
            totalHours: totalDecimalHours,
            notes: notes ? (entry.notes ? `${entry.notes} | ${notes}` : notes) : entry.notes,
            locationOut: location,
            isAutoClockOut: isAutoClockOut || false,
          };
        }
        return entry;
      })
    );

    // Update employee status
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === emp.id
          ? {
              ...e,
              status: 'clocked_out',
              currentShiftId: undefined,
              activeProjectId: undefined,
            }
          : e
      )
    );
  };

  // Background monitoring: if employee is clocked in and site has geofence with autoClockOut
  useEffect(() => {
    if (!currentUser || currentUser.status !== 'clocked_in') {
      isAutoClockingOutRef.current = false;
      return;
    }

    const currentShift = entries.find(
      (e) => e.employeeId === currentUser.id && e.status === 'active'
    );
    if (!currentShift) return;

    const currentSite = projects.find(
      (p) => p.id === (currentUser.activeProjectId || currentShift.projectId)
    );

    if (
      !currentSite ||
      currentSite.latitude === undefined ||
      currentSite.longitude === undefined ||
      !currentSite.geofenceRadius ||
      currentSite.autoClockOut === false
    ) {
      return;
    }

    const unwatch = watchLocation((loc) => {
      if (isAutoClockingOutRef.current) return;

      const dist = getDistanceMeters(
        loc.latitude,
        loc.longitude,
        currentSite.latitude!,
        currentSite.longitude!
      );

      if (dist > currentSite.geofenceRadius!) {
        isAutoClockingOutRef.current = true;
        sound.playGeofenceAlert();
        handleClockOut(
          currentUser.id,
          `[SALIDA AUTOMÁTICA POR GEOCERCA] Colaborador detectado a ${dist}m de la sede (radio permitido: ${currentSite.geofenceRadius}m)`,
          loc,
          true
        );
        setGeofenceAlertModal({
          employeeName: currentUser.name,
          siteName: currentSite.name,
          distance: dist,
          radius: currentSite.geofenceRadius!,
          time: new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        });
      }
    });

    return () => {
      unwatch();
    };
  }, [currentUser?.status, currentUser?.id, currentUser?.activeProjectId, entries, projects]);

  // Manual entry submission
  const handleAddManualEntry = (entry: Omit<TimeEntry, 'id'>) => {
    const newEntry: TimeEntry = {
      ...entry,
      id: `shift-manual-${Date.now()}`,
    };
    setEntries((prev) => [newEntry, ...prev]);
  };

  // Delete entry
  const handleDeleteEntry = (id: string) => {
    const entryToDelete = entries.find((e) => e.id === id);
    setEntries((prev) => prev.filter((e) => e.id !== id));

    // If deleting an ongoing shift, reset employee to clocked out
    if (entryToDelete && entryToDelete.status === 'active') {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === entryToDelete.employeeId
            ? { ...emp, status: 'clocked_out', currentShiftId: undefined }
            : emp
        )
      );
    }
  };

  // Add new employee
  const handleAddEmployee = (empData: Omit<Employee, 'id' | 'status'>) => {
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`,
      status: 'clocked_out',
    };
    setEmployees((prev) => [...prev, newEmp]);
  };

  // Delete employee
  const handleDeleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    if (activeEmployeeId === id && employees.length > 1) {
      const next = employees.find((e) => e.id !== id);
      if (next) setActiveEmpId(next.id);
    }
  };

  // Update employee
  const handleUpdateEmployee = (updatedEmp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
    if (currentUser?.id === updatedEmp.id) {
      setCurrentUser(updatedEmp);
    }
  };

  // Add new project
  const handleAddProject = (projData: Omit<ProjectSite, 'id'>) => {
    const newProj: ProjectSite = {
      ...projData,
      id: `proj-${Date.now()}`,
    };
    setProjects((prev) => [...prev, newProj]);
  };

  // Delete project
  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId === id && projects.length > 1) {
      const next = projects.find((p) => p.id !== id);
      if (next) setActiveProjId(next.id);
    }
  };

  // Update existing project site
  const handleUpdateProject = (updatedProj: ProjectSite) => {
    setProjects((prev) => prev.map((p) => (p.id === updatedProj.id ? updatedProj : p)));
  };

  // Reset to default CPR sample data
  const handleResetData = () => {
    setEmployees(DEFAULT_EMPLOYEES);
    setProjects(DEFAULT_PROJECTS);
    setEntries(DEFAULT_ENTRIES);
    setActiveEmpId(DEFAULT_EMPLOYEES[0].id);
    setActiveProjId(DEFAULT_PROJECTS[0].id);
    setCurrentUser(DEFAULT_EMPLOYEES[0]);
  };

  // Filter recent entries for the active employee
  const recentEntriesForActive = useMemo(() => {
    if (!activeEmployee) return [];
    return entries.filter((e) => e.employeeId === activeEmployee.id);
  }, [entries, activeEmployee]);

  // User registration handler
  const handleRegister = (newEmp: Employee) => {
    setEmployees((prev) => [...prev, newEmp]);
    handleLogin(newEmp);
  };

  // Activate invited employee (set password & login)
  const handleActivateEmployee = (employeeId: string, password: string) => {
    const pin = password.replace(/\D/g, '').substring(0, 6) || password;
    let activatedEmp: Employee | null = null;
    setEmployees((prev) =>
      prev.map((e) => {
        if (e.id === employeeId) {
          activatedEmp = {
            ...e,
            password,
            pin,
            invitationStatus: 'active',
          };
          return activatedEmp;
        }
        return e;
      })
    );
    if (activatedEmp) {
      handleLogin(activatedEmp);
    }
  };

  // If no user is authenticated, show login screen
  if (!currentUser) {
    return (
      <LoginScreen
        employees={employees}
        projects={projects}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onActivateEmployee={handleActivateEmployee}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gradient-to-br from-[#f0f6ff] via-[#ffffff] to-[#e8f1fc] text-slate-900 selection:bg-blue-500/20 selection:text-blue-600">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeEmployee={currentUser}
        onLogout={handleLogout}
        activeCount={activeCount}
      />

      {/* Main App Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'punch' && activeEmployee && (
          <ClockPunchCard
            activeEmployee={activeEmployee}
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectProject}
            activeShift={activeShift}
            onClockIn={(projId, notes, loc) =>
              handleClockIn(activeEmployee.id, projId, notes, loc)
            }
            onClockOut={(notes, loc, isAuto) =>
              handleClockOut(activeEmployee.id, notes, loc, isAuto)
            }
            recentEntries={recentEntriesForActive}
          />
        )}

        {currentTab === 'who_is_working' && (
          <WhoIsWorking
            currentUser={currentUser}
            employees={employees}
            projects={projects}
            entries={entries}
            onSelectEmployeeForPunch={(emp) => {
              handleSelectEmployee(emp);
              setCurrentTab('punch');
            }}
            onGoToPunchTab={() => setCurrentTab('punch')}
          />
        )}

        {currentTab === 'timesheets' && (
          <TimesheetsView
            currentUser={currentUser}
            entries={entries}
            employees={employees}
            projects={projects}
            onOpenManualEntry={() => setShowManualEntryModal(true)}
            onDeleteEntry={handleDeleteEntry}
          />
        )}

        {currentTab === 'team_projects' && (
          <TeamManagement
            currentUser={currentUser}
            employees={employees}
            projects={projects}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onResetData={handleResetData}
          />
        )}
      </main>

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={showManualEntryModal}
        onClose={() => setShowManualEntryModal(false)}
        employees={employees}
        projects={projects}
        onSubmitEntry={handleAddManualEntry}
      />

      {/* Geofence Exit Auto Clock-Out Dialog */}
      {geofenceAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-950/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30">
                  Control de Geocerca CPR
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  Salida Automática Registrada
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Has salido del área permitida de la sede de trabajo. Tu jornada laboral se ha cerrado de manera automática para garantizar la exactitud del registro.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Colaborador:</span>
                <span className="font-semibold text-white">{geofenceAlertModal.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sede de Trabajo:</span>
                <span className="font-semibold text-white truncate max-w-[200px]">
                  {geofenceAlertModal.siteName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Distancia Detectada:</span>
                <span className="font-mono font-bold text-rose-400">
                  {geofenceAlertModal.distance} metros
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Radio Permitido:</span>
                <span className="font-mono text-slate-300">
                  {geofenceAlertModal.radius} metros
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                <span className="text-slate-400">Hora de Salida Registrada:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {geofenceAlertModal.time}
                </span>
              </div>
            </div>

            <button
              onClick={() => setGeofenceAlertModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
