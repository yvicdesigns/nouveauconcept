import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertCircle, Gauge, Fuel, CheckCircle2, User, Clock, Loader2, CalendarDays, MapPin, CreditCard, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import ClientCombobox from '@/components/ui/ClientCombobox';
import SearchCombobox from '@/components/ui/SearchCombobox';

const VehicleCheckModal = ({ isOpen, onClose, type, vehicle, onConfirm }) => {
  const { toast } = useToast();
  const [fuelLevel, setFuelLevel] = useState(100);
  const [currentMileage, setCurrentMileage] = useState(0);
  const [observations, setObservations] = useState('');
  const [damages, setDamages] = useState([]);
  const [pendingZone, setPendingZone] = useState(null);
  const [pendingType, setPendingType] = useState('scratch');
  const [pendingNote, setPendingNote] = useState('');
  
  // New State for Checkout
  const [clients, setClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [driverName, setDriverName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [paymentMode, setPaymentMode] = useState('immediate');
  
  const ZONES = {
    bumper_front: 'Pare-chocs AV', hood: 'Capot', windshield: 'Pare-brise',
    door_fl: 'Portière AV G', cabin: 'Toit / Habitacle', door_fr: 'Portière AV D',
    door_rl: 'Portière AR G', door_rr: 'Portière AR D',
    rear_window: 'Lunette AR', trunk: 'Coffre', bumper_rear: 'Pare-chocs AR',
    wheel_fl: 'Roue AV G', wheel_fr: 'Roue AV D', wheel_rl: 'Roue AR G', wheel_rr: 'Roue AR D',
  };

  const damageTypes = {
    scratch: { 
      id: 'scratch', 
      label: 'Rayure', 
      color: 'bg-yellow-400', 
      border: 'border-yellow-600', 
      text: 'text-yellow-900',
      ring: 'ring-yellow-400'
    },
    dent: { 
      id: 'dent', 
      label: 'Bosse', 
      color: 'bg-red-500', 
      border: 'border-red-700', 
      text: 'text-white',
      ring: 'ring-red-500'
    },
    crack: { 
      id: 'crack', 
      label: 'Fissure', 
      color: 'bg-purple-500', 
      border: 'border-purple-700', 
      text: 'text-white',
      ring: 'ring-purple-500'
    },
    other: {
      id: 'other',
      label: 'Autre',
      color: 'bg-gray-600',
      border: 'border-gray-800',
      text: 'text-white',
      ring: 'ring-gray-600'
    }
  };

  useEffect(() => {
    if (isOpen && vehicle) {
      setFuelLevel(type === 'checkout' ? 100 : vehicle.fuelLevel || 50);
      const mileageNum = parseInt(String(vehicle.mileage).replace(/[^0-9]/g, '')) || 0;
      setCurrentMileage(mileageNum);
      setObservations('');
      setDamages([]);
      setPendingZone(null);
      setPendingType('scratch');
      setPendingNote('');
      
      // Reset checkout specific fields
      setSelectedClientId('');
      const now = new Date();
      setDepartureTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      // Default return date = tomorrow
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setExpectedReturnDate(tomorrow.toISOString().split('T')[0]);
      setDriverName('');
      setCustomPrice('');
      setSelectedRouteId('');
      setPaymentMode('immediate');

      if (type === 'checkout') {
        fetchClients();
        fetchDrivers();
      }
    }
  }, [isOpen, vehicle, type]);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      // Fetch clients that are either 'Active' or 'active' to be safe
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, company')
        .in('status', ['Active', 'active']) 
        .order('name');
      
      if (data) setClients(data);
      if (error) console.error("Error fetching clients:", error);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const [{ data: driversData }, { data: routesData }] = await Promise.all([
        supabase.from('drivers').select('id, name').order('name'),
        supabase.from('routes').select('id, from_location, to_location, price, daily_rate').order('from_location'),
      ]);
      if (driversData) setDrivers(driversData);
      if (routesData) setRoutes(routesData);
    } catch (e) {
      console.error('Error fetching drivers/routes:', e);
    }
  };

  const calcRoutePrice = (routeId, returnDate) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return null;
    const today = new Date();
    const ret = returnDate ? new Date(returnDate) : null;
    const daysBetween = ret ? Math.max(0, Math.round((ret - today) / 86400000)) : 1;
    const daysAtDest = Math.max(0, daysBetween - 1);
    return { route, daysAtDest, total: 2 * route.price + daysAtDest * route.daily_rate };
  };

  useEffect(() => {
    if (selectedRouteId && expectedReturnDate) {
      const calc = calcRoutePrice(selectedRouteId, expectedReturnDate);
      if (calc) setCustomPrice(String(calc.total));
    }
  }, [expectedReturnDate, selectedRouteId]);

  const handleZoneClick = (zoneId) => {
    if (pendingZone === zoneId) { setPendingZone(null); return; }
    setPendingZone(zoneId);
    setPendingType('scratch');
    setPendingNote('');
  };

  const confirmZoneDamage = () => {
    if (!pendingZone) return;
    setDamages(prev => [...prev, {
      id: Date.now(),
      zone: pendingZone,
      zoneLabel: ZONES[pendingZone] || pendingZone,
      type: pendingType,
      description: pendingNote,
    }]);
    setPendingZone(null);
    setPendingNote('');
  };

  const removeDamage = (id) => setDamages(prev => prev.filter(d => d.id !== id));

  const zoneDamageColor = (zoneId) => {
    const zoneDmg = damages.filter(d => d.zone === zoneId);
    if (!zoneDmg.length) return null;
    if (zoneDmg.some(d => d.type === 'dent' || d.type === 'crack')) return '#ef4444';
    if (zoneDmg.some(d => d.type === 'scratch')) return '#f59e0b';
    return '#6b7280';
  };

  const handleConfirm = () => {
    // Basic validation for checkout
    if (type === 'checkout' && !selectedClientId) {
      toast({ title: "Client requis", description: "Veuillez sélectionner un client avant de valider le départ.", variant: "destructive" });
      return;
    }

    onConfirm({
      vehicleId: vehicle.id,
      type,
      fuelLevel,
      finalMileage: currentMileage,
      observations,
      damages,
      clientId: selectedClientId,
      clientName: clients.find(c => c.id === selectedClientId)?.name || 'Client inconnu',
      departureTime,
      expectedReturnDate,
      driverName: driverName || null,
      customPrice: customPrice ? Number(customPrice) : null,
      destination: selectedRouteId ? (() => { const r = routes.find(x => x.id === selectedRouteId); return r ? `${r.from_location} → ${r.to_location}` : null; })() : null,
      paymentMode,
    });
    onClose();
  };

  if (!isOpen || !vehicle) return null;

  const isCheckOut = type === 'checkout';
  const title = isCheckOut ? 'Départ Véhicule (Check-out)' : 'Retour Véhicule (Check-in)';
  const confirmLabel = isCheckOut ? 'Valider le Départ' : 'Valider le Retour';
  const confirmColor = isCheckOut ? 'bg-nc-navy hover:bg-nc-navy-light' : 'bg-green-600 hover:bg-green-700';
  
  const baseMileage = parseInt(String(vehicle.mileage).replace(/[^0-9]/g, '')) || 0;
  const mileageDiff = currentMileage - baseMileage;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-7xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white">
            <div>
              <h2 className={`text-2xl font-bold ${isCheckOut ? 'text-blue-900' : 'text-green-900'}`}>{title}</h2>
              <p className="text-sm text-gray-500 font-medium mt-1">{vehicle.name} - <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">{vehicle.plate}</span></p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-gray-50/30">
            <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
              
              {/* Left Column: Controls (Fixed width) */}
              <div className="lg:col-span-4 p-8 border-r border-gray-100 bg-white space-y-8 h-full overflow-y-auto">
                
                {/* Check-out Specific Fields */}
                {isCheckOut && (
                  <div className="space-y-6 pb-6 border-b border-gray-100">
                     <div className="space-y-4">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                        <User className="h-4 w-4 text-blue-500" />
                        Client
                      </label>
                      
                      {isLoadingClients ? (
                        <div className="w-full px-4 py-3 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          Chargement des clients...
                        </div>
                      ) : clients.length === 0 ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-600" />
                          <div>
                            <p className="font-bold text-sm text-amber-900">Aucun client disponible</p>
                            <p className="text-xs mt-1 text-amber-700">
                              La table de contacts est vide ou ne contient aucun client actif.
                              Veuillez ajouter des clients dans le module <strong>Contacts</strong>.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <ClientCombobox
                          clients={clients}
                          value={selectedClientId}
                          onChange={setSelectedClientId}
                          placeholder="Rechercher un client..."
                        />
                      )}
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Heure de départ
                      </label>
                      <input
                        type="time"
                        value={departureTime}
                        onChange={(e) => setDepartureTime(e.target.value)}
                        className="w-full px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nc-navy focus:border-nc-navy outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                        <CalendarDays className="h-4 w-4 text-blue-500" />
                        Date de retour prévue
                      </label>
                      <input
                        type="date"
                        value={expectedReturnDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setExpectedReturnDate(e.target.value)}
                        className="w-full px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nc-navy focus:border-nc-navy outline-none transition-all"
                      />
                    </div>

                    {/* Chauffeur */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                        <User className="h-4 w-4 text-blue-500" />
                        Chauffeur
                      </label>
                      <SearchCombobox
                        items={drivers.map(d => ({ id: d.name, label: d.name }))}
                        value={driverName}
                        onChange={setDriverName}
                        placeholder="— Sélectionner ou saisir un chauffeur —"
                        allowFreeText
                      />
                    </div>

                    {/* Trajet / Destination */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        Trajet
                      </label>
                      <SearchCombobox
                        items={routes.map(r => ({
                          id: r.id,
                          label: `${r.from_location} → ${r.to_location}`,
                          sublabel: `${Number(r.price).toLocaleString()} FCFA / trajet`,
                        }))}
                        value={selectedRouteId}
                        onChange={(rid) => {
                          setSelectedRouteId(rid);
                          if (rid) {
                            const calc = calcRoutePrice(rid, expectedReturnDate);
                            if (calc) setCustomPrice(String(calc.total));
                          } else {
                            setCustomPrice('');
                          }
                        }}
                        placeholder="— Trajet local (tarif libre) —"
                      />
                      {selectedRouteId && (() => {
                        const calc = calcRoutePrice(selectedRouteId, expectedReturnDate);
                        if (!calc) return null;
                        return (
                          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800 space-y-1">
                            <div className="flex justify-between"><span>Aller</span><span className="font-bold">{Number(calc.route.price).toLocaleString()} FCFA</span></div>
                            {calc.daysAtDest > 0 && <div className="flex justify-between"><span>{calc.daysAtDest} jour{calc.daysAtDest > 1 ? 's' : ''} sur place</span><span className="font-bold">{(calc.daysAtDest * calc.route.daily_rate).toLocaleString()} FCFA</span></div>}
                            <div className="flex justify-between"><span>Retour</span><span className="font-bold">{Number(calc.route.price).toLocaleString()} FCFA</span></div>
                            <div className="flex justify-between border-t border-blue-200 pt-1 mt-1"><span className="font-bold">Total estimé</span><span className="font-bold text-nc-navy">{calc.total.toLocaleString()} FCFA</span></div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Tarif */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                        Tarif final (FCFA)
                      </label>
                      <input
                        type="number"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="Laisser vide = tarif journalier du véhicule"
                        className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nc-navy focus:border-nc-navy outline-none transition-all"
                      />
                      <p className="text-xs text-gray-400">Pré-rempli selon le trajet — modifiable selon la négociation.</p>
                    </div>

                    {/* Mode de paiement */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                        <CreditCard className="h-4 w-4 text-blue-500" />
                        Mode de paiement
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMode('immediate')}
                          className={`p-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${paymentMode === 'immediate' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'}`}
                        >
                          <span className="block text-base mb-0.5">💵</span>
                          Paiement immédiat
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMode('end')}
                          className={`p-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${paymentMode === 'end' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'}`}
                        >
                          <span className="block text-base mb-0.5">🧾</span>
                          Paiement à la fin
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mileage */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                    <Gauge className="h-4 w-4 text-gray-400" />
                    Kilométrage Actuel
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="relative">
                      <input 
                        type="number" 
                        value={currentMileage}
                        onChange={(e) => setCurrentMileage(parseInt(e.target.value) || 0)}
                        className="w-full pl-4 pr-12 py-3 text-2xl font-bold text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-nc-navy focus:border-nc-navy transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">km</span>
                    </div>
                    <div className="mt-3 flex justify-between items-center text-xs">
                      <span className="text-gray-500">Précédent: {vehicle.mileage}</span>
                      {mileageDiff > 0 && (
                        <span className="font-bold text-blue-600">+{mileageDiff.toLocaleString()} km</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fuel Level */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide">
                      <Fuel className="h-4 w-4 text-gray-400" />
                      Niveau Carburant
                    </div>
                    <span className="text-lg font-bold text-blue-600">{fuelLevel}%</span>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <Slider 
                      value={[fuelLevel]} 
                      max={100} 
                      step={1} 
                      onValueChange={(vals) => setFuelLevel(vals[0])}
                      className="mb-8"
                    />
                    <div className="flex justify-between text-xs font-bold text-gray-400 px-1 uppercase">
                      <span>E</span>
                      <span>1/4</span>
                      <span>1/2</span>
                      <span>3/4</span>
                      <span>F</span>
                    </div>
                  </div>
                </div>

                {/* Observations */}
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Observations / Notes</label>
                  <textarea 
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="État de propreté, odeurs, accessoires manquants..."
                    className="w-full h-32 p-4 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-nc-navy focus:border-nc-navy resize-none bg-gray-50 shadow-sm transition-all"
                  />
                </div>
              </div>

              {/* Right Column: Car Diagram + Damages */}
              <div className="lg:col-span-8 p-6 flex flex-col bg-gray-50/50 gap-5">

                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Signalement des dégâts — cliquez sur une zone
                </h3>

                <div className="flex gap-6 flex-col lg:flex-row">

                  {/* SVG Car Diagram */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    {(() => {
                      const bodyPath = 'M140,28 C162,28 185,40 200,60 C214,78 220,100 222,122 L246,136 L222,150 C226,168 228,192 228,232 C228,280 224,315 218,348 C210,390 196,422 140,448 C84,422 70,390 62,348 C56,315 52,280 52,232 C52,192 54,168 58,150 L34,136 L58,122 C60,100 66,78 80,60 C95,40 118,28 140,28 Z';
                      const z = (id) => {
                        const dmgColor = zoneDamageColor(id);
                        const isPending = pendingZone === id;
                        return {
                          fill: isPending ? '#bfdbfe' : dmgColor ? dmgColor + '33' : (id === 'windshield' || id === 'rear_window') ? '#242e42' : id.startsWith('wheel') ? '#3a3a3a' : id === 'cabin' ? '#d8dde6' : '#efefef',
                          stroke: isPending ? '#2563eb' : dmgColor || ((id === 'windshield' || id === 'rear_window') ? '#1a2233' : '#c0c0c0'),
                          strokeWidth: isPending ? 3 : dmgColor ? 2 : 1,
                          style: { cursor: 'pointer', transition: 'all 0.12s' },
                          onClick: () => handleZoneClick(id),
                        };
                      };
                      return (
                        <svg viewBox="0 0 280 490" width="200" style={{ userSelect: 'none' }}>
                          <defs>
                            <clipPath id="carClipV"><path d={bodyPath} /></clipPath>
                            <linearGradient id="bodyGradV" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#b8b8b8" /><stop offset="18%" stopColor="#e0e0e0" />
                              <stop offset="50%" stopColor="#f5f5f5" /><stop offset="82%" stopColor="#e0e0e0" />
                              <stop offset="100%" stopColor="#b8b8b8" />
                            </linearGradient>
                            <linearGradient id="glareV" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="white" stopOpacity="0.22" /><stop offset="100%" stopColor="white" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path d={bodyPath} fill="#00000018" transform="translate(2,4)" />
                          <path d={bodyPath} fill="url(#bodyGradV)" stroke="#a0a0a0" strokeWidth="1.5" />
                          <g clipPath="url(#carClipV)">
                            <rect {...z('bumper_front')} x="40" y="22" width="200" height="32" />
                            <rect {...z('hood')} x="40" y="54" width="200" height="68" />
                            <path {...z('windshield')} d="M 68,122 C 82,116 118,112 140,112 C 162,112 198,116 212,122 L 214,162 C 200,168 174,172 140,172 C 106,172 80,168 66,162 Z" />
                            <rect {...z('door_fl')} x="40" y="172" width="68" height="84" />
                            <rect {...z('cabin')} x="108" y="172" width="64" height="148" />
                            <rect {...z('door_fr')} x="172" y="172" width="68" height="84" />
                            <rect {...z('door_rl')} x="40" y="256" width="68" height="90" />
                            <rect {...z('door_rr')} x="172" y="256" width="68" height="90" />
                            <path {...z('rear_window')} d="M 68,346 C 80,340 114,336 140,336 C 166,336 200,340 212,346 L 212,384 C 200,390 170,394 140,394 C 110,394 80,390 68,384 Z" />
                            <rect {...z('trunk')} x="40" y="384" width="200" height="56" />
                            <rect {...z('bumper_rear')} x="40" y="440" width="200" height="20" />
                          </g>
                          {/* Lignes de séparation portières */}
                          <line x1="52" y1="256" x2="108" y2="256" stroke="#888" strokeWidth="1.5" strokeDasharray="2,1" pointerEvents="none" clipPath="url(#carClipV)" />
                          <line x1="172" y1="256" x2="228" y2="256" stroke="#888" strokeWidth="1.5" strokeDasharray="2,1" pointerEvents="none" clipPath="url(#carClipV)" />
                          <line x1="108" y1="172" x2="108" y2="320" stroke="#909090" strokeWidth="2" pointerEvents="none" />
                          <line x1="172" y1="172" x2="172" y2="320" stroke="#909090" strokeWidth="2" pointerEvents="none" />
                          {/* Reflets vitres */}
                          <path clipPath="url(#carClipV)" pointerEvents="none" d="M 76,122 C 90,116 120,113 148,113 L 150,155 C 118,155 88,158 76,163 Z" fill="url(#glareV)" />
                          <path clipPath="url(#carClipV)" pointerEvents="none" d="M 130,337 C 142,336 170,338 204,344 L 202,385 C 170,390 142,390 130,386 Z" fill="url(#glareV)" />
                          <path d={bodyPath} fill="none" stroke="#909090" strokeWidth="1.5" pointerEvents="none" />
                          {/* Rétroviseurs */}
                          <path fill={pendingZone==='door_fl'?'#bfdbfe':zoneDamageColor('door_fl')||'#c8c8c8'} stroke="#909090" strokeWidth="1" d="M 58,122 L 34,136 L 36,146 L 58,150 Z" style={{cursor:'pointer'}} onClick={() => handleZoneClick('door_fl')} />
                          <path fill={pendingZone==='door_fr'?'#bfdbfe':zoneDamageColor('door_fr')||'#c8c8c8'} stroke="#909090" strokeWidth="1" d="M 222,122 L 246,136 L 244,146 L 222,150 Z" style={{cursor:'pointer'}} onClick={() => handleZoneClick('door_fr')} />
                          {/* Roues */}
                          <ellipse {...z('wheel_fl')} cx="38" cy="160" rx="14" ry="28" />
                          <ellipse {...z('wheel_fr')} cx="242" cy="160" rx="14" ry="28" />
                          <ellipse {...z('wheel_rl')} cx="38" cy="330" rx="14" ry="28" />
                          <ellipse {...z('wheel_rr')} cx="242" cy="330" rx="14" ry="28" />
                          {/* Jantes */}
                          {[{cx:38,cy:160},{cx:242,cy:160},{cx:38,cy:330},{cx:242,cy:330}].map((p,i) => (
                            <ellipse key={i} cx={p.cx} cy={p.cy} rx={7} ry={14} fill="#d0d0d0" stroke="#a0a0a0" strokeWidth="1" pointerEvents="none" />
                          ))}
                          {/* Badges dégât sur zones */}
                          {damages.reduce((acc, d) => { if (!acc.find(a => a.zone === d.zone)) acc.push(d); return acc; }, []).map(d => {
                            const pos = { bumper_front:{x:140,y:38}, hood:{x:140,y:88}, windshield:{x:140,y:142}, door_fl:{x:74,y:214}, cabin:{x:140,y:246}, door_fr:{x:206,y:214}, door_rl:{x:74,y:301}, door_rr:{x:206,y:301}, rear_window:{x:140,y:365}, trunk:{x:140,y:412}, bumper_rear:{x:140,y:450}, wheel_fl:{x:38,y:160}, wheel_fr:{x:242,y:160}, wheel_rl:{x:38,y:330}, wheel_rr:{x:242,y:330} };
                            const p = pos[d.zone];
                            if (!p) return null;
                            const count = damages.filter(x => x.zone === d.zone).length;
                            return (
                              <g key={d.zone} pointerEvents="none">
                                <circle cx={p.x} cy={p.y} r={9} fill={zoneDamageColor(d.zone)} opacity={0.9} />
                                <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="bold" fill="white">{count}</text>
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()}
                    <p className="text-xs text-gray-400 text-center mt-2">Cliquez sur une zone</p>
                  </div>

                  {/* Right panel: pending zone form + damage list */}
                  <div className="flex-1 space-y-4">

                    {/* Zone sélectionnée — formulaire */}
                    {pendingZone ? (
                      <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-bold text-blue-900">{ZONES[pendingZone]}</p>
                        {/* Type de dégât */}
                        <div className="grid grid-cols-2 gap-2">
                          {Object.values(damageTypes).map(dt => (
                            <button key={dt.id} type="button" onClick={() => setPendingType(dt.id)}
                              className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all',
                                pendingType === dt.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400')}>
                              {dt.label}
                            </button>
                          ))}
                        </div>
                        <input type="text" value={pendingNote} onChange={e => setPendingNote(e.target.value)}
                          placeholder="Note (optionnelle)…"
                          className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-white" />
                        <div className="flex gap-2">
                          <button type="button" onClick={confirmZoneDamage}
                            className="flex-1 bg-nc-navy text-white text-sm font-bold py-2 rounded-lg hover:bg-nc-navy/90 transition-colors">
                            Confirmer le dégât
                          </button>
                          <button type="button" onClick={() => setPendingZone(null)}
                            className="px-3 py-2 text-gray-400 hover:text-gray-700 bg-white rounded-lg border border-gray-200 transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="bg-white border border-dashed border-gray-200 rounded-xl p-4 text-center text-gray-400 text-sm">
                        Sélectionnez une zone sur la voiture pour signaler un dégât
                      </div>
                    )}

                    {/* Liste des dégâts enregistrés */}
                    {damages.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Dégâts signalés ({damages.length})</p>
                        {damages.map((damage, i) => {
                          const tc = damageTypes[damage.type] || damageTypes.scratch;
                          return (
                            <motion.div key={damage.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
                              className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-3 group">
                              <div className={`w-5 h-5 rounded-full ${tc.color} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>{i+1}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900">{damage.zoneLabel} — {tc.label}</p>
                                {damage.description && <p className="text-xs text-gray-400 truncate">{damage.description}</p>}
                              </div>
                              <button onClick={() => removeDamage(damage.id)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-gray-100 bg-white flex justify-end gap-4">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="border-gray-200 text-gray-700 hover:bg-gray-50 px-6 h-11"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={isCheckOut && (isLoadingClients || clients.length === 0)}
              className={`${confirmColor} text-white shadow-lg hover:shadow-xl transition-all px-8 h-11 font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {confirmLabel}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default VehicleCheckModal;