import React, { useState } from 'react';
import { Loader2, Key, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';

const AddLoanModal = ({ isOpen, onClose, vehicle, onSave }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    giver: 'Direction',
    receiver: '',
    loan_date: new Date().toISOString().split('T')[0],
    loan_type: 'prêt',
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.receiver) {
         throw new Error("Le bénéficiaire est obligatoire.");
      }

      // 1. Insert Loan Record
      const { error: loanError } = await supabase
        .from('vehicle_loans')
        .insert({
          vehicle_id: vehicle.id,
          giver: formData.giver,
          receiver: formData.receiver,
          loan_date: formData.loan_date,
          loan_type: formData.loan_type,
          notes: formData.notes
        });

      if (loanError) throw loanError;

      // 2. Update Vehicle Status
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'PRÊTÉ' })
        .eq('id', vehicle.id);

      if (vehicleError) throw vehicleError;

      await historyService.logEvent({
        type: 'vehicle_loaned',
        title: `Véhicule prêté: ${vehicle.name}`,
        description: `${formData.loan_type} à ${formData.receiver} par ${formData.giver}.`,
        vehicleId: vehicle.id,
        metadata: {
           receiver: formData.receiver,
           type: formData.loan_type
        }
      });

      toast({
        title: "Prêt enregistré",
        description: `Le véhicule est maintenant marqué comme PRÊTÉ à ${formData.receiver}.`,
        className: "bg-green-50 border-green-200 text-green-900",
      });

      if (onSave) onSave();
      onClose();

    } catch (error) {
      console.error('Error creating loan:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer le prêt.",
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
            <Key className="h-5 w-5 text-blue-600" />
            Nouveau Prêt Direction
          </DialogTitle>
          <DialogDescription>
            Enregistrez un prêt ou une mise à disposition pour {vehicle?.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700">Donneur (Qui donne)</label>
               <input
                 type="text"
                 value={formData.giver}
                 onChange={(e) => setFormData(prev => ({ ...prev, giver: e.target.value }))}
                 className="w-full p-2.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
               />
             </div>
             <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700">Type</label>
               <select
                 value={formData.loan_type}
                 onChange={(e) => setFormData(prev => ({ ...prev, loan_type: e.target.value }))}
                 className="w-full p-2.5 border border-gray-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500"
               >
                 <option value="prêt">Prêt temporaire</option>
                 <option value="don">Don / Affectation</option>
                 <option value="autre">Autre</option>
               </select>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Bénéficiaire (Qui reçoit) *</label>
            <input
              type="text"
              value={formData.receiver}
              onChange={(e) => setFormData(prev => ({ ...prev, receiver: e.target.value }))}
              placeholder="Nom du bénéficiaire"
              required
              className="w-full p-2.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Date du prêt</label>
            <input
              type="date"
              value={formData.loan_date}
              onChange={(e) => setFormData(prev => ({ ...prev, loan_date: e.target.value }))}
              className="w-full p-2.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
             <label className="text-sm font-medium text-gray-700">Notes</label>
             <textarea 
               value={formData.notes}
               onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
               className="w-full p-2.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
               rows={2}
             />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Valider le Prêt
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLoanModal;