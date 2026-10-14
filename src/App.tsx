import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Employee,
  ProjectSite,
  TimeEntry,
  ViewTab,
  LocationStamp,
} from './types';
import {
  getActiveProjectId,
  setActiveProjectId,
  calculateElapsedHours,
} from './utils/storage';
import { supabase, isSupabaseConfigured } from './utils/supabase';
import * as db from './utils/db';
import { getDistanceMeters, watchLocation } from './utils/geo';
import { sound } from './utils/audio';
import { AlertTriangle, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { ClockPunchCard } from './components/ClockPunchCard';
import { WhoIsWorking } from './components/WhoIsWorking';
import { TimesheetsView } from './components/TimesheetsView';
import { TeamManagement } from './components/TeamManagement';
import { ManualEntryModal } from './components/ManualEntryModal';
import { LoginScreen } from './components/LoginScreen';

const StatusScreen: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-4 font-sans bg-gradient-to-br from-[#f0f6ff] via-[#ffffff] to-[#e8f1fc] text-slate-900">
    <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xl shadow-blue-900/5 space-y-3 text-center">
      <h1 className="text-sm font-bold text-slate-900">{title}</h1>
      {children}
    </div>
  </div>
);

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<ProjectSite[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  // Supabase Auth session
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const userId = session?.user.id;

  // Employee whose punch card is on screen when an admin/manager opens someone else's ('' = self)
  const [activeEmployeeId, setActiveEmpId] = useState<string>('');
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

  // Drops responses from reloads that were superseded by a newer one
  const reloadSeqRef = useRef(0);

  // Only recent time entries are loaded until someone asks for the full history
  const [fullHistory, setFullHistory] = useState(false);
  const fullHistoryRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    const seq = ++reloadSeqRef.current;
    try {
      const all = await db.fetchAll({ fullHistory: fullHistoryRef.current });
      if (seq !== reloadSeqRef.current) return;
      setEmployees(all.employees);
      setProjects(all.projects);
      setEntries(all.entries);
      setDataLoaded(true);
    } catch (err) {
      if (seq !== reloadSeqRef.current) return;
      console.error(err);
      setSyncError('Could not load data from the server.');
      setDataLoaded(true);
    }
  }, []);

  // Merge one realtime change into local state
  const applyChange = useCallback((change: db.RowChange) => {
    const merge = <T extends { id: string }>(list: T[], record: T | undefined, prepend: boolean): T[] => {
      if (!record) return list.filter((item) => item.id !== change.id);
      if (list.some((item) => item.id === change.id)) {
        return list.map((item) => (item.id === change.id ? record : item));
      }
      return prepend ? [record, ...list] : [...list, record];
    };
    if (change.table === 'employees') setEmployees((prev) => merge(prev, change.record, false));
    else if (change.table === 'projects') setProjects((prev) => merge(prev, change.record, false));
    else setEntries((prev) => merge(prev, change.record, true));
  }, []);

  // Timesheets "All": fetch the complete history once
  const loadFullHistory = useCallback(() => {
    if (fullHistoryRef.current) return;
    fullHistoryRef.current = true;
    setFullHistory(true);
    reload();
  }, [reload]);

  // Load data on sign-in and keep it in sync with changes made from other devices
  useEffect(() => {
    if (!userId) {
      reloadSeqRef.current++;
      setEmployees([]);
      setProjects([]);
      setEntries([]);
      setDataLoaded(false);
      setActiveEmpId('');
      fullHistoryRef.current = false;
      setFullHistory(false);
      return;
    }
    reload();
    // Each change arrives with its row, so it is merged in place instead of re-downloading every table
    let subscribedBefore = false;
    const channel = supabase
      .channel('cpr-clock-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const change = db.toRowChange(payload);
        if (change) applyChange(change);
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        // After a dropped connection (phone asleep, network change) changes may have been missed
        if (subscribedBefore) reload();
        subscribedBefore = true;
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, reload, applyChange]);

  // Persist a change to Supabase; local state was already updated optimistically
  const sync = (write: () => Promise<void>) => {
    write().catch((err) => {
      console.error(err);
      setSyncError(
        `Could not save the change: ${err?.message || 'unknown error'}. Data was restored from the server.`
      );
      reload();
    });
  };

  // Employee record linked to the signed-in account
  const currentUser = useMemo(() => {
    if (!userId) return null;
    return employees.find((e) => e.userId === userId) || null;
  }, [employees, userId]);

  // Current active employee object
  const activeEmployee = useMemo(() => {
    return employees.find((e) => e.id === activeEmployeeId) || currentUser;
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

  // Logout handler
  const handleLogout = () => {
    supabase.auth.signOut();
  };

  // Open another employee's punch card (admin / manager)
  const handleSelectEmployee = (emp: Employee) => {
    setActiveEmpId(emp.id);
    if (emp.activeProjectId) {
      setActiveProjId(emp.activeProjectId);
    }
  };

  // Switch tab; going to the punch tab always returns to the signed-in user's own card
  const handleSelectTab = (tab: ViewTab) => {
    if (tab === 'punch') setActiveEmpId('');
    setCurrentTab(tab);
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
    const newShiftId = crypto.randomUUID();
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
      device: 'CPR Portal',
      verified: true,
    };

    const updatedEmp: Employee = {
      ...emp,
      status: 'clocked_in',
      currentShiftId: newShiftId,
      activeProjectId: proj.id,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? updatedEmp : e)));

    sync(async () => {
      await db.insertEntry(newEntry);
      await db.updateEmployee(updatedEmp);
    });
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

    const nowIso = new Date().toISOString();

    // Close every open shift of this employee
    const closedEntries: TimeEntry[] = entries
      .filter((entry) => entry.employeeId === emp.id && entry.status === 'active')
      .map((entry) => {
        const { totalDecimalHours, totalBreakMinutes } = calculateElapsedHours(
          entry.clockInTime,
          nowIso,
          entry.breakPeriods
        );
        return {
          ...entry,
          clockOutTime: nowIso,
          status: 'completed' as const,
          totalBreakMinutes,
          totalHours: totalDecimalHours,
          notes: notes ? (entry.notes ? `${entry.notes} | ${notes}` : notes) : entry.notes,
          locationOut: location,
          isAutoClockOut: isAutoClockOut || false,
        };
      });

    const updatedEmp: Employee = {
      ...emp,
      status: 'clocked_out',
      currentShiftId: undefined,
      activeProjectId: undefined,
    };

    setEntries((prev) =>
      prev.map((entry) => closedEntries.find((c) => c.id === entry.id) || entry)
    );
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? updatedEmp : e)));

    sync(async () => {
      for (const closed of closedEntries) {
        await db.updateEntry(closed);
      }
      await db.updateEmployee(updatedEmp);
    });
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
          `[AUTOMATIC GEOFENCE CLOCK-OUT] Employee detected ${dist}m from the site (allowed radius: ${currentSite.geofenceRadius}m)`,
          loc,
          true
        );
        setGeofenceAlertModal({
          employeeName: currentUser.name,
          siteName: currentSite.name,
          distance: dist,
          radius: currentSite.geofenceRadius!,
          time: new Date().toLocaleTimeString('en-AU', {
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
      id: crypto.randomUUID(),
    };
    setEntries((prev) => [newEntry, ...prev]);
    sync(() => db.insertEntry(newEntry));
  };

  // Delete entry
  const handleDeleteEntry = (id: string) => {
    const entryToDelete = entries.find((e) => e.id === id);
    setEntries((prev) => prev.filter((e) => e.id !== id));

    // If deleting an ongoing shift, reset employee to clocked out
    const owner =
      entryToDelete && entryToDelete.status === 'active'
        ? employees.find((emp) => emp.id === entryToDelete.employeeId)
        : undefined;
    const resetOwner: Employee | undefined = owner && {
      ...owner,
      status: 'clocked_out',
      currentShiftId: undefined,
    };
    if (resetOwner) {
      setEmployees((prev) => prev.map((emp) => (emp.id === resetOwner.id ? resetOwner : emp)));
    }

    sync(async () => {
      await db.deleteEntry(id);
      if (resetOwner) await db.updateEmployee(resetOwner);
    });
  };

  // Add new employee (creates a pending invitation; the worker sets their own password)
  const handleAddEmployee = (empData: Omit<Employee, 'id' | 'status'>) => {
    const newEmp: Employee = {
      ...empData,
      id: crypto.randomUUID(),
      status: 'clocked_out',
      invitationStatus: 'pending',
    };
    setEmployees((prev) => [...prev, newEmp]);
    sync(() => db.insertEmployee(newEmp));
  };

  // Delete employee
  const handleDeleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    if (activeEmployeeId === id) setActiveEmpId('');
    sync(() => db.deleteEmployee(id));
  };

  // Update employee
  const handleUpdateEmployee = (updatedEmp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
    sync(() => db.updateEmployee(updatedEmp));
  };

  // Add new project
  const handleAddProject = (projData: Omit<ProjectSite, 'id'>) => {
    const newProj: ProjectSite = {
      ...projData,
      id: crypto.randomUUID(),
    };
    setProjects((prev) => [...prev, newProj]);
    sync(() => db.insertProject(newProj));
  };

  // Delete project
  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId === id && projects.length > 1) {
      const next = projects.find((p) => p.id !== id);
      if (next) setActiveProjId(next.id);
    }
    sync(() => db.deleteProject(id));
  };

  // Update existing project site
  const handleUpdateProject = (updatedProj: ProjectSite) => {
    setProjects((prev) => prev.map((p) => (p.id === updatedProj.id ? updatedProj : p)));
    sync(() => db.updateProject(updatedProj));
  };

  // Filter recent entries for the active employee
  const recentEntriesForActive = useMemo(() => {
    if (!activeEmployee) return [];
    return entries.filter((e) => e.employeeId === activeEmployee.id);
  }, [entries, activeEmployee]);

  if (!isSupabaseConfigured) {
    return (
      <StatusScreen title="Supabase is not configured">
        <p className="text-xs text-slate-600">
          Create the <code className="font-mono">.env.local</code> file with{' '}
          <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> (see README) and restart the app.
        </p>
      </StatusScreen>
    );
  }

  if (!authReady) {
    return <StatusScreen title="Loading..." />;
  }

  // If no user is authenticated, show login screen
  if (!session) {
    return <LoginScreen />;
  }

  if (!dataLoaded) {
    return <StatusScreen title="Loading data..." />;
  }

  // Signed in, but no employee record is linked to this account (e.g. it was deleted by an admin)
  if (!currentUser) {
    return (
      <StatusScreen title="Your account is not linked to any employee">
        <p className="text-xs text-slate-600">
          {syncError || 'Ask your CPR administrator to add you to the company again.'}
        </p>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </StatusScreen>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gradient-to-br from-[#f0f6ff] via-[#ffffff] to-[#e8f1fc] text-slate-900 selection:bg-blue-500/20 selection:text-blue-600">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        activeEmployee={currentUser}
        onLogout={handleLogout}
        activeCount={activeCount}
      />

      {/* Main App Content Viewport */}
        {syncError && (
          <div className="mx-4 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="flex-1">{syncError}</span>
            <button onClick={() => setSyncError(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'punch' && activeEmployee && (
          <ClockPunchCard
            activeEmployee={activeEmployee}
            isOwnCard={activeEmployee.id === currentUser.id}
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
            onGoToPunchTab={() => handleSelectTab('punch')}
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
            fullHistory={fullHistory}
            onLoadFullHistory={loadFullHistory}
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
            onResetData={reload}
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
        <div className="fixed inset-0 z-50 flex overflow-y-auto p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="m-auto w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-950/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30">
                  CPR Geofence Control
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  Automatic Clock-Out Recorded
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  You have left the permitted area of the work site. Your shift was closed automatically to keep the record accurate.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Employee:</span>
                <span className="font-semibold text-white">{geofenceAlertModal.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Work Site:</span>
                <span className="font-semibold text-white truncate max-w-[200px]">
                  {geofenceAlertModal.siteName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Detected Distance:</span>
                <span className="font-mono font-bold text-rose-400">
                  {geofenceAlertModal.distance} metres
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Allowed Radius:</span>
                <span className="font-mono text-slate-300">
                  {geofenceAlertModal.radius} metres
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                <span className="text-slate-400">Clock-Out Time Recorded:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {geofenceAlertModal.time}
                </span>
              </div>
            </div>

            <button
              onClick={() => setGeofenceAlertModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
