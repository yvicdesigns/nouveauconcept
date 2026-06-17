import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { userId, password } = req.body;
  if (!userId || !password) return res.status(400).json({ error: 'userId et password requis.' });
  if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum).' });

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('update-password error:', error);
    return res.status(500).json({ error: error.message });
  }
}
