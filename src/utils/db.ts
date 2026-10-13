import { supabase } from './supabase';
import { Employee, ProjectSite, TimeEntry } from '../types';

type Row = Record<string, any>;

export interface InvitationInfo {
  name: string;
  role: string;
  contractType: string;
  avatarBg: string;
  siteName?: string;
  invitationStatus: 'active' | 'pending';
}

// ---- Row <-> model mapping -------------------------------------------------

function toEmployee(r: Row): Employee {
  return {
    id: r.id,
    userId: r.user_id ?? undefined,
    name: r.name,
    role: r.role,
    contractType: r.contract_type,
    systemRole: r.system_role,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    avatarBg: r.avatar_bg,
    status: r.status,
    currentShiftId: r.current_shift_id ?? undefined,
    activeProjectId: r.active_project_id ?? undefined,
    hourlyRate: Number(r.hourly_rate) || 0,
    invitationStatus: r.invitation_status,
    invitedAt: r.invited_at ?? undefined,
  };
}

// user_id and invitation_status are owned by the database (see employees_guard trigger)
function fromEmployee(e: Employee): Row {
  return {
    id: e.id,
    name: e.name,
    role: e.role,
    contract_type: e.contractType,
    system_role: e.systemRole,
    email: (e.email || '').trim().toLowerCase(),
    phone: e.phone || null,
    avatar_bg: e.avatarBg,
    status: e.status,
    current_shift_id: e.currentShiftId || null,
    active_project_id: e.activeProjectId || null,
    hourly_rate: e.hourlyRate,
  };
}

function toProject(r: Row): ProjectSite {
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    address: r.address,
    client: r.client ?? undefined,
    active: r.active,
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    geofenceRadius: r.geofence_radius ?? 150,
    autoClockOut: r.auto_clock_out ?? true,
  };
}

function fromProject(p: ProjectSite): Row {
  return {
    id: p.id,
    name: p.name,
    code: p.code,
    address: p.address,
    client: p.client || null,
    active: p.active,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    geofence_radius: p.geofenceRadius ?? 150,
    auto_clock_out: p.autoClockOut ?? true,
  };
}

function toEntry(r: Row): TimeEntry {
  return {
    id: r.id,
    employeeId: r.employee_id ?? '',
    employeeName: r.employee_name,
    employeeRole: r.employee_role,
    projectId: r.project_id ?? '',
    projectName: r.project_name,
    date: r.date,
    clockInTime: r.clock_in_time,
    clockOutTime: r.clock_out_time ?? undefined,
    status: r.status,
    breakPeriods: r.break_periods ?? [],
    totalBreakMinutes: r.total_break_minutes ?? 0,
    totalHours: Number(r.total_hours) || 0,
    notes: r.notes ?? undefined,
    locationIn: r.location_in ?? undefined,
    locationOut: r.location_out ?? undefined,
    isManual: r.is_manual ?? false,
    isAutoClockOut: r.is_auto_clock_out ?? false,
    device: r.device ?? undefined,
    verified: r.verified ?? false,
  };
}

function fromEntry(e: TimeEntry): Row {
  return {
    id: e.id,
    employee_id: e.employeeId || null,
    employee_name: e.employeeName,
    employee_role: e.employeeRole,
    project_id: e.projectId || null,
    project_name: e.projectName,
    date: e.date,
    clock_in_time: e.clockInTime,
    clock_out_time: e.clockOutTime || null,
    status: e.status,
    break_periods: e.breakPeriods ?? [],
    total_break_minutes: Math.round(e.totalBreakMinutes || 0),
    total_hours: e.totalHours || 0,
    notes: e.notes || null,
    location_in: e.locationIn ?? null,
    location_out: e.locationOut ?? null,
    is_manual: e.isManual ?? false,
    is_auto_clock_out: e.isAutoClockOut ?? false,
    device: e.device || null,
    verified: e.verified ?? false,
  };
}

// ---- Queries ---------------------------------------------------------------

export async function fetchAll(): Promise<{
  employees: Employee[];
  projects: ProjectSite[];
  entries: TimeEntry[];
}> {
  const [emps, projs, ents] = await Promise.all([
    supabase.from('employees').select('*').order('created_at', { ascending: true }),
    supabase.from('projects').select('*').order('created_at', { ascending: true }),
    supabase.from('time_entries').select('*').order('clock_in_time', { ascending: false }),
  ]);
  const error = emps.error || projs.error || ents.error;
  if (error) throw error;
  return {
    employees: (emps.data ?? []).map(toEmployee),
    projects: (projs.data ?? []).map(toProject),
    entries: (ents.data ?? []).map(toEntry),
  };
}

export async function insertEmployee(emp: Employee): Promise<void> {
  const { error } = await supabase.from('employees').insert(fromEmployee(emp));
  if (error) throw error;
}

export async function updateEmployee(emp: Employee): Promise<void> {
  const { id, ...fields } = fromEmployee(emp);
  const { error } = await supabase.from('employees').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) throw error;
}

export async function insertProject(proj: ProjectSite): Promise<void> {
  const { error } = await supabase.from('projects').insert(fromProject(proj));
  if (error) throw error;
}

export async function updateProject(proj: ProjectSite): Promise<void> {
  const { id, ...fields } = fromProject(proj);
  const { error } = await supabase.from('projects').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function insertEntry(entry: TimeEntry): Promise<void> {
  const { error } = await supabase.from('time_entries').insert(fromEntry(entry));
  if (error) throw error;
}

export async function updateEntry(entry: TimeEntry): Promise<void> {
  const { id, ...fields } = fromEntry(entry);
  const { error } = await supabase.from('time_entries').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) throw error;
}

// Public lookup used by the activation screen before the worker has an account
export async function checkInvitation(email: string): Promise<InvitationInfo | null> {
  const { data, error } = await supabase.rpc('check_invitation', { p_email: email });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    name: row.name,
    role: row.role,
    contractType: row.contract_type,
    avatarBg: row.avatar_bg,
    siteName: row.site_name ?? undefined,
    invitationStatus: row.invitation_status,
  };
}
