import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Loader2, Wrench, CheckCircle, X, AlertTriangle, RotateCcw, Car } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Modèles disponibles ──────────────────────────────────────────────────────
const VEHICLE_MODELS = [
  { key: 'sedan',          label: 'Berline',       file: '/models/sedan.glb' },
  { key: 'sedan-sports',   label: 'Sport',         file: '/models/sedan-sports.glb' },
  { key: 'suv',            label: 'SUV',           file: '/models/suv.glb' },
  { key: 'suv-luxury',     label: 'SUV Luxe',      file: '/models/suv-luxury.glb' },
  { key: 'hatchback',      label: 'Hatchback',     file: '/models/hatchback-sports.glb' },
  { key: 'van',            label: 'Utilitaire',    file: '/models/van.glb' },
];

// ─── Zones d'intervention (mappées sur les meshes du GLB) ────────────────────
const BODY_PARTS = [
  { id: 'bumper_front', label: 'Pare-chocs avant' },
  { id: 'hood',         label: 'Capot' },
  { id: 'windshield',   label: 'Pare-brise' },
  { id: 'cabin',        label: 'Habitacle / Toit' },
  { id: 'door_fl',      label: 'Portière AV gauche' },
  { id: 'door_fr',      label: 'Portière AV droite' },
  { id: 'door_rl',      label: 'Portière AR gauche' },
  { id: 'door_rr',      label: 'Portière AR droite' },
  { id: 'rear_window',  label: 'Lunette arrière' },
  { id: 'trunk',        label: 'Coffre' },
  { id: 'bumper_rear',  label: 'Pare-chocs arrière' },
];

const WHEEL_PARTS = {
  'wheel-front-left':  [{ id: 'wheel_fl', label: 'Roue AV gauche' }],
  'wheel-front-right': [{ id: 'wheel_fr', label: 'Roue AV droite' }],
  'wheel-back-left':   [{ id: 'wheel_rl', label: 'Roue AR gauche' }],
  'wheel-back-right':  [{ id: 'wheel_rr', label: 'Roue AR droite' }],
};

