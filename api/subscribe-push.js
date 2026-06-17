import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subscription, userId } = req.body;
  if (!subscription) return res.status(400).json({ error: 'subscription required' });

  // Upsert pour éviter les doublons
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId || null, subscription, updated_at: new Date().toISOString() },
    { onConflict: 'subscription' }
  );

  if (error) {
    // Si pas de colonne updated_at, on insert simplement
    await supabase.from('push_subscriptions').insert({ user_id: userId || null, subscription });
  }

  return res.status(200).json({ success: true });
}
