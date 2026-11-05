import React, { useState } from 'react';
import {
  loginWithGoogle,
  loginAsGuest,
  getCurrentDomain,
  getRequiredDomainsList,
  AuthErrorInfo,
  parseAuthError,
} from '../services/authService';
import { soundFX } from '../utils/soundEffects';
import { UserVipIcon3D, Gem3D } from './Icons3D';
import { type User } from '../firebase';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAuthSuccess?: (user: User) => void;
  initialError?: AuthErrorInfo | null;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  initialError,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [connectingMsg, setConnectingMsg] = useState<string>('Conectando con Google...');
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(initialError || null);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDomain = getCurrentDomain() || 'Dominio actual';
  const allDomains = getRequiredDomainsList();

  const handleStartGoogleSignIn = async (preferRedirect = false) => {
    setLoading(true);
    setErrorInfo(null);
    setSuccessNotice(null);
    setConnectingMsg(
      preferRedirect
        ? 'Redirigiendo al selector oficial de Google...'
        : 'Abriendo selector de cuenta de Google...'
    );
    soundFX.playTileClick();

    try {
      const user = await loginWithGoogle({ preferRedirect });
      soundFX.playChestFanfare();
      setSuccessNotice(`¡Cuenta conectada correctamente! (${user.email || 'Usuario Google'})`);
      if (onAuthSuccess) {
        onAuthSuccess(user);
      }
      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      soundFX.playMineDetonation();
      const parsed = parseAuthError(err);
      setErrorInfo(parsed);
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    setErrorInfo(null);
    setSuccessNotice(null);
    setConnectingMsg('Iniciando sesión como Invitado...');
    soundFX.playTileClick();

    try {
      const guest = await loginAsGuest();
      soundFX.playGemReveal();
      setSuccessNotice('Sesión de Invitado iniciada. Puedes analizar partidas sin restricciones.');
      if (onAuthSuccess) {
        onAuthSuccess(guest);
      }
      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const parsed = parseAuthError(err);
      setErrorInfo(parsed);
      setLoading(false);
    }
  };

  const handleCopyText = (text: string) => {
    soundFX.playTileClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedDomain(text);
      setTimeout(() => setCopiedDomain(null), 2500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-gradient-to-b from-[#0e172e] via-[#091124] to-[#040814] border-2 border-cyan-500/50 rounded-3xl p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.95)] my-auto overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular Ambient Glow Rings */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/25 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 p-[2px] shadow-[0_0_15px_rgba(6,182,212,0.4)] shrink-0">
              <div className="w-full h-full bg-[#081022] rounded-[14px] flex items-center justify-center">
                <UserVipIcon3D className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Firebase Google Auth</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  WIN10K VIP
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Conexión segura oficial con tu cuenta de Google
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center text-sm font-bold active:scale-95"
            title="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-4 relative z-10">
          {/* Ongoing Loading State */}
          {loading && (
            <div className="p-5 rounded-2xl bg-[#09152b] border border-cyan-500/40 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{connectingMsg}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecciona tu cuenta en el diálogo de Google para confirmar la autenticación.
                </p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successNotice && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-400 text-emerald-200 text-xs flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse">
              <span className="text-xl shrink-0">✓</span>
              <span className="font-semibold">{successNotice}</span>
            </div>
          )}

          {/* Error: UNAUTHORIZED DOMAIN (Exact Diagnostic & Actionable Guidance) */}
          {errorInfo && errorInfo.isDomainError && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#241315] to-[#1a0a0c] border-2 border-rose-500/70 text-slate-200 text-xs space-y-3 shadow-xl">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-rose-900 border border-rose-400 text-white font-black text-xs flex items-center justify-center shrink-0">
                  !
                </span>
                <div>
                  <h4 className="font-black text-white text-sm">{errorInfo.title}</h4>
                  <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    Firebase Authentication exige que cada dominio esté registrado en la lista de{' '}
                    <strong>Dominios Autorizados</strong> en Firebase Console para permitir el acceso con Google.
                  </p>
                </div>
              </div>

              {/* Detected Hostname Card */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/30 flex items-center justify-between gap-2">
                <div className="overflow-hidden">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                    Tu Dominio Actual:
                  </span>
                  <code className="text-xs font-mono font-black text-cyan-300 truncate block">
                    {currentDomain}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(currentDomain)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0 transition"
                >
                  {copiedDomain === currentDomain ? '¡Copiado! ✓' : '📋 Copiar'}
                </button>
              </div>

              {/* Action Buttons to Resolve */}
              <div className="space-y-2 pt-1">
                <a
                  href={errorInfo.consoleSettingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30"
                >
                  <span>Abrir Firebase Console (Dominios Autorizados) ↗</span>
                </a>

                <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                  Ruta: <strong>Authentication &gt; Ajustes &gt; Dominios autorizados &gt; Agregar dominio</strong>. Pega{' '}
                  <code className="text-cyan-300 font-mono">{currentDomain}</code> y haz clic en Guardar.
                </p>
              </div>

              {/* Required Domains Quick List */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Lista completa de dominios de MINES AI recomendados:
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[10px] text-slate-300">
                  {allDomains.map((dom) => (
                    <div
                      key={dom}
                      className="flex items-center justify-between p-1 rounded bg-slate-900/60 border border-slate-800/80"
                    >
                      <span className="truncate pr-2">{dom}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(dom)}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 hover:bg-slate-700 shrink-0"
                      >
                        {copiedDomain === dom ? '✓' : 'Copiar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Other Errors (Popup Blocked, Closed, etc.) */}
          {errorInfo && !errorInfo.isDomainError && (
            <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <span>⚠️</span>
                <span>{errorInfo.title}</span>
              </div>
              <p className="text-slate-300 leading-relaxed">{errorInfo.message}</p>
              {errorInfo.code === 'auth/popup-blocked' && (
                <button
                  type="button"
                  onClick={() => handleStartGoogleSignIn(true)}
                  className="mt-2 w-full py-2 px-3 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-black transition"
                >
                  Intentar con Redirección de Página
                </button>
              )}
            </div>
          )}

          {/* Already logged in info */}
          {currentUser && !loading && (
            <div className="p-4 rounded-2xl bg-[#09152b] border border-cyan-500/30 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-cyan-400 block">
                  Usuario Activo:
                </span>
                <p className="text-sm font-bold text-white">{currentUser.email || 'Usuario Conectado'}</p>
                <p className="text-[10px] text-slate-400 font-mono">UID: {currentUser.uid}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-xl bg-emerald-950 border border-emerald-400 text-emerald-300 font-bold">
                Conectado
              </span>
            </div>
          )}

          {/* Feature explanations */}
          {!currentUser && !errorInfo && !loading && (
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#081224] border border-slate-800">
                <Gem3D className="w-5 h-5 shrink-0" />
                <span>
                  <strong>Sincronización en la Nube:</strong> Guarda tus análisis de 3 casillas WIN10K de forma permanente en Cloud Firestore.
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#081224] border border-slate-800">
                <UserVipIcon3D className="w-5 h-5 shrink-0" />
                <span>
                  <strong>Sesión Persistente:</strong> Tu cuenta se mantiene activa automáticamente entre recargas y visitas.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 relative z-10">
          <button
            type="button"
            onClick={handleGuestSignIn}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition active:scale-95 disabled:opacity-50"
          >
            Continuar como Invitado
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleStartGoogleSignIn(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-600/30 transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{currentUser ? 'Reconectar Google' : 'Conectar con Google'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
