import React, { useState } from 'react';
import { X, Wrench, CheckCircle, AlertTriangle } from 'lucide-react';

// Chaque zone : id, label, couleur selon statut, path SVG
const ZONES = [
  { id: 'bumper_front',    label: 'Pare-chocs avant',   x: 75,  y: 18,  w: 110, h: 22,  rx: 8  },
  { id: 'hood',            label: 'Capot',               x: 82,  y: 44,  w: 96,  h: 72,  rx: 6  },
  { id: 'windshield_front',label: 'Pare-brise avant',   x: 88,  y: 120, w: 84,  h: 32,  rx: 5  },
  { id: 'door_fl',         label: 'Portière avant gauche', x: 62, y: 158, w: 30, h: 58,  rx: 4  },
  { id: 'door_fr',         label: 'Portière avant droite', x: 168, y: 158, w: 30, h: 58, rx: 4  },
  { id: 'door_rl',         label: 'Portière arrière gauche', x: 62, y: 220, w: 30, h: 52, rx: 4 },
  { id: 'door_rr',         label: 'Portière arrière droite', x: 168, y: 220, w: 30, h: 52, rx: 4 },
  { id: 'windshield_rear', label: 'Lunette arrière',    x: 88,  y: 276, w: 84,  h: 28,  rx: 5  },
  { id: 'trunk',           label: 'Coffre',              x: 82,  y: 308, w: 96,  h: 58,  rx: 6  },
  { id: 'bumper_rear',     label: 'Pare-chocs arrière', x: 75,  y: 370, w: 110, h: 22,  rx: 8  },
  { id: 'wheel_fl',        label: 'Roue avant gauche',  x: 34,  y: 148, w: 26,  h: 44,  rx: 6  },
  { id: 'wheel_fr',        label: 'Roue avant droite',  x: 200, y: 148, w: 26,  h: 44,  rx: 6  },
  { id: 'wheel_rl',        label: 'Roue arrière gauche',x: 34,  y: 220, w: 26,  h: 44,  rx: 6  },
  { id: 'wheel_rr',        label: 'Roue arrière droite',x: 200, y: 220, w: 26,  h: 44,  rx: 6  },
];

// Données de démonstration — seront remplacées par vraies données Supabase
const DEMO_DATA = {
  wheel_fl:   { status: 'critical',  items: [{ date: '2026-05-10', desc: 'Pneu usé — à remplacer d\'urgence', cost: 45000 }] },
  door_fl:    { status: 'warning',   items: [{ date: '2026-04-22', desc: 'Rayure profonde côté gauche', cost: 12000 }] },
  hood:       { status: 'ok',        items: [{ date: '2026-06-01', desc: 'Vidange moteur effectuée', cost: 25000 }] },
  windshield_front: { status: 'critical', items: [{ date: '2026-06-10', desc: 'Fissure pare-brise — visibilité réduite', cost: 80000 }] },
};

const statusStyle = {
  ok:       { fill: '#dcfce7', stroke: '#16a34a', dot: 'bg-green-500',  text: 'text-green-700',  label: 'OK'       },
  warning:  { fill: '#fef9c3', stroke: '#ca8a04', dot: 'bg-yellow-500', text: 'text-yellow-700', label: 'Attention' },
  critical: { fill: '#fee2e2', stroke: '#dc2626', dot: 'bg-red-500',    text: 'text-red-700',    label: 'Critique' },
  none:     { fill: '#f1f5f9', stroke: '#cbd5e1', dot: 'bg-slate-300',  text: 'text-slate-500',  label: 'RAS'      },
};

const CarDiagram2D = ({ maintenanceData = DEMO_DATA }) => {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered]   = useState(null);

  const getStatus = (id) => {
    if (!maintenanceData[id]) return 'none';
    return maintenanceData[id].status;
  };

  const selectedZone = ZONES.find(z => z.id === selected);
  const selectedData = selected ? maintenanceData[selected] : null;
  const cfg = selected ? statusStyle[getStatus(selected)] : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">

      {/* SVG voiture */}
      <div className="flex-shrink-0">
        <p className="text-xs text-slate-400 text-center mb-2 uppercase tracking-widest">Vue de dessus — cliquez sur une zone</p>
        <svg
          viewBox="0 0 260 410"
          width="220"
          className="mx-auto drop-shadow-md"
        >
          {/* Carrosserie de base */}
          <rect x="70" y="38" width="120" height="334" rx="30" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Toit (centre) */}
          <rect x="88" y="158" width="84" height="114" rx="4" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
          {/* Ligne centrale */}
          <line x1="130" y1="38" x2="130" y2="372" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.4" />

          {/* Zones cliquables */}
          {ZONES.map(zone => {
            const status = getStatus(zone.id);
            const s = statusStyle[status];
            const isHov = hovered === zone.id;
            const isSel = selected === zone.id;

            return (
              <g key={zone.id}>
                <rect
                  x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx={zone.rx}
                  fill={isSel ? s.stroke : isHov ? s.fill : s.fill}
                  stroke={isSel ? s.stroke : isHov ? s.stroke : s.stroke}
                  strokeWidth={isSel ? 2.5 : isHov ? 2 : 1.5}
                  opacity={isSel ? 1 : isHov ? 0.95 : 0.85}
                  style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={() => setHovered(zone.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(selected === zone.id ? null : zone.id)}
                />
                {/* Point de statut */}
                {status !== 'none' && (
                  <circle
                    cx={zone.x + zone.w / 2}
                    cy={zone.y + zone.h / 2}
                    r={5}
                    fill={s.stroke}
                    opacity={0.9}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
              </g>
            );
          })}

          {/* Labels roues */}
          {['fl','fr','rl','rr'].map(pos => {
            const z = ZONES.find(z => z.id === `wheel_${pos}`);
            return (
              <text key={pos} x={z.x + z.w/2} y={z.y + z.h/2 + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="7" fill="#64748b" style={{ pointerEvents: 'none' }}>
                {pos.toUpperCase()}
              </text>
            );
          })}
        </svg>

        {/* Légende */}
        <div className="flex justify-center gap-4 mt-3 flex-wrap">
          {Object.entries(statusStyle).map(([key, s]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panneau info */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            <Wrench className="h-10 w-10 mb-3 text-slate-300" />
            <p className="font-medium text-slate-500">Cliquez sur une zone</p>
            <p className="text-sm mt-1">Sélectionnez une partie du véhicule pour voir l'état et les interventions</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Header zone sélectionnée */}
            <div className={`px-5 py-4 flex items-center justify-between`}
              style={{ backgroundColor: statusStyle[getStatus(selected)].fill, borderBottom: `2px solid ${statusStyle[getStatus(selected)].stroke}` }}>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Zone sélectionnée</p>
                <h3 className="text-lg font-bold text-slate-900">{selectedZone?.label}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${cfg.text}`}
                  style={{ borderColor: statusStyle[getStatus(selected)].stroke, backgroundColor: 'white' }}>
                  {cfg.label}
                </span>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Contenu */}
            <div className="p-5">
              {!selectedData ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                  <CheckCircle className="h-6 w-6 text-green-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">Aucune intervention enregistrée</p>
                    <p className="text-sm text-green-600 mt-0.5">Cette partie du véhicule ne présente aucun problème signalé.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    {selectedData.items.length} intervention{selectedData.items.length > 1 ? 's' : ''} enregistrée{selectedData.items.length > 1 ? 's' : ''}
                  </p>
                  {selectedData.items.map((item, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${cfg.text}`} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{item.desc}</p>
                        <div className="flex gap-4 mt-2">
                          <span className="text-xs text-slate-400">📅 {item.date}</span>
                          {item.cost && (
                            <span className="text-xs font-semibold text-slate-600">💰 {item.cost.toLocaleString()} FCFA</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CarDiagram2D;
