import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Building, Shield, Activity, Calendar, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ViewUserModal = ({ open, onOpenChange, user }) => {
  if (!user) return null;

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'staff': return 'bg-green-100 text-green-700 border-green-200';
      case 'viewer': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-700' 
      : 'bg-red-100 text-red-700';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-white/95 backdrop-blur-sm">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Détails de l'utilisateur
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{user.full_name}</h2>
                <div className="flex items-center gap-2 text-slate-500 mt-1">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getRoleColor(user.role)}`}>
                {user.role}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(user.status)}`}>
                {user.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 border-b pb-2">Informations Professionnelles</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Building className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">Département</span>
                  </div>
                  <span className="text-slate-900 font-medium">{user.department || '-'}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Shield className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">Rôle</span>
                  </div>
                  <span className="text-slate-900 font-medium capitalize">{user.role}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 border-b pb-2">Coordonnées & Activité</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">Téléphone</span>
                  </div>
                  <span className="text-slate-900 font-medium">{user.phone || '-'}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Activity className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">Dernière connexion</span>
                  </div>
                  <span className="text-slate-900 font-medium">
                    {user.last_login 
                      ? format(new Date(user.last_login), 'dd MMM yyyy HH:mm', { locale: fr })
                      : 'Jamais'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">Date de création</span>
                  </div>
                  <span className="text-slate-900 font-medium">
                    {user.created_at 
                      ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: fr })
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 border-b pb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Notes
            </h3>
            <div className="text-slate-600 italic bg-yellow-50 p-4 rounded-lg border border-yellow-100 min-h-[80px]">
              {user.notes || "Aucune note disponible."}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t bg-slate-50 flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewUserModal;