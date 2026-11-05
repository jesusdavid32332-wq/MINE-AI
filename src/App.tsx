import React, { useState, useEffect } from 'react';
import {
  auth,
  onAuthStateChanged,
  testConnection,
  signInWithPopup,
  googleProvider,
  type User
} from './firebase';
import {
  subscribeToUserGames,
  subscribeToTrainingSamples,
  getUserSettings
} from './services/firestoreService';
import { GameRecord, TrainingSample, AppSettings } from './types';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { AnalyzerView } from './components/AnalyzerView';
import { ProbabilityView } from './components/ProbabilityView';
import { HeatmapsView } from './components/HeatmapsView';
import { HistoryView } from './components/HistoryView';
import { ValidationView } from './components/ValidationView';
import { Win10kAuditView } from './components/Win10kAuditView';
import { SettingsView } from './components/SettingsView';
import { UserVipIcon3D, Gem3D } from './components/Icons3D';
import { soundFX } from './utils/soundEffects';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Firestore real-time data
  const [games, setGames] = useState<GameRecord[]>([]);
  const [trainingSamples, setTrainingSamples] = useState<TrainingSample[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Connectivity listener & PWA Service Worker Registration
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register PWA service worker safely
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => console.log('PWA Service Worker registered:', reg.scope))
        .catch((err) => console.warn('SW registration skipped:', err));
    }

    // Verify Firestore connection on boot
    testConnection().catch(() => {});

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Firebase Auth State Tracker with safety timeout to avoid blank screens
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 1000);

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        clearTimeout(fallbackTimer);
        setUser(currentUser);
        setAuthLoading(false);
      },
      (error) => {
        console.warn('Auth observer error (fallback):', error);
        clearTimeout(fallbackTimer);
        setAuthLoading(false);
      }
    );

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  // Realtime Firestore subscriptions for authenticated user
  useEffect(() => {
    if (!user) {
      setGames([]);
      setTrainingSamples([]);
      setSettings(null);
      return;
    }

    // Subscribe to games
    const unsubscribeGames = subscribeToUserGames(
      (data) => setGames(data),
      (err) => console.warn('Games subscription warning:', err)
    );

    // Subscribe to training validation samples
    const unsubscribeSamples = subscribeToTrainingSamples(
      (data) => setTrainingSamples(data),
      (err) => console.warn('Samples subscription warning:', err)
    );

    // Fetch user settings
    getUserSettings(user.uid)
      .then((s) => setSettings(s))
      .catch((err) => console.warn('Settings load warning:', err));

    return () => {
      unsubscribeGames();
      unsubscribeSamples();
    };
  }, [user]);

  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const handleLoginClick = async () => {
    setAuthNotice(null);
    try {
      soundFX.playTileClick();
      await signInWithPopup(auth, googleProvider);
      soundFX.playGemReveal();
    } catch (err: unknown) {
      const fbError = err as { code?: string; message?: string };
      const code = fbError?.code || '';
      console.warn('Google Sign In aviso:', code, fbError?.message);

      if (code === 'auth/popup-blocked') {
        setAuthNotice(
          'El navegador bloqueó la ventana emergente de autenticación. Por favor, habilita las ventanas emergentes (popups) en la barra del navegador para iniciar sesión con Google.'
        );
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthNotice('Ventana de inicio de sesión cerrada. Puedes intentarlo nuevamente cuando desees.');
      } else if (code === 'auth/unauthorized-domain') {
        setAuthNotice(
          'Este dominio de vista previa no está en la lista de dominios autorizados de Firebase Console. Puedes seguir utilizando todas las herramientas como Invitado.'
        );
      } else {
        setAuthNotice(
          'No se pudo completar el inicio de sesión con Google en este entorno. Puedes continuar en modo Invitado.'
        );
      }
    }
  };

  // Quick Loading indicator
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060913] flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-violet-600 p-[2px] shadow-[0_0_30px_rgba(6,182,212,0.4)] animate-pulse mb-4">
          <div className="w-full h-full bg-[#0a0f1e] rounded-[22px] flex items-center justify-center">
            <span className="font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
              M·AI
            </span>
          </div>
        </div>
        <h2 className="text-base font-black text-white tracking-widest">MINES AI PRO</h2>
        <p className="text-xs text-slate-400 font-mono mt-1">Conectando infraestructura WIN10K...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black relative overflow-x-hidden">
      {/* Subtle ambient lighting pools */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-1/3 right-10 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header & Mobile Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOnline={isOnline}
        userEmail={user?.email || (user?.isAnonymous ? 'Invitado' : null)}
        onLoginClick={handleLoginClick}
      />

      {/* Guest Mode VIP sync notice banner if not logged in */}
      {!user && (
        <div className="bg-gradient-to-r from-[#0c1428] via-[#090d18] to-[#120d24] border-b border-cyan-500/20 px-4 py-2.5 text-xs relative z-30">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <span className="flex items-center gap-2.5 text-slate-300">
              <Gem3D className="w-4 h-4 shrink-0" />
              <span>
                <strong>Modo Vista Previa Activo:</strong> Conecta tu cuenta de Google para respaldar tus partidas en Cloud Firestore y sincronizar estadísticas entre dispositivos.
              </span>
            </span>
            <button
              type="button"
              onClick={handleLoginClick}
              className="px-4 py-1.5 rounded-xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-md shadow-cyan-600/25 active:scale-95 transition shrink-0 flex items-center gap-1.5"
            >
              <UserVipIcon3D className="w-4 h-4" />
              Conectar Google Auth
            </button>
          </div>
        </div>
      )}

      {/* Auth Feedback Notice if Popup is Blocked or Domain is Restricted */}
      {authNotice && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/30 px-4 py-2.5 text-xs relative z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-amber-200">
            <span className="flex items-center gap-2">
              <span className="font-bold">Aviso:</span>
              <span>{authNotice}</span>
            </span>
            <button
              type="button"
              onClick={() => setAuthNotice(null)}
              className="text-amber-400 hover:text-white font-bold px-2 py-0.5 rounded transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main View Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-28 lg:pb-12 relative z-20">
        {currentTab === 'dashboard' && (
          <DashboardView
            games={games}
            trainingSamples={trainingSamples}
            onNavigate={(tab) => setCurrentTab(tab)}
            userEmail={user?.email}
          />
        )}

        {currentTab === 'analyzer' && (
          <AnalyzerView
            onGameSaved={(gameId) => {
              setCurrentTab('history');
            }}
            initialMinesCount={3}
            games={games}
          />
        )}

        {currentTab === 'probability' && (
          <ProbabilityView games={games} initialMinesCount={3} />
        )}

        {currentTab === 'heatmaps' && (
          <HeatmapsView
            games={games}
            trainingSamples={trainingSamples}
            recognitionThreshold={settings?.recognitionThreshold ?? 0.7}
          />
        )}

        {currentTab === 'history' && <HistoryView games={games} />}

        {currentTab === 'validation' && (
          <ValidationView
            samples={trainingSamples}
            threshold={settings?.recognitionThreshold ?? 0.7}
          />
        )}

        {currentTab === 'win10k' && <Win10kAuditView />}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            onSettingsUpdated={(newSettings) => setSettings(newSettings)}
            userEmail={user?.email}
          />
        )}
      </main>
    </div>
  );
}
