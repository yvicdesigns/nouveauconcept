import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, TrendingUp, Pencil, Trash2, Loader2, Briefcase, LayoutGrid, List, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SkeletonCards } from '@/components/ui/SkeletonTable';

const STAGE_OPTIONS = ['Prospection', 'Qualification', 'Proposition', 'Négociation', 'Conclu', 'Perdu'];

const STAGE_META = {
  'Prospection':  { color: 'bg-slate-100 text-slate-700',   col: 'bg-slate-50  border-slate-200',  dot: 'bg-slate-400',   header: 'bg-slate-100'   },
  'Qualification':{ color: 'bg-blue-100 text-blue-700',     col: 'bg-blue-50   border-blue-200',    dot: 'bg-blue-500',    header: 'bg-blue-100'    },
  'Proposition':  { color: 'bg-purple-100 text-purple-700', col: 'bg-purple-50 border-purple-200',  dot: 'bg-purple-500',  header: 'bg-purple-100'  },
  'Négociation':  { color: 'bg-yellow-100 text-yellow-700', col: 'bg-yellow-50 border-yellow-200',  dot: 'bg-yellow-500',  header: 'bg-yellow-100'  },
  'Conclu':       { color: 'bg-green-100 text-green-700',   col: 'bg-green-50  border-green-200',   dot: 'bg-green-500',   header: 'bg-green-100'   },
  'Perdu':        { color: 'bg-red-100 text-red-700',       col: 'bg-red-50    border-red-200',     dot: 'bg-red-400',     header: 'bg-red-100'     },
};

const fmtFCFA = (v) => {
  if (!v) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString('fr-FR');
};

