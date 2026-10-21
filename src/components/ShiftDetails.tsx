import React from 'react';
import { CheckCircle2, ClipboardCheck, Radio, X } from 'lucide-react';
import { LocationStamp, ProjectSite, TimeEntry } from '../types';
import { formatShortDate, formatTimeDisplay } from '../utils/storage';
import { getDistanceMeters } from '../utils/geo';
import { siteTimeZone } from '../utils/timezone';
import { ShiftMap } from './ShiftMap';

interface ShiftDetailsProps {
  entry: TimeEntry;
  site?: ProjectSite;
  canManage: boolean; // admin / manager
  onClose: () => void;
  onApproveGeofence: () => void;
  onEditTimes: () => void;
}

// One shift: where it was clocked in and out, and (for admins) approving an automatic geofence clock-out
export const ShiftDetails: React.FC<ShiftDetailsProps> = ({
  entry,
  site,
  canManage,
  onClose,
  onApproveGeofence,
  onEditTimes,
}) => {
  const hasSiteLocation = site?.latitude !== undefined && site?.longitude !== undefined;
  const hasAnyPoint = Boolean(entry.locationIn || entry.locationOut);

  const placeLabel = (loc?: LocationStamp) => {
    if (!loc) return 'No location recorded';
    if (!hasSiteLocation) return `±${loc.accuracy ?? '?'} m accuracy`;
    const metres = getDistanceMeters(loc.latitude, loc.longitude, site!.latitude!, site!.longitude!);
    const radius = site!.geofenceRadius || 150;
    const distance = metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;
    return metres <= radius ? `On site (${distance} from centre)` : `${distance} from the site`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900">{entry.employeeName}</h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {formatShortDate(entry.date)} · {entry.projectName}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {hasAnyPoint || hasSiteLocation ? (
          <ShiftMap site={site} locationIn={entry.locationIn} locationOut={entry.locationOut} />
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium text-center">
            No locations recorded for this shift.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
            <p className="font-black text-emerald-900 uppercase tracking-wider text-[10px]">Clock in</p>
            <p className="font-mono font-black text-slate-900 text-base">{formatTimeDisplay(entry.clockInTime, siteTimeZone(site))}</p>
            <p className="text-slate-700 font-medium mt-0.5">{placeLabel(entry.locationIn)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
            <p className="font-black text-rose-900 uppercase tracking-wider text-[10px]">Clock out</p>
            <p className="font-mono font-black text-slate-900 text-base">
              {entry.clockOutTime ? formatTimeDisplay(entry.clockOutTime, siteTimeZone(site)) : 'On shift'}
            </p>
            {entry.clockOutTime && <p className="text-slate-700 font-medium mt-0.5">{placeLabel(entry.locationOut)}</p>}
          </div>
        </div>

        {entry.totalHours > 0 && (
          <p className="text-xs text-slate-700 font-semibold">
            Total: <span className="font-mono font-black text-slate-900">{entry.totalHours.toFixed(2)}h</span>
            {entry.totalBreakMinutes > 0 && ` (${entry.totalBreakMinutes} min break)`}
          </p>
        )}

        {entry.notes && (
          <p className="text-xs text-slate-700 font-medium p-3 rounded-xl bg-slate-50 border border-slate-200 break-words">
            {entry.notes}
          </p>
        )}

        {entry.isAutoClockOut && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
            <p className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              Clocked out automatically when leaving the site area
            </p>
            {canManage && (
              <button
                onClick={onApproveGeofence}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve clock-out
              </button>
            )}
          </div>
        )}

        {canManage && entry.status === 'completed' && (
          <button
            onClick={onEditTimes}
            className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4" />
            Edit shift times
          </button>
        )}
      </div>
    </div>
  );
};
