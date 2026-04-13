import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

const RecentActivity = () => {
  const activities = [
    {
      type: 'success',
      icon: CheckCircle,
      title: 'New reservation confirmed',
      description: 'BMW X5 reserved by Jean Dupont',
      time: '5 minutes ago',
      color: 'text-green-600'
    },
    {
      type: 'info',
      icon: Clock,
      title: 'Payment received',
      description: '€450 from Marie Laurent',
      time: '23 minutes ago',
      color: 'text-blue-600'
    },
    {
      type: 'warning',
      icon: AlertCircle,
      title: 'Vehicle maintenance due',
      description: 'Mercedes C-Class requires service',
      time: '1 hour ago',
      color: 'text-orange-600'
    },
    {
      type: 'error',
      icon: XCircle,
      title: 'Reservation cancelled',
      description: 'Audi A4 booking cancelled by client',
      time: '2 hours ago',
      color: 'text-red-600'
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Activity</h2>
      
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex items-start gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors duration-200"
            >
              <div className={`p-2 rounded-lg ${activity.color} bg-opacity-10`}>
                <Icon className={`h-5 w-5 ${activity.color}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{activity.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{activity.description}</p>
                <p className="text-xs text-slate-400 mt-2">{activity.time}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default RecentActivity;