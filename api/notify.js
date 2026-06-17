import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, title, body, metadata } = req.body;
  if (!type || !title) return res.status(400).json({ error: 'type and title required' });

  // 1. Sauvegarder dans la table notifications
  const { error: dbError } = await supabase.from('notifications').insert({ type, title, body, metadata });
  if (dbError) console.error('DB error:', dbError);

  // 2. Envoyer push à tous les abonnés
  const { data: subs } = await supabase.from('push_subscriptions').select('subscription');
  if (subs && subs.length > 0) {
    const payload = JSON.stringify({ title, body, tag: type });
    const results = await Promise.allSettled(
      subs.map(s => webpush.sendNotification(s.subscription, payload).catch(e => {
        if (e.statusCode === 410) {
          // Subscription expirée — supprimer
          supabase.from('push_subscriptions').delete().eq('subscription', s.subscription);
        }
      }))
    );
  }

  return res.status(200).json({ success: true });
}
