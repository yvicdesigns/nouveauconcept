import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Mail, Phone, MapPin, Edit, Trash2, Building, Loader2, AlertCircle, MessageSquare, PhoneCall, ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import usePagination from '@/hooks/usePagination';
import PaginationBar from '@/components/ui/PaginationBar';
import { SkeletonCards } from '@/components/ui/SkeletonTable';
import AddContactModal from '@/components/modals/AddContactModal';
import ViewContactModal from '@/components/modals/ViewContactModal';
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

const Contacts = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [showRelance, setShowRelance] = useState(false);
  const [clientsToFollow, setClientsToFollow] = useState([]);
  const [reservationCounts, setReservationCounts] = useState({});
  const [viewContact, setViewContact] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const [{ data, error }, { data: resData }] = await Promise.all([
        supabase.from('contacts').select('*').order('created_at', { ascending: false }),
        supabase.from('reservations').select('contact_id, end_date, status').neq('status', 'Annulée'),
      ]);

      if (error) throw error;
      setContacts(data || []);

      // Compteur de locations par contact
      const counts = {};
      (resData || []).forEach(r => {
        if (r.contact_id) counts[r.contact_id] = (counts[r.contact_id] || 0) + 1;
      });
      setReservationCounts(counts);

      // Clients à relancer : dernière location terminée > 14 jours
      const now = new Date();
      const lastRentalMap = {};
      (resData || []).filter(r => r.status === 'Terminée').forEach(r => {
        if (!r.contact_id) return;
        if (!lastRentalMap[r.contact_id] || r.end_date > lastRentalMap[r.contact_id]) {
          lastRentalMap[r.contact_id] = r.end_date;
        }
      });
      const toFollow = (data || [])
        .filter(c => lastRentalMap[c.id])
        .map(c => ({ ...c, daysAgo: differenceInDays(now, parseISO(lastRentalMap[c.id])) }))
        .filter(c => c.daysAgo >= 14)
        .sort((a, b) => a.daysAgo - b.daysAgo);
      setClientsToFollow(toFollow);

    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({ title: "Erreur", description: "Impossible de charger les contacts.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = () => {
    setContactToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (contact) => {
    setContactToEdit(contact);
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (contact) => {
    setContactToDelete(contact);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactToDelete.id);

      if (error) throw error;

      await historyService.logEvent({
        type: 'contact_deleted',
        title: `Contact supprimé: ${contactToDelete.name}`,
        description: `Le contact ${contactToDelete.name} a été supprimé définitivement.`,
        metadata: { name: contactToDelete.name }
      });

      setContacts(prev => prev.filter(c => c.id !== contactToDelete.id));

      toast({
        title: "Contact supprimé",
        description: "Le contact a été supprimé avec succès.",
        className: "bg-green-50 border-green-200 text-green-900",
      });
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer ce contact.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  const handleContactSaved = (savedContact) => {
    setContacts(prev => {
      const exists = prev.find(c => c.id === savedContact.id);
      if (exists) {
        return prev.map(c => c.id === savedContact.id ? savedContact : c);
      } else {
        return [savedContact, ...prev];
      }
    });
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const { paginated: paginatedContacts, page, setPage, totalPages, total, from, perPage } = usePagination(filteredContacts, 10);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {showRelance ? 'Clients à relancer' : 'Contacts & Clients'}
          </h1>
          <p className="text-slate-600 mt-1">
            {showRelance
              ? `${clientsToFollow.length} client${clientsToFollow.length > 1 ? 's' : ''} sans location depuis plus de 14 jours`
              : 'Gérez vos relations clients et partenaires'}
          </p>
        </div>
        <div className="flex gap-3">
          {showRelance ? (
            <Button variant="outline" onClick={() => setShowRelance(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Retour aux contacts
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRelance(true)}
                className="border-blue-200 text-blue-700 hover:bg-blue-50 relative"
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                Clients à relancer
                {clientsToFollow.length > 0 && (
                  <span className="ml-2 bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {clientsToFollow.length}
                  </span>
                )}
              </Button>
              <Button onClick={handleAddContact} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un contact
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Vue Clients à relancer */}
      {showRelance && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {clientsToFollow.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="h-14 w-14 text-green-400 mb-4" />
              <p className="text-xl font-bold text-slate-800">Votre équipe est au top !</p>
              <p className="text-slate-500 mt-2 max-w-sm">
                Tous vos clients ont été contactés récemment. Revenez dans quelques jours pour voir qui nécessite une relance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientsToFollow.map((client) => (
                <div key={client.id} className={`rounded-xl border p-5 ${
                  client.daysAgo >= 42 ? 'bg-red-50 border-red-200' :
                  client.daysAgo >= 28 ? 'bg-orange-50 border-orange-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {client.name?.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{client.name}</p>
                      <div className={`flex items-center gap-1 text-xs font-semibold mt-0.5 ${
                        client.daysAgo >= 42 ? 'text-red-600' :
                        client.daysAgo >= 28 ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        <Clock className="h-3 w-3" />
                        {client.daysAgo >= 42
                          ? `Inactif depuis ${Math.round(client.daysAgo / 7)} semaines`
                          : `Dernière location il y a ${client.daysAgo} jours`}
                      </div>
                    </div>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium">{client.phone}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-3 border-t border-white/60">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-white"
                      onClick={() => { setContactToEdit(client); setIsAddModalOpen(true); }}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" /> Fiche
                    </Button>
                    {client.phone && (
                      <a
                        href={`tel:${client.phone}`}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold bg-blue-600 text-white rounded-md px-3 py-1.5 hover:bg-blue-700 transition-colors"
                      >
                        <PhoneCall className="h-3.5 w-3.5" /> Appeler
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vue liste contacts normale */}
      {!showRelance && <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, entreprise ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {isLoading ? (
          <SkeletonCards count={6} />
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg font-medium">Aucun contact trouvé</p>
            <p className="text-sm mt-1">Commencez par ajouter un nouveau contact.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedContacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md hover:border-blue-200 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                onClick={() => { setViewContact(contact); setIsViewModalOpen(true); }}
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        {contact.name ? contact.name.substring(0, 2).toUpperCase() : '??'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg leading-tight">{contact.name}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                          contact.status === 'Active' ? 'bg-green-100 text-green-700' : 
                          contact.status === 'Lead' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {contact.status === 'Active' ? 'Actif' : contact.status === 'Lead' ? 'Prospect' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {contact.company && (
                      <div className="flex items-center gap-2.5 text-sm text-slate-700">
                        <Building className="h-4 w-4 text-slate-400" />
                        <span className="font-medium">{contact.company}</span>
                        {contact.position && <span className="text-slate-500 text-xs">({contact.position})</span>}
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2.5 text-sm text-slate-600">
                        <Phone className="h-4 w-4 text-slate-400" />
                        {contact.phone}
                      </div>
                    )}
                    {(contact.city || contact.country) && (
                      <div className="flex items-center gap-2.5 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {contact.city}{contact.city && contact.country ? ', ' : ''}{contact.country}
                      </div>
                    )}
                  </div>
                </div>

                {/* Satisfaction & Remarque */}
                {(contact.satisfaction || contact.action_requise || contact.remarque_type) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {contact.satisfaction && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                        <MessageSquare className="h-3 w-3" />
                        {contact.satisfaction}
                      </span>
                    )}
                    {contact.remarque_type && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        contact.remarque_type === 'Réclamation' ? 'bg-red-50 text-red-700 border-red-100' :
                        contact.remarque_type === 'Félicitation' ? 'bg-green-50 text-green-700 border-green-100' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {contact.remarque_type}
                      </span>
                    )}
                    {contact.action_requise && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                        <AlertCircle className="h-3 w-3" />
                        Action requise
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center" onClick={e => e.stopPropagation()}>
                    <p className="text-xs text-slate-500">
                      Locations: <span className="font-semibold text-slate-900">{reservationCounts[contact.id] || 0}</span>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3"
                        onClick={() => handleEdit(contact)}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                        onClick={() => handleDeleteClick(contact)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        <PaginationBar page={page} setPage={setPage} totalPages={totalPages} total={total} from={from} perPage={perPage} />
      </div>}

      {/* Add/Edit Modal */}
      <AddContactModal 
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onContactSaved={handleContactSaved}
        contactToEdit={contactToEdit}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer le client <strong>{contactToDelete?.name}</strong>.
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

      {/* Modal consultation client */}
      <ViewContactModal
        contact={viewContact}
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        onEdit={(c) => { setContactToEdit(c); setIsAddModalOpen(true); }}
        onSaved={() => { fetchContacts(); setIsViewModalOpen(false); }}
      />
    </div>
  );
};

export default Contacts;