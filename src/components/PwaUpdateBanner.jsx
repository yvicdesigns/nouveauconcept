import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

const PwaUpdateBanner = () => {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="bg-nc-navy text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-xl shrink-0">
          <RefreshCw className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Nouvelle version disponible</p>
          <p className="text-xs text-white/60">Mettez à jour pour voir les dernières modifications</p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="bg-white text-nc-navy text-xs font-bold px-3 py-2 rounded-lg hover:bg-white/90 transition-all shrink-0"
        >
          Mettre à jour
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-white/40 hover:text-white shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PwaUpdateBanner;
