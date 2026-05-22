import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Calendar, Car, User, Clock, AlertCircle, Calculator, ChevronLeft, ChevronRight, MapPin, CreditCard, Banknote, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const newRow = () => ({ key: Date.now() + Math.random(), vehicle_id: '', price: 0 });

const AddReservationModal = ({ open, onOpenChange, onReservationSaved, reservationToEdit = null }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleReservations, setVehicleReservations] = useState([]);
  const [calendarVehicleId, setCalendarVehicleId] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const initialFormState = {
    client_id: '',
    vehicleRows: [newRow()],
    start_date: '',
    start_time: '09:00',
    end_date: '',
    end_time: '18:00',
    status: 'En attente',
    payment_mode: 'immediate',
    driver_name: '',
    departure_location: '',
    return_location: '',
    notes: '',
    cancellation_penalty: 0,
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (open) {
      fetchDependencies();
      if (reservationToEdit) {
        setFormData({
          client_id: reservationToEdit.client_id,
          vehicleRows: [{ key: 0, vehicle_id: reservationToEdit.vehicle_id, price: reservationToEdit.total_price || 0 }],
          start_date: reservationToEdit.start_date ? format(new Date(reservationToEdit.start_date), 'yyyy-MM-dd') : '',
          start_time: reservationToEdit.start_date ? format(new Date(reservationToEdit.start_date), 'HH:mm') : '09:00',
          end_date: reservationToEdit.end_date ? format(new Date(reservationToEdit.end_date), 'yyyy-MM-dd') : '',
          end_time: reservationToEdit.end_date ? format(new Date(reservationToEdit.end_date), 'HH:mm') : '18:00',
          status: reservationToEdit.status,
          payment_mode: reservationToEdit.payment_mode || 'immediate',
          driver_name: reservationToEdit.driver_name || '',
          departure_location: reservationToEdit.departure_location || '',
          return_location: reservationToEdit.return_location || '',
          notes: reservationToEdit.notes || '',
          cancellation_penalty: reservationToEdit.cancellation_penalty || 0,
        });
        setCalendarVehicleId(reservationToEdit.vehicle_id);
        fetchVehicleReservations(reservationToEdit.vehicle_id);
      } else {
        setFormData(initialFormState);
        setVehicleReservations([]);
        setCalendarVehicleId('');
      }
    }
  }, [open, reservationToEdit]);

  // Recalculate all rows when dates change
  useEffect(() => {
    if (!formData.start_date || !formData.end_date || vehicles.length === 0) return;
    setFormData(prev => ({
      ...prev,
      vehicleRows: prev.vehicleRows.map(row => {
        if (!row.vehicle_id) return row;
        const v = vehicles.find(v => v.id === row.vehicle_id);
        if (!v || !v.daily_rate) return row;
        const days = differenceInDays(parseISO(prev.end_date), parseISO(prev.start_date)) || 1;
        return { ...row, price: days * v.daily_rate };
      }),
    }));
  }, [formData.start_date, formData.end_date]);

  const fetchDependencies = async () => {
    try {
      const { data: clientsData } = await supabase.from('contacts').select('id, name').order('name');
      const { data: vehiclesData } = await supabase.from('vehicles').select('id, name, brand, model, license_plate, daily_rate').order('name');
      setClients(clientsData || []);
      setVehicles(vehiclesData || []);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
    }
  };

  const fetchVehicleReservations = async (vehicleId) => {
    if (!vehicleId) return;
    const { data } = await supabase
      .from('reservations')
      .select('start_date, end_date, id')
      .eq('vehicle_id', vehicleId)
      .neq('status', 'Annulée');
    setVehicleReservations(data || []);
  };

  // ── Vehicle row management ──────────────────────────────────────────────
  const addVehicleRow = () => {
    setFormData(prev => ({ ...prev, vehicleRows: [...prev.vehicleRows, newRow()] }));
  };

  const removeVehicleRow = (index) => {
    setFormData(prev => {
      const rows = prev.vehicleRows.filter((_, i) => i !== index);
      // Update calendar focus if the removed row was the focused one
      const remaining = rows.find(r => r.vehicle_id);
      if (remaining) {
        setCalendarVehicleId(remaining.vehicle_id);
        fetchVehicleReservations(remaining.vehicle_id);
      } else {
        setCalendarVehicleId('');
        setVehicleReservations([]);
      }
      return { ...prev, vehicleRows: rows };
    });
  };

  const updateVehicleRow = (index, field, value) => {
    setFormData(prev => {
      const rows = [...prev.vehicleRows];
      rows[index] = { ...rows[index], [field]: value };

      // Auto-calculate price when vehicle is selected
      if (field === 'vehicle_id' && value) {
        const v = vehicles.find(v => v.id === value);
        if (v && v.daily_rate) {
          if (prev.start_date && prev.end_date) {
            const days = differenceInDays(parseISO(prev.end_date), parseISO(prev.start_date)) || 1;
            rows[index].price = days * v.daily_rate;
          } else {
            rows[index].price = v.daily_rate; // tarif 1 jour par défaut
          }
        }
      }
      return { ...prev, vehicleRows: rows };
    });

    if (field === 'vehicle_id' && value) {
      setCalendarVehicleId(value);
      fetchVehicleReservations(value);
    }
  };

  const totalPrice = formData.vehicleRows.reduce((sum, r) => sum + (Number(r.price) || 0), 0);

  // ── Calendar helpers ────────────────────────────────────────────────────
  const getDaysInMonth = () => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  const isDateBlocked = (date) =>
    vehicleReservations.some(res => {
      if (reservationToEdit && res.id === reservationToEdit.id) return false;
      return isWithinInterval(date, { start: startOfDay(parseISO(res.start_date)), end: endOfDay(parseISO(res.end_date)) });
    });

  const isDateSelected = (date) => {
    if (!formData.start_date && !formData.end_date) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    if (dateStr === formData.start_date || dateStr === formData.end_date) return true;
    if (formData.start_date && formData.end_date)
      return isWithinInterval(date, { start: parseISO(formData.start_date), end: parseISO(formData.end_date) });
    return false;
  };

  const handleDateClick = (date) => {
    if (!calendarVehicleId) {
      toast({ title: "Sélectionnez un véhicule", description: "Ajoutez d'abord un véhicule pour voir les disponibilités.", variant: "destructive" });
      return;
    }
    if (isDateBlocked(date)) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    if ((formData.start_date && formData.end_date) || (formData.start_date && date < parseISO(formData.start_date))) {
      setFormData(prev => ({ ...prev, start_date: dateStr, end_date: '' }));
    } else if (!formData.start_date) {
      setFormData(prev => ({ ...prev, start_date: dateStr }));
    } else {
      const potentialRange = eachDayOfInterval({ start: parseISO(formData.start_date), end: date });
      if (potentialRange.some(d => isDateBlocked(d))) {
        toast({ title: "Conflit de dates", description: "La période contient des dates indisponibles.", variant: "destructive" });
      } else {
        setFormData(prev => ({ ...prev, end_date: dateStr }));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.client_id)  throw new Error("Veuillez sélectionner un client.");
      if (!formData.start_date) throw new Error("Veuillez sélectionner une date de début sur le calendrier.");
      if (!formData.end_date)   throw new Error("Veuillez sélectionner une date de fin sur le calendrier.");
      if (!formData.start_time) throw new Error("Veuillez indiquer l'heure de départ.");

      const filledRows = formData.vehicleRows.filter(r => r.vehicle_id);
      if (filledRows.length === 0) throw new Error("Veuillez sélectionner au moins un véhicule.");

      const fullStartDate = new Date(`${formData.start_date}T${formData.start_time}`);
      const fullEndDate   = new Date(`${formData.end_date}T${formData.end_time}`);

      const commonPayload = {
        client_id:            formData.client_id,
        start_date:           fullStartDate.toISOString(),
        end_date:             fullEndDate.toISOString(),
        status:               formData.status,
        payment_mode:         formData.payment_mode,
        driver_name:          formData.driver_name || null,
        departure_location:   formData.departure_location || null,
        return_location:      formData.return_location || null,
        notes:                formData.notes,
        cancellation_penalty: formData.status === 'Annulée' ? (Number(formData.cancellation_penalty) || 0) : 0,
        group_id:             filledRows.length > 1 ? crypto.randomUUID() : null,
      };

      let resultData;

      if (reservationToEdit) {
        // Edit: always single vehicle
        const row = filledRows[0];
        const { data, error } = await supabase
          .from('reservations')
          .update({ ...commonPayload, vehicle_id: row.vehicle_id, total_price: row.price })
          .eq('id', reservationToEdit.id)
          .select('*, contacts(name), vehicles(name)')
          .single();
        if (error) throw error;
        resultData = data;

        await historyService.logEvent({
          type: 'reservation_updated',
          title: 'Réservation modifiée',
          description: `Modification pour ${data.contacts?.name} (${data.vehicles?.name})`,
          rentalId: data.id, clientId: data.client_id, vehicleId: data.vehicle_id,
        });
        toast({ title: "Réservation mise à jour", className: "bg-green-50 border-green-200 text-green-900" });

      } else {
        // Create: one reservation per vehicle row
        const created = [];
        for (const row of filledRows) {
          const { data, error } = await supabase
            .from('reservations')
            .insert([{ ...commonPayload, vehicle_id: row.vehicle_id, total_price: row.price }])
            .select('*, contacts(name), vehicles(name)')
            .single();
          if (error) throw error;
          created.push(data);
        }
        resultData = created[0];

        const clientName = resultData.contacts?.name || 'client';
        const label = created.length > 1 ? `${created.length} véhicules` : resultData.vehicles?.name;
        await historyService.logEvent({
          type: 'reservation_created',
          title: 'Nouvelle réservation',
          description: `Réservation créée pour ${clientName} — ${label}`,
          rentalId: resultData.id, clientId: resultData.client_id, vehicleId: resultData.vehicle_id,
        });
        const msg = created.length > 1 ? `${created.length} réservations créées` : 'Réservation créée';
        toast({ title: msg, className: "bg-green-50 border-green-200 text-green-900" });
      }

      if (onReservationSaved) onReservationSaved(resultData);
      onOpenChange(false);

    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!reservationToEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            {isEditing ? 'Modifier la réservation' : 'Nouvelle réservation'}
          </DialogTitle>
          <DialogDescription>
            Gérez les détails de la location ci-dessous.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT COLUMN */}
          <div className="space-y-6">

            {/* Client */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <User className="h-4 w-4" /> Client
              </label>
              <select
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                required
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Sélectionner un client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Driver */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <User className="h-4 w-4" /> Chauffeur
              </label>
              <input
                type="text"
                name="driver_name"
                value={formData.driver_name}
                onChange={handleChange}
                placeholder="Nom du chauffeur (si différent du client)"
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Vehicles — multi-row */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Car className="h-4 w-4" /> Véhicules
                  {formData.vehicleRows.length > 1 && (
                    <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {formData.vehicleRows.length}
                    </span>
                  )}
                </label>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={addVehicleRow}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter un véhicule
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {formData.vehicleRows.map((row, index) => (
                  <div
                    key={row.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                      calendarVehicleId === row.vehicle_id && row.vehicle_id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex-1">
                      <select
                        value={row.vehicle_id}
                        onChange={e => updateVehicleRow(index, 'vehicle_id', e.target.value)}
                        onClick={() => row.vehicle_id && setCalendarVehicleId(row.vehicle_id)}
                        className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                      >
                        <option value="">Sélectionner un véhicule…</option>
                        {vehicles.map(v => {
                          const alreadySelected = formData.vehicleRows.some((r, i) => i !== index && r.vehicle_id === v.id);
                          return (
                            <option key={v.id} value={v.id} disabled={alreadySelected}>
                              {v.name} — {v.license_plate} ({v.daily_rate?.toLocaleString()} FCFA/j)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={row.price}
                        onChange={e => updateVehicleRow(index, 'price', e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-900 text-right"
                        placeholder="Prix"
                      />
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">FCFA</span>
                    {formData.vehicleRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVehicleRow(index)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center px-2 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-sm text-slate-500 flex items-center gap-1.5">
                  <Calculator className="h-4 w-4" /> Total
                  {formData.vehicleRows.length > 1 && (
                    <span className="text-xs text-slate-400">({formData.vehicleRows.length} véhicules)</span>
                  )}
                </span>
                <span className="font-bold text-slate-900 text-lg">{totalPrice.toLocaleString()} FCFA</span>
              </div>
              <p className="text-xs text-slate-400 italic px-1">Prix calculés automatiquement selon le tarif journalier — modifiables selon la négociation.</p>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Heure de départ
                </label>
                <input type="time" name="start_time" value={formData.start_time} onChange={handleChange} required
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Heure de retour
                </label>
                <input type="time" name="end_time" value={formData.end_time} onChange={handleChange}
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            </div>

            {/* Locations */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" /> Lieu de départ
                </label>
                <input type="text" name="departure_location" value={formData.departure_location} onChange={handleChange}
                  placeholder="ex: Bras-à-vite, Aéroport…"
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-500" /> Lieu de retour
                </label>
                <input type="text" name="return_location" value={formData.return_location} onChange={handleChange}
                  placeholder="ex: Agence, Saint-Denis…"
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white text-sm" />
              </div>
            </div>

            {/* Payment Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Mode de paiement
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, payment_mode: 'immediate' }))}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${formData.payment_mode === 'immediate' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                  <Banknote className="h-4 w-4 flex-shrink-0" /> Payé à l'avance
                </button>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, payment_mode: 'end' }))}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${formData.payment_mode === 'end' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                  <Clock className="h-4 w-4 flex-shrink-0" /> Fin de location
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Statut</label>
              <select name="status" value={formData.status} onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="En attente">En attente</option>
                <option value="Confirmée">Confirmée</option>
                <option value="En cours">En cours</option>
                <option value="Terminée">Terminée</option>
                <option value="Annulée">Annulée</option>
              </select>
            </div>

            {/* Cancellation Penalty */}
            {formData.status === 'Annulée' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
                <label className="text-sm font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Pénalité retenue (FCFA)
                </label>
                <input type="number" name="cancellation_penalty" value={formData.cancellation_penalty}
                  onChange={handleChange} min={0}
                  className="w-full p-2.5 border border-red-300 rounded-md focus:ring-2 focus:ring-red-400 font-bold text-red-900 bg-white"
                  placeholder="0" />
                <p className="text-xs text-red-500">Montant conservé par l'entreprise. Le reste sera remboursé au client.</p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3}
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Instructions spéciales..." />
            </div>
          </div>

          {/* RIGHT COLUMN: Calendar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-slate-900">Disponibilité</h3>
                {calendarVehicleId && (
                  <p className="text-xs text-blue-600 font-medium mt-0.5">
                    {vehicles.find(v => v.id === calendarVehicleId)?.name || ''}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addDays(m, -30))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[100px] text-center pt-1">
                  {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                </span>
                <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addDays(m, 30))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
              {!calendarVehicleId ? (
                <div className="text-center py-8 text-slate-500 text-sm flex flex-col items-center">
                  <AlertCircle className="h-8 w-8 mb-2 text-slate-300" />
                  Sélectionnez un véhicule pour voir ses disponibilités.
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                    <div key={day} className="text-xs font-medium text-slate-400 py-2">{day}</div>
                  ))}
                  {getDaysInMonth().map((date, i) => {
                    const isBlocked  = isDateBlocked(date);
                    const isSelected = isDateSelected(date);
                    const isPast     = date < startOfDay(new Date());
                    const isToday    = isSameDay(date, new Date());

                    let btnClass = "h-9 w-full rounded-md flex items-center justify-center text-sm transition-all relative ";
                    if (isBlocked)       btnClass += "bg-red-100 text-red-400 cursor-not-allowed opacity-70";
                    else if (isSelected) btnClass += "bg-blue-600 text-white font-bold shadow-md scale-105";
                    else if (isToday)    btnClass += "ring-2 ring-blue-400 text-blue-700 font-bold cursor-pointer bg-blue-50";
                    else if (isPast)     btnClass += "text-slate-400 cursor-pointer bg-slate-50 hover:bg-amber-50 hover:text-amber-700";
                    else                 btnClass += "bg-green-50 text-green-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer";

                    return (
                      <div key={i} className="p-0.5">
                        <button type="button" disabled={isBlocked} onClick={() => handleDateClick(date)}
                          className={btnClass} title={isPast ? 'Date passée — saisie rétroactive possible' : undefined}>
                          {format(date, 'd')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 px-2">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-100 border border-green-200"></div> Disponible</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-100 border border-red-200"></div> Réservé</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-600"></div> Sélection</div>
            </div>

            {/* Date range summary */}
            <div className={`rounded-lg px-4 py-3 text-sm border ${formData.start_date && formData.end_date ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              {!calendarVehicleId ? (
                <p className="text-center">Sélectionnez d'abord un véhicule.</p>
              ) : !formData.start_date ? (
                <p className="text-center font-medium">👆 Cliquez sur une date de départ</p>
              ) : !formData.end_date ? (
                <p className="text-center font-medium">👆 Cliquez sur une date de retour</p>
              ) : (
                <div className="flex justify-between">
                  <span>🚀 Départ : <strong>{format(new Date(formData.start_date), 'dd MMM yyyy', { locale: fr })}</strong></span>
                  <span>🏁 Retour : <strong>{format(new Date(formData.end_date), 'dd MMM yyyy', { locale: fr })}</strong></span>
                </div>
              )}
            </div>

            {/* Multi-vehicle info */}
            {formData.vehicleRows.filter(r => r.vehicle_id).length > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
                <strong>{formData.vehicleRows.filter(r => r.vehicle_id).length} véhicules</strong> — chaque véhicule créera une réservation distincte pour le même client et les mêmes dates.
                Cliquez sur une ligne véhicule pour voir ses disponibilités dans le calendrier.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="col-span-1 lg:col-span-2 flex justify-between items-center pt-6 border-t">
            <div className="text-sm text-slate-500">
              {formData.vehicleRows.filter(r => r.vehicle_id).length > 1 && (
                <span className="font-semibold text-slate-700">{formData.vehicleRows.filter(r => r.vehicle_id).length} réservations × Total : {totalPrice.toLocaleString()} FCFA</span>
              )}
            </div>
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Annuler
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement...</>
                ) : (
                  <><CheckCircle className="mr-2 h-4 w-4" />
                    {isEditing ? 'Mettre à jour' : formData.vehicleRows.filter(r => r.vehicle_id).length > 1
                      ? `Créer ${formData.vehicleRows.filter(r => r.vehicle_id).length} réservations`
                      : 'Enregistrer'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddReservationModal;
