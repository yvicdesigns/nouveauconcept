import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, FileText, Download, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Documents = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const documents = [
    {
      id: 1,
      name: 'Rental Agreement - Jean Dupont',
      type: 'Contract',
      size: '2.4 MB',
      uploadDate: '2025-11-18',
      category: 'Contracts',
      client: 'Jean Dupont'
    },
    {
      id: 2,
      name: 'Vehicle Insurance - BMW X5',
      type: 'Insurance',
      size: '1.8 MB',
      uploadDate: '2025-11-17',
      category: 'Insurance',
      client: 'N/A'
    },
    {
      id: 3,
      name: 'Invoice INV-2025-001',
      type: 'Invoice',
      size: '0.5 MB',
      uploadDate: '2025-11-16',
      category: 'Billing',
      client: 'Marie Laurent'
    },
  ];

  const handleUpload = () => {
    toast({
      title: "🚧 Feature Coming Soon",
      description: "Upload document functionality will be implemented soon!",
    });
  };

  const handleAction = (action, doc) => {
    toast({
      title: "🚧 Feature Coming Soon",
      description: `${action} functionality for ${doc.name} will be implemented soon!`,
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Document Management</h1>
          <p className="text-slate-600 mt-1">Store and organize all your files</p>
        </div>
        <Button onClick={handleUpload} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <p className="text-sm text-slate-600 mb-2">Total Documents</p>
          <p className="text-3xl font-bold text-slate-900">247</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <p className="text-sm text-slate-600 mb-2">Contracts</p>
          <p className="text-3xl font-bold text-slate-900">89</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <p className="text-sm text-slate-600 mb-2">Invoices</p>
          <p className="text-3xl font-bold text-slate-900">124</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <p className="text-sm text-slate-600 mb-2">Storage Used</p>
          <p className="text-3xl font-bold text-slate-900">4.2 GB</p>
        </motion.div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Document Name</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Category</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Client</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Size</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Upload Date</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, index) => (
                <motion.tr
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-200"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-slate-900">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-slate-700">{doc.type}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      {doc.category}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-slate-700">{doc.client}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-slate-600">{doc.size}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-slate-600">{doc.uploadDate}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAction('View', doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAction('Download', doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAction('Delete', doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Documents;