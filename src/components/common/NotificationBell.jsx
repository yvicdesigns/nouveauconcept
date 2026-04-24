import React, { useState, useEffect, useRef } from 'react';
import { Bell, Calendar, Receipt, Wrench, X, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_META = {
  reservation: {
    Icon: Calendar,
    bg: 'bg-purple-50',
    color: 'text-purple-600',
    route: '/reservations',
  },
  invoice: {
    Icon: Receipt,
    bg: 'bg-orange-50',
    color: 'text-orange-600',
    route: '/billing',
  },
  maintenance: {
    Icon: Wrench,
    bg: 'bg-red-50',
    color: 'text-red-600',
    route: '/maintenance',
  },
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotif = (type, title, message) => {
    const notif = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 20));

    // Vibrate on mobile if supported
    if (navigator.vibrate) navigator.vibrate(100);
  };

  useEffect(() => {
    const channel = supabase
      .channel('crm-realtime-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reservations' }, (payload) => {
        addNotif('reservation', 'Nouvelle réservation', `Réservation créée — statut : ${payload.new.status || 'En attente'}`);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'invoices' }, (payload) => {
        addNotif('invoice', 'Nouvelle facture', `Facture ${payload.new.invoice_number || ''} — ${payload.new.client_name || ''}`);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'maintenance_records' }, (payload) => {
        addNotif('maintenance', 'Nouvelle maintenance', `Intervention ${payload.new.priority === 'urgent' ? '🔴 urgente' : ''} signalée`);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'invoices' }, (payload) => {
        if (payload.new.status === 'Payé' && payload.old.status !== 'Payé') {
          addNotif('invoice', 'Paiement reçu', `Facture ${payload.new.invoice_number || ''} — ${Number(payload.new.total_amount || 0).toLocaleString()} FCFA`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClick = (notif) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    navigate(TYPE_META[notif.type].route);
    setOpen(false);
  };

  const removeNotif = (e, id) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative p-2 rounded-lg transition-colors ${open ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tout marquer lu
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                  <Bell className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {notifications.map(notif => {
                    const meta = TYPE_META[notif.type];
                    const Icon = meta.Icon;
                    return (
                      <li key={notif.id}>
                        <button
                          onClick={() => handleClick(notif)}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${!notif.read ? 'bg-blue-50/40' : ''}`}
                        >
                          <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${meta.bg}`}>
                            <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-slate-800 truncate">{notif.title}</p>
                              {!notif.read && (
                                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{notif.message}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {formatDistanceToNow(notif.timestamp, { addSuffix: true, locale: fr })}
                            </p>
                          </div>
                          <button
                            onClick={(e) => removeNotif(e, notif.id)}
                            className="flex-shrink-0 p-1 rounded text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
