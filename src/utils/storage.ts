import { Employee, ProjectSite, TimeEntry } from '../types';

const STORAGE_KEYS = {
  EMPLOYEES: 'cpr_clock_employees_v1',
  PROJECTS: 'cpr_clock_projects_v1',
  ENTRIES: 'cpr_clock_entries_v1',
  ACTIVE_EMPLOYEE_ID: 'cpr_clock_active_emp_id_v1',
  ACTIVE_PROJECT_ID: 'cpr_clock_active_proj_id_v1',
};

// Initial CPR Project Sites
export const DEFAULT_PROJECTS: ProjectSite[] = [
  {
    id: 'proj-1',
    name: 'Proyecto CPR - Obra Central',
    code: 'CPR-001',
    address: 'Av. Industrial 4500, Sector Norte',
    client: 'Constructora CPR Corp',
    active: true,
    latitude: 19.4326,
    longitude: -99.1332,
    geofenceRadius: 150,
    autoClockOut: true,
  },
  {
    id: 'proj-2',
    name: 'Planta de Operaciones CPR',
    code: 'CPR-002',
    address: 'Parque Industrial Delta, Nave 12',
    client: 'CPR Manufactura',
    active: true,
    latitude: 19.4124,
    longitude: -99.1528,
    geofenceRadius: 200,
    autoClockOut: true,
  },
  {
    id: 'proj-3',
    name: 'Infraestructura & Redes CPR',
    code: 'CPR-003',
    address: 'Km 14.5 Carretera Al Pacífico',
    client: 'Servicios CPR Campo',
    active: true,
    latitude: 19.3821,
    longitude: -99.1823,
    geofenceRadius: 300,
    autoClockOut: true,
  },
  {
    id: 'proj-4',
    name: 'Sede Administrativa CPR',
    code: 'CPR-004',
    address: 'Centro Corporativo Torres, Piso 6',
    client: 'Dirección CPR',
    active: true,
    latitude: 19.4285,
    longitude: -99.1678,
    geofenceRadius: 100,
    autoClockOut: true,
  },
];

// Initial CPR Staff
export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'César Meneses',
    role: 'Supervisor de Operaciones',
    contractType: 'Internal Team',
    pin: '1234',
    password: '1234',
    systemRole: 'admin',
    email: 'cesar.meneses@cpr.org',
    phone: '+52 55 1234 5678',
    avatarBg: 'bg-emerald-600',
    status: 'clocked_in',
    currentShiftId: 'shift-live-1',
    activeProjectId: 'proj-1',
    hourlyRate: 28.5,
    invitationStatus: 'active',
  },
  {
    id: 'emp-2',
    name: 'Mariana Delgado',
    role: 'Ingeniera de Campo',
    contractType: 'Internal Team',
    pin: '2345',
    password: '2345',
    systemRole: 'manager',
    email: 'mariana.delgado@cpr.org',
    phone: '+52 55 9876 5432',
    avatarBg: 'bg-sky-600',
    status: 'clocked_in',
    currentShiftId: 'shift-live-2',
    activeProjectId: 'proj-2',
    hourlyRate: 32.0,
    invitationStatus: 'active',
  },
  {
    id: 'emp-3',
    name: 'Roberto Silva',
    role: 'Técnico Especialista CPR',
    contractType: 'ASP Contratista',
    pin: '3456',
    password: '3456',
    systemRole: 'employee',
    email: 'roberto.silva@cpr.org',
    phone: '+52 55 4567 8901',
    avatarBg: 'bg-amber-600',
    status: 'clocked_in',
    currentShiftId: 'shift-live-3',
    activeProjectId: 'proj-1',
    hourlyRate: 24.0,
    invitationStatus: 'active',
  },
  {
    id: 'emp-4',
    name: 'Andrea Morales',
    role: 'Coordinadora de Seguridad',
    contractType: 'Internal Team',
    pin: '4567',
    password: '4567',
    systemRole: 'manager',
    email: 'andrea.morales@cpr.org',
    phone: '+52 55 7890 1234',
    avatarBg: 'bg-indigo-600',
    status: 'clocked_out',
    hourlyRate: 29.0,
    invitationStatus: 'active',
  },
  {
    id: 'emp-5',
    name: 'Javier Castillo',
    role: 'Operador de Maquinaria',
    contractType: 'ASP Contratista',
    pin: '5678',
    password: '5678',
    systemRole: 'employee',
    email: 'javier.castillo@cpr.org',
    phone: '+52 55 3456 7890',
    avatarBg: 'bg-rose-600',
    status: 'clocked_out',
    hourlyRate: 22.5,
    invitationStatus: 'active',
  },
  {
    id: 'emp-6',
    name: 'Alejandro Ruiz',
    role: 'Instalador de Fachadas',
    contractType: 'ASP Contratista',
    pin: '',
    password: '',
    systemRole: 'employee',
    email: 'alejandro.ruiz@cpr.org',
    phone: '+52 55 8899 0011',
    avatarBg: 'bg-teal-600',
    status: 'clocked_out',
    hourlyRate: 23.0,
    activeProjectId: 'proj-1',
    invitationStatus: 'pending',
    invitedAt: '2026-10-14T07:00:00.000Z',
    invitationToken: 'cpr-inv-ruiz99',
  },
];

