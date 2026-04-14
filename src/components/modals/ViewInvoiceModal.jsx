import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, FileText, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
      const ratio  = canvas.height / canvas.width;
      const imgH   = pageW * ratio;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-white/95 backdrop-blur-sm print:hidden">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Facture {invoice.invoice_number}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={printInvoice}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
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

        <div className="p-8 print:p-0" id="invoice-content">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-8 border-b">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">NOUVEAU CONCEPT</h1>
              <p className="text-slate-500 mt-1">Location de Voitures de Luxe</p>
              <div className="mt-4 text-sm text-slate-600">
                <p>123 Avenue de la République</p>
                <p>75011 Paris, France</p>
                <p>contact@nouveauconcept.fr</p>
                <p>+33 1 23 45 67 89</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-light text-slate-300 mb-4">FACTURE</h2>
              <div className="space-y-1 text-sm">
                <p><span className="text-slate-500 font-medium">Numéro:</span> <span className="font-bold text-slate-900">{invoice.invoice_number}</span></p>
                <p><span className="text-slate-500 font-medium">Date d'émission:</span> <span className="text-slate-900">{format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: fr })}</span></p>
                <p><span className="text-slate-500 font-medium">Date d'échéance:</span> <span className="text-slate-900">{format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: fr })}</span></p>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mt-2 ${
                  invoice.status === 'Payé' ? 'bg-green-100 text-green-700 border border-green-200' : 
                  invoice.status === 'En retard' ? 'bg-red-100 text-red-700 border border-red-200' : 
                  'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {invoice.status}
                </div>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Facturer à</h3>
            <div className="text-slate-900">
              <p className="font-bold text-lg">{invoice.client_name}</p>
              {/* Future: Add address if available in invoice data */}
            </div>
          </div>

          {/* Table */}
          <div className="mb-8">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="py-3 text-sm font-bold text-slate-900 w-1/2">Description</th>
                  <th className="py-3 text-sm font-bold text-slate-900 text-right">Prix Unitaire</th>
                  <th className="py-3 text-sm font-bold text-slate-900 text-right">Jours</th>
                  <th className="py-3 text-sm font-bold text-slate-900 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                <tr className="border-b border-slate-50">
                  <td className="py-4">
                    <p className="font-bold text-slate-900">Location Véhicule</p>
                    <p className="text-slate-500">{invoice.vehicle_details}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Du {format(new Date(invoice.start_date), 'dd/MM/yyyy')} au {format(new Date(invoice.end_date), 'dd/MM/yyyy')}
                    </p>
                  </td>
                  <td className="py-4 text-right align-top">{Number(invoice.daily_rate).toLocaleString()} FCFA</td>
                  <td className="py-4 text-right align-top">{invoice.days_count}</td>
                  <td className="py-4 text-right align-top font-bold text-slate-900">{Number(invoice.subtotal).toLocaleString()} FCFA</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Sous-total:</span>
                <span className="font-medium text-slate-900">{Number(invoice.subtotal).toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">TVA (20%):</span>
                <span className="font-medium text-slate-900">{Number(invoice.tax_amount).toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-4">
                <span className="text-base font-bold text-slate-900">Total:</span>
                <span className="text-xl font-bold text-blue-600">{Number(invoice.total_amount).toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>

          {/* Footer Notes */}
          {invoice.notes && (
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 mb-8">
              <p className="font-bold text-slate-900 mb-1">Notes & Instructions:</p>
              <p>{invoice.notes}</p>
            </div>
          )}

          <div className="text-center text-xs text-slate-400 mt-12 pt-8 border-t">
            <p>Merci de votre confiance.</p>
            <p>Conditions de paiement : paiement dû à la date d'échéance indiquée.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewInvoiceModal;