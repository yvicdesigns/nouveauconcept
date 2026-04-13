import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { Loader2, AlertTriangle, Key } from "lucide-react";
import { historyService } from '@/lib/historyService';

const AdminChangePasswordModal = ({ isOpen, onClose, user }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
      });
      return;
    }

    if (newPassword.length < 6) {
       toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
      });
      return;
    }

    setLoading(true);

    try {
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('admin-update-password', {
        body: { 
          userId: user.id, 
          newPassword: newPassword 
        }
      });

      if (error) {
        // Network or invocation error
        throw new Error(error.message || "Erreur de connexion au serveur.");
      }

      if (data && data.error) {
         // Logic error from the function
         if (data.error.includes("User not found in Auth system")) {
             throw new Error("Cet utilisateur n'existe pas dans le système d'authentification (Auth) et n'a pas pu être synchronisé.");
         }
         if (data.error.includes("Database error loading user")) {
            throw new Error("Erreur technique lors de l'accès à la base de données. Veuillez réessayer.");
         }
         if (data.error.includes("Invalid User ID")) {
            throw new Error("L'ID de cet utilisateur est invalide (non-UUID). Impossible de changer le mot de passe.");
         }
         
         throw new Error(data.error);
      }

      // Log the event
      await historyService.logEvent({
        type: 'user_password_changed_by_admin',
        title: "Mot de passe modifié par l'admin",
        description: `Le mot de passe de l'utilisateur ${user.full_name} (${user.email}) a été modifié manuellement par un administrateur.`,
        metadata: { userId: user.id }
      });

      toast({
        title: "Mot de passe mis à jour",
        description: `Le mot de passe pour ${user.full_name} a été changé avec succès.`,
        className: "bg-green-50 border-green-200 text-green-900",
      });
      
      handleClose();

    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Échec de la modification",
        description: error.message || "Impossible de changer le mot de passe.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-600" />
            Changer le mot de passe
          </DialogTitle>
          <DialogDescription>
            Définir un nouveau mot de passe pour <strong>{user.full_name}</strong>.
            <div className="mt-2 flex items-start gap-2 text-amber-600 bg-amber-50 p-2 rounded text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Cette action écrasera immédiatement le mot de passe actuel de l'utilisateur. Si l'utilisateur n'existe pas dans le système de connexion (Auth), il sera créé automatiquement.</span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="focus-visible:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="focus-visible:ring-blue-500"
            />
          </div>
          <DialogFooter>
             <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mettre à jour
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminChangePasswordModal;