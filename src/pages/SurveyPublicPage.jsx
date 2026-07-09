import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { CheckCircle, Loader2, Star, User, Phone, UserX } from 'lucide-react';

export default function SurveyPublicPage() {
  const { slug } = useParams();
  const [survey, setSurvey]     = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: s, error: sErr } = await supabase
        .from('surveys').select('*').eq('slug', slug).eq('is_active', true).single();
      if (sErr || !s) { setNotFound(true); setLoading(false); return; }
      const { data: q } = await supabase
        .from('survey_questions').select('*').eq('survey_id', s.id).order('order');
      setSurvey(s);
      setQuestions(q || []);
      setLoading(false);
    };
    load();
  }, [slug]);

  const setAnswer = (qid, value, type) => {
    setAnswers(prev => ({
      ...prev,
      [qid]: type === 'rating' ? { value } : { text: String(value) },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const anonId = isAnonymous
        ? `anon_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        : null;

      const { data: resp, error: rErr } = await supabase
        .from('survey_responses')
        .insert({
          survey_id:        survey.id,
          respondent_name:  isAnonymous ? null : name  || null,
          respondent_phone: isAnonymous ? null : phone || null,
          is_anonymous:     isAnonymous,
          anonymous_id:     anonId,
        }).select().single();
      if (rErr) throw rErr;

      const rows = questions.map(q => ({
        response_id:  resp.id,
        question_id:  q.id,
        answer_text:  answers[q.id]?.text  ?? null,
        answer_value: answers[q.id]?.value ?? null,
      }));
      const { error: aErr } = await supabase.from('survey_answers').insert(rows);
      if (aErr) throw aErr;

      setSubmitted(true);
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="text-5xl mb-4">🔍</div>
      <h1 className="text-xl font-bold text-slate-800 mb-2">Sondage introuvable</h1>
      <p className="text-slate-500">Ce sondage n'existe pas ou n'est plus disponible.</p>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Merci !</h1>
      <p className="text-slate-500 max-w-xs">Votre réponse a été enregistrée avec succès.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto">

        {/* En-tête du sondage */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
            <img src="/logo.png" alt="" className="h-8 w-8 object-contain"
              onError={e => { e.target.style.display = 'none'; }} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{survey.title}</h1>
          {survey.description && (
            <p className="text-slate-500 mt-1 text-sm leading-relaxed">{survey.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Identité */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">Votre identité</p>

            <div className="flex gap-2 mb-4">
              <button type="button" onClick={() => setIsAnonymous(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                  !isAnonymous ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>
                <User className="h-4 w-4" />Identifié(e)
              </button>
              <button type="button" onClick={() => setIsAnonymous(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                  isAnonymous ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>
                <UserX className="h-4 w-4" />Anonyme
              </button>
            </div>

            {!isAnonymous ? (
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="text" placeholder="Votre nom"
                    value={name} onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="tel" placeholder="Votre numéro de téléphone"
                    value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-1">
                Vos réponses seront enregistrées de façon anonyme.
              </p>
            )}
          </div>

          {/* Questions */}
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <p className="text-sm font-semibold text-slate-800 mb-4 leading-snug">
                <span className="text-blue-600 mr-1">{idx + 1}.</span>
                {q.question_text}
                {q.required && <span className="text-red-500 ml-1">*</span>}
              </p>

              {q.question_type === 'text' && (
                <textarea rows={3} placeholder="Votre réponse..."
                  value={answers[q.id]?.text || ''}
                  onChange={e => setAnswer(q.id, e.target.value, 'text')}
                  required={q.required}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}

              {q.question_type === 'rating' && (
                <div className="flex gap-3 justify-center py-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} type="button" onClick={() => setAnswer(q.id, star, 'rating')}
                      className="focus:outline-none transition-transform active:scale-90">
                      <Star className={`h-9 w-9 transition-colors ${
                        (answers[q.id]?.value || 0) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200 fill-slate-200 hover:fill-amber-200 hover:text-amber-200'
                      }`} />
                    </button>
                  ))}
                </div>
              )}

              {q.question_type === 'yesno' && (
                <div className="flex gap-3">
                  {[{ val: 'Oui', cls: 'bg-green-500 border-green-500', hover: 'hover:border-green-300' },
                    { val: 'Non', cls: 'bg-red-500 border-red-500',   hover: 'hover:border-red-300'   }].map(opt => (
                    <button key={opt.val} type="button" onClick={() => setAnswer(q.id, opt.val, 'text')}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                        answers[q.id]?.text === opt.val
                          ? `${opt.cls} text-white shadow-md`
                          : `bg-white text-slate-600 border-slate-200 ${opt.hover}`
                      }`}>
                      {opt.val}
                    </button>
                  ))}
                </div>
              )}

              {q.question_type === 'choice' && (
                <div className="space-y-2">
                  {(q.options || []).map(opt => (
                    <button key={opt} type="button" onClick={() => setAnswer(q.id, opt, 'text')}
                      className={`w-full py-3 px-4 rounded-xl text-sm text-left border-2 transition-all font-medium ${
                        answers[q.id]?.text === opt
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {submitting ? 'Envoi en cours...' : 'Envoyer mes réponses'}
          </button>

          <p className="text-center text-xs text-slate-400 pb-8">
            Sondage créé par <span className="font-semibold">Nouveau Concept</span>
          </p>
        </form>
      </div>
    </div>
  );
}
