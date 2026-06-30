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

const DOT_POS = {
  bumper_front: { x: 140, y: 38  },
  hood:         { x: 140, y: 90  },
  windshield:   { x: 140, y: 148 },
  door_fl:      { x: 68,  y: 205 },
  cabin:        { x: 140, y: 232 },
  door_fr:      { x: 212, y: 205 },
  door_rl:      { x: 68,  y: 282 },
  door_rr:      { x: 212, y: 282 },
  rear_window:  { x: 140, y: 345 },
  trunk:        { x: 140, y: 405 },
  bumper_rear:  { x: 140, y: 446 },
  wheel_fl:     { x: 36,  y: 158 },
  wheel_fr:     { x: 244, y: 158 },
  wheel_rl:     { x: 36,  y: 330 },
  wheel_rr:     { x: 244, y: 330 },
};

// ─── Diagramme 2D SVG — vue de dessus réaliste ───────────────────────────────
const CarDiagram2D = ({ selectedPart, hoveredPart, onSelect, onHover, issuePartIds }) => {
  const isGlass   = id => id === 'windshield' || id === 'rear_window';

  const zoneFill = id => {
    if (selectedPart === id) return '#fbbf24';
    if (hoveredPart  === id) return '#93c5fd';
    if (issuePartIds.includes(id)) return '#fca5a5';
    // Default appearance by type
    if (isGlass(id))             return '#242e42';  // dark glass
    if (id.startsWith('wheel'))  return '#3a3a3a';  // dark tires
    if (id === 'cabin')          return '#d8dde6';  // roof (slightly darker than body)
    return '#efefef';  // body parts (white-ish)
  };

  const zoneStroke = id => {
    if (selectedPart === id) return '#d97706';
    if (hoveredPart  === id) return '#2563eb';
    if (issuePartIds.includes(id)) return '#dc2626';
    if (isGlass(id))    return '#1a2233';
    if (id === 'cabin') return '#b0b8c8';
    return '#c0c0c0';
  };

  const z = id => ({
    fill:         zoneFill(id),
    stroke:       zoneStroke(id),
    strokeWidth:  selectedPart === id || hoveredPart === id ? 2.5 : 1,
    style:        { cursor: 'pointer', transition: 'fill 0.12s, stroke 0.12s' },
    onClick:      () => onSelect(selectedPart === id ? null : id),
    onMouseEnter: () => onHover(id),
    onMouseLeave: () => onHover(null),
  });

  // Silhouette de la voiture — contour réaliste (vue de dessus berline)
  // Avant en haut, arrière en bas
  const bodyPath =
    'M140,28 ' +
    'C162,28 185,40 200,60 C214,78 220,100 222,122 ' +
    'L246,136 L222,150 ' +                                // rétroviseur droit
    'C226,168 228,192 228,232 C228,280 224,315 218,348 ' +
    'C210,390 196,422 140,448 ' +                         // arrière droit → centre
    'C84,422 70,390 62,348 ' +                            // arrière gauche
    'C56,315 52,280 52,232 C52,192 54,168 58,150 ' +
    'L34,136 L58,122 ' +                                  // rétroviseur gauche
    'C60,100 66,78 80,60 C95,40 118,28 140,28 Z';

  return (
    <svg
      viewBox="0 0 280 490"
      width="100%"
      style={{ maxHeight: 320, display: 'block', userSelect: 'none' }}
    >
      <defs>
        {/* Clip = contour exact de la carrosserie */}
        <clipPath id="carClip">
          <path d={bodyPath} />
        </clipPath>

        {/* Gradient latéral : ombres sur les côtés, blanc au centre */}
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#b8b8b8" />
          <stop offset="18%"  stopColor="#e0e0e0" />
          <stop offset="50%"  stopColor="#f5f5f5" />
          <stop offset="82%"  stopColor="#e0e0e0" />
          <stop offset="100%" stopColor="#b8b8b8" />
        </linearGradient>

        {/* Reflet vitre avant */}
        <linearGradient id="glare" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.22" />
          <stop offset="60%"  stopColor="white" stopOpacity="0.04" />
          <stop offset="100%" stopColor="white" stopOpacity="0"    />
        </linearGradient>

        {/* Ombre portée sous le contour */}
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* ── Ombre de la carrosserie ── */}
      <path d={bodyPath} fill="#00000018" transform="translate(2,4)" />

      {/* ── Base carrosserie (blanc/gris gradient) ── */}
      <path d={bodyPath} fill="url(#bodyGrad)" stroke="#a0a0a0" strokeWidth="1.5" />

      {/* ── Zones cliquables (clippées au contour) ── */}
      <g clipPath="url(#carClip)">

        {/* Pare-chocs avant */}
        <rect {...z('bumper_front')} x="40" y="22" width="200" height="32" />

        {/* Capot */}
        <rect {...z('hood')} x="40" y="54" width="200" height="68" />

        {/* Pare-brise avant (zone cliquable dark) */}
        <path {...z('windshield')}
          d="M 68,122 C 82,116 118,112 140,112 C 162,112 198,116 212,122
             L 214,162 C 200,168 174,172 140,172 C 106,172 80,168 66,162 Z">
          <title>Pare-brise</title>
        </path>

        {/* Portières avant gauche */}
        <rect {...z('door_fl')} x="40" y="172" width="68" height="84" />

        {/* Toit / habitacle (centre) */}
        <rect {...z('cabin')} x="108" y="172" width="64" height="148" />

        {/* Portières avant droite */}
        <rect {...z('door_fr')} x="172" y="172" width="68" height="84" />

        {/* Portières arrière gauche */}
        <rect {...z('door_rl')} x="40" y="256" width="68" height="90" />

        {/* Portières arrière droite */}
        <rect {...z('door_rr')} x="172" y="256" width="68" height="90" />

        {/* Lunette arrière (zone cliquable dark) */}
        <path {...z('rear_window')}
          d="M 68,346 C 80,340 114,336 140,336 C 166,336 200,340 212,346
             L 212,384 C 200,390 170,394 140,394 C 110,394 80,390 68,384 Z">
          <title>Lunette AR</title>
        </path>

        {/* Coffre */}
        <rect {...z('trunk')} x="40" y="384" width="200" height="56" />

        {/* Pare-chocs arrière */}
        <rect {...z('bumper_rear')} x="40" y="440" width="200" height="20" />

      </g>

      {/* ── Décorations non-interactives (par-dessus les zones) ── */}

      {/* Ligne de séparation portière AV / AR (gauche) */}
      <line x1="52" y1="256" x2="108" y2="256"
        stroke="#888" strokeWidth="1.5" strokeDasharray="2,1" pointerEvents="none" clipPath="url(#carClip)" />
      {/* Ligne de séparation portière AV / AR (droite) */}
      <line x1="172" y1="256" x2="228" y2="256"
        stroke="#888" strokeWidth="1.5" strokeDasharray="2,1" pointerEvents="none" clipPath="url(#carClip)" />

      {/* Montants B (entre habitacle et portes) */}
      <line x1="108" y1="172" x2="108" y2="320"
        stroke="#909090" strokeWidth="2" pointerEvents="none" />
      <line x1="172" y1="172" x2="172" y2="320"
        stroke="#909090" strokeWidth="2" pointerEvents="none" />

      {/* Reflet vitre avant */}
      <path clipPath="url(#carClip)" pointerEvents="none"
        d="M 76,122 C 90,116 120,113 148,113 L 150,155 C 118,155 88,158 76,163 Z"
        fill="url(#glare)" />

      {/* Reflet vitre arrière (inversé) */}
      <path clipPath="url(#carClip)" pointerEvents="none"
        d="M 130,337 C 142,336 170,338 204,344 L 202,385 C 170,390 142,390 130,386 Z"
        fill="url(#glare)" />

      {/* Contour du toit (zone cabin) */}
      <rect x="108" y="172" width="64" height="148"
        fill="none" stroke="#9aa0ae" strokeWidth="1" pointerEvents="none" />

      {/* Contour extérieur final (par-dessus tout pour l'épaisseur) */}
      <path d={bodyPath} fill="none" stroke="#909090" strokeWidth="1.5" pointerEvents="none" />

      {/* ── Rétroviseurs (visuels, aussi cliquables → dans door_fl/fr) ── */}
      {/* Rétro gauche */}
      <path
        fill={selectedPart === 'door_fl' ? '#fbbf24' : hoveredPart === 'door_fl' ? '#93c5fd' : '#c8c8c8'}
        stroke="#909090" strokeWidth="1"
        d="M 58,122 L 34,136 L 36,146 L 58,150 Z"
        style={{ cursor: 'pointer', transition: 'fill 0.12s' }}
        onClick={() => onSelect(selectedPart === 'door_fl' ? null : 'door_fl')}
        onMouseEnter={() => onHover('door_fl')}
        onMouseLeave={() => onHover(null)}
      >
        <title>Rétroviseur / Portière AV G</title>
      </path>
      {/* Rétro droit */}
      <path
        fill={selectedPart === 'door_fr' ? '#fbbf24' : hoveredPart === 'door_fr' ? '#93c5fd' : '#c8c8c8'}
        stroke="#909090" strokeWidth="1"
        d="M 222,122 L 246,136 L 244,146 L 222,150 Z"
        style={{ cursor: 'pointer', transition: 'fill 0.12s' }}
        onClick={() => onSelect(selectedPart === 'door_fr' ? null : 'door_fr')}
        onMouseEnter={() => onHover('door_fr')}
        onMouseLeave={() => onHover(null)}
      >
        <title>Rétroviseur / Portière AV D</title>
      </path>

      {/* ── Roues (hors carrosserie, cliquables) ── */}
      {/* AV G */}
      <ellipse {...z('wheel_fl')} cx="38" cy="160" rx="14" ry="28"><title>Roue AV G</title></ellipse>
      {/* AV D */}
      <ellipse {...z('wheel_fr')} cx="242" cy="160" rx="14" ry="28"><title>Roue AV D</title></ellipse>
      {/* AR G */}
      <ellipse {...z('wheel_rl')} cx="38" cy="330" rx="14" ry="28"><title>Roue AR G</title></ellipse>
      {/* AR D */}
      <ellipse {...z('wheel_rr')} cx="242" cy="330" rx="14" ry="28"><title>Roue AR D</title></ellipse>

      {/* Jantes (cercles blancs au centre des roues) */}
      {[
        { cx:38,  cy:160 }, { cx:242, cy:160 },
        { cx:38,  cy:330 }, { cx:242, cy:330 },
      ].map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={p.cy} rx={7} ry={14}
          fill="#d0d0d0" stroke="#a0a0a0" strokeWidth="1" pointerEvents="none" />
      ))}

      {/* ── Points d'alerte (zones avec interventions) ── */}
      {issuePartIds.map(id => {
        const p = DOT_POS[id];
        return p ? (
          <g key={id} pointerEvents="none">
            <circle cx={p.x} cy={p.y} r={7} fill="#ef4444" opacity="0.25" />
            <circle cx={p.x} cy={p.y} r={5} fill="#ef4444" stroke="white" strokeWidth={1.5} />
          </g>
        ) : null;
      })}

      {/* ── Feux avant (petites pastilles rouges/oranges) ── */}
      <ellipse cx="92"  cy="28" rx="10" ry="5" fill="#ff6030" opacity="0.85" pointerEvents="none" />
      <ellipse cx="188" cy="28" rx="10" ry="5" fill="#ff6030" opacity="0.85" pointerEvents="none" />
      {/* Feux arrière */}
      <ellipse cx="94"  cy="448" rx="12" ry="5" fill="#e02020" opacity="0.9" pointerEvents="none" />
      <ellipse cx="186" cy="448" rx="12" ry="5" fill="#e02020" opacity="0.9" pointerEvents="none" />

      {/* ── Orientations ── */}
      <text x="140" y="10"  textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="700" pointerEvents="none">▲ AVANT</text>
      <text x="140" y="487" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="700" pointerEvents="none">▼ ARRIÈRE</text>
      <text x="6"   y="250" textAnchor="middle" fontSize="7" fill="#94a3b8" transform="rotate(-90,6,250)"   pointerEvents="none">GAUCHE</text>
      <text x="274" y="250" textAnchor="middle" fontSize="7" fill="#94a3b8" transform="rotate(90,274,250)" pointerEvents="none">DROITE</text>
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
