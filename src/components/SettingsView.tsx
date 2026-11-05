import React, { useState } from 'react';
import { AppSettings } from '../types';
import { updateUserSettings } from '../services/firestoreService';
import { auth, fbSignOut, testConnection, signInWithPopup, googleProvider } from '../firebase';
import {
  SettingsIcon3D,
  UserVipIcon3D,
  SoundOn3D,
  SoundOff3D,
  Win10kAuditIcon3D,
  ValidationIcon3D,
} from './Icons3D';
import { soundFX } from '../utils/soundEffects';

interface SettingsViewProps {
  settings: AppSettings | null;
  onSettingsUpdated: (newSettings: AppSettings) => void;
  userEmail?: string | null;
  onLoginClick?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsUpdated,
  userEmail,
  onLoginClick,
}) => {
  const [threshold, setThreshold] = useState<number>(settings?.recognitionThreshold ?? 0.7);
  const [minSamples, setMinSamples] = useState<number>(settings?.minimumSamples ?? 20);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundFX.getSoundEnabled());
  const [saving, setSaving] = useState<boolean>(false);
  const [savedMessage, setSavedMessage] = useState<boolean>(false);
  const [testingDb, setTestingDb] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<string | null>(null);

  const handleSaveSettings = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setSavedMessage(false);
    try {
      const updated: Partial<AppSettings> = {
        recognitionThreshold: threshold,
        minimumSamples: minSamples,
        hapticFeedback: soundEnabled,
      };
      await updateUserSettings(auth.currentUser.uid, updated);
      onSettingsUpdated({
        userId: auth.currentUser.uid,
        recognitionThreshold: threshold,
        minimumSamples: minSamples,
        theme: settings?.theme || 'dark',
        hapticFeedback: soundEnabled,
        updatedAt: new Date().toISOString(),
      });
      soundFX.playGemReveal();
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.warn('Aviso al guardar ajustes:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingDb(true);
    setDbStatus(null);
    try {
      const ok = await testConnection();
      soundFX.playTileClick();
      setDbStatus(
        ok
          ? 'Conexión verificada: Cloud Firestore en línea y respondiendo.'
          : 'Advertencia: Firestore no respondió a la prueba de lectura.'
      );
    } catch (err) {
      setDbStatus('Error al conectar con la base de datos.');
    } finally {
      setTestingDb(false);
    }
  };

  const handleSoundToggle = (val: boolean) => {
    soundFX.setSoundEnabled(val);
    setSoundEnabled(val);
    if (val) soundFX.playTileClick();
  };

  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await fbSignOut(auth);
      soundFX.playTileClick();
      setAuthFeedback(null);
    } catch (err) {
      console.warn('Aviso al cerrar sesión:', err);
    }
  };

  const handleLogin = async () => {
    setAuthFeedback(null);
    if (onLoginClick) {
      onLoginClick();
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
      soundFX.playGemReveal();
    } catch (err: unknown) {
      const fbError = err as { code?: string; message?: string };
      console.warn('Aviso de inicio de sesión con Google:', fbError?.code, fbError?.message);
      if (fbError?.code === 'auth/popup-blocked') {
        setAuthFeedback('Habilita las ventanas emergentes (popups) en tu navegador para iniciar sesión con Google.');
      } else if (fbError?.code === 'auth/popup-closed-by-user') {
        setAuthFeedback('Ventana cerrada antes de completar el inicio de sesión.');
      } else if (fbError?.code === 'auth/unauthorized-domain') {
        setAuthFeedback('Dominio no autorizado en Firebase Console. Pulsa "Conectar" para ver los pasos de autorización.');
      } else {
        setAuthFeedback('No se pudo conectar con Google en este entorno.');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#11192e] via-[#0b1020] to-[#15122c] border border-cyan-500/30 p-5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-950/70 border border-cyan-500/40 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0">
            <SettingsIcon3D className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              Ajustes y Configuración VIP
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed">
              Preferencias del analizador, umbrales de visión artificial y estado de conectividad en la nube.
            </p>
          </div>
        </div>
      </div>

      {/* User VIP Profile Box */}
      <div className="bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <UserVipIcon3D className="w-12 h-12 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">
                {userEmail ? userEmail.split('@')[0] : 'Modo Invitado / Sin Conexión'}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                VIP
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {userEmail ? userEmail : 'Inicia sesión con Google para sincronizar tus partidas en Firebase.'}
            </p>
          </div>
        </div>

        {userEmail ? (
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 transition"
          >
            Cerrar Sesión
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLogin}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/30 transition"
          >
            Conectar Google Auth
          </button>
        )}
      </div>

      {/* Auth Feedback Notice */}
      {authFeedback && (
        <div className="p-3.5 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
          <span>{authFeedback}</span>
          <button
            type="button"
            onClick={() => setAuthFeedback(null)}
            className="text-amber-400 hover:text-white px-2 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Audio FX & Casino Experience */}
      <div className="bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          {soundEnabled ? <SoundOn3D className="w-5 h-5" /> : <SoundOff3D className="w-5 h-5" />}
          <span>Efectos Sonoros de Casino</span>
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-200 block">
              Audio Sintetizado Web Audio API
            </span>
            <span className="text-xs text-slate-400">
              Efectos táctiles de clic en casillas, revelación de gemas y fanfarrias.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSoundToggle(!soundEnabled)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
              soundEnabled
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {soundEnabled ? 'ACTIVADO' : 'SILENCIADO'}
          </button>
        </div>
      </div>

      {/* Vision & Threshold Parameters */}
      <div className="bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ValidationIcon3D className="w-5 h-5" />
          <span>Parámetros de Visión y Auditoría</span>
        </h3>

        <div>
          <div className="flex justify-between items-center text-xs text-slate-300 mb-2 font-medium">
            <span>Umbral mínimo de confianza de clasificación</span>
            <span className="font-mono text-cyan-400 font-bold tabular-nums">
              {(threshold * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Las predicciones por debajo de este umbral se etiquetan como dudosas para revisión manual.
          </p>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            disabled={saving || !userEmail}
            onClick={handleSaveSettings}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white transition shadow-lg shadow-cyan-600/30 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Preferencias'}
          </button>
        </div>

        {savedMessage && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl font-semibold">
            ✓ Preferencias actualizadas correctamente en Cloud Firestore.
          </div>
        )}
      </div>

      {/* Database Diagnostic Card */}
      <div className="bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Win10kAuditIcon3D className="w-5 h-5" />
              <span>Diagnóstico de Cloud Firestore</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Base de datos: ai-studio-deabad0d-af15-4a11-94b6-df53f1778164
            </p>
          </div>
          <button
            type="button"
            disabled={testingDb}
            onClick={handleTestConnection}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#131b31] border border-slate-700 hover:border-cyan-400 text-slate-200 transition"
          >
            {testingDb ? 'Probando...' : 'Probar Conexión'}
          </button>
        </div>

        {dbStatus && (
          <div className="p-3 rounded-xl bg-[#11192e] border border-slate-700 text-xs text-cyan-300 font-mono">
            {dbStatus}
          </div>
        )}
      </div>
    </div>
  );
};
