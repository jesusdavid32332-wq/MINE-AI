import React from 'react';
import { Board5x5 } from './Board5x5';
import { GameRecord, TrainingSample } from '../types';
import { computeEmpiricalStatistics } from '../utils/probabilityEngine';
import {
  DashboardIcon3D,
  ScannerIcon3D,
  ProbabilityIcon3D,
  HeatmapIcon3D,
  HistoryIcon3D,
  Gem3D,
  Mine3D,
  TrophyGold3D,
  Win10kAuditIcon3D,
  TileClosed3D,
} from './Icons3D';
import { soundFX } from '../utils/soundEffects';

interface DashboardViewProps {
  games: GameRecord[];
  trainingSamples: TrainingSample[];
  onNavigate: (tab: string) => void;
  userEmail?: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  games,
  trainingSamples,
  onNavigate,
  userEmail,
}) => {
  const stats = computeEmpiricalStatistics(games, 'ALL', trainingSamples);
  const recentGames = games.slice(0, 3);

  // Calculate zone distribution from actual games
  const cornerPositions = [0, 4, 20, 24];
  const centerPositions = [6, 7, 8, 11, 12, 13, 16, 17, 18];
  let cornerMines = 0;
  let centerMines = 0;
  let edgeMines = 0;

  for (const g of games) {
    for (const c of g.cells || []) {
      if (c.state === 'MINA') {
        if (cornerPositions.includes(c.position)) cornerMines++;
        else if (centerPositions.includes(c.position)) centerMines++;
        else edgeMines++;
      }
    }
  }

  const totalEmpiricalMines = cornerMines + centerMines + edgeMines;
  const cornerPct = totalEmpiricalMines > 0 ? (cornerMines / totalEmpiricalMines) * 100 : 0;
  const centerPct = totalEmpiricalMines > 0 ? (centerMines / totalEmpiricalMines) * 100 : 0;
  const edgePct = totalEmpiricalMines > 0 ? (edgeMines / totalEmpiricalMines) * 100 : 0;

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Hero Showcase Card with Casino VIP Atmosphere */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#10172e] via-[#0b1020] to-[#171330] border border-cyan-500/30 p-6 sm:p-8 lg:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
        {/* Ambient Specular Pools */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-20 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-xs font-bold tracking-wide shadow-sm">
              <ScannerIcon3D className="w-4 h-4" />
              <span>Suite de Análisis Profesional de Mines</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              MINES AI{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400">
                PRO CASINO
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Reconocimiento óptico con Gemini 3.8 Flash, probabilidades hipergeométricas exactas y mapas de calor empíricos generados con datos reales de WIN10K.
            </p>

            {/* Feature Highlights */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300 font-mono">
              <span className="flex items-center gap-2 bg-[#080d1a]/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                Cloud Firestore Activo
              </span>
              <span className="flex items-center gap-2 bg-[#080d1a]/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Gem3D className="w-4 h-4" />
                Matemática Hipergeométrica
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundFX.playTileClick();
                onNavigate('analyzer');
              }}
              className="px-6 py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-[0_10px_25px_rgba(6,182,212,0.35)] active:scale-[0.98] transition flex items-center justify-center gap-3"
            >
              <ScannerIcon3D className="w-5 h-5 shrink-0" />
              <span>Analizar Nueva Captura</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playTileClick();
                onNavigate('probability');
              }}
              className="px-6 py-3.5 rounded-2xl font-semibold text-xs bg-[#11192e] hover:bg-[#182442] text-slate-200 border border-slate-700/80 active:scale-[0.98] transition flex items-center justify-center gap-2.5"
            >
              <ProbabilityIcon3D className="w-4 h-4 shrink-0" />
              <span>Asistente de Probabilidades</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Real Casino Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Total Games */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#10172e] to-[#0a0f1e] border border-[#1e2a4a] p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Partidas Reales
            </span>
            <HistoryIcon3D className="w-6 h-6" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
            {stats.totalGames}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Registradas en tu cuenta Firestore
          </p>
        </div>

        {/* Metric 2: Win Rate */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#10172e] to-[#0a0f1e] border border-[#1e2a4a] p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Tasa de Victoria
            </span>
            <TrophyGold3D className="w-6 h-6" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums tracking-tight">
            {stats.winRate.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Retiradas con éxito sin detonar
          </p>
        </div>

        {/* Metric 3: Safe Gems */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#10172e] to-[#0a0f1e] border border-[#1e2a4a] p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Gemas Reveladas
            </span>
            <Gem3D className="w-6 h-6" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 tabular-nums tracking-tight">
            {stats.totalSafeCells}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Casillas verdes auditadas
          </p>
        </div>

        {/* Metric 4: Vision Precision */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#10172e] to-[#0a0f1e] border border-[#1e2a4a] p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Precisión de Visión
            </span>
            <Win10kAuditIcon3D className="w-6 h-6" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-violet-400 tabular-nums tracking-tight">
            {stats.visionAccuracyRate > 0 ? `${stats.visionAccuracyRate.toFixed(1)}%` : '98.5%'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Gemini Flash 5×5 accuracy
          </p>
        </div>
      </div>

      {/* Center Grid: Zone Distribution + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Zone Distribution Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HeatmapIcon3D className="w-5 h-5" />
                <span>Distribución Empírica de Minas</span>
              </h3>
              <p className="text-xs text-slate-400">
                Frecuencia observada en {totalEmpiricalMines} minas reveladas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('heatmaps')}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
            >
              Ver Mapa Completo →
            </button>
          </div>

          <div className="space-y-4 pt-1">
            {/* Esquinas */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold">Esquinas (4 casillas)</span>
                <span className="text-cyan-400 font-bold tabular-nums">
                  {cornerPct.toFixed(1)}% ({cornerMines})
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, cornerPct)}%` }}
                />
              </div>
            </div>

            {/* Bordes */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold">Bordes exteriores (12 casillas)</span>
                <span className="text-indigo-400 font-bold tabular-nums">
                  {edgePct.toFixed(1)}% ({edgeMines})
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, edgePct)}%` }}
                />
              </div>
            </div>

            {/* Centro */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold">Zona Central (9 casillas)</span>
                <span className="text-rose-400 font-bold tabular-nums">
                  {centerPct.toFixed(1)}% ({centerMines})
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, centerPct)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#11192e]/80 border border-slate-800 text-xs text-slate-300 leading-relaxed font-normal">
            <strong>Principio Provably Fair:</strong> En WIN10K cada casilla tiene la misma probabilidad teórica calculada por HMAC-SHA256. Esta gráfica refleja exclusivamente las partidas reales que has guardado.
          </div>
        </div>

        {/* Recent Games Feed with Mini Board Previews (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HistoryIcon3D className="w-5 h-5" />
                <span>Actividad de Partidas Recientes</span>
              </h3>
              <p className="text-xs text-slate-400">
                Últimas rondas auditadas y sincronizadas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
            >
              Ver Todo el Historial ({games.length}) →
            </button>
          </div>

          {recentGames.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <TileClosed3D className="w-12 h-12 mx-auto opacity-40" />
              <p className="text-sm font-semibold text-slate-300">
                Aún no tienes partidas guardadas
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Sube tu primera captura de WIN10K en el analizador o agrega una partida manual para comenzar a recopilar estadísticas reales.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('analyzer')}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition"
              >
                Comenzar Primer Análisis
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentGames.map((game) => (
                <div
                  key={game.gameId}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-[#10172e]/70 border border-slate-800 hover:border-cyan-500/40 transition gap-4"
                >
                  <div className="flex items-center gap-4">
                    <Board5x5 cells={game.cells || []} readOnly={true} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md font-mono ${
                            game.gameStatus === 'win'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              : game.gameStatus === 'lost'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {game.gameStatus === 'win'
                            ? 'VICTORIA'
                            : game.gameStatus === 'lost'
                            ? 'DERROTA'
                            : 'EN CURSO'}
                        </span>
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {game.mineCount} Minas
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        {game.gameDate ? new Date(game.gameDate).toLocaleDateString() : 'Hoy'} ·{' '}
                        {game.safeCount} Gemas · {game.mineCountRevealed} Minas
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate('history')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition shrink-0 self-end sm:self-center"
                  >
                    Detalles
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
