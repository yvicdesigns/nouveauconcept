import React, { useState, useEffect } from 'react';
import { Loader2, Wrench, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';

const AddTechnicalControlModal = ({ isOpen, onClose, vehicle, onSave }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    check_date: '',
    check_expiry: ''
  });

  useEffect(() => {
    if (isOpen && vehicle) {
      setFormData({
        check_date: vehicle.rawData?.last_technical_check_date || '',
        check_expiry: vehicle.rawData?.technical_check_expiry_date || ''
      });
    }
  }, [isOpen, vehicle]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          last_technical_check_date: formData.check_date || null,
          technical_check_expiry_date: formData.check_expiry || null
        })
        .eq('id', vehicle.id);

      if (error) throw error;

      await historyService.logEvent({
        type: 'vehicle_tech_check_updated',
        title: `Contrôle Technique mis à jour: ${vehicle.name}`,
        description: `Nouvelle expiration: ${formData.check_expiry}`,
        vehicleId: vehicle.id,
        metadata: {
           expiry: formData.check_expiry
        }
      });

      toast({
        title: "Contrôle technique mis à jour",
        description: "Les dates ont été enregistrées avec succès.",
        className: "bg-green-50 border-green-200 text-green-900",
      });

      if (onSave) onSave();
      onClose();

    } catch (error) {
      console.error('Error updating technical check:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le contrôle technique.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            Contrôle Technique
          </DialogTitle>
          <DialogDescription>
             Saisissez les dates du contrôle technique pour {vehicle?.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Date du dernier contrôle</label>
            <input
              type="date"
              value={formData.check_date}
              onChange={(e) => setFormData(prev => ({ ...prev, check_date: e.target.value }))}
              className="w-full p-2.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Date d'expiration</label>
            <input
              type="date"
              value={formData.check_expiry}
              onChange={(e) => setFormData(prev => ({ ...prev, check_expiry: e.target.value }))}
              className="w-full p-2.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTechnicalControlModal;