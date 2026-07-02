import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Box3, Vector3 } from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Loader2, CheckCircle, X, AlertTriangle, RotateCcw } from 'lucide-react';
import CarDiagram2D, { DOT_POS } from './CarDiagram2D';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Modèles 3D ───────────────────────────────────────────────────────────────
const VEHICLE_MODELS = [
  { key: 'car',          label: 'Voiture',    file: '/models/car.glb' },
  { key: 'sedan',        label: 'Berline',    file: '/models/sedan.glb' },
  { key: 'sedan-sports', label: 'Sport',      file: '/models/sedan-sports.glb' },
  { key: 'suv',          label: 'SUV',        file: '/models/suv.glb' },
  { key: 'suv-luxury',   label: 'SUV Luxe',   file: '/models/suv-luxury.glb' },
  { key: 'hatchback',    label: 'Hatchback',  file: '/models/hatchback-sports.glb' },
  { key: 'van',          label: 'Utilitaire', file: '/models/van.glb' },
];

// ─── Zones sélectionnables ────────────────────────────────────────────────────
const PARTS = [
  { id: 'bumper_front', label: 'Pare-chocs AV' },
  { id: 'hood',         label: 'Capot' },
  { id: 'windshield',   label: 'Pare-brise' },
  { id: 'door_fl',      label: 'Portière AV G' },
  { id: 'cabin',        label: 'Habitacle / Toit' },
  { id: 'door_fr',      label: 'Portière AV D' },
  { id: 'door_rl',      label: 'Portière AR G' },
  { id: 'door_rr',      label: 'Portière AR D' },
  { id: 'rear_window',  label: 'Lunette AR' },
  { id: 'trunk',        label: 'Coffre' },
  { id: 'bumper_rear',  label: 'Pare-chocs AR' },
  { id: 'wheel_fl',     label: 'Roue AV G' },
  { id: 'wheel_fr',     label: 'Roue AV D' },
  { id: 'wheel_rl',     label: 'Roue AR G' },
  { id: 'wheel_rr',     label: 'Roue AR D' },
];

// ─── Modèle 3D (visualisation uniquement) ────────────────────────────────────
const CarModel = ({ modelPath, issuePartIds }) => {
  const { scene } = useGLTF(modelPath);

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(node => {
      if (node.isMesh && node.material) {
        node.material = node.material.clone();
        node.userData.originalColor = '#' + node.material.color.getHexString();
      }
    });
    // Scale, puis position : X/Z centrés, Y = -min.y*s pour poser sur le sol
    const box    = new Box3().setFromObject(clone);
    const center = box.getCenter(new Vector3());
    const size   = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const s      = maxDim > 0 ? 3.5 / maxDim : 1;
    clone.scale.setScalar(s);
    clone.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    return clone;
  }, [scene]);

  useEffect(() => {
    const bodyIssue = issuePartIds.some(id => !id.startsWith('wheel'));
    const wheelMap  = {
      'wheel-front-left':  issuePartIds.includes('wheel_fl'),
      'wheel-front-right': issuePartIds.includes('wheel_fr'),
      'wheel-back-left':   issuePartIds.includes('wheel_rl'),
      'wheel-back-right':  issuePartIds.includes('wheel_rr'),
    };
    cloned.traverse(node => {
      if (!node.isMesh || !node.material) return;
      if (node.name === 'body') {
        node.material.color.set(bodyIssue ? '#ef4444' : (node.userData.originalColor || '#aaaaaa'));
      } else if (node.name in wheelMap) {
        node.material.color.set(wheelMap[node.name] ? '#ef4444' : (node.userData.originalColor || '#333333'));
      }
    });
  }, [cloned, issuePartIds]);

  return <primitive object={cloned} />;
};

