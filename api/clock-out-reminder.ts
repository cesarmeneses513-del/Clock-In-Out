import webpush from 'web-push';

// Same public key as src/utils/push.ts; the private key and the shared secret live in Vercel env vars
const VAPID_PUBLIC_KEY =
  'BFGp4eUNllUUOV_-DCnS72gVgAQRsNfRk94EnbArnd7QYekio6XsJ29dIIieYBeyaF2D93EFvhM_mRHMvvmBOEY';

interface Subscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// Called by Supabase (send_clock_out_reminders) with the devices of workers still clocked in at 3:30 pm
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.PUSH_SECRET;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!secret || !privateKey) {
    return Response.json({ error: 'Push is not configured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subscriptions } = (await request.json()) as { subscriptions?: Subscription[] };
  if (!Array.isArray(subscriptions)) {
    return Response.json({ error: 'Missing subscriptions' }, { status: 400 });
  }

  webpush.setVapidDetails('mailto:cesarmeneses513@gmail.com', VAPID_PUBLIC_KEY, privateKey);

  const payload = JSON.stringify({
    title: 'Still clocked in?',
    body: "It's 3:30 pm and your shift is still open. If you've already left the site, tap here to clock out.",
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification(sub, payload, { TTL: 60 * 60, urgency: 'high' }))
  );
  const sent = results.filter((r) => r.status === 'fulfilled').length;

  return Response.json({ sent, failed: results.length - sent });
}