// Helper to compute recent dates
function getIsoDate(daysAgo = 0, hours = 8, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function getFormattedDate(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export const DEFAULT_ENTRIES: TimeEntry[] = [
  // César live shift
  {
    id: 'shift-live-1',
    employeeId: 'emp-1',
    employeeName: 'César Meneses',
    employeeRole: 'Supervisor de Operaciones',
    projectId: 'proj-1',
    projectName: 'Proyecto CPR - Obra Central',
    date: getFormattedDate(0),
    clockInTime: getIsoDate(0, 8, 0),
    status: 'active',
    breakPeriods: [],
    totalBreakMinutes: 0,
    totalHours: 0,
    notes: 'Supervisión de vaciado de concreto y chequeo de seguridad matutina.',
    locationIn: {
      latitude: 19.4326,
      longitude: -99.1332,
      accuracy: 12,
      addressName: 'Obra Central CPR (Entrada Principal)',
      timestamp: getIsoDate(0, 8, 0),
    },
    device: 'Web Mobile',
    verified: true,
  },
  // Mariana live shift
  {
    id: 'shift-live-2',
    employeeId: 'emp-2',
    employeeName: 'Mariana Delgado',
    employeeRole: 'Ingeniera de Campo',
    projectId: 'proj-2',
    projectName: 'Planta de Operaciones CPR',
    date: getFormattedDate(0),
    clockInTime: getIsoDate(0, 8, 30),
    status: 'active',
    breakPeriods: [],
    totalBreakMinutes: 0,
    totalHours: 0,
    notes: 'Calibración de instrumentos y recorrido de pruebas.',
    locationIn: {
      latitude: 19.4124,
      longitude: -99.1528,
      accuracy: 8,
      addressName: 'Nave 12 - Planta Delta',
      timestamp: getIsoDate(0, 8, 30),
    },
    device: 'Kiosk Terminal',
    verified: true,
  },
  // Roberto live shift
  {
    id: 'shift-live-3',
    employeeId: 'emp-3',
    employeeName: 'Roberto Silva',
    employeeRole: 'Técnico Especialista CPR',
    projectId: 'proj-1',
    projectName: 'Proyecto CPR - Obra Central',
    date: getFormattedDate(0),
    clockInTime: getIsoDate(0, 7, 45),
    status: 'active',
    breakPeriods: [],
    totalBreakMinutes: 0,
    totalHours: 0,
    notes: 'Mantenimiento de generador eléctrico auxiliar.',
    locationIn: {
      latitude: 19.4326,
      longitude: -99.1332,
      accuracy: 15,
      addressName: 'Obra Central CPR',
      timestamp: getIsoDate(0, 7, 45),
    },
    device: 'Web Mobile',
    verified: true,
  },
  // Completed shift yesterday César
  {
    id: 'shift-hist-1',
    employeeId: 'emp-1',
    employeeName: 'César Meneses',
    employeeRole: 'Supervisor de Operaciones',
    projectId: 'proj-1',
    projectName: 'Proyecto CPR - Obra Central',
    date: getFormattedDate(1),
    clockInTime: getIsoDate(1, 8, 2),
    clockOutTime: getIsoDate(1, 17, 15),
    status: 'completed',
    breakPeriods: [
      {
        start: getIsoDate(1, 13, 0),
        end: getIsoDate(1, 13, 45),
        durationMinutes: 45,
      },
    ],
    totalBreakMinutes: 45,
    totalHours: 8.47,
    notes: 'Revisión técnica de avance de obra y firma de bitácora.',
    locationIn: {
      latitude: 19.4326,
      longitude: -99.1332,
      accuracy: 10,
      addressName: 'Obra Central CPR',
      timestamp: getIsoDate(1, 8, 2),
    },
    locationOut: {
      latitude: 19.4325,
      longitude: -99.1331,
      accuracy: 14,
      addressName: 'Salida Puerta 1',
      timestamp: getIsoDate(1, 17, 15),
    },
    device: 'Web Mobile',
    verified: true,
  },
  // Completed shift yesterday Mariana
  {
    id: 'shift-hist-2',
    employeeId: 'emp-2',
    employeeName: 'Mariana Delgado',
    employeeRole: 'Ingeniera de Campo',
    projectId: 'proj-3',
    projectName: 'Infraestructura & Redes CPR',
    date: getFormattedDate(1),
    clockInTime: getIsoDate(1, 8, 15),
    clockOutTime: getIsoDate(1, 16, 45),
    status: 'completed',
    breakPeriods: [
      {
        start: getIsoDate(1, 12, 30),
        end: getIsoDate(1, 13, 15),
        durationMinutes: 45,
      },
    ],
    totalBreakMinutes: 45,
    totalHours: 7.75,
    notes: 'Inspección de zanjas y tendido de cableado subterráneo.',
    device: 'Kiosk Terminal',
    verified: true,
  },
  // Completed shift yesterday Andrea
  {
    id: 'shift-hist-3',
    employeeId: 'emp-4',
    employeeName: 'Andrea Morales',
    employeeRole: 'Coordinadora de Seguridad',
    projectId: 'proj-4',
    projectName: 'Sede Administrativa CPR',
    date: getFormattedDate(1),
    clockInTime: getIsoDate(1, 9, 0),
    clockOutTime: getIsoDate(1, 18, 0),
    status: 'completed',
    breakPeriods: [
      {
        start: getIsoDate(1, 14, 0),
        end: getIsoDate(1, 15, 0),
        durationMinutes: 60,
      },
    ],
    totalBreakMinutes: 60,
    totalHours: 8.0,
    notes: 'Auditoría interna de normativas EPP y prevención.',
    device: 'Web Desktop',
    verified: true,
  },
  // Completed shift 2 days ago Roberto
  {
    id: 'shift-hist-4',
    employeeId: 'emp-3',
    employeeName: 'Roberto Silva',
    employeeRole: 'Técnico Especialista CPR',
    projectId: 'proj-1',
    projectName: 'Proyecto CPR - Obra Central',
    date: getFormattedDate(2),
    clockInTime: getIsoDate(2, 7, 50),
    clockOutTime: getIsoDate(2, 16, 30),
    status: 'completed',
    breakPeriods: [
      {
        start: getIsoDate(2, 12, 0),
        end: getIsoDate(2, 12, 45),
        durationMinutes: 45,
      },
    ],
    totalBreakMinutes: 45,
    totalHours: 7.92,
    notes: 'Reparación de bomba hidráulica #2.',
    device: 'Web Mobile',
    verified: true,
  },
];

export function getStoredEmployees(): Employee[] {
  if (typeof window === 'undefined') return DEFAULT_EMPLOYEES;
  const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(DEFAULT_EMPLOYEES));
    return DEFAULT_EMPLOYEES;
  }
  try {
    const list = JSON.parse(raw) as Employee[];
    return list.map((emp) => {
      let updated = { ...emp };
      if (!updated.contractType) {
        updated.contractType =
          updated.id === 'emp-3' || updated.id === 'emp-5' || (updated.role && updated.role.toLowerCase().includes('operador'))
            ? 'ASP Contratista'
            : 'Internal Team';
      }
      if (!updated.password) {
        updated.password = updated.pin || '1234';
      }
      if (!updated.systemRole) {
        if (updated.id === 'emp-1' || updated.role.toLowerCase().includes('supervisor') || updated.role.toLowerCase().includes('admin')) {
          updated.systemRole = 'admin';
        } else if (updated.id === 'emp-2' || updated.id === 'emp-4' || updated.role.toLowerCase().includes('ingenier') || updated.role.toLowerCase().includes('coordinad')) {
          updated.systemRole = 'manager';
        } else {
          updated.systemRole = 'employee';
        }
      }
      if (!updated.invitationStatus) {
        updated.invitationStatus = updated.password || updated.pin ? 'active' : 'pending';
      }
      return updated;
    });
  } catch {
    return DEFAULT_EMPLOYEES;
  }
}

