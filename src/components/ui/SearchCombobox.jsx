import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Generic searchable combobox.
 * items: [{ id, label, sublabel? }]
 * allowFreeText: user can type any value not in the list (for drivers)
 */
const SearchCombobox = ({
  items = [],
  value = '',
  onChange,
  placeholder = 'Rechercher…',
  allowFreeText = false,
}) => {
  const selected = items.find(i => i.id === value);
  const displayValue = selected ? selected.label : value;

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = query.trim()
    ? items.filter(i =>
        i.label?.toLowerCase().includes(query.toLowerCase()) ||
        i.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  const exactMatch = items.some(i => i.label?.toLowerCase() === query.toLowerCase());

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (allowFreeText && query.trim() && !exactMatch) {
          onChange(query.trim());
        }
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [query, exactMatch, allowFreeText]);

  const handleSelect = (item) => {
    onChange(item.id);
    setOpen(false);
    setQuery('');
  };

  const handleFreeText = () => {
    onChange(query.trim());
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
      {!open ? (
        <button
          type="button"
          onClick={handleOpen}
          className={cn(
            'w-full flex items-center justify-between p-2.5 border border-slate-200 rounded-md bg-white text-sm transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-nc-navy',
            !displayValue && 'text-slate-400'
          )}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {value && (
              <span onClick={handleClear} className="p-0.5 text-slate-300 hover:text-slate-600 cursor-pointer">
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
              if (e.key === 'Enter') {
                if (filtered.length === 1) handleSelect(filtered[0]);
                else if (allowFreeText && query.trim()) handleFreeText();
              }
            }}
          />
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 && !allowFreeText && (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">Aucun résultat</div>
          )}
          {filtered.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex flex-col',
                value === item.id && 'bg-blue-50 text-nc-navy font-medium'
              )}
            >
              <span className="font-medium">{item.label}</span>
              {item.sublabel && <span className="text-xs text-slate-400">{item.sublabel}</span>}
            </button>
          ))}
          {allowFreeText && query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleFreeText}
              className="w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors border-t border-slate-100 font-medium"
            >
              ✏ Utiliser « {query.trim()} »
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchCombobox;
