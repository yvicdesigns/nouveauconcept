export const DOT_POS = {
  bumper_front: {x:150,y:62},  hood:{x:150,y:125},  windshield:{x:150,y:210},
  door_fl:{x:58,y:265},        cabin:{x:150,y:310},  door_fr:{x:242,y:265},
  door_rl:{x:58,y:355},        door_rr:{x:242,y:355},rear_window:{x:150,y:435},
  trunk:{x:150,y:505},         bumper_rear:{x:150,y:550},
  wheel_fl:{x:38,y:155},       wheel_fr:{x:262,y:155},
  wheel_rl:{x:42,y:455},       wheel_rr:{x:258,y:455},
};

export const ZONE_LABELS = {
  bumper_front: 'Pare-chocs AV', hood: 'Capot',           windshield:  'Pare-brise',
  door_fl:      'Portière AV G', cabin: 'Habitacle/Toit', door_fr:     'Portière AV D',
  door_rl:      'Portière AR G', door_rr: 'Portière AR D',rear_window: 'Lunette AR',
  trunk:        'Coffre',        bumper_rear: 'Pare-chocs AR',
  wheel_fl:     'Roue AV G',     wheel_fr: 'Roue AV D',   wheel_rl:   'Roue AR G', wheel_rr: 'Roue AR D',
};

const TD_BODY = 'M 150,40 C 240,40 270,100 270,180 L 260,450 C 260,540 220,570 150,570 C 80,570 40,540 40,450 L 30,180 C 30,100 60,40 150,40 Z';

const CarDiagram2D = ({ selectedPart, hoveredPart, onSelect, onHover, issuePartIds = [], width = 220 }) => {
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

  return (
    <svg viewBox="0 0 300 600" width={width} style={{ display: 'block', userSelect: 'none', margin: '0 auto' }}>
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

      {/* Carrosserie */}
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

      {/* Zones cliquables */}
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
        const p = DOT_POS[id];
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

export default CarDiagram2D;
