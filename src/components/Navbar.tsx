import React from 'react';
import { Clock, Users, FileSpreadsheet, Settings2, LogOut, Shield } from 'lucide-react';
import { ViewTab, Employee } from '../types';

interface NavbarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  activeEmployee: Employee | null;
  onOpenEmployeeSwitch?: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  activeCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeEmployee,
  onOpenProfile,
  onLogout,
  activeCount,
}) => {
  const isAdminOrManager = activeEmployee?.systemRole === 'admin' || activeEmployee?.systemRole === 'manager';

  const roleBadge = activeEmployee
    ? activeEmployee.systemRole === 'admin'
      ? { label: 'Admin', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      : activeEmployee.systemRole === 'manager'
      ? { label: 'Manager', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      : { label: 'Employee', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    : null;

  return (
    <>
      {/* Top Header - White with Blue Corporate Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 text-slate-900 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Zone 1: Brand title wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30 text-white">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
                CPR Clock In/Out
              </span>
            </div>
          </div>

          {/* Zone 2: Desktop clean text navigation links */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl border border-slate-300 bg-slate-100">
            <button
              onClick={() => onSelectTab('punch')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                currentTab === 'punch'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-800 hover:text-blue-700 hover:bg-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Time Clock
            </button>
            <button
              onClick={() => onSelectTab('who_is_working')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                currentTab === 'who_is_working'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-800 hover:text-blue-700 hover:bg-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              {isAdminOrManager ? 'On Shift (Team)' : 'My Shift'}
              {isAdminOrManager && activeCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full">
                  {activeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onSelectTab('timesheets')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                currentTab === 'timesheets'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-800 hover:text-blue-700 hover:bg-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {isAdminOrManager ? 'All Timesheets' : 'My Timesheets'}
            </button>
            <button
              onClick={() => onSelectTab('team_projects')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                currentTab === 'team_projects'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-800 hover:text-blue-700 hover:bg-white'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              {isAdminOrManager ? 'Team & Sites' : 'My Profile'}
            </button>
          </nav>

          {/* Zone 3: Active Worker Profile & LogOut */}
          <div className="flex items-center gap-2.5">
            {activeEmployee && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenProfile}
                  title="My profile"
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-left shadow-2xs transition-colors cursor-pointer"
                >
                  <div
                    className={`w-7 h-7 rounded-lg ${activeEmployee.avatarBg} flex items-center justify-center text-xs font-black text-white shadow-xs`}
                  >
                    {activeEmployee.name.charAt(0)}
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-slate-900 truncate max-w-[120px]">
                        {activeEmployee.name}
                      </span>
                      {roleBadge && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${roleBadge.color}`}>
                          {roleBadge.label}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-700 truncate max-w-[130px] font-medium">
                      {activeEmployee.role}
                    </span>
                  </div>
                </button>

                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 transition-colors cursor-pointer shadow-2xs"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Thumb Zone) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-md">
        <div className="grid grid-cols-4 items-center h-16 max-w-lg mx-auto">
          <button
            onClick={() => onSelectTab('punch')}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              currentTab === 'punch' ? 'text-blue-700 font-bold' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-tight mt-1">Time Clock</span>
          </button>
          <button
            onClick={() => onSelectTab('who_is_working')}
            className={`flex flex-col items-center justify-center h-full relative transition-colors ${
              currentTab === 'who_is_working' ? 'text-blue-700 font-bold' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-tight mt-1">
              {isAdminOrManager ? 'On Shift' : 'My Shift'}
            </span>
            {isAdminOrManager && activeCount > 0 && (
              <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-emerald-600" />
            )}
          </button>
          <button
            onClick={() => onSelectTab('timesheets')}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              currentTab === 'timesheets' ? 'text-blue-700 font-bold' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-tight mt-1">Timesheets</span>
          </button>
          <button
            onClick={() => onSelectTab('team_projects')}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              currentTab === 'team_projects' ? 'text-blue-700 font-bold' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Settings2 className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-tight mt-1">
              {isAdminOrManager ? 'Team' : 'Profile'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
