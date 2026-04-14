import { useState, useEffect } from 'react';

const usePagination = (items = [], perPage = 10) => {
  const [page, setPage] = useState(1);

  // Revenir à la page 1 quand les items changent (filtre/recherche)
  useEffect(() => { setPage(1); }, [items.length]);

  const total      = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage   = Math.min(page, totalPages);
  const from       = (safePage - 1) * perPage;
  const paginated  = items.slice(from, from + perPage);

  return { paginated, page: safePage, setPage, totalPages, total, from, perPage };
};

export default usePagination;
