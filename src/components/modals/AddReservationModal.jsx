import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Calendar, Car, User, Clock, AlertCircle, Calculator, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, parseISO, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const AddReservationModal = ({ open, onOpenChange, onReservationSaved, reservationToEdit = null }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleReservations, setVehicleReservations] = useState([]);
  
  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const initialFormState = {
    client_id: '',
    vehicle_id: '',
    start_date: '',
    start_time: '09:00', // Default time
    end_date: '',
    total_price: 0,
    status: 'En attente',
    driver_name: '',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (open) {
      fetchDependencies();
      if (reservationToEdit) {
        setFormData({
          client_id: reservationToEdit.client_id,
          vehicle_id: reservationToEdit.vehicle_id,
          start_date: reservationToEdit.start_date ? format(new Date(reservationToEdit.start_date), 'yyyy-MM-dd') : '',
          start_time: reservationToEdit.start_date ? format(new Date(reservationToEdit.start_date), 'HH:mm') : '09:00',
          end_date: reservationToEdit.end_date ? format(new Date(reservationToEdit.end_date), 'yyyy-MM-dd') : '',
          total_price: reservationToEdit.total_price,
          status: reservationToEdit.status,
          driver_name: reservationToEdit.driver_name || '',
          notes: reservationToEdit.notes || ''
        });
        // Trigger fetch of existing reservations for this vehicle to populate calendar correctly
        fetchVehicleReservations(reservationToEdit.vehicle_id);
      } else {
        setFormData(initialFormState);
        setVehicleReservations([]);
      }
    }
  }, [open, reservationToEdit]);

  // Calculate price whenever dates or vehicle changes
  useEffect(() => {
    calculatePrice();
  }, [formData.start_date, formData.end_date, formData.vehicle_id]);

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
      .neq('status', 'Annulée'); // Don't block dates for cancelled reservations
    
    setVehicleReservations(data || []);
  };

  const handleVehicleChange = (e) => {
    const vehicleId = e.target.value;
    setFormData(prev => ({ ...prev, vehicle_id: vehicleId }));
    fetchVehicleReservations(vehicleId);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculatePrice = () => {
    if (!formData.start_date || !formData.end_date || !formData.vehicle_id) {
      return; 
    }

    const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
    if (!vehicle) return;

    // Use just dates for price calculation to keep "Daily Rate" logic simple and expected
    const start = parseISO(formData.start_date);
    const end = parseISO(formData.end_date);

    if (end > start) {
      const days = differenceInDays(end, start);
      const price = days * vehicle.daily_rate;
      setFormData(prev => ({ ...prev, total_price: price }));
    } else if (isSameDay(start, end)) {
       // Single day rental logic if needed, currently min 1 day usually implies difference is 0 if same day
       // Adjust if you charge per day including partial:
       setFormData(prev => ({ ...prev, total_price: vehicle.daily_rate }));
    }
  };

  // Calendar Helpers
  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const isDateBlocked = (date) => {
    return vehicleReservations.some(res => {
      // If we are editing, don't count the current reservation as blocking itself
      if (reservationToEdit && res.id === reservationToEdit.id) return false;

      const start = startOfDay(parseISO(res.start_date));
      const end = endOfDay(parseISO(res.end_date));
      return isWithinInterval(date, { start, end });
    });
  };

  const isDateSelected = (date) => {
    if (!formData.start_date && !formData.end_date) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    if (dateStr === formData.start_date || dateStr === formData.end_date) return true;
    
    if (formData.start_date && formData.end_date) {
      const start = parseISO(formData.start_date);
      const end = parseISO(formData.end_date);
      return isWithinInterval(date, { start, end });
    }
    return false;
  };

  const handleDateClick = (date) => {
    if (!formData.vehicle_id) {
      toast({ title: "Sélectionnez un véhicule", description: "Veuillez d'abord choisir un véhicule.", variant: "destructive" });
      return;
    }

    if (isDateBlocked(date)) return;

    const dateStr = format(date, 'yyyy-MM-dd');

    // Reset if both selected or if new date is before start
    if ((formData.start_date && formData.end_date) || (formData.start_date && date < parseISO(formData.start_date))) {
      setFormData(prev => ({ ...prev, start_date: dateStr, end_date: '' }));
    } else if (!formData.start_date) {
      setFormData(prev => ({ ...prev, start_date: dateStr }));
    } else {
      // Check if any blocked dates are in the range
      const start = parseISO(formData.start_date);
      const potentialRange = eachDayOfInterval({ start, end: date });
      const hasConflict = potentialRange.some(d => isDateBlocked(d));

      if (hasConflict) {
        toast({ title: "Conflit de dates", description: "La période sélectionnée contient des dates indisponibles.", variant: "destructive" });
      } else {
        setFormData(prev => ({ ...prev, end_date: dateStr }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.client_id)   throw new Error("Veuillez sélectionner un client.");
      if (!formData.vehicle_id)  throw new Error("Veuillez sélectionner un véhicule.");
      if (!formData.start_date)  throw new Error("Veuillez sélectionner une date de début sur le calendrier.");
      if (!formData.end_date)    throw new Error("Veuillez sélectionner une date de fin sur le calendrier (cliquez sur une 2ᵉ date).");
      if (!formData.start_time)  throw new Error("Veuillez indiquer l'heure de départ.");

      // Combine date and time for the start_date timestamp
      const fullStartDate = new Date(`${formData.start_date}T${formData.start_time}`);
      
      // For end date, we default to the date itself (which is 00:00 usually) or we could mirror start time.
      // For now, keeping it simple as just the date as per typical daily rental logic.
      const fullEndDate = new Date(formData.end_date);

      const reservationPayload = {
        client_id: formData.client_id,
        vehicle_id: formData.vehicle_id,
        start_date: fullStartDate.toISOString(),
        end_date: fullEndDate.toISOString(),
        status: formData.status,
        total_price: formData.total_price,
        driver_name: formData.driver_name || null,
        notes: formData.notes
      };

      let resultData;

      if (reservationToEdit) {
        // Update
        const { data, error } = await supabase
          .from('reservations')
          .update(reservationPayload)
          .eq('id', reservationToEdit.id)
          .select('*, contacts(name), vehicles(name)')
          .single();

        if (error) throw error;
        resultData = data;

        await historyService.logEvent({
          type: 'reservation_updated',
          title: `Réservation modifiée`,
          description: `Modification de la réservation pour ${data.contacts?.name} (${data.vehicles?.name})`,
          rentalId: data.id,
          clientId: data.client_id,
          vehicleId: data.vehicle_id
        });

        toast({ title: "Réservation mise à jour", className: "bg-green-50 border-green-200 text-green-900" });
      } else {
        // Create
        const { data, error } = await supabase
          .from('reservations')
          .insert([reservationPayload])
          .select('*, contacts(name), vehicles(name)')
          .single();

        if (error) throw error;
        resultData = data;

        await historyService.logEvent({
          type: 'reservation_created',
          title: `Nouvelle réservation`,
          description: `Réservation créée pour ${data.contacts?.name} - ${data.vehicles?.name}`,
          rentalId: data.id,
          clientId: data.client_id,
          vehicleId: data.vehicle_id
        });

        toast({ title: "Réservation créée", className: "bg-green-50 border-green-200 text-green-900" });
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
          {/* LEFT COLUMN: Form Fields */}
          <div className="space-y-6">
            
            {/* Client Selection */}
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
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Driver Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <User className="h-4 w-4" /> Nom du chauffeur
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

            {/* Vehicle Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Car className="h-4 w-4" /> Véhicule
              </label>
              <select
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleVehicleChange}
                required
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Sélectionner un véhicule...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name} - {v.license_plate} ({v.daily_rate} FCFA/j)</option>
                ))}
              </select>
            </div>

            {/* Time Input */}
             <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Heure de départ
              </label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Status & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Statut</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="En attente">En attente</option>
                  <option value="Confirmée">Confirmée</option>
                  <option value="En cours">En cours</option>
                  <option value="Terminée">Terminée</option>
                  <option value="Annulée">Annulée</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                   <Calculator className="h-4 w-4" /> Prix négocié (FCFA)
                </label>
                <input
                  type="number"
                  name="total_price"
                  value={formData.total_price}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                />
                <p className="text-xs text-slate-400 italic">Modifiable — calculé automatiquement, ajustable selon la négociation</p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Instructions spéciales..."
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Custom Calendar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900">Disponibilité</h3>
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
              {!formData.vehicle_id && (
                <div className="text-center py-8 text-slate-500 text-sm flex flex-col items-center">
                  <AlertCircle className="h-8 w-8 mb-2 text-slate-300" />
                  Veuillez sélectionner un véhicule pour voir ses disponibilités.
                </div>
              )}

              {formData.vehicle_id && (
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                    <div key={day} className="text-xs font-medium text-slate-400 py-2">{day}</div>
                  ))}
                  
                  {getDaysInMonth().map((date, i) => {
                    const isBlocked = isDateBlocked(date);
                    const isSelected = isDateSelected(date);
                    const isPast = date < startOfDay(new Date());
                    
                    let btnClass = "h-9 w-full rounded-md flex items-center justify-center text-sm transition-all ";
                    
                    if (isBlocked) {
                      btnClass += "bg-red-100 text-red-400 cursor-not-allowed opacity-70"; // Booked = Red
                    } else if (isSelected) {
                      btnClass += "bg-blue-600 text-white font-bold shadow-md scale-105";
                    } else if (isPast) {
                       btnClass += "text-slate-300 cursor-not-allowed";
                    } else {
                      btnClass += "hover:bg-blue-50 text-slate-700 hover:text-blue-600 cursor-pointer bg-green-50 text-green-700"; // Available = Greenish
                    }

                    return (
                      <div key={i} className="p-0.5">
                        <button
                          type="button"
                          disabled={isBlocked || isPast}
                          onClick={() => handleDateClick(date)}
                          className={btnClass}
                        >
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
              {!formData.vehicle_id ? (
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
          </div>

          {/* Actions */}
          <div className="col-span-1 lg:col-span-2 flex justify-end gap-4 pt-6 border-t">
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

export default AddReservationModal;