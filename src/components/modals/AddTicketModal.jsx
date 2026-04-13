import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, MessageSquare, RefreshCw, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import { format } from 'date-fns';

const AddTicketModal = ({ open, onOpenChange, onTicketSaved, ticketToEdit = null }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [isClientsLoading, setIsClientsLoading] = useState(false);

  const initialFormState = {
    ticket_number: '',
    client_id: '',
    client_name: '',
    subject: '',
    description: '',
    priority: 'Moyenne',
    status: 'Ouvert',
    category: 'Autre',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (open) {
      fetchClients();
      if (ticketToEdit) {
        setFormData({
          ...ticketToEdit,
          client_id: ticketToEdit.client_id || '',
          client_name: ticketToEdit.client_name || ''
        });
      } else {
        setFormData({
          ...initialFormState,
          ticket_number: generateTicketNumber()
        });
      }
    }
  }, [open, ticketToEdit]);

  const generateTicketNumber = () => {
    const datePart = format(new Date(), 'yyMMdd');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `TKT-${datePart}-${randomPart}`;
  };

  const fetchClients = async () => {
    try {
      setIsClientsLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des clients.",
        variant: "destructive"
      });
    } finally {
      setIsClientsLoading(false);
    }
  };

  const handleClientSelect = (e) => {
    const clientId = e.target.value;
    const client = clients.find(c => c.id === clientId);
    setFormData(prev => ({
      ...prev,
      client_id: clientId,
      client_name: client ? client.name : ''
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.subject || !formData.ticket_number) {
        throw new Error("Le sujet et le numéro de ticket sont requis.");
      }

      const ticketData = { 
        ...formData,
        updated_at: new Date().toISOString()
      };
      
      let resultData;

      if (ticketToEdit) {
        // Update
        const { data, error } = await supabase
          .from('support_tickets')
          .update(ticketData)
          .eq('id', ticketToEdit.id)
          .select()
          .single();

        if (error) throw error;
        resultData = data;

        await historyService.logEvent({
          type: 'ticket_updated',
          title: `Ticket mis à jour`,
          description: `Ticket ${data.ticket_number} (${data.subject}) modifié.`,
          metadata: { ticket_number: data.ticket_number, status: data.status }
        });

        toast({
          title: "Ticket modifié",
          description: "Les modifications ont été enregistrées.",
          className: "bg-green-50 border-green-200 text-green-900",
        });

      } else {
        // Create
        const { data, error } = await supabase
          .from('support_tickets')
          .insert([ticketData])
          .select()
          .single();

        if (error) throw error;
        resultData = data;

        await historyService.logEvent({
          type: 'ticket_created',
          title: `Nouveau ticket créé`,
          description: `Ticket ${data.ticket_number} créé pour ${data.client_name}.`,
          metadata: { ticket_number: data.ticket_number, priority: data.priority }
        });

        toast({
          title: "Ticket créé",
          description: "Le ticket a été créé avec succès.",
          className: "bg-green-50 border-green-200 text-green-900",
        });
      }

      if (onTicketSaved) onTicketSaved(resultData);
      onOpenChange(false);

    } catch (error) {
      console.error('Error saving ticket:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!ticketToEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            {isEditing ? 'Modifier le ticket' : 'Nouveau ticket'}
          </DialogTitle>
          <DialogDescription>
            Créez ou modifiez un ticket de support client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Identification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Numéro de Ticket</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="ticket_number"
                  value={formData.ticket_number}
                  onChange={handleChange}
                  required
                  className="flex-1 p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                />
                {!isEditing && (
                  <Button type="button" variant="outline" size="icon" onClick={() => setFormData(prev => ({...prev, ticket_number: generateTicketNumber()}))} title="Générer nouveau">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Client</label>
              <div className="relative">
                <select
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleClientSelect}
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Sélectionner un client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {isClientsLoading && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Sujet</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              placeholder="Résumé du problème..."
              className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Détails complets de la demande..."
            />
          </div>

          {/* Classification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Priorité</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full p-2 border border-slate-200 rounded-md bg-white"
              >
                <option value="Basse">Basse</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Haute">Haute</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Statut</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full p-2 border border-slate-200 rounded-md bg-white"
              >
                <option value="Ouvert">Ouvert</option>
                <option value="En cours">En cours</option>
                <option value="Résolu">Résolu</option>
                <option value="Fermé">Fermé</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Catégorie</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full p-2 border border-slate-200 rounded-md bg-white"
              >
                <option value="Technique">Technique</option>
                <option value="Facturation">Facturation</option>
                <option value="Réservation">Réservation</option>
                <option value="Véhicule">Véhicule</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Notes internes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Notes visibles uniquement par l'équipe..."
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
                  {isEditing ? 'Mettre à jour' : 'Créer le ticket'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTicketModal;