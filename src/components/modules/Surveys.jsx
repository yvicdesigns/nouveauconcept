import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Plus, Copy, QrCode, Trash2, Edit2, ChevronDown, ChevronUp,
  Loader2, ExternalLink, X, Check, ClipboardList, BarChart2,
  Star, Download, TrendingUp, MessageCircle,
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
    { id: `new_${Date.now()}`, question_text: '', question_type: 'text', options: [], required: false, order: prev.length, condition: null },
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
          condition: q.condition || null,
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

                        {/* ── Condition d'affichage ── */}
                        {idx > 0 && (
                          <div className="border-t border-slate-200 pt-2.5">
                            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                              <input type="checkbox"
                                checked={!!q.condition}
                                onChange={e => updateQ(idx, {
                                  condition: e.target.checked ? { q_order: 0, op: 'lte', val: '' } : null
                                })}
                              />
                              <span className="font-semibold text-slate-600">Afficher sous condition</span>
                            </label>

                            {q.condition && (
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs bg-blue-50 border border-blue-100 rounded-lg p-2">
                                <span className="text-slate-500 font-medium">Afficher si</span>
                                <select
                                  value={q.condition.q_order}
                                  onChange={e => updateQ(idx, { condition: { ...q.condition, q_order: Number(e.target.value), val: '' } })}
                                  className="px-2 py-1 rounded-lg border border-blue-200 bg-white focus:outline-none max-w-[150px] font-medium"
                                >
                                  {questions.slice(0, idx).map((pq, pi) => (
                                    <option key={pi} value={pi}>
                                      Q{pi + 1} — {(pq.question_text || `Question ${pi + 1}`).slice(0, 22)}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={q.condition.op}
                                  onChange={e => updateQ(idx, { condition: { ...q.condition, op: e.target.value } })}
                                  className="px-2 py-1 rounded-lg border border-blue-200 bg-white focus:outline-none font-bold"
                                >
                                  <option value="lte">≤</option>
                                  <option value="gte">≥</option>
                                  <option value="eq">=</option>
                                  <option value="neq">≠</option>
                                </select>
                                {['rating', 'nps'].includes(questions[q.condition.q_order]?.question_type) ? (
                                  <input type="number"
                                    value={q.condition.val}
                                    onChange={e => updateQ(idx, { condition: { ...q.condition, val: e.target.value } })}
                                    min={questions[q.condition.q_order]?.question_type === 'nps' ? 0 : 1}
                                    max={questions[q.condition.q_order]?.question_type === 'nps' ? 10 : 5}
                                    className="w-14 px-2 py-1 rounded-lg border border-blue-200 bg-white focus:outline-none text-center font-bold"
                                  />
                                ) : questions[q.condition.q_order]?.question_type === 'yesno' ? (
                                  <select
                                    value={q.condition.val}
                                    onChange={e => updateQ(idx, { condition: { ...q.condition, val: e.target.value } })}
                                    className="px-2 py-1 rounded-lg border border-blue-200 bg-white focus:outline-none font-medium"
                                  >
                                    <option value="Oui">Oui</option>
                                    <option value="Non">Non</option>
                                  </select>
                                ) : questions[q.condition.q_order]?.question_type === 'choice' ? (
                                  <select
                                    value={q.condition.val}
                                    onChange={e => updateQ(idx, { condition: { ...q.condition, val: e.target.value } })}
                                    className="px-2 py-1 rounded-lg border border-blue-200 bg-white focus:outline-none max-w-[130px] font-medium"
                                  >
                                    {(questions[q.condition.q_order]?.options || []).filter(Boolean).map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input type="text"
                                    value={q.condition.val}
                                    onChange={e => updateQ(idx, { condition: { ...q.condition, val: e.target.value } })}
                                    placeholder="valeur"
                                    className="w-24 px-2 py-1 rounded-lg border border-blue-200 bg-white focus:outline-none"
                                  />
                                )}
                              </div>
                            )}
                          </div>
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
        <button
          onClick={() => window.open(
            `https://wa.me/?text=${encodeURIComponent(
              `Bonjour, merci d'avoir choisi Nouveau Concept ! Partagez-nous votre avis en 2 minutes : ${url}`
            )}`,
            '_blank', 'noopener'
          )}
          className="w-full mb-2 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-1.5 transition-colors">
          <MessageCircle className="h-4 w-4" />Envoyer via WhatsApp
        </button>
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

// ── Analytics : sous-composants ──────────────────────────────────────────
const KpiCard = ({ label, value, unit, icon, bg, text }) => (
  <div className={`rounded-2xl border p-4 ${bg}`}>
    <div className="text-2xl mb-1">{icon}</div>
    <p className={`text-2xl font-black ${text}`}>
      {value}<span className="text-sm font-normal ml-0.5 opacity-70">{unit}</span>
    </p>
    <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
  </div>
);

const NpsBar = ({ answers }) => {
  const total      = answers.length;
  const promoters  = answers.filter(a => a.answer_value >= 9).length;
  const passives   = answers.filter(a => a.answer_value >= 7 && a.answer_value <= 8).length;
  const detractors = answers.filter(a => a.answer_value <= 6).length;
  const pct = n => total ? Math.round(n / total * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <p className="text-sm font-bold text-slate-700 mb-4">Répartition NPS</p>
      <div className="flex h-5 rounded-full overflow-hidden gap-0.5 mb-3">
        {pct(detractors) > 0 && <div className="bg-red-400 flex items-center justify-center text-xs text-white font-bold" style={{ width: `${pct(detractors)}%` }}>{pct(detractors) > 8 ? `${pct(detractors)}%` : ''}</div>}
        {pct(passives)   > 0 && <div className="bg-amber-300 flex items-center justify-center text-xs text-white font-bold" style={{ width: `${pct(passives)}%`   }}>{pct(passives)   > 8 ? `${pct(passives)}%`   : ''}</div>}
        {pct(promoters)  > 0 && <div className="bg-green-400 flex items-center justify-center text-xs text-white font-bold" style={{ width: `${pct(promoters)}%`  }}>{pct(promoters)  > 8 ? `${pct(promoters)}%`  : ''}</div>}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Détracteurs 0–6 <strong>({detractors})</strong></span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block" />Passifs 7–8 <strong>({passives})</strong></span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />Promoteurs 9–10 <strong>({promoters})</strong></span>
      </div>
    </div>
  );
};

const MonthlyChart = ({ data }) => {
  const H = 80;
  const barCount = data.length;
  const gap = 6;
  const svgW = 300;
  const barW = Math.max(8, Math.floor((svgW - gap * (barCount - 1)) / barCount));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <p className="text-sm font-bold text-slate-700 mb-5">Évolution mensuelle de la satisfaction</p>
      <svg viewBox={`0 0 ${svgW} ${H + 22}`} className="w-full overflow-visible">
        {data.map((d, i) => {
          const h    = Math.round((d.avg / 5) * H);
          const x    = i * (barW + gap);
          const y    = H - h;
          const fill = d.avg >= 4 ? '#4ade80' : d.avg >= 3 ? '#fbbf24' : '#f87171';
          return (
            <g key={d.month}>
              <rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx={3} fill={fill} opacity={0.85} />
              <text x={x + barW / 2} y={Math.max(y - 3, 8)} textAnchor="middle" fontSize={8} fill="#64748b" fontWeight="600">
                {d.avg.toFixed(1)}
              </text>
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize={8} fill="#94a3b8">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const QuestionBreakdown = ({ bd }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5">
    <p className="text-sm font-bold text-slate-700 mb-0.5 leading-snug">{bd.question.question_text}</p>
    <p className="text-xs text-slate-400 mb-4">{bd.total} réponse{bd.total !== 1 ? 's' : ''}</p>
    <div className="space-y-2.5">
      {bd.counts.map(c => {
        const pct = bd.total ? Math.round(c.count / bd.total * 100) : 0;
        return (
          <div key={c.label} className="flex items-center gap-3">
            <span className="text-xs text-slate-600 w-32 shrink-0 truncate">{c.label}</span>
            <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-700 w-8 text-right shrink-0">{pct}%</span>
            <span className="text-xs text-slate-400 w-6 text-right shrink-0 hidden sm:block">({c.count})</span>
          </div>
        );
      })}
    </div>
  </div>
);

// ── Onglet Analytiques ────────────────────────────────────────────────────
const AnalyticsTab = ({ surveys }) => {
  const [selectedId, setSelectedId] = useState('');
  const [questions, setQuestions]   = useState([]);
  const [responses, setResponses]   = useState([]);
  const [loading, setLoading]       = useState(false);

  const load = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true);
    const [{ data: qs }, { data: rs }] = await Promise.all([
      supabase.from('survey_questions').select('*').eq('survey_id', sid).order('order'),
      supabase.from('survey_responses').select('*, survey_answers(*)').eq('survey_id', sid).order('submitted_at'),
    ]);
    setQuestions(qs || []);
    setResponses(rs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedId) load(selectedId);
    else { setQuestions([]); setResponses([]); }
  }, [selectedId]);

  const allAnswers = useMemo(() => responses.flatMap(r => r.survey_answers || []), [responses]);
  const ratingQ    = useMemo(() => questions.find(q => q.question_type === 'rating'), [questions]);
  const npsQ       = useMemo(() => questions.find(q => q.question_type === 'nps'),    [questions]);

  const ratingAnswers = useMemo(() =>
    ratingQ ? allAnswers.filter(a => a.question_id === ratingQ.id && a.answer_value != null) : [],
    [allAnswers, ratingQ]);

  const avgSat = useMemo(() =>
    ratingAnswers.length ? ratingAnswers.reduce((s, a) => s + a.answer_value, 0) / ratingAnswers.length : null,
    [ratingAnswers]);

  const npsAnswers = useMemo(() =>
    npsQ ? allAnswers.filter(a => a.question_id === npsQ.id && a.answer_value != null) : [],
    [allAnswers, npsQ]);

  const { npsScore, promoterPct } = useMemo(() => {
    if (!npsAnswers.length) return { npsScore: null, promoterPct: null };
    const promoters  = npsAnswers.filter(a => a.answer_value >= 9).length;
    const detractors = npsAnswers.filter(a => a.answer_value <= 6).length;
    return {
      npsScore:    Math.round((promoters - detractors) / npsAnswers.length * 100),
      promoterPct: Math.round(promoters / npsAnswers.length * 100),
    };
  }, [npsAnswers]);

  const monthlyTrend = useMemo(() => {
    if (!ratingQ || !responses.length) return [];
    const months = {};
    responses.forEach(r => {
      const month = r.submitted_at.slice(0, 7);
      const ans   = r.survey_answers?.find(a => a.question_id === ratingQ.id);
      if (!months[month]) months[month] = { sum: 0, count: 0 };
      if (ans?.answer_value) { months[month].sum += ans.answer_value; months[month].count += 1; }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, { sum, count }]) => ({
        month,
        label: new Date(month + '-02').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        avg:   count ? sum / count : 0,
      }));
  }, [responses, ratingQ]);

  const breakdowns = useMemo(() =>
    questions
      .filter(q => ['choice', 'yesno'].includes(q.question_type))
      .map(q => {
        const qAns = allAnswers.filter(a => a.question_id === q.id && a.answer_text);
        const opts  = q.question_type === 'yesno' ? ['Oui', 'Non'] : (q.options || []).filter(Boolean);
        return {
          question: q,
          total:    qAns.length,
          counts:   opts.map(opt => ({ label: opt, count: qAns.filter(a => a.answer_text === opt).length })),
        };
      }),
    [questions, allAnswers]);

  const npsColor = npsScore === null ? '' : npsScore >= 50 ? 'text-green-600' : npsScore >= 0 ? 'text-amber-500' : 'text-red-500';
  const satBg    = avgSat === null ? 'bg-slate-50 border-slate-100' : avgSat >= 4 ? 'bg-green-50 border-green-100' : avgSat >= 3 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';
  const satText  = avgSat === null ? 'text-slate-400' : avgSat >= 4 ? 'text-green-700' : avgSat >= 3 ? 'text-amber-700' : 'text-red-700';
  const npsBg    = npsScore === null ? 'bg-slate-50 border-slate-100' : npsScore >= 50 ? 'bg-green-50 border-green-100' : npsScore >= 0 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">— Choisir un sondage —</option>
          {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        {selectedId && <button onClick={() => load(selectedId)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">↻</button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : !selectedId ? (
        <div className="text-center py-14 text-slate-300">
          <TrendingUp className="h-12 w-12 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Sélectionnez un sondage pour voir les statistiques</p>
        </div>
      ) : responses.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">Aucune réponse pour ce sondage</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard icon="📊" label="Total réponses"   value={responses.length}                                            unit=""   bg="bg-blue-50 border-blue-100"   text="text-blue-700" />
            <KpiCard icon="⭐" label="Satisfaction moy." value={avgSat ? avgSat.toFixed(1) : '—'}                           unit="/5" bg={satBg}                         text={satText} />
            <KpiCard icon="📈" label="Score NPS"        value={npsScore !== null ? (npsScore > 0 ? '+' : '') + npsScore : '—'} unit=""   bg={npsBg}                       text={`font-black ${npsColor}`} />
            <KpiCard icon="😊" label="Taux promoteurs"  value={promoterPct !== null ? promoterPct : '—'}                   unit="%"  bg="bg-purple-50 border-purple-100" text="text-purple-700" />
          </div>

          {/* NPS breakdown */}
          {npsAnswers.length > 0 && <NpsBar answers={npsAnswers} />}

          {/* Monthly trend */}
          {monthlyTrend.length > 1 && <MonthlyChart data={monthlyTrend} />}

          {/* Question breakdowns */}
          {breakdowns.map(bd => <QuestionBreakdown key={bd.question.id} bd={bd} />)}
        </>
      )}
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

  const shareWhatsApp = (s) => {
    const url = `${window.location.origin}/survey/${s.slug}`;
    const message =
      `Bonjour, merci d'avoir choisi Nouveau Concept ! ` +
      `Partagez-nous votre avis en 2 minutes : ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
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
          { id: 'surveys',   label: 'Sondages',    icon: ClipboardList },
          { id: 'results',   label: 'Résultats',   icon: BarChart2 },
          { id: 'analytics', label: 'Analytiques', icon: TrendingUp },
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
                  <button onClick={() => shareWhatsApp(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-200 text-xs font-semibold text-green-600 hover:border-green-400 hover:bg-green-50 transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" />WhatsApp
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

      {/* ── Onglet Analytiques ── */}
      {tab === 'analytics' && <AnalyticsTab surveys={surveys} />}

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
