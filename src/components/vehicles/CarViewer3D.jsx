import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Loader2, Wrench, CheckCircle, X, AlertTriangle, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Config des pièces ────────────────────────────────────────────────────────
const PARTS = {
  bumper_front: { label: 'Pare-chocs avant',         color: '#64748b' },
  hood:         { label: 'Capot',                    color: '#2563eb' },
  windshield:   { label: 'Pare-brise avant',         color: '#93c5fd' },
  cabin:        { label: 'Toit / Habitacle',         color: '#1d4ed8' },
  door_fl:      { label: 'Portière avant gauche',    color: '#1e40af' },
  door_fr:      { label: 'Portière avant droite',    color: '#1e40af' },
  door_rl:      { label: 'Portière arrière gauche',  color: '#1e40af' },
  door_rr:      { label: 'Portière arrière droite',  color: '#1e40af' },
  rear_window:  { label: 'Lunette arrière',          color: '#93c5fd' },
  trunk:        { label: 'Coffre',                   color: '#2563eb' },
  bumper_rear:  { label: 'Pare-chocs arrière',       color: '#64748b' },
  wheel_fl:     { label: 'Roue avant gauche',        color: '#0f172a' },
  wheel_fr:     { label: 'Roue avant droite',        color: '#0f172a' },
  wheel_rl:     { label: 'Roue arrière gauche',      color: '#0f172a' },
  wheel_rr:     { label: 'Roue arrière droite',      color: '#0f172a' },
};

// ─── Mesh cliquable générique ─────────────────────────────────────────────────
const Part = ({ partId, position, rotation = [0, 0, 0], args, geometry = 'box', selected, hovered, onSelect, onHover, hasIssue }) => {
  const base  = PARTS[partId]?.color || '#3b82f6';
  const isSel = selected === partId;
  const isHov = hovered === partId;

  let color = base;
  if (isSel)            color = '#f59e0b';
  else if (hasIssue)    color = '#ef4444';
  else if (isHov)       color = '#60a5fa';

  const emissive = isSel ? '#f59e0b' : isHov ? '#93c5fd' : '#000000';
  const emissiveIntensity = isSel ? 0.35 : isHov ? 0.15 : 0;

  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
      onClick={(e) => { e.stopPropagation(); onSelect(partId); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(partId); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = 'auto'; }}
    >
      {geometry === 'cylinder'
        ? <cylinderGeometry args={args} />
        : <boxGeometry args={args} />
      }
      <meshStandardMaterial
        color={color}
        roughness={partId.startsWith('wheel') ? 0.9 : 0.3}
        metalness={partId.startsWith('wheel') ? 0.1 : 0.5}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        transparent={partId.includes('windshield') || partId === 'rear_window'}
        opacity={partId.includes('windshield') || partId === 'rear_window' ? 0.75 : 1}
      />
    </mesh>
  );
};

