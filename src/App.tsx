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
import { LogIn, Sparkles, AlertTriangle } from 'lucide-react';

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

    // Register PWA service worker safely using import.meta.env
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => console.log('PWA Service Worker registered:', reg.scope))
        .catch((err) => console.warn('SW registration skipped:', err));
    }

    // Verify Firestore connection on boot (non-blocking)
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
    }, 1200);

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        clearTimeout(fallbackTimer);
        setUser(currentUser);
        setAuthLoading(false);
      },
      (error) => {
        console.warn('Auth observer error (using guest mode fallback):', error);
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

  const handleLoginClick = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign In error:', err);
    }
  };

  // Quick Loading indicator (maximum 1.2s before displaying UI)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 animate-pulse mb-4 shadow-xl shadow-blue-500/20">
          <div className="w-full h-full bg-[#090d16] rounded-[14px] flex items-center justify-center text-blue-400 font-black text-sm">
            M·AI
          </div>
        </div>
        <h2 className="text-base font-bold text-white tracking-wider">MINES AI</h2>
        <p className="text-xs text-slate-400 font-mono mt-1">Conectando infraestructura WIN10K...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Header & Mobile Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOnline={isOnline}
        userEmail={user?.email || (user?.isAnonymous ? 'Invitado' : null)}
      />

      {/* Guest Mode Sync Notice Banner if not logged in */}
      {!user && (
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-b border-blue-500/30 px-4 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <span className="flex items-center gap-2 text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>Modo Vista Previa / Asistente Activo:</strong> Inicia sesión con Google para sincronizar y respaldar tus partidas en la nube de Firebase.
              </span>
            </span>
            <button
              type="button"
              onClick={handleLoginClick}
              className="px-3.5 py-1.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition shrink-0 flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              Conectar Google Auth
            </button>
          </div>
        </div>
      )}

      {/* Main View Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 lg:pb-12">
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
