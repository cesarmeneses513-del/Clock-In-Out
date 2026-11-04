import React, { useEffect, useState } from 'react';
import { BellRing, LogOut, Mail, MapPin, Phone, X } from 'lucide-react';
import { Employee, contractTypeBadge, contractTypeLabel } from '../types';
import {
  DEFAULT_REMINDER_TIME,
  enableReminders,
  formatReminderTime,
  getReminderState,
  ReminderState,
  setReminderTime,
} from '../utils/push';
import { captureCurrentLocation, getLocationPermission } from '../utils/geo';
import { LocationHelpSteps } from './LocationHelpSteps';

interface ProfileSheetProps {
  employee: Employee;
  onClose: () => void;
  onLogout: () => void;
}

type LocationState = 'checking' | 'on' | 'off' | 'not_set';

const roleLabel = { admin: 'Admin', manager: 'Manager', employee: 'Employee' } as const;

// Every 15 minutes from 12:00 to 4:45 pm (shifts close on their own at 5 pm)
const REMINDER_OPTIONS = Array.from({ length: 20 }, (_, i) => {
  const minutes = 12 * 60 + i * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

const StatusChip: React.FC<{ on: boolean; label: string }> = ({ on, label }) => (
  <span
    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
      on ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-300'
    }`}
  >
    {label}
  </span>
);

// The signed-in worker's profile, with the device settings the app needs (reminder and location)
export const ProfileSheet: React.FC<ProfileSheetProps> = ({ employee, onClose, onLogout }) => {
  const [reminder, setReminder] = useState<ReminderState | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [remindAt, setRemindAt] = useState(employee.reminderTime || DEFAULT_REMINDER_TIME);
  const [timeStatus, setTimeStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [location, setLocation] = useState<LocationState>('checking');
  const [showLocationHelp, setShowLocationHelp] = useState(false);

  useEffect(() => {
    getReminderState().then(setReminder).catch(() => setReminder('unsupported'));
    getLocationPermission().then((state) =>
      setLocation(state === 'granted' ? 'on' : state === 'denied' ? 'off' : 'not_set')
    );
  }, []);

  const turnOnReminder = async () => {
    setReminderBusy(true);
    setReminderError(null);
    try {
      setReminder(await enableReminders());
    } catch (err) {
      console.error(err);
      setReminderError('Could not turn on reminders. Please try again.');
    } finally {
      setReminderBusy(false);
    }
  };

  const changeReminderTime = async (time: string) => {
    const previous = remindAt;
    setRemindAt(time);
    setTimeStatus('saving');
    try {
      await setReminderTime(time);
      setTimeStatus('saved');
    } catch (err) {
      console.error(err);
      setRemindAt(previous);
      setTimeStatus('error');
    }
  };

  // Asking for the position shows the browser prompt when it still can
  const turnOnLocation = async () => {
    setLocation('checking');
    const { failure } = await captureCurrentLocation();
    setLocation(failure ? 'off' : 'on');
    setShowLocationHelp(Boolean(failure));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Worker */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 rounded-2xl ${employee.avatarBg} flex items-center justify-center text-xl font-black text-white shadow-md shrink-0`}
            >
              {employee.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">{employee.name}</h2>
              <p className="text-xs font-semibold text-slate-700">{employee.role}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-800 border-slate-300">
                  {roleLabel[employee.systemRole]}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${contractTypeBadge(employee.contractType)}`}>
                  {contractTypeLabel(employee.contractType)}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {employee.email && (
            <div className="flex items-center gap-2 text-slate-800">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="font-semibold truncate">{employee.email}</span>
            </div>
          )}
          {employee.phone && (
            <div className="flex items-center gap-2 text-slate-800">
              <Phone className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="font-semibold">{employee.phone}</span>
            </div>
          )}
        </div>

        {/* Device settings */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">This phone</h3>

          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-slate-900">Clock-out reminder</span>
              </div>
              {reminder && <StatusChip on={reminder === 'on'} label={reminder === 'on' ? 'On' : 'Off'} />}
            </div>
            <p className="text-xs text-slate-600">
              A notification at {formatReminderTime(remindAt)} (site time) if you're still clocked in.
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="reminder-time" className="text-xs font-bold text-slate-800">
                Remind me at
              </label>
              <select
                id="reminder-time"
                value={remindAt}
                onChange={(e) => changeReminderTime(e.target.value)}
                disabled={timeStatus === 'saving'}
                className="bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer disabled:opacity-60"
              >
                {!REMINDER_OPTIONS.includes(remindAt) && <option value={remindAt}>{formatReminderTime(remindAt)}</option>}
                {REMINDER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {formatReminderTime(t)}
                  </option>
                ))}
              </select>
              {timeStatus === 'saving' && <span className="text-[11px] text-slate-500 font-semibold">Saving...</span>}
              {timeStatus === 'saved' && <span className="text-[11px] text-emerald-700 font-bold">Saved</span>}
            </div>
            {timeStatus === 'error' && (
              <p className="text-xs text-rose-700 font-semibold">Could not save the time. Please try again.</p>
            )}
            {reminder === 'off' && (
              <button
                onClick={turnOnReminder}
                disabled={reminderBusy}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {reminderBusy ? 'Turning on...' : 'Turn on reminders'}
              </button>
            )}
            {reminder === 'needs_install' && (
              <p className="text-xs text-amber-800 font-semibold">
                Add this app to your Home Screen first: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>,
                then open it from there.
              </p>
            )}
            {reminder === 'denied' && (
              <p className="text-xs text-amber-800 font-semibold">
                Notifications are blocked. Allow them for this app in your phone settings.
              </p>
            )}
            {reminder === 'unsupported' && (
              <p className="text-xs text-amber-800 font-semibold">This browser cannot receive notifications.</p>
            )}
            {reminderError && <p className="text-xs text-rose-700 font-semibold">{reminderError}</p>}
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-900">Location (GPS)</span>
              </div>
              {location !== 'checking' && <StatusChip on={location === 'on'} label={location === 'on' ? 'On' : 'Off'} />}
            </div>
            <p className="text-xs text-slate-600">Needed to clock in at a site.</p>
            {location !== 'on' && (
              <button
                onClick={turnOnLocation}
                disabled={location === 'checking'}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {location === 'checking' ? 'Checking location...' : 'Turn on location'}
              </button>
            )}
            {showLocationHelp && (
              <div className="pt-1">
                <LocationHelpSteps />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
};
