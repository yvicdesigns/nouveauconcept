import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Car, Calendar, Wrench as Tool, AlertCircle, User, CreditCard, FileText, X, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ViewMaintenanceModal = ({ open, onOpenChange, record }) => {
  if (!record) return null;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'reported': return 'bg-slate-100 text-slate-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status) => {
     switch (status) {
      case 'reported': return 'Signalé';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'breakdown': return 'Panne';
      case 'scheduled': return 'Entretien';
      case 'inspection': return 'Inspection';
      default: return type;
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      case 'low': return 'Basse';
      default: return priority;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-white/95 backdrop-blur-sm">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Tool className="h-5 w-5 text-blue-600" />
            Détails Maintenance
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Car className="h-5 w-5 text-slate-500" />
                {record.vehicles ? `${record.vehicles.brand} ${record.vehicles.model}` : 'Véhicule Inconnu'}
              </h2>
              <p className="text-sm text-slate-500 pl-7">
                {record.vehicles?.license_plate || '-'}
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getPriorityColor(record.priority)}`}>
                {getPriorityLabel(record.priority)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(record.status)}`}>
                {getStatusLabel(record.status)}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase">Type d'intervention</span>
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <AlertCircle className="h-4 w-4 text-slate-400" />
                {getTypeLabel(record.type)}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase">Mécanicien</span>
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <User className="h-4 w-4 text-slate-400" />
                {record.mechanic || 'Non assigné'}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase">Date signalement</span>
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <Calendar className="h-4 w-4 text-slate-400" />
                {record.reported_date ? format(new Date(record.reported_date), 'dd MMM yyyy', { locale: fr }) : '-'}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase">Coût total</span>
              <div className="flex items-center gap-2 font-medium text-slate-900">
                <CreditCard className="h-4 w-4 text-slate-400" />
                {record.cost ? `${parseFloat(record.cost).toLocaleString('fr-FR')} €` : '-'}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 border-b pb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Description
            </h3>
            <div className="text-slate-700 whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-100">
              {record.description || "Aucune description fournie."}
            </div>
          </div>

           {/* Completion Info if available */}
           {record.completion_date && (
            <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Intervention terminée</p>
                <p className="text-sm text-green-700">
                  Le {format(new Date(record.completion_date), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
           )}

          {/* Notes */}
          {record.notes && (
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 border-b pb-2">Notes internes</h3>
              <div className="text-slate-600 italic bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                {record.notes}
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

export default ViewMaintenanceModal;