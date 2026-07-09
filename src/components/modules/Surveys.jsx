import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Plus, Copy, QrCode, Trash2, Edit2, ChevronDown, ChevronUp,
  Loader2, ExternalLink, X, Check, ClipboardList, BarChart2,
  Star, Download,
} from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'text',   label: 'Texte libre',     icon: '📝' },
  { value: 'rating', label: 'Note (étoiles)',  icon: '⭐' },
  { value: 'nps',    label: 'NPS (0–10)',      icon: '📊' },
  { value: 'yesno',  label: 'Oui / Non',       icon: '✅' },
  { value: 'choice', label: 'Choix multiple',  icon: '📋' },
];

const generateSlug = (title) => {
  const base = title.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30);
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
};

// ── Modal Créer / Modifier ────────────────────────────────────────────────
const SurveyModal = ({ survey, onClose, onSaved }) => {
  const isEdit = !!survey;
  const [title, setTitle]           = useState(survey?.title || '');
  const [description, setDescription] = useState(survey?.description || '');
  const [questions, setQuestions]   = useState([]);
  const [loading, setLoading]       = useState(isEdit);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    supabase.from('survey_questions').select('*').eq('survey_id', survey.id).order('order')
      .then(({ data }) => { setQuestions(data || []); setLoading(false); });
  }, []);

  const addQuestion = () => setQuestions(prev => [
    ...prev,
    { id: `new_${Date.now()}`, question_text: '', question_type: 'text', options: [], required: false, order: prev.length },
  ]);

  const updateQ = (idx, patch) => setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  const removeQ = (idx)        => setQuestions(prev => prev.filter((_, i) => i !== idx));
  const moveUp   = (idx) => { if (idx === 0) return; setQuestions(prev => { const a = [...prev]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; return a; }); };
  const moveDown = (idx) => { if (idx === questions.length - 1) return; setQuestions(prev => { const a = [...prev]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; return a; }); };

  const handleSave = async () => {
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    setSaving(true); setError(null);
    try {
      let surveyId;
      if (isEdit) {
        await supabase.from('surveys').update({ title, description, updated_at: new Date().toISOString() }).eq('id', survey.id);
        surveyId = survey.id;
        await supabase.from('survey_questions').delete().eq('survey_id', surveyId);
      } else {
        const { data: s, error: sErr } = await supabase
          .from('surveys').insert({ title, description, slug: generateSlug(title) }).select().single();
        if (sErr) throw sErr;
        surveyId = s.id;
      }
      if (questions.length > 0) {
        const rows = questions.map((q, i) => ({
          survey_id: surveyId, question_text: q.question_text,
          question_type: q.question_type, options: q.options || [],
          required: q.required, order: i,
        }));
        const { error: qErr } = await supabase.from('survey_questions').insert(rows);
        if (qErr) throw qErr;
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mt-8 mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{isEdit ? 'Modifier le sondage' : 'Nouveau sondage'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-3">
            <input type="text" placeholder="Titre du sondage *"
              value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold" />
            <textarea rows={2} placeholder="Description (optionnelle)"
              value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-700">Questions ({questions.length})</p>
              <button type="button" onClick={addQuestion}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm">
                <Plus className="h-3.5 w-3.5" />Ajouter
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-blue-500" /></div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                Aucune question — cliquez sur <strong>Ajouter</strong>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-0.5 pt-1.5">
                        <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
                          className="text-slate-300 hover:text-slate-600 disabled:opacity-20">
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => moveDown(idx)} disabled={idx === questions.length - 1}
                          className="text-slate-300 hover:text-slate-600 disabled:opacity-20">
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex-1 space-y-2.5">
                        <input type="text" placeholder={`Question ${idx + 1}`}
                          value={q.question_text} onChange={e => updateQ(idx, { question_text: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <select value={q.question_type} onChange={e => updateQ(idx, { question_type: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none">
                            {QUESTION_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                            <input type="checkbox" checked={q.required} onChange={e => updateQ(idx, { required: e.target.checked })} />
                            Obligatoire
                          </label>
                        </div>
                        {q.question_type === 'choice' && (
                          <textarea rows={3} placeholder={"Option A\nOption B\nOption C"}
                            value={(q.options || []).join('\n')}
                            onChange={e => updateQ(idx, { options: e.target.value.split('\n') })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        )}
                      </div>
                      <button type="button" onClick={() => removeQ(idx)}
                        className="mt-1.5 text-slate-300 hover:text-red-500 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? 'Sauvegarde...' : isEdit ? 'Mettre à jour' : 'Créer le sondage'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal QR Code ─────────────────────────────────────────────────────────
const QrModal = ({ survey, onClose }) => {
  const url      = `${window.location.origin}/survey/${survey.slug}`;
  const canvasId = `qr-${survey.id}`;

  const downloadQR = () => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `sondage-${survey.slug}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-80 p-6 text-center">
        <h3 className="font-bold text-slate-800 mb-1">{survey.title}</h3>
        <p className="text-xs text-slate-400 mb-5">Scannez ce QR code pour accéder au sondage</p>
        <div className="flex justify-center mb-5">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <QRCodeCanvas id={canvasId} value={url} size={180} level="M" />
          </div>
        </div>
        <p className="text-xs text-slate-400 break-all mb-5 font-mono">{url}</p>
        <div className="flex gap-2">
          <button onClick={downloadQR}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 transition-colors">
            <Download className="h-4 w-4" />Télécharger
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Onglet Résultats ──────────────────────────────────────────────────────
const ResultsTab = ({ surveys }) => {
  const [selectedId, setSelectedId] = useState('');
  const [responses, setResponses]   = useState([]);
  const [questions, setQuestions]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [expanded, setExpanded]     = useState(null);

  const loadResults = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true);
    const [{ data: qs }, { data: rs }] = await Promise.all([
      supabase.from('survey_questions').select('*').eq('survey_id', sid).order('order'),
      supabase.from('survey_responses').select('*, survey_answers(*)').eq('survey_id', sid).order('submitted_at', { ascending: false }),
    ]);
    setQuestions(qs || []);
    setResponses(rs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedId) { loadResults(selectedId); setExpanded(null); }
    else { setResponses([]); setQuestions([]); }
  }, [selectedId]);

  const fmt = (ts) => new Date(ts).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">— Choisir un sondage —</option>
          {surveys.map(s => (
            <option key={s.id} value={s.id}>{s.title} ({s.response_count ?? 0} réponse{s.response_count !== 1 ? 's' : ''})</option>
          ))}
        </select>
        {selectedId && (
          <button onClick={() => loadResults(selectedId)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm transition-colors">↻</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : !selectedId ? (
        <div className="text-center py-14 text-slate-300">
          <BarChart2 className="h-12 w-12 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Sélectionnez un sondage pour voir les résultats</p>
        </div>
      ) : responses.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">
          Aucune réponse pour ce sondage
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
            {responses.length} réponse{responses.length > 1 ? 's' : ''}
          </p>
          {responses.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {r.is_anonymous
                      ? <span className="text-slate-500">Anonyme <span className="text-xs font-mono text-slate-400">#{r.anonymous_id?.slice(-6)}</span></span>
                      : (r.respondent_name || 'Sans nom')}
                    {r.respondent_phone && (
                      <span className="ml-2 text-xs font-normal text-slate-400">{r.respondent_phone}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{fmt(r.submitted_at)}</p>
                </div>
                {expanded === r.id
                  ? <ChevronUp className="h-4 w-4 text-slate-400" />
                  : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </div>

              {expanded === r.id && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                  {questions.map(q => {
                    const ans = r.survey_answers?.find(a => a.question_id === q.id);
                    return (
                      <div key={q.id}>
                        <p className="text-xs text-slate-400 mb-1">{q.question_text}</p>
                        {q.question_type === 'rating' ? (
                          <div className="flex gap-1 items-center">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`h-4 w-4 ${(ans?.answer_value || 0) >= s ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
                            ))}
                            <span className="text-xs text-slate-500 ml-1">{ans?.answer_value || 0}/5</span>
                          </div>
                        ) : q.question_type === 'nps' ? (
                          ans?.answer_value != null ? (
                            <span className={`text-lg font-bold ${
                              ans.answer_value <= 6 ? 'text-red-500' : ans.answer_value <= 8 ? 'text-amber-500' : 'text-green-600'
                            }`}>{ans.answer_value}<span className="text-xs font-normal text-slate-400 ml-1">/10</span></span>
                          ) : <p className="text-sm text-slate-300 italic">Sans réponse</p>
                        ) : ans?.answer_text ? (
                          <p className="text-sm font-semibold text-slate-800">{ans.answer_text}</p>
                        ) : (
                          <p className="text-sm text-slate-300 italic">Sans réponse</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────────────────
export default function Surveys() {
  const [tab, setTab]           = useState('surveys');
  const [surveys, setSurveys]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSurvey, setEditSurvey] = useState(null);
  const [qrSurvey, setQrSurvey]   = useState(null);
  const [copied, setCopied]     = useState(null);
  const [deleting, setDeleting] = useState(null);

  const loadSurveys = async () => {
    setLoading(true);
    const { data: ss } = await supabase.from('surveys').select('*').order('created_at', { ascending: false });
    const surveysWithCounts = await Promise.all((ss || []).map(async (s) => {
      const { count } = await supabase.from('survey_responses')
        .select('id', { count: 'exact', head: true }).eq('survey_id', s.id);
      return { ...s, response_count: count || 0 };
    }));
    setSurveys(surveysWithCounts);
    setLoading(false);
  };

  useEffect(() => { loadSurveys(); }, []);

  const toggleActive = async (s) => {
    await supabase.from('surveys').update({ is_active: !s.is_active }).eq('id', s.id);
    setSurveys(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x));
  };

  const copyLink = (s) => {
    navigator.clipboard.writeText(`${window.location.origin}/survey/${s.slug}`);
    setCopied(s.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const deleteSurvey = async (s) => {
    if (!window.confirm(`Supprimer "${s.title}" et toutes ses réponses ?`)) return;
    setDeleting(s.id);
    await supabase.from('surveys').delete().eq('id', s.id);
    setSurveys(prev => prev.filter(x => x.id !== s.id));
    setDeleting(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sondages</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Créez des questionnaires et partagez-les via lien ou QR code
          </p>
        </div>
        {tab === 'surveys' && (
          <button onClick={() => { setEditSurvey(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors shrink-0">
            <Plus className="h-4 w-4" />Nouveau sondage
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'surveys', label: 'Sondages', icon: ClipboardList },
          { id: 'results', label: 'Résultats', icon: BarChart2 },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon className="h-4 w-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* ── Onglet Sondages ── */}
      {tab === 'surveys' && (
        loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-semibold text-slate-600 mb-1">Aucun sondage</p>
            <p className="text-sm">Créez votre premier sondage et partagez-le</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {surveys.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 leading-snug truncate">{s.title}</h3>
                    {s.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{s.description}</p>
                    )}
                  </div>
                  <button onClick={() => toggleActive(s)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                      s.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}>
                    {s.is_active ? 'Actif' : 'Inactif'}
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold">
                    {s.response_count} réponse{s.response_count !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-slate-400 font-mono truncate">/survey/{s.slug}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => copyLink(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                    {copied === s.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === s.id ? 'Copié !' : 'Lien'}
                  </button>
                  <button onClick={() => setQrSurvey(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                    <QrCode className="h-3.5 w-3.5" />QR Code
                  </button>
                  <a href={`/survey/${s.slug}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" />Aperçu
                  </a>
                  <button onClick={() => { setEditSurvey(s); setModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-amber-300 hover:text-amber-600 transition-colors">
                    <Edit2 className="h-3.5 w-3.5" />Modifier
                  </button>
                  <button onClick={() => deleteSurvey(s)} disabled={deleting === s.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-100 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                    {deleting === s.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Onglet Résultats ── */}
      {tab === 'results' && <ResultsTab surveys={surveys} />}

      {/* Modals */}
      {modalOpen && (
        <SurveyModal
          survey={editSurvey}
          onClose={() => { setModalOpen(false); setEditSurvey(null); }}
          onSaved={() => { setModalOpen(false); setEditSurvey(null); loadSurveys(); }}
        />
      )}
      {qrSurvey && <QrModal survey={qrSurvey} onClose={() => setQrSurvey(null)} />}
    </div>
  );
}
