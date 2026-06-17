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

  const { email, password, full_name, role, phone, department, notes } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, mot de passe et nom complet sont requis.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  try {
    // 1. Créer l'utilisateur dans Supabase Auth (sans email de confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // confirme immédiatement sans envoyer d'email
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé par un autre utilisateur.' });
      }
      throw authError;
    }

    const authUserId = authData.user.id;

    // 2. Créer le profil dans la table users
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authUserId,
        email,
        full_name,
        role: role || 'agent',
        status: 'active',
        phone: phone || null,
        department: department || null,
        notes: notes || null,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (dbError) throw dbError;

    return res.status(200).json({ user: userData });

  } catch (error) {
    console.error('create-user error:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur lors de la création.' });
  }
}
