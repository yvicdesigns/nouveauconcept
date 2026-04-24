import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Download, Eye, Trash2, Edit, Receipt, Loader2, FileDown } from 'lucide-react';
import usePagination from '@/hooks/usePagination';
import PaginationBar from '@/components/ui/PaginationBar';
import { SkeletonRows } from '@/components/ui/SkeletonTable';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { historyService } from '@/lib/historyService';
import AddInvoiceModal from '@/components/modals/AddInvoiceModal';
import ViewInvoiceModal from '@/components/modals/ViewInvoiceModal';
import ContactDetailSheet from '@/components/modals/ContactDetailSheet';
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
  const [contactSheet, setContactSheet] = useState({ open: false, name: null });

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

  const downloadPDF = async (invoice) => {
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      // Render invoice in a hidden off-screen div
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;padding:32px;font-family:sans-serif;';
      container.innerHTML = buildInvoiceHTML(invoice);
      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(container);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const imgH  = pageW * (canvas.height / canvas.width);
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, imgH);
      pdf.save(`Facture-${invoice.invoice_number}.pdf`);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de générer le PDF.', variant: 'destructive' });
    }
  };

  const buildInvoiceHTML = (inv) => `
    <div style="color:#1e293b;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e2e8f0;padding-bottom:24px;margin-bottom:24px;">
        <div>
          <h1 style="font-size:22px;font-weight:800;margin:0;">NOUVEAU CONCEPT</h1>
          <p style="color:#64748b;margin:4px 0 12px;">Location de Voitures de Luxe</p>
          <p style="font-size:13px;color:#475569;line-height:1.6;margin:0;">Abidjan, Côte d'Ivoire<br/>contact@nouveauconcept.ci<br/>+225 07 00 00 00</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:36px;font-weight:200;color:#cbd5e1;margin:0 0 12px;">FACTURE</p>
          <p style="font-size:13px;margin:2px 0;"><strong>N° :</strong> ${inv.invoice_number}</p>
          <p style="font-size:13px;margin:2px 0;"><strong>Émission :</strong> ${inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('fr-FR') : '—'}</p>
          <p style="font-size:13px;margin:2px 0;"><strong>Échéance :</strong> ${inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—'}</p>
          <span style="display:inline-block;margin-top:8px;padding:3px 12px;border-radius:999px;font-size:11px;font-weight:700;background:${inv.status==='Payé'?'#dcfce7':'#f1f5f9'};color:${inv.status==='Payé'?'#15803d':'#475569'};">${inv.status}</span>
        </div>
      </div>
      <div style="margin-bottom:24px;"><p style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;margin:0 0 6px;">Facturer à</p><p style="font-size:17px;font-weight:700;margin:0;">${inv.client_name}</p></div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead><tr style="border-bottom:2px solid #e2e8f0;">
          <th style="text-align:left;padding:8px 0;font-size:12px;font-weight:700;">Description</th>
          <th style="text-align:right;padding:8px 0;font-size:12px;font-weight:700;">P.U.</th>
          <th style="text-align:right;padding:8px 0;font-size:12px;font-weight:700;">Jours</th>
          <th style="text-align:right;padding:8px 0;font-size:12px;font-weight:700;">Total</th>
        </tr></thead>
        <tbody><tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:12px 0;font-size:13px;"><strong>Location Véhicule</strong><br/><span style="color:#64748b;">${inv.vehicle_details||''}</span></td>
          <td style="padding:12px 0;text-align:right;font-size:13px;">${Number(inv.daily_rate||0).toLocaleString('fr-FR')} FCFA</td>
          <td style="padding:12px 0;text-align:right;font-size:13px;">${inv.days_count||0}</td>
          <td style="padding:12px 0;text-align:right;font-size:13px;font-weight:700;">${Number(inv.subtotal||0).toLocaleString('fr-FR')} FCFA</td>
        </tr></tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
        <div style="width:220px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:#64748b;">Sous-total :</span><span>${Number(inv.subtotal||0).toLocaleString('fr-FR')} FCFA</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:#64748b;">TVA (20%) :</span><span>${Number(inv.tax_amount||0).toLocaleString('fr-FR')} FCFA</span></div>
          <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;border-top:2px solid #e2e8f0;padding-top:8px;margin-top:8px;"><span>Total :</span><span style="color:#2563eb;">${Number(inv.total_amount||0).toLocaleString('fr-FR')} FCFA</span></div>
        </div>
      </div>
      ${inv.notes ? `<div style="background:#f8fafc;border-radius:8px;padding:12px;font-size:12px;color:#475569;"><strong>Notes :</strong> ${inv.notes}</div>` : ''}
      <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;">Merci de votre confiance — Conditions : paiement dû à la date d'échéance.</p>
    </div>`;

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
  const { paginated: paginatedInvoices, page, setPage, totalPages, total, from, perPage } = usePagination(filteredInvoices, 10);

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
            <table className="w-full text-sm"><tbody><SkeletonRows rows={8} cols={7} /></tbody></table>
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
                {paginatedInvoices.map((invoice, index) => (
                  <motion.tr
                    key={invoice.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">{invoice.invoice_number}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setContactSheet({ open: true, name: invoice.client_name })}
                        className="font-medium text-slate-900 hover:text-blue-600 hover:underline transition-colors text-left cursor-pointer"
                      >
                        {invoice.client_name}
                      </button>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => downloadPDF(invoice)} title="Télécharger PDF">
                          <FileDown className="h-4 w-4" />
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
          <PaginationBar page={page} setPage={setPage} totalPages={totalPages} total={total} from={from} perPage={perPage} />
        </div>
      </div>

      <ContactDetailSheet
        open={contactSheet.open}
        onOpenChange={(o) => { if (!o) setContactSheet({ open: false, name: null }); }}
        contactName={contactSheet.name}
      />

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