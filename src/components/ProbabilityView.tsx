import React, { useState } from 'react';
import { Board5x5 } from './Board5x5';
import { CellData, CellState, GameRecord } from '../types';
import { calculateLiveRoundProbabilities } from '../utils/probabilityEngine';
import {
  ProbabilityIcon3D,
  Gem3D,
  Mine3D,
  Chest3D,
  TileClosed3D,
  Win10kAuditIcon3D,
  TrophyGold3D,
} from './Icons3D';
import { soundFX } from '../utils/soundEffects';

interface ProbabilityViewProps {
  games: GameRecord[];
  initialMinesCount?: number;
}

export const ProbabilityView: React.FC<ProbabilityViewProps> = ({
  games,
  initialMinesCount = 3,
}) => {
  const [mineCount, setMineCount] = useState<number>(initialMinesCount);
  const [liveCells, setLiveCells] = useState<CellData[]>(() =>
    Array.from({ length: 25 }, (_, i) => ({
      position: i,
      row: Math.floor(i / 5),
      column: i % 5,
      state: 'OCULTA',
      confidence: 1.0,
      confirmedByUser: false,
    }))
  );

  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  // Hypergeometric conditional probability calculations
  const liveProb = calculateLiveRoundProbabilities(liveCells, mineCount);

  // Toggle cell state on live interactive board
  const handleCellClick = (position: number, currentState: CellState) => {
    const nextStates: Record<CellState, CellState> = {
      OCULTA: 'SEGURA',
      SEGURA: 'MINA',
      MINA: 'COFRE',
      COFRE: 'DESCONOCIDA',
      DESCONOCIDA: 'OCULTA',
    };
    const nextState = nextStates[currentState] || 'OCULTA';

    if (nextState === 'SEGURA') soundFX.playGemReveal();
    else if (nextState === 'MINA') soundFX.playMineDetonation();
    else if (nextState === 'COFRE') soundFX.playChestFanfare();
    else soundFX.playTileClick();

    setLiveCells((prev) =>
      prev.map((c) => (c.position === position ? { ...c, state: nextState } : c))
    );
    setSelectedPosition(position);
  };

  const resetLiveBoard = () => {
    soundFX.playTileClick();
    setLiveCells(
      Array.from({ length: 25 }, (_, i) => ({
        position: i,
        row: Math.floor(i / 5),
        column: i % 5,
        state: 'OCULTA',
        confidence: 1.0,
        confirmedByUser: false,
      }))
    );
    setSelectedPosition(null);
  };

  // Historical frequency for the selected position from real Firestore games
  const getHistoricalStatsForPos = (pos: number) => {
    if (games.length === 0) return null;
    let safeInPos = 0;
    let mineInPos = 0;
    let chestInPos = 0;

    for (const g of games) {
      const c = g.cells?.find((cell) => cell.position === pos);
      if (c) {
        if (c.state === 'SEGURA') safeInPos++;
        else if (c.state === 'MINA') mineInPos++;
        else if (c.state === 'COFRE') chestInPos++;
      }
    }
    const totalRevealed = safeInPos + mineInPos + chestInPos;
    return {
      safeInPos,
      mineInPos,
      chestInPos,
      totalRevealed,
      frequencyPercent: totalRevealed > 0 ? (totalRevealed / games.length) * 100 : 0,
      mineRate: totalRevealed > 0 ? (mineInPos / totalRevealed) * 100 : 0,
      safeRate: totalRevealed > 0 ? (safeInPos / totalRevealed) * 100 : 0,
    };
  };

  const selectedPosStats = selectedPosition !== null ? getHistoricalStatsForPos(selectedPosition) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#12132e] via-[#0b1020] to-[#1a1236] border border-violet-500/30 p-5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-950/70 border border-violet-400/40 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] shrink-0">
              <ProbabilityIcon3D className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  Motor de Probabilidad Condicional en Vivo
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-violet-500/15 text-violet-300 border border-violet-500/40">
                  Hipergeométrica Exacta
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed">
                Calcula al instante la probabilidad matemática pura del siguiente movimiento a medida que se descubren casillas seguras.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button
              type="button"
              onClick={resetLiveBoard}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/80 transition active:scale-95"
            >
              Limpiar Tablero
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Board Simulator + Real-Time Statistical Meters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Board Simulator (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-black text-white">Simulador de Ronda en Vivo</h3>
              <p className="text-xs text-slate-400">
                Haz clic en una casilla para simular descubrir gemas o minas.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-mono text-slate-300 font-bold">Minas:</label>
              <select
                value={mineCount}
                onChange={(e) => {
                  setMineCount(parseInt(e.target.value, 10));
                  soundFX.playTileClick();
                }}
                className="bg-[#131b31] border border-violet-500/40 text-violet-300 font-mono font-bold text-xs rounded-xl px-2.5 py-1 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 8, 10, 15, 20, 24].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'mina' : 'minas'} {n === 3 ? '★ (Estrategia WIN10K)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5x5 Board */}
          <Board5x5
            cells={liveCells}
            onCellClick={handleCellClick}
            highlightPosition={selectedPosition}
            showCoordinates={true}
            size="lg"
          />

          {/* Explanatory legend below board */}
          <div className="w-full mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <Gem3D className="w-4 h-4" /> 1 clic = Segura
            </span>
            <span className="flex items-center gap-1.5">
              <Mine3D className="w-4 h-4" /> 2 clics = Mina
            </span>
            <span className="flex items-center gap-1.5">
              <Chest3D className="w-4 h-4" /> 3 clics = Cofre
            </span>
            <span className="flex items-center gap-1.5">
              <TileClosed3D className="w-4 h-4" /> 4 clics = Oculta
            </span>
          </div>
        </div>

        {/* Live Mathematical Gauges & Selected Tile Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Main Risk Gauge Card */}
          <div className="bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ProbabilityIcon3D className="w-5 h-5" />
                <span>Probabilidad en la Siguiente Casilla</span>
              </h3>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                  liveProb.riskLevel === 'CERTAIN_SAFE' || liveProb.riskLevel === 'VERY_LOW'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : liveProb.riskLevel === 'LOW'
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                    : liveProb.riskLevel === 'MEDIUM'
                    ? 'bg-yellow-950/80 text-yellow-300 border-yellow-500/40'
                    : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                }`}
              >
                Riesgo: {liveProb.riskLevel}
              </span>
            </div>

            {/* Twin meters: Safe vs Mine */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Safe probability */}
              <div className="p-4 rounded-2xl bg-[#0e1628] border border-emerald-500/30 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
                  <Gem3D className="w-4 h-4" />
                  <span>Segura (Gema)</span>
                </div>
                <div className="text-3xl font-black text-emerald-300 font-mono tabular-nums">
                  {(liveProb.exactProbabilitySafe * 100).toFixed(1)}%
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${liveProb.exactProbabilitySafe * 100}%` }}
                  />
                </div>
              </div>

              {/* Mine probability */}
              <div className="p-4 rounded-2xl bg-[#0e1628] border border-rose-500/30 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-400 mb-1">
                  <Mine3D className="w-4 h-4" />
                  <span>Mina (Detonación)</span>
                </div>
                <div className="text-3xl font-black text-rose-400 font-mono tabular-nums">
                  {(liveProb.exactProbabilityMine * 100).toFixed(1)}%
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${liveProb.exactProbabilityMine * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick counters breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
              <div className="bg-[#11192e] p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Gemas Reveladas</span>
                <span className="font-bold text-emerald-400 text-sm tabular-nums">
                  {liveProb.revealedSafe}
                </span>
              </div>
              <div className="bg-[#11192e] p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Minas Restantes</span>
                <span className="font-bold text-rose-400 text-sm tabular-nums">
                  {liveProb.remainingMines}
                </span>
              </div>
              <div className="bg-[#11192e] p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Casillas Ocultas</span>
                <span className="font-bold text-cyan-400 text-sm tabular-nums">
                  {liveProb.remainingHiddenCells}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#111a31]/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <strong>Veredicto Matemático:</strong> {liveProb.mathematicalVerdict}
            </div>
          </div>

          {/* Selected Tile Inspector with Historical Comparison */}
          {selectedPosition !== null && (
            <div className="bg-[#0b1020]/90 border border-cyan-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-400 flex items-center justify-center font-mono font-bold text-cyan-300 text-xs">
                    #{selectedPosition}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Inspector de Casilla #{selectedPosition}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Fila {Math.floor(selectedPosition / 5)} · Col {selectedPosition % 5}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-300">
                  Estado: {liveCells[selectedPosition]?.state}
                </span>
              </div>

              {selectedPosStats ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300 font-mono">
                    <span>Frecuencia en tus {games.length} partidas:</span>
                    <span className="font-bold text-cyan-400 tabular-nums">
                      {selectedPosStats.frequencyPercent.toFixed(1)}% ({selectedPosStats.totalRevealed} veces)
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-mono">
                    <span>Gemas observadas en #{selectedPosition}:</span>
                    <span className="font-bold text-emerald-400 tabular-nums">
                      {selectedPosStats.safeInPos}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-mono">
                    <span>Minas observadas en #{selectedPosition}:</span>
                    <span className="font-bold text-rose-400 tabular-nums">
                      {selectedPosStats.mineInPos}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed font-mono">
                  No hay partidas registradas en Firestore aún para calcular frecuencias históricas de esta casilla.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
