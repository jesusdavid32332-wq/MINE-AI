import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full' | 'icon-only';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isStandalone, isIOS, hasNativePrompt, installApp } = usePWAInstall();
  const [showModal, setShowModal] = useState<boolean>(false);

  // If already running inside standalone PWA mode, don't show install button
  if (isStandalone) {
    return null;
  }

  const handleClick = async () => {
    if (hasNativePrompt) {
      const outcome = await installApp();
      if (outcome === 'dismissed' || outcome === 'unavailable') {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`
          flex items-center gap-1.5 font-bold transition active:scale-95 shadow-md
          ${
            variant === 'full'
              ? 'px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : variant === 'icon-only'
              ? 'w-8 h-8 rounded-xl bg-[#0e2752] hover:bg-[#14366e] border border-cyan-400/40 text-cyan-200 flex items-center justify-center text-xs'
              : 'px-2.5 py-1 rounded-xl bg-gradient-to-r from-cyan-900/80 to-blue-900/80 hover:from-cyan-800 hover:to-blue-800 border border-cyan-400/50 text-cyan-200 text-[11px]'
          }
          ${className}
        `}
        title="Instalar MINES AI en la pantalla de inicio de tu teléfono"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          className="w-3.5 h-3.5 text-cyan-300"
        >
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {variant !== 'icon-only' && <span>Instalar App</span>}
      </button>

      <PWAInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isIOS={isIOS}
        hasNativePrompt={hasNativePrompt}
        onNativeInstall={installApp}
      />
    </>
  );
};
