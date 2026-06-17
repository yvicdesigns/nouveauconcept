import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

function initials(name) {
  return (name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function timeStr(dateStr) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function Chat({ user, userName }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('team-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [messages.length]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages(data || []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
  };

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    await supabase.from('messages').insert({
      sender_id: user.id,
      sender_name: userName || user.email,
      content,
    });
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Group messages by day
  const grouped = [];
  let lastDay = '';
  for (const m of messages) {
    const day = new Date(m.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (day !== lastDay) {
      grouped.push({ type: 'day', label: day });
      lastDay = day;
    }
    grouped.push({ type: 'msg', ...m });
  }

  return (
    <div className="chat-wrap">
      <div className="messages-list">
        {messages.length === 0 && (
          <div className="empty">
            <span className="emoji">💬</span>
            <p>Commencez la conversation avec votre équipe</p>
          </div>
        )}
        {grouped.map((item, i) => {
          if (item.type === 'day') {
            return (
              <div key={i} style={{ textAlign: 'center', margin: '8px 0' }}>
                <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--bg3)', padding: '3px 10px', borderRadius: 20 }}>
                  {item.label}
                </span>
              </div>
            );
          }
          const mine = item.sender_id === user.id;
          return (
            <div key={item.id} className={`msg-row ${mine ? 'mine' : ''}`}>
              {!mine && <div className="msg-avatar">{initials(item.sender_name)}</div>}
              <div>
                {!mine && <div className="msg-name">{item.sender_name}</div>}
                <div className="msg-bubble">
                  {item.content}
                  <div className="msg-time">{timeStr(item.created_at)}</div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-wrap">
        <textarea
          className="chat-input"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message à l'équipe..."
          rows={1}
        />
        <button className="send-btn" onClick={sendMessage} disabled={!text.trim() || sending}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="18" height="18">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
