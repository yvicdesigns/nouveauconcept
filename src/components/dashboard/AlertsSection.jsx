import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, FileText, CheckCircle } from 'lucide-react';

const AlertsSection = ({ alerts = [] }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white rounded-xl p-8 shadow-sm border border-gray-200"
    >
      <h2 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">Alertes & Rappels</h2>
      
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
          <p className="font-medium">Tout est en ordre !</p>
          <p className="text-sm">Aucune alerte nécessitant votre attention.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert, index) => (
            <div 
              key={index} 
              className={`flex items-start gap-4 p-5 rounded-xl hover:shadow-sm transition-shadow border ${
                alert.type === 'maintenance' ? 'bg-red-50 border-red-100' : 
                alert.type === 'invoice' ? 'bg-yellow-50 border-yellow-100' :
                'bg-blue-50 border-blue-100'
              }`}
            >
              <div className={`p-2 rounded-lg shadow-sm border ${
                alert.type === 'maintenance' ? 'bg-white border-red-100' : 
                alert.type === 'invoice' ? 'bg-white border-yellow-100' :
                'bg-white border-blue-100'
              }`}>
                {alert.type === 'maintenance' ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : alert.type === 'invoice' ? (
                  <FileText className="h-5 w-5 text-yellow-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div>
                <h3 className={`text-sm font-bold ${
                  alert.type === 'maintenance' ? 'text-red-900' : 
                  alert.type === 'invoice' ? 'text-yellow-900' :
                  'text-blue-900'
                }`}>
                  {alert.title}
                </h3>
                <p className={`text-sm mt-1 leading-relaxed ${
                  alert.type === 'maintenance' ? 'text-red-700' : 
                  alert.type === 'invoice' ? 'text-yellow-800' :
                  'text-blue-700'
                }`}>
                  {alert.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AlertsSection;