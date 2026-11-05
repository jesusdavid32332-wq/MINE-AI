import React, { useState, useMemo } from 'react';
import { Board5x5 } from './Board5x5';
import { GameRecord, TrainingSample } from '../types';
import { computeEmpiricalStatistics } from '../utils/probabilityEngine';
import {
  Flame,
  Bomb,
  Gem,
  Archive,
  Eye,
  Calendar,
  AlertCircle,
  BarChart3,
  Layers,
  Percent,
  CheckCircle2
} from 'lucide-react';

interface HeatmapsViewProps {
  games: GameRecord[];
  trainingSamples: TrainingSample[];
  recognitionThreshold?: number;
}

type WindowSize = 20 | 50 | 100 | 500 | 'ALL';
type HeatmapMode = 'mine' | 'safe' | 'revealed' | 'chest';

export const HeatmapsView: React.FC<HeatmapsViewProps> = ({
  games,
  trainingSamples,
  recognitionThreshold = 0.7,
}) => {
  const [windowSize, setWindowSize] = useState<WindowSize>('ALL');
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('mine');
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  // Compute empirical statistics
  const stats = useMemo(() => {
    return computeEmpiricalStatistics(games, windowSize, trainingSamples, recognitionThreshold);
  }, [games, windowSize, trainingSamples, recognitionThreshold]);

  // Missing games calculation for current window
  const missingGames =
    windowSize !== 'ALL' && games.length < windowSize ? windowSize - games.length : 0;

  // Generate heatmap values map for Board5x5 (0.0 to 1.0)
  const heatmapValues = useMemo(() => {
    const map: { [pos: number]: number } = {};
    if (stats.totalGames === 0) return map;

    for (const pos of stats.positions) {
      if (heatmapMode === 'mine') {
        map[pos.position] = pos.mineRate;
      } else if (heatmapMode === 'safe') {
        map[pos.position] = pos.safeRate;
      } else if (heatmapMode === 'revealed') {
        map[pos.position] = pos.revealedRate;
      } else if (heatmapMode === 'chest') {
        map[pos.position] = stats.totalGames > 0 ? pos.chestCount / stats.totalGames : 0;
      }
    }
    return map;
  }, [stats, heatmapMode]);

  const heatmapColorMap: Record<HeatmapMode, 'red' | 'green' | 'blue' | 'gold'> = {
    mine: 'red',
    safe: 'green',
    revealed: 'blue',
    chest: 'gold',
  };

  const selectedPosDetail =
    selectedPosition !== null ? stats.positions.find((p) => p.position === selectedPosition) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-400">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Estadísticas y Mapas de Calor Reales
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {games.length} {games.length === 1 ? 'partida registrada' : 'partidas registradas'}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Frecuencias empíricas calculadas exclusivamente a partir de tus partidas guardadas en Firestore.
              </p>
            </div>
          </div>

          {/* Window Filter Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            {([20, 50, 100, 500, 'ALL'] as WindowSize[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWindowSize(w)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  windowSize === w
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {w === 'ALL' ? 'Todas' : `${w}`}
              </button>
            ))}
          </div>
        </div>

        {/* Missing games notice */}
        {missingGames > 0 && (
          <div className="mt-4 p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl text-xs text-blue-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-blue-400" />
            <span>
              Tienes <strong>{games.length}</strong> partidas guardadas. Faltan{' '}
              <strong>{missingGames}</strong> partidas para completar la ventana seleccionada de{' '}
              <strong>{windowSize}</strong> partidas. Las estadísticas actuales muestran la totalidad de las partidas disponibles.
            </span>
          </div>
        )}
      </div>

      {/* Top Real Stats Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Partidas Reales</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">
            {stats.totalGames}
          </span>
          <span className="text-[10px] text-slate-500">En base de datos</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Casillas Reveladas</span>
          <span className="text-2xl font-bold font-mono text-blue-400 mt-1 block">
            {stats.totalRevealedCells}
          </span>
          <span className="text-[10px] text-slate-500">De 25 por tablero</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Seguras Reales</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
            {stats.totalSafeCells}
          </span>
          <span className="text-[10px] text-slate-500">Gemas / Estrellas</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Minas Reales</span>
          <span className="text-2xl font-bold font-mono text-red-400 mt-1 block">
            {stats.totalMineCells}
          </span>
          <span className="text-[10px] text-slate-500">Bombas detonadas</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Cofres Reales</span>
          <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
            {stats.totalChestCells}
          </span>
          <span className="text-[10px] text-slate-500">Bonos especiales</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Precisión Visión</span>
          <span className="text-2xl font-bold font-mono text-purple-400 mt-1 block">
            {stats.totalEvaluatedSamples > 0 ? `${stats.visionAccuracyRate.toFixed(1)}%` : '—'}
          </span>
          <span className="text-[10px] text-slate-500">
            {stats.totalEvaluatedSamples} muestras
          </span>
        </div>
      </div>

      {/* Main Heatmap Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Heatmap Visual Board (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col items-center">
          <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-400" />
                Mapa de Calor (25 Posiciones)
              </h3>
              <p className="text-xs text-slate-400">
                Intensidad porcentual calculada según los resultados empíricos registrados.
              </p>
            </div>

            {/* Heatmap Mode Selector */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setHeatmapMode('mine')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition ${
                  heatmapMode === 'mine'
                    ? 'bg-red-600 text-white font-semibold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bomb className="w-3.5 h-3.5" />
                Minas
              </button>
              <button
                type="button"
                onClick={() => setHeatmapMode('safe')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition ${
                  heatmapMode === 'safe'
                    ? 'bg-emerald-600 text-white font-semibold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Gem className="w-3.5 h-3.5" />
                Seguras
              </button>
              <button
                type="button"
                onClick={() => setHeatmapMode('revealed')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition ${
                  heatmapMode === 'revealed'
                    ? 'bg-blue-600 text-white font-semibold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Reveladas
              </button>
              <button
                type="button"
                onClick={() => setHeatmapMode('chest')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition ${
                  heatmapMode === 'chest'
                    ? 'bg-amber-600 text-white font-semibold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                Cofres
              </button>
            </div>
          </div>

          {games.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-2">
              <p className="text-sm font-semibold text-slate-400">Sin datos de partidas para generar el mapa de calor</p>
              <p>Guarda tus partidas de WIN10K en el Analizador para ver las intensidades reales de cada casilla.</p>
            </div>
          ) : (
            <>
              <Board5x5
                cells={[]}
                heatmapValues={heatmapValues}
                heatmapColor={heatmapColorMap[heatmapMode]}
                onCellClick={(pos) => setSelectedPosition(pos)}
                highlightPosition={selectedPosition}
                showCoordinates={true}
                size="lg"
                readOnly={true}
              />

              <div className="w-full mt-4 flex items-center justify-between text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-slate-800" /> 0% (Baja intensidad)
                </span>
                <span className="font-mono text-[11px] text-slate-500">Escala gradual</span>
                <span className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded ${
                      heatmapMode === 'mine'
                        ? 'bg-red-500'
                        : heatmapMode === 'safe'
                        ? 'bg-emerald-500'
                        : heatmapMode === 'revealed'
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  100% (Alta intensidad)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Selected Position Detailed Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Detalle de Casilla #{selectedPosition !== null ? selectedPosition : '—'}
              </span>
              {selectedPosDetail && (
                <span className="text-xs font-mono text-slate-400">
                  Fila {selectedPosDetail.row}, Col {selectedPosDetail.column}
                </span>
              )}
            </h3>

            {selectedPosition === null ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                Haz clic en una casilla del mapa de calor para ver su desglose estadístico exacto.
              </p>
            ) : selectedPosDetail ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-mono block">Veces Segura</span>
                    <span className="text-xl font-bold text-emerald-400 font-mono">
                      {selectedPosDetail.safeCount}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {(selectedPosDetail.safeRate * 100).toFixed(1)}% de sus aperturas
                    </span>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-mono block">Veces Mina</span>
                    <span className="text-xl font-bold text-red-400 font-mono">
                      {selectedPosDetail.mineCount}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {(selectedPosDetail.mineRate * 100).toFixed(1)}% de sus aperturas
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 font-mono block">Tasa de Revelado</span>
                  <span className="text-xl font-bold text-blue-400 font-mono">
                    {(selectedPosDetail.revealedRate * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Revelada en {selectedPosDetail.safeCount + selectedPosDetail.mineCount + selectedPosDetail.chestCount} de {stats.totalGames} partidas
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                  Esta casilla ha detonado {selectedPosDetail.mineCount} veces en tu historial. Si WIN10K utiliza distribución pseudoaleatoria independiente en cada ronda, esta tasa histórica tenderá a normalizarse con la proporción de minas configuradas conforme crezca el tamaño muestral.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
