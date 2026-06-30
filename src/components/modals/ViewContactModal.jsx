import React, { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, Building, Edit, PhoneCall, Calendar, Banknote, Hash, AlertCircle, Save, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { differenceInDays, parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';

const satisfactionOptions = [
  { value: '😊 Très satisfait',    label: '😊 Très satisfait',    color: 'bg-green-100 text-green-700' },
  { value: '🙂 Satisfait',         label: '🙂 Satisfait',         color: 'bg-teal-100 text-teal-700' },
  { value: '😐 Neutre',            label: '😐 Neutre',            color: 'bg-slate-100 text-slate-600' },
  { value: '😕 Insatisfait',       label: '😕 Insatisfait',       color: 'bg-orange-100 text-orange-700' },
  { value: '😠 Très insatisfait',  label: '😠 Très insatisfait',  color: 'bg-red-100 text-red-700' },
];

const remarqueTypes = ['Félicitation', 'Réclamation', 'Suggestion', 'Observation'];

const statusConfig = {
  Active:   { label: 'Actif',    color: 'bg-green-100 text-green-700 border-green-200' },
  Lead:     { label: 'Prospect', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  Inactive: { label: 'Inactif',  color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const ViewContactModal = ({ contact, open, onOpenChange, onEdit, onSaved }) => {
  const { toast } = useToast();
  const [history, setHistory] = useState({ count: 0, lastDate: null, total: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [editable, setEditable] = useState({
    status: '', satisfaction: '', remarque_type: '', remarque: '', action_requise: false,
  });

  useEffect(() => {
    if (!open || !contact) return;
    setEditable({
      status: contact.status || 'Active',
      satisfaction: contact.satisfaction || '',
      remarque_type: contact.remarque_type || '',
      remarque: contact.remarque || '',
      action_requise: contact.action_requise || false,
    });
    fetchHistory();
  }, [open, contact]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('reservations')
      .select('total_price, end_date, status')
      .eq('contact_id', contact.id)
      .neq('status', 'Annulée');
    if (!data) return;
    const count = data.length;
    const total = data.reduce((s, r) => s + (Number(r.total_price) || 0), 0);
    const done = data.filter(r => r.status === 'Terminée' && r.end_date).sort((a, b) => b.end_date.localeCompare(a.end_date));
    const lastDate = done[0]?.end_date || null;
    setHistory({ count, total, lastDate });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('contacts').update(editable).eq('id', contact.id);
    setIsSaving(false);
    if (error) {
      toast({ title: 'Erreur', description: "Impossible de sauvegarder.", variant: 'destructive' });
      return;
    }
    toast({ title: 'Enregistré', description: 'Fiche client mise à jour.' });
    onSaved?.();
  };

  if (!contact) return null;

  const initials = contact.name?.substring(0, 2).toUpperCase() || '??';
  const satConfig = satisfactionOptions.find(o => o.value === editable.satisfaction);
  const daysAgo = history.lastDate ? differenceInDays(new Date(), parseISO(history.lastDate)) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-lg">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{contact.name}</h2>
              {contact.company && (
                <p className="text-slate-300 text-sm mt-0.5">
                  {contact.company}{contact.position ? ` — ${contact.position}` : ''}
                </p>
              )}
              {/* Statut inline éditable */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {Object.entries(statusConfig).map(([val, cfg]) => (
                  <button
                    key={val}
                    onClick={() => setEditable(p => ({ ...p, status: val }))}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      editable.status === val
                        ? cfg.color + ' ring-2 ring-white/40 shadow'
                        : 'bg-white/10 text-white/60 border-white/20 hover:bg-white/20'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white mt-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[65vh]">
          {/* Coordonnées */}
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Coordonnées</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors group">
                  <div className="p-2 bg-white rounded-lg shadow-sm"><Phone className="h-4 w-4 text-blue-600" /></div>
                  <div>
                    <p className="text-xs text-slate-400">Téléphone</p>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{contact.phone}</p>
                  </div>
                  <PhoneCall className="h-3.5 w-3.5 text-blue-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors">
                  <div className="p-2 bg-white rounded-lg shadow-sm"><Mail className="h-4 w-4 text-purple-600" /></div>
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{contact.email}</p>
                  </div>
                </a>
              )}
              {(contact.city || contact.country) && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="p-2 bg-white rounded-lg shadow-sm"><MapPin className="h-4 w-4 text-green-600" /></div>
                  <div>
                    <p className="text-xs text-slate-400">Localisation</p>
                    <p className="text-sm font-semibold text-slate-800">{[contact.city, contact.country].filter(Boolean).join(', ')}</p>
                  </div>
                </div>
              )}
              {contact.address && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="p-2 bg-white rounded-lg shadow-sm"><Building className="h-4 w-4 text-orange-600" /></div>
                  <div>
                    <p className="text-xs text-slate-400">Adresse</p>
                    <p className="text-sm font-semibold text-slate-800">{contact.address}</p>
                  </div>
                </div>
              )}
            </div>
            {contact.notes && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-slate-700">
                <span className="font-semibold text-amber-700 text-xs uppercase tracking-wide block mb-1">Notes internes</span>
                {contact.notes}
              </div>
            )}
          </div>

          {/* Historique */}
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Historique locations</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Hash className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-800">{history.count}</p>
                <p className="text-xs text-blue-600">Location{history.count > 1 ? 's' : ''}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
                <Banknote className="h-4 w-4 text-green-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-800">{history.total.toLocaleString()}</p>
                <p className="text-xs text-green-600">FCFA total</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <Calendar className="h-4 w-4 text-slate-500 mx-auto mb-1" />
                {history.lastDate ? (
                  <>
                    <p className="text-sm font-bold text-slate-800">{format(parseISO(history.lastDate), 'd MMM yy', { locale: fr })}</p>
                    <p className="text-xs text-slate-500">Il y a {daysAgo}j</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Aucune location terminée</p>
                )}
              </div>
            </div>
          </div>

          {/* Satisfaction & Remarques — ÉDITABLES */}
          <div className="p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Satisfaction & Remarques</h3>

            {/* Satisfaction */}
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Niveau de satisfaction</p>
              <div className="flex flex-wrap gap-2">
                {satisfactionOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setEditable(p => ({ ...p, satisfaction: p.satisfaction === opt.value ? '' : opt.value }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      editable.satisfaction === opt.value
                        ? opt.color + ' border-current ring-2 ring-offset-1 ring-current/30'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Type de remarque */}
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Type de remarque</p>
              <div className="flex flex-wrap gap-2">
                {remarqueTypes.map(t => (
                  <button
                    key={t}
                    onClick={() => setEditable(p => ({ ...p, remarque_type: p.remarque_type === t ? '' : t }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      editable.remarque_type === t
                        ? t === 'Réclamation' ? 'bg-red-100 text-red-700 border-red-200 ring-2 ring-red-200'
                        : t === 'Félicitation' ? 'bg-green-100 text-green-700 border-green-200 ring-2 ring-green-200'
                        : 'bg-blue-100 text-blue-700 border-blue-200 ring-2 ring-blue-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Remarque texte */}
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Note détaillée</p>
              <textarea
                value={editable.remarque}
                onChange={e => setEditable(p => ({ ...p, remarque: e.target.value }))}
                rows={3}
                placeholder="Observations, retours client, points d'attention..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-slate-50"
              />
            </div>

            {/* Action requise */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setEditable(p => ({ ...p, action_requise: !p.action_requise }))}
                className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${editable.action_requise ? 'bg-orange-500' : 'bg-slate-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${editable.action_requise ? 'translate-x-4' : ''}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Action requise</p>
                <p className="text-xs text-slate-400">Marque ce client comme nécessitant un suivi particulier</p>
              </div>
              {editable.action_requise && (
                <span className="ml-auto flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-full">
                  <AlertCircle className="h-3 w-3" /> Suivi requis
                </span>
              )}
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <Button variant="outline" onClick={() => { onOpenChange(false); onEdit?.(contact); }} className="gap-2">
            <Edit className="h-4 w-4" /> Modifier les infos
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-nc-navy hover:bg-nc-navy-light text-white gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewContactModal;
