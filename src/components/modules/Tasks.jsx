import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, CheckCircle, Clock, AlertCircle, Pencil, Trash2, Loader2, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PRIORITY_OPTIONS = ['Haute', 'Moyenne', 'Basse'];
const STATUS_OPTIONS  = ['En attente', 'En cours', 'Terminée'];
const CATEGORY_OPTIONS = ['Général', 'Commercial', 'Maintenance', 'Facturation', 'Administratif', 'Autre'];

const Tasks = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Toutes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const initialForm = { title: '', description: '', priority: 'Moyenne', due_date: '', status: 'En attente', assigned_to: '', category: 'Général' };
  const [form, setForm] = useState(initialForm);

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les tâches.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => { setTaskToEdit(null); setForm(initialForm); setIsModalOpen(true); };
  const openEditModal = (task) => {
    setTaskToEdit(task);
    setForm({
      title: task.title || '', description: task.description || '',
      priority: task.priority || 'Moyenne', due_date: task.due_date || '',
      status: task.status || 'En attente', assigned_to: task.assigned_to || '',
      category: task.category || 'Général'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!form.title) throw new Error('Le titre est obligatoire.');
      const payload = { ...form, due_date: form.due_date || null };
      if (taskToEdit) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', taskToEdit.id);
        if (error) throw error;
        toast({ title: 'Tâche modifiée', className: 'bg-green-50 border-green-200 text-green-900' });
      } else {
        const { error } = await supabase.from('tasks').insert([payload]);
        if (error) throw error;
        toast({ title: 'Tâche créée', className: 'bg-green-50 border-green-200 text-green-900' });
      }
      setIsModalOpen(false);
      fetchTasks();
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (task) => {
    const next = task.status === 'Terminée' ? 'En attente' : task.status === 'En attente' ? 'En cours' : 'Terminée';
    try {
      const { error } = await supabase.from('tasks').update({ status: next }).eq('id', task.id);
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut.', variant: 'destructive' });
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskToDelete.id);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
      toast({ title: 'Tâche supprimée', className: 'bg-green-50 border-green-200 text-green-900' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' });
    } finally {
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case 'Haute':   return 'bg-red-100 text-red-700';
      case 'Moyenne': return 'bg-yellow-100 text-yellow-700';
      case 'Basse':   return 'bg-green-100 text-green-700';
      default:        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (s) => {
    switch (s) {
      case 'Terminée':  return { icon: CheckCircle, color: 'text-green-500' };
      case 'En cours':  return { icon: Clock,        color: 'text-blue-500' };
      default:          return { icon: AlertCircle,  color: 'text-orange-400' };
    }
  };

  const filtered = tasks.filter(t => {
    const matchesSearch = t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Toutes' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    'En attente': tasks.filter(t => t.status === 'En attente').length,
    'En cours':   tasks.filter(t => t.status === 'En cours').length,
    'Terminée':   tasks.filter(t => t.status === 'Terminée').length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tâches & Rappels</h1>
          <p className="text-slate-600 mt-1">Gérez votre liste de tâches et rappels</p>
        </div>
        <Button onClick={openAddModal} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Ajouter une tâche
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En attente', count: counts['En attente'], icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'En cours',   count: counts['En cours'],   icon: Clock,        color: 'text-blue-500',   bg: 'bg-blue-50' },
          { label: 'Terminées',  count: counts['Terminée'],   icon: CheckCircle,  color: 'text-green-500',  bg: 'bg-green-50' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilterStatus(filterStatus === s.label ? 'Toutes' : s.label)}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{s.count}</p>
            {filterStatus === s.label && <p className="text-xs text-blue-500 mt-1 font-medium">Filtre actif</p>}
          </motion.div>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Rechercher une tâche..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          {filterStatus !== 'Toutes' && (
            <Button variant="outline" size="sm" onClick={() => setFilterStatus('Toutes')} className="text-xs">
              Filtre: {filterStatus} ✕
            </Button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <ListTodo className="h-10 w-10 mb-3 text-slate-200" />
              <p className="font-medium text-slate-500">{searchTerm || filterStatus !== 'Toutes' ? 'Aucun résultat' : 'Aucune tâche enregistrée'}</p>
              {!searchTerm && filterStatus === 'Toutes' && <p className="text-sm mt-1">Ajoutez votre première tâche pour commencer.</p>}
            </div>
          ) : (
            filtered.map((task, index) => {
              const { icon: StatusIcon, color: statusColor } = getStatusIcon(task.status);
              const isOverdue = task.due_date && task.status !== 'Terminée' && isPast(parseISO(task.due_date));
              return (
                <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }}
                  className={`p-5 hover:bg-slate-50 transition-colors ${task.status === 'Terminée' ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-4">
                    <button onClick={() => toggleStatus(task)} className="mt-0.5 flex-shrink-0 focus:outline-none" title="Changer le statut">
                      <StatusIcon className={`h-6 w-6 ${statusColor} hover:scale-110 transition-transform`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className={`text-base font-semibold text-slate-900 ${task.status === 'Terminée' ? 'line-through text-slate-400' : ''}`}>
                            {task.title}
                          </h3>
                          {task.description && <p className="text-sm text-slate-500 mt-0.5">{task.description}</p>}
                        </div>
                        <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                        {task.due_date && (
                          <span className={isOverdue ? 'text-red-500 font-semibold' : ''}>
                            Échéance: {format(parseISO(task.due_date), 'dd MMM yyyy', { locale: fr })}
                            {isOverdue && ' — En retard'}
                          </span>
                        )}
                        {task.assigned_to && <span>Assigné à: <span className="text-slate-600">{task.assigned_to}</span></span>}
                        {task.category && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{task.category}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => openEditModal(task)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50"
                        onClick={() => { setTaskToDelete(task); setIsDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{taskToEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
            <DialogDescription>Renseignez les informations de la tâche.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-700">Titre *</label>
                <input required type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="ex: Rappeler le client Dupont"
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Détails de la tâche..."
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 text-sm resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Priorité</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 text-sm">
                  {PRIORITY_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Statut</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 text-sm">
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Date d'échéance</label>
                <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Catégorie</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 text-sm">
                  {CATEGORY_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-700">Assigné à</label>
                <input type="text" value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
                  placeholder="ex: Jean, Équipe commerciale..."
                  className="w-full p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Annuler</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (taskToEdit ? 'Mettre à jour' : 'Enregistrer')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette tâche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{taskToDelete?.title}</strong> ? Cette action est irréversible.
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

export default Tasks;
