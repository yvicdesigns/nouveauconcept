import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, TrendingUp, CheckCircle, Pencil, Trash2, Loader2, UserPlus, PhoneCall, ArrowRight, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import usePagination from '@/hooks/usePagination';
import PaginationBar from '@/components/ui/PaginationBar';
import { SkeletonRows } from '@/components/ui/SkeletonTable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_OPTIONS = ['Nouveau', 'Contacté', 'Qualifié', 'Converti', 'Perdu'];
const SOURCE_OPTIONS = ['Direct', 'Site web', 'Référence', 'Réseaux sociaux', 'Téléphone', 'Autre'];

const Leads = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [sourceFilter, setSourceFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState(null);
  const [isConverting, setIsConverting] = useState(false);

  const initialForm = { name: '', email: '', phone: '', source: 'Direct', status: 'Nouveau', interest: '', notes: '' };
  const [form, setForm] = useState(initialForm);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les prospects.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => { setLeadToEdit(null); setForm(initialForm); setIsModalOpen(true); };
  const openEditModal = (lead) => {
    setLeadToEdit(lead);
    setForm({ name: lead.name || '', email: lead.email || '', phone: lead.phone || '',
      source: lead.source || 'Direct', status: lead.status || 'Nouveau',
      interest: lead.interest || '', notes: lead.notes || '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!form.name) throw new Error('Le nom est obligatoire.');
      if (leadToEdit) {
        const { error } = await supabase.from('leads').update(form).eq('id', leadToEdit.id);
        if (error) throw error;
        toast({ title: 'Prospect modifié', className: 'bg-green-50 border-green-200 text-green-900' });
      } else {
        const { error } = await supabase.from('leads').insert([form]);
        if (error) throw error;
        toast({ title: 'Prospect ajouté', className: 'bg-green-50 border-green-200 text-green-900' });
      }
      setIsModalOpen(false);
      fetchLeads();
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!leadToDelete) return;
    try {
      const { error } = await supabase.from('leads').delete().eq('id', leadToDelete.id);
      if (error) throw error;
      setLeads(prev => prev.filter(l => l.id !== leadToDelete.id));
      toast({ title: 'Prospect supprimé', className: 'bg-green-50 border-green-200 text-green-900' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' });
    } finally {
      setIsDeleteDialogOpen(false);
      setLeadToDelete(null);
    }
  };

  const confirmConvert = async () => {
    if (!leadToConvert) return;
    setIsConverting(true);
    try {
      const opportunityData = {
        title: `Opportunité — ${leadToConvert.interest || 'Véhicule'} pour ${leadToConvert.name}`,
        client_name: leadToConvert.name,
        contact_name: leadToConvert.name,
        value: 0,
        probability: 50,
        stage: 'Qualification',
        notes: leadToConvert.notes || '',
        created_at: new Date().toISOString(),
      };
      const { error: oppError } = await supabase.from('opportunities').insert([opportunityData]);
      if (oppError) throw oppError;

      const { error: leadError } = await supabase.from('leads').update({ status: 'Converti' }).eq('id', leadToConvert.id);
      if (leadError) throw leadError;

      setLeads(prev => prev.map(l => l.id === leadToConvert.id ? { ...l, status: 'Converti' } : l));
      toast({ title: 'Prospect converti !', description: `${leadToConvert.name} a été ajouté aux opportunités.`, className: 'bg-purple-50 border-purple-200 text-purple-900' });
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsConverting(false);
      setIsConvertDialogOpen(false);
      setLeadToConvert(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Nouveau':   return 'bg-blue-100 text-blue-700';
      case 'Contacté':  return 'bg-yellow-100 text-yellow-700';
      case 'Qualifié':  return 'bg-green-100 text-green-700';
      case 'Converti':  return 'bg-purple-100 text-purple-700';
      case 'Perdu':     return 'bg-red-100 text-red-700';
      default:          return 'bg-slate-100 text-slate-700';
    }
  };

  const filtered = leads.filter(l => {
    const matchSearch = !searchTerm ||
      l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone?.includes(searchTerm);
    const matchStatus = !statusFilter || l.status === statusFilter;
    const matchSource = !sourceFilter || l.source === sourceFilter;
    return matchSearch && matchStatus && matchSource;
  });

  const convertis = leads.filter(l => l.status === 'Converti').length;
  const totalNonPerdu = leads.filter(l => l.status !== 'Perdu').length;
  const tauxConversion = totalNonPerdu > 0 ? Math.round((convertis / totalNonPerdu) * 100) : 0;

  const stats = [
    { label: 'Nouveaux',   value: leads.filter(l => l.status === 'Nouveau').length,   icon: UserPlus,    color: 'text-blue-600',   bg: 'bg-blue-50',   ring: 'ring-blue-400',   statusKey: 'Nouveau' },
    { label: 'Contactés',  value: leads.filter(l => l.status === 'Contacté').length,  icon: PhoneCall,   color: 'text-yellow-600', bg: 'bg-yellow-50', ring: 'ring-yellow-400', statusKey: 'Contacté' },
    { label: 'Qualifiés',  value: leads.filter(l => l.status === 'Qualifié').length,  icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50',  ring: 'ring-green-400',  statusKey: 'Qualifié' },
    { label: 'Convertis',  value: convertis,                                           icon: TrendingUp,  color: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-400', statusKey: 'Converti' },
    { label: 'Taux conv.', value: `${tauxConversion}%`,                               icon: TrendingUp,  color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-400', statusKey: null },
  ];

  const hasActiveFilters = statusFilter || sourceFilter || searchTerm;
  const clearFilters = () => { setStatusFilter(null); setSourceFilter(''); setSearchTerm(''); };

  const { paginated, page, setPage, totalPages, total, from, perPage } = usePagination(filtered, 10);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Prospects (Leads)</h1>
          <p className="text-slate-600 mt-1">Gérez et convertissez vos prospects clients</p>
        </div>
        <Button onClick={openAddModal} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Ajouter un prospect
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((s, i) => {
          const isActive = s.statusKey && statusFilter === s.statusKey;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              onClick={() => s.statusKey && setStatusFilter(isActive ? null : s.statusKey)}
              className={`bg-white rounded-xl shadow-sm border p-5 transition-all
                ${s.statusKey ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}
                ${isActive ? `border-transparent ring-2 ${s.ring} shadow-md` : 'border-slate-100'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
                <p className="text-sm text-slate-500">{s.label}</p>
                {isActive && <span className="ml-auto text-xs font-semibold text-slate-400">Filtré</span>}
              </div>
              <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Rechercher un prospect..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                className="p-2.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-sm text-slate-700">
                <option value="">Toutes les sources</option>
                {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
              <AnimatePresence>
                {hasActiveFilters && (
                  <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-3 py-2.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    <X className="h-3.5 w-3.5" /> Effacer
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
          {hasActiveFilters && (
            <p className="mt-2 text-xs text-slate-500">
              {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} sur {leads.length} prospect{leads.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <table className="w-full text-sm"><tbody><SkeletonRows rows={8} cols={7} /></tbody></table>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <UserPlus className="h-10 w-10 mb-3 text-slate-200" />
              <p className="font-medium text-slate-500">{searchTerm ? 'Aucun résultat' : 'Aucun prospect enregistré'}</p>
              {!searchTerm && <p className="text-sm mt-1">Cliquez sur "Ajouter un prospect" pour commencer.</p>}
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Prospect</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Intérêt véhicule</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((lead, index) => (
                  <motion.tr key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <p className="font-semibold text-slate-900">{lead.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <p>{lead.email || '—'}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{lead.phone || ''}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{lead.source}</td>
                    <td className="px-6 py-4 text-slate-700">{lead.interest || '—'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {lead.created_at ? format(new Date(lead.created_at), 'dd MMM yyyy', { locale: fr }) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1">
                        {(lead.status === 'Qualifié') && (
                          <Button variant="ghost" size="icon" title="Convertir en opportunité"
                            className="h-8 w-8 text-purple-600 hover:bg-purple-50"
                            onClick={() => { setLeadToConvert(lead); setIsConvertDialogOpen(true); }}>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => openEditModal(lead)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50"
                          onClick={() => { setLeadToDelete(lead); setIsDeleteDialogOpen(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
          <PaginationBar page={page} setPage={setPage} totalPages={totalPages} total={total} from={from} perPage={perPage} />
        </div>
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{leadToEdit ? 'Modifier le prospect' : 'Nouveau prospect'}</DialogTitle>
            <DialogDescription>Renseignez les informations du prospect.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-700">Nom complet *</label>
                <input required type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="ex: Marie Laurent"
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemple.com"
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Téléphone</label>
                <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+225 07 00 00 00"
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Source</label>
                <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 text-sm">
                  {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Statut</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 text-sm">
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-700">Véhicule souhaité</label>
                <input type="text" value={form.interest} onChange={e => setForm(p => ({ ...p, interest: e.target.value }))}
                  placeholder="ex: SUV, Berline, Pick-up..."
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Informations complémentaires..."
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Annuler</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (leadToEdit ? 'Mettre à jour' : 'Enregistrer')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{leadToDelete?.name}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Opportunity */}
      <AlertDialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-purple-600" />
              Convertir en opportunité ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{leadToConvert?.name}</strong> sera ajouté dans le module Opportunités avec le statut <em>Qualification</em>.
              Son statut ici passera à <strong>Converti</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConverting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConvert} disabled={isConverting}
              className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]">
              {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Convertir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Leads;
