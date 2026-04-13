import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Reports = () => {
  const { toast } = useToast();

  const reportTypes = [
    {
      title: 'Revenue Report',
      description: 'Monthly and yearly revenue analysis',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-600'
    },
    {
      title: 'Reservation Analytics',
      description: 'Booking trends and patterns',
      icon: Calendar,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      title: 'Vehicle Utilization',
      description: 'Fleet usage and efficiency metrics',
      icon: BarChart3,
      color: 'from-purple-500 to-pink-600'
    },
  ];

  const handleGenerateReport = (reportTitle) => {
    toast({
      title: "🚧 Feature Coming Soon",
      description: `${reportTitle} generation will be implemented soon!`,
    });
  };

  const handleExport = () => {
    toast({
      title: "🚧 Feature Coming Soon",
      description: "Export functionality will be implemented soon!",
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-600 mt-1">Generate insights and export data</p>
        </div>
        <Button onClick={handleExport} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportTypes.map((report, index) => {
          const Icon = report.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${report.color} flex items-center justify-center mb-4`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{report.title}</h3>
              <p className="text-sm text-slate-600 mb-4">{report.description}</p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleGenerateReport(report.title)}
              >
                Generate Report
              </Button>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Key Performance Indicators</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-2">Monthly Revenue</p>
            <p className="text-2xl font-bold text-slate-900">€68,000</p>
            <p className="text-sm text-green-600 mt-1">+15.3% vs last month</p>
          </div>
          
          <div className="border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-2">Avg. Rental Duration</p>
            <p className="text-2xl font-bold text-slate-900">4.2 days</p>
            <p className="text-sm text-blue-600 mt-1">+0.5 days vs last month</p>
          </div>
          
          <div className="border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-2">Customer Satisfaction</p>
            <p className="text-2xl font-bold text-slate-900">4.8/5.0</p>
            <p className="text-sm text-green-600 mt-1">+0.2 vs last month</p>
          </div>
          
          <div className="border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-2">Fleet Utilization</p>
            <p className="text-2xl font-bold text-slate-900">78%</p>
            <p className="text-sm text-green-600 mt-1">+5% vs last month</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Reports</h2>
        
        <div className="space-y-4">
          {[
            { name: 'Q4 2025 Revenue Report', date: '2025-11-15', size: '2.4 MB' },
            { name: 'October Vehicle Utilization', date: '2025-11-01', size: '1.8 MB' },
            { name: 'Customer Satisfaction Survey', date: '2025-10-28', size: '0.9 MB' },
          ].map((report, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{report.name}</p>
                  <p className="text-sm text-slate-600">{report.date} • {report.size}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reports;