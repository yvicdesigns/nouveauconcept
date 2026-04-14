import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PaginationBar = ({ page, setPage, totalPages, total, perPage, from }) => {
  if (totalPages <= 1) return null;

  const to   = Math.min(from + perPage, total);
  const pages = buildPages(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
      <p className="text-sm text-slate-500">
        <span className="font-medium text-slate-700">{from + 1}–{to}</span> sur{' '}
        <span className="font-medium text-slate-700">{total}</span> résultat{total !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="h-8 w-8 flex items-center justify-center text-slate-400 text-sm select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-8 w-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all
                ${p === page
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'}`}>
              {p}
            </button>
          )
        )}

        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Génère la liste de pages avec ellipses : [1, 2, 3, …, 10]
const buildPages = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', total);
  } else if (current >= total - 3) {
    pages.push(1, '…', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '…', current - 1, current, current + 1, '…', total);
  }
  return pages;
};

export default PaginationBar;
