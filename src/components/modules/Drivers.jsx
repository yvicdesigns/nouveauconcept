import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, UserCheck, Loader2, Search, Phone, Mail, Car, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
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

const DriverModal = ({ open, onOpenChange, onSaved, driverToEdit, vehicles }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const init = {
    name: '', phone: '', email: '', license_number: '', license_expiry: '',
    status: 'active', vehicle_id: '', commission_rate: '0',
  };
  const [form, setForm] = useState(init);

  useEffect(() => {
    if (open) {
      setForm(driverToEdit ? {
        name: driverToEdit.name || '',
        phone: driverToEdit.phone || '',
        email: driverToEdit.email || '',
        license_number: driverToEdit.license_number || '',
        license_expiry: driverToEdit.license_expiry || '',
        status: driverToEdit.status || 'active',
        vehicle_id: driverToEdit.vehicle_id || '',
        commission_rate: driverToEdit.commission_rate?.toString() || '0',
      } : init);
    }
  }, [open, driverToEdit]);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toast({ title: 'Nom requis', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        license_number: form.license_number || null,
        license_expiry: form.license_expiry || null,
        status: form.status,
        vehicle_id: form.vehicle_id || null,
        commission_rate: Number(form.commission_rate) || 0,
      };
      let data, error;
      if (driverToEdit) {
        ({ data, error } = await supabase.from('drivers').update(payload).eq('id', driverToEdit.id).select('*, vehicles(name, license_plate)').single());
      } else {
        ({ data, error } = await supabase.from('drivers').insert([payload]).select('*, vehicles(name, license_plate)').single());
      }
      if (error) throw error;
      toast({ title: driverToEdit ? 'Chauffeur modifié' : 'Chauffeur ajouté', className: 'bg-green-50 border-green-200 text-green-900' });
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            {driverToEdit ? 'Modifier le chauffeur' : 'Ajouter un chauffeur'}
          </DialogTitle>
          <DialogDescription>Profil, permis et affectation véhicule.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nom complet *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="ex: Michel Ouabari" required
                className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Téléphone</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+242 06 ..."
                className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="chauffeur@email.com"
                className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">N° Permis</label>
              <input name="license_number" value={form.license_number} onChange={handleChange} placeholder="ex: CG-2024-001"
                className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Expiration permis</label>
              <input name="license_expiry" type="date" value={form.license_expiry} onChange={handleChange}
                className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Statut</label>
              <select name="status" value={form.status} onChange={handleChange}
                className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="on_leave">En congé</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Commission (%)</label>
              <input name="commission_rate" type="number" min="0" max="100" step="0.5" value={form.commission_rate} onChange={handleChange}
                className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Véhicule assigné</label>
              <select name="vehicle_id" value={form.vehicle_id} onChange={handleChange}
                className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                <option value="">— Aucun véhicule —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name || `${v.brand} ${v.model}`} — {v.license_plate}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Annuler</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {driverToEdit ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const statusConfig = {
  active:   { label: 'Actif',     className: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inactif',   className: 'bg-slate-100 text-slate-600' },
  on_leave: { label: 'En congé',  className: 'bg-yellow-100 text-yellow-700' },
};

const Drivers = () => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [{ data: driversData }, { data: vehiclesData }] = await Promise.all([
      supabase.from('drivers').select('*, vehicles(name, brand, model, license_plate)').order('name'),
      supabase.from('vehicles').select('id, name, brand, model, license_plate').order('name'),
    ]);
    setDrivers(driversData || []);
    setVehicles(vehiclesData || []);
    setIsLoading(false);
  };

  const handleSaved = (saved) => {
    setDrivers(prev => {
      const exists = prev.find(d => d.id === saved.id);
      return exists ? prev.map(d => d.id === saved.id ? saved : d) : [saved, ...prev];
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('drivers').delete().eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setDrivers(prev => prev.filter(d => d.id !== deleteTarget.id));
      toast({ title: 'Chauffeur supprimé', className: 'bg-green-50 border-green-200 text-green-900' });
    }
    setDeleteTarget(null);
  };

  const filtered = drivers.filter(d =>
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.license_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chauffeurs</h1>
          <p className="text-slate-600 mt-1">Gérez les profils, permis et affectations de vos chauffeurs</p>
        </div>
        <Button onClick={() => { setDriverToEdit(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Ajouter un chauffeur
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom ou numéro de permis..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <UserCheck className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Aucun chauffeur enregistré</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(driver => {
              const st = statusConfig[driver.status] || statusConfig.inactive;
              const licenseExpired = driver.license_expiry && new Date(driver.license_expiry) < new Date();
              return (
                <div key={driver.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-base">
                        {driver.name?.substring(0, 2).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{driver.name}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    {driver.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {driver.phone}
                      </div>
                    )}
                    {driver.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="h-3.5 w-3.5 text-slate-400" /> {driver.email}
                      </div>
                    )}
                    {driver.license_number && (
                      <div className={`flex items-center gap-2 ${licenseExpired ? 'text-red-600' : 'text-slate-600'}`}>
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        Permis {driver.license_number}
                        {driver.license_expiry && (
                          <span className={`text-xs ml-1 ${licenseExpired ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                            {licenseExpired ? '(expiré)' : `(exp. ${format(parseISO(driver.license_expiry), 'dd/MM/yyyy', { locale: fr })})`}
                          </span>
                        )}
                      </div>
                    )}
                    {driver.vehicles && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Car className="h-3.5 w-3.5 text-slate-400" />
                        {driver.vehicles.name || `${driver.vehicles.brand} ${driver.vehicles.model}`} — {driver.vehicles.license_plate}
                      </div>
                    )}
                    {driver.commission_rate > 0 && (
                      <div className="text-xs font-medium text-purple-700 bg-purple-50 rounded px-2 py-1 inline-block">
                        Commission : {driver.commission_rate}%
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setDriverToEdit(driver); setIsModalOpen(true); }}>
                      <Edit className="h-3.5 w-3.5 mr-1.5" /> Modifier
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 border-red-100" onClick={() => setDeleteTarget(driver)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DriverModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSaved={handleSaved}
        driverToEdit={driverToEdit}
        vehicles={vehicles}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce chauffeur ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> sera supprimé définitivement.
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

export default Drivers;
