import { supabase } from './supabase';

// Public half of the VAPID key pair; the private half is VAPID_PRIVATE_KEY in Vercel
const VAPID_PUBLIC_KEY =
  'BFGp4eUNllUUOV_-DCnS72gVgAQRsNfRk94EnbArnd7QYekio6XsJ29dIIieYBeyaF2D93EFvhM_mRHMvvmBOEY';

export type ReminderState =
  | 'unsupported' // browser cannot receive push
  | 'needs_install' // iPhone / iPad: only works from the Home Screen app
  | 'denied' // the worker blocked notifications
  | 'off' // can be turned on
  | 'on';

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const urlBase64ToUint8Array = (base64: string) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const saveSubscription = async (sub: PushSubscription) => {
  const json = sub.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
  });
  if (error) throw error;
};

export async function getReminderState(): Promise<ReminderState> {
  if (!pushSupported()) return isIos() && !isStandalone() ? 'needs_install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

// Must run from a tap: browsers only show the permission prompt after a user gesture
export async function enableReminders(): Promise<ReminderState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));
  await saveSubscription(sub);
  return 'on';
}

// On sign-in: links this device's existing subscription to whoever is now signed in
export async function syncReminderSubscription(): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await saveSubscription(sub);
}

// Before sign-out (needs the session): this device stops getting the signed-in worker's reminders
export async function removeReminderSubscription(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint });
}
