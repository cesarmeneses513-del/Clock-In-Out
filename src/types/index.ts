export type PunchStatus = 'clocked_in' | 'on_break' | 'clocked_out';
export type UserRole = 'admin' | 'manager' | 'employee';
export type ContractType = 'Internal Team' | 'ASP Contratista';

// The stored value stays 'ASP Contratista' (database check constraint); this is the label shown in the UI
export function contractTypeLabel(type?: string): string {
  return type === 'ASP Contratista' ? 'ASP Contractor' : 'Internal Team';
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  contractType: ContractType; // 'Internal Team' | 'ASP Contratista'
  department?: string; // deprecated, replaced by contractType
  userId?: string; // auth.users id, set once the worker creates their password
  pin?: string; // deprecated: sign-in is handled by Supabase Auth
  systemRole: UserRole; // 'admin' | 'manager' | 'employee'
  email?: string;
  phone?: string;
  avatarBg: string;
  status: PunchStatus;
  currentShiftId?: string;
  activeProjectId?: string;
  hourlyRate: number;
  invitationStatus?: 'active' | 'pending'; // 'pending' means invited by admin, needs to create password
  invitedAt?: string;
  // May clock in at sites that have no location (e.g. "Multiples Location"). Admins always can.
  // Undefined until the open_site_access column exists in the database.
  openSiteAccess?: boolean;
}

export interface ProjectSite {
  id: string;
  name: string;
  code: string;
  address: string;
  client?: string;
  active: boolean;
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number; // In meters (e.g. 100m, 150m)
  autoClockOut?: boolean; // Automatically clock out when worker exits perimeter
}

export interface BreakPeriod {
  start: string;
  end?: string;
  durationMinutes?: number;
}

export interface LocationStamp {
  latitude: number;
  longitude: number;
  accuracy?: number;
  addressName?: string;
  timestamp: string;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  projectId: string;
  projectName: string;
  date: string; // YYYY-MM-DD
  clockInTime: string; // ISO
  clockOutTime?: string; // ISO
  status: 'active' | 'on_break' | 'completed';
  breakPeriods: BreakPeriod[];
  totalBreakMinutes: number;
  totalHours: number; // decimal hours
  notes?: string;
  locationIn?: LocationStamp;
  locationOut?: LocationStamp;
  isManual?: boolean;
  isAutoClockOut?: boolean;
  device?: string;
  verified?: boolean;
}

export type ViewTab = 'punch' | 'who_is_working' | 'timesheets' | 'team_projects';
