import React, { useState } from 'react';
import { LayoutDashboard, Users, CalendarDays, Car, CreditCard, Headphones as HeadphonesIcon, UserCog, Settings as SettingsIcon, LogOut, X, History, Wrench, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal';
import { Link, useLocation } from 'react-router-dom'; // Import Link and useLocation

const Sidebar = ({ isOpen, setIsOpen, user, onLogout }) => { // Removed activeModule, setActiveModule
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const location = useLocation(); // Get current location to highlight active link

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'contacts', label: 'Contacts', icon: Users, path: '/contacts' },
    { id: 'reservations', label: 'Réservations', icon: CalendarDays, path: '/reservations' },
    { id: 'vehicles', label: 'Véhicules', icon: Car, path: '/vehicles' },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, path: '/maintenance' },
    { id: 'billing', label: 'Facturation', icon: CreditCard, path: '/billing' },
    { id: 'history', label: 'Historique', icon: History, path: '/history' },
    { id: 'support', label: 'Support', icon: HeadphonesIcon, path: '/support' },
    { id: 'users', label: 'Utilisateurs', icon: UserCog, path: '/users' },
    { id: 'settings', label: 'Paramètres', icon: SettingsIcon, path: '/settings' },
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <>
      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
        userEmail={user?.email} 
      />

      {/* Mobile Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-gray-900/50 z-40 lg:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Container */}
      <div 
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-xl flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center font-bold text-lg">
              N
            </div>
            <span className="font-bold text-lg tracking-tight">Nouveau Concept</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Determine if the current path matches the item's path
            const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
            
            return (
              <Link // Use Link for navigation
                key={item.id}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20 font-medium" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-white" : "text-slate-500 group-hover:text-white"
                )} />
                <span className="text-sm">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer User Section */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold border-2 border-slate-700 group-hover:border-slate-600 transition-colors shrink-0">
              {getInitials(user?.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || 'Utilisateur'}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role || 'Membre'}</p>
            </div>
            
            <div className="flex gap-1">
               <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPasswordModalOpen(true);
                }}
                title="Changer le mot de passe"
              >
                <KeyRound className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-slate-700/50"
                onClick={(e) => {
                  e.stopPropagation();
                  onLogout();
                }}
                title="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;