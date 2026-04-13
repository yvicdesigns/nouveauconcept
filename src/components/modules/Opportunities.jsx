import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Opportunities = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const opportunities = [
    {
      id: 'OPP-001',
      title: 'Corporate Fleet Contract',
      client: 'Tech Solutions SAS',
      value: '€45,000',
      probability: 75,
      stage: 'Negotiation',
      expectedClose: '2025-12-15',
      contact: 'Jean Dupont'
    },
    {
      id: 'OPP-002',
      title: 'Long-term Rental Agreement',
      client: 'Design Studio',
      value: '€28,000',
      probability: 60,
      stage: 'Proposal',
      expectedClose: '2025-12-20',
      contact: 'Marie Laurent'
    },
    {
      id: 'OPP-003',
      title: 'Event Transportation Service',
      client: 'Event Management Co.',
      value: '€15,000',
      probability: 90,
      stage: 'Closing',
      expectedClose: '2025-11-25',
      contact: 'Sophie Bernard'
    },
  ];

  const getStageColor = (stage) => {
    switch (stage) {
      case 'Prospecting':
        return 'bg-slate-100 text-slate-700';
      case 'Qualification':
        return 'bg-blue-100 text-blue-700';
      case 'Proposal':
        return 'bg-purple-100 text-purple-700';
      case 'Negotiation':
        return 'bg-yellow-100 text-yellow-700';
      case 'Closing':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const handleAddOpportunity = () => {
    toast({
      title: "🚧 Feature Coming Soon",
      description: "Add opportunity functionality will be implemented soon!",
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Commercial Opportunities</h1>
          <p className="text-slate-600 mt-1">Track sales pipeline and deals</p>
        </div>
        <Button onClick={handleAddOpportunity} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Opportunity
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <p className="text-sm text-slate-600 mb-2">Total Pipeline</p>
          <p className="text-3xl font-bold text-slate-900">€88,000</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <p className="text-sm text-slate-600 mb-2">Weighted Value</p>
          <p className="text-3xl font-bold text-slate-900">€61,350</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <p className="text-sm text-slate-600 mb-2">Win Rate</p>
          <p className="text-3xl font-bold text-slate-900">68%</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <p className="text-sm text-slate-600 mb-2">Avg. Deal Size</p>
          <p className="text-3xl font-bold text-slate-900">€29,333</p>
        </motion.div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search opportunities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-4">
          {opportunities.map((opp, index) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-slate-900">{opp.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStageColor(opp.stage)}`}>
                      {opp.stage}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Client</p>
                      <p className="font-semibold text-slate-900">{opp.client}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Contact</p>
                      <p className="text-sm text-slate-700">{opp.contact}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Expected Close</p>
                      <p className="text-sm text-slate-700">{opp.expectedClose}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Probability</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                            style={{ width: `${opp.probability}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{opp.probability}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{opp.value}</p>
                    <p className="text-xs text-slate-500">Deal Value</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Opportunities;