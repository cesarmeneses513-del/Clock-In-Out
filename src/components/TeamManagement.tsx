import React, { useState } from 'react';
import {
  Users,
  Building2,
  Plus,
  Trash2,
  Edit3,
  MapPin,
  RefreshCw,
  Mail,
  UserPlus,
  Check,
  X,
  Share2,
  Copy,
  CheckCircle2,
  Link2,
  Radio,
  Navigation,
  Lock,
  Search,
  Compass,
  Shield,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Employee, ProjectSite, contractTypeLabel } from '../types';
import { SiteMapPicker } from './SiteMapPicker';

interface TeamManagementProps {
  currentUser: Employee;
  employees: Employee[];
  projects: ProjectSite[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee?: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onAddProject: (proj: Omit<ProjectSite, 'id'>) => void;
  onUpdateProject?: (proj: ProjectSite) => void;
  onDeleteProject: (id: string) => void;
  onResetData: () => void;
}

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-indigo-600',
];

const RADIUS_PRESETS = [50, 100, 150, 300, 500, 1000];

const EMP_VIEW_MODE_KEY = 'cpr_clock_employees_view_v1';

const roleBadgeFor = (emp: Employee) =>
  emp.systemRole === 'admin'
    ? { label: 'Administrator', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
    : emp.systemRole === 'manager'
    ? { label: 'Manager', color: 'bg-blue-100 text-blue-900 border-blue-300' }
    : { label: 'Employee', color: 'bg-slate-100 text-slate-800 border-slate-300' };

export const TeamManagement: React.FC<TeamManagementProps> = ({
  currentUser,
  employees,
  projects,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onResetData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'projects'>('employees');

  // Employee list search & filters (Admin / Manager)
  const [empSearch, setEmpSearch] = useState('');
  const [empRoleFilter, setEmpRoleFilter] = useState<'all' | 'admin' | 'manager' | 'employee'>('all');
  const [empContractFilter, setEmpContractFilter] = useState<'all' | 'Internal Team' | 'ASP Contratista'>('all');
  const [empAccessFilter, setEmpAccessFilter] = useState<'all' | 'active' | 'pending'>('all');

  // Employee list layout, remembered on this device
  const [empViewMode, setEmpViewMode] = useState<'list' | 'grid'>(() => {
    try {
      return localStorage.getItem(EMP_VIEW_MODE_KEY) === 'grid' ? 'grid' : 'list';
    } catch {
      return 'list';
    }
  });
  const changeEmpViewMode = (mode: 'list' | 'grid') => {
    setEmpViewMode(mode);
    try {
      localStorage.setItem(EMP_VIEW_MODE_KEY, mode);
    } catch {
      // Storage blocked (private mode): the choice just is not remembered
    }
  };

  const isAdminOrManager = currentUser.systemRole === 'admin' || currentUser.systemRole === 'manager';
  const isOnlyAdmin = currentUser.systemRole === 'admin';

  // Add Employee Modal state
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('Site Worker');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empContractType, setEmpContractType] = useState<'Internal Team' | 'ASP Contratista'>('Internal Team');
  const [empSystemRole, setEmpSystemRole] = useState<'admin' | 'manager' | 'employee'>('employee');
  const [empAssignedProject, setEmpAssignedProject] = useState<string>(projects[0]?.id || '');
  const [empColor, setEmpColor] = useState(AVATAR_COLORS[0]);

  // Edit Employee Modal state
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Invite modal state (to share the generated registration link)
  const [inviteModalData, setInviteModalData] = useState<{
    name: string;
    email: string;
    role: string;
    siteName?: string;
    inviteUrl: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Project Form Modal state (Create & Edit)
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projName, setProjName] = useState('');
  const [projCode, setProjCode] = useState('');
  const [projAddress, setProjAddress] = useState('');
  const [projClient, setProjClient] = useState('CPR Facade Upgrades');
  const [projLatitude, setProjLatitude] = useState('');
  const [projLongitude, setProjLongitude] = useState('');
  const [projRadius, setProjRadius] = useState<number>(150);
  const [projAutoClockOut, setProjAutoClockOut] = useState<boolean>(true);
  const [projActive, setProjActive] = useState<boolean>(true);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsCaptureStatus, setGpsCaptureStatus] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<{ text: string; isError?: boolean } | null>(null);

  // Next sequential site code: CPR-001, CPR-002... (first number not already in use)
  const nextSiteCode = () => {
    const used = new Set(projects.map((p) => p.code.trim().toUpperCase()));
    let n = 1;
    while (used.has(`CPR-${String(n).padStart(3, '0')}`)) n++;
    return `CPR-${String(n).padStart(3, '0')}`;
  };

  const handleOpenAddProject = () => {
    setEditingProjectId(null);
    setProjName('');
    setProjCode(nextSiteCode());
    setProjAddress('');
    setProjClient('CPR Facade Upgrades');
    setProjLatitude('');
    setProjLongitude('');
    setProjRadius(150);
    setProjAutoClockOut(true);
    setProjActive(true);
    setGpsCaptureStatus(null);
    setGeocodeStatus(null);
    setShowProjectModal(true);
  };

  const handleOpenEditProject = (proj: ProjectSite) => {
    setEditingProjectId(proj.id);
    setProjName(proj.name);
    setProjCode(proj.code);
    setProjAddress(proj.address);
    setProjClient(proj.client || 'CPR Facade Upgrades');
    setProjLatitude(proj.latitude !== undefined ? proj.latitude.toString() : '');
    setProjLongitude(proj.longitude !== undefined ? proj.longitude.toString() : '');
    setProjRadius(proj.geofenceRadius || 150);
    setProjAutoClockOut(proj.autoClockOut !== false);
    setProjActive(proj.active !== false);
    setGpsCaptureStatus(null);
    setGeocodeStatus(null);
    setShowProjectModal(true);
  };

  const handleGeocodeAddress = async () => {
    if (!projAddress.trim()) {
      setGeocodeStatus({ text: 'Please enter an address or reference first.', isError: true });
      return;
    }
    const typedCoords = projAddress.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (typedCoords) {
      setProjLatitude(parseFloat(typedCoords[1]).toFixed(6));
      setProjLongitude(parseFloat(typedCoords[2]).toFixed(6));
      setGeocodeStatus({ text: 'Coordinates set from the values you typed.' });
      return;
    }
    setIsGeocoding(true);
    setGeocodeStatus(null);
    try {
      const query = encodeURIComponent(projAddress.trim());
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
        headers: {
          'Accept-Language': 'en',
        },
      });
      if (!res.ok) throw new Error('Could not reach the geocoding server');
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        setProjLatitude(lat.toFixed(6));
        setProjLongitude(lon.toFixed(6));
        const shortName = item.display_name ? item.display_name.split(',').slice(0, 3).join(', ') : '';
        setGeocodeStatus({
          text: `Coordinates found (${lat.toFixed(4)}, ${lon.toFixed(4)}): ${shortName}`,
        });
      } else {
        setGeocodeStatus({
          text: 'No exact coordinates were found for this address. You can enter them manually or use the "Use my current location" button.',
          isError: true,
        });
      }
    } catch {
      setGeocodeStatus({
        text: 'Could not look up the address online. You can enter the coordinates manually or use your current location.',
        isError: true,
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setGpsCaptureStatus('Geolocation is not available in this browser');
      return;
    }
    setIsCapturingGps(true);
    setGpsCaptureStatus('Detecting GPS satellites...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsCapturingGps(false);
        const lat = pos.coords.latitude.toFixed(6);
        const lon = pos.coords.longitude.toFixed(6);
        setProjLatitude(lat);
        setProjLongitude(lon);
        setGpsCaptureStatus(`GPS captured: ${lat}, ${lon} (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        setIsCapturingGps(false);
        setGpsCaptureStatus(`Could not get GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim()) return;

    const emailTrimmed = empEmail.trim().toLowerCase();

    onAddEmployee({
      name: empName.trim(),
      role: empRole.trim(),
      contractType: empContractType,
      systemRole: empSystemRole,
      activeProjectId: empAssignedProject,
      avatarBg: empColor,
      email: emailTrimmed,
      phone: empPhone.trim() || undefined,
      status: 'clocked_out',
      invitationStatus: 'pending',
      hourlyRate: 25,
    });

    const origin = window.location.origin;
    const siteObj = projects.find((p) => p.id === empAssignedProject);
    setInviteModalData({
      name: empName.trim(),
      email: emailTrimmed,
      role: empRole.trim(),
      siteName: siteObj?.name || 'CPR Site',
      inviteUrl: `${origin}/?activate=${encodeURIComponent(emailTrimmed)}`,
    });
    setCopiedLink(false);

    setEmpName('');
    setEmpEmail('');
    setEmpPhone('');
    setShowAddEmployee(false);
  };

  const handleShareExistingEmployeeInvite = (emp: Employee) => {
    const origin = window.location.origin;
    const siteObj = projects.find((p) => p.id === emp.activeProjectId);
    setInviteModalData({
      name: emp.name,
      email: emp.email || '',
      role: emp.role,
      siteName: siteObj?.name || 'CPR Site',
      inviteUrl: `${origin}/?activate=${encodeURIComponent(emp.email || '')}`,
    });
    setCopiedLink(false);
  };

  // Undefined while the site has no location (no geofence: workers can clock in from anywhere)
  const hasProjLocation = Number.isFinite(parseFloat(projLatitude)) && Number.isFinite(parseFloat(projLongitude));
  const mapLatitude = hasProjLocation ? parseFloat(projLatitude) : undefined;
  const mapLongitude = hasProjLocation ? parseFloat(projLongitude) : undefined;

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;

    const lat = mapLatitude;
    const lon = mapLongitude;

    if (editingProjectId && onUpdateProject) {
      const existing = projects.find((p) => p.id === editingProjectId);
      if (existing) {
        onUpdateProject({
          ...existing,
          name: projName.trim(),
          code: projCode.trim() || existing.code,
          address: projAddress.trim() || 'On-site address',
          client: projClient.trim(),
          active: projActive,
          latitude: lat,
          longitude: lon,
          geofenceRadius: projRadius,
          autoClockOut: projAutoClockOut,
        });
      }
    } else {
      onAddProject({
        name: projName.trim(),
        code: projCode.trim() || nextSiteCode(),
        address: projAddress.trim() || 'On-site address',
        client: projClient.trim(),
        active: projActive,
        latitude: lat,
        longitude: lon,
        geofenceRadius: projRadius,
        autoClockOut: projAutoClockOut,
      });
    }

    setShowProjectModal(false);
    setEditingProjectId(null);
  };

  const empQuery = empSearch.trim().toLowerCase();
  const visibleEmployees = (isAdminOrManager ? employees : employees.filter((e) => e.id === currentUser.id)).filter(
    (emp) =>
      !isAdminOrManager ||
      ((!empQuery ||
        emp.name.toLowerCase().includes(empQuery) ||
        (emp.email || '').toLowerCase().includes(empQuery) ||
        emp.role.toLowerCase().includes(empQuery)) &&
        (empRoleFilter === 'all' || emp.systemRole === empRoleFilter) &&
        (empContractFilter === 'all' || emp.contractType === empContractFilter) &&
        (empAccessFilter === 'all' ||
          (empAccessFilter === 'active' ? emp.invitationStatus === 'active' : emp.invitationStatus !== 'active')))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-8">
      {/* Top Header & Subtabs */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-xs">
        {/* Subtabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('employees')}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'employees'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isAdminOrManager ? `Employees (${employees.length})` : 'My Profile'}</span>
          </button>
          {isAdminOrManager && (
            <button
              onClick={() => setActiveSubTab('projects')}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                activeSubTab === 'projects'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Sites & Projects ({projects.length})</span>
            </button>
          )}
        </div>

        {/* Action Button: Only visible to Admin/Manager */}
        {isAdminOrManager && (
          <div className="flex items-center gap-2">
            {activeSubTab === 'employees' ? (
              <button
                onClick={() => setShowAddEmployee(true)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-white" />
                <span>Invite Employee</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddProject}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>New Site / Project</span>
              </button>
            )}

            <button
              onClick={() => onResetData()}
              className="p-2 text-xs rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 transition-colors cursor-pointer shadow-2xs"
              title="Refresh data from the server"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Employee search & filters (Admin / Manager) */}
      {activeSubTab === 'employees' && isAdminOrManager && (
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email or position..."
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:flex">
            <select
              value={empRoleFilter}
              onChange={(e) => setEmpRoleFilter(e.target.value as typeof empRoleFilter)}
              className="bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="all">All roles</option>
              <option value="admin">Administrators</option>
              <option value="manager">Managers</option>
              <option value="employee">Employees</option>
            </select>
            <select
              value={empContractFilter}
              onChange={(e) => setEmpContractFilter(e.target.value as typeof empContractFilter)}
              className="bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="all">All contracts</option>
              <option value="Internal Team">Internal Team</option>
              <option value="ASP Contratista">ASP Contractors</option>
            </select>
            <select
              value={empAccessFilter}
              onChange={(e) => setEmpAccessFilter(e.target.value as typeof empAccessFilter)}
              className="bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="all">All accounts</option>
              <option value="active">Signed up</option>
              <option value="pending">Pending activation</option>
            </select>
            <div className="col-span-3 justify-self-end flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200 shrink-0 self-center">
              <button
                onClick={() => changeEmpViewMode('list')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  empViewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => changeEmpViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  empViewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Card view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 1: Employees as a table (Admin / Manager) */}
      {activeSubTab === 'employees' && isAdminOrManager && empViewMode === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {visibleEmployees.length === 0 ? (
            <div className="py-12 text-center text-sm font-medium text-slate-600">
              No employees match the search or filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 font-extrabold">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Contract</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Password</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleEmployees.map((emp) => {
                    const roleBadge = roleBadgeFor(emp);
                    const showInvite = emp.invitationStatus !== 'active';
                    const showEditDelete = emp.id !== currentUser.id;
                    return (
                      <tr key={emp.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-lg ${emp.avatarBg} flex items-center justify-center text-xs font-black text-white shrink-0`}
                            >
                              {emp.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 whitespace-nowrap">{emp.name}</div>
                              <div className="text-slate-600 font-medium whitespace-nowrap">{emp.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              emp.contractType === 'Internal Team'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-purple-100 text-purple-900 border-purple-300'
                            }`}
                          >
                            {contractTypeLabel(emp.contractType)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {emp.email || 'No email'}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {emp.invitationStatus === 'pending' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              Pending activation
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                              Set
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {showInvite && (
                              <button
                                onClick={() => handleShareExistingEmployeeInvite(emp)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                                title="Share invitation / password link"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>Invite / Link</span>
                              </button>
                            )}
                            {showEditDelete && (
                              <>
                                <button
                                  onClick={() => setEditingEmployee(emp)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Edit employee"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete ${emp.name}?`)) {
                                      onDeleteEmployee(emp.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete employee"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Subtab 1: Employees as cards (always for a worker's own profile) */}
      {activeSubTab === 'employees' && (!isAdminOrManager || empViewMode === 'grid') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleEmployees.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm font-medium text-slate-600 bg-white rounded-3xl border border-slate-200">
              No employees match the search or filters.
            </div>
          )}
          {visibleEmployees.map((emp) => {
            // Invite links are only useful until the person has created their password
            const showInvite = isAdminOrManager && emp.invitationStatus !== 'active';
            const showEditDelete = isAdminOrManager && emp.id !== currentUser.id;
            const roleBadge = roleBadgeFor(emp);

            return (
              <div
                key={emp.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-300 transition-all shadow-xs hover:shadow-md group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl ${emp.avatarBg} flex items-center justify-center text-sm font-black text-white shadow-xs shrink-0`}
                      >
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{emp.name}</h3>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{emp.role}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadge.color}`}
                    >
                      {roleBadge.label}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-xs">
                    {/* Contract type */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Contract:</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          emp.contractType === 'Internal Team'
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-purple-100 text-purple-900 border-purple-300'
                        }`}
                      >
                        {contractTypeLabel(emp.contractType)}
                      </span>
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Email:</span>
                      <span className="font-mono text-xs text-slate-800 font-semibold truncate max-w-[170px]">
                        {emp.email || 'No email'}
                      </span>
                    </div>

                    {emp.openSiteAccess === true && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Open sites:</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                          Allowed
                        </span>
                      </div>
                    )}

                    {/* Password activation state */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Password:</span>
                      {emp.invitationStatus === 'pending' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          Pending activation
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Set
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card actions footer */}
                {(showInvite || showEditDelete) && (
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {showInvite && (
                      <button
                        onClick={() => handleShareExistingEmployeeInvite(emp)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Share invitation / password link"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Invite / Link</span>
                      </button>
                    )}
                  </div>

                  {showEditDelete && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingEmployee(emp)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Edit employee"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${emp.name}?`)) {
                            onDeleteEmployee(emp.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete employee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Subtab 2: Project Sites List */}
      {activeSubTab === 'projects' && isAdminOrManager && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 transition-all shadow-xs hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold text-blue-800 whitespace-nowrap">
                      {proj.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 truncate">{proj.name}</h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditProject(proj)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Edit site and geofence"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete the site ${proj.name}?`)) {
                          onDeleteProject(proj.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete site"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {proj.address && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span className="truncate">{proj.address}</span>
                  </div>
                )}

                <div className="mt-3">
                  {proj.active !== false ? (
                    <span className="text-[10px] text-emerald-900 font-bold px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300">
                      Active Site
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-700 font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Employee Modal (Admin / Manager only) */}
      {showAddEmployee && isAdminOrManager && (
        <div className="fixed inset-0 z-50 flex overflow-y-auto p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="m-auto w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Invite New Employee</h2>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    The worker will create their password when they sign in with their email.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddEmployee(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3.5">
              {/* Email */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Worker Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  The employee will use this email to activate their account and set their password.
                </p>
              </div>

              {/* Full name */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Smith"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Role selector */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  System Role / Access Level
                </label>
                <select
                  value={empSystemRole}
                  onChange={(e) => setEmpSystemRole(e.target.value as any)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="employee">Employee (own time entries only)</option>
                  <option value="manager">Manager (team and site supervision)</option>
                  <option value="admin">Administrator (full system control)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">
                    Staff Type
                  </label>
                  <select
                    value={empContractType}
                    onChange={(e) => setEmpContractType(e.target.value as any)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="Internal Team">Internal Team</option>
                    <option value="ASP Contratista">ASP Contractor</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">
                    Position / Trade
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Facade Installer"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Phone (WhatsApp, optional)
                </label>
                <input
                  type="tel"
                  placeholder="+61 4XX XXX XXX"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1.5">
                  Avatar Colour
                </label>
                <div className="flex items-center gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEmpColor(c)}
                      className={`w-7 h-7 rounded-xl ${c} flex items-center justify-center transition-all cursor-pointer ${
                        empColor === c ? 'ring-2 ring-blue-600 ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {empColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Security notice regarding employee creating own password */}
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-800">
                  <Shield className="w-4 h-4" />
                  <span>Security and Passwords</span>
                </div>
                <p className="text-slate-600 font-medium">
                  You do not need to assign a password. Saving creates an invitation so the worker can sign in and set their own private password.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddEmployee(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Mail className="w-4 h-4 text-white" />
                  <span>Send Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex overflow-y-auto p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="m-auto w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-black text-slate-900">Edit Employee</h2>
              <button
                onClick={() => setEditingEmployee(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingEmployee) {
                  if (onUpdateEmployee) {
                    onUpdateEmployee(editingEmployee);
                  }
                  setEditingEmployee(null);
                }
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">Position</label>
                <input
                  type="text"
                  required
                  value={editingEmployee.role}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">System Role</label>
                  <select
                    value={editingEmployee.systemRole || 'employee'}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, systemRole: e.target.value as any })}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">Contract</label>
                  <select
                    value={editingEmployee.contractType || 'Internal Team'}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, contractType: e.target.value as any })}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="Internal Team">Internal Team</option>
                    <option value="ASP Contratista">ASP Contractor</option>
                  </select>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  id="openSiteAccessCheck"
                  checked={editingEmployee.openSiteAccess === true}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, openSiteAccess: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded accent-blue-600 cursor-pointer"
                />
                <label htmlFor="openSiteAccessCheck" className="text-xs text-slate-800 cursor-pointer">
                  <strong className="text-slate-900 block font-bold">Can clock in at sites without a location</strong>
                  <span className="text-xs text-slate-600 block mt-0.5 font-medium">
                    Lets this person use sites that have no geofence, such as "Multiples Location", from anywhere. Administrators always can.
                  </span>
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">Email</label>
                <input
                  type="email"
                  value={editingEmployee.email || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">Phone</label>
                <input
                  type="tel"
                  value={editingEmployee.phone || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invitation Success / Share Dialog */}
      {inviteModalData && (
        <div className="fixed inset-0 z-50 flex overflow-y-auto p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="m-auto w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Invitation Ready</h3>
                  <p className="text-xs text-slate-600 font-medium">
                    The employee can now create their password.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInviteModalData(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Employee details summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Employee:</span>
                <span className="font-bold text-slate-900">{inviteModalData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Registered Email:</span>
                <span className="font-mono text-blue-800 font-bold truncate max-w-[200px]">
                  {inviteModalData.email}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Position:</span>
                <span className="text-slate-800 font-semibold">{inviteModalData.role}</span>
              </div>
              {inviteModalData.siteName && (
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Assigned Site:</span>
                  <span className="text-slate-800 font-semibold truncate max-w-[180px]">
                    {inviteModalData.siteName}
                  </span>
                </div>
              )}
            </div>

            {/* Direct Activation Link Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-blue-700" />
                <span>Direct Activation Link:</span>
              </label>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 break-all select-all flex items-center justify-between gap-2">
                <span className="truncate">{inviteModalData.inviteUrl}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(inviteModalData.inviteUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 3000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Share action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Hi ${inviteModalData.name}, you have been added to CPR Clock. Activate your account and create your password here: ${inviteModalData.inviteUrl}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Share2 className="w-4 h-4 text-white" />
                <span>Send via WhatsApp</span>
              </a>

              <a
                href={`mailto:${inviteModalData.email}?subject=${encodeURIComponent(
                  'CPR Clock Invitation - Create Your Password'
                )}&body=${encodeURIComponent(
                  `Hi ${inviteModalData.name},\n\nYou have been registered on the CPR Facade Upgrade Specialists time and attendance platform.\n\nPlease click the link below to create your personal password:\n${inviteModalData.inviteUrl}\n\nWelcome to the team!`
                )}`}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Mail className="w-4 h-4 text-white" />
                <span>Send Email</span>
              </a>
            </div>

            <p className="text-xs text-slate-600 text-center font-medium">
              The employee can also go to the sign-in screen and choose <strong className="text-slate-900">"Set your password"</strong>, entering their registered email.
            </p>

            <button
              onClick={() => setInviteModalData(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
            >
              Done, close
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Project Modal with Geofence & Radius */}
      {showProjectModal && isAdminOrManager && (
        <div className="fixed inset-0 z-50 flex overflow-y-auto p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="m-auto w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    {editingProjectId ? 'Configure Site and Geofence' : 'New Site / Project'}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">
                    Set the perimeter and radius for automatic geofence clock-out
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowProjectModal(false);
                  setEditingProjectId(null);
                }}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="text-xs text-slate-900 font-bold block mb-1">
                  Project / Site Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CPR Project - North Tower"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-900 font-bold block mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CPR-005"
                    value={projCode}
                    onChange={(e) => setProjCode(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-900 font-bold block mb-1">Client / Area</label>
                  <input
                    type="text"
                    placeholder="e.g. CPR Facade Upgrades"
                    value={projClient}
                    onChange={(e) => setProjClient(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-900 font-bold">
                    Site Address or Reference
                  </label>
                  {isOnlyAdmin && (
                    <button
                      type="button"
                      onClick={handleGeocodeAddress}
                      disabled={isGeocoding || !projAddress.trim()}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 transition-all disabled:opacity-50 cursor-pointer"
                      title="Get GPS coordinates automatically from this address"
                    >
                      <Search className={`w-3 h-3 ${isGeocoding ? 'animate-spin' : ''}`} />
                      <span>{isGeocoding ? 'Searching GPS...' : 'Get Coordinates from Address'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. 123 George St, Sydney NSW 2000"
                  value={projAddress}
                  onChange={(e) => {
                    setProjAddress(e.target.value);
                    if (geocodeStatus) setGeocodeStatus(null);
                  }}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                />
                {geocodeStatus && (
                  <div
                    className={`mt-1.5 p-2 rounded-xl text-xs flex items-start gap-1.5 ${
                      geocodeStatus.isError
                        ? 'bg-rose-50 text-rose-900 border border-rose-300 font-semibold'
                        : 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                    }`}
                  >
                    <Compass className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{geocodeStatus.text}</span>
                  </div>
                )}
                <div className="mt-2 space-y-1.5">
                  <SiteMapPicker
                    latitude={mapLatitude}
                    longitude={mapLongitude}
                    radius={projRadius}
                    editable={isOnlyAdmin}
                    onPick={(lat, lon) => {
                      setProjLatitude(lat.toFixed(6));
                      setProjLongitude(lon.toFixed(6));
                      setGpsCaptureStatus(null);
                    }}
                  />
                  <div className="flex items-center justify-between gap-2">
                    {mapLatitude !== undefined && mapLongitude !== undefined ? (
                      <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-2">
                        {mapLatitude.toFixed(6)}, {mapLongitude.toFixed(6)}
                        {isOnlyAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setProjLatitude('');
                              setProjLongitude('');
                              setGeocodeStatus(null);
                              setGpsCaptureStatus(null);
                            }}
                            className="font-sans text-rose-700 hover:text-rose-900 underline cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-800">
                        No location set: workers can clock in here from anywhere
                      </span>
                    )}
                    {isOnlyAdmin && (
                      <button
                        type="button"
                        onClick={handleCaptureGps}
                        disabled={isCapturingGps}
                        className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        <Navigation className={`w-3 h-3 ${isCapturingGps ? 'animate-spin' : ''}`} />
                        <span>{isCapturingGps ? 'Getting GPS...' : 'Use my current location'}</span>
                      </button>
                    )}
                  </div>
                  {gpsCaptureStatus && (
                    <p className="text-xs text-emerald-800 font-mono font-bold">{gpsCaptureStatus}</p>
                  )}
                  {isOnlyAdmin && (
                    <p className="text-xs text-slate-600 font-medium">
                      Search the address, then click the map or drag the pin to fine-tune. The circle is the geofence.
                    </p>
                  )}
                </div>
              </div>

              {/* Geofence control (admin only) */}
              {isOnlyAdmin ? (
                <>
                  {/* Geofence radius */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Radio className="w-4 h-4 text-blue-700" />
                        Geofence Radius (Metres)
                      </span>
                      <span className="text-xs font-mono font-black text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-300">
                        {projRadius} metres
                      </span>
                    </div>

                    {/* Preset buttons */}
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1.5">Quick values:</span>
                      <div className="grid grid-cols-6 gap-1.5">
                        {RADIUS_PRESETS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setProjRadius(r)}
                            className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                              projRadius === r
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {r}m
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom radius input */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Or enter a custom radius (in metres):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={10}
                          max={10000}
                          value={projRadius}
                          onChange={(e) => setProjRadius(Math.max(10, parseInt(e.target.value) || 10))}
                          className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                        />
                        <span className="absolute right-9 top-1/2 -translate-y-1/2 text-xs text-slate-600 font-mono font-bold">
                          metres
                        </span>
                      </div>
                    </div>

                    {/* Auto Clock Out Toggle */}
                    <div className="pt-2 border-t border-slate-200 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="autoClockOutCheck"
                        checked={projAutoClockOut}
                        onChange={(e) => setProjAutoClockOut(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded accent-blue-600 cursor-pointer"
                      />
                      <label htmlFor="autoClockOutCheck" className="text-xs text-slate-800 cursor-pointer">
                        <strong className="text-slate-900 block font-bold">
                          Clock out automatically when the person leaves the area
                        </strong>
                        <span className="text-xs text-slate-600 block mt-0.5 font-medium">
                          If the employee leaves the {projRadius} metre radius while on shift, the system will clock them out automatically with a geofence note.
                        </span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Lock className="w-4 h-4 text-blue-700 shrink-0" />
                    <span className="text-xs font-bold text-slate-900">
                      Geofence and Coordinates Control (Administrator Only)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Only the system Administrator can configure or change the GPS coordinates and geofence radius of this site.
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-xs font-mono font-bold text-slate-800">
                    <span>Current radius: <strong className="text-blue-800">{projRadius}m</strong></span>
                    <span>·</span>
                    <span>Automatic clock-out: <strong className={projAutoClockOut ? 'text-emerald-800' : 'text-slate-600'}>{projAutoClockOut ? 'On' : 'Off'}</strong></span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="siteActiveCheck"
                  checked={projActive}
                  onChange={(e) => setProjActive(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded accent-blue-600 cursor-pointer"
                />
                <label htmlFor="siteActiveCheck" className="text-xs text-slate-800 cursor-pointer">
                  <strong className="text-slate-900 block font-bold">Active site</strong>
                  <span className="text-xs text-slate-600 block mt-0.5 font-medium">
                    Inactive sites are hidden from the time clock, so nobody can clock in there.
                  </span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectModal(false);
                    setEditingProjectId(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  {editingProjectId ? 'Update Site' : 'Save Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
