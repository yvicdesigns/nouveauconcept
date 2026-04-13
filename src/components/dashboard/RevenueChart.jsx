import React from 'react';
import { motion } from 'framer-motion';

const RevenueChart = ({ data = [] }) => {
  // Find max value for scaling, default to 1 if empty to avoid division by zero
  const maxValue = Math.max(...data.map(d => d.value), 1) * 1.1; // Add 10% headroom

  const formatCurrency = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 h-full flex flex-col"
    >
      <h2 className="text-xl font-bold text-gray-900 mb-8 tracking-tight">Évolution des Revenus</h2>
      
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Aucune donnée disponible
        </div>
      ) : (
        <div className="flex flex-1 items-end gap-4 sm:gap-8">
          {/* Y-Axis Labels */}
          <div className="hidden sm:flex flex-col justify-between h-full text-xs font-medium text-gray-400 pb-6 min-w-[40px]">
            <span>{formatCurrency(maxValue)}</span>
            <span>{formatCurrency(maxValue * 0.75)}</span>
            <span>{formatCurrency(maxValue * 0.5)}</span>
            <span>{formatCurrency(maxValue * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Bars */}
          <div className="flex-1 flex items-end justify-between h-full pb-2">
            {data.map((item, index) => (
              <div key={index} className="flex flex-col items-center gap-3 w-full group">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(item.value / maxValue) * 100}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="w-full max-w-[60px] bg-blue-600 rounded-t-lg hover:bg-blue-700 transition-colors cursor-pointer relative shadow-sm min-h-[4px]"
                >
                   <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-lg pointer-events-none">
                    {item.value.toLocaleString()} FCFA
                  </div>
                </motion.div>
                <span className="text-xs text-gray-500 font-semibold truncate w-full text-center">{item.month}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default RevenueChart;