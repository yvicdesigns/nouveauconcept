import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Loader2, CheckCircle, X, AlertTriangle, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Modèles 3D ───────────────────────────────────────────────────────────────
const VEHICLE_MODELS = [
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

/*
  Géométrie du schéma (viewBox="0 0 280 510") :

  Corps central : x=72–208 (w=136)
  Pare-chocs    : x=90–190 (w=100, arrondis)
  Portes        : x=50–74 (G) et x=206–230 (D)
  Roues         : cx=42/238, cy=132/390

  Zones empilées (y) :
    bumper_front : 24 → 58   (path courbe)
    hood         : 58 → 154  (h=96)
    windshield   : 154 → 200 (h=46)
    — cabin + doors : 200 → 320 (h=120) —
      door_fl  : x=50–74,  y=200–265
      cabin    : x=74–206, y=200–320
      door_fr  : x=206–230, y=200–265
      door_rl  : x=50–74,  y=265–320
      door_rr  : x=206–230, y=265–320
    rear_window  : 320 → 366 (h=46)
    trunk        : 366 → 462 (h=96)
    bumper_rear  : 462 → 488 (path courbe)
*/

const DOT_POS = {
  bumper_front: { x: 140, y: 40  },
  hood:         { x: 140, y: 106 },
  windshield:   { x: 140, y: 177 },
  door_fl:      { x: 62,  y: 232 },
  cabin:        { x: 140, y: 260 },
  door_fr:      { x: 218, y: 232 },
  door_rl:      { x: 62,  y: 292 },
  door_rr:      { x: 218, y: 292 },
  rear_window:  { x: 140, y: 343 },
  trunk:        { x: 140, y: 414 },
  bumper_rear:  { x: 140, y: 476 },
  wheel_fl:     { x: 42,  y: 132 },
  wheel_fr:     { x: 238, y: 132 },
  wheel_rl:     { x: 42,  y: 390 },
  wheel_rr:     { x: 238, y: 390 },
};

// ─── Diagramme 2D SVG (vue de dessus) ────────────────────────────────────────
const CarDiagram2D = ({ selectedPart, hoveredPart, onSelect, onHover, issuePartIds }) => {
  const fill = id =>
    selectedPart === id     ? '#fbbf24'
    : hoveredPart === id    ? '#93c5fd'
    : issuePartIds.includes(id) ? '#fca5a5'
    : '#dde1e9';

  const stroke = id =>
    selectedPart === id     ? '#d97706'
    : hoveredPart === id    ? '#2563eb'
    : issuePartIds.includes(id) ? '#dc2626'
    : '#9ca3af';

  const z = id => ({
    fill:         fill(id),
    stroke:       stroke(id),
    strokeWidth:  selectedPart === id || hoveredPart === id ? 2.5 : 1,
    style:        { cursor: 'pointer', transition: 'fill 0.1s, stroke 0.1s' },
    onClick:      () => onSelect(selectedPart === id ? null : id),
    onMouseEnter: () => onHover(id),
    onMouseLeave: () => onHover(null),
  });

  return (
    <svg
      viewBox="0 0 280 510"
      width="100%"
      style={{ maxHeight: 300, display: 'block', userSelect: 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Fond silhouette ── */}
      <rect x="45" y="22" width="190" height="466" rx="32" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />

      {/* ── Roues ── */}
      <ellipse {...z('wheel_fl')} cx="42"  cy="132" rx="17" ry="36"><title>Roue AV G</title></ellipse>
      <ellipse {...z('wheel_fr')} cx="238" cy="132" rx="17" ry="36"><title>Roue AV D</title></ellipse>
      <ellipse {...z('wheel_rl')} cx="42"  cy="390" rx="17" ry="36"><title>Roue AR G</title></ellipse>
      <ellipse {...z('wheel_rr')} cx="238" cy="390" rx="17" ry="36"><title>Roue AR D</title></ellipse>

      {/* ── Pare-chocs avant (arrondi au sommet) ── */}
      <path {...z('bumper_front')} d="M90,24 Q140,14 190,24 L190,58 L90,58 Z">
        <title>Pare-chocs AV</title>
      </path>

      {/* ── Capot ── */}
      <rect {...z('hood')} x="72" y="58" width="136" height="96" rx="0">
        <title>Capot</title>
      </rect>

      {/* ── Pare-brise ── */}
      <rect {...z('windshield')} x="72" y="154" width="136" height="46" rx="0">
        <title>Pare-brise</title>
      </rect>

      {/* ── Portières avant (gauche + droite) ── */}
      <rect {...z('door_fl')} x="50" y="200" width="24" height="65" rx="0">
        <title>Portière AV G</title>
      </rect>
      <rect {...z('door_fr')} x="206" y="200" width="24" height="65" rx="0">
        <title>Portière AV D</title>
      </rect>

      {/* ── Habitacle (centre, toute hauteur du bloc cabin) ── */}
      <rect {...z('cabin')} x="74" y="200" width="132" height="120" rx="0">
        <title>Habitacle / Toit</title>
      </rect>

      {/* ── Portières arrière (gauche + droite) ── */}
      <rect {...z('door_rl')} x="50" y="265" width="24" height="55" rx="0">
        <title>Portière AR G</title>
      </rect>
      <rect {...z('door_rr')} x="206" y="265" width="24" height="55" rx="0">
        <title>Portière AR D</title>
      </rect>

      {/* ── Lunette arrière ── */}
      <rect {...z('rear_window')} x="72" y="320" width="136" height="46" rx="0">
        <title>Lunette AR</title>
      </rect>

      {/* ── Coffre ── */}
      <rect {...z('trunk')} x="72" y="366" width="136" height="96" rx="0">
        <title>Coffre</title>
      </rect>

      {/* ── Pare-chocs arrière (arrondi au bas) ── */}
      <path {...z('bumper_rear')} d="M90,462 L190,462 L190,488 Q140,498 90,488 Z">
        <title>Pare-chocs AR</title>
      </path>

      {/* ── Séparateurs visuels (non-interactifs) ── */}
      <line x1="72" y1="154" x2="208" y2="154" stroke="#64748b" strokeWidth="0.5" pointerEvents="none" opacity="0.4" />
      <line x1="72" y1="320" x2="208" y2="320" stroke="#64748b" strokeWidth="0.5" pointerEvents="none" opacity="0.4" />
      <line x1="50" y1="265" x2="74" y2="265" stroke="#64748b" strokeWidth="0.5" pointerEvents="none" opacity="0.4" />
      <line x1="206" y1="265" x2="230" y2="265" stroke="#64748b" strokeWidth="0.5" pointerEvents="none" opacity="0.4" />

      {/* ── Labels texte ── */}
      <text x="140" y="110" textAnchor="middle" fontSize="10" fill="#475569" pointerEvents="none" fontWeight="500">Capot</text>
      <text x="140" y="180" textAnchor="middle" fontSize="9"  fill="#475569" pointerEvents="none">Pare-brise</text>
      <text x="140" y="263" textAnchor="middle" fontSize="10" fill="#475569" pointerEvents="none" fontWeight="500">Habitacle</text>
      <text x="140" y="346" textAnchor="middle" fontSize="9"  fill="#475569" pointerEvents="none">Lunette AR</text>
      <text x="140" y="417" textAnchor="middle" fontSize="10" fill="#475569" pointerEvents="none" fontWeight="500">Coffre</text>

      {/* ── Points rouges = zones avec intervention ── */}
      {issuePartIds.map(id => {
        const p = DOT_POS[id];
        return p ? (
          <circle key={id} cx={p.x} cy={p.y} r={5}
            fill="#ef4444" stroke="white" strokeWidth={1.5} pointerEvents="none" />
        ) : null;
      })}

      {/* ── Orientations ── */}
      <text x="140" y="10"  textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="700" pointerEvents="none">▲ AVANT</text>
      <text x="140" y="508" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="700" pointerEvents="none">▼ ARRIÈRE</text>
      <text x="7"   y="260" textAnchor="middle" fontSize="7" fill="#94a3b8" transform="rotate(-90,7,260)"   pointerEvents="none">GAUCHE</text>
      <text x="273" y="260" textAnchor="middle" fontSize="7" fill="#94a3b8" transform="rotate(90,273,260)" pointerEvents="none">DROITE</text>
    </svg>
  );
};

// ─── Modèle 3D (visualisation uniquement — le clic est sur le SVG) ────────────
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
  const [modelKey,     setModelKey]     = useState('sedan');
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
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
            }`}
          >{m.label}</button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">

        {/* ── Vue 3D (rotation/zoom libres, pas de clic zone) ── */}
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
            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              minDistance={2}
              maxDistance={14}
              maxPolarAngle={Math.PI / 2.1}
            />
          </Canvas>

          {/* Reset caméra */}
          <button
            onClick={() => controlsRef.current?.reset()}
            className="absolute top-3 right-3 bg-white/80 hover:bg-white backdrop-blur-sm p-2 rounded-lg shadow text-slate-600 transition-colors"
            title="Réinitialiser la vue"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Badge interventions actives */}
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

          {/* Diagramme 2D */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Schéma — cliquez une zone
              </p>
              {selectedPart && (
                <button
                  onClick={() => setSelectedPart(null)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
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

            {/* Légende */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 pt-2 border-t border-slate-100">
              {[
                { cls: 'bg-red-300',    label: 'Intervention' },
                { cls: 'bg-amber-400',  label: 'Sélectionné' },
                { cls: 'bg-blue-300',   label: 'Survolé' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1 text-xs text-slate-500">
                  <span className={`w-2 h-2 rounded-sm ${l.cls}`} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {/* Panel interventions de la zone sélectionnée */}
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
                {/* Header zone */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-200 uppercase tracking-widest mb-0.5">Zone sélectionnée</p>
                    <p className="font-bold text-base leading-tight">{selectedLabel}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPart(null)}
                    className="text-blue-200 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Liste des interventions */}
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
                          <div className="flex items-start gap-1.5 mb-1.5">
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
                          {r.mechanic && (
                            <p className="text-slate-400 mt-1">👷 {r.mechanic}</p>
                          )}
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
