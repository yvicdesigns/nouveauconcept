import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Skeleton stats cards (haut de page)
export const SkeletonStats = ({ count = 4 }) => (
  <div className={`grid grid-cols-2 md:grid-cols-${count} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-8 w-14" />
      </div>
    ))}
  </div>
);

// Skeleton tableau (lignes)
const SkeletonTable = ({ rows = 6, cols = 5 }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    {/* barre recherche */}
    <div className="p-5 border-b border-slate-100 flex gap-3">
      <Skeleton className="h-10 flex-1 max-w-md" />
      <Skeleton className="h-10 w-40" />
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-6 py-4">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j} className="px-6 py-4">
                  <Skeleton className={`h-4 ${j === 0 ? 'w-32' : j === cols - 1 ? 'w-16 mx-auto' : 'w-24'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Skeleton grille de cartes (Contacts, Véhicules…)
export const SkeletonCards = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 flex-1 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

// Skeleton lignes inline (dans un tbody existant ou un div)
export const SkeletonRows = ({ rows = 6, cols = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="border-b border-slate-100">
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="px-6 py-4">
            <Skeleton className={`h-4 ${j === 0 ? 'w-36' : j === cols - 1 ? 'w-16' : 'w-24'}`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export default SkeletonTable;
