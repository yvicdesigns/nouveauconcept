import React from 'react';
import { motion } from 'framer-motion';

const VehicleStatus = ({ data = [] }) => {
  // Defaults in case data is missing
  const chartData = data.length > 0 ? data : [
    { label: 'Aucune donnée', value: 1, color: '#e2e8f0' }
  ];

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
  let currentAngle = 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 h-full flex flex-col"
    >
      <h2 className="text-xl font-bold text-gray-900 mb-8 tracking-tight">État de la Flotte</h2>

      <div className="flex flex-col items-center justify-center gap-8 flex-1">
        {/* Donut Chart */}
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
            {chartData.map((item, index) => {
              // Handle case where total is 0 to avoid NaN
              const safeTotal = total === 0 ? 1 : total;
              const percentage = (item.value / safeTotal) * 100;
              // Ensure we don't break SVG if percentage is 0
              const strokeDasharray = `${Math.max(percentage, 0)} 100`;
              const strokeDashoffset = -currentAngle;
              currentAngle += percentage;

              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="10"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 hover:opacity-80"
                />
              );
            })}
          </svg>
          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold text-gray-900">{total}</span>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Véhicules</span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full px-4">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600 font-medium truncate max-w-[80px]">{item.label}</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default VehicleStatus;