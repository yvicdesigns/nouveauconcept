import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Feed from './components/Feed';
import Chat from './components/Chat';

function initials(name) {
  return (name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('feed');
  const [unreadCount, setUnreadCount] = useState(0);
  const [theme, setTheme] = useState(() => {
    // Heure de Congo Brazzaville = UTC+1
    const congoHour = (new Date().getUTCHours() + 1) % 24;
    return (congoHour >= 6 && congoHour < 18) ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserName(session.user.id);
      }
      setLoading(false);
    });
  }, []);

  const fetchUserName = async (userId) => {
    const { data } = await supabase.from('users').select('full_name').eq('id', userId).single();
    if (data?.full_name) setUserName(data.full_name);
  };

  const handleLogin = (u) => {
    setUser(u);
    fetchUserName(u.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserName('');
  };

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #334155', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  const displayName = userName || user.email;

  return (
    <div className="screen">
      {/* Header */}
      <div className="app-header">
        <div className="logo">
          <div className="dot">🔔</div>
          <span>NC — Alertes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={toggleTheme}
            style={{ background: 'var(--bg3)', border: 'none', borderRadius: 8, padding: '6px 8px', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title={theme === 'dark' ? 'Mode jour' : 'Mode nuit'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{displayName}</span>
          <div className="avatar" title="Déconnexion" onClick={handleLogout} style={{ cursor: 'pointer' }}>
            {initials(displayName)}
          </div>
        </div>
      </div>

      {/* Content */}
      {tab === 'feed' && (
        <Feed user={user} unreadCount={unreadCount} setUnreadCount={setUnreadCount} />
      )}
      {tab === 'chat' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingBottom: 60 }}>
          <Chat user={user} userName={displayName} />
        </div>
      )}

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className={`nav-item ${tab === 'feed' ? 'active' : ''}`} onClick={() => setTab('feed')}>
          {unreadCount > 0 && <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Alertes
        </button>
        <button className={`nav-item ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Messages
        </button>
      </nav>
    </div>
  );
}
