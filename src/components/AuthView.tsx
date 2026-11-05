import React, { useState } from 'react';
import {
  loginWithGoogle,
  loginAsGuest,
  parseAuthError,
  AuthErrorInfo,
} from '../services/authService';
import { Sparkles, Camera, Brain, Database } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface AuthViewProps {
  onSuccess?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [authErrorInfo, setAuthErrorInfo] = useState<AuthErrorInfo | null>(null);

  const handleGoogleSignIn = async (preferRedirect = false) => {
    setLoading(true);
    setAuthErrorInfo(null);
    soundFX.playTileClick();
    try {
      await loginWithGoogle({ preferRedirect });
      soundFX.playChestFanfare();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      soundFX.playMineDetonation();
      const parsed = parseAuthError(err);
      setAuthErrorInfo(parsed);
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    setAuthErrorInfo(null);
    soundFX.playTileClick();
    try {
      await loginAsGuest();
      soundFX.playGemReveal();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      setAuthErrorInfo(parsed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#090d16] text-slate-100 relative overflow-hidden">
      {/* Background Lighting Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 mx-auto shadow-xl shadow-blue-500/20">
            <div className="w-full h-full bg-[#090d16] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-wider text-white">MINES AI</h1>
            <p className="text-xs text-blue-400 font-mono font-semibold">ASISTENTE OFICIAL WIN10K</p>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Plataforma profesional para analizar partidas reales de Mines en WIN10K mediante visión computacional y base de datos Cloud Firestore.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="space-y-2 py-2 text-xs text-slate-300">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <Camera className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Reconocimiento de capturas con Gemini 3.8 Flash</span>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <Brain className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Probabilidad combinatoria exacta sin señales falsas</span>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Sincronización en la nube con Firestore y soporte PWA</span>
          </div>
        </div>

        {/* Error message with actionable diagnostics if any */}
        {authErrorInfo && (
          <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-white">
              <span>⚠️</span>
              <span>{authErrorInfo.title}</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-300">{authErrorInfo.message}</p>
            {authErrorInfo.isDomainError && (
              <div className="pt-1.5 border-t border-red-900/60 text-[10px] space-y-1">
                <span className="text-slate-400 block">Dominio a autorizar:</span>
                <code className="text-cyan-300 font-mono block bg-black/40 p-1 rounded">
                  {authErrorInfo.currentDomain}
                </code>
                <a
                  href={authErrorInfo.consoleSettingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-cyan-400 hover:text-cyan-300 underline font-bold"
                >
                  Abrir Firebase Console ↗
                </a>
              </div>
            )}
            {authErrorInfo.code === 'auth/popup-blocked' && (
              <button
                type="button"
                onClick={() => handleGoogleSignIn(true)}
                className="w-full py-1.5 px-2 rounded-lg bg-amber-600 text-black font-bold text-[11px] mt-1"
              >
                Probar Inicio con Redirección
              </button>
            )}
          </div>
        )}

        {/* Auth Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleGoogleSignIn(false)}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white shadow-xl shadow-blue-600/30 transition disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Iniciar Sesión con Google
              </>
            )}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleAnonymousSignIn}
            className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-slate-300 hover:text-white border border-slate-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            Acceder como Invitado (Modo Rápido)
          </button>
        </div>

        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          Tus partidas y muestras quedan aisladas en tu cuenta bajo reglas de seguridad de Firestore Zero-Trust.
        </p>
      </div>
    </div>
  );
};