// ─── Composant qui charge le GLB et rend les meshes cliquables ───────────────
const CarModel = ({ modelPath, selectedMesh, hoveredMesh, onSelect, onHover, issuePartIds }) => {
  const { scene } = useGLTF(modelPath);

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(node => {
      if (node.isMesh && node.material) {
        node.material = node.material.clone();
        node.userData.originalColor = '#' + node.material.color.getHexString();
      }
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    cloned.traverse(node => {
      if (!node.isMesh || !node.material) return;
      const isSelected = selectedMesh === node.name;
      const isHovered  = hoveredMesh  === node.name;

      const bodyPartIds = BODY_PARTS.map(p => p.id);
      const wheelIds    = (WHEEL_PARTS[node.name] || []).map(p => p.id);
      const relevantIds = node.name === 'body' ? bodyPartIds : wheelIds;
      const hasIssue    = issuePartIds.some(id => relevantIds.includes(id));

      if (isSelected)   node.material.color.set('#f59e0b');
      else if (hasIssue) node.material.color.set('#ef4444');
      else if (isHovered) node.material.color.set('#93c5fd');
      else if (node.userData.originalColor) node.material.color.set(node.userData.originalColor);
    });
  }, [cloned, selectedMesh, hoveredMesh, issuePartIds]);

  return (
    <primitive
      object={cloned}
      onClick={e => { e.stopPropagation(); if (e.object.name) onSelect(e.object.name); }}
      onPointerOver={e => { e.stopPropagation(); if (e.object.name) { onHover(e.object.name); document.body.style.cursor = 'pointer'; } }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = 'auto'; }}
    />
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────
const CarViewer3D = ({ vehicleId = null }) => {
  const [modelKey,     setModelKey]     = useState('sedan');
  const [selectedMesh, setSelectedMesh] = useState(null);
  const [hoveredMesh,  setHoveredMesh]  = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [records,      setRecords]      = useState([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const controlsRef = useRef();

  const modelPath = VEHICLE_MODELS.find(m => m.key === modelKey)?.file || '/models/sedan.glb';

  useEffect(() => {
    if (!vehicleId) return;
    const fetch = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .neq('status', 'completed')
        .order('reported_date', { ascending: false });
      setRecords(data || []);
      setIsLoading(false);
    };
    fetch();
  }, [vehicleId]);

  const issuePartIds = [...new Set(records.filter(r => r.part_name).map(r => r.part_name))];

  const handleSelectMesh = (meshName) => {
    if (selectedMesh === meshName) {
      setSelectedMesh(null);
      setSelectedPart(null);
    } else {
      setSelectedMesh(meshName);
      setSelectedPart(null);
    }
  };

  const handleSelectPart = (partId) => {
    setSelectedPart(prev => prev === partId ? null : partId);
  };

  const resetCamera = () => controlsRef.current?.reset();

  // Records filtrés selon la sélection
  const filteredRecords = useMemo(() => {
    if (!selectedMesh) return [];
    if (selectedMesh === 'body') {
      const bodyIds = BODY_PARTS.map(p => p.id);
      const base = records.filter(r => bodyIds.includes(r.part_name));
      if (selectedPart) return base.filter(r => r.part_name === selectedPart);
      return base;
    }
    const wheelIds = (WHEEL_PARTS[selectedMesh] || []).map(p => p.id);
    return records.filter(r => wheelIds.includes(r.part_name));
  }, [selectedMesh, selectedPart, records]);

  const panelTitle = useMemo(() => {
    if (!selectedMesh) return null;
    if (selectedPart) return BODY_PARTS.find(p => p.id === selectedPart)?.label;
    if (selectedMesh === 'body') return 'Carrosserie';
    return (WHEEL_PARTS[selectedMesh]?.[0]?.label) ?? selectedMesh;
  }, [selectedMesh, selectedPart]);

  return (
    <div className="flex flex-col gap-4">
      {/* Sélecteur de modèle */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mr-1">Modèle :</span>
        {VEHICLE_MODELS.map(m => (
          <button
            key={m.key}
            onClick={() => { setModelKey(m.key); setSelectedMesh(null); setSelectedPart(null); }}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              modelKey === m.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4" style={{ height: 480 }}>

        {/* ── Canvas 3D ── */}
        <div className="relative flex-1 min-w-0 bg-gradient-to-b from-slate-100 to-slate-200 rounded-2xl overflow-hidden shadow-inner">
          <Canvas shadows dpr={[1, 2]} style={{ width: '100%', height: '100%' }}>
            <PerspectiveCamera makeDefault position={[4, 3, 6]} fov={45} />
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-5, 3, -3]} intensity={0.4} />

            {/* Sol */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
              <circleGeometry args={[6, 64]} />
              <meshStandardMaterial color="#e2e8f0" roughness={1} />
            </mesh>

            <Suspense fallback={null}>
              <CarModel
                modelPath={modelPath}
                selectedMesh={selectedMesh}
                hoveredMesh={hoveredMesh}
                onSelect={handleSelectMesh}
                onHover={setHoveredMesh}
                issuePartIds={issuePartIds}
              />
            </Suspense>

            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              minDistance={2}
              maxDistance={14}
              maxPolarAngle={Math.PI / 2.1}
            />
          </Canvas>

          {/* Tooltip */}
          {hoveredMesh && hoveredMesh !== selectedMesh && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full pointer-events-none backdrop-blur-sm whitespace-nowrap">
              {hoveredMesh === 'body'
                ? 'Carrosserie — cliquez pour voir les interventions'
                : (WHEEL_PARTS[hoveredMesh]?.[0]?.label ?? hoveredMesh) + ' — cliquez pour voir les interventions'}
            </div>
          )}

          {/* Reset caméra */}
          <button
            onClick={resetCamera}
            className="absolute top-3 right-3 bg-white/80 hover:bg-white backdrop-blur-sm p-2 rounded-lg shadow text-slate-600 hover:text-slate-900 transition-colors"
            title="Réinitialiser la vue"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Légende */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
            {[
              { color: 'bg-red-500',   label: 'Intervention' },
              { color: 'bg-amber-400', label: 'Sélectionné' },
              { color: 'bg-blue-300',  label: 'Survolé' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium text-slate-700">
                <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                {l.label}
              </div>
            ))}
          </div>

          <p className="absolute top-3 left-3 text-xs text-slate-400 bg-white/70 backdrop-blur-sm px-2 py-1 rounded-lg">
            🖱 Pivoter · 🔍 Zoomer
          </p>
        </div>

        {/* ── Panneau latéral ── */}
        <div className="w-full lg:w-72 flex flex-col gap-3 overflow-y-auto">
          {!selectedMesh ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-3">
                <Car className="h-7 w-7 text-blue-600" />
              </div>
              <p className="font-semibold text-slate-700">Sélectionnez une zone</p>
              <p className="text-sm text-slate-400 mt-1">Cliquez sur la carrosserie ou une roue pour voir les interventions</p>
              {records.length > 0 && (
                <div className="mt-4 w-full p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-bold text-amber-700">{records.length} intervention{records.length > 1 ? 's' : ''} en cours</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white flex items-start justify-between">
                <div>
                  <p className="text-xs text-blue-200 uppercase tracking-widest mb-0.5">Zone sélectionnée</p>
                  <h3 className="font-bold text-lg leading-tight">{panelTitle}</h3>
                </div>
                <button onClick={() => { setSelectedMesh(null); setSelectedPart(null); }} className="text-blue-200 hover:text-white mt-0.5">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Sous-zones carrosserie */}
              {selectedMesh === 'body' && (
                <div className="p-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Filtrer par zone</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BODY_PARTS.map(p => {
                      const hasIssue = issuePartIds.includes(p.id);
                      const isActive = selectedPart === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelectPart(p.id)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                            isActive
                              ? 'bg-amber-400 text-white border-amber-400'
                              : hasIssue
                              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                          }`}
                        >
                          {hasIssue && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />}
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Records */}
              <div className="flex-1 overflow-y-auto p-4 bg-white max-h-64">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle className="h-10 w-10 text-green-400 mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">Aucune intervention active</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedPart ? 'Rien de signalé pour cette zone' : 'Cette zone est en bon état'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                      {filteredRecords.length} intervention{filteredRecords.length > 1 ? 's' : ''}
                    </p>
                    {filteredRecords.map((r, i) => (
                      <div key={i} className={`p-3 rounded-xl border text-sm ${
                        r.priority === 'urgent' || r.priority === 'high'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{r.description}</span>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-slate-500">
                          {r.reported_date && (
                            <span>📅 {format(parseISO(r.reported_date), 'd MMM yyyy', { locale: fr })}</span>
                          )}
                          {r.cost && (
                            <span className="font-semibold">💰 {Number(r.cost).toLocaleString()} FCFA</span>
                          )}
                        </div>
                        {r.mechanic && <p className="text-xs text-slate-400 mt-1">👷 {r.mechanic}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CarViewer3D;
