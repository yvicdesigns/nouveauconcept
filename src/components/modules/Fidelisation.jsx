import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { differenceInDays, subMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Crown, Star, Shield, Award, Users, TrendingUp, ChevronRight, Loader2, Phone, CalendarDays, Wallet, X } from 'lucide-react';

// ─── Tiers (du plus élevé au plus bas) ───────────────────────────────────────
const TIERS = [
  {
    id: 'elite',
    label: 'Élite',
    num: '04',
    rank: 4,
    days: 60,
    amount: 10_000_000,
    headerBg: 'bg-[#1a2744]',
    cardBg: 'bg-[#1a2744]',
    badge: 'bg-[#1a2744] text-white',
    ring: 'ring-[#1a2744]',
    bar: 'bg-[#1a2744]',
    border: 'border-[#1a2744]',
    text: 'text-[#1a2744]',
    light: 'bg-slate-50',
    icon: Crown,
    joursOfferts: 2,
    avantages: [
      '12 % de réduction permanente',
      '2 jours gratuits offerts par période',
      'Expérience VIP SPI Group',
    ],
  },
  {
    id: 'privilege',
    label: 'Privilège',
    num: '03',
    rank: 3,
    days: 45,
    amount: 5_000_000,
    headerBg: 'bg-red-700',
    cardBg: 'bg-red-700',
    badge: 'bg-red-700 text-white',
    ring: 'ring-red-600',
    bar: 'bg-red-600',
    border: 'border-red-600',
    text: 'text-red-700',
    light: 'bg-red-50',
    icon: Star,
    joursOfferts: null,
    freeDaysPer: 10,
    avantages: [
      '10 % de réduction permanente',
      'Surclassement trimestriel garanti (2×)',
      '1 jour gratuit / 10 jours + avantages Atelier 5',
    ],
  },
  {
    id: 'confort',
    label: 'Confort',
    num: '02',
    rank: 2,
    days: 30,
    amount: 3_000_000,
    headerBg: 'bg-slate-600',
    cardBg: 'bg-slate-600',
    badge: 'bg-slate-600 text-white',
    ring: 'ring-slate-500',
    bar: 'bg-slate-500',
    border: 'border-slate-500',
    text: 'text-slate-600',
    light: 'bg-slate-50',
    icon: Shield,
    joursOfferts: null,
    avantages: [
      '7 % de réduction permanente',
      'Surclassement trimestriel garanti (1×)',
      'Support client prioritaire + goodies & cadeaux',
    ],
  },
  {
    id: 'essentiel',
    label: 'Essentiel',
    num: '01',
    rank: 1,
    days: 10,
    amount: 1_000_000,
    headerBg: 'bg-[#7c6839]',
    cardBg: 'bg-[#7c6839]',
    badge: 'bg-[#7c6839] text-white',
    ring: 'ring-[#7c6839]',
    bar: 'bg-[#7c6839]',
    border: 'border-[#7c6839]',
    text: 'text-[#7c6839]',
    light: 'bg-amber-50',
    icon: Award,
    joursOfferts: null,
    avantages: [
      '5 % de réduction sur toutes les locations',
      'Accès au programme Mobility Club',
      'Offres promotionnelles SMS prioritaires',
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Un seul critère suffit (jours OU montant)
const getTier = (days, amount) => {
  for (const tier of TIERS) {
    if (days >= tier.days || amount >= tier.amount) return tier;
  }
  return null;
};

const getNextTier = (currentRank, days, amount) => {
  const candidates = [...TIERS].reverse().filter(t => t.rank > currentRank);
  const next = candidates[0];
  if (!next) return null;
  return {
    tier: next,
    daysNeeded: Math.max(0, next.days - days),
    amountNeeded: Math.max(0, next.amount - amount),
  };
};

// Calcule les jours gratuits automatiquement dus
const getJoursOfferts = (tier, days) => {
  if (!tier) return 0;
  if (tier.id === 'elite') return tier.joursOfferts || 2;
  if (tier.id === 'privilege' && tier.freeDaysPer) {
    return Math.floor(days / tier.freeDaysPer);
  }
  return 0;
};

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
const pct = (val, max) => Math.min(100, Math.round((val / max) * 100));

// ─── TierBadge ───────────────────────────────────────────────────────────────
const TierBadge = ({ tier, size = 'sm' }) => {
  if (!tier) return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500`}>
      Aucun
    </span>
  );
  const Icon = tier.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${tier.badge}`}>
      <Icon className="h-3 w-3" />
      {tier.label}
    </span>
  );
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ value, max, color }) => {
  const p = pct(value, max);
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Fidelisation = () => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('tous');
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const twelveMonthsAgo = subMonths(new Date(), 12).toISOString();

      const { data, error } = await supabase
        .from('reservations')
        .select('contact_id, start_date, end_date, total_price, contacts(id, name, phone)')
        .eq('status', 'Terminée')
        .gte('start_date', twelveMonthsAgo)
        .not('contact_id', 'is', null);

      if (error) throw error;

      const map = {};
      for (const res of data || []) {
        const id = res.contact_id;
        if (!map[id]) {
          map[id] = {
            id,
            name: res.contacts?.name || 'Inconnu',
            phone: res.contacts?.phone || '',
            days: 0,
            amount: 0,
            count: 0,
            lastDate: null,
          };
        }
        const d = differenceInDays(new Date(res.end_date), new Date(res.start_date)) || 1;
        map[id].days += d;
        map[id].amount += Number(res.total_price) || 0;
        map[id].count += 1;
        const rd = new Date(res.end_date);
        if (!map[id].lastDate || rd > map[id].lastDate) map[id].lastDate = rd;
      }

      const result = Object.values(map).map(c => ({
        ...c,
        tier: getTier(c.days, c.amount),
      }));

      result.sort((a, b) => (b.tier?.rank || 0) - (a.tier?.rank || 0) || b.amount - a.amount);
      setClients(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const counts = useMemo(() => {
    const c = { elite: 0, privilege: 0, confort: 0, essentiel: 0, aucun: 0 };
    clients.forEach(cl => { c[cl.tier?.id || 'aucun']++; });
    return c;
  }, [clients]);

  const filtered = useMemo(() => {
    return clients.filter(cl => {
      const matchSearch = cl.name.toLowerCase().includes(search.toLowerCase()) ||
        cl.phone.includes(search);
      const matchTier = tierFilter === 'tous' || (cl.tier?.id || 'aucun') === tierFilter;
      return matchSearch && matchTier;
    });
  }, [clients, search, tierFilter]);

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-8 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Programme de Fidélisation</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            4 niveaux · Statut valable 12 mois · Basé sur le cumul des 12 derniers mois
          </p>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <CalendarDays className="h-3.5 w-3.5" />
          Période : {format(subMonths(new Date(), 12), 'MMM yyyy', { locale: fr })} → {format(new Date(), 'MMM yyyy', { locale: fr })}
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map(tier => {
          const Icon = tier.icon;
          const count = counts[tier.id] || 0;
          return (
            <button
              key={tier.id}
              onClick={() => setTierFilter(t => t === tier.id ? 'tous' : tier.id)}
              className={`rounded-xl overflow-hidden shadow-sm border-2 text-left transition-all ${
                tierFilter === tier.id ? `${tier.border} shadow-md scale-[1.02]` : 'border-transparent'
              }`}
            >
              <div className={`${tier.cardBg} px-4 py-3 flex items-center justify-between`}>
                <span className="text-white font-bold text-xs tracking-widest opacity-70">{tier.num}</span>
                <Icon className="h-4 w-4 text-white opacity-80" />
              </div>
              <div className={`${tier.light} px-4 py-3`}>
                <p className={`font-bold text-lg ${tier.text}`}>{tier.label}</p>
                <p className="text-2xl font-black text-slate-900">{count}</p>
                <p className="text-xs text-slate-500">client{count > 1 ? 's' : ''}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Seuils référence */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Seuils de qualification (les deux critères requis)</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
          {TIERS.slice().reverse().map(tier => {
            const Icon = tier.icon;
            return (
              <div key={tier.id} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`p-1 rounded ${tier.badge}`}><Icon className="h-3 w-3" /></span>
                  <span className={`text-xs font-bold ${tier.text}`}>{tier.label}</span>
                </div>
                <p className="text-sm font-semibold text-slate-700">≥ {tier.days} jours</p>
                <p className="text-sm font-semibold text-slate-700">≥ {fmt(tier.amount)} FCFA</p>
                <div className="mt-2 space-y-1">
                  {tier.avantages.map((a, i) => (
                    <p key={i} className="text-xs text-slate-500 flex items-start gap-1">
                      <ChevronRight className={`h-3 w-3 mt-0.5 shrink-0 ${tier.text}`} />
                      {a}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search + Filter */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {[{ id: 'tous', label: 'Tous', badge: 'bg-slate-100 text-slate-700' }, ...TIERS].map(t => (
            <button
              key={t.id}
              onClick={() => setTierFilter(t.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                tierFilter === t.id
                  ? (t.badge || 'bg-slate-800 text-white')
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client list */}
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun client trouvé</p>
          {search && <button onClick={() => setSearch('')} className="text-sm text-blue-500 hover:underline mt-1">Effacer la recherche</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(client => {
            const tier = client.tier;
            const nextInfo = getNextTier(tier?.rank || 0, client.days, client.amount);
            const barColor = tier?.bar || 'bg-slate-300';
            const joursOfferts = getJoursOfferts(tier, client.days);

            // Progress toward current or next tier
            const targetTier = nextInfo?.tier || tier;
            const daysPct = targetTier ? pct(client.days, targetTier.days) : 100;
            const amtPct  = targetTier ? pct(client.amount, targetTier.amount) : 100;

            return (
              <div
                key={client.id}
                onClick={() => setSelectedClient(selectedClient?.id === client.id ? null : client)}
                className={`bg-white rounded-xl border shadow-sm cursor-pointer transition-all hover:shadow-md ${
                  tier ? `border-l-4 ${tier.border}` : 'border-slate-200'
                } ${selectedClient?.id === client.id ? 'ring-2 ring-blue-400' : ''}`}
              >
                <div className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${tier?.cardBg || 'bg-slate-300'}`}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 truncate">{client.name}</p>
                      <TierBadge tier={tier} />
                      {joursOfferts > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-300">
                          🎁 {joursOfferts} jour{joursOfferts > 1 ? 's' : ''} gratuit{joursOfferts > 1 ? 's' : ''} à offrir
                        </span>
                      )}
                    </div>
                    {client.phone && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />{client.phone}
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 flex items-center gap-1 justify-end"><CalendarDays className="h-3 w-3" /> Jours</p>
                      <p className="font-bold text-slate-900">{client.days}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 flex items-center gap-1 justify-end"><Wallet className="h-3 w-3" /> Cumul</p>
                      <p className="font-bold text-slate-900">{fmt(client.amount)} F</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Locations</p>
                      <p className="font-bold text-slate-900">{client.count}</p>
                    </div>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-20 shrink-0">Jours {client.days}/{targetTier?.days || client.days}</span>
                    <div className="flex-1"><ProgressBar value={client.days} max={targetTier?.days || client.days} color={barColor} /></div>
                    <span className="text-xs font-semibold text-slate-500 w-8 text-right">{daysPct}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-20 shrink-0 truncate">{fmt(client.amount)}/{targetTier ? fmt(targetTier.amount) : fmt(client.amount)} F</span>
                    <div className="flex-1"><ProgressBar value={client.amount} max={targetTier?.amount || client.amount} color={barColor} /></div>
                    <span className="text-xs font-semibold text-slate-500 w-8 text-right">{amtPct}%</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {selectedClient?.id === client.id && (
                  <div className="border-t border-slate-100 px-4 py-4 grid sm:grid-cols-2 gap-4">
                    {/* Avantages actuels */}
                    {tier && (
                      <div className={`rounded-xl p-4 ${tier.light}`}>
                        <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${tier.text}`}>
                          Avantages actuels — {tier.label}
                        </p>
                        <ul className="space-y-1.5">
                          {tier.avantages.map((a, i) => (
                            <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                              <ChevronRight className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${tier.text}`} />
                              {a}
                            </li>
                          ))}
                        </ul>
                        {joursOfferts > 0 && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-bold text-green-700">
                              🎁 {joursOfferts} jour{joursOfferts > 1 ? 's' : ''} gratuit{joursOfferts > 1 ? 's' : ''} à offrir à ce client
                            </p>
                            <p className="text-xs text-green-600 mt-0.5">
                              {tier.id === 'privilege'
                                ? `1 jour offert tous les 10 jours loués (${client.days} jours cumulés)`
                                : 'Avantage Élite — 2 jours par période'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prochain palier */}
                    {nextInfo ? (
                      <div className={`rounded-xl p-4 ${nextInfo.tier.light}`}>
                        <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${nextInfo.tier.text}`}>
                          Prochain palier — {nextInfo.tier.label}
                        </p>
                        <p className="text-sm text-slate-700 mb-1">Il manque :</p>
                        <ul className="space-y-1">
                          {nextInfo.daysNeeded > 0 && (
                            <li className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                              {nextInfo.daysNeeded} jour{nextInfo.daysNeeded > 1 ? 's' : ''}
                            </li>
                          )}
                          {nextInfo.amountNeeded > 0 && (
                            <li className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                              <Wallet className="h-3.5 w-3.5 text-slate-400" />
                              {fmt(nextInfo.amountNeeded)} FCFA
                            </li>
                          )}
                          {nextInfo.daysNeeded === 0 && nextInfo.amountNeeded === 0 && (
                            <li className="text-sm text-green-600 font-semibold">✓ Éligible — mettre à jour manuellement</li>
                          )}
                        </ul>
                        {client.lastDate && (
                          <p className="text-xs text-slate-400 mt-3">
                            Dernière location : {format(client.lastDate, 'd MMM yyyy', { locale: fr })}
                          </p>
                        )}
                      </div>
                    ) : tier ? (
                      <div className="rounded-xl p-4 bg-yellow-50">
                        <p className="text-xs font-bold uppercase tracking-wide mb-2 text-yellow-700">
                          Statut maximum atteint
                        </p>
                        <p className="text-sm text-slate-700">Ce client est au niveau <strong>Élite</strong> — le palier le plus élevé du programme.</p>
                        <div className="mt-2 flex items-center gap-2 text-yellow-700">
                          <Crown className="h-4 w-4" />
                          <span className="text-xs font-semibold">Expérience VIP SPI Group</span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl p-4 bg-slate-50">
                        <p className="text-xs font-bold uppercase tracking-wide mb-2 text-slate-500">
                          Prochain palier — Essentiel
                        </p>
                        <p className="text-sm text-slate-600">Pour atteindre le niveau Essentiel :</p>
                        <ul className="space-y-1 mt-1">
                          {nextInfo === null && (() => {
                            const essentiel = TIERS.find(t => t.id === 'essentiel');
                            return <>
                              <li className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                                {Math.max(0, essentiel.days - client.days)} jour(s) restants
                              </li>
                              <li className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <Wallet className="h-3.5 w-3.5 text-slate-400" />
                                {fmt(Math.max(0, essentiel.amount - client.amount))} FCFA restants
                              </li>
                            </>;
                          })()}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4 border-t border-slate-200">
        <p className="text-xs text-slate-400">
          Suivi CRM · Cumul jours + FCFA · Palier actuel · Cross-selling Atelier 5 & SPI Group · Statut valable 12 mois renouvelables
        </p>
      </div>
    </div>
  );
};

export default Fidelisation;
