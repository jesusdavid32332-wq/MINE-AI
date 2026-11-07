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
import { Win10kGameView } from './components/Win10kGameView';
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
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { UserVipIcon3D, Gem3D } from './components/Icons3D';
import { soundFX } from './utils/soundEffects';
import { checkRedirectResult, syncUserProfile, AuthErrorInfo } from './services/authService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('game');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
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

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalError, setAuthModalError] = useState<AuthErrorInfo | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Firebase Auth State Tracker
  useEffect(() => {
    // Check for pending redirect result on app boot
    checkRedirectResult()
      .then((redirectUser) => {
        if (redirectUser) {
          setUser(redirectUser);
          setAuthNotice(`¡Sesión completada con Google!: ${redirectUser.email}`);
        }
      })
      .catch((err) => console.warn('Redirect check aviso:', err));

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          syncUserProfile(currentUser).catch(() => {});
        }
      },
      (error) => {
        console.warn('Auth observer notice:', error);
      }
    );

    return () => {
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

  const handleLoginClick = () => {
    soundFX.playTileClick();
    setAuthModalError(null);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#081a3a] text-slate-100 flex flex-col selection:bg-yellow-400 selection:text-black relative overflow-x-hidden">
      {/* If in main WIN10K Game tab: show the authentic casino screen */}
      {currentTab === 'game' ? (
        <Win10kGameView
          games={games}
          onOpenScanner={() => setCurrentTab('analyzer')}
          onOpenMenu={(tab) => {
            if (tab === 'menu') setIsMenuOpen(true);
            else setCurrentTab(tab);
          }}
          onLoginClick={handleLoginClick}
          userEmail={user?.email}
        />
      ) : (
        /* Secondary Analysis / Management Views with Return Navigation */
        <div className="min-h-screen bg-[#060913] flex flex-col">
          {/* Quick Return to Game Header */}
          <div className="bg-[#0b1428] border-b border-cyan-500/30 px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-lg">
            <button
              type="button"
              onClick={() => {
                soundFX.playTileClick();
                setCurrentTab('game');
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md active:scale-95 transition"
            >
              <span>← Volver al Juego WIN10K</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#132247] border border-[#2a4380] text-cyan-200 font-bold text-xs flex items-center gap-1.5"
              >
                <span>Menú</span>
                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <Navbar
            currentTab={currentTab}
            onSelectTab={(tab) => setCurrentTab(tab)}
            isOnline={isOnline}
            userEmail={user?.email || (user?.isAnonymous ? 'Invitado' : null)}
            onLoginClick={handleLoginClick}
          />

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
                onGameSaved={() => {
                  setCurrentTab('history');
                }}
                initialMinesCount={3}
                games={games}
                onLoginClick={handleLoginClick}
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
                onLoginClick={handleLoginClick}
              />
            )}
          </main>
        </div>
      )}

      {/* Slide-out Menu Drawer for Quick Access */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          <div className="relative ml-auto w-full max-w-xs bg-[#0a1835] border-l border-cyan-500/30 text-white p-5 flex flex-col justify-between shadow-2xl z-50 animate-in slide-in-from-right duration-200">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#1b356b] pb-4">
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <span className="text-yellow-400">WIN10K</span> MINES
                  </h3>
                  <span className="text-[11px] text-cyan-300">Asistente & Casino</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-8 h-8 rounded-xl bg-[#142c5b] text-slate-300 hover:text-white flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              {/* VIP Auth Card */}
              {user ? (
                <div className="bg-[#0e244f] p-3 rounded-2xl border border-cyan-500/40 text-xs">
                  <div className="flex items-center gap-2 text-cyan-200 font-bold mb-1">
                    <UserVipIcon3D className="w-4 h-4" />
                    <span>Conectado</span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate font-mono">{user.email}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLoginClick();
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <UserVipIcon3D className="w-4 h-4" />
                  <span>Conectar Google Auth VIP</span>
                </button>
              )}

              {/* Navigation Options */}
              <div className="space-y-1.5 pt-2">
                {[
                  { id: 'game', label: '🎮 Juego Mines WIN10K (Principal)' },
                  { id: 'analyzer', label: '📷 Escáner Visión con IA' },
                  { id: 'probability', label: '📊 Probabilidad Matemática' },
                  { id: 'heatmaps', label: '🗺️ Mapas de Calor Reales' },
                  { id: 'history', label: '📜 Historial de Partidas' },
                  { id: 'win10k', label: '🛡️ Auditoría Provably Fair' },
                  { id: 'dashboard', label: '📈 Panel General / Métricas' },
                  { id: 'settings', label: '⚙️ Ajustes del Asistente' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      soundFX.playTileClick();
                      setCurrentTab(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                      currentTab === item.id
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md'
                        : 'text-slate-200 hover:bg-[#142c5b]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] opacity-60">›</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#1b356b] pt-4 text-center">
              <span className="text-[10px] text-slate-400">MINES AI · Réplica Exacta WIN10K</span>
            </div>
          </div>
        </div>
      )}

      {/* Google Authentication Modal with Live State Feedback */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        onAuthSuccess={(authedUser) => {
          setUser(authedUser);
          setAuthNotice(`¡Cuenta conectada con éxito!: ${authedUser.email || authedUser.uid}`);
        }}
        initialError={authModalError}
      />
    </div>
  );
}
