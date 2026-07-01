import React from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  defs,
  linearGradient,
  stop,
} from 'recharts';

const formatCA = (val) => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
  return val || '0';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-gray-500 mb-1 capitalize">{label}</p>
      <p className="font-bold text-nc-navy">
        CA : {Number(payload[0]?.value || 0).toLocaleString()} FCFA
      </p>
      {payload[1] && (
        <p className="text-gray-500 text-xs mt-0.5">
          {payload[1].value} réservation{payload[1].value > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

const RevenueChart = ({ data = [] }) => {
  const hasData = data.some(d => d.ca > 0 || d.reservations > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 h-full flex flex-col"
    >
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Évolution des revenus (6 mois)</h2>
        <p className="text-xs text-gray-400 mt-0.5">Chiffre d'affaires encaissé par mois</p>
      </div>

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Aucune donnée disponible
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minHeight={240}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00283c" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00283c" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientRes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#cc0000" stopOpacity={0.10} />
                  <stop offset="95%" stopColor="#cc0000" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                style={{ textTransform: 'capitalize' }}
              />
              <YAxis
                tickFormatter={formatCA}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={44}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="ca"
                stroke="#00283c"
                strokeWidth={2.5}
                fill="url(#gradientCA)"
                dot={{ fill: '#00283c', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#cc0000', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};

export default RevenueChart;
