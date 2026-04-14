import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Eye, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import usePagination from '@/hooks/usePagination';
import PaginationBar from '@/components/ui/PaginationBar';
import { SkeletonRows } from '@/components/ui/SkeletonTable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AddTicketModal from '@/components/modals/AddTicketModal';
import ViewTicketModal from '@/components/modals/ViewTicketModal';
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

const Support = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [ticketToView, setTicketToView] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les tickets.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgente': return 'bg-red-100 text-red-700 border-red-200';
      case 'Haute': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Moyenne': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Basse': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Ouvert': return AlertCircle;
      case 'En cours': return Clock;
      case 'Résolu': return CheckCircle;
      case 'Fermé': return CheckCircle;
      default: return MessageSquare;
    }
  };

  const handleAdd = () => {
    setTicketToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (ticket) => {
    setTicketToEdit(ticket);
    setIsAddModalOpen(true);
  };

  const handleView = (ticket) => {
    setTicketToView(ticket);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (ticket) => {
    setTicketToDelete(ticket);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!ticketToDelete) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketToDelete.id);

      if (error) throw error;

      await historyService.logEvent({
        type: 'ticket_deleted',
        title: `Ticket supprimé`,
        description: `Le ticket ${ticketToDelete.ticket_number} a été supprimé.`,
        metadata: { ticket_number: ticketToDelete.ticket_number }
      });

      setTickets(prev => prev.filter(t => t.id !== ticketToDelete.id));

      toast({
        title: "Ticket supprimé",
        description: "Le ticket a été supprimé avec succès.",
        className: "bg-green-50 border-green-200 text-green-900",
      });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer ce ticket.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setTicketToDelete(null);
    }
  };

  const handleTicketSaved = (savedTicket) => {
    setTickets(prev => {
      const exists = prev.find(t => t.id === savedTicket.id);
      if (exists) {
        return prev.map(t => t.id === savedTicket.id ? savedTicket : t);
      } else {
        return [savedTicket, ...prev];
      }
    });
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ticket.client_name && ticket.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    ticket.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const { paginated: paginatedTickets, page, setPage, totalPages, total, from, perPage } = usePagination(filteredTickets, 10);

  // Metrics
  const openCount = tickets.filter(t => t.status === 'Ouvert').length;
  const progressCount = tickets.filter(t => t.status === 'En cours').length;
  const resolvedCount = tickets.filter(t => t.status === 'Résolu' || t.status === 'Fermé').length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Support Client</h1>
          <p className="text-slate-600 mt-1">Gérez les demandes et tickets de support</p>
        </div>
        <Button onClick={handleAdd} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-sm text-slate-600">Ouverts</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{openCount}</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-6 w-6 text-yellow-500" />
            <p className="text-sm text-slate-600">En cours</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{progressCount}</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <p className="text-sm text-slate-600">Résolus</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{resolvedCount}</p>
        </motion.div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
           {isLoading ? (
             <table className="w-full text-sm"><tbody><SkeletonRows rows={7} cols={6} /></tbody></table>
           ) : filteredTickets.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-slate-500">
               <MessageSquare className="h-12 w-12 mb-4 text-slate-300" />
               <p className="text-lg font-medium">Aucun ticket trouvé</p>
               <p className="text-sm">Créez votre premier ticket pour commencer.</p>
             </div>
           ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">N° Ticket</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Sujet</th>
                  <th className="px-6 py-4 text-center">Priorité</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4">Date Création</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTickets.map((ticket, index) => {
                   const StatusIcon = getStatusIcon(ticket.status);
                   return (
                    <motion.tr
                      key={ticket.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-slate-700">{ticket.ticket_number}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{ticket.client_name || 'Inconnu'}</td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={ticket.subject}>{ticket.subject}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className="flex items-center justify-center gap-2">
                           <StatusIcon className={`h-4 w-4 ${
                            ticket.status === 'Résolu' || ticket.status === 'Fermé' ? 'text-green-500' :
                            ticket.status === 'En cours' ? 'text-yellow-500' : 'text-blue-500'
                           }`} />
                           <span className="text-slate-700">{ticket.status}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleView(ticket)} title="Voir">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100" onClick={() => handleEdit(ticket)} title="Modifier">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDeleteClick(ticket)} title="Supprimer">
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

      <AddTicketModal 
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onTicketSaved={handleTicketSaved}
        ticketToEdit={ticketToEdit}
      />

      <ViewTicketModal 
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        ticket={ticketToView}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce ticket ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le ticket <strong>{ticketToDelete?.ticket_number}</strong> sera définitivement supprimé.
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

export default Support;