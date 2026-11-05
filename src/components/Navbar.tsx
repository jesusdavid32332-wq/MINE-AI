import React from 'react';
import {
  LayoutDashboard,
  Camera,
  Brain,
  Flame,
  History,
  Award,
  Search,
  Settings,
  ShieldCheck,
  Wifi,
  WifiOff
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOnline: boolean;
  userEmail?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  isOnline,
  userEmail,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analyzer', label: 'Analizador', icon: Camera },
    { id: 'probability', label: 'Análisis IA', icon: Brain },
    { id: 'heatmaps', label: 'Mapas de Calor', icon: Flame },
    { id: 'history', label: 'Historial', icon: History },
    { id: 'validation', label: 'Validación', icon: Award },
    { id: 'win10k', label: 'WIN10K', icon: Search },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <>
      {/* Top Header Bar for Desktop and Mobile */}
      <header className="sticky top-0 z-40 bg-[#090d16]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand Monogram */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
                <span className="font-black text-xs text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  M·AI
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider text-white">MINES AI</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  WIN10K
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block -mt-0.5">Asistente de Partidas Reales</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-950/60 p-1 rounded-2xl border border-slate-800/80 text-xs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* User info & Connectivity Badge */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border ${
                isOnline
                  ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-950/50 text-red-400 border-red-500/30'
              }`}
              title={isOnline ? 'Conexión activa con Firebase' : 'Sin conexión a Internet (modo offline PWA)'}
            >
              {isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-red-400" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {userEmail && (
              <span className="hidden sm:inline text-xs text-slate-400 font-mono max-w-[120px] truncate" title={userEmail}>
                {userEmail}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (iPhone PWA styled with safe area padding) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-2xl border-t border-slate-800/80 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 px-2">
        <div className="flex items-center justify-around">
          {tabs.slice(0, 5).map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
                  isActive ? 'text-blue-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]' : ''}`} />
                <span className="text-[10px]">{tab.label}</span>
              </button>
            );
          })}
          {/* Quick secondary menu for settings & win10k audit */}
          <button
            type="button"
            onClick={() => onSelectTab(currentTab === 'settings' ? 'win10k' : 'settings')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
              currentTab === 'settings' || currentTab === 'win10k' || currentTab === 'validation'
                ? 'text-purple-400 font-semibold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Más</span>
          </button>
        </div>
      </nav>
    </>
  );
};
