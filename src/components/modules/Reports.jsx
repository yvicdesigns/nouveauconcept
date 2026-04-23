import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Calendar, Users, Car, Loader2, RefreshCw, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format, subMonths, startOfMonth, endOfMonth, subQuarters, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';

const PERIODS = [
  { label: 'Ce mois',       value: 'month' },
  { label: 'Mois dernier',  value: 'last_month' },
  { label: 'Ce trimestre',  value: 'quarter' },
  { label: 'Cette année',   value: 'year' },
  { label: 'Tout',          value: 'all' },
];

const getPeriodRange = (period) => {
  const now = new Date();
  switch (period) {
    case 'month':      return { start: startOfMonth(now),            end: endOfMonth(now) };
    case 'last_month': return { start: startOfMonth(subMonths(now,1)), end: endOfMonth(subMonths(now,1)) };
    case 'quarter':    return { start: startOfQuarter(now),           end: endOfQuarter(now) };
    case 'year':       return { start: startOfYear(now),              end: endOfYear(now) };
    default:           return null;
  }
};

const fmtFCFA = (v) => {
  if (!v) return '0 FCFA';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M FCFA`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k FCFA`;
  return `${v.toLocaleString('fr-FR')} FCFA`;
};

const BarRow = ({ label, value, max, color, count }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-32 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-2.5 rounded-full ${color}`} />
      </div>
      <span className="text-sm font-semibold text-slate-700 w-16 text-right flex-shrink-0">{count}</span>
    </div>
  );
};

const Reports = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState({
    invoices: [], reservations: [], vehicles: [],
    leads: [], opportunities: [],
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [inv, res, veh, lea, opp] = await Promise.all([
        supabase.from('invoices').select('id, total_amount, status, issue_date'),
        supabase.from('reservations').select('id, status, start_date, end_date, total_price'),
        supabase.from('vehicles').select('id, name, brand, model'),
        supabase.from('leads').select('id, status, source, created_at'),
        supabase.from('opportunities').select('id, stage, value, probability, created_at'),
      ]);
      setData({
        invoices:     inv.data     || [],
        reservations: res.data     || [],
        vehicles:     veh.data     || [],
        leads:        lea.data     || [],
        opportunities: opp.data   || [],
      });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les données.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Filtre période ────────────────────────────────────────────────────────
  const range = getPeriodRange(period);
  const inPeriod = (dateStr) => {
    if (!range || !dateStr) return true;
    const d = new Date(dateStr);
    return d >= range.start && d <= range.end;
  };
  const filteredInvoices      = data.invoices.filter(i => inPeriod(i.issue_date));
  const filteredReservations  = data.reservations.filter(r => inPeriod(r.start_date));
  const filteredLeads         = data.leads.filter(l => inPeriod(l.created_at));
  const filteredOpportunities = data.opportunities.filter(o => inPeriod(o.created_at));

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const revenuEncaisse  = filteredInvoices.filter(i => i.status === 'Payé').reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const revenuTotal     = filteredInvoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const tauxRecouvrement = revenuTotal > 0 ? Math.round((revenuEncaisse / revenuTotal) * 100) : 0;
  const convertis       = filteredLeads.filter(l => l.status === 'Converti').length;
  const totalLeads      = filteredLeads.filter(l => l.status !== 'Perdu').length;
  const tauxConversion  = totalLeads > 0 ? Math.round((convertis / totalLeads) * 100) : 0;
  const pipelineValue   = filteredOpportunities.filter(o => o.stage !== 'Perdu').reduce((s, o) => s + (Number(o.value) || 0), 0);

  // ── Réservations (filtrées) ───────────────────────────────────────────────
  const resStatuts = ['En attente', 'Confirmée', 'En cours', 'Terminée', 'Annulée'];
  const resColors  = ['bg-yellow-400', 'bg-green-400', 'bg-blue-400', 'bg-slate-400', 'bg-red-400'];
  const resCounts  = resStatuts.map(s => ({ label: s, count: filteredReservations.filter(r => r.status === s).length }));
  const maxRes     = Math.max(...resCounts.map(r => r.count), 1);

  const leadStatuts = ['Nouveau', 'Contacté', 'Qualifié', 'Converti', 'Perdu'];
  const leadColors  = ['bg-blue-400', 'bg-yellow-400', 'bg-green-400', 'bg-purple-400', 'bg-red-400'];
  const leadCounts  = leadStatuts.map(s => ({ label: s, count: filteredLeads.filter(l => l.status === s).length }));
  const maxLead     = Math.max(...leadCounts.map(l => l.count), 1);

  const oppStages = ['Prospection', 'Qualification', 'Proposition', 'Négociation', 'Conclu', 'Perdu'];
  const oppColors = ['bg-slate-400', 'bg-blue-400', 'bg-purple-400', 'bg-yellow-400', 'bg-green-400', 'bg-red-400'];
  const oppCounts = oppStages.map(s => ({ label: s, count: filteredOpportunities.filter(o => o.stage === s).length }));
  const maxOpp    = Math.max(...oppCounts.map(o => o.count), 1);

  // ── Revenus 6 derniers mois ───────────────────────────────────────────────
  const derniersMois = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const debut = startOfMonth(d);
    const fin   = endOfMonth(d);
    const total = data.invoices
      .filter(inv => {
        if (!inv.issue_date) return false;
        const date = new Date(inv.issue_date);
        return date >= debut && date <= fin && inv.status === 'Payé';
      })
      .reduce((s, inv) => s + (Number(inv.total_amount) || 0), 0);
    return { mois: format(d, 'MMM', { locale: fr }), total };
  });
  const maxRevenu = Math.max(...derniersMois.map(m => m.total), 1);


  const kpis = [
    { label: 'Revenus encaissés',   value: fmtFCFA(revenuEncaisse),       sub: `${tauxRecouvrement}% recouvré`,       icon: TrendingUp, color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'Réservations',        value: data.reservations.length,       sub: `${data.reservations.filter(r => r.status === 'En cours').length} en cours`, icon: Calendar,   color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Pipeline commercial', value: fmtFCFA(pipelineValue),         sub: `${data.opportunities.filter(o => !['Conclu','Perdu'].includes(o.stage)).length} opportunités actives`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Taux conversion leads', value: `${tauxConversion}%`,         sub: `${convertis} / ${totalLeads} prospects`, icon: Users,    color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rapports & Analytiques</h1>
          <p className="text-slate-600 mt-1">Vue d'ensemble des performances du CRM</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  period === p.value ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <Button onClick={fetchAll} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${k.bg}`}><k.icon className={`h-5 w-5 ${k.color}`} /></div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">{k.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 leading-tight">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenus 6 mois */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" /> Revenus encaissés — 6 derniers mois
        </h2>
        {derniersMois.every(m => m.total === 0) ? (
          <p className="text-slate-400 text-sm text-center py-8">Aucune facture payée sur cette période.</p>
        ) : (
          <div className="flex items-end gap-3 h-40">
            {derniersMois.map((m, i) => {
              const pct = Math.round((m.total / maxRevenu) * 100);
              return (
                <div key={m.mois} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">{m.total > 0 ? fmtFCFA(m.total) : ''}</span>
                  <div className="w-full flex items-end" style={{ height: '80px' }}>
                    <motion.div initial={{ height: 0 }} animate={{ height: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                      className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-md min-h-[4px]" />
                  </div>
                  <span className="text-xs text-slate-500 capitalize">{m.mois}</span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Grille 3 sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Réservations par statut */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" /> Réservations
          </h2>
          <div className="space-y-3">
            {resCounts.map((r, i) => (
              <BarRow key={r.label} label={r.label} value={r.count} max={maxRes} color={resColors[i]} count={r.count} />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
            Total : <span className="font-semibold text-slate-800">{data.reservations.length}</span>
          </div>
        </motion.div>

        {/* Pipeline Leads */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" /> Prospects (Leads)
          </h2>
          <div className="space-y-3">
            {leadCounts.map((l, i) => (
              <BarRow key={l.label} label={l.label} value={l.count} max={maxLead} color={leadColors[i]} count={l.count} />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
            Total : <span className="font-semibold text-slate-800">{data.leads.length}</span>
            <span className="ml-3">Conversion : <span className="font-semibold text-indigo-600">{tauxConversion}%</span></span>
          </div>
        </motion.div>

        {/* Pipeline Opportunités */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-500" /> Opportunités
          </h2>
          <div className="space-y-3">
            {oppCounts.map((o, i) => (
              <BarRow key={o.label} label={o.label} value={o.count} max={maxOpp} color={oppColors[i]} count={o.count} />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
            Pipeline : <span className="font-semibold text-purple-600">{fmtFCFA(pipelineValue)}</span>
          </div>
        </motion.div>
      </div>

      {/* Factures par statut */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-green-500" /> Facturation
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Payé', 'Envoyé', 'En retard', 'Brouillon'].map((s) => {
            const inv = filteredInvoices.filter(i => i.status === s);
            const total = inv.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
            const colors = { 'Payé': 'text-green-600 bg-green-50', 'Envoyé': 'text-blue-600 bg-blue-50', 'En retard': 'text-red-600 bg-red-50', 'Brouillon': 'text-slate-600 bg-slate-50' };
            return (
              <div key={s} className={`rounded-xl p-4 ${colors[s].split(' ')[1]}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${colors[s].split(' ')[0]}`}>{s}</p>
                <p className="text-2xl font-bold text-slate-900">{inv.length}</p>
                <p className="text-xs text-slate-500 mt-1">{fmtFCFA(total)}</p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default Reports;
