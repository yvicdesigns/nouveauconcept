import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { List, Calendar as CalendarIcon, Plus, Search, Filter, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import usePagination from '@/hooks/usePagination';
import PaginationBar from '@/components/ui/PaginationBar';
import AddReservationModal from '@/components/modals/AddReservationModal';
import { format } from 'date-fns';
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

const Reservations = () => {
  const { toast } = useToast();
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [reservationToEdit, setReservationToEdit] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          contacts (name, email),
          vehicles (name, brand, model, license_plate)
        `)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les réservations.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmée': return 'bg-green-100 text-green-700';
      case 'En cours': return 'bg-blue-100 text-blue-700';
      case 'Terminée': return 'bg-gray-100 text-gray-700';
      case 'Annulée': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-800'; // En attente
    }
  };

  const handleAdd = () => {
    setReservationToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (reservation) => {
    setReservationToEdit(reservation);
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (reservation) => {
    setReservationToDelete(reservation);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!reservationToDelete) return;

    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservationToDelete.id);

      if (error) throw error;

      await historyService.logEvent({
        type: 'reservation_deleted',
        title: `Réservation supprimée`,
        description: `La réservation #${reservationToDelete.id.slice(0,8)} a été supprimée.`,
        metadata: { id: reservationToDelete.id }
      });

      setReservations(prev => prev.filter(r => r.id !== reservationToDelete.id));

      toast({
        title: "Réservation supprimée",
        description: "L'opération a été effectuée avec succès.",
        className: "bg-green-50 border-green-200 text-green-900",
      });
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer cette réservation.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setReservationToDelete(null);
    }
  };

  const handleReservationSaved = (savedReservation) => {
    fetchReservations(); // Refresh full list to ensure relationships are populated correctly
  };

  const filteredReservations = reservations.filter(r =>
    (r.contacts?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.vehicles?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const { paginated: paginatedReservations, page, setPage, totalPages, total, from, perPage } = usePagination(filteredReservations, 10);

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-[1600px] mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Réservations</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Suivi des locations en cours et à venir</p>
        </div>
        
        <Button 
          onClick={handleAdd} 
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une réservation
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par client ou véhicule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="text-slate-600">
             <Filter className="h-4 w-4 mr-2" /> Filtres
           </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : filteredReservations.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 text-slate-500">
             <CalendarIcon className="h-12 w-12 mb-4 text-slate-300" />
             <p className="text-lg font-medium">Aucune réservation trouvée</p>
             <p className="text-sm">Créez votre première réservation en cliquant sur "Ajouter".</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Véhicule</th>
                  <th className="px-6 py-4">Dates & Heures</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Montant</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedReservations.map((res, index) => (
                  <motion.tr 
                    key={res.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {res.contacts?.name || 'Client inconnu'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{res.vehicles?.name || 'Véhicule inconnu'}</div>
                      <div className="text-xs text-gray-500">{res.vehicles?.brand} {res.vehicles?.model}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                        <span className="flex items-center gap-1">
                          Du: <span className="text-gray-900">{format(new Date(res.start_date), 'dd MMM yyyy à HH:mm', { locale: fr })}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          Au: <span className="text-gray-900">{format(new Date(res.end_date), 'dd MMM yyyy', { locale: fr })}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(res.status)}`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {res.total_price?.toLocaleString()} FCFA
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleEdit(res)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteClick(res)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginationBar page={page} setPage={setPage} totalPages={totalPages} total={total} from={from} perPage={perPage} />
      </div>

      {/* Modal */}
      <AddReservationModal 
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onReservationSaved={handleReservationSaved}
        reservationToEdit={reservationToEdit}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer cette réservation.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reservations;