export function saveStoredEmployees(employees: Employee[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
}

export function getStoredProjects(): ProjectSite[] {
  if (typeof window === 'undefined') return DEFAULT_PROJECTS;
  const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(DEFAULT_PROJECTS));
    return DEFAULT_PROJECTS;
  }
  try {
    const list = JSON.parse(raw) as ProjectSite[];
    return list.map((proj) => ({
      ...proj,
      geofenceRadius: proj.geofenceRadius || 150,
      autoClockOut: proj.autoClockOut !== undefined ? proj.autoClockOut : true,
    }));
  } catch {
    return DEFAULT_PROJECTS;
  }
}

export function saveStoredProjects(projects: ProjectSite[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

export function getStoredEntries(): TimeEntry[] {
  if (typeof window === 'undefined') return DEFAULT_ENTRIES;
  const raw = localStorage.getItem(STORAGE_KEYS.ENTRIES);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(DEFAULT_ENTRIES));
    return DEFAULT_ENTRIES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ENTRIES;
  }
}

export function saveStoredEntries(entries: TimeEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
}

export function getActiveEmployeeId(): string {
  if (typeof window === 'undefined') return DEFAULT_EMPLOYEES[0].id;
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_EMPLOYEE_ID) || DEFAULT_EMPLOYEES[0].id;
}