// ─── Voiture 3D procédurale ───────────────────────────────────────────────────
const Car3D = ({ selected, hovered, onSelect, onHover, issueIds }) => {
  const hasIssue = (id) => issueIds.includes(id);

  return (
    <group rotation={[0, Math.PI / 5, 0]}>
      {/* Sol / shadow */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.31, 0]}>
        <circleGeometry args={[3.5, 64]} />
        <meshStandardMaterial color="#e2e8f0" roughness={1} />
      </mesh>

      {/* ── Carrosserie basse ── */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[1.82, 0.55, 4.2]} />
        <meshStandardMaterial color="#1e40af" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* ── Pare-chocs avant ── */}
      <Part partId="bumper_front" position={[0, 0.08, 2.18]} args={[1.85, 0.28, 0.18]} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} hasIssue={hasIssue('bumper_front')} />

      {/* ── Capot ── */}
      <Part partId="hood" position={[0, 0.47, 1.35]} args={[1.78, 0.07, 1.5]} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} hasIssue={hasIssue('hood')} />

      {/* ── Pare-brise avant (légèrement incliné) ── */}
      <Part partId="windshield" position={[0, 0.9, 0.72]} rotation={[Math.PI / 6, 0, 0]} args={[1.55, 0.7, 0.07]} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} hasIssue={hasIssue('windshield')} />

      {/* ── Toit ── */}
      <Part partId="cabin" position={[0, 1.28, -0.25]} args={[1.52, 0.08, 1.8]} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} hasIssue={hasIssue('cabin')} />

      {/* Piliers toit */}
      <mesh position={[0, 0.95, -0.25]} castShadow>
        <boxGeometry args={[1.54, 0.65, 1.8]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* ── Portières ── */}
      <Part partId="door_fl" position={[-0.92, 0.38, 0.72]} args={[0.07, 0.7, 1.25]} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} hasIssue={hasIssue('door_fl')} />
      <Part partId="door_fr" position={[0.92, 0.38, 0.72]}  args={[0.07, 0.7, 1.25]} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} hasIssue={hasIssue('door_fr')} />
      <Part partId="door_rl" position={[-0.92, 0.38, -0.65]} args={[0.07, 0.7, 1.1]} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} hasIssue={hasIssue('door_rl')} />
      <Part partId="door_rr" position={[0.92, 0.38, -0.65]}  args={[0.07, 0.7, 1.1]} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} hasIssue={hasIssue('door_rr')} />

      {/* ── Lunette arrière ── */}
      <Part partId="rear_window" position={[0, 0.88, -1.22]} rotation={[-Math.PI / 6, 0, 0]} args={[1.5, 0.55, 0.07]} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} hasIssue={hasIssue('rear_window')} />

      {/* ── Coffre ── */}
      <Part partId="trunk" position={[0, 0.47, -1.55]} args={[1.78, 0.07, 1.1]} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} hasIssue={hasIssue('trunk')} />

      {/* ── Pare-chocs arrière ── */}
      <Part partId="bumper_rear" position={[0, 0.08, -2.18]} args={[1.85, 0.28, 0.18]} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} hasIssue={hasIssue('bumper_rear')} />

      {/* ── Roues ── */}
      {[
        { id: 'wheel_fl', pos: [-1.02, -0.02, 1.35] },
        { id: 'wheel_fr', pos: [1.02,  -0.02, 1.35] },
        { id: 'wheel_rl', pos: [-1.02, -0.02, -1.35] },
        { id: 'wheel_rr', pos: [1.02,  -0.02, -1.35] },
      ].map(({ id, pos }) => (
        <group key={id} position={pos} rotation={[0, 0, Math.PI / 2]}>
          {/* Pneu */}
          <Part partId={id} position={[0,0,0]} rotation={[0,0,0]} geometry="cylinder" args={[0.33, 0.33, 0.22, 24]} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} hasIssue={hasIssue(id)} />
          {/* Jante */}
          <mesh>
            <cylinderGeometry args={[0.2, 0.2, 0.23, 16]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Phares avant */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.2, 2.13]}>
          <boxGeometry args={[0.35, 0.15, 0.05]} />
          <meshStandardMaterial color="#fef9c3" emissive="#fbbf24" emissiveIntensity={0.4} roughness={0.1} />
        </mesh>
      ))}
      {/* Feux arrière */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.2, -2.13]}>
          <boxGeometry args={[0.35, 0.15, 0.05]} />
          <meshStandardMaterial color="#fee2e2" emissive="#ef4444" emissiveIntensity={0.5} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────
