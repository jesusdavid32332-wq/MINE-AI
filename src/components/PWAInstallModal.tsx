import React from 'react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  onNativeInstall?: () => void;
  hasNativePrompt?: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  onNativeInstall,
  hasNativePrompt,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#0e1f3d] via-[#09152b] to-[#050c1a] border border-cyan-500/40 p-5 sm:p-6 text-slate-100 shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-black text-white text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              M·AI
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide">
                Instalar MINES AI
              </h3>
              <p className="text-[10px] text-cyan-300">Aplicación Móvil Web (PWA)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition"
          >
            ✕
          </button>
        </div>

        {isIOS ? (
          /* iOS Safari Step-by-Step Guide */
          <div className="py-4 space-y-3.5 relative z-10">
            <p className="text-xs text-slate-300 leading-relaxed">
              Instala la aplicación en tu <strong>iPhone o iPad</strong> para abrirla a pantalla completa sin barra de navegación:
            </p>

            <div className="space-y-2.5 text-xs text-slate-200">
              <div className="p-3 rounded-2xl bg-[#081326] border border-cyan-500/30 flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-black text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="text-[11px] leading-relaxed">
                  Pulsa el botón <strong className="text-cyan-300">Compartir</strong> en la barra inferior de Safari (el icono de un recuadro con flecha hacia arriba <span className="inline-block px-1 py-0.5 rounded bg-slate-800 text-[10px]">⎋</span>).
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#081326] border border-cyan-500/30 flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-black text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="text-[11px] leading-relaxed">
                  Desliza hacia abajo en las opciones y selecciona <strong className="text-cyan-300">"Añadir a pantalla de inicio"</strong>.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#081326] border border-cyan-500/30 flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-black text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="text-[11px] leading-relaxed">
                  Pulsa <strong className="text-emerald-400">"Añadir"</strong> en la esquina superior derecha. El icono de MINES AI aparecerá junto a tus otras aplicaciones.
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Android / Desktop Chrome Direct Prompt */
          <div className="py-4 space-y-3 relative z-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-950 to-blue-950 border border-cyan-500/40 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(6,182,212,0.3)]">
              <span className="text-2xl">📲</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Instala <strong>MINES AI</strong> en tu dispositivo para acceder rápidamente con un solo toque desde tu pantalla de inicio, sin barras de navegación y con carga instantánea.
            </p>

            {hasNativePrompt && onNativeInstall ? (
              <button
                type="button"
                onClick={() => {
                  onNativeInstall();
                  onClose();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 transition"
              >
                Instalar Ahora en el Teléfono
              </button>
            ) : (
              <div className="p-3 rounded-2xl bg-[#081326] border border-cyan-500/30 text-left text-[11px] text-slate-300 space-y-1">
                <div className="font-bold text-cyan-300">Para instalar en Android:</div>
                <div>1. Abre el menú del navegador (tres puntos ⋮ arriba a la derecha).</div>
                <div>2. Pulsa <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.</div>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
