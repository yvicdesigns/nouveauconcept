import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertCircle, Gauge, Fuel, CheckCircle2, User, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';

const VehicleCheckModal = ({ isOpen, onClose, type, vehicle, onConfirm }) => {
  const [fuelLevel, setFuelLevel] = useState(100);
  const [currentMileage, setCurrentMileage] = useState(0);
  const [observations, setObservations] = useState('');
  const [damages, setDamages] = useState([]);
  const [selectedDamageType, setSelectedDamageType] = useState('scratch');
  
  // New State for Checkout
  const [clients, setClients] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  
  const diagramRef = useRef(null);

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
      setSelectedDamageType('scratch');
      
      // Reset checkout specific fields
      setSelectedClientId('');
      const now = new Date();
      setDepartureTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);

      if (type === 'checkout') {
        fetchClients();
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

  const handleDiagramClick = (e) => {
    if (!diagramRef.current) return;

    const rect = diagramRef.current.getBoundingClientRect();
    
    // Calculate percentage coordinates relative to the SVG container
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Ensure click is within bounds (0-100%)
    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    const newDamage = {
      id: Date.now(),
      x,
      y,
      type: selectedDamageType,
      description: damageTypes[selectedDamageType].label
    };

    setDamages([...damages, newDamage]);
  };

  const updateDamageDescription = (id, desc) => {
    setDamages(damages.map(d => d.id === id ? { ...d, description: desc } : d));
  };

  const removeDamage = (id) => {
    setDamages(damages.filter(d => d.id !== id));
  };

  const handleConfirm = () => {
    // Basic validation for checkout
    if (type === 'checkout' && !selectedClientId) {
      alert("Veuillez sélectionner un client pour le départ.");
      return;
    }

    onConfirm({
      vehicleId: vehicle.id,
      type,
      fuelLevel,
      finalMileage: currentMileage,
      observations,
      damages,
      // New fields
      clientId: selectedClientId,
      clientName: clients.find(c => c.id === selectedClientId)?.name || 'Client inconnu',
      departureTime
    });
    onClose();
  };

  if (!isOpen || !vehicle) return null;

  const isCheckOut = type === 'checkout';
  const title = isCheckOut ? 'Départ Véhicule (Check-out)' : 'Retour Véhicule (Check-in)';
  const confirmLabel = isCheckOut ? 'Valider le Départ' : 'Valider le Retour';
  const confirmColor = isCheckOut ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';
  
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
                        <select
                          value={selectedClientId}
                          onChange={(e) => setSelectedClientId(e.target.value)}
                          className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                          <option value="">Sélectionner un client...</option>
                          {clients.map(client => (
                            <option key={client.id} value={client.id}>
                              {client.name} {client.company ? `(${client.company})` : ''}
                            </option>
                          ))}
                        </select>
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
                        className="w-full px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
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
                        className="w-full pl-4 pr-12 py-3 text-2xl font-bold text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                    className="w-full h-32 p-4 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-gray-50 shadow-sm transition-all"
                  />
                </div>
              </div>

              {/* Right Column: Diagram & List */}
              <div className="lg:col-span-8 p-8 flex flex-col bg-gray-50/50">
                
                {/* Top Bar: Title & Toggles */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Signalement des dégâts
                  </h3>
                  
                  <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    {Object.values(damageTypes).map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedDamageType(type.id)}
                        className={cn(
                          "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                          selectedDamageType === type.id 
                            ? "bg-gray-900 text-white shadow-sm"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Diagram Area */}
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-8 relative min-h-[500px] flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute top-4 left-4 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                    Cliquez sur le véhicule pour ajouter un dégât
                  </div>

                  <div 
                    ref={diagramRef}
                    className="relative w-[300px] h-[500px] cursor-crosshair select-none transition-transform hover:scale-[1.02] duration-500"
                    onClick={handleDiagramClick}
                  >
                    {/* Teardrop Car SVG */}
                    <svg viewBox="0 0 300 600" className="w-full h-full drop-shadow-2xl">
                      <defs>
                        <linearGradient id="bodyGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="100%" stopColor="#f1f5f9" />
                        </linearGradient>
                        <linearGradient id="glassGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                          <stop offset="0%" stopColor="#e2e8f0" />
                          <stop offset="100%" stopColor="#cbd5e1" />
                        </linearGradient>
                        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
                          <feOffset dx="0" dy="8" result="offsetblur" />
                          <feComponentTransfer>
                            <feFuncA type="linear" slope="0.15" />
                          </feComponentTransfer>
                          <feMerge>
                            <feMergeNode />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      {/* Wheels - Dark rectangles sticking out slightly */}
                      <rect x="20" y="120" width="40" height="70" rx="10" fill="#334155" />
                      <rect x="240" y="120" width="40" height="70" rx="10" fill="#334155" />
                      <rect x="30" y="420" width="40" height="70" rx="10" fill="#334155" />
                      <rect x="230" y="420" width="40" height="70" rx="10" fill="#334155" />

                      {/* Main Body - Teardrop Shape */}
                      {/* Top is front (rounded), Bottom is rear (tapered) */}
                      <path 
                        d="M 150,40 
                           C 240,40 270,100 270,180 
                           L 260,450 
                           C 260,540 220,570 150,570 
                           C 80,570 40,540 40,450 
                           L 30,180 
                           C 30,100 60,40 150,40 Z" 
                        fill="url(#bodyGradient)" 
                        stroke="#e2e8f0" 
                        strokeWidth="2"
                        filter="url(#dropShadow)"
                      />

                      {/* Windshield - Curved */}
                      <path 
                        d="M 50,160 
                           Q 150,130 250,160 
                           L 245,280 
                           Q 150,260 55,280 Z" 
                        fill="url(#glassGradient)" 
                        stroke="#cbd5e1"
                        strokeWidth="1"
                      />

                      {/* Roof */}
                      <path 
                        d="M 55,290 
                           Q 150,270 245,290 
                           L 240,400 
                           Q 150,410 60,400 Z" 
                        fill="#ffffff" 
                        stroke="#f1f5f9"
                      />

                      {/* Rear Window */}
                      <path 
                        d="M 60,410 
                           Q 150,420 240,410 
                           L 235,460 
                           Q 150,470 65,460 Z" 
                        fill="url(#glassGradient)" 
                        stroke="#cbd5e1"
                        strokeWidth="1"
                      />

                      {/* Hood Lines */}
                      <path d="M 70,150 Q 150,120 230,150" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                      
                      {/* Headlights */}
                      <path d="M 50,70 Q 70,90 90,80" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                      <path d="M 250,70 Q 230,90 210,80" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />

                      {/* Taillights */}
                      <path d="M 60,540 Q 80,520 100,530" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                      <path d="M 240,540 Q 220,520 200,530" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />

                      {/* Side Mirrors */}
                      <path d="M 30,160 L 10,150 L 10,180 L 30,190 Z" fill="#cbd5e1" />
                      <path d="M 270,160 L 290,150 L 290,180 L 270,190 Z" fill="#cbd5e1" />

                    </svg>

                    {/* Damage Markers */}
                    {damages.map((damage, index) => {
                      const typeConfig = damageTypes[damage.type] || damageTypes.scratch;
                      return (
                        <motion.div
                          key={damage.id}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute group z-10"
                          style={{ left: `${damage.x}%`, top: `${damage.y}%` }}
                        >
                          {/* Delete Button (Visible on hover) */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDamage(damage.id);
                            }}
                            className="absolute -top-5 -right-5 w-5 h-5 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-all duration-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 z-30"
                            title="Supprimer ce dégât"
                          >
                            <X className="w-3 h-3" />
                          </div>

                          {/* Marker Dot */}
                          <div className={`w-6 h-6 -ml-3 -mt-3 rounded-full border-2 shadow-md flex items-center justify-center cursor-pointer transition-transform hover:scale-125 ${typeConfig.color} ${typeConfig.border}`}>
                            <span className="text-[10px] font-bold text-white">{index + 1}</span>
                          </div>
                          
                          {/* Tooltip */}
                          <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 hidden group-hover:block w-max max-w-[150px] z-20">
                            <div className="bg-gray-900 text-white text-xs rounded py-1.5 px-3 shadow-xl text-center">
                              <div className="font-bold mb-0.5">{typeConfig.label}</div>
                              {damage.description && damage.description !== typeConfig.label && (
                                <div className="text-gray-300 text-[10px] truncate max-w-[120px]">{damage.description}</div>
                              )}
                              <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Damage List Section */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Liste des dégâts ({damages.length})
                    </h4>
                  </div>
                  
                  {damages.length === 0 ? (
                    <div className="bg-white border border-gray-200 border-dashed rounded-xl p-6 text-center">
                      <p className="text-sm text-gray-400">Aucun dégât signalé pour le moment.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {damages.map((damage, index) => {
                        const typeConfig = damageTypes[damage.type] || damageTypes.scratch;
                        return (
                          <motion.div 
                            key={damage.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex items-center gap-3 group"
                          >
                            <div className={`w-6 h-6 rounded-full ${typeConfig.color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-gray-900">{typeConfig.label}</span>
                                <button 
                                  onClick={() => removeDamage(damage.id)}
                                  className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <input 
                                type="text" 
                                value={damage.description}
                                onChange={(e) => updateDamageDescription(damage.id, e.target.value)}
                                className="w-full bg-transparent border-none p-0 text-xs text-gray-500 focus:ring-0 placeholder-gray-300"
                                placeholder="Ajouter une note..."
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
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