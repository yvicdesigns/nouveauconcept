import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, UserPlus, RefreshCw, Copy, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';

const AddUserModal = ({ open, onOpenChange, onUserSaved, userToEdit = null }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const initialFormState = {
    email: '',
    full_name: '',
    role: 'staff',
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
        // Remove password from state when editing (we don't edit it here usually)
        // eslint-disable-next-line no-unused-vars
        const { password, ...rest } = initialFormState; 
        setFormData({ ...rest, ...userToEdit });
      } else {
        setFormData(initialFormState);
      }
      setShowPassword(false);
    }
  }, [open, userToEdit]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
    setShowPassword(true); // Show it so they can see what was generated
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

      // Prepare data object
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
        // --- EDIT MODE ---
        // For edits, we only update the database table directly.
        
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
          description: `L'utilisateur ${data.full_name} (${data.role}) a été modifié.`,
          metadata: { user_id: data.id, role: data.role }
        });

        toast({
          title: "Utilisateur modifié",
          description: "Les modifications ont été enregistrées.",
          className: "bg-green-50 border-green-200 text-green-900",
        });
        
        if (onUserSaved) onUserSaved(data);

      } else {
        // --- CREATE MODE ---
        
        if (!formData.password || formData.password.length < 6) {
           throw new Error("Le mot de passe est requis et doit contenir au moins 6 caractères.");
        }

        const payload = {
          ...userData,
          password: formData.password
        };

        // Invoke the Edge Function 'admin-create-user'
        const { data, error } = await supabase.functions.invoke('admin-create-user', {
          body: payload
        });

        if (error) {
           throw new Error(error.message || "Erreur lors de l'appel au serveur de création.");
        }
        
        if (data && data.error) {
            throw new Error(data.error);
        }

        const createdUser = data.user;

        await historyService.logEvent({
          type: 'user_created',
          title: `Nouvel utilisateur créé`,
          description: `Utilisateur ${createdUser.full_name} créé avec le rôle ${createdUser.role}.`,
          metadata: { user_id: createdUser.id, email: createdUser.email }
        });

        toast({
          title: "Utilisateur créé",
          description: "Le compte a été créé dans le système d'authentification et la base de données.",
          className: "bg-green-50 border-green-200 text-green-900",
        });
        
        if (onUserSaved) onUserSaved(createdUser);
      }

      onOpenChange(false);

    } catch (error) {
      console.error('Error saving user:', error);
      
      let errorMessage = error.message;
      if (errorMessage.includes("already registered") || errorMessage.includes("unique constraint")) {
        errorMessage = "Cet email est déjà utilisé par un autre utilisateur.";
      }

      toast({
        title: "Échec de l'opération",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!userToEdit;

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
              ? "Modifiez les informations et permissions de l'utilisateur."
              : "Créez un nouveau compte utilisateur."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="jean.dupont@exemple.com"
              />
              {isEditing && (
                 <p className="text-xs text-amber-600 flex items-center gap-1">
                   <AlertTriangle className="h-3 w-3" />
                   Modifier l'email ici ne change pas l'email de connexion.
                 </p>
              )}
            </div>
          </div>
          
          {/* Manual Password Entry (Only for new users) */}
          {!isEditing && (
            <div className="space-y-2">
               <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                 Mot de passe
                 <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                   Requis
                 </span>
               </label>
               <div className="flex gap-2">
                 <div className="relative flex-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 pr-10"
                      placeholder="Mot de passe..."
                      required={!isEditing}
                      minLength={6}
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
                 <Button type="button" variant="outline" onClick={generatePassword} title="Générer un mot de passe fort">
                   <RefreshCw className="h-4 w-4 mr-2" />
                   Générer
                 </Button>
               </div>
               <p className="text-xs text-slate-500">
                  Minimum 6 caractères. L'utilisateur pourra le changer plus tard.
               </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Téléphone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="+33 6 12 34 56 78"
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
                placeholder="Commercial, Support, etc."
              />
            </div>
          </div>

          {/* Role & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Rôle</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-md bg-white"
              >
                <option value="admin">Administrateur</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="viewer">Observateur</option>
              </select>
              <p className="text-xs text-slate-500">Détermine les permissions d'accès.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Statut</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-md bg-white"
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
              <p className="text-xs text-slate-500">Un compte inactif ne peut pas se connecter.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Remarques internes..."
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isEditing ? 'Mettre à jour' : 'Créer utilisateur'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;