export function setActiveEmployeeId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ACTIVE_EMPLOYEE_ID, id);
}

export function getActiveProjectId(): string {
  if (typeof window === 'undefined') return DEFAULT_PROJECTS[0].id;
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID) || DEFAULT_PROJECTS[0].id;
}

export function setActiveProjectId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, id);
}

// Compute hours elapsed from clock in time until now (or end), subtracting breaks
export function calculateElapsedHours(
  clockInTime: string,
  clockOutTime?: string,
  breakPeriods: { start: string; end?: string; durationMinutes?: number }[] = []
): { totalDecimalHours: number; formatted: string; totalBreakMinutes: number } {
  const start = new Date(clockInTime).getTime();
  const end = clockOutTime ? new Date(clockOutTime).getTime() : Date.now();

  let grossDiffMs = Math.max(0, end - start);

  // Compute breaks
  let breakMs = 0;
  for (const b of breakPeriods) {
    if (b.durationMinutes) {
      breakMs += b.durationMinutes * 60 * 1000;
    } else if (b.start) {
      const bStart = new Date(b.start).getTime();
      const bEnd = b.end ? new Date(b.end).getTime() : Date.now();
      breakMs += Math.max(0, bEnd - bStart);
    }
  }

  const netDiffMs = Math.max(0, grossDiffMs - breakMs);
  const totalSeconds = Math.floor(netDiffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const totalDecimalHours = Number((netDiffMs / (1000 * 60 * 60)).toFixed(2));
  const totalBreakMinutes = Math.round(breakMs / (1000 * 60));

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return { totalDecimalHours, formatted, totalBreakMinutes };
}

// Format ISO date to local human readable time e.g. "08:30 AM"
export function formatTimeDisplay(isoString?: string): string {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Format ISO date to local human readable date e.g. "Lunes, 5 de Octubre 2026"
export function formatDateDisplay(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Export timesheets to CSV with UTF-8 BOM for Excel
export function exportEntriesToCSV(entries: TimeEntry[]) {
  const headers = [
    'ID Registro',
    'Empleado',
    'Rol',
    'Fecha',
    'Proyecto',
    'Hora Entrada',
    'Hora Salida',
    'Descanso (min)',
    'Horas Netas',
    'Estado',
    'Notas',
    'Ubicación Entrada',
    'Dispositivo',
  ];

  const rows = entries.map((e) => [
    e.id,
    `"${e.employeeName.replace(/"/g, '""')}"`,
    `"${e.employeeRole.replace(/"/g, '""')}"`,
    e.date,
    `"${e.projectName.replace(/"/g, '""')}"`,
    e.clockInTime ? formatTimeDisplay(e.clockInTime) : '',
    e.clockOutTime ? formatTimeDisplay(e.clockOutTime) : 'En turno',
    e.totalBreakMinutes || 0,
    e.totalHours ? e.totalHours.toFixed(2) : '0.00',
    e.status === 'completed' ? 'Completado' : e.status === 'on_break' ? 'En Pausa' : 'Activo',
    `"${(e.notes || '').replace(/"/g, '""')}"`,
    `"${(e.locationIn?.addressName || '').replace(/"/g, '""')}"`,
    e.device || 'Web',
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `CPR_Reporte_Horas_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
