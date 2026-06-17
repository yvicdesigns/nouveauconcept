import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Feed from './components/Feed';
import Chat from './components/Chat';

function initials(name) {
  return (name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export default function App() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('feed');
  const [unreadCount, setUnreadCount] = useState(0);

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
        <Chat user={user} userName={displayName} />
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
