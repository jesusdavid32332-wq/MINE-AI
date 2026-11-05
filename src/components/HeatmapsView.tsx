import React, { useState, useMemo } from 'react';
import { Board5x5 } from './Board5x5';
import { GameRecord, TrainingSample } from '../types';
import { computeEmpiricalStatistics } from '../utils/probabilityEngine';
import {
  HeatmapIcon3D,
  Gem3D,
  Mine3D,
  Chest3D,
  TileClosed3D,
  ValidationIcon3D,
} from './Icons3D';
import { soundFX } from '../utils/soundEffects';

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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner with VIP Casino Aesthetic */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#171026] via-[#0b1020] to-[#1a0f2e] border border-rose-500/30 p-5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-950/70 border border-rose-500/40 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.3)] shrink-0">
              <HeatmapIcon3D className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  Mapas de Calor Empíricos
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {games.length} {games.length === 1 ? 'partida' : 'partidas'} registradas
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed">
                Frecuencias reales registradas en tu historial. No son predicciones garantizadas: WIN10K es un juego criptográfico aleatorio independiente.
              </p>
            </div>
          </div>

          {/* Window Filter Selector */}
          <div className="flex items-center gap-1.5 bg-[#0a0f1e] p-1.5 rounded-2xl border border-slate-800 text-xs font-mono font-bold self-end sm:self-center shrink-0">
            {([20, 50, 100, 500, 'ALL'] as WindowSize[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => {
                  soundFX.playTileClick();
                  setWindowSize(w);
                }}
                className={`px-3 py-1.5 rounded-xl transition ${
                  windowSize === w
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {w === 'ALL' ? 'Todas' : `${w}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Heatmap Board & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Heatmap 5x5 Board & Mode Tabs (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl flex flex-col items-center">
          {/* Mode Selector Tabs */}
          <div className="w-full flex items-center justify-between flex-wrap gap-2 mb-5 pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Modo del Mapa:</h3>
            <div className="flex items-center gap-1.5 bg-[#0a0f1e] p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
              {[
                { id: 'mine', label: 'Minas', icon: <Mine3D className="w-4 h-4" /> },
                { id: 'safe', label: 'Gemas', icon: <Gem3D className="w-4 h-4" /> },
                { id: 'revealed', label: 'Revelación', icon: <TileClosed3D className="w-4 h-4" /> },
                { id: 'chest', label: 'Cofres', icon: <Chest3D className="w-4 h-4" /> },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    soundFX.playTileClick();
                    setHeatmapMode(m.id as HeatmapMode);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                    heatmapMode === m.id
                      ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Missing Games Notice if window size exceeds data */}
          {missingGames > 0 && (
            <div className="w-full mb-4 p-3 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-amber-300 text-xs">
              Muestra reducida: faltan {missingGames} partidas para completar la ventana de {windowSize}. Se calculan las {games.length} partidas reales disponibles.
            </div>
          )}

          {/* The Board with Thermal Overlays */}
          <Board5x5
            cells={stats.positions.map((p) => ({
              position: p.position,
              row: p.row,
              column: p.column,
              state: 'OCULTA',
              confidence: 1,
              confirmedByUser: true,
            }))}
            heatmapValues={heatmapValues}
            heatmapColor={heatmapColorMap[heatmapMode]}
            onCellClick={(pos) => {
              soundFX.playTileClick();
              setSelectedPosition(pos);
            }}
            highlightPosition={selectedPosition}
            showCoordinates={true}
            size="lg"
          />

          <p className="text-xs text-slate-400 text-center mt-5">
            Pulsa cualquier casilla en el mapa de calor para inspeccionar su historial exacto.
          </p>
        </div>

        {/* Selected Position Detail & Statistical Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Tile Position Detail Card */}
          <div className="bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HeatmapIcon3D className="w-5 h-5" />
                <span>
                  {selectedPosition !== null
                    ? `Detalle de la Casilla #${selectedPosition}`
                    : 'Selecciona una Casilla'}
                </span>
              </h3>
              {selectedPosition !== null && (
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/40">
                  Fila {Math.floor(selectedPosition / 5)} · Col {selectedPosition % 5}
                </span>
              )}
            </div>

            {selectedPosDetail ? (
              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-[#10172e] border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span>Partidas donde se reveló:</span>
                    <span className="font-bold text-white tabular-nums">
                      {selectedPosDetail.safeCount + selectedPosDetail.mineCount + selectedPosDetail.chestCount} / {stats.totalGames}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Gemas seguras confirmadas:</span>
                    <span className="font-bold tabular-nums">
                      {selectedPosDetail.safeCount} ({(selectedPosDetail.safeRate * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>Minas detonadas / reveladas:</span>
                    <span className="font-bold tabular-nums">
                      {selectedPosDetail.mineCount} ({(selectedPosDetail.mineRate * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>Cofres observados:</span>
                    <span className="font-bold tabular-nums">{selectedPosDetail.chestCount}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0e1424] border border-slate-800 text-xs text-slate-300 leading-relaxed font-normal">
                  <strong>Interpretación Estadística:</strong> Las frecuencias calculadas corresponden estrictamente a la muestra registrada ({stats.totalGames} partidas). En sistemas Provably Fair las rondas futuras son independientes de las pasadas.
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <TileClosed3D className="w-10 h-10 mx-auto opacity-50" />
                <p>Haz clic en cualquier casilla de la cuadrícula 5×5 para ver su desglose empírico.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
