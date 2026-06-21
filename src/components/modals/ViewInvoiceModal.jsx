import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, FileText, X, Loader2, Receipt, BadgeCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { printThermalReceipt, printPaymentReceipt } from '@/utils/printReceipt';

const ViewInvoiceModal = ({ open, onOpenChange, invoice }) => {
  const [isExporting, setIsExporting] = useState(false);
  if (!invoice) return null;

  const printInvoice = () => window.print();

  const downloadPDF = async () => {
    setIsExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const element = document.getElementById('invoice-content');
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgH = pageW * ratio;
      let posY = 0;
      if (imgH <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pageW, imgH);
      } else {
        let remaining = canvas.height;
        while (remaining > 0) {
          pdf.addImage(imgData, 'PNG', 0, posY, pageW, imgH);
          remaining -= canvas.height * (pageH / imgH);
          posY -= pageH;
          if (remaining > 0) pdf.addPage();
        }
      }
      pdf.save(`Facture-${invoice.invoice_number}.pdf`);
    } catch {
      alert('Erreur lors de la génération du PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');
  const fmtDate = (d) => {
    try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return '—'; }
  };
  const fmtDateLong = (d) => {
    try { return format(new Date(d), 'dd MMMM yyyy', { locale: fr }); } catch { return '—'; }
  };

  const resteAPayer = Math.max(
    0,
    Number(invoice.total_amount || 0) - Number(invoice.remise || 0) - Number(invoice.acompte || 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-white/95 backdrop-blur-sm print:hidden">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Facture {invoice.invoice_number}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => printThermalReceipt(invoice)}>
              <Receipt className="h-4 w-4 mr-2" />
              Ticket
            </Button>
            {invoice.status === 'Payé' && (
              <Button variant="outline" size="sm" onClick={() => printPaymentReceipt(invoice)}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                <BadgeCheck className="h-4 w-4 mr-2" />
                Reçu
              </Button>
            )}
            <Button size="sm" onClick={downloadPDF} disabled={isExporting}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[130px]">
              {isExporting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Export…</>
                : <><Download className="h-4 w-4 mr-2" />Télécharger PDF</>}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="p-8 print:p-6 text-slate-900 text-sm" id="invoice-content">

          {/* En-tête société + titre FACTURE */}
          <div className="flex justify-between items-start mb-6 pb-5 border-b-2 border-slate-800">
            <div>
              <h1 className="text-2xl font-extrabold uppercase tracking-wide text-slate-900">NOUVEAU CONCEPT</h1>
              <p className="text-slate-500 mt-0.5 text-xs uppercase tracking-wide">Location de Véhicules</p>
              <div className="mt-3 text-sm leading-6 text-slate-700">
                <p>Brazzaville, République du Congo</p>
                <p>contact@nouveauconcept.cg</p>
                <p>+242 06 XXX XX XX</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-5xl font-thin text-slate-200 uppercase tracking-widest">FACTURE</h2>
              <div className="mt-3 space-y-1 text-sm">
                <p><span className="text-slate-500">N° :</span> <strong className="text-slate-900">{invoice.invoice_number}</strong></p>
                <p><span className="text-slate-500">Date émission :</span> <span>{fmtDate(invoice.issue_date)}</span></p>
                <p><span className="text-slate-500">Date échéance :</span> <span>{fmtDate(invoice.due_date)}</span></p>
              </div>
              <div className={`inline-block mt-3 px-3 py-1 rounded text-xs font-bold uppercase border ${
                invoice.status === 'Payé' ? 'bg-green-100 text-green-700 border-green-300' :
                invoice.status === 'En retard' ? 'bg-red-100 text-red-700 border-red-300' :
                'bg-slate-100 text-slate-600 border-slate-300'
              }`}>
                {invoice.status}
              </div>
            </div>
          </div>

          {/* Infos client */}
          <div className="mb-6 p-4 bg-slate-50 rounded border border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Facturer à</p>
            <p className="font-bold text-base">{invoice.client_name}</p>
            {invoice.client_phone && (
              <p className="text-slate-600 mt-0.5">Tél : {invoice.client_phone}</p>
            )}
            {invoice.client_cni && (
              <p className="text-slate-600">N° CNI : {invoice.client_cni}</p>
            )}
          </div>

          {/* Tableau de la prestation */}
          <table className="w-full mb-6 border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-sm">
                <th className="py-2.5 px-3 text-left font-semibold">Désignation</th>
                <th className="py-2.5 px-3 text-center font-semibold w-28">Nbre de Jours</th>
                <th className="py-2.5 px-3 text-right font-semibold w-36">Prix Journalier</th>
                <th className="py-2.5 px-3 text-right font-semibold w-36">Prix Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-3 px-3">
                  <p className="font-semibold">Location de véhicule</p>
                  <p className="text-slate-500 text-xs mt-0.5">{invoice.vehicle_details}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Du {fmtDate(invoice.start_date)} au {fmtDate(invoice.end_date)}
                  </p>
                </td>
                <td className="py-3 px-3 text-center align-top">{invoice.days_count}</td>
                <td className="py-3 px-3 text-right align-top">{fmt(invoice.daily_rate)} FCFA</td>
                <td className="py-3 px-3 text-right align-top font-semibold">{fmt(invoice.subtotal)} FCFA</td>
              </tr>
            </tbody>
          </table>

          {/* Bloc récapitulatif financier */}
          <div className="flex justify-end mb-6">
            <div className="w-80">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 text-slate-600">Sous-total</td>
                    <td className="py-1.5 text-right font-medium">{fmt(invoice.subtotal)} FCFA</td>
                  </tr>
                  {Number(invoice.commission_amount) > 0 && (
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600">
                        Commission {invoice.commission_type ? `(${invoice.commission_type})` : ''}
                        {invoice.commission_rate > 0 && ` — ${invoice.commission_rate}%`}
                      </td>
                      <td className="py-1.5 text-right font-medium">{fmt(invoice.commission_amount)} FCFA</td>
                    </tr>
                  )}
                  {Number(invoice.remise) > 0 && (
                    <tr className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600">Remise</td>
                      <td className="py-1.5 text-right font-medium text-red-600">− {fmt(invoice.remise)} FCFA</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-slate-800">
                    <td className="py-2 font-bold text-base">Total</td>
                    <td className="py-2 text-right font-bold text-base text-blue-700">{fmt(invoice.total_amount)} FCFA</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 text-slate-600">Caution</td>
                    <td className="py-1.5 text-right">
                      {invoice.caution
                        ? <span className="font-medium">{fmt(invoice.caution_amount)} FCFA</span>
                        : <span className="text-slate-400 italic">Non</span>}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 text-slate-600">Acompte versé</td>
                    <td className="py-1.5 text-right font-medium">− {fmt(invoice.acompte)} FCFA</td>
                  </tr>
                  <tr className="border-t-2 border-green-700">
                    <td className="pt-2 pb-1 font-bold text-base text-green-800">Reste à payer</td>
                    <td className="pt-2 pb-1 text-right font-bold text-base text-green-800">{fmt(resteAPayer)} FCFA</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Mode de paiement */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mode de paiement</p>
              <p className="font-medium">{invoice.payment_method || 'Espèces'}</p>
            </div>
            {invoice.payment_conditions && (
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Conditions</p>
                <p>{invoice.payment_conditions}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-6 p-3 bg-amber-50 rounded border border-amber-200">
              <p className="font-bold text-amber-900 mb-0.5">Notes</p>
              <p className="text-amber-800">{invoice.notes}</p>
            </div>
          )}

          {/* Pied de page : Fait à Brazzaville + Signature */}
          <div className="mt-10 pt-6 border-t border-slate-200">
            <div className="flex justify-between items-end">
              <p className="text-slate-600">
                Fait à Brazzaville, le {fmtDateLong(invoice.issue_date)}
              </p>
              <div className="text-center">
                <div className="border border-slate-300 rounded w-52 h-24 flex items-center justify-center text-slate-400 text-xs">
                  Cachet et Signature
                </div>
              </div>
            </div>
            <div className="mt-8 text-center text-xs text-slate-400 border-t pt-4">
              <p className="font-medium">NOUVEAU CONCEPT — Brazzaville, République du Congo</p>
              <p className="mt-0.5">Merci de votre confiance.</p>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewInvoiceModal;
