import React from 'react';
import { Board5x5 } from './Board5x5';
import { GameRecord, TrainingSample } from '../types';
import { computeEmpiricalStatistics } from '../utils/probabilityEngine';
import {
  Sparkles,
  Camera,
  Brain,
  Flame,
  History,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Database,
  Smartphone
} from 'lucide-react';

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

  const recentGames = games.slice(0, 4);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Asistente Profesional de Partidas Reales
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              MINES AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">WIN10K</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Analiza capturas con Gemini 3.8 Flash Vision, calcula probabilidades combinatorias hipergeométricas en vivo y consulta tus mapas de calor basados exclusivamente en partidas auténticas.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                Firestore DB Activa
              </span>
              <span className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                PWA para iPhone lista
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('analyzer')}
              className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-xl shadow-blue-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2.5"
            >
              <Camera className="w-4 h-4" />
              Analizar Nueva Partida
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('probability')}
              className="px-6 py-3 rounded-2xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4 text-purple-400" />
              Asistente de Probabilidad en Vivo
            </button>
          </div>
        </div>
      </div>

      {/* Real Statistics Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase">Partidas Reales</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-white">
            {stats.totalGames}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {stats.totalGames === 0 ? 'Base de datos limpia' : `${stats.totalRevealedCells} casillas verificadas`}
          </span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase">Seguras Confirmadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-emerald-400">
            {stats.totalSafeCells}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Gemas y estrellas reales</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase">Minas Confirmadas</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-red-400">
            {stats.totalMineCells}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Bombas detonadas</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase">Precisión Gemini</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-purple-400">
            {stats.totalEvaluatedSamples > 0 ? `${stats.visionAccuracyRate.toFixed(1)}%` : '—'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {stats.totalEvaluatedSamples} muestras evaluadas
          </span>
        </div>
      </div>

      {/* Two Column Section: Recent Games + Fast Features */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Recent Real Games (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              Últimas Partidas Registradas
            </h3>
            {games.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                Ver todas ({games.length}) →
              </button>
            )}
          </div>

          {recentGames.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-400">Sin partidas registradas</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No se muestran datos ficticios. Sube una captura real de tu partida de WIN10K para comenzar a acumular estadísticas.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('analyzer')}
                className="mt-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition inline-flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                Comenzar Primer Análisis
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentGames.map((game) => (
                <div
                  key={game.gameId}
                  onClick={() => onNavigate('history')}
                  className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl cursor-pointer transition flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        game.gameStatus === 'win'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : game.gameStatus === 'lost'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {game.gameStatus === 'win' ? 'Victoria' : game.gameStatus === 'lost' ? 'Derrota' : 'En Curso'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(game.createdAt || game.gameDate).toLocaleDateString('es-ES')}
                    </span>
                  </div>

                  <div className="flex items-center justify-center my-2">
                    <Board5x5 cells={game.cells || []} readOnly={true} size="sm" />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-900 font-mono">
                    <span>{game.mineCount} minas</span>
                    <span>{game.revealedCount || 0} reveladas</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Feature Highlights & Scientific Standards (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Garantía de Rigor y Datos Reales
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="font-semibold text-white block">Cero Datos Sintéticos</span>
                <p className="text-slate-400 text-[11px]">
                  La base de datos de Firebase no contiene partidas de prueba ni capturas falsas. Cada registro proviene de la interacción del usuario.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="font-semibold text-white block">Independencia Estocástica</span>
                <p className="text-slate-400 text-[11px]">
                  Las partidas en WIN10K son independientes. No se engaña al usuario asegurando que casillas pasadas predicen el futuro.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="font-semibold text-white block">Supervisión Humana en Bucle</span>
                <p className="text-slate-400 text-[11px]">
                  Puedes corregir con un toque cualquier casilla que Gemini haya detectado incorrectamente antes de almacenar el registro.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
