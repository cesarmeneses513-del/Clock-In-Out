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
} from 'lucide-react';
import { Employee, ProjectSite } from '../types';

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

  const isAdminOrManager = currentUser.systemRole === 'admin' || currentUser.systemRole === 'manager';
  const isOnlyAdmin = currentUser.systemRole === 'admin';

  // Add Employee Modal state
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('Colaborador de Obra');
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
  const [projClient, setProjClient] = useState('Constructora CPR');
  const [projLatitude, setProjLatitude] = useState('');
  const [projLongitude, setProjLongitude] = useState('');
  const [projRadius, setProjRadius] = useState<number>(150);
  const [projAutoClockOut, setProjAutoClockOut] = useState<boolean>(true);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsCaptureStatus, setGpsCaptureStatus] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<{ text: string; isError?: boolean } | null>(null);

  const handleOpenAddProject = () => {
    setEditingProjectId(null);
    setProjName('');
    setProjCode(`CPR-${Math.floor(100 + Math.random() * 900)}`);
    setProjAddress('');
    setProjClient('Constructora CPR');
    setProjLatitude('19.4326');
    setProjLongitude('-99.1332');
    setProjRadius(150);
    setProjAutoClockOut(true);
    setGpsCaptureStatus(null);
    setGeocodeStatus(null);
    setShowProjectModal(true);
  };

  const handleOpenEditProject = (proj: ProjectSite) => {
    setEditingProjectId(proj.id);
    setProjName(proj.name);
    setProjCode(proj.code);
    setProjAddress(proj.address);
    setProjClient(proj.client || 'Constructora CPR');
    setProjLatitude(proj.latitude !== undefined ? proj.latitude.toString() : '19.4326');
    setProjLongitude(proj.longitude !== undefined ? proj.longitude.toString() : '-99.1332');
    setProjRadius(proj.geofenceRadius || 150);
    setProjAutoClockOut(proj.autoClockOut !== false);
    setGpsCaptureStatus(null);
    setGeocodeStatus(null);
    setShowProjectModal(true);
  };

  const handleGeocodeAddress = async () => {
    if (!projAddress.trim()) {
      setGeocodeStatus({ text: 'Por favor, ingresa una dirección o referencia primero.', isError: true });
      return;
    }
    setIsGeocoding(true);
    setGeocodeStatus(null);
    try {
      const query = encodeURIComponent(projAddress.trim());
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
        headers: {
          'Accept-Language': 'es,en',
        },
      });
      if (!res.ok) throw new Error('Error al conectar con el servidor geográfico');
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        setProjLatitude(lat.toFixed(6));
        setProjLongitude(lon.toFixed(6));
        const shortName = item.display_name ? item.display_name.split(',').slice(0, 3).join(', ') : '';
        setGeocodeStatus({
          text: `Coordenadas localizadas con éxito (${lat.toFixed(4)}, ${lon.toFixed(4)}): ${shortName}`,
        });
      } else {
        setGeocodeStatus({
          text: 'No se encontraron coordenadas exactas para esta dirección. Puedes ingresarlas manualmente o usar el botón "Usar mi ubicación actual".',
          isError: true,
        });
      }
    } catch {
      setGeocodeStatus({
        text: 'No se pudo buscar la dirección en línea. Puedes ingresar las coordenadas manualmente o usar tu ubicación actual.',
        isError: true,
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setGpsCaptureStatus('Geolocalización no disponible en este navegador');
      return;
    }
    setIsCapturingGps(true);
    setGpsCaptureStatus('Detectando satélites GPS...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsCapturingGps(false);
        const lat = pos.coords.latitude.toFixed(6);
        const lon = pos.coords.longitude.toFixed(6);
        setProjLatitude(lat);
        setProjLongitude(lon);
        setGpsCaptureStatus(`GPS capturado con éxito: ${lat}, ${lon} (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        setIsCapturingGps(false);
        setGpsCaptureStatus(`No se pudo obtener el GPS: ${err.message}`);
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
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      hourlyRate: 25,
    });

    const origin = window.location.origin;
    const siteObj = projects.find((p) => p.id === empAssignedProject);
    setInviteModalData({
      name: empName.trim(),
      email: emailTrimmed,
      role: empRole.trim(),
      siteName: siteObj?.name || 'Sede CPR',
      inviteUrl: `${origin}/?activar=${encodeURIComponent(emailTrimmed)}`,
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
      siteName: siteObj?.name || 'Sede CPR',
      inviteUrl: `${origin}/?activar=${encodeURIComponent(emp.email || '')}`,
    });
    setCopiedLink(false);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;

    const lat = projLatitude ? parseFloat(projLatitude) : 19.4326;
    const lon = projLongitude ? parseFloat(projLongitude) : -99.1332;

    if (editingProjectId && onUpdateProject) {
      const existing = projects.find((p) => p.id === editingProjectId);
      if (existing) {
        onUpdateProject({
          ...existing,
          name: projName.trim(),
          code: projCode.trim() || existing.code,
          address: projAddress.trim() || 'Dirección de obra en campo',
          client: projClient.trim(),
          latitude: isNaN(lat) ? undefined : lat,
          longitude: isNaN(lon) ? undefined : lon,
          geofenceRadius: projRadius,
          autoClockOut: projAutoClockOut,
        });
      }
    } else {
      onAddProject({
        name: projName.trim(),
        code: projCode.trim() || `CPR-${Math.floor(100 + Math.random() * 900)}`,
        address: projAddress.trim() || 'Dirección de obra en campo',
        client: projClient.trim(),
        active: true,
        latitude: isNaN(lat) ? undefined : lat,
        longitude: isNaN(lon) ? undefined : lon,
        geofenceRadius: projRadius,
        autoClockOut: projAutoClockOut,
      });
    }

    setShowProjectModal(false);
    setEditingProjectId(null);
  };

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
            <span>{isAdminOrManager ? `Colaboradores (${employees.length})` : 'Mi Perfil'}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('projects')}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'projects'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Sedes & Proyectos ({projects.length})</span>
          </button>
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
                <span>Invitar Colaborador</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddProject}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Nueva Sede / Proyecto</span>
              </button>
            )}

            <button
              onClick={() => {
                if (
                  window.confirm(
                    '¿Deseas restaurar todos los colaboradores, proyectos y registros iniciales de demostración CPR?'
                  )
                ) {
                  onResetData();
                }
              }}
              className="p-2 text-xs rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 transition-colors cursor-pointer shadow-2xs"
              title="Restaurar datos de muestra CPR"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Subtab 1: Employees List */}
      {activeSubTab === 'employees' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(isAdminOrManager ? employees : employees.filter((e) => e.id === currentUser.id)).map((emp) => {
            const roleBadge =
              emp.systemRole === 'admin'
                ? { label: 'Administrador', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
                : emp.systemRole === 'manager'
                ? { label: 'Manager', color: 'bg-blue-100 text-blue-900 border-blue-300' }
                : { label: 'Colaborador', color: 'bg-slate-100 text-slate-800 border-slate-300' };

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
                      <span className="text-slate-500 font-medium">Contrato:</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          emp.contractType === 'Internal Team'
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-purple-100 text-purple-900 border-purple-300'
                        }`}
                      >
                        {emp.contractType || 'Internal Team'}
                      </span>
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Correo:</span>
                      <span className="font-mono text-xs text-slate-800 font-semibold truncate max-w-[170px]">
                        {emp.email || 'Sin correo'}
                      </span>
                    </div>

                    {/* Password activation state */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Clave de acceso:</span>
                      {emp.invitationStatus === 'pending' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          Pendiente de activar
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Configurada
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card actions footer */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isAdminOrManager && (
                      <button
                        onClick={() => handleShareExistingEmployeeInvite(emp)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Compartir enlace de invitación / clave"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Invitar / Enlace</span>
                      </button>
                    )}
                  </div>

                  {isAdminOrManager && emp.id !== currentUser.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingEmployee(emp)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Editar colaborador"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Seguro que deseas eliminar a ${emp.name}?`)) {
                            onDeleteEmployee(emp.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar colaborador"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subtab 2: Project Sites List */}
      {activeSubTab === 'projects' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-300 transition-all shadow-xs hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center font-bold text-xs border border-blue-200 shrink-0">
                        {proj.code}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{proj.name}</h3>
                        <p className="text-xs text-slate-600 font-medium">{proj.client}</p>
                      </div>
                    </div>

                    {isAdminOrManager && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditProject(proj)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Editar sede y geocerca"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Eliminar la sede ${proj.name}?`)) {
                              onDeleteProject(proj.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Eliminar sede"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span className="truncate">{proj.address}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-900 font-bold px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300">
                    Sede Activa
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-600">ID: {proj.code}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Employee Modal (Admin / Manager only) */}
      {showAddEmployee && isAdminOrManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Invitar Nuevo Colaborador</h2>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    El trabajador creará su clave de acceso al ingresar con su correo.
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
              {/* Correo Electrónico */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Correo Electrónico (Email del Trabajador) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@cpr.org"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  Con este correo el colaborador activará su cuenta y configurará su clave secreta.
                </p>
              </div>

              {/* Nombre Completo */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Nombre y Apellidos *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez González"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Role selector */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Rol / Nivel de Acceso en el Sistema
                </label>
                <select
                  value={empSystemRole}
                  onChange={(e) => setEmpSystemRole(e.target.value as any)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="employee">Colaborador (Solo registro de marcaciones personales)</option>
                  <option value="manager">Manager (Supervisión de equipo y sedes)</option>
                  <option value="admin">Administrador (Control total del sistema)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">
                    Tipo de Personal
                  </label>
                  <select
                    value={empContractType}
                    onChange={(e) => setEmpContractType(e.target.value as any)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="Internal Team">Internal Team</option>
                    <option value="ASP Contratista">ASP Contratista</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">
                    Puesto / Especialidad
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Instalador Fachadas"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Teléfono (WhatsApp opcional)
                </label>
                <input
                  type="tel"
                  placeholder="+52 55 ..."
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1.5">
                  Color de Avatar
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
                  <span>Seguridad y Creación de Claves</span>
                </div>
                <p className="text-slate-600 font-medium">
                  No necesitas asignarle una clave. Al guardar, se genera una invitación para que el trabajador ingrese y configure su contraseña privada de acceso.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddEmployee(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Mail className="w-4 h-4 text-white" />
                  <span>Enviar Invitación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-black text-slate-900">Editar Colaborador</h2>
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
                <label className="text-xs font-bold text-slate-900 block mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">Puesto</label>
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
                  <label className="text-xs font-bold text-slate-900 block mb-1">Rol Sistema</label>
                  <select
                    value={editingEmployee.systemRole || 'employee'}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, systemRole: e.target.value as any })}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="employee">Colaborador</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">Contrato</label>
                  <select
                    value={editingEmployee.contractType || 'Internal Team'}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, contractType: e.target.value as any })}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="Internal Team">Internal Team</option>
                    <option value="ASP Contratista">ASP Contratista</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">Correo</label>
                <input
                  type="email"
                  value={editingEmployee.email || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">Teléfono</label>
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
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invitation Success / Share Dialog */}
      {inviteModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Invitación Lista</h3>
                  <p className="text-xs text-slate-600 font-medium">
                    El colaborador ya puede crear su clave de acceso.
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
                <span className="text-slate-600 font-medium">Colaborador:</span>
                <span className="font-bold text-slate-900">{inviteModalData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Correo Registrado:</span>
                <span className="font-mono text-blue-800 font-bold truncate max-w-[200px]">
                  {inviteModalData.email}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Puesto / Cargo:</span>
                <span className="text-slate-800 font-semibold">{inviteModalData.role}</span>
              </div>
              {inviteModalData.siteName && (
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Sede Asignada:</span>
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
                <span>Enlace de Activación Directo:</span>
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
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Share action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Hola ${inviteModalData.name}, has sido agregado a CPR Clock. Activa tu cuenta y crea tu clave de acceso aquí: ${inviteModalData.inviteUrl}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Share2 className="w-4 h-4 text-white" />
                <span>Enviar WhatsApp</span>
              </a>

              <a
                href={`mailto:${inviteModalData.email}?subject=${encodeURIComponent(
                  'Invitación a CPR Clock - Crea tu Clave de Acceso'
                )}&body=${encodeURIComponent(
                  `Hola ${inviteModalData.name},\n\nHas sido registrado en la plataforma de control de asistencia de CPR Facade Upgrade Specialists.\n\nPor favor haz clic en el siguiente enlace para crear tu clave de acceso personal:\n${inviteModalData.inviteUrl}\n\n¡Bienvenido al equipo!`
                )}`}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Mail className="w-4 h-4 text-white" />
                <span>Enviar Correo</span>
              </a>
            </div>

            <p className="text-xs text-slate-600 text-center font-medium">
              El colaborador también puede ir a la pantalla de ingreso y seleccionar <strong className="text-slate-900">"Crear mi clave de acceso"</strong> ingresando su correo registrado.
            </p>

            <button
              onClick={() => setInviteModalData(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
            >
              Listo, cerrar
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Project Modal with Geofence & Radius */}
      {showProjectModal && isAdminOrManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    {editingProjectId ? 'Configurar Sede y Geocerca' : 'Nueva Sede / Proyecto'}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">
                    Establece el perímetro y radio para la salida automática por geolocalización
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
                  Nombre del Proyecto / Sede *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Proyecto CPR - Obra Tramo Norte"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-900 font-bold block mb-1">Código</label>
                  <input
                    type="text"
                    placeholder="Ej. CPR-005"
                    value={projCode}
                    onChange={(e) => setProjCode(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-900 font-bold block mb-1">Cliente / Área</label>
                  <input
                    type="text"
                    placeholder="Ej. Constructora CPR"
                    value={projClient}
                    onChange={(e) => setProjClient(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-900 font-bold">
                    Dirección o Referencia de la Sede
                  </label>
                  {isOnlyAdmin && (
                    <button
                      type="button"
                      onClick={handleGeocodeAddress}
                      disabled={isGeocoding || !projAddress.trim()}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 transition-all disabled:opacity-50 cursor-pointer"
                      title="Obtener coordenadas GPS automáticamente a partir de esta dirección"
                    >
                      <Search className={`w-3 h-3 ${isGeocoding ? 'animate-spin' : ''}`} />
                      <span>{isGeocoding ? 'Buscando GPS...' : 'Obtener Coordenadas por Dirección'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Ej. Paseo de la Reforma 222, CDMX o Av. Providencia 1234, Santiago"
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
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  💡 Escribe la dirección y haz clic en <span className="text-blue-800 font-bold">"Obtener Coordenadas por Dirección"</span> para calcular la latitud y longitud.
                </p>
              </div>

              {/* Control de Geocerca (Solo Administrador) */}
              {isOnlyAdmin ? (
                <>
                  {/* Coordenadas GPS */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-blue-700" />
                        Punto Central de la Sede (GPS)
                      </span>
                      <button
                        type="button"
                        onClick={handleCaptureGps}
                        disabled={isCapturingGps}
                        className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        <Navigation className={`w-3 h-3 ${isCapturingGps ? 'animate-spin' : ''}`} />
                        <span>{isCapturingGps ? 'Obteniendo GPS...' : 'Usar mi ubicación actual'}</span>
                      </button>
                    </div>

                    {gpsCaptureStatus && (
                      <p className="text-xs text-emerald-800 font-mono font-bold">{gpsCaptureStatus}</p>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Latitud</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="Ej. 19.4326"
                          value={projLatitude}
                          onChange={(e) => setProjLatitude(e.target.value)}
                          className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Longitud</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="Ej. -99.1332"
                          value={projLongitude}
                          onChange={(e) => setProjLongitude(e.target.value)}
                          className="w-full bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Radio de Geocerca */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Radio className="w-4 h-4 text-blue-700" />
                        Radio de la Geocerca (Metros)
                      </span>
                      <span className="text-xs font-mono font-black text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-300">
                        {projRadius} metros
                      </span>
                    </div>

                    {/* Preset buttons */}
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1.5">Valores rápidos:</span>
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
                        O especifica un radio personalizado (en metros):
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600 font-mono font-bold">
                          metros
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
                          Registrar salida automática si la persona sale del área
                        </strong>
                        <span className="text-xs text-slate-600 block mt-0.5 font-medium">
                          Si el colaborador sale del radio de {projRadius} metros mientras está en turno, el sistema registrará automáticamente su salida (Clock Out) con la nota de geocerca.
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
                      Control de Geocerca y Coordenadas (Exclusivo Administrador)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Solo el Administrador del sistema tiene permisos para configurar o modificar las coordenadas GPS y el radio de geocerca de esta sede.
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-xs font-mono font-bold text-slate-800">
                    <span>Radio actual: <strong className="text-blue-800">{projRadius}m</strong></span>
                    <span>·</span>
                    <span>Salida automática: <strong className={projAutoClockOut ? 'text-emerald-800' : 'text-slate-600'}>{projAutoClockOut ? 'Activa' : 'Inactiva'}</strong></span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectModal(false);
                    setEditingProjectId(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  {editingProjectId ? 'Actualizar Sede' : 'Guardar Sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