const CarViewer3D = ({ vehicleId = null }) => {
  const [selected, setSelected]   = useState(null);
  const [hovered, setHovered]     = useState(null);
  const [records, setRecords]     = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const controlsRef = useRef();

  // Charge tous les enregistrements de maintenance pour ce véhicule
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

  const handleSelect = (partId) => {
    setSelected(prev => prev === partId ? null : partId);
  };

  // Pièces qui ont des interventions actives → colorées en rouge sur la 3D
  const issueIds = [...new Set(records.filter(r => r.part_name).map(r => r.part_name))];

  const partLabel = selected ? PARTS[selected]?.label : null;

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[540px]">

      {/* Canvas 3D */}
      <div className="relative flex-1 min-w-0 bg-gradient-to-b from-slate-100 to-slate-200 rounded-2xl overflow-hidden shadow-inner">
        <Canvas shadows dpr={[1, 2]} style={{ width: '100%', height: '100%' }}>
          <PerspectiveCamera makeDefault position={[4, 3, 6]} fov={45} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-5, 3, -3]} intensity={0.4} />

          <Suspense fallback={null}>
            <Car3D
              selected={selected}
              hovered={hovered}
              onSelect={handleSelect}
              onHover={setHovered}
              issueIds={issueIds}
            />
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            minDistance={3}
            maxDistance={12}
            maxPolarAngle={Math.PI / 2.1}
          />
        </Canvas>

        {/* Tooltip hovered */}
        {hovered && !selected && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full pointer-events-none backdrop-blur-sm">
            {PARTS[hovered]?.label} — cliquez pour voir les interventions
          </div>
        )}

        {/* Bouton reset caméra */}
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
            { color: 'bg-blue-600',  label: 'Normal' },
            { color: 'bg-red-500',   label: 'Intervention' },
            { color: 'bg-amber-400', label: 'Sélectionné' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium text-slate-700">
              <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
              {l.label}
            </div>
          ))}
        </div>

        <p className="absolute top-3 left-3 text-xs text-slate-400 bg-white/70 backdrop-blur-sm px-2 py-1 rounded-lg">
          🖱 Faites pivoter • 🔍 Molette pour zoomer
        </p>
      </div>

      {/* Panneau latéral */}
      <div className="w-full lg:w-72 flex flex-col gap-3">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-3">
              <Wrench className="h-7 w-7 text-blue-600" />
            </div>
            <p className="font-semibold text-slate-700">Sélectionnez une pièce</p>
            <p className="text-sm text-slate-400 mt-1">Cliquez sur n'importe quelle partie de la voiture pour voir les interventions</p>
            {records.length > 0 && (
              <div className="mt-4 w-full p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-bold text-amber-700">{records.length} intervention{records.length > 1 ? 's' : ''} enregistrée{records.length > 1 ? 's' : ''}</p>
                <p className="text-xs text-amber-600 mt-0.5">pour ce véhicule</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white flex items-start justify-between">
              <div>
                <p className="text-xs text-blue-200 uppercase tracking-widest mb-0.5">Pièce sélectionnée</p>
                <h3 className="font-bold text-lg leading-tight">{partLabel}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-blue-200 hover:text-white mt-0.5">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Records */}
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : (() => {
                const filtered = selected
                  ? records.filter(r => r.part_name === selected)
                  : records;
                return filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle className="h-10 w-10 text-green-400 mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">Aucune intervention active</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {selected ? 'Rien de signalé pour cette pièce' : 'Ce véhicule est en bon état'}
                    </p>
                  </div>
                ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    {filtered.length} intervention{filtered.length > 1 ? 's' : ''}{selected ? ' — cette pièce' : ' — total véhicule'}
                  </p>
                  {filtered.map((r, i) => (
                    <div key={i} className={`p-3 rounded-xl border text-sm ${
                      r.priority === 'urgent' || r.priority === 'high'
                        ? 'bg-red-50 border-red-200'
                        : r.status === 'completed'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {r.status === 'completed'
                          ? <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          : <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        }
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
                      {r.mechanic && (
                        <p className="text-xs text-slate-400 mt-1">👷 {r.mechanic}</p>
                      )}
                    </div>
                  ))}
                </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CarViewer3D;
