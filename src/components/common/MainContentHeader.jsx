import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlobalSearch from '@/components/common/GlobalSearch';

const MainContentHeader = ({ title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.key !== 'default';

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
      <div className="flex-1 flex justify-end">
        <GlobalSearch />
      </div>
    </div>
  );
};

export default MainContentHeader;
