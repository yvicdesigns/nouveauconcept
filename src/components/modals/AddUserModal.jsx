import React, { useState, useEffect } from 'react';
import { Loader2, UserPlus, RefreshCw, AlertTriangle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';

const ROLES = [
  { value: 'admin',      label: '👑 Administrateur',        desc: 'Accès complet — utilisateurs, paramètres, suppression' },
  { value: 'manager',    label: '👔 Manager',               desc: 'Tout sauf gestion des utilisateurs' },
  { value: 'agent',      label: '🚗 Agent de location',     desc: 'Contacts, réservations, facturation' },
  { value: 'fleet',      label: '🛠️ Responsable de flotte', desc: 'Véhicules, maintenance, chauffeurs' },
  { value: 'accountant', label: '💰 Comptable',             desc: 'Facturation et rapports uniquement' },
  { value: 'readonly',   label: '👁️ Consultation',          desc: 'Lecture seule, aucune modification' },
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
    password: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (open) {
      if (userToEdit) {
        const { password, ...rest } = initialFormState;
        setFormData({ ...rest, ...userToEdit });
      } else {
        setFormData(initialFormState);
      }
      setShowPassword(false);
    }
  }, [open, userToEdit]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
    setShowPassword(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.email || !formData.full_name) {
        throw new Error("L'email et le nom complet sont requis.");
      }

      const userData = {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        status: formData.status,
        phone: formData.phone,
        department: formData.department,
        notes: formData.notes
      };

      if (userToEdit) {
        // EDIT — mise à jour directe dans la table
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
          metadata: { user_id: data.id, role: data.role }
        });

        toast({
          title: "Utilisateur modifié",
          description: "Les modifications ont été enregistrées.",
          className: "bg-green-50 border-green-200 text-green-900",
        });

        if (onUserSaved) onUserSaved(data);

      } else {
        // CREATE — appel à l'API Vercel (service_role côté serveur)
        if (!formData.password || formData.password.length < 6) {
          throw new Error("Le mot de passe est requis (6 caractères minimum).");
        }

        const res = await fetch('/api/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...userData, password: formData.password }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erreur serveur lors de la création.");

        const createdUser = json.user;

        await historyService.logEvent({
          type: 'user_created',
          title: `Nouvel utilisateur créé`,
          description: `${createdUser.full_name} créé avec le rôle ${createdUser.role}.`,
          metadata: { user_id: createdUser.id, email: createdUser.email }
        });

        toast({
          title: "Utilisateur créé",
          description: `${createdUser.full_name} peut maintenant se connecter.`,
          className: "bg-green-50 border-green-200 text-green-900",
        });

        if (onUserSaved) onUserSaved(createdUser);
      }

      onOpenChange(false);

    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Échec de l'opération",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!userToEdit;
  const selectedRole = ROLES.find(r => r.value === formData.role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            {isEditing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations et le rôle de l'utilisateur."
              : "Créez un compte — l'utilisateur pourra se connecter immédiatement."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Nom + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nom complet</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Jean Dupont"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isEditing}
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                placeholder="jean@exemple.com"
              />
              {isEditing && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  L'email de connexion ne peut pas être modifié ici.
                </p>
              )}
            </div>
          </div>

          {/* Mot de passe (création uniquement) */}
          {!isEditing && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                Mot de passe
                <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Requis</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Minimum 6 caractères"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="button" variant="outline" onClick={generatePassword}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Générer
                </Button>
              </div>
              <p className="text-xs text-slate-500">L'utilisateur pourra changer son mot de passe plus tard.</p>
            </div>
          )}

          {/* Rôle */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Rôle & Accès</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES.map(role => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    formData.role === role.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-sm text-slate-800">{role.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{role.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Téléphone + Département */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Téléphone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="+242 06 000 0000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Département</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Commercial, Flotte, etc."
              />
            </div>
          </div>

          {/* Statut */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Statut du compte</label>
            <div className="flex gap-3">
              {[{ value: 'active', label: 'Actif' }, { value: 'inactive', label: 'Inactif' }].map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: s.value }))}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.status === s.value
                      ? s.value === 'active'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-red-400 bg-red-50 text-red-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {s.value === 'active' ? '✅' : '🔒'} {s.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Un compte inactif ne peut pas se connecter.</p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Notes internes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Remarques visibles uniquement par les admins..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[160px]" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement...</>
              ) : (
                <><CheckCircle className="mr-2 h-4 w-4" />{isEditing ? 'Mettre à jour' : 'Créer le compte'}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;
