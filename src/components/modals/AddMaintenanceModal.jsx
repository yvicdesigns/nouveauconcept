import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Wrench, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import { format } from 'date-fns';

const AddMaintenanceModal = ({ open, onOpenChange, onRecordSaved, recordToEdit = null }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(false);

  const initialFormState = {
    vehicle_id: '',
    type: 'breakdown',
    description: '',
    status: 'reported',
    priority: 'medium',
    reported_date: format(new Date(), 'yyyy-MM-dd'),
    completion_date: '',
    cost: '',
    mechanic: '',
    oil_change_mileage: '',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (open) {
      fetchVehicles();
      if (recordToEdit) {
        setFormData({
          ...recordToEdit,
          cost: recordToEdit.cost || '',
          completion_date: recordToEdit.completion_date || '',
          vehicle_id: recordToEdit.vehicle_id || '',
          oil_change_mileage: recordToEdit.oil_change_mileage || '',
        });
      } else {
        setFormData(initialFormState);
      }
    }
  }, [open, recordToEdit]);

  const fetchVehicles = async () => {
    try {
      setIsVehiclesLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, name, brand, model, license_plate')
        .order('name');

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des véhicules.",
        variant: "destructive"
      });
    } finally {
      setIsVehiclesLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.vehicle_id || !formData.type) {
        throw new Error("Le véhicule et le type d'intervention sont requis.");
      }

      const recordData = {
        ...formData,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        completion_date: formData.completion_date || null,
        oil_change_mileage: formData.oil_change_mileage ? parseInt(formData.oil_change_mileage) : null,
      };
      
      // Remove the 'vehicles' object if it exists from the join query in edit mode
      delete recordData.vehicles; 

      let resultData;

      if (recordToEdit) {
        // Update
        const { data, error } = await supabase
          .from('maintenance_records')
          .update(recordData)
          .eq('id', recordToEdit.id)
          .select('*, vehicles(name, brand, model, license_plate)')
          .single();

        if (error) throw error;
        resultData = data;

        await historyService.logEvent({
          type: 'maintenance_updated',
          title: `Maintenance mise à jour`,
          description: `Dossier de maintenance pour ${data.vehicles?.brand} ${data.vehicles?.model} mis à jour.`,
          metadata: { vehicle_id: data.vehicle_id, type: data.type }
        });

        toast({
          title: "Maintenance mise à jour",
          description: "Les modifications ont été enregistrées.",
          className: "bg-green-50 border-green-200 text-green-900",
        });

      } else {
        // Create
        const { data, error } = await supabase
          .from('maintenance_records')
          .insert([recordData])
          .select('*, vehicles(name, brand, model, license_plate)')
          .single();

        if (error) throw error;
        resultData = data;

        await historyService.logEvent({
          type: 'maintenance_created',
          title: `Maintenance créée`,
          description: `Nouvelle maintenance (${data.type}) pour ${data.vehicles?.brand} ${data.vehicles?.model}.`,
          metadata: { vehicle_id: data.vehicle_id, type: data.type, priority: data.priority }
        });

        toast({
          title: "Maintenance créée",
          description: "Le dossier de maintenance a été créé avec succès.",
          className: "bg-green-50 border-green-200 text-green-900",
        });
      }

      if (onRecordSaved) onRecordSaved(resultData);
      onOpenChange(false);

    } catch (error) {
      console.error('Error saving maintenance record:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!recordToEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
            {isEditing ? 'Modifier Maintenance' : 'Nouvelle Maintenance'}
          </DialogTitle>
          <DialogDescription>
            Gérez les pannes, entretiens et inspections des véhicules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Main Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Véhicule</label>
              <div className="relative">
                <select
                  name="vehicle_id"
                  value={formData.vehicle_id}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={isVehiclesLoading}
                  required
                >
                  <option value="">Sélectionner un véhicule...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} - {v.license_plate}
                    </option>
                  ))}
                </select>
                {isVehiclesLoading && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-200 rounded-md bg-white"
                >
                  <option value="breakdown">Panne</option>
                  <option value="scheduled">Entretien Planifié</option>
                  <option value="oil_change">Vidange</option>
                  <option value="inspection">Inspection</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Priorité</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-200 rounded-md bg-white"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                required
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Détails du problème ou de l'intervention..."
              />
            </div>
          </div>

          {/* Details */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.type === 'oil_change' && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Kilométrage à la vidange</label>
                <input
                  type="number"
                  name="oil_change_mileage"
                  value={formData.oil_change_mileage}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: 45000"
                  min="0"
                />
                <p className="text-xs text-slate-400">Ce kilométrage sera enregistré comme référence pour la prochaine vidange du véhicule</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Mécanicien assigné</label>
              <input
                type="text"
                name="mechanic"
                value={formData.mechanic}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Nom du technicien ou garage"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Coût estimé / final (FCFA)</label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date signalement</label>
              <input
                type="date"
                name="reported_date"
                value={formData.reported_date}
                onChange={handleChange}
                required
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date complétion</label>
              <input
                type="date"
                name="completion_date"
                value={formData.completion_date}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Statut actuel</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full p-2.5 border border-slate-200 rounded-md bg-white font-medium"
            >
              <option value="reported">Signalé</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Notes internes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Informations complémentaires..."
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
                  {isEditing ? 'Mettre à jour' : 'Enregistrer'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMaintenanceModal;