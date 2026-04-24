import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlobalSearch from '@/components/common/GlobalSearch';
import NotificationBell from '@/components/common/NotificationBell';
import useTheme from '@/hooks/useTheme';

const MainContentHeader = ({ title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.key !== 'default';
  const { isDark, toggle } = useTheme();

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard');
  };

  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
      {canGoBack && (
        <Button variant="ghost" size="icon" onClick={handleBack}
          className="text-gray-600 hover:bg-gray-100 hover:text-gray-800 flex-shrink-0" title="Retour">
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}
      <h1 className="text-xl font-bold text-gray-800 flex-shrink-0">{title}</h1>
      <div className="flex-1 flex items-center justify-end gap-2">
        <button
          onClick={toggle}
          title={isDark ? 'Mode clair' : 'Mode sombre'}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <NotificationBell />
        <GlobalSearch />
      </div>
    </div>
  );
};

export default MainContentHeader;
