import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Receipt, FileText, Calculator, Calendar as CalendarIcon, Search, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import { format, addDays, parseISO, differenceInDays } from 'date-fns';

const AddInvoiceModal = ({ open, onOpenChange, onInvoiceSaved, invoiceToEdit = null }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [isReservationsLoading, setIsReservationsLoading] = useState(false);

  const initialFormState = {
    invoice_number: '',
    reservation_id: '',
    client_name: '',
    vehicle_details: '',
    start_date: '',
    end_date: '',
    daily_rate: 0,
    days_count: 0,
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    status: 'Brouillon',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (open) {
      fetchReservations();
      if (invoiceToEdit) {
        setFormData({
          ...invoiceToEdit,
          reservation_id: invoiceToEdit.reservation_id || '', // Handle null UUID from DB
          // Ensure dates are formatted correctly for input[type="date"]
          start_date: invoiceToEdit.start_date ? format(new Date(invoiceToEdit.start_date), 'yyyy-MM-dd') : '',
          end_date: invoiceToEdit.end_date ? format(new Date(invoiceToEdit.end_date), 'yyyy-MM-dd') : '',
          issue_date: invoiceToEdit.issue_date ? format(new Date(invoiceToEdit.issue_date), 'yyyy-MM-dd') : '',
          due_date: invoiceToEdit.due_date ? format(new Date(invoiceToEdit.due_date), 'yyyy-MM-dd') : '',
        });
      } else {
        setFormData({
          ...initialFormState,
          invoice_number: generateInvoiceNumber()
        });
      }
    }
  }, [open, invoiceToEdit]);

  const generateInvoiceNumber = () => {
    const datePart = format(new Date(), 'yyyyMMdd');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `INV-${datePart}-${randomPart}`;
  };

  const fetchReservations = async () => {
    try {
      setIsReservationsLoading(true);
      // Fetch reservations with related data
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          start_date,
          end_date,
          total_price,
          contacts (name),
          vehicles (name, brand, model, license_plate, daily_rate)
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to recent 50 for performance

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les réservations.",
        variant: "destructive"
      });
    } finally {
      setIsReservationsLoading(false);
    }
  };

  const handleReservationSelect = (e) => {
    const resId = e.target.value;
    if (!resId) {
      // If cleared, just update the ID
      setFormData(prev => ({ ...prev, reservation_id: '' }));
      return;
    }

    const reservation = reservations.find(r => r.id === resId);
    if (reservation) {
      const startDate = parseISO(reservation.start_date);
      const endDate = parseISO(reservation.end_date);
      const days = differenceInDays(endDate, startDate) || 1; // Min 1 day
      
      // Calculate financials
      const dailyRate = reservation.vehicles?.daily_rate || 0;
      const subtotal = days * dailyRate;
      const tax = subtotal * 0.20;
      const total = subtotal + tax;

      setFormData(prev => ({
        ...prev,
        reservation_id: resId,
        client_name: reservation.contacts?.name || 'Client inconnu',
        vehicle_details: `${reservation.vehicles?.brand} ${reservation.vehicles?.model} (${reservation.vehicles?.license_plate})`,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        daily_rate: dailyRate,
        days_count: days,
        subtotal: subtotal,
        tax_amount: tax,
        total_amount: total
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Recalculate if rates or days are manually changed
  useEffect(() => {
    if (formData.daily_rate && formData.days_count) {
      const subtotal = formData.days_count * formData.daily_rate;
      const tax = subtotal * 0.20;
      const total = subtotal + tax;
      
      setFormData(prev => ({
        ...prev,
        subtotal,
        tax_amount: tax,
        total_amount: total
      }));
    }
  }, [formData.daily_rate, formData.days_count]); // Watch these dependencies

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.client_name || !formData.invoice_number) {
        throw new Error("Le nom du client et le numéro de facture sont requis.");
      }

      // Sanitize data: Convert empty string reservation_id to null
      const invoiceData = { 
        ...formData,
        reservation_id: formData.reservation_id === '' ? null : formData.reservation_id
      };

      let resultData;

      if (invoiceToEdit) {
        // Update
        const { data, error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoiceToEdit.id)
          .select()
          .single();

        if (error) throw error;
        resultData = data;

        await historyService.logEvent({
          type: 'invoice_updated',
          title: `Facture mise à jour`,
          description: `La facture ${data.invoice_number} pour ${data.client_name} a été modifiée.`,
          metadata: { invoice_number: data.invoice_number, amount: data.total_amount }
        });

        toast({
          title: "Facture modifiée",
          description: "Les modifications ont été enregistrées.",
          className: "bg-green-50 border-green-200 text-green-900",
        });

      } else {
        // Create
        const { data, error } = await supabase
          .from('invoices')
          .insert([invoiceData])
          .select()
          .single();

        if (error) throw error;
        resultData = data;

        await historyService.logEvent({
          type: 'invoice_created',
          title: `Nouvelle facture générée`,
          description: `Facture ${data.invoice_number} créée pour ${data.client_name} (${data.total_amount} FCFA).`,
          metadata: { invoice_number: data.invoice_number, amount: data.total_amount }
        });

        toast({
          title: "Facture créée",
          description: "La facture a été générée avec succès.",
          className: "bg-green-50 border-green-200 text-green-900",
        });
      }

      if (onInvoiceSaved) onInvoiceSaved(resultData);
      onOpenChange(false);

    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!invoiceToEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
            {isEditing ? 'Modifier la facture' : 'Nouvelle facture'}
          </DialogTitle>
          <DialogDescription>
            Créez ou modifiez une facture liée à une réservation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
          {/* Top Section: Link Reservation & Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Search className="h-4 w-4" /> Lier à une Réservation
              </label>
              <div className="relative">
                <select
                  name="reservation_id"
                  value={formData.reservation_id}
                  onChange={handleReservationSelect}
                  disabled={isEditing} 
                  className="w-full p-2.5 pl-3 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">Sélectionner une réservation...</option>
                  {reservations.map(r => (
                    <option key={r.id} value={r.id}>
                      {format(parseISO(r.start_date), 'dd/MM/yy')} - {r.contacts?.name} ({r.vehicles?.name})
                    </option>
                  ))}
                </select>
                {isReservationsLoading && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>
              <p className="text-xs text-slate-500">La sélection remplira automatiquement les détails.</p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Numéro de Facture
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleChange}
                  required
                  className="flex-1 p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                />
                {!isEditing && (
                  <Button type="button" variant="outline" size="icon" onClick={() => setFormData(prev => ({...prev, invoice_number: generateInvoiceNumber()}))} title="Générer nouveau">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Client & Vehicle Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Client</label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                required
                placeholder="Nom du client"
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Détails Véhicule</label>
              <input
                type="text"
                name="vehicle_details"
                value={formData.vehicle_details}
                onChange={handleChange}
                required
                placeholder="Marque, Modèle, Plaque"
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Dates & Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date de début</label>
              <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required className="w-full p-2 border rounded-md" />
             </div>
             <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date de fin</label>
              <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} required className="w-full p-2 border rounded-md" />
             </div>
             <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date d'émission</label>
              <input type="date" name="issue_date" value={formData.issue_date} onChange={handleChange} required className="w-full p-2 border rounded-md" />
             </div>
             <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date d'échéance</label>
              <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} required className="w-full p-2 border rounded-md" />
             </div>
          </div>

          {/* Financials */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Détails Financiers
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase">Prix par jour (FCFA)</label>
                <input
                  type="number"
                  name="daily_rate"
                  value={formData.daily_rate}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md text-right"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase">Nombre de jours</label>
                <input
                  type="number"
                  name="days_count"
                  value={formData.days_count}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md text-right"
                />
              </div>
               <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 uppercase">Statut</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-200 rounded-md bg-white"
                >
                  <option value="Brouillon">Brouillon</option>
                  <option value="Envoyé">Envoyé</option>
                  <option value="Payé">Payé</option>
                  <option value="En retard">En retard</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Sous-total</span>
                <span className="font-medium">{Number(formData.subtotal).toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">TVA (20%)</span>
                <span className="font-medium">{Number(formData.tax_amount).toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-slate-900 pt-2">
                <span>Total</span>
                <span className="text-blue-600">{Number(formData.total_amount).toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Notes (visible sur la facture)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Instructions de paiement, remerciements..."
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
                  Traitement...
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

export default AddInvoiceModal;