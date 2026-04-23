import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Car, Calendar, Receipt, FileText, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const ICONS = {
  contact:     { icon: User,     label: 'Contact',     route: '/contacts',     color: 'text-blue-500',   bg: 'bg-blue-50' },
  vehicle:     { icon: Car,      label: 'Véhicule',    route: '/vehicles',     color: 'text-green-500',  bg: 'bg-green-50' },
  reservation: { icon: Calendar, label: 'Réservation', route: '/reservations', color: 'text-purple-500', bg: 'bg-purple-50' },
  invoice:     { icon: Receipt,  label: 'Facture',     route: '/billing',      color: 'text-orange-500', bg: 'bg-orange-50' },
  lead:        { icon: User,     label: 'Prospect',    route: '/leads',        color: 'text-indigo-500', bg: 'bg-indigo-50' },
};

const GlobalSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Fermer sur clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Raccourci clavier Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') { setIsOpen(false); setQuery(''); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) { setResults([]); setIsLoading(false); return; }
    setIsLoading(true);
    debounceRef.current = setTimeout(() => search(query.trim()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const search = async (q) => {
    const like = `%${q}%`;
    try {
      const [contacts, vehicles, reservations, invoices, leads] = await Promise.all([
        supabase.from('contacts').select('id, name, email, company').ilike('name', like).limit(3),
        supabase.from('vehicles').select('id, name, brand, model, license_plate').or(`name.ilike.${like},license_plate.ilike.${like}`).limit(3),
        supabase.from('reservations').select('id, contacts(name), vehicles(name), status').limit(3),
        supabase.from('invoices').select('id, invoice_number, client_name, total_amount').or(`invoice_number.ilike.${like},client_name.ilike.${like}`).limit(3),
        supabase.from('leads').select('id, name, email, status').ilike('name', like).limit(3),
      ]);

      const all = [
        ...(contacts.data || []).map(c => ({ type: 'contact',     id: c.id, title: c.name,            sub: c.company || c.email || '' })),
        ...(vehicles.data || []).map(v => ({ type: 'vehicle',     id: v.id, title: `${v.brand} ${v.model}`, sub: v.license_plate || '' })),
        ...(invoices.data || []).map(i => ({ type: 'invoice',     id: i.id, title: i.invoice_number,   sub: `${i.client_name} — ${Number(i.total_amount).toLocaleString()} FCFA` })),
        ...(leads.data    || []).map(l => ({ type: 'lead',        id: l.id, title: l.name,            sub: l.status || '' })),
      ];

      // Filtre réservations par nom client ou véhicule
      const filteredRes = (reservations.data || []).filter(r =>
        r.contacts?.name?.toLowerCase().includes(q.toLowerCase()) ||
        r.vehicles?.name?.toLowerCase().includes(q.toLowerCase())
      ).map(r => ({
        type: 'reservation', id: r.id,
        title: `Résa — ${r.contacts?.name || ''}`,
        sub: `${r.vehicles?.name || ''} · ${r.status}`,
      }));

      setResults([...all, ...filteredRes].slice(0, 8));
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (result) => {
    navigate(ICONS[result.type].route);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${isOpen ? 'border-blue-400 ring-2 ring-blue-100 bg-white' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'}`}>
        <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Rechercher… (⌘K)"
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
        />
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 flex-shrink-0" />}
        {query && !isLoading && (
          <button onClick={() => { setQuery(''); setResults([]); }} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (query.length >= 2) && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
            {results.length === 0 && !isLoading ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                Aucun résultat pour « {query} »
              </div>
            ) : (
              <ul className="py-1 max-h-80 overflow-y-auto">
                {results.map((r, i) => {
                  const meta = ICONS[r.type];
                  const Icon = meta.icon;
                  return (
                    <li key={`${r.type}-${r.id}-${i}`}>
                      <button onClick={() => handleSelect(r)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                        <div className={`p-1.5 rounded-lg flex-shrink-0 ${meta.bg}`}>
                          <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
                          {r.sub && <p className="text-xs text-slate-400 truncate">{r.sub}</p>}
                        </div>
                        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalSearch;
