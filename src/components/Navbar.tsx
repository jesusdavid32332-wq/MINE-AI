import React, { useState } from 'react';
import {
  DashboardIcon3D,
  ScannerIcon3D,
  ProbabilityIcon3D,
  HeatmapIcon3D,
  HistoryIcon3D,
  ValidationIcon3D,
  Win10kAuditIcon3D,
  SettingsIcon3D,
  UserVipIcon3D,
  SoundOn3D,
  SoundOff3D,
} from './Icons3D';
import { soundFX } from '../utils/soundEffects';

import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOnline: boolean;
  userEmail?: string | null;
  onLoginClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  isOnline,
  userEmail,
  onLoginClick,
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundFX.getSoundEnabled());

  const handleTabClick = (tabId: string) => {
    soundFX.playTileClick();
    onSelectTab(tabId);
  };

  const handleSoundToggle = () => {
    const updated = soundFX.toggleSound();
    setSoundEnabled(updated);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon3D },
    { id: 'analyzer', label: 'Escáner IA', icon: ScannerIcon3D },
    { id: 'probability', label: 'Probabilidad', icon: ProbabilityIcon3D },
    { id: 'heatmaps', label: 'Mapas de Calor', icon: HeatmapIcon3D },
    { id: 'history', label: 'Historial', icon: HistoryIcon3D },
    { id: 'validation', label: 'Validación', icon: ValidationIcon3D },
    { id: 'win10k', label: 'WIN10K Audit', icon: Win10kAuditIcon3D },
    { id: 'settings', label: 'Ajustes', icon: SettingsIcon3D },
  ];

  return (
    <>
      {/* Top Header Bar for Desktop */}
      <header className="sticky top-0 z-40 bg-[#070b16]/90 backdrop-blur-2xl border-b border-[#1c2744]/80 px-4 sm:px-6 py-2.5 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.7)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          {/* Brand Wordmark & Animated 3D Monogram */}
          <div
            onClick={() => handleTabClick('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
          >
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-violet-500 p-[1.5px] shadow-[0_0_20px_rgba(56,189,248,0.35)] group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full bg-[#0a0f1e] rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-violet-500/10 pointer-events-none" />
                <span className="font-black text-sm tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300">
                  M·AI
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-wider text-white">MINES AI</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-500/40 shadow-sm">
                  PRO
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium block -mt-0.5">
                Analizador de Partidas Reales
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links with 3D Icons */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-[#0a0f1e]/80 p-1.5 rounded-2xl border border-[#1e2a4a]/80 shadow-inner">
            {tabs.map((tab) => {
              const Icon3D = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_4px_16px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.25)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon3D className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls: PWA Install, Audio Toggle, Online Status, VIP User */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* PWA Install Button */}
            <PWAInstallButton variant="compact" />

            {/* Audio FX Toggle Button */}
            <button
              type="button"
              onClick={handleSoundToggle}
              className={`p-2 rounded-xl border transition-all ${
                soundEnabled
                  ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'bg-slate-900/60 border-slate-700/60 text-slate-500 hover:text-slate-400'
              }`}
              title={soundEnabled ? 'Sonidos de casino activos' : 'Sonidos desactivados'}
            >
              {soundEnabled ? <SoundOn3D className="w-4 h-4" /> : <SoundOff3D className="w-4 h-4" />}
            </button>

            {/* Connectivity Badge */}
            <div
              className={`hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl text-[11px] font-mono font-medium border ${
                isOnline
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
              }`}
              title={isOnline ? 'Conexión activa con Cloud Firestore' : 'Modo offline PWA'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'
                }`}
              />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* VIP User Profile / Login */}
            {userEmail ? (
              <div
                onClick={() => handleTabClick('settings')}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#11192e] to-[#0c1222] border border-amber-500/30 cursor-pointer hover:border-amber-400/60 transition shadow-md group"
                title={`Usuario activo: ${userEmail}`}
              >
                <UserVipIcon3D className="w-5 h-5 shrink-0" />
                <span className="hidden xl:inline text-xs font-mono text-amber-200/90 max-w-[130px] truncate">
                  {userEmail.split('@')[0]}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  VIP
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLoginClick}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-600/25 active:scale-95 transition"
              >
                <UserVipIcon3D className="w-4 h-4 shrink-0" />
                <span>Conectar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Dock Navigation (Optimized for iPhone / Android touch) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070b16]/95 backdrop-blur-2xl border-t border-[#1c2744]/90 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5 px-2 shadow-[0_-10px_30px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-around">
          {[
            { id: 'dashboard', label: 'Inicio', icon: DashboardIcon3D },
            { id: 'analyzer', label: 'Analizar', icon: ScannerIcon3D },
            { id: 'probability', label: 'Cálculo', icon: ProbabilityIcon3D },
            { id: 'heatmaps', label: 'Calor', icon: HeatmapIcon3D },
            { id: 'history', label: 'Historial', icon: HistoryIcon3D },
            { id: 'settings', label: 'Ajustes', icon: SettingsIcon3D },
          ].map((tab) => {
            const Icon3D = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'text-cyan-400 font-bold scale-105 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon3D className="w-5 h-5 mb-1" />
                <span className="text-[10px] tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