const Opportunities = () => {
  const { toast } = useToast();
  const [opportunities, setOpportunities] = useState([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [searchTerm, setSearchTerm]       = useState('');
  const [view, setView]                   = useState('kanban'); // 'kanban' | 'list'
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [oppToEdit, setOppToEdit]         = useState(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [oppToDelete, setOppToDelete]     = useState(null);
  const [movingId, setMovingId]           = useState(null);

  const initialForm = { title: '', client_name: '', contact_name: '', value: '', probability: 50, stage: 'Prospection', expected_close_date: '', notes: '' };
  const [form, setForm] = useState(initialForm);

  useEffect(() => { fetchOpportunities(); }, []);

  const fetchOpportunities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('opportunities').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setOpportunities(data || []);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les opportunités.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = (defaultStage = 'Prospection') => {
    setOppToEdit(null);
    setForm({ ...initialForm, stage: defaultStage });
    setIsModalOpen(true);
  };

  const openEditModal = (opp) => {
    setOppToEdit(opp);
    setForm({ title: opp.title || '', client_name: opp.client_name || '', contact_name: opp.contact_name || '',
      value: opp.value || '', probability: opp.probability || 50, stage: opp.stage || 'Prospection',
      expected_close_date: opp.expected_close_date || '', notes: opp.notes || '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!form.title || !form.client_name) throw new Error('Le titre et le client sont obligatoires.');
      const payload = { ...form, value: form.value ? parseFloat(form.value) : null, probability: parseInt(form.probability), expected_close_date: form.expected_close_date || null };
      if (oppToEdit) {
        const { error } = await supabase.from('opportunities').update(payload).eq('id', oppToEdit.id);
        if (error) throw error;
        setOpportunities(prev => prev.map(o => o.id === oppToEdit.id ? { ...o, ...payload } : o));
        toast({ title: 'Opportunité modifiée', className: 'bg-green-50 border-green-200 text-green-900' });
      } else {
        const { data, error } = await supabase.from('opportunities').insert([payload]).select().single();
        if (error) throw error;
        setOpportunities(prev => [data, ...prev]);
        toast({ title: 'Opportunité créée', className: 'bg-green-50 border-green-200 text-green-900' });
      }
      setIsModalOpen(false);
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!oppToDelete) return;
    try {
      const { error } = await supabase.from('opportunities').delete().eq('id', oppToDelete.id);
      if (error) throw error;
      setOpportunities(prev => prev.filter(o => o.id !== oppToDelete.id));
      toast({ title: 'Opportunité supprimée', className: 'bg-green-50 border-green-200 text-green-900' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' });
    } finally {
      setIsDeleteDialogOpen(false);
      setOppToDelete(null);
    }
  };

  const moveStage = async (opp, direction) => {
    const idx = STAGE_OPTIONS.indexOf(opp.stage);
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= STAGE_OPTIONS.length) return;
    const newStage = STAGE_OPTIONS[nextIdx];
    setMovingId(opp.id);
    try {
      const { error } = await supabase.from('opportunities').update({ stage: newStage }).eq('id', opp.id);
      if (error) throw error;
      setOpportunities(prev => prev.map(o => o.id === opp.id ? { ...o, stage: newStage } : o));
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de déplacer.', variant: 'destructive' });
    } finally {
      setMovingId(null);
    }
  };

  const filtered = opportunities.filter(o =>
    !searchTerm ||
    o.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPipeline = opportunities.filter(o => o.stage !== 'Perdu').reduce((s, o) => s + (Number(o.value) || 0), 0);
  const weighted      = opportunities.filter(o => o.stage !== 'Perdu').reduce((s, o) => s + (Number(o.value) || 0) * (Number(o.probability) || 0) / 100, 0);
  const concluded     = opportunities.filter(o => o.stage === 'Conclu').length;
  const winRate       = opportunities.length > 0 ? Math.round((concluded / opportunities.length) * 100) : 0;

  // ── KanbanCard ────────────────────────────────────────────────────────────
  const KanbanCard = ({ opp }) => {
    const stageIdx = STAGE_OPTIONS.indexOf(opp.stage);
    return (
      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow group">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-semibold text-slate-900 text-sm leading-snug">{opp.title}</p>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => openEditModal(opp)} className="p-1 rounded hover:bg-blue-50 text-blue-500"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={() => { setOppToDelete(opp); setIsDeleteDialogOpen(true); }} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">{opp.client_name}</p>
        {opp.value && (
          <p className="text-base font-bold text-slate-900 mb-2">{fmtFCFA(Number(opp.value))} <span className="text-xs font-normal text-slate-400">FCFA</span></p>
        )}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${opp.probability || 0}%` }} />
          </div>
          <span className="text-xs text-slate-500">{opp.probability || 0}%</span>
        </div>
        {opp.expected_close_date && (
          <p className="text-xs text-slate-400 mb-3">
            Clôture : {format(new Date(opp.expected_close_date), 'dd MMM yyyy', { locale: fr })}
          </p>
        )}
        {/* Navigation entre étapes */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button disabled={stageIdx === 0 || movingId === opp.id}
            onClick={() => moveStage(opp, -1)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
            {STAGE_OPTIONS[stageIdx - 1] || ''}
          </button>
          {movingId === opp.id
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
            : <span className="text-xs text-slate-300">···</span>}
          <button disabled={stageIdx === STAGE_OPTIONS.length - 1 || movingId === opp.id}
            onClick={() => moveStage(opp, 1)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            {STAGE_OPTIONS[stageIdx + 1] || ''}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Opportunités commerciales</h1>
          <p className="text-slate-600 mt-1">Suivez votre pipeline de ventes</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle vue */}
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            <button onClick={() => setView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'kanban' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <LayoutGrid className="h-4 w-4" /> Kanban
            </button>
            <button onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <List className="h-4 w-4" /> Liste
            </button>
          </div>
          <Button onClick={() => openAddModal()} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Ajouter
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pipeline total',   value: `${fmtFCFA(totalPipeline)} FCFA`, sub: 'hors perdus' },
          { label: 'Valeur pondérée',  value: `${fmtFCFA(Math.round(weighted))} FCFA`, sub: 'probabilité × valeur' },
          { label: 'Taux de succès',   value: `${winRate}%`, sub: `${concluded} conclu(s)` },
          { label: 'En cours',         value: opportunities.filter(o => !['Conclu', 'Perdu'].includes(o.stage)).length, sub: 'opportunités actives' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" placeholder="Rechercher une opportunité..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white" />
      </div>

      {/* Contenu */}
      {isLoading ? (
        <SkeletonCards count={6} />
      ) : (
        <AnimatePresence mode="wait">
          {view === 'kanban' ? (
            // ── VUE KANBAN ───────────────────────────────────────────────
            <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {STAGE_OPTIONS.map(stage => {
                  const meta  = STAGE_META[stage];
                  const cards = filtered.filter(o => o.stage === stage);
                  const stageValue = cards.reduce((s, o) => s + (Number(o.value) || 0), 0);
                  return (
                    <div key={stage} className={`flex flex-col w-72 rounded-xl border ${meta.col} flex-shrink-0`}>
                      {/* Colonne header */}
                      <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${meta.header} border-b ${meta.col.split(' ')[1]}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                          <span className="font-semibold text-slate-800 text-sm">{stage}</span>
                          <span className="bg-white text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{cards.length}</span>
                        </div>
                        {stageValue > 0 && <span className="text-xs font-semibold text-slate-500">{fmtFCFA(stageValue)}</span>}
                      </div>
                      {/* Cards */}
                      <div className="flex flex-col gap-3 p-3 flex-1 min-h-[120px]">
                        <AnimatePresence>
                          {cards.map(opp => <KanbanCard key={opp.id} opp={opp} />)}
                        </AnimatePresence>
                        {cards.length === 0 && (
                          <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic py-6">Aucune opportunité</div>
                        )}
                        <button onClick={() => openAddModal(stage)}
                          className="flex items-center justify-center gap-1 w-full py-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors">
                          <Plus className="h-3.5 w-3.5" /> Ajouter
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            // ── VUE LISTE ────────────────────────────────────────────────
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <Briefcase className="h-10 w-10 mb-3 text-slate-200" />
                  <p className="font-medium text-slate-500">{searchTerm ? 'Aucun résultat' : 'Aucune opportunité'}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtered.map((opp, i) => {
                    const meta = STAGE_META[opp.stage];
                    return (
                      <motion.div key={opp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                        className="p-5 hover:bg-slate-50 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-base font-bold text-slate-900">{opp.title}</h3>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>{opp.stage}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div><p className="text-xs text-slate-400 mb-0.5">Client</p><p className="font-medium text-slate-800">{opp.client_name}</p></div>
                              <div><p className="text-xs text-slate-400 mb-0.5">Contact</p><p className="text-slate-700">{opp.contact_name || '—'}</p></div>
                              <div><p className="text-xs text-slate-400 mb-0.5">Clôture</p><p className="text-slate-700">{opp.expected_close_date ? format(new Date(opp.expected_close_date), 'dd MMM yyyy', { locale: fr }) : '—'}</p></div>
                              <div>
                                <p className="text-xs text-slate-400 mb-0.5">Probabilité</p>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${opp.probability || 0}%` }} />
                                  </div>
                                  <span className="text-xs font-semibold text-slate-700">{opp.probability || 0}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-xl font-bold text-slate-900 text-right">{opp.value ? `${fmtFCFA(Number(opp.value))} FCFA` : '—'}</p>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => openEditModal(opp)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => { setOppToDelete(opp); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{oppToEdit ? "Modifier l'opportunité" : 'Nouvelle opportunité'}</DialogTitle>
            <DialogDescription>Renseignez les détails de l'opportunité commerciale.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-700">Titre *</label>
                <input required type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="ex: Contrat flotte entreprise"
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Client *</label>
                <input required type="text" value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                  placeholder="Nom entreprise ou client"
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Contact</label>
                <input type="text" value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
                  placeholder="Nom du contact"
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Valeur (FCFA)</label>
                <input type="number" min="0" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                  placeholder="ex: 500000"
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Étape</label>
                <select value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 text-sm">
                  {STAGE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-700">Probabilité ({form.probability}%)</label>
                <input type="range" min="0" max="100" step="5" value={form.probability}
                  onChange={e => setForm(p => ({ ...p, probability: e.target.value }))}
                  className="w-full accent-blue-600" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-700">Date de clôture prévue</label>
                <input type="date" value={form.expected_close_date} onChange={e => setForm(p => ({ ...p, expected_close_date: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Détails, conditions, remarques..."
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Annuler</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (oppToEdit ? 'Mettre à jour' : 'Enregistrer')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette opportunité ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{oppToDelete?.title}</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Opportunities;
