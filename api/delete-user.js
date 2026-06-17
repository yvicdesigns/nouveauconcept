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

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId requis.' });

  try {
    // Supprimer de Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    // Supprimer de la table users
    await supabaseAdmin.from('users').delete().eq('id', userId);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('delete-user error:', error);
    return res.status(500).json({ error: error.message });
  }
}
