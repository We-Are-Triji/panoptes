import { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || '';
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileUA = mobileRegex.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileUA || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export function MobileBlocker() {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-8">
        <Monitor className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="font-mono text-2xl text-white mb-2 uppercase tracking-wider">
          Desktop Required
        </h1>
        <p className="font-mono text-sm text-zinc-400 max-w-sm leading-relaxed">
          Panoptes is a professional blockchain monitoring tool designed for desktop use. 
          Please access this application from a desktop or laptop computer.
        </p>
      </div>
      <div className="border border-zinc-800 rounded-sm p-4 bg-zinc-900/50">
        <p className="font-mono text-xs text-zinc-500">
          Minimum recommended: 1024px width
        </p>
      </div>
    </div>
  );
}