// ─── Composant principal ──────────────────────────────────────────────────────
const CarViewer3D = ({ vehicleId = null }) => {
  const [modelKey,     setModelKey]     = useState('car');
  const [selectedPart, setSelectedPart] = useState(null);
  const [hoveredPart,  setHoveredPart]  = useState(null);
  const [records,      setRecords]      = useState([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const controlsRef = useRef();

  const modelPath = VEHICLE_MODELS.find(m => m.key === modelKey)?.file || '/models/sedan.glb';

  useEffect(() => {
    if (!vehicleId) return;
    setIsLoading(true);
    supabase
      .from('maintenance_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .neq('status', 'completed')
      .order('reported_date', { ascending: false })
      .then(({ data }) => { setRecords(data || []); setIsLoading(false); });
  }, [vehicleId]);

  const issuePartIds = useMemo(
    () => [...new Set(records.filter(r => r.part_name).map(r => r.part_name))],
    [records]
  );

  const filteredRecords = useMemo(
    () => selectedPart ? records.filter(r => r.part_name === selectedPart) : [],
    [selectedPart, records]
  );

  const selectedLabel = PARTS.find(p => p.id === selectedPart)?.label;

  return (
    <div className="flex flex-col gap-4">

      {/* Sélecteur de modèle */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mr-1">Modèle :</span>
        {VEHICLE_MODELS.map(m => (
          <button key={m.key}
            onClick={() => { setModelKey(m.key); setSelectedPart(null); }}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              modelKey === m.key
                ? 'bg-nc-navy text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
            }`}
          >{m.label}</button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">

        {/* ── Vue 3D ── */}
        <div
          className="relative flex-1 bg-gradient-to-b from-slate-100 to-slate-200 rounded-2xl overflow-hidden shadow-inner"
          style={{ height: 440 }}
        >
          <Canvas shadows dpr={[1, 2]} style={{ width: '100%', height: '100%' }}>
            <PerspectiveCamera makeDefault position={[4, 3, 6]} fov={45} />
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-5, 3, -3]} intensity={0.4} />
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
              <circleGeometry args={[6, 64]} />
              <meshStandardMaterial color="#e2e8f0" roughness={1} />
            </mesh>
            <Suspense fallback={null}>
              <CarModel modelPath={modelPath} issuePartIds={issuePartIds} />
            </Suspense>
            <OrbitControls ref={controlsRef} enablePan={false} minDistance={2} maxDistance={14} maxPolarAngle={Math.PI / 2.1} />
          </Canvas>

          <button onClick={() => controlsRef.current?.reset()}
            className="absolute top-3 right-3 bg-white/80 hover:bg-white backdrop-blur-sm p-2 rounded-lg shadow text-slate-600 transition-colors"
            title="Réinitialiser la vue">
            <RotateCcw className="h-4 w-4" />
          </button>

          {issuePartIds.length > 0 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white/85 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-700">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {issuePartIds.length} zone{issuePartIds.length > 1 ? 's' : ''} signalée{issuePartIds.length > 1 ? 's' : ''}
            </div>
          )}

          <p className="absolute top-3 left-3 text-xs text-slate-400 bg-white/70 backdrop-blur-sm px-2 py-1 rounded-lg">
            🖱 Pivoter · 🔍 Zoomer
          </p>
        </div>

        {/* ── Colonne droite ── */}
        <div className="w-full lg:w-72 flex flex-col gap-3">

          {/* Schéma 2D */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Schéma — cliquez une zone
              </p>
              {selectedPart && (
                <button onClick={() => setSelectedPart(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <CarDiagram2D
              selectedPart={selectedPart}
              hoveredPart={hoveredPart}
              onSelect={setSelectedPart}
              onHover={setHoveredPart}
              issuePartIds={issuePartIds}
            />

            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 pt-2 border-t border-slate-100">
              {[
                { cls: 'bg-red-400',    label: 'Intervention' },
                { cls: 'bg-amber-400',  label: 'Sélectionné' },
                { cls: 'bg-blue-300',   label: 'Survolé' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1 text-xs text-slate-500">
                  <span className={`w-2 h-2 rounded-sm ${l.cls}`} />{l.label}
                </span>
              ))}
            </div>
          </div>

          {/* Panel interventions */}
          <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {!selectedPart ? (
              <div className="flex flex-col items-center justify-center h-32 text-center px-5">
                <p className="text-sm font-semibold text-slate-600">Cliquez une zone du schéma</p>
                <p className="text-xs text-slate-400 mt-1">pour voir les interventions associées</p>
                {records.length > 0 && (
                  <div className="mt-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-bold text-amber-700">
                      {records.length} intervention{records.length > 1 ? 's' : ''} active{records.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-200 uppercase tracking-widest mb-0.5">Zone sélectionnée</p>
                    <p className="font-bold text-base leading-tight">{selectedLabel}</p>
                  </div>
                  <button onClick={() => setSelectedPart(null)} className="text-blue-200 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-3 max-h-52 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    </div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <CheckCircle className="h-10 w-10 text-green-400 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">Aucune intervention</p>
                      <p className="text-xs text-slate-400 mt-0.5">Zone en bon état</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-2">
                        {filteredRecords.length} intervention{filteredRecords.length > 1 ? 's' : ''}
                      </p>
                      {filteredRecords.map((r, i) => (
                        <div key={i} className={`p-2.5 rounded-lg border text-xs ${
                          r.priority === 'urgent' || r.priority === 'high'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-amber-50 border-amber-200'
                        }`}>
                          <div className="flex items-start gap-1.5 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span className="font-semibold text-slate-800 leading-snug">{r.description}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-slate-500">
                            {r.reported_date && (
                              <span>📅 {format(parseISO(r.reported_date), 'd MMM yyyy', { locale: fr })}</span>
                            )}
                            {r.cost && (
                              <span className="font-semibold text-slate-700">
                                💰 {Number(r.cost).toLocaleString()} FCFA
                              </span>
                            )}
                          </div>
                          {r.mechanic && <p className="text-slate-400 mt-1">👷 {r.mechanic}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default CarViewer3D;
