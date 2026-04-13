import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';

const AddInsuranceModal = ({ isOpen, onClose, vehicle, onSave }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    insurance_date: '',
    insurance_expiry: ''
  });

  useEffect(() => {
    if (isOpen && vehicle) {
      setFormData({
        insurance_date: vehicle.rawData?.last_insurance_date || '',
        insurance_expiry: vehicle.rawData?.insurance_expiry_date || ''
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
          last_insurance_date: formData.insurance_date || null,
          insurance_expiry_date: formData.insurance_expiry || null
        })
        .eq('id', vehicle.id);

      if (error) throw error;

      await historyService.logEvent({
        type: 'vehicle_insurance_updated',
        title: `Assurance mise à jour: ${vehicle.name}`,
        description: `Nouvelle expiration: ${formData.insurance_expiry}`,
        vehicleId: vehicle.id,
        metadata: {
           expiry: formData.insurance_expiry
        }
      });

      toast({
        title: "Assurance mise à jour",
        description: "Les dates d'assurance ont été enregistrées.",
        className: "bg-green-50 border-green-200 text-green-900",
      });

      if (onSave) onSave();
      onClose();

    } catch (error) {
      console.error('Error updating insurance:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'assurance.",
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
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Mise à jour Assurance
          </DialogTitle>
          <DialogDescription>
            Saisissez les nouvelles dates d'assurance pour {vehicle?.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Date de début / Souscription</label>
            <input
              type="date"
              value={formData.insurance_date}
              onChange={(e) => setFormData(prev => ({ ...prev, insurance_date: e.target.value }))}
              className="w-full p-2.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Date d'expiration</label>
            <input
              type="date"
              value={formData.insurance_expiry}
              onChange={(e) => setFormData(prev => ({ ...prev, insurance_expiry: e.target.value }))}
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

export default AddInsuranceModal;