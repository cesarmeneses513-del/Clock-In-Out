import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

// Injected by vite.config.ts; the same value is published at /version.json on every build
declare const __APP_VERSION__: string;

const CHECK_INTERVAL_MS = 60_000;

// Shows a refresh button when a newer build than the one running has been deployed
export const UpdateBanner: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.version && data.version !== __APP_VERSION__) {
          setUpdateAvailable(true);
        }
      } catch {
        // Offline, or no version file (local dev): nothing to compare against
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    check();
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-3 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/30 border border-slate-700">
        <span className="text-xs font-semibold">A new version is available</span>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
};
