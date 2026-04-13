import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Car, User, AlertCircle, CheckCircle, FileText, CreditCard, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const getTypeConfig = (type) => {
  switch (type) {
    case 'success':
    case 'vehicle_checked_in':
    case 'payment_received':
      return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' };
    case 'warning':
    case 'damage_reported':
      return { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100' };
    case 'error':
      return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100' };
    case 'vehicle_checked_out':
    case 'rental_started':
      return { icon: Car, color: 'text-blue-500', bg: 'bg-blue-100' };
    case 'client_created':
    case 'client_updated':
      return { icon: User, color: 'text-purple-500', bg: 'bg-purple-100' };
    default:
      return { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-100' };
  }
};

const HistoryLogList = ({ logs, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl w-full"></div>
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Aucun historique disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log, index) => {
        const { icon: Icon, color, bg } = getTypeConfig(log.type);
        
        return (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-start"
          >
            <div className={cn("p-2.5 rounded-full flex-shrink-0", bg)}>
              <Icon className={cn("w-5 h-5", color)} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{log.title}</h3>
                <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {log.created_at ? format(new Date(log.created_at), "d MMM yyyy, HH:mm", { locale: fr }) : '-'}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{log.description}</p>
              
              {(log.client_id || log.vehicle_id) && (
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-50">
                  {log.metadata?.client_name && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                      <User className="w-3 h-3" />
                      {log.metadata.client_name}
                    </span>
                  )}
                  {log.metadata?.vehicle_name && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                      <Car className="w-3 h-3" />
                      {log.metadata.vehicle_name}
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default HistoryLogList;