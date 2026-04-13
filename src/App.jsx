import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Routes, Route, Outlet, useNavigate, useLocation } from 'react-router-dom';

import Login from '@/components/Login';
import Sidebar from '@/components/Sidebar';
import MainContentHeader from '@/components/common/MainContentHeader';
import Dashboard from '@/components/modules/Dashboard';
import Contacts from '@/components/modules/Contacts';
import Leads from '@/components/modules/Leads';
import Reservations from '@/components/modules/Reservations';
import Vehicles from '@/components/modules/Vehicles';
import Billing from '@/components/modules/Billing';
import Opportunities from '@/components/modules/Opportunities';
import Tasks from '@/components/modules/Tasks';
import Documents from '@/components/modules/Documents';
import Support from '@/components/modules/Support';
import Users from '@/components/modules/Users';
import Reports from '@/components/modules/Reports';
import Settings from '@/components/modules/Settings';
import History from '@/components/modules/History'; 
import Maintenance from '@/components/modules/Maintenance';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';

// Layout component to include header and render module content
const AppLayout = ({ userSession, onLogout, sidebarOpen, setSidebarOpen, activeModuleTitle }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        user={userSession}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <main className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <MainContentHeader title={activeModuleTitle} />
        <div className="p-6">
          <Outlet /> {/* Renders the matched child route component */}
        </div>
      </main>
      <Toaster />
    </div>
  );
};


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [userSession, setUserSession] = useState(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Map module paths to their titles
  const moduleTitles = {
    '/': 'Tableau de bord',
    '/dashboard': 'Tableau de bord',
    '/contacts': 'Contacts',
    '/reservations': 'Réservations',
    '/vehicles': 'Véhicules',
    '/maintenance': 'Maintenance',
    '/billing': 'Facturation',
    '/history': 'Historique',
    '/support': 'Support',
    '/users': 'Utilisateurs',
    '/settings': 'Paramètres',
    '/leads': 'Prospects',
    '/opportunities': 'Opportunités',
    '/tasks': 'Tâches',
    '/documents': 'Documents',
    '/reports': 'Rapports',
  };

  const getActiveModuleTitle = () => {
    const path = location.pathname;
    return moduleTitles[path] || 'Nouveau Concept CRM';
  };


  // Check for existing session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        // 1. Check local storage first for fast UI feedback
        const storedSession = localStorage.getItem('crm_session');
        
        if (storedSession) {
          try {
            const parsedSession = JSON.parse(storedSession);
            setUserSession(parsedSession);
            setIsAuthenticated(true);
          } catch (e) {
            console.error("Failed to parse stored session", e);
            localStorage.removeItem('crm_session');
          }
        }

        // 2. Verify with Supabase Auth to ensure token is still valid
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (!session) {
          // If Supabase says no session, clear everything
          if (storedSession) { 
             await handleLogout();
          } else {
             setIsAuthenticated(false);
          }
        } else if (!storedSession) {
          // Sync state if Supabase has session but local storage doesn't
           setUserSession(session.user);
           localStorage.setItem('crm_session', JSON.stringify(session.user));
           setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (sessionData) => {
    localStorage.setItem('crm_session', JSON.stringify(sessionData));
    setUserSession(sessionData);
    setIsAuthenticated(true);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
    localStorage.removeItem('crm_session');
    setUserSession(null);
    setIsAuthenticated(false);
    navigate('/login');
  };


  if (isLoadingAuth) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          <Route path="*" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        </Routes>
        <Toaster />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Nouveau Concept CRM - Gestion de Location de Voitures</title>
        <meta name="description" content="CRM complet pour Nouveau Concept - Gestion de flotte, réservations et clients." />
      </Helmet>
      
      <Routes>
        <Route 
          path="/" 
          element={
            <AppLayout 
              userSession={userSession} 
              onLogout={handleLogout} 
              sidebarOpen={sidebarOpen} 
              setSidebarOpen={setSidebarOpen} 
              activeModuleTitle={getActiveModuleTitle()} 
            />
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="billing" element={<Billing />} />
          <Route path="history" element={<History />} />
          <Route path="support" element={<Support />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
          <Route path="leads" element={<Leads />} />
          <Route path="opportunities" element={<Opportunities />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="documents" element={<Documents />} />
          <Route path="reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </>
  );
}

export default App;