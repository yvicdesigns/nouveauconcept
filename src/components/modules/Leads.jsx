import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Leads = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const leads = [
    {
      id: 1,
      name: 'Sophie Bernard',
      email: 'sophie.bernard@email.com',
      phone: '+33 6 45 67 89 01',
      source: 'Website',
      status: 'New',
      interest: 'Luxury Sedan',
      score: 85,
      createdAt: '2025-11-18'
    },
    {
      id: 2,
      name: 'Thomas Petit',
      email: 'thomas.petit@email.com',
      phone: '+33 6 56 78 90 12',
      source: 'Referral',
      status: 'Contacted',
      interest: 'SUV',
      score: 72,
      createdAt: '2025-11-17'
    },
    {
      id: 3,
      name: 'Claire Dubois',
      email: 'claire.dubois@email.com',
      phone: '+33 6 67 89 01 23',
      source: 'Social Media',
      status: 'Qualified',
      interest: 'Sports Car',
      score: 90,
      createdAt: '2025-11-16'
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-700';
      case 'Contacted':
        return 'bg-yellow-100 text-yellow-700';
      case 'Qualified':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'New':
        return TrendingUp;
      case 'Contacted':
        return Clock;
      case 'Qualified':
        return CheckCircle;
      default:
        return TrendingUp;
    }
  };

  const handleAddLead = () => {
    toast({
      title: "🚧 Feature Coming Soon",
      description: "Add lead functionality will be implemented soon!",
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lead Management</h1>
          <p className="text-slate-600 mt-1">Track and convert prospects</p>
        </div>
        <Button onClick={handleAddLead} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Lead</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Contact</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Source</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Interest</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Score</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, index) => {
                const StatusIcon = getStatusIcon(lead.status);
                return (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-200"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {lead.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{lead.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-slate-600">{lead.email}</p>
                      <p className="text-sm text-slate-500">{lead.phone}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-700">{lead.source}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-700">{lead.interest}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{lead.score}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                        <StatusIcon className="h-3 w-3" />
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-slate-600">{lead.createdAt}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leads;