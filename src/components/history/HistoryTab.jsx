import React, { useEffect, useState } from 'react';
import { historyService } from '@/lib/historyService';
import HistoryLogList from './HistoryLogList';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const HistoryTab = ({ clientId, vehicleId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchHistory = async () => {
    setLoading(true);
    let result;
    if (clientId) {
      result = await historyService.getClientHistory(clientId, { page });
    } else if (vehicleId) {
      result = await historyService.getVehicleHistory(vehicleId, { page });
    }
    
    if (result) {
      setLogs(result.logs);
      setTotal(result.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [clientId, vehicleId, page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Historique d'activité</h3>
        <Button variant="ghost" size="sm" onClick={fetchHistory} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>
      
      <HistoryLogList logs={logs} isLoading={loading} />
      
      {/* Simple Pagination if needed */}
      {total > 10 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Précédent
          </Button>
          <span className="flex items-center px-4 text-sm font-medium text-gray-600">
            Page {page}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => p + 1)}
            disabled={logs.length < 10 || loading}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;