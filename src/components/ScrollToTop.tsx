import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SCROLL_TO_TOP_EVENT } from '@/utils/ui/scroll';

const scrollToTop = () => {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
};

const ScrollToTop: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    scrollToTop();
  }, [location.pathname]);

  useEffect(() => {
    const handleScrollToTop = () => {
      scrollToTop();
    };

    window.addEventListener(SCROLL_TO_TOP_EVENT, handleScrollToTop);
    return () => {
      window.removeEventListener(SCROLL_TO_TOP_EVENT, handleScrollToTop);
    };
  }, []);

  return null;
};

export default ScrollToTop;
