import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MainContentHeader = ({ title }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if there's a history entry to go back to.
  // location.key is 'default' for the initial entry in the stack.
  const canGoBack = location.key !== 'default';

  const handleBack = () => {
    // If we can go back in history, do so.
    // Otherwise, or if we want to be safe, we could fallback to dashboard, 
    // but standard browser behavior is to just go back if possible.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback if accessed directly (though rare in SPA without history)
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex items-center gap-4 p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
      {canGoBack && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBack} 
          className="text-gray-600 hover:bg-gray-100 hover:text-gray-800"
          title="Retour"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
    </div>
  );
};

export default MainContentHeader;