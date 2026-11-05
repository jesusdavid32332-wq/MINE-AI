import React, { useState } from 'react';
import { AppSettings } from '../types';
import { updateUserSettings } from '../services/firestoreService';
import { auth, fbSignOut, testConnection, signInWithPopup, googleProvider } from '../firebase';
import {
  Settings,
  User,
  Sliders,
  Bell,
  Smartphone,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings | null;
  onSettingsUpdated: (newSettings: AppSettings) => void;
  userEmail?: string | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsUpdated,
  userEmail,
}) => {
  const [threshold, setThreshold] = useState<number>(settings?.recognitionThreshold ?? 0.7);
  const [minSamples, setMinSamples] = useState<number>(settings?.minimumSamples ?? 20);
  const [haptic, setHaptic] = useState<boolean>(settings?.hapticFeedback ?? true);
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
        hapticFeedback: haptic,
      };
      await updateUserSettings(auth.currentUser.uid, updated);
      onSettingsUpdated({
        userId: auth.currentUser.uid,
        recognitionThreshold: threshold,
        minimumSamples: minSamples,
        theme: settings?.theme || 'dark',
        hapticFeedback: haptic,
        updatedAt: new Date().toISOString(),
      });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingDb(true);
    setDbStatus(null);
    const ok = await testConnection();
    setTestingDb(false);
    setDbStatus(ok ? 'Conexión con Cloud Firestore verificada exitosamente.' : 'No se pudo conectar o el cliente está sin conexión.');
  };

  const handleSignOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Configuración y Parámetros del Sistema
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Personaliza el umbral de reconocimiento de Gemini Vision, filtros estadísticos y sesión de usuario.
            </p>
          </div>
        </div>
      </div>

      {/* User Account Info */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-400" />
          Perfil y Autenticación Firebase
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">Identificador Único (UID)</span>
            <span className="font-mono text-white text-xs break-all">
              {auth.currentUser?.uid || 'No autenticado'}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">Correo Electrónico</span>
            <span className="font-medium text-white text-xs">
              {auth.currentUser?.email || (auth.currentUser?.isAnonymous ? 'Sesión de Invitado / Pruebas' : '—')}
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap justify-between items-center gap-2">
          {!auth.currentUser || auth.currentUser.isAnonymous ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await signInWithPopup(auth, googleProvider);
                } catch (e) {
                  console.error(e);
                }
              }}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center gap-2"
            >
              <User className="w-3.5 h-3.5" />
              Conectar Cuenta de Google
            </button>
          ) : (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Conectado a Firebase Cloud
            </span>
          )}

          {auth.currentUser && (
            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-500/30 transition flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión
            </button>
          )}
        </div>
      </div>

      {/* Vision & Statistics Tuning */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-purple-400" />
          Ajustes de Visión Computacional e Inferencia
        </h3>

        {/* Threshold Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <label className="text-slate-300 font-medium">
              Umbral mínimo de confianza para validación visual:
            </label>
            <span className="font-mono font-bold text-blue-400 text-sm">
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
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <p className="text-[11px] text-slate-500">
            Las detecciones con confianza inferior a este porcentaje se catalogarán como rechazadas en el módulo de validación.
          </p>
        </div>

        {/* Minimum Samples */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex justify-between items-center text-xs">
            <label className="text-slate-300 font-medium">
              Muestras mínimas requeridas para aviso estadístico:
            </label>
            <span className="font-mono font-bold text-purple-400 text-sm">
              {minSamples} partidas
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={minSamples}
            onChange={(e) => setMinSamples(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <p className="text-[11px] text-slate-500">
            MINES AI alertará en los mapas de calor si el volumen de partidas guardadas es inferior a este umbral muestral.
          </p>
        </div>

        {/* Haptic Feedback Toggle */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-300 block">Respuesta Háptica en iPhone / Móvil</span>
            <span className="text-[11px] text-slate-500">Vibración suave al presionar casillas en PWA instalada</span>
          </div>
          <button
            type="button"
            onClick={() => setHaptic(!haptic)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
              haptic ? 'bg-blue-600 justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
          </button>
        </div>

        {/* Save Settings Button */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-emerald-400">
            {savedMessage && 'Ajustes actualizados en Firebase con éxito.'}
          </span>
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveSettings}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition"
          >
            {saving ? 'Guardando...' : 'Guardar Preferencias'}
          </button>
        </div>
      </div>

      {/* Database Diagnostic & Offline Capabilities */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          Diagnóstico de Base de Datos y Persistencia PWA
        </h3>

        <p className="text-xs text-slate-400 leading-relaxed">
          MINES AI utiliza persistencia IndexedDB local para almacenar en caché las partidas y estadísticas previamente consultadas, permitiendo acceder a tu historial incluso sin conexión a Internet.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={testingDb}
            onClick={handleTestConnection}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
            Comprobar Conexión Firestore
          </button>

          {dbStatus && (
            <span className="text-xs text-emerald-400 font-medium">{dbStatus}</span>
          )}
        </div>
      </div>
    </div>
  );
};
