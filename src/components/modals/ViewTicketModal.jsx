import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, User, Clock, AlertCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ViewTicketModal = ({ open, onOpenChange, ticket }) => {
  if (!ticket) return null;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgente': return 'bg-red-100 text-red-700 border-red-200';
      case 'Haute': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Moyenne': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Basse': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ouvert': return 'bg-blue-100 text-blue-700';
      case 'En cours': return 'bg-purple-100 text-purple-700';
      case 'Résolu': return 'bg-green-100 text-green-700';
      case 'Fermé': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-white/95 backdrop-blur-sm">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Ticket {ticket.ticket_number}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">{ticket.subject}</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Créé le {format(new Date(ticket.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getPriorityColor(ticket.priority)}`}>
                {ticket.priority}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(ticket.status)}`}>
                {ticket.status}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase">Client</span>
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <User className="h-4 w-4 text-slate-400" />
                {ticket.client_name || 'Client inconnu'}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase">Catégorie</span>
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <AlertCircle className="h-4 w-4 text-slate-400" />
                {ticket.category}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 border-b pb-2">Description</h3>
            <div className="text-slate-700 whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100">
              {ticket.description || "Aucune description fournie."}
            </div>
          </div>

          {/* Notes */}
          {ticket.notes && (
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 border-b pb-2">Notes internes</h3>
              <div className="text-slate-600 italic bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                {ticket.notes}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t bg-slate-50 flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewTicketModal;