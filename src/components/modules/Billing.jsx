import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Download, Eye, Trash2, Edit, Receipt, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import AddInvoiceModal from '@/components/modals/AddInvoiceModal';
import ViewInvoiceModal from '@/components/modals/ViewInvoiceModal';
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

const Billing = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [invoiceToView, setInvoiceToView] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les factures.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Payé': return 'bg-green-100 text-green-700';
      case 'Envoyé': return 'bg-blue-100 text-blue-700';
      case 'En retard': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700'; // Brouillon
    }
  };

  const handleAdd = () => {
    setInvoiceToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (invoice) => {
    setInvoiceToEdit(invoice);
    setIsAddModalOpen(true);
  };

  const handleView = (invoice) => {
    setInvoiceToView(invoice);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (invoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceToDelete.id);

      if (error) throw error;

      await historyService.logEvent({
        type: 'invoice_deleted',
        title: `Facture supprimée`,
        description: `La facture ${invoiceToDelete.invoice_number} a été supprimée.`,
        metadata: { invoice_number: invoiceToDelete.invoice_number }
      });

      setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));

      toast({
        title: "Facture supprimée",
        description: "La facture a été supprimée avec succès.",
        className: "bg-green-50 border-green-200 text-green-900",
      });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer cette facture.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const handleInvoiceSaved = (savedInvoice) => {
    setInvoices(prev => {
      const exists = prev.find(inv => inv.id === savedInvoice.id);
      if (exists) {
        return prev.map(inv => inv.id === savedInvoice.id ? savedInvoice : inv);
      } else {
        return [savedInvoice, ...prev];
      }
    });
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Metrics
  const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  const pendingAmount = invoices.filter(i => i.status === 'Envoyé' || i.status === 'Brouillon').reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  const overdueAmount = invoices.filter(i => i.status === 'En retard').reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Facturation</h1>
          <p className="text-slate-600 mt-1">Gérez vos paiements et factures clients</p>
        </div>
        <Button onClick={handleAdd} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Créer une facture
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm text-slate-600 mb-2">Chiffre d'Affaires (Total)</p>
          <p className="text-3xl font-bold text-slate-900">{totalRevenue.toLocaleString()} FCFA</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm text-slate-600 mb-2">En attente de paiement</p>
          <p className="text-3xl font-bold text-blue-600">{pendingAmount.toLocaleString()} FCFA</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm text-slate-600 mb-2">En retard</p>
          <p className="text-3xl font-bold text-red-600">{overdueAmount.toLocaleString()} FCFA</p>
        </motion.div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par n° facture ou client..."
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
          ) : filteredInvoices.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-slate-500">
               <Receipt className="h-12 w-12 mb-4 text-slate-300" />
               <p className="text-lg font-medium">Aucune facture trouvée</p>
               <p className="text-sm">Créez votre première facture pour commencer.</p>
             </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Numéro</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Émission</th>
                  <th className="px-6 py-4">Échéance</th>
                  <th className="px-6 py-4 text-right">Montant TTC</th>
                  <th className="px-6 py-4 text-center">Statut</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((invoice, index) => (
                  <motion.tr
                    key={invoice.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">{invoice.invoice_number}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{invoice.client_name}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[200px]" title={invoice.vehicle_details}>{invoice.vehicle_details}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: fr })}</td>
                    <td className="px-6 py-4 text-slate-600">{format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: fr })}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{Number(invoice.total_amount).toLocaleString()} FCFA</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleView(invoice)} title="Voir">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100" onClick={() => handleEdit(invoice)} title="Modifier">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDeleteClick(invoice)} title="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddInvoiceModal 
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onInvoiceSaved={handleInvoiceSaved}
        invoiceToEdit={invoiceToEdit}
      />

      <ViewInvoiceModal 
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        invoice={invoiceToView}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La facture <strong>{invoiceToDelete?.invoice_number}</strong> sera définitivement effacée.
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

export default Billing;