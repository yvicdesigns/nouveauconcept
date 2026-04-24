import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wrench, Calendar, Gauge, Fuel, Settings2, ExternalLink, Loader2, AlertTriangle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const vehicleStatusMeta = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'disponible' || s === 'available') return { label: 'Disponible', cls: 'bg-green-100 text-green-700' };
  if (s === 'loué' || s === 'rented')           return { label: 'Loué',       cls: 'bg-blue-100 text-blue-700' };
  if (s === 'maintenance')                       return { label: 'Maintenance',cls: 'bg-red-100 text-red-700' };
  if (s === 'réservé' || s === 'reserved')       return { label: 'Réservé',   cls: 'bg-yellow-100 text-yellow-800' };
  return { label: status || '—', cls: 'bg-slate-100 text-slate-600' };
};

const priorityMeta = (p) => {
  switch (p) {
    case 'urgent': return { label: 'Urgente', cls: 'bg-red-100 text-red-700' };
    case 'high':   return { label: 'Haute',   cls: 'bg-orange-100 text-orange-700' };
    case 'medium': return { label: 'Moyenne', cls: 'bg-yellow-100 text-yellow-700' };
    default:       return { label: 'Basse',   cls: 'bg-green-100 text-green-700' };
  }
};

const mntStatusMeta = (s) => {
  switch (s) {
    case 'reported':    return { label: 'Signalé',   Icon: AlertCircle,  cls: 'text-slate-500' };
    case 'in_progress': return { label: 'En cours',  Icon: Clock,        cls: 'text-blue-600' };
    case 'completed':   return { label: 'Terminé',   Icon: CheckCircle,  cls: 'text-green-600' };
    default:            return { label: 'Annulé',    Icon: AlertTriangle,cls: 'text-red-500' };
  }
};

const resStatusCls = (s) => {
  switch (s) {
    case 'Confirmée': return 'bg-green-100 text-green-700';
    case 'En cours':  return 'bg-blue-100 text-blue-700';
    case 'Terminée':  return 'bg-gray-100 text-gray-600';
    case 'Annulée':   return 'bg-red-100 text-red-700';
    default:          return 'bg-yellow-100 text-yellow-700';
  }
};

const VehicleDetailSheet = ({ open, onOpenChange, vehicleId }) => {
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [maintenance, setMaintenance] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && vehicleId) fetchData();
    if (!open) { setVehicle(null); setMaintenance([]); setReservations([]); }
  }, [open, vehicleId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data: veh }, { data: mnt }, { data: res }] = await Promise.all([
        supabase.from('vehicles').select('*').eq('id', vehicleId).single(),
        supabase.from('maintenance_records')
          .select('id, type, status, priority, description, reported_date, cost')
          .eq('vehicle_id', vehicleId)
          .order('reported_date', { ascending: false })
          .limit(10),
        supabase.from('reservations')
          .select('id, start_date, end_date, status, total_price, contacts(name)')
          .eq('vehicle_id', vehicleId)
          .order('start_date', { ascending: false })
          .limit(10),
      ]);
      setVehicle(veh);
      setMaintenance(mnt || []);
      setReservations(res || []);
    } catch (err) {
      console.error('VehicleDetailSheet error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const typeLabel = (t) => {
    switch (t) {
      case 'breakdown': return 'Panne';
      case 'scheduled': return 'Entretien';
      case 'inspection': return 'Inspection';
      default: return t || '—';
    }
  };

  const statusMeta = vehicle ? vehicleStatusMeta(vehicle.status) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : !vehicle ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Véhicule introuvable
          </div>
        ) : (
          <>
            {/* Image header */}
            <div className="relative h-48 bg-slate-100 overflow-hidden">
              <img
                src={vehicle.image_url || 'https://images.unsplash.com/photo-1685270386774-8d4075c3616f'}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <SheetHeader>
                  <SheetTitle className="text-white text-xl font-bold">
                    {vehicle.name || `${vehicle.brand} ${vehicle.model}`}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-white/80 text-sm font-mono">{vehicle.license_plate}</span>
                  {statusMeta && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusMeta.cls}`}>
                      {statusMeta.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-5">
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <Gauge className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">Kilométrage</p>
                  <p className="text-sm font-bold text-slate-800">
                    {Number(vehicle.mileage || 0).toLocaleString()} km
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <Fuel className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">Carburant</p>
                  <p className="text-sm font-bold text-slate-800">{vehicle.fuel_type || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <Settings2 className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">Boîte</p>
                  <p className="text-sm font-bold text-slate-800">{vehicle.transmission || '—'}</p>
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-sm text-slate-500">Tarif journalier</span>
                <span className="text-base font-bold text-blue-600">
                  {Number(vehicle.daily_rate || 0).toLocaleString()} FCFA
                </span>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="maintenance">
                <TabsList className="w-full">
                  <TabsTrigger value="maintenance" className="flex-1 gap-1.5">
                    <Wrench className="h-3.5 w-3.5" />
                    Maintenance
                    <span className="ml-1 bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {maintenance.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="reservations" className="flex-1 gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Réservations
                    <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {reservations.length}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="maintenance" className="mt-3 space-y-2">
                  {maintenance.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-6">Aucune intervention</p>
                  ) : maintenance.map(m => {
                    const pMeta = priorityMeta(m.priority);
                    const sMeta = mntStatusMeta(m.status);
                    const SIcon = sMeta.Icon;
                    return (
                      <div key={m.id}
                        onClick={() => { navigate('/maintenance'); onOpenChange(false); }}
                        className="p-3 bg-slate-50 rounded-lg hover:bg-red-50 cursor-pointer transition-colors group border border-transparent hover:border-red-100">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{typeLabel(m.type)}</p>
                            {m.description && (
                              <p className="text-xs text-slate-500 mt-0.5 truncate">{m.description}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pMeta.cls}`}>
                                {pMeta.label}
                              </span>
                              <span className={`flex items-center gap-1 text-xs font-medium ${sMeta.cls}`}>
                                <SIcon className="h-3 w-3" />{sMeta.label}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right">
                              {m.cost && (
                                <p className="text-xs font-bold text-slate-700">
                                  {Number(m.cost).toLocaleString()} FCFA
                                </p>
                              )}
                              <p className="text-xs text-slate-400">
                                {m.reported_date ? format(new Date(m.reported_date), 'dd MMM yy', { locale: fr }) : '—'}
                              </p>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-red-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="reservations" className="mt-3 space-y-2">
                  {reservations.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-6">Aucune réservation</p>
                  ) : reservations.map(r => (
                    <div key={r.id}
                      onClick={() => { navigate('/reservations'); onOpenChange(false); }}
                      className="flex items-start justify-between p-3 bg-slate-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group border border-transparent hover:border-blue-100">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {r.contacts?.name || 'Client inconnu'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {r.start_date ? format(new Date(r.start_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                          {' → '}
                          {r.end_date ? format(new Date(r.end_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                        </p>
                        {r.total_price && (
                          <p className="text-xs font-bold text-slate-700 mt-0.5">
                            {Number(r.total_price).toLocaleString()} FCFA
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${resStatusCls(r.status)}`}>
                          {r.status}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-400" />
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default VehicleDetailSheet;
