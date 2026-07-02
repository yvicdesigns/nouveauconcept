import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ClientCombobox = ({ clients = [], value, onChange, placeholder = 'Rechercher un client...' }) => {
  const selected = clients.find(c => c.id === value);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = query.trim()
    ? clients.filter(c =>
        c.name?.toLowerCase().includes(query.toLowerCase()) ||
        c.company?.toLowerCase().includes(query.toLowerCase())
      )
    : clients;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (client) => {
    onChange(client.id);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setOpen(false);
  };

  const handleOpen = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      {!open ? (
        <button
          type="button"
          onClick={handleOpen}
          className={cn(
            'w-full flex items-center justify-between p-2.5 border border-slate-200 rounded-md bg-white text-sm transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-nc-navy',
            !selected && 'text-slate-400'
          )}
        >
          <span className="truncate">{selected ? selected.name + (selected.company ? ` (${selected.company})` : '') : placeholder}</span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {selected && (
              <span onClick={handleClear} className="p-0.5 text-slate-300 hover:text-slate-600 transition-colors cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </button>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Taper pour rechercher…"
            className="w-full pl-9 pr-4 py-2.5 border border-nc-navy rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nc-navy bg-white"
            onKeyDown={e => {
              if (e.key === 'Escape') { setOpen(false); setQuery(''); }
              if (e.key === 'Enter' && filtered.length === 1) handleSelect(filtered[0]);
            }}
          />
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">Aucun client trouvé</div>
          ) : (
            filtered.map(client => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleSelect(client)}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex flex-col',
                  value === client.id && 'bg-blue-50 text-nc-navy font-medium'
                )}
              >
                <span className="font-medium">{client.name}</span>
                {client.company && <span className="text-xs text-slate-400">{client.company}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ClientCombobox;
