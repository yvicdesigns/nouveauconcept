import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const StatCard = ({ title, value, subtext, subtextColor, icon: Icon, iconColor, iconBg, index, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl p-6 shadow-sm border border-gray-200 transition-all duration-200",
        onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]" : "hover:shadow-md"
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-3 tracking-tight">{value}</h3>
          <p className={`text-xs mt-2 font-medium ${subtextColor}`}>
            {subtext}
          </p>
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;