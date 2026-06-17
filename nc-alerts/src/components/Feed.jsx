import React, { useState, useEffect } from 'react';
import { supabase, VAPID_PUBLIC_KEY } from '../lib/supabase';

const TYPE_CONFIG = {
  reservation_new: { icon: '🚗', bg: '#172554', label: 'Réservation' },
  vehicle_overdue:  { icon: '⚠️', bg: '#431407', label: 'Retard' },
  document_expired: { icon: '📋', bg: '#3b0764', label: 'Document' },
  invoice_new:      { icon: '💰', bg: '#14532d', label: 'Facture' },
  contact_new:      { icon: '👤', bg: '#0c4a6e', label: 'Client' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function Feed({ user, unreadCount, setUnreadCount }) {
  const [notifs, setNotifs] = useState([]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    fetchNotifs();
    checkPushStatus();

    const channel = supabase
      .channel('notifications-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifs(prev => [payload.new, ...prev]);
        setUnreadCount(c => c + 1);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchNotifs = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifs(data || []);
    const unread = (data || []).filter(n => !n.read_by?.includes(user.id)).length;
    setUnreadCount(unread);
  };

  const checkPushStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setPushEnabled(!!sub);
  };

  const enablePush = async () => {
    if (!VAPID_PUBLIC_KEY) return;
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setPushLoading(false); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await fetch('https://nouveauconcept.vercel.app/api/subscribe-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), userId: user.id }),
      });
      setPushEnabled(true);
    } catch (e) {
      console.error(e);
    }
    setPushLoading(false);
  };

  const markAllRead = async () => {
    const unread = notifs.filter(n => !n.read_by?.includes(user.id));
    for (const n of unread) {
      await supabase.from('notifications').update({
        read_by: [...(n.read_by || []), user.id]
      }).eq('id', n.id);
    }
    setNotifs(prev => prev.map(n => ({
      ...n, read_by: [...(n.read_by || []), user.id]
    })));
    setUnreadCount(0);
  };

  return (
    <div className="content">
      {!pushEnabled && (
        <div className="push-banner">
          <span style={{ fontSize: 24 }}>🔔</span>
          <div className="pb-text">
            <div className="pb-title">Activer les notifications</div>
            <div className="pb-sub">Recevez les alertes même app fermée</div>
          </div>
          <button className="push-btn" onClick={enablePush} disabled={pushLoading}>
            {pushLoading ? '...' : 'Activer'}
          </button>
        </div>
      )}

      {unreadCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p className="section-title">{unreadCount} non lue(s)</p>
          <button onClick={markAllRead} style={{ fontSize: 12, color: 'var(--blue)', background: 'none' }}>
            Tout marquer lu
          </button>
        </div>
      )}

      {notifs.length === 0 ? (
        <div className="empty">
          <span className="emoji">🔕</span>
          <p>Aucune notification pour l'instant</p>
        </div>
      ) : (
        notifs.map(n => {
          const cfg = TYPE_CONFIG[n.type] || { icon: '📌', bg: '#1e293b' };
          const isUnread = !n.read_by?.includes(user.id);
          return (
            <div key={n.id} className={`notif-card ${isUnread ? 'unread' : ''}`}>
              <div className="notif-icon" style={{ background: cfg.bg }}>{cfg.icon}</div>
              <div className="notif-body">
                <div className="notif-title">{n.title}</div>
                {n.body && <div className="notif-text">{n.body}</div>}
                <div className="notif-time">{timeAgo(n.created_at)}</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
