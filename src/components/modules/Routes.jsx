import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, MapPin, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const RouteModal = ({ open, onOpenChange, onSaved, routeToEdit }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const init = { from_location: '', to_location: '', price: '', daily_rate: '' };
  const [form, setForm] = useState(init);

  useEffect(() => {
    if (open) {
      setForm(routeToEdit ? {
        from_location: routeToEdit.from_location || '',
        to_location: routeToEdit.to_location || '',
        price: routeToEdit.price || '',
        daily_rate: routeToEdit.daily_rate || '',
      } : init);
    }
  }, [open, routeToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.from_location || !form.to_location || !form.price) {
      toast({ title: 'Champs requis', description: 'Tous les champs sont obligatoires.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const payload = { from_location: form.from_location, to_location: form.to_location, price: Number(form.price), daily_rate: Number(form.daily_rate) || 0 };
      let data, error;
      if (routeToEdit) {
        ({ data, error } = await supabase.from('routes').update(payload).eq('id', routeToEdit.id).select().single());
      } else {
        ({ data, error } = await supabase.from('routes').insert([payload]).select().single());
      }
      if (error) throw error;
      toast({ title: routeToEdit ? 'Trajet modifié' : 'Trajet ajouté', className: 'bg-green-50 border-green-200 text-green-900' });
      onSaved(data);
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            {routeToEdit ? 'Modifier le trajet' : 'Nouveau tarif / trajet'}
          </DialogTitle>
          <DialogDescription>Définissez le départ, la destination et le prix forfaitaire.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Départ *</label>
            <input
              value={form.from_location}
              onChange={e => setForm(p => ({ ...p, from_location: e.target.value }))}
              placeholder="ex: Brazzaville Centre"
              className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Destination *</label>
            <input
              value={form.to_location}
              onChange={e => setForm(p => ({ ...p, to_location: e.target.value }))}
              placeholder="ex: Aéroport Maya-Maya"
              className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Prix du trajet (FCFA) *</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="ex: 150000"
                className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy focus:outline-none"
              />
              <p className="text-xs text-slate-400">Aller ou retour</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Prix/jour sur place (FCFA)</label>
              <input
                type="number"
                min="0"
                value={form.daily_rate}
                onChange={e => setForm(p => ({ ...p, daily_rate: e.target.value }))}
                placeholder="ex: 100000"
                className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-nc-navy focus:outline-none"
              />
              <p className="text-xs text-slate-400">Jours supplémentaires</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Annuler</Button>
            <Button type="submit" className="bg-nc-navy hover:bg-nc-navy-light text-white" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {routeToEdit ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Routes = () => {
  const { toast } = useToast();
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [routeToEdit, setRouteToEdit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { fetchRoutes(); }, []);

  const fetchRoutes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('routes').select('*').order('from_location');
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else setRoutes(data || []);
    setIsLoading(false);
  };

  const handleSaved = (saved) => {
    setRoutes(prev => {
      const exists = prev.find(r => r.id === saved.id);
      return exists ? prev.map(r => r.id === saved.id ? saved : r) : [saved, ...prev];
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('routes').delete().eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setRoutes(prev => prev.filter(r => r.id !== deleteTarget.id));
      toast({ title: 'Trajet supprimé', className: 'bg-green-50 border-green-200 text-green-900' });
    }
    setDeleteTarget(null);
  };

  const filtered = routes.filter(r =>
    r.from_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.to_location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tarifs par Destination</h1>
          <p className="text-slate-600 mt-1">Gérez les trajets et leurs tarifs forfaitaires</p>
        </div>
        <Button onClick={() => { setRouteToEdit(null); setIsModalOpen(true); }} className="bg-nc-navy hover:bg-nc-navy-light text-white">
          <Plus className="h-4 w-4 mr-2" /> Ajouter un trajet
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher un trajet..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nc-navy"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <MapPin className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Aucun trajet configuré</p>
            <p className="text-sm">Ajoutez un trajet pour définir les tarifs forfaitaires.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Départ</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Destination</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Prix trajet</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Prix/jour</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(route => (
                  <tr key={route.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="font-medium text-slate-800">{route.from_location}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="font-medium text-slate-800">{route.to_location}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-slate-900">{Number(route.price).toLocaleString()}</span>
                      <span className="text-slate-500 ml-1 text-xs">FCFA</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {route.daily_rate > 0 ? (
                        <>
                          <span className="font-semibold text-slate-700">{Number(route.daily_rate).toLocaleString()}</span>
                          <span className="text-slate-500 ml-1 text-xs">FCFA</span>
                        </>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => { setRouteToEdit(route); setIsModalOpen(true); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100" onClick={() => setDeleteTarget(route)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RouteModal open={isModalOpen} onOpenChange={setIsModalOpen} onSaved={handleSaved} routeToEdit={routeToEdit} />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce trajet ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.from_location}</strong> → <strong>{deleteTarget?.to_location}</strong> sera supprimé définitivement.
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

export default Routes;
