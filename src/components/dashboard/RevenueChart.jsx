import React from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const formatCA = (val) => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
  return val;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-gray-700 mb-1 capitalize">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name} : {p.dataKey === 'ca'
            ? `${Number(p.value).toLocaleString()} FCFA`
            : `${p.value} réservation${p.value > 1 ? 's' : ''}`}
        </p>
      ))}
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
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Évolution du parc — 6 mois</h2>
        <p className="text-xs text-gray-400 mt-0.5">Chiffre d'affaires encaissé et réservations terminées</p>
      </div>

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Aucune donnée disponible
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minHeight={220}>
            <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                style={{ textTransform: 'capitalize' }}
              />
              <YAxis
                yAxisId="ca"
                orientation="left"
                tickFormatter={formatCA}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <YAxis
                yAxisId="res"
                orientation="right"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={30}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(value) => value === 'ca' ? 'CA (FCFA)' : 'Réservations'}
              />
              <Bar
                yAxisId="res"
                dataKey="reservations"
                name="reservations"
                fill="#e2e8f0"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
              <Line
                yAxisId="ca"
                dataKey="ca"
                name="ca"
                type="monotone"
                stroke="#00283c"
                strokeWidth={2.5}
                dot={{ fill: '#00283c', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#cc0000' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};

export default RevenueChart;
