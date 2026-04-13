import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { historyService } from '@/lib/historyService';
import HistoryLogList from '@/components/history/HistoryLogList';
import { motion } from 'framer-motion';

const History = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchLogs = async () => {
    setLoading(true);
    const result = await historyService.getGlobalHistory({
      page: pagination.page,
      search: searchTerm,
      type: filterType === 'all' ? null : filterType
    });
    
    setLogs(result.logs);
    setPagination(prev => ({
      ...prev,
      total: result.total,
      totalPages: result.totalPages
    }));
    setLoading(false);
  };

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchLogs();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, filterType, pagination.page]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const categories = [
    { id: 'all', label: 'Tout' },
    { id: 'vehicle_checked_out', label: 'Départs' },
    { id: 'vehicle_checked_in', label: 'Retours' },
    { id: 'damage_reported', label: 'Dégâts' },
    { id: 'payment_received', label: 'Paiements' },
    { id: 'client_created', label: 'Clients' },
    { id: 'warning', label: 'Alertes' }
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Journal d'Activité</h1>
          <p className="text-slate-600 mt-1">Suivi complet de toutes les actions et événements du système</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <Button variant="outline" className="bg-white border-gray-200 shadow-sm">
            <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
            Date
          </Button>
          <Button variant="outline" className="bg-white border-gray-200 shadow-sm">
            <Filter className="h-4 w-4 mr-2 text-gray-500" />
            Filtres
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wider">Catégories</h3>
            <div className="space-y-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setFilterType(cat.id);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    filterType === cat.id 
                      ? 'bg-blue-50 text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wider">Statistiques</h3>
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">{pagination.total}</div>
                <div className="text-xs text-gray-500 font-medium uppercase">Total événements</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[600px] flex flex-col"
          >
            <div className="flex-1">
              <HistoryLogList logs={logs} isLoading={loading} />
            </div>

            {/* Pagination */}
            <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {pagination.page} sur {pagination.totalPages || 1}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default History;