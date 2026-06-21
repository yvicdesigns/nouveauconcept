import React, { useState, useEffect, useRef } from 'react';
import { supabase, uploadFile } from '../lib/supabase';

function initials(name) {
  return (name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function MsgImage({ url }) {
  const [err, setErr] = useState(false);
  if (err) return (
    <a href={url} target="_blank" rel="noreferrer" className="msg-doc" style={{ marginBottom: 4 }}>
      <span>🖼️</span><span className="msg-doc-name">Voir la photo</span>
    </a>
  );
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="photo" className="msg-img" onError={() => setErr(true)} />
    </a>
  );
}

function timeStr(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function fmtDuration(s) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

// ─── AttachSheet ──────────────────────────────────────────────────────────────

function AttachSheet({ onImage, onCamera, onDoc, onClose }) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="attach-menu" onClick={e => e.stopPropagation()}>
        <div className="attach-grid">
          <button className="attach-item" onClick={() => { onImage(); onClose(); }}>
            <span className="attach-icon" style={{ background: '#7c3aed' }}>🖼️</span>
            <span>Photo</span>
          </button>
          <button className="attach-item" onClick={() => { onCamera(); onClose(); }}>
            <span className="attach-icon" style={{ background: '#059669' }}>📷</span>
            <span>Caméra</span>
          </button>
          <button className="attach-item" onClick={() => { onDoc(); onClose(); }}>
            <span className="attach-icon" style={{ background: '#d97706' }}>📄</span>
            <span>Document</span>
          </button>
        </div>
        <button className="attach-cancel" onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}

// ─── ActionSheet ──────────────────────────────────────────────────────────────

function ActionSheet({ msg, mine, onEdit, onDeleteMe, onDeleteAll, onClose }) {
  const ageMin = (Date.now() - new Date(msg.created_at)) / 60000;
  const canEdit = mine && ageMin < 15 && !msg.file_type;
  const canDeleteAll = mine && ageMin < 1440;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="action-menu" onClick={e => e.stopPropagation()}>
        {canEdit && (
          <button className="action-item" onClick={onEdit}>✏️ &nbsp;Modifier</button>
        )}
        {canDeleteAll && (
          <button className="action-item red" onClick={onDeleteAll}>🗑️ &nbsp;Supprimer pour tous</button>
        )}
        <button className="action-item" onClick={onDeleteMe}>🗑️ &nbsp;Supprimer pour moi</button>
        <button className="action-item muted" onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}

// ─── VoiceRecorder ────────────────────────────────────────────────────────────

function VoiceRecorder({ onSend, onCancel }) {
  const [secs, setSecs] = useState(0);
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        mrRef.current = mr;
        chunksRef.current = [];
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          onSend(blob);
        };
        mr.start();
        timerRef.current = setInterval(() => setSecs(s => s + 1), 1000);
      } catch {
        alert('Microphone non accessible');
        onCancel();
      }
    })();
    return () => clearInterval(timerRef.current);
  }, []);

  const stop = () => { clearInterval(timerRef.current); mrRef.current?.stop(); };
  const cancel = () => {
    clearInterval(timerRef.current);
    if (mrRef.current) {
      mrRef.current.ondataavailable = null;
      mrRef.current.onstop = null;
      mrRef.current.stop();
    }
    onCancel();
  };

  return (
    <div className="voice-bar">
      <button onClick={cancel} className="voice-cancel-btn">✕</button>
      <div className="voice-info">
        <span className="voice-dot" />
        <span className="voice-time">{fmtDuration(secs)}</span>
        <span className="voice-label">Enregistrement…</span>
      </div>
      <button className="send-btn" onClick={stop}>
        <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
          <rect x="5" y="5" width="14" height="14" rx="2"/>
        </svg>
      </button>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, mine, isGroup, onLongPress }) {
  const timerRef = useRef(null);

  const onTouchStart = () => { timerRef.current = setTimeout(() => onLongPress(msg), 600); };
  const onTouchEnd = () => clearTimeout(timerRef.current);

  if (msg.deleted_for_everyone) {
    return (
      <div className={`msg-row ${mine ? 'mine' : ''}`}>
        {!mine && <div className="msg-avatar">{initials(msg.sender_name)}</div>}
        <div className="msg-bubble msg-deleted">🚫 Ce message a été supprimé</div>
      </div>
    );
  }

  return (
    <div className={`msg-row ${mine ? 'mine' : ''}`}
      onMouseDown={onTouchStart} onMouseUp={onTouchEnd} onMouseLeave={onTouchEnd}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {!mine && <div className="msg-avatar">{initials(msg.sender_name)}</div>}
      <div className="msg-bubble">
        {!mine && isGroup && <div className="msg-name">{msg.sender_name}</div>}

        {(msg.file_type === 'image' || (msg.file_url && !msg.file_type)) && (
          <MsgImage url={msg.file_url} />
        )}

        {msg.file_type === 'document' && (
          <a href={msg.file_url} target="_blank" rel="noreferrer" className="msg-doc">
            <span>📄</span>
            <span className="msg-doc-name">{msg.file_name || 'Document'}</span>
          </a>
        )}

        {msg.file_type === 'audio' && (
          <div className="msg-audio">
            <span>🎤</span>
            <audio src={msg.file_url} controls className="msg-audio-player" />
          </div>
        )}

        {msg.content ? <span>{msg.content}</span> : null}

        <div className="msg-footer">
          {msg.edited_at && <span className="msg-edited">modifié</span>}
          <span className="msg-time">{timeStr(msg.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── ConversationList ─────────────────────────────────────────────────────────

function ConversationList({ user, onSelect }) {
  const [teammates, setTeammates] = useState([]);
  const [convos, setConvos] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTeam(); }, []);

  const fetchTeam = async () => {
    const { data: users } = await supabase.from('users')
      .select('id, full_name, role, status').neq('id', user.id)
      .eq('status', 'active').order('full_name');
    setTeammates(users || []);

    const { data: myConvos } = await supabase.from('conversations').select('*')
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    const map = {};
    (myConvos || []).forEach(c => {
      const otherId = c.participant1_id === user.id ? c.participant2_id : c.participant1_id;
      map[otherId] = c;
    });
    setConvos(map);
    setLoading(false);
  };

  const ROLE = { admin: '👑', manager: '👔', agent: '🚗', fleet: '🛠️', accountant: '💰', readonly: '👁️', staff: '👤' };

  return (
    <div className="content" style={{ paddingBottom: 80 }}>
      <div className="notif-card" style={{ cursor: 'pointer', alignItems: 'center', marginBottom: 8 }}
        onClick={() => onSelect({ type: 'group' })}>
        <div className="notif-icon" style={{ background: '#1e3a5f', fontSize: 22 }}>📢</div>
        <div className="notif-body">
          <div className="notif-title">Groupe Équipe</div>
          <div className="notif-text">Messages visibles par toute l'équipe</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <p className="section-title" style={{ marginTop: 20 }}>Messages privés</p>
      {loading && <p style={{ color: 'var(--text2)', fontSize: 13, textAlign: 'center' }}>Chargement…</p>}
      {!loading && teammates.length === 0 && (
        <div className="empty"><span className="emoji">👥</span><p>Aucun collègue actif</p></div>
      )}
      {teammates.map(tm => {
        const c = convos[tm.id];
        return (
          <div key={tm.id} className="notif-card"
            style={{ cursor: 'pointer', alignItems: 'center', marginBottom: 8 }}
            onClick={() => onSelect({ type: 'dm', teammate: tm })}>
            <div className="avatar" style={{ width: 42, height: 42, fontSize: 15, flexShrink: 0 }}>
              {initials(tm.full_name)}
            </div>
            <div className="notif-body">
              <div className="notif-title">{ROLE[tm.role] || '👤'} {tm.full_name}</div>
              <div className="notif-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                {c?.last_message || 'Démarrer une conversation'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              {c?.last_message_at && <span style={{ fontSize: 11, color: 'var(--text2)' }}>{timeStr(c.last_message_at)}</span>}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Conversation ─────────────────────────────────────────────────────────────

function Conversation({ user, userName, convo, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [dmReady, setDmReady] = useState(false);
  const [initError, setInitError] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [recording, setRecording] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const convIdRef = useRef(null);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);
  const textareaRef = useRef(null);
  const fileImgRef = useRef();
  const fileCamRef = useRef();
  const fileDocRef = useRef();

  const isGroup = convo.type === 'group';
  const title = isGroup ? '📢 Groupe Équipe' : convo.teammate?.full_name;

  useEffect(() => {
    if (isGroup) {
      fetchGroupMessages();
      channelRef.current = supabase.channel('group-chat')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, p => {
          if (p.eventType === 'INSERT' && p.new.conversation_id === null) {
            setMessages(prev => prev.find(m => m.id === p.new.id) ? prev : [...prev, p.new]);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
          if (p.eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === p.new.id ? p.new : m));
          }
        }).subscribe();
    } else {
      initDM();
    }
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const fetchGroupMessages = async () => {
    const { data } = await supabase.from('messages').select('*')
      .is('conversation_id', null).order('created_at', { ascending: true }).limit(100);
    setMessages(data || []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
  };

  const initDM = async () => {
    try {
      const p1 = user.id < convo.teammate.id ? user.id : convo.teammate.id;
      const p2 = user.id < convo.teammate.id ? convo.teammate.id : user.id;

      let { data: existing, error: selErr } = await supabase.from('conversations')
        .select('*').eq('participant1_id', p1).eq('participant2_id', p2).maybeSingle();
      if (selErr) throw selErr;

      if (!existing) {
        const { data: created, error: insErr } = await supabase.from('conversations')
          .insert({ participant1_id: p1, participant2_id: p2 }).select().single();
        if (insErr) throw insErr;
        existing = created;
      }

      convIdRef.current = existing.id;
      setDmReady(true);
      await fetchDMMessages(existing.id);

      channelRef.current = supabase.channel(`dm-${existing.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, p => {
          if (p.eventType === 'INSERT' && p.new.conversation_id === existing.id) {
            setMessages(prev => prev.find(m => m.id === p.new.id) ? prev : [...prev, p.new]);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
          if (p.eventType === 'UPDATE' && p.new.conversation_id === existing.id) {
            setMessages(prev => prev.map(m => m.id === p.new.id ? p.new : m));
          }
        }).subscribe();
    } catch (err) {
      setInitError(err.message || 'Erreur de connexion');
    }
  };

  const fetchDMMessages = async (cid) => {
    const { data } = await supabase.from('messages').select('*')
      .eq('conversation_id', cid).order('created_at', { ascending: true }).limit(100);
    setMessages(data || []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
  };

  const insertMessage = async (payload) => {
    const tempId = `temp-${Date.now()}`;
    const tempMsg = { id: tempId, ...payload, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    const { data: inserted } = await supabase.from('messages').insert(payload).select().single();
    if (inserted) {
      // Conserver les valeurs optimistes si la DB retourne null (colonnes manquantes)
      setMessages(prev => prev.map(m => m.id === tempId ? {
        ...inserted,
        file_url: inserted.file_url || payload.file_url,
        file_type: inserted.file_type || payload.file_type,
        file_name: inserted.file_name || payload.file_name,
      } : m));
    }

    if (!isGroup && convIdRef.current) {
      supabase.from('conversations').update({
        last_message: payload.content || (payload.file_type === 'image' ? '📷 Photo' : payload.file_type === 'audio' ? '🎤 Vocal' : '📄 Document'),
        last_message_at: new Date().toISOString(),
      }).eq('id', convIdRef.current).then(() => {});
    }
  };

  const sendText = async () => {
    const content = text.trim();
    if (!content || sending) return;
    if (!isGroup && !convIdRef.current) return;
    if (editingMsg) { await submitEdit(); return; }
    setSending(true);
    setText('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    await insertMessage({
      sender_id: user.id, sender_name: userName || user.email,
      content, conversation_id: isGroup ? null : convIdRef.current,
    });
    setSending(false);
  };

  const sendFile = async (file, fileType) => {
    if (!isGroup && !convIdRef.current) {
      alert('Conversation non initialisée, réessaie dans quelques secondes.');
      return;
    }
    try {
      const folder = isGroup ? 'group' : convIdRef.current;
      const url = await uploadFile(file, folder);
      if (!url) throw new Error('URL vide après upload');
      await insertMessage({
        sender_id: user.id, sender_name: userName || user.email,
        content: '', file_url: url,
        file_type: fileType,
        file_name: file.name || 'fichier',
        conversation_id: isGroup ? null : convIdRef.current,
      });
    } catch (e) {
      alert('Erreur : ' + (e.message || JSON.stringify(e)));
    }
  };

  const sendVoice = async (blob) => {
    setRecording(false);
    const file = new File([blob], `vocal-${Date.now()}.webm`, { type: 'audio/webm' });
    await sendFile(file, 'audio');
  };

  const submitEdit = async () => {
    if (!editingMsg || !text.trim()) return;
    const newContent = text.trim();
    await supabase.from('messages').update({ content: newContent, edited_at: new Date().toISOString() }).eq('id', editingMsg.id);
    setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m));
    setEditingMsg(null);
    setText('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
  };

  const deleteForMe = (msg) => {
    setActionMsg(null);
    setMessages(prev => prev.filter(m => m.id !== msg.id));
  };

  const deleteForAll = async (msg) => {
    setActionMsg(null);
    await supabase.from('messages').update({ deleted_for_everyone: true, content: '' }).eq('id', msg.id);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, deleted_for_everyone: true, content: '' } : m));
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); }
  };

  const handleInput = (e) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const canSend = isGroup || dmReady;

  // Grouper par jour
  const grouped = [];
  let lastDay = '';
  for (const m of messages) {
    const day = new Date(m.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (day !== lastDay) { grouped.push({ type: 'day', label: day, key: day }); lastDay = day; }
    grouped.push({ type: 'msg', ...m });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Sub-header */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', color: 'var(--text2)', padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {!isGroup && <div className="avatar" style={{ width: 36, height: 36 }}>{initials(convo.teammate?.full_name)}</div>}
        <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
      </div>

      {/* Messages */}
      <div className="chat-bg">
        {messages.length === 0 && !initError && (
          <div className="empty">
            <span className="emoji">{isGroup ? '📢' : '👋'}</span>
            <p>{isGroup ? 'Bienvenue dans le chat équipe' : `Démarrez votre conversation avec ${convo.teammate?.full_name}`}</p>
          </div>
        )}
        {initError && (
          <div className="empty">
            <span className="emoji">⚠️</span>
            <p style={{ color: 'var(--red)' }}>{initError}</p>
            <p style={{ fontSize: 12 }}>Vérifiez que RLS est désactivé sur la table conversations</p>
          </div>
        )}
        {grouped.map((item) => {
          if (item.type === 'day') return (
            <div key={item.key} style={{ textAlign: 'center', margin: '8px 0' }}>
              <span style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--bg3)', padding: '3px 10px', borderRadius: 20 }}>{item.label}</span>
            </div>
          );
          const mine = item.sender_id === user.id;
          return (
            <MessageBubble key={item.id} msg={item} mine={mine} isGroup={isGroup}
              onLongPress={mine ? setActionMsg : () => {}} />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Edit banner */}
      {editingMsg && (
        <div style={{ background: 'var(--bg3)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--blue)' }}>✏️ Modification</span>
          <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editingMsg.content}</span>
          <button onClick={() => { setEditingMsg(null); setText(''); }} style={{ background: 'none', color: 'var(--text2)', fontSize: 18 }}>✕</button>
        </div>
      )}

      {/* Input */}
      {initError ? (
        <div style={{ padding: '12px 16px', background: 'var(--bg2)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <p style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>⚠️ {initError}</p>
        </div>
      ) : recording ? (
        <VoiceRecorder onSend={sendVoice} onCancel={() => setRecording(false)} />
      ) : (
        <div className="chat-input-wrap">
          <div className="input-inner">
            <button className="attach-btn" onClick={() => setShowAttach(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <textarea ref={textareaRef} className="chat-input" value={text}
              onChange={e => setText(e.target.value)}
              onInput={handleInput} onKeyDown={handleKey}
              placeholder={canSend ? (isGroup ? 'Message au groupe…' : `Message à ${convo.teammate?.full_name}…`) : 'Connexion…'}
              rows={1} disabled={!canSend}
              style={{ height: 'auto', overflowY: 'hidden' }} />
          </div>
          {text.trim() ? (
            <button className="send-btn" onClick={editingMsg ? submitEdit : sendText} disabled={sending || !canSend}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="20" height="20">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <button className="send-btn" onClick={() => setRecording(true)} disabled={!canSend}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="20" height="20">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* File inputs toujours montés pour éviter démontage pendant sélection */}
      <input ref={fileImgRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; if (f) { sendFile(f, 'image'); e.target.value = ''; } }} />
      <input ref={fileCamRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; if (f) { sendFile(f, 'image'); e.target.value = ''; } }} />
      <input ref={fileDocRef} type="file" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; if (f) { sendFile(f, 'document'); e.target.value = ''; } }} />

      {showAttach && (
        <AttachSheet
          onImage={() => fileImgRef.current.click()}
          onCamera={() => fileCamRef.current.click()}
          onDoc={() => fileDocRef.current.click()}
          onClose={() => setShowAttach(false)}
        />
      )}
      {actionMsg && (
        <ActionSheet msg={actionMsg} mine={actionMsg.sender_id === user.id}
          onEdit={() => { setEditingMsg(actionMsg); setText(actionMsg.content); setActionMsg(null); }}
          onDeleteMe={() => deleteForMe(actionMsg)}
          onDeleteAll={() => deleteForAll(actionMsg)}
          onClose={() => setActionMsg(null)} />
      )}
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function Chat({ user, userName }) {
  const [activeConvo, setActiveConvo] = useState(null);
  if (activeConvo) {
    return <Conversation user={user} userName={userName} convo={activeConvo} onBack={() => setActiveConvo(null)} />;
  }
  return <ConversationList user={user} onSelect={setActiveConvo} />;
}
