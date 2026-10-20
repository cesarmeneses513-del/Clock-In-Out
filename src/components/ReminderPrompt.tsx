import React, { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { enableReminders, getReminderState, ReminderState } from '../utils/push';

const DISMISS_KEY = 'cpr-reminder-prompt-dismissed';

const wasDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

// Offers the 3:30 pm "still clocked in?" notification on the worker's own device
export const ReminderPrompt: React.FC = () => {
  const [state, setState] = useState<ReminderState | null>(null);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReminderState().then(setState).catch(() => setState('unsupported'));
  }, []);

  if (dismissed || !state || state === 'on' || state === 'unsupported') return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Private mode: it just shows again next time
    }
  };

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      setState(await enableReminders());
    } catch (err) {
      console.error(err);
      setError('Could not turn on reminders. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
      <BellRing className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
      <div className="flex-1 space-y-2">
        <p className="font-bold text-sm">Clock-out reminder</p>
        {state === 'needs_install' && (
          <p>
            To get a reminder at 3:30 pm when you're still clocked in, add this app to your Home Screen:
            tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, then open it from there.
          </p>
        )}
        {state === 'denied' && (
          <p>
            Notifications are blocked for this app. Allow them in your phone settings to get a reminder at
            3:30 pm when you're still clocked in.
          </p>
        )}
        {state === 'off' && (
          <>
            <p>Get a notification at 3:30 pm if you're still clocked in, in case you forgot to clock out.</p>
            <button
              onClick={turnOn}
              disabled={busy}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold transition-colors cursor-pointer"
            >
              {busy ? 'Turning on...' : 'Turn on reminders'}
            </button>
          </>
        )}
        {error && <p className="text-rose-700 font-semibold">{error}</p>}
      </div>
      <button onClick={dismiss} className="text-amber-500 hover:text-amber-800 cursor-pointer" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
