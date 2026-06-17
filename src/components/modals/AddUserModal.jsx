import React, { useState, useEffect } from 'react';
import { Loader2, UserPlus, RefreshCw, AlertTriangle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import { PERMISSIONS } from '@/lib/permissions';

const ROLES = [
  { value: 'admin',      label: '👑 Admin' },
  { value: 'manager',    label: '👔 Manager' },
  { value: 'agent',      label: '🚗 Agent' },
  { value: 'fleet',      label: '🛠️ Flotte' },
  { value: 'accountant', label: '💰 Comptable' },
  { value: 'readonly',   label: '👁️ Consultation' },
];

const ALL_MODULES = [
  { id: 'dashboard',    label: '📊 Tableau de bord' },
  { id: 'contacts',     label: '👥 Contacts' },
  { id: 'reservations', label: '📅 Réservations' },
  { id: 'vehicles',     label: '🚗 Véhicules' },
  { id: 'maintenance',  label: '🔧 Maintenance' },
  { id: 'billing',      label: '💳 Facturation' },
  { id: 'drivers',      label: '🧑‍✈️ Chauffeurs' },
  { id: 'routes',       label: '📍 Destinations' },
  { id: 'history',      label: '📜 Historique' },
  { id: 'support',      label: '🎧 Support' },
  { id: 'users',        label: '👤 Utilisateurs' },
  { id: 'settings',     label: '⚙️ Paramètres' },
];

const AddUserModal = ({ open, onOpenChange, onUserSaved, userToEdit = null }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const initialFormState = {
    email: '',
    full_name: '',
    role: 'agent',
    status: 'active',
    phone: '',
    department: '',
    notes: '',
    password: '',
    custom_permissions: PERMISSIONS['agent'].modules,
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (open) {
      if (userToEdit) {
        setFormData({
          ...initialFormState,
          ...userToEdit,
          password: '',
          custom_permissions: userToEdit.custom_permissions || PERMISSIONS[userToEdit.role]?.modules || PERMISSIONS['agent'].modules,
        });
      } else {
        setFormData(initialFormState);
      }
      setShowPassword(false);
    }
  }, [open, userToEdit]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData(prev => ({ ...prev, password }));
    setShowPassword(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (roleValue) => {
    const preset = PERMISSIONS[roleValue]?.modules || [];
    setFormData(prev => ({ ...prev, role: roleValue, custom_permissions: [...preset] }));
  };

  const toggleModule = (moduleId) => {
    setFormData(prev => {
      const current = prev.custom_permissions || [];
      const has = current.includes(moduleId);
      // dashboard toujours obligatoire
      if (moduleId === 'dashboard') return prev;
      return {
        ...prev,
        custom_permissions: has
          ? current.filter(m => m !== moduleId)
          : [...current, moduleId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.email || !formData.full_name) throw new Error("L'email et le nom complet sont requis.");

      const userData = {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        status: formData.status,
        phone: formData.phone,
        department: formData.department,
        notes: formData.notes,
        custom_permissions: formData.custom_permissions,
      };

      if (userToEdit) {
        const { data, error } = await supabase
          .from('users')
          .update(userData)
          .eq('id', userToEdit.id)
          .select()
          .single();
        if (error) throw error;

        await historyService.logEvent({
          type: 'user_updated',
          title: `Utilisateur mis à jour`,
          description: `${data.full_name} (${data.role}) modifié.`,
          metadata: { user_id: data.id }
        });

        toast({ title: "Utilisateur modifié", description: "Modifications enregistrées.", className: "bg-green-50 border-green-200 text-green-900" });
        if (onUserSaved) onUserSaved(data);

      } else {
        if (!formData.password || formData.password.length < 6) throw new Error("Le mot de passe est requis (6 caractères minimum).");

        const res = await fetch('/api/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...userData, password: formData.password }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erreur serveur.");

        await historyService.logEvent({
          type: 'user_created',
          title: `Nouvel utilisateur créé`,
          description: `${json.user.full_name} créé avec le rôle ${json.user.role}.`,
          metadata: { user_id: json.user.id }
        });

        toast({ title: "Utilisateur créé ✅", description: `${json.user.full_name} peut maintenant se connecter.`, className: "bg-green-50 border-green-200 text-green-900" });
        if (onUserSaved) onUserSaved(json.user);
      }

      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Échec de l'opération", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!userToEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            {isEditing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifiez les informations et les accès." : "Créez un compte — connexion immédiate possible."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">

          {/* Nom + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nom complet</label>
              <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Jean Dupont" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={isEditing}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-50 disabled:text-slate-400" placeholder="jean@exemple.com" />
              {isEditing && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />L'email de connexion ne peut pas être modifié.</p>}
            </div>
          </div>

          {/* Mot de passe */}
          {!isEditing && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                Mot de passe <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Requis</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange}
                    required minLength={6} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm pr-10" placeholder="Minimum 6 caractères" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex="-1">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="button" variant="outline" onClick={generatePassword} className="shrink-0">
                  <RefreshCw className="h-4 w-4 mr-2" />Générer
                </Button>
              </div>
            </div>
          )}

          {/* Rôle — modèle de départ */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Modèle de départ <span className="text-xs font-normal text-slate-400">(pré-coche les accès)</span></label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <button key={r.value} type="button" onClick={() => handleRoleChange(r.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                    formData.role === r.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accès par module — cases à cocher */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Accès aux modules <span className="text-xs font-normal text-slate-400">(personnalisez librement)</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
              {ALL_MODULES.map(mod => {
                const checked = (formData.custom_permissions || []).includes(mod.id);
                const isDashboard = mod.id === 'dashboard';
                return (
                  <label key={mod.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all ${
                      checked ? 'bg-white border-2 border-blue-400 shadow-sm' : 'bg-white border-2 border-transparent hover:border-slate-200'
                    } ${isDashboard ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleModule(mod.id)} disabled={isDashboard}
                      className="w-4 h-4 accent-blue-600 shrink-0" />
                    <span className={`text-sm ${checked ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{mod.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-slate-400">
              {(formData.custom_permissions || []).length} module(s) activé(s) · Le tableau de bord est toujours inclus
            </p>
          </div>

          {/* Téléphone + Département */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Téléphone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" placeholder="+242 06 000 0000" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Département</label>
              <input type="text" name="department" value={formData.department} onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" placeholder="Commercial, Flotte…" />
            </div>
          </div>

          {/* Statut */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Statut du compte</label>
            <div className="flex gap-3">
              {[{ value: 'active', label: '✅ Actif' }, { value: 'inactive', label: '🔒 Inactif' }].map(s => (
                <button key={s.value} type="button" onClick={() => setFormData(prev => ({ ...prev, status: s.value }))}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.status === s.value
                      ? s.value === 'active' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Notes internes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm resize-none" placeholder="Visible uniquement par les admins…" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Annuler</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[160px]" disabled={isLoading}>
              {isLoading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</>
                : <><CheckCircle className="mr-2 h-4 w-4" />{isEditing ? 'Mettre à jour' : 'Créer le compte'}</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;
