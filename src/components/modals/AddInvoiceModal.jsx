import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Receipt, FileText, Calculator, Calendar as CalendarIcon, Search, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import { format, addDays, parseISO, differenceInDays } from 'date-fns';

const AddInvoiceModal = ({ open, onOpenChange, onInvoiceSaved, invoiceToEdit = null, prefillReservationId = null }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [drivers, setDrivers] = useState([]);
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
    commission_rate: 0,
    commission_amount: 0,
    commission_type: "Apporteur d'affaires",
    driver_id: '',
    total_amount: 0,
    status: 'Brouillon',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    notes: '',
    client_phone: '',
    client_cni: '',
    caution: false,
    caution_amount: 0,
    remise: 0,
    acompte: 0,
    payment_method: 'Espèces',
    payment_conditions: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (open) {
      fetchReservations();
      fetchDrivers();
      if (invoiceToEdit) {
        setFormData({
          ...invoiceToEdit,
          reservation_id: invoiceToEdit.reservation_id || '',
          driver_id: invoiceToEdit.driver_id || '',
          commission_rate: invoiceToEdit.commission_rate || 0,
          commission_amount: invoiceToEdit.commission_amount || 0,
          commission_type: invoiceToEdit.commission_type || "Apporteur d'affaires",
          client_phone: invoiceToEdit.client_phone || '',
          client_cni: invoiceToEdit.client_cni || '',
          caution: invoiceToEdit.caution || false,
          caution_amount: invoiceToEdit.caution_amount || 0,
          remise: invoiceToEdit.remise || 0,
          acompte: invoiceToEdit.acompte || 0,
          payment_method: invoiceToEdit.payment_method || 'Espèces',
          payment_conditions: invoiceToEdit.payment_conditions || '',
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
          driver_name,
          contacts (id, name, phone),
          vehicles (name, brand, model, license_plate, daily_rate)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

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

  const fetchDrivers = async () => {
    const { data } = await supabase.from('drivers').select('id, name').eq('status', 'active').order('name');
    setDrivers(data || []);
  };

  // Auto-prefill when reservations load and prefillReservationId is set
  useEffect(() => {
    if (prefillReservationId && reservations.length > 0 && !invoiceToEdit) {
      applyReservationData(prefillReservationId);
    }
  }, [reservations, prefillReservationId]);

  const applyReservationData = (resId) => {
    const reservation = reservations.find(r => r.id === resId);
    if (!reservation) return;
    const startDate = parseISO(reservation.start_date);
    const endDate = parseISO(reservation.end_date);
    const days = differenceInDays(endDate, startDate) || 1;
    // Priorité à total_price de la réservation, sinon calcul depuis daily_rate
    const reservationTotal = Number(reservation.total_price) || 0;
    const vehicleDailyRate = reservation.vehicles?.daily_rate || 0;
    const subtotal = reservationTotal > 0 ? reservationTotal : days * vehicleDailyRate;
    const dailyRate = reservationTotal > 0 && days > 0
      ? Math.round(reservationTotal / days)
      : vehicleDailyRate;
    setFormData(prev => {
      const commRate = Number(prev.commission_rate) || 0;
      const commAmt = Math.round(subtotal * commRate / 100);
      return {
        ...prev,
        reservation_id: resId,
        client_name:  reservation.contacts?.name  || 'Client inconnu',
        client_phone: reservation.contacts?.phone || prev.client_phone || '',
        vehicle_details: `${reservation.vehicles?.brand} ${reservation.vehicles?.model} (${reservation.vehicles?.license_plate})`,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date:   format(endDate,   'yyyy-MM-dd'),
        daily_rate: dailyRate,
        days_count: days,
        subtotal,
        tax_amount: 0,
        commission_amount: commAmt,
        total_amount: subtotal + commAmt,
        ...(reservation.driver_name ? { notes: prev.notes || `Chauffeur : ${reservation.driver_name}` } : {}),
      };
    });
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
      
      const reservationTotal = Number(reservation.total_price) || 0;
      const vehicleDailyRate = reservation.vehicles?.daily_rate || 0;
      const subtotal = reservationTotal > 0 ? reservationTotal : days * vehicleDailyRate;
      const dailyRate = reservationTotal > 0 && days > 0
        ? Math.round(reservationTotal / days)
        : vehicleDailyRate;

      setFormData(prev => {
        const commRate = Number(prev.commission_rate) || 0;
        const commAmt = Math.round(subtotal * commRate / 100);
        return {
          ...prev,
          reservation_id: resId,
          client_name:  reservation.contacts?.name  || 'Client inconnu',
          client_phone: reservation.contacts?.phone || prev.client_phone || '',
          vehicle_details: `${reservation.vehicles?.brand} ${reservation.vehicles?.model} (${reservation.vehicles?.license_plate})`,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date:   format(endDate,   'yyyy-MM-dd'),
          daily_rate: dailyRate,
          days_count: days,
          subtotal,
          tax_amount: 0,
          commission_amount: commAmt,
          total_amount: subtotal + commAmt,
          ...(reservation.driver_name ? { notes: prev.notes || `Chauffeur : ${reservation.driver_name}` } : {}),
        };
      });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Recalculate when rates, days or commission_rate change
  useEffect(() => {
    if (formData.daily_rate && formData.days_count) {
      const subtotal = formData.days_count * formData.daily_rate;
      const commAmt = Math.round(subtotal * (Number(formData.commission_rate) || 0) / 100);
      setFormData(prev => ({
        ...prev,
        subtotal,
        tax_amount: 0,
        commission_amount: commAmt,
        total_amount: subtotal + commAmt,
      }));
    }
  }, [formData.daily_rate, formData.days_count, formData.commission_rate]);

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
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Téléphone client</label>
              <input
                type="text"
                name="client_phone"
                value={formData.client_phone}
                onChange={handleChange}
                placeholder="+242 06..."
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">N° CNI client</label>
              <input
                type="text"
                name="client_cni"
                value={formData.client_cni}
                onChange={handleChange}
                placeholder="Numéro CNI..."
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Chauffeur assigné</label>
              <select
                name="driver_id"
                value={formData.driver_id}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Aucun chauffeur —</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
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
                  <option value="En retard">En retard</option>
                  <option value="Payé">Payé</option>
                  <option value="En retard">En retard</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Sous-total</span>
                <span className="font-medium">{Number(formData.subtotal).toLocaleString()} FCFA</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-slate-600 whitespace-nowrap">Commission apporteur</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      name="commission_rate"
                      value={formData.commission_rate}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.5"
                      className="w-16 p-1 border border-slate-200 rounded text-center text-sm"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                  <select
                    name="commission_type"
                    value={formData.commission_type}
                    onChange={handleChange}
                    className="flex-1 p-1 border border-slate-200 rounded text-xs bg-white"
                  >
                    <option value="Apporteur d'affaires">Apporteur d'affaires</option>
                    <option value="Gestionnaire">Gestionnaire</option>
                    <option value="Partenaire">Partenaire</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <span className="font-medium whitespace-nowrap">{Number(formData.commission_amount).toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span className="text-blue-600">{Number(formData.total_amount).toLocaleString()} FCFA</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm border-t border-slate-100 pt-2">
                <span className="text-slate-600">Remise (FCFA)</span>
                <input
                  type="number"
                  name="remise"
                  value={formData.remise}
                  onChange={handleChange}
                  min="0"
                  className="w-32 p-1 border border-slate-200 rounded text-right text-sm"
                />
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    name="caution"
                    checked={formData.caution}
                    onChange={handleChange}
                    className="rounded"
                  />
                  Caution
                </label>
                {formData.caution && (
                  <input
                    type="number"
                    name="caution_amount"
                    value={formData.caution_amount}
                    onChange={handleChange}
                    min="0"
                    placeholder="Montant FCFA"
                    className="w-32 p-1 border border-slate-200 rounded text-right text-sm"
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-600">Acompte versé (FCFA)</span>
                <input
                  type="number"
                  name="acompte"
                  value={formData.acompte}
                  onChange={handleChange}
                  min="0"
                  className="w-32 p-1 border border-slate-200 rounded text-right text-sm"
                />
              </div>
              <div className="flex justify-between text-base font-bold text-green-700 pt-2 border-t-2 border-slate-300">
                <span>Reste à payer</span>
                <span>{Math.max(0, Number(formData.total_amount) - Number(formData.remise) - Number(formData.acompte)).toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>

          {/* Paiement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Mode de paiement</label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Espèces">Espèces</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Virement bancaire">Virement bancaire</option>
                <option value="Chèque">Chèque</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Conditions de paiement</label>
              <input
                type="text"
                name="payment_conditions"
                value={formData.payment_conditions}
                onChange={handleChange}
                placeholder="Ex: Paiement à réception..."
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500"
              />
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