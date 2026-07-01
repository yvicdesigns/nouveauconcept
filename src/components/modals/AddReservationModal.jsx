import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Calendar, Car, User, Clock, AlertCircle, Calculator, ChevronLeft, ChevronRight, MapPin, CreditCard, Banknote, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO, startOfDay, endOfDay, differenceInDays, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const newRow = () => ({ key: Date.now() + Math.random(), vehicle_id: '', price: 0, driver_name: '', customDriver: false });

const AddReservationModal = ({ open, onOpenChange, onReservationSaved, reservationToEdit = null }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routesList, setRoutesList] = useState([]);
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
    selected_route_id: '',
    departure_location: '',
    return_location: '',
    notes: '',
    cancellation_penalty: 0,
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (open) {
      fetchDependencies().then(loadedDrivers => {
        if (reservationToEdit) {
          const existingName = reservationToEdit.driver_name || '';
          const inList = loadedDrivers.some(d => d.name === existingName);
          setFormData({
            client_id: reservationToEdit.client_id,
            vehicleRows: [{ key: 0, vehicle_id: reservationToEdit.vehicle_id, price: reservationToEdit.total_price || 0, driver_name: existingName, customDriver: existingName && !inList }],
            start_date: reservationToEdit.start_date ? format(new Date(reservationToEdit.start_date), 'yyyy-MM-dd') : '',
            start_time: reservationToEdit.start_date ? format(new Date(reservationToEdit.start_date), 'HH:mm') : '09:00',
            end_date: reservationToEdit.end_date ? format(new Date(reservationToEdit.end_date), 'yyyy-MM-dd') : '',
            end_time: reservationToEdit.end_date ? format(new Date(reservationToEdit.end_date), 'HH:mm') : '18:00',
            status: reservationToEdit.status,
            payment_mode: reservationToEdit.payment_mode || 'immediate',
            selected_route_id: '',
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
      });
    }
  }, [open, reservationToEdit]);

  const calcRoutePriceForRow = (routeId, startDate, endDate) => {
    const route = routesList.find(r => r.id === routeId);
    if (!route) return null;
    const days = startDate && endDate ? (differenceInDays(parseISO(endDate), parseISO(startDate)) || 1) : 1;
    const daysAtDest = Math.max(0, days - 1);
    return { route, daysAtDest, total: 2 * route.price + daysAtDest * (route.daily_rate || 0) };
  };

  // Recalculate all rows when dates change
  useEffect(() => {
    if (!formData.start_date || !formData.end_date || vehicles.length === 0) return;
    setFormData(prev => ({
      ...prev,
      vehicleRows: prev.vehicleRows.map(row => {
        if (!row.vehicle_id) return row;
        // Route-based pricing takes priority
        if (prev.selected_route_id) {
          const calc = calcRoutePriceForRow(prev.selected_route_id, prev.start_date, prev.end_date);
          if (calc) return { ...row, price: calc.total };
        }
        const v = vehicles.find(v => v.id === row.vehicle_id);
        if (!v || !v.daily_rate) return row;
        const days = differenceInDays(parseISO(prev.end_date), parseISO(prev.start_date)) || 1;
        return { ...row, price: days * v.daily_rate };
      }),
    }));
  }, [formData.start_date, formData.end_date, formData.selected_route_id]);

  const fetchDependencies = async () => {
    try {
      const [{ data: clientsData }, { data: vehiclesData }, { data: driversData }, { data: routesData }] = await Promise.all([
        supabase.from('contacts').select('id, name').order('name'),
        supabase.from('vehicles').select('id, name, brand, model, license_plate, daily_rate, status').order('name'),
        supabase.from('drivers').select('id, name, status').order('name'),
        supabase.from('routes').select('id, from_location, to_location, price, daily_rate').order('from_location'),
      ]);
      setClients(clientsData || []);
      setVehicles(vehiclesData || []);
      setDrivers(driversData || []);
      setRoutesList(routesData || []);
      return driversData || [];
    } catch (error) {
      console.error('Error fetching dependencies:', error);
      return [];
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
        if (prev.selected_route_id) {
          const calc = calcRoutePriceForRow(prev.selected_route_id, prev.start_date, prev.end_date);
          if (calc) rows[index].price = calc.total;
        } else {
          const v = vehicles.find(v => v.id === value);
          if (v && v.daily_rate) {
            if (prev.start_date && prev.end_date) {
              const days = differenceInDays(parseISO(prev.end_date), parseISO(prev.start_date)) || 1;
              rows[index].price = days * v.daily_rate;
            } else {
              rows[index].price = v.daily_rate;
            }
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
  // Offset for Monday-first calendar: Mon=0, Tue=1, ..., Sun=6
  const getMonthOffset = () => (getDay(startOfMonth(currentMonth)) + 6) % 7;

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

      // Vérification anti double-réservation côté serveur
      for (const row of filledRows) {
        const { data: conflicts } = await supabase
          .from('reservations')
          .select('id, contacts(name), start_date, end_date')
          .eq('vehicle_id', row.vehicle_id)
          .not('status', 'in', '("Annulée","Terminée")')
          .lt('start_date', fullEndDate.toISOString())
          .gt('end_date', fullStartDate.toISOString());

        const realConflicts = (conflicts || []).filter(c => !reservationToEdit || c.id !== reservationToEdit.id);
        if (realConflicts.length > 0) {
          const veh = vehicles.find(v => v.id === row.vehicle_id);
          const vehicleName = veh ? `${veh.name} (${veh.license_plate})` : 'Ce véhicule';
          const who = realConflicts[0]?.contacts?.name || 'un autre client';
          const conflictStart = realConflicts[0]?.start_date
            ? new Date(realConflicts[0].start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
            : '?';
          const conflictEnd = realConflicts[0]?.end_date
            ? new Date(realConflicts[0].end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
            : '?';
          const isCurrentlyRented = veh?.status === 'LOUÉ';
          if (isCurrentlyRented) {
            throw new Error(`🚫 ${vehicleName} est actuellement en location par ${who}. Elle ne sera disponible qu'à son retour.`);
          }
          throw new Error(`🚫 ${vehicleName} est déjà réservée par ${who} du ${conflictStart} au ${conflictEnd}. Choisissez d'autres dates ou un autre véhicule.`);
        }
      }

      const commonPayload = {
        client_id:            formData.client_id,
        start_date:           fullStartDate.toISOString(),
        end_date:             fullEndDate.toISOString(),
        status:               formData.status,
        payment_mode:         formData.payment_mode,
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
          .update({ ...commonPayload, vehicle_id: row.vehicle_id, total_price: row.price, driver_name: row.driver_name || null })
          .eq('id', reservationToEdit.id)
          .select('*, contacts(name), vehicles(name)')
          .single();
        if (error) throw new Error(`Erreur technique lors de la mise à jour. Contactez le développeur si le problème persiste. (Code : ${error.code || error.message})`);
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
            .insert([{ ...commonPayload, vehicle_id: row.vehicle_id, total_price: row.price, driver_name: row.driver_name || null }])
            .select('*, contacts(name), vehicles(name)')
            .single();
          if (error) throw new Error(`Erreur technique lors de la création. Contactez le développeur si le problème persiste. (Code : ${error.code || error.message})`);
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
      const isBusinessError = error.message.startsWith('🚫') || error.message.startsWith('Veuillez');
      toast({
        title: isBusinessError ? '🚫 Réservation impossible' : '⚠️ Erreur technique',
        description: error.message.replace(/^🚫 /, ''),
        variant: 'destructive',
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isEditing = !!reservationToEdit;

  return (
    <>
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
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy bg-white"
              >
                <option value="">Sélectionner un client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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
                    className={`p-3 rounded-lg border transition-colors space-y-2 ${
                      calendarVehicleId === row.vehicle_id && row.vehicle_id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    {/* Véhicule + prix */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <select
                          value={row.vehicle_id}
                          onChange={e => updateVehicleRow(index, 'vehicle_id', e.target.value)}
                          onClick={() => row.vehicle_id && setCalendarVehicleId(row.vehicle_id)}
                          className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy bg-white text-sm"
                        >
                          <option value="">Sélectionner un véhicule…</option>
                          {vehicles.map(v => {
                            const alreadySelected = formData.vehicleRows.some((r, i) => i !== index && r.vehicle_id === v.id);
                            const isLoued = v.status === 'LOUÉ';
                            return (
                              <option key={v.id} value={v.id} disabled={alreadySelected || isLoued}>
                                {isLoued ? '🔴 ' : '🟢 '}{v.name} — {v.license_plate} ({v.daily_rate?.toLocaleString()} FCFA/j){isLoued ? ' [Actuellement louée]' : ''}
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
                          className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy text-sm font-bold text-slate-900 text-right"
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
                    {/* Chauffeur pour ce véhicule */}
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {!row.customDriver ? (
                        <select
                          value={row.driver_name || ''}
                          onChange={e => {
                            if (e.target.value === '__custom__') {
                              updateVehicleRow(index, 'customDriver', true);
                              updateVehicleRow(index, 'driver_name', '');
                            } else {
                              updateVehicleRow(index, 'driver_name', e.target.value);
                            }
                          }}
                          className="flex-1 p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy bg-white text-sm"
                        >
                          <option value="">— Chauffeur pour ce véhicule —</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.name} disabled={d.status === 'inactive'}>
                              {d.name}{d.status === 'inactive' ? ' (inactif)' : d.status === 'on_leave' ? ' (congé)' : ''}
                            </option>
                          ))}
                          <option value="__custom__">✏ Saisie libre…</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={row.driver_name}
                          onChange={e => updateVehicleRow(index, 'driver_name', e.target.value)}
                          placeholder="Nom du chauffeur"
                          autoFocus
                          className="flex-1 p-1.5 border border-blue-300 rounded-md focus:ring-2 focus:ring-nc-navy bg-white text-sm"
                        />
                      )}
                    </div>
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
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Heure de retour
                </label>
                <input type="time" name="end_time" value={formData.end_time} onChange={handleChange}
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy bg-white" />
              </div>
            </div>

            {/* Trajet (route) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" /> Trajet
              </label>
              <select
                name="selected_route_id"
                value={formData.selected_route_id}
                onChange={(e) => {
                  const rid = e.target.value;
                  const route = routesList.find(r => r.id === rid);
                  setFormData(prev => ({
                    ...prev,
                    selected_route_id: rid,
                    departure_location: route ? route.from_location : prev.departure_location,
                    return_location: route ? route.to_location : prev.return_location,
                  }));
                }}
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy bg-white text-sm"
              >
                <option value="">— Trajet local / tarif journalier —</option>
                {routesList.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.from_location} → {r.to_location} ({Number(r.price).toLocaleString()} FCFA / trajet)
                  </option>
                ))}
              </select>
              {formData.selected_route_id && (() => {
                const calc = calcRoutePriceForRow(formData.selected_route_id, formData.start_date, formData.end_date);
                if (!calc) return null;
                const days = formData.start_date && formData.end_date ? (differenceInDays(parseISO(formData.end_date), parseISO(formData.start_date)) || 1) : 1;
                return (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800 space-y-1">
                    <div className="flex justify-between"><span>Aller</span><span className="font-bold">{Number(calc.route.price).toLocaleString()} FCFA</span></div>
                    {calc.daysAtDest > 0 && <div className="flex justify-between"><span>{calc.daysAtDest} jour{calc.daysAtDest > 1 ? 's' : ''} sur place</span><span className="font-bold">{(calc.daysAtDest * (calc.route.daily_rate || 0)).toLocaleString()} FCFA</span></div>}
                    <div className="flex justify-between"><span>Retour</span><span className="font-bold">{Number(calc.route.price).toLocaleString()} FCFA</span></div>
                    <div className="flex justify-between border-t border-blue-200 pt-1 font-bold"><span>Total / véhicule</span><span className="text-nc-navy">{calc.total.toLocaleString()} FCFA</span></div>
                  </div>
                );
              })()}
              <p className="text-xs text-slate-400 italic">Prix auto-calculé selon le trajet — modifiable par véhicule ci-dessus.</p>
            </div>

            {/* Locations */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" /> Lieu de départ
                </label>
                <input type="text" name="departure_location" value={formData.departure_location} onChange={handleChange}
                  placeholder="ex: Brazzaville Centre…"
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy bg-white text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-500" /> Lieu de retour
                </label>
                <input type="text" name="return_location" value={formData.return_location} onChange={handleChange}
                  placeholder="ex: Pointe-Noire, Aéroport…"
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy bg-white text-sm" />
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
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy bg-white">
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
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy resize-none"
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
                  {/* Empty cells before day 1 */}
                  {Array.from({ length: getMonthOffset() }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-0.5"><div className="h-9" /></div>
                  ))}

                  {getDaysInMonth().map((date, i) => {
                    const isBlocked  = isDateBlocked(date);
                    const isSelected = isDateSelected(date);
                    const isPast     = date < startOfDay(new Date());
                    const isToday    = isSameDay(date, new Date());

                    let btnClass = "h-9 w-full rounded-md flex items-center justify-center text-sm transition-all relative ";
                    if (isBlocked)       btnClass += "bg-red-100 text-red-400 cursor-not-allowed opacity-70";
                    else if (isSelected) btnClass += "bg-nc-navy text-white font-bold shadow-md scale-105";
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
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-nc-navy"></div> Sélection</div>
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
              <Button type="submit" className="bg-nc-navy hover:bg-nc-navy-light text-white min-w-[150px]" disabled={isLoading}>
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

    </>
  );
};

export default AddReservationModal;
