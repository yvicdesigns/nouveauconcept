import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

const PwaUpdateBanner = () => {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();
  const [changelog, setChangelog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!needRefresh) return;
    fetch('/changelog.json')
      .then(r => r.json())
      .then(data => {
        setChangelog(data);
        // Mise à jour silencieuse si notify === false
        if (data.notify === false) {
          updateServiceWorker(true);
        }
      })
      .catch(() => {
        // Pas de changelog → mise à jour silencieuse par défaut
        updateServiceWorker(true);
      });
  }, [needRefresh]);

  // N'affiche rien si pas de mise à jour, ou si notify est false (silencieux)
  if (!needRefresh || !changelog || changelog.notify === false) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-nc-navy text-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl shrink-0">
            <Sparkles className="h-5 w-5 text-nc-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{changelog.titre}</p>
            <p className="text-xs text-white/50">Version {changelog.version}</p>
          </div>
          <button
            onClick={() => setNeedRefresh(false)}
            className="text-white/30 hover:text-white shrink-0 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Détails changelog */}
        <button
          onClick={() => setShowDetails(v => !v)}
          className="w-full px-4 pb-2 flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showDetails ? 'Masquer les détails' : 'Voir ce qui a changé'}
        </button>

        {showDetails && (
          <div className="px-4 pb-3 space-y-1 max-h-48 overflow-y-auto">
            {changelog.nouveautes?.map((item, i) => (
              <p key={i} className="text-xs text-white/70 leading-relaxed">{item}</p>
            ))}
            {changelog.corrections?.length > 0 && (
              <>
                <p className="text-xs font-bold text-white/40 uppercase tracking-wide pt-1">Corrections</p>
                {changelog.corrections.map((item, i) => (
                  <p key={i} className="text-xs text-white/70 leading-relaxed">{item}</p>
                ))}
              </>
            )}
          </div>
        )}

        {/* Action */}
        <div className="px-4 pb-4">
          <button
            onClick={() => { updateServiceWorker(true); setTimeout(() => window.location.reload(), 300); }}
            className="w-full bg-white text-nc-navy text-sm font-bold py-2.5 rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Mettre à jour maintenant
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaUpdateBanner;
