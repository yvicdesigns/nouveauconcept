import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Phone, Building, MapPin, Calendar, Receipt, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const statusResColor = (s) => {
  switch (s) {
    case 'Confirmée': return 'bg-green-100 text-green-700';
    case 'En cours':  return 'bg-blue-100 text-blue-700';
    case 'Terminée':  return 'bg-gray-100 text-gray-600';
    case 'Annulée':   return 'bg-red-100 text-red-700';
    default:          return 'bg-yellow-100 text-yellow-700';
  }
};

const statusInvColor = (s) => {
  switch (s) {
    case 'Payé':      return 'bg-green-100 text-green-700';
    case 'Envoyé':    return 'bg-blue-100 text-blue-700';
    case 'En retard': return 'bg-red-100 text-red-700';
    default:          return 'bg-slate-100 text-slate-600';
  }
};

const ContactDetailSheet = ({ open, onOpenChange, contactId, contactName }) => {
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && (contactId || contactName)) {
      fetchData();
    }
    if (!open) {
      setContact(null);
      setReservations([]);
      setInvoices([]);
    }
  }, [open, contactId, contactName]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let contactData;
      if (contactId) {
        const { data } = await supabase.from('contacts').select('*').eq('id', contactId).single();
        contactData = data;
      } else {
        const { data } = await supabase.from('contacts').select('*').ilike('name', contactName).limit(1).maybeSingle();
        contactData = data;
      }

      if (!contactData) { setIsLoading(false); return; }
      setContact(contactData);

      const [{ data: resData }, { data: invData }] = await Promise.all([
        supabase
          .from('reservations')
          .select('id, start_date, end_date, status, total_price, vehicles(name, brand, model)')
          .eq('contact_id', contactData.id)
          .order('start_date', { ascending: false })
          .limit(10),
        supabase
          .from('invoices')
          .select('id, invoice_number, total_amount, status, issue_date')
          .ilike('client_name', contactData.name)
          .order('issue_date', { ascending: false })
          .limit(10),
      ]);

      setReservations(resData || []);
      setInvoices(invData || []);
    } catch (err) {
      console.error('ContactDetailSheet error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const initials = contact?.name
    ? contact.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : !contact ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <p className="text-sm">Contact introuvable</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 px-6 pt-8 pb-6">
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-2xl shadow">
                    {initials}
                  </div>
                  <div>
                    <SheetTitle className="text-white text-xl font-bold">{contact.name}</SheetTitle>
                    {contact.company && (
                      <p className="text-blue-100 text-sm mt-0.5">{contact.company}</p>
                    )}
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      contact.status === 'Active' ? 'bg-green-400/30 text-white' : 'bg-white/20 text-white'
                    }`}>
                      {contact.status === 'Active' ? 'Actif' : contact.status === 'Lead' ? 'Prospect' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </SheetHeader>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-5">
              {/* Contact info */}
              <div className="space-y-2.5">
                {contact.email && (
                  <a href={`mailto:${contact.email}`}
                    className="flex items-center gap-3 text-sm text-slate-600 hover:text-blue-600 transition-colors group">
                    <div className="p-1.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <Mail className="h-4 w-4 text-blue-500" />
                    </div>
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`}
                    className="flex items-center gap-3 text-sm text-slate-600 hover:text-green-600 transition-colors group">
                    <div className="p-1.5 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                      <Phone className="h-4 w-4 text-green-500" />
                    </div>
                    {contact.phone}
                  </a>
                )}
                {contact.company && (
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="p-1.5 bg-purple-50 rounded-lg">
                      <Building className="h-4 w-4 text-purple-500" />
                    </div>
                    {contact.company}
                    {contact.position && <span className="text-slate-400 text-xs">({contact.position})</span>}
                  </div>
                )}
                {(contact.city || contact.country) && (
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="p-1.5 bg-orange-50 rounded-lg">
                      <MapPin className="h-4 w-4 text-orange-400" />
                    </div>
                    {[contact.city, contact.country].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="reservations">
                <TabsList className="w-full">
                  <TabsTrigger value="reservations" className="flex-1 gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Réservations
                    <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {reservations.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="invoices" className="flex-1 gap-1.5">
                    <Receipt className="h-3.5 w-3.5" />
                    Factures
                    <span className="ml-1 bg-purple-100 text-purple-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {invoices.length}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reservations" className="mt-3 space-y-2">
                  {reservations.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-6">Aucune réservation</p>
                  ) : reservations.map(r => (
                    <div key={r.id}
                      onClick={() => { navigate('/reservations'); onOpenChange(false); }}
                      className="flex items-start justify-between p-3 bg-slate-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group border border-transparent hover:border-blue-100">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {r.vehicles?.name || `${r.vehicles?.brand} ${r.vehicles?.model}`}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {r.start_date ? format(new Date(r.start_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                          {' → '}
                          {r.end_date ? format(new Date(r.end_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                        </p>
                        {r.total_price && (
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">
                            {Number(r.total_price).toLocaleString()} FCFA
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusResColor(r.status)}`}>
                          {r.status}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-400" />
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="invoices" className="mt-3 space-y-2">
                  {invoices.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-6">Aucune facture</p>
                  ) : invoices.map(inv => (
                    <div key={inv.id}
                      onClick={() => { navigate('/billing'); onOpenChange(false); }}
                      className="flex items-start justify-between p-3 bg-slate-50 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors group border border-transparent hover:border-purple-100">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{inv.invoice_number}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {inv.issue_date ? format(new Date(inv.issue_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                        </p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">
                          {Number(inv.total_amount).toLocaleString()} FCFA
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusInvColor(inv.status)}`}>
                          {inv.status}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-purple-400" />
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ContactDetailSheet;
