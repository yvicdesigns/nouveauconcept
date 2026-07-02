import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Box3, Vector3 } from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Loader2, CheckCircle, X, AlertTriangle, RotateCcw } from 'lucide-react';
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

// ─── Diagramme 2D SVG (même teardrop que VehicleCheckModal + zones cliquables) ─
const TD_BODY = 'M 150,40 C 240,40 270,100 270,180 L 260,450 C 260,540 220,570 150,570 C 80,570 40,540 40,450 L 30,180 C 30,100 60,40 150,40 Z';

const CarDiagram2D = ({ selectedPart, hoveredPart, onSelect, onHover, issuePartIds }) => {
  const oc = id => {
    if (selectedPart === id) return 'rgba(251,191,36,0.40)';
    if (hoveredPart  === id) return 'rgba(147,197,253,0.40)';
    if (issuePartIds.includes(id)) return 'rgba(252,165,165,0.40)';
    return 'transparent';
  };
  const os = id => {
    if (selectedPart === id) return '#d97706';
    if (hoveredPart  === id) return '#2563eb';
    if (issuePartIds.includes(id)) return '#dc2626';
    return 'transparent';
  };
  const zp = id => ({
    fill: oc(id), stroke: os(id), strokeWidth: 2,
    style: { cursor: 'pointer', transition: 'fill 0.12s' },
    onClick: () => onSelect(selectedPart === id ? null : id),
    onMouseEnter: () => onHover(id),
    onMouseLeave: () => onHover(null),
  });

  const dotPos = {
    bumper_front: {x:150,y:62},  hood:{x:150,y:125},  windshield:{x:150,y:210},
    door_fl:{x:58,y:265},        cabin:{x:150,y:310},  door_fr:{x:242,y:265},
    door_rl:{x:58,y:355},        door_rr:{x:242,y:355},rear_window:{x:150,y:435},
    trunk:{x:150,y:505},         bumper_rear:{x:150,y:550},
    wheel_fl:{x:38,y:155},       wheel_fr:{x:262,y:155},
    wheel_rl:{x:42,y:455},       wheel_rr:{x:258,y:455},
  };

  return (
    <svg viewBox="0 0 300 600" width="220" style={{ display: 'block', userSelect: 'none', margin: '0 auto' }}>
      <defs>
        <clipPath id="tdBodyClip"><path d={TD_BODY} /></clipPath>
        <linearGradient id="td_bodyGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
        <linearGradient id="td_glassGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" /><stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <filter id="td_shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
          <feOffset dx="0" dy="8" result="b" />
          <feComponentTransfer><feFuncA type="linear" slope="0.15" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Roues */}
      <rect x="20" y="120" width="40" height="70" rx="10" fill="#334155" />
      <rect x="240" y="120" width="40" height="70" rx="10" fill="#334155" />
      <rect x="30" y="420" width="40" height="70" rx="10" fill="#334155" />
      <rect x="230" y="420" width="40" height="70" rx="10" fill="#334155" />

      {/* Carrosserie (teardrop identique à VehicleCheckModal) */}
      <path d={TD_BODY} fill="url(#td_bodyGrad)" stroke="#e2e8f0" strokeWidth="2" filter="url(#td_shadow)" />

      {/* Pare-brise */}
      <path d="M 50,160 Q 150,130 250,160 L 245,280 Q 150,260 55,280 Z"
        fill="url(#td_glassGrad)" stroke="#cbd5e1" strokeWidth="1" pointerEvents="none" />
      {/* Toit */}
      <path d="M 55,290 Q 150,270 245,290 L 240,400 Q 150,410 60,400 Z"
        fill="#ffffff" stroke="#f1f5f9" pointerEvents="none" />
      {/* Lunette AR */}
      <path d="M 60,410 Q 150,420 240,410 L 235,460 Q 150,470 65,460 Z"
        fill="url(#td_glassGrad)" stroke="#cbd5e1" strokeWidth="1" pointerEvents="none" />
      {/* Ligne capot */}
      <path d="M 70,150 Q 150,120 230,150" fill="none" stroke="#e2e8f0" strokeWidth="2" pointerEvents="none" />
      {/* Phares AV */}
      <path d="M 50,70 Q 70,90 90,80" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
      <path d="M 250,70 Q 230,90 210,80" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
      {/* Feux AR */}
      <path d="M 60,540 Q 80,520 100,530" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
      <path d="M 240,540 Q 220,520 200,530" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
      {/* Rétroviseurs */}
      <path d="M 30,160 L 10,150 L 10,180 L 30,190 Z" fill="#cbd5e1" pointerEvents="none" />
      <path d="M 270,160 L 290,150 L 290,180 L 270,190 Z" fill="#cbd5e1" pointerEvents="none" />

      {/* Zones cliquables (invisible par défaut, colorées au hover/sélection/alerte) */}
      <g clipPath="url(#tdBodyClip)">
        <rect {...zp('bumper_front')} x="40"  y="40"  width="220" height="52" />
        <rect {...zp('hood')}         x="40"  y="92"  width="220" height="68" />
        <path {...zp('windshield')}   d="M 50,160 Q 150,130 250,160 L 245,280 Q 150,260 55,280 Z" />
        <rect {...zp('door_fl')}      x="32"  y="160" width="78"  height="120" />
        <rect {...zp('cabin')}        x="110" y="160" width="80"  height="250" />
        <rect {...zp('door_fr')}      x="190" y="160" width="78"  height="120" />
        <rect {...zp('door_rl')}      x="32"  y="280" width="78"  height="130" />
        <rect {...zp('door_rr')}      x="190" y="280" width="78"  height="130" />
        <path {...zp('rear_window')}  d="M 60,410 Q 150,420 240,410 L 235,460 Q 150,470 65,460 Z" />
        <rect {...zp('trunk')}        x="42"  y="460" width="216" height="72" />
        <rect {...zp('bumper_rear')}  x="50"  y="532" width="200" height="38" />
      </g>
      {/* Zones roues */}
      <rect {...zp('wheel_fl')} x="20" y="120" width="40" height="70" rx="10" />
      <rect {...zp('wheel_fr')} x="240" y="120" width="40" height="70" rx="10" />
      <rect {...zp('wheel_rl')} x="30" y="420" width="40" height="70" rx="10" />
      <rect {...zp('wheel_rr')} x="230" y="420" width="40" height="70" rx="10" />

      {/* Points d'alerte */}
      {issuePartIds.map(id => {
        const p = dotPos[id];
        return p ? (
          <g key={id} pointerEvents="none">
            <circle cx={p.x} cy={p.y} r={8} fill="#ef4444" opacity="0.2" />
            <circle cx={p.x} cy={p.y} r={5} fill="#ef4444" stroke="white" strokeWidth={1.5} />
          </g>
        ) : null;
      })}
    </svg>
  );
};

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
