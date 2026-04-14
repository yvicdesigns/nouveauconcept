import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Wrench, Clock, CheckCircle, AlertCircle, Eye, Edit, Trash2, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import usePagination from '@/hooks/usePagination';
import PaginationBar from '@/components/ui/PaginationBar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AddMaintenanceModal from '@/components/modals/AddMaintenanceModal';
import ViewMaintenanceModal from '@/components/modals/ViewMaintenanceModal';
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

const Maintenance = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [recordToView, setRecordToView] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*, vehicles(name, brand, model, license_plate)')
        .order('reported_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de maintenance.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'reported': return AlertCircle;
      case 'in_progress': return Clock;
      case 'completed': return CheckCircle;
      case 'cancelled': return AlertTriangle;
      default: return AlertCircle;
    }
  };

  const getStatusLabel = (status) => {
     switch (status) {
      case 'reported': return 'Signalé';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };
  
  const getStatusColorText = (status) => {
    switch (status) {
      case 'reported': return 'text-slate-600';
      case 'in_progress': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-slate-600';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'breakdown': return 'Panne';
      case 'scheduled': return 'Entretien';
      case 'inspection': return 'Inspection';
      default: return type;
    }
  };

  const handleAdd = () => {
    setRecordToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (record) => {
    setRecordToEdit(record);
    setIsAddModalOpen(true);
  };

  const handleView = (record) => {
    setRecordToView(record);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (record) => {
    setRecordToDelete(record);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      const { error } = await supabase
        .from('maintenance_records')
        .delete()
        .eq('id', recordToDelete.id);

      if (error) throw error;

      await historyService.logEvent({
        type: 'maintenance_deleted',
        title: `Maintenance supprimée`,
        description: `Le dossier de maintenance pour le véhicule ${recordToDelete.vehicles?.license_plate} a été supprimé.`,
        metadata: { record_id: recordToDelete.id }
      });

      setRecords(prev => prev.filter(r => r.id !== recordToDelete.id));

      toast({
        title: "Dossier supprimé",
        description: "Le dossier de maintenance a été supprimé avec succès.",
        className: "bg-green-50 border-green-200 text-green-900",
      });
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer ce dossier.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const handleRecordSaved = (savedRecord) => {
    setRecords(prev => {
      const exists = prev.find(r => r.id === savedRecord.id);
      if (exists) {
        return prev.map(r => r.id === savedRecord.id ? savedRecord : r);
      } else {
        return [savedRecord, ...prev];
      }
    });
  };

  const filteredRecords = records.filter(record =>
    (record.vehicles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (record.vehicles?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (record.vehicles?.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (record.description?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
  );
  const { paginated: paginatedRecords, page, setPage, totalPages, total, from, perPage } = usePagination(filteredRecords, 10);

  // Metrics
  const activeCount = records.filter(r => r.status === 'in_progress' || r.status === 'reported').length;
  const urgentCount = records.filter(r => r.priority === 'urgent' && r.status !== 'completed' && r.status !== 'cancelled').length;
  const completedMonth = records.filter(r => r.status === 'completed').length; 

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Maintenance & Pannes</h1>
          <p className="text-slate-600 mt-1">Suivi des entretiens et réparations des véhicules</p>
        </div>
        <Button onClick={handleAdd} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter Maintenance
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm text-slate-600">Interventions Actives</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{activeCount}</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
               <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-sm text-slate-600">Urgences</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{urgentCount}</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
               <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm text-slate-600">Terminés (Total)</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{completedMonth}</p>
        </motion.div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher (véhicule, panne...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
           {isLoading ? (
             <div className="flex justify-center items-center h-64">
               <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
             </div>
           ) : filteredRecords.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-slate-500">
               <Wrench className="h-12 w-12 mb-4 text-slate-300" />
               <p className="text-lg font-medium">Aucune intervention trouvée</p>
               <p className="text-sm">Ajoutez votre première maintenance pour commencer.</p>
             </div>
           ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Véhicule</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-center">Priorité</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4">Date Signalement</th>
                  <th className="px-6 py-4 text-right">Coût</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.map((record, index) => {
                   const StatusIcon = getStatusIcon(record.status);
                   return (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {record.vehicles ? `${record.vehicles.brand} ${record.vehicles.model}` : 'Inconnu'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {record.vehicles?.license_plate}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {getTypeLabel(record.type)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${getPriorityColor(record.priority)}`}>
                          {record.priority === 'urgent' ? 'Urgente' : 
                           record.priority === 'high' ? 'Haute' :
                           record.priority === 'medium' ? 'Moyenne' : 'Basse'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className={`flex items-center justify-center gap-2 font-medium ${getStatusColorText(record.status)}`}>
                           <StatusIcon className="h-4 w-4" />
                           <span>{getStatusLabel(record.status)}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {format(new Date(record.reported_date), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">
                        {record.cost ? `${parseFloat(record.cost).toLocaleString('fr-FR')} €` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleView(record)} title="Voir">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100" onClick={() => handleEdit(record)} title="Modifier">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDeleteClick(record)} title="Supprimer">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
           )}
          <PaginationBar page={page} setPage={setPage} totalPages={totalPages} total={total} from={from} perPage={perPage} />
        </div>
      </div>

      <AddMaintenanceModal 
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onRecordSaved={handleRecordSaved}
        recordToEdit={recordToEdit}
      />

      <ViewMaintenanceModal 
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        record={recordToView}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet enregistrement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'historique de cette maintenance sera définitivement effacé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Maintenance;