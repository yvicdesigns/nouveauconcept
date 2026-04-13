import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Tasks = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const tasks = [
    {
      id: 1,
      title: 'Follow up with Jean Dupont',
      description: 'Discuss contract renewal for corporate fleet',
      priority: 'High',
      dueDate: '2025-11-22',
      status: 'Pending',
      assignedTo: 'Sales Team',
      category: 'Follow-up'
    },
    {
      id: 2,
      title: 'Vehicle inspection - BMW X5',
      description: 'Complete routine maintenance check',
      priority: 'Medium',
      dueDate: '2025-11-23',
      status: 'In Progress',
      assignedTo: 'Maintenance',
      category: 'Maintenance'
    },
    {
      id: 3,
      title: 'Send invoice to Marie Laurent',
      description: 'Invoice for Mercedes C-Class rental',
      priority: 'High',
      dueDate: '2025-11-21',
      status: 'Completed',
      assignedTo: 'Billing',
      category: 'Billing'
    },
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'Low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return CheckCircle;
      case 'In Progress':
        return Clock;
      case 'Pending':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const handleAddTask = () => {
    toast({
      title: "🚧 Feature Coming Soon",
      description: "Add task functionality will be implemented soon!",
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tasks & Reminders</h1>
          <p className="text-slate-600 mt-1">Manage your to-do list and reminders</p>
        </div>
        <Button onClick={handleAddTask} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-6 w-6 text-orange-500" />
            <p className="text-sm text-slate-600">Pending</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">12</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-6 w-6 text-blue-500" />
            <p className="text-sm text-slate-600">In Progress</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">8</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <p className="text-sm text-slate-600">Completed</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">45</p>
        </motion.div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-4">
          {tasks.map((task, index) => {
            const StatusIcon = getStatusIcon(task.status);
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <StatusIcon className={`h-6 w-6 ${
                      task.status === 'Completed' ? 'text-green-500' :
                      task.status === 'In Progress' ? 'text-blue-500' :
                      'text-orange-500'
                    }`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
                      <div>
                        <span className="font-medium">Due:</span> {task.dueDate}
                      </div>
                      <div>
                        <span className="font-medium">Assigned to:</span> {task.assignedTo}
                      </div>
                      <div>
                        <span className="font-medium">Category:</span> {task.category}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Tasks;