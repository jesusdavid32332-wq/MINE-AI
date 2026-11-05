import React, { useState } from 'react';
import { Board5x5 } from './Board5x5';
import { CellData, CellState, GameRecord } from '../types';
import { calculateLiveRoundProbabilities } from '../utils/probabilityEngine';
import {
  Brain,
  AlertTriangle,
  Info,
  ShieldAlert,
  Percent,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

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

  // Calculate live hypergeometric conditional probability for current active board
  const liveProb = calculateLiveRoundProbabilities(liveCells, mineCount);

  // Toggle cell state for live assistant exploration
  const handleCellClick = (position: number, currentState: CellState) => {
    const nextStates: Record<CellState, CellState> = {
      OCULTA: 'SEGURA',
      SEGURA: 'MINA',
      MINA: 'COFRE',
      COFRE: 'DESCONOCIDA',
      DESCONOCIDA: 'OCULTA',
    };
    const nextState = nextStates[currentState] || 'OCULTA';
    setLiveCells((prev) =>
      prev.map((c) => (c.position === position ? { ...c, state: nextState } : c))
    );
    setSelectedPosition(position);
  };

  const resetLiveBoard = () => {
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

  // Calculate historical frequency for the selected position (strictly from real Firestore games)
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
    };
  };

  const selectedPosStats = selectedPosition !== null ? getHistoricalStatsForPos(selectedPosition) : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-950/60 border border-purple-500/40 rounded-xl text-purple-400">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Análisis Inteligente y Probabilidad Real
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Cálculo Hipergeométrico
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Probabilidad condicional exacta en tiempo real basada en las leyes combinatorias del juego Mines en WIN10K.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetLiveBoard}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition flex items-center gap-1.5 self-end sm:self-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Limpiar Tablero
          </button>
        </div>
      </div>

      {/* Important Transparency Directive */}
      <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-200/90 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-300">
            Principio de Honestidad Algorítmica y Cero Falsas Promesas:
          </p>
          <p>
            WIN10K genera las posiciones de las minas de forma aleatoria e independiente en cada partida mediante un algoritmo criptográfico (Server Seed + Client Seed). Los resultados de partidas pasadas <strong>NO alteran la probabilidad de las casillas en la partida actual</strong>. Toda recomendación aquí presentada se basa estrictamente en la proporción matemática de minas restantes entre las casillas ocultas de la ronda en curso.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive 5x5 Board with quick click toggling (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Tablero de la Ronda Activa</h3>
              <p className="text-xs text-slate-400">
                Haz clic en una casilla para alternar su estado revelado en tu partida
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Minas:</label>
              <select
                value={mineCount}
                onChange={(e) => setMineCount(parseInt(e.target.value, 10))}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m} {m === 1 ? 'mina' : 'minas'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Board5x5
            cells={liveCells}
            onCellClick={handleCellClick}
            highlightPosition={selectedPosition}
            showCoordinates={true}
            size="lg"
          />

          <div className="w-full mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex justify-between items-center">
            <span>💡 Haz clic para alternar: Oculta → Segura → Mina → Cofre → Desconocida</span>
            {selectedPosition !== null && (
              <span className="font-mono text-blue-400">Casilla #{selectedPosition} seleccionada</span>
            )}
          </div>
        </div>

        {/* Right: Real-time Mathematical Analysis Readout (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Combinatorial Probability Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-400" />
              Probabilidad Condicional en la Partida Actual
            </h3>

            {/* Metric counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Minas Totales</span>
                <span className="text-lg font-bold text-white font-mono">{mineCount}</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Minas Reveladas</span>
                <span className="text-lg font-bold text-red-400 font-mono">{liveProb.revealedMines}</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Seguras Reveladas</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">{liveProb.revealedSafe}</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Ocultas Restantes</span>
                <span className="text-lg font-bold text-blue-400 font-mono">{liveProb.remainingHiddenCells}</span>
              </div>
            </div>

            {/* Probability Bars */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">Probabilidad de Casilla Segura</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {(liveProb.exactProbabilitySafe * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, liveProb.exactProbabilitySafe * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">Probabilidad de Detonación (Mina)</span>
                  <span className="font-mono font-bold text-red-400">
                    {(liveProb.exactProbabilityMine * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, liveProb.exactProbabilityMine * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Mathematical Verdict */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                Veredicto Matemático Riguroso:
              </span>
              <p className="text-slate-400 leading-relaxed">{liveProb.mathematicalVerdict}</p>
            </div>
          </div>

          {/* Historical Evidence for Selected Cell */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Registro Histórico en Casilla #{selectedPosition !== null ? selectedPosition : '—'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {games.length} {games.length === 1 ? 'partida guardada' : 'partidas guardadas'}
              </span>
            </h3>

            {games.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                <p>Aún no hay partidas reales registradas en Firestore.</p>
                <p className="mt-1">
                  Guarda partidas en el Analizador para calcular frecuencias empíricas en esta posición.
                </p>
              </div>
            ) : selectedPosition === null ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Haz clic en cualquier casilla del tablero para consultar su frecuencia empírica en tus partidas pasadas.
              </p>
            ) : selectedPosStats ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-mono">Veces Segura</span>
                    <span className="font-bold text-emerald-400 font-mono text-base">
                      {selectedPosStats.safeInPos}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-mono">Veces Mina</span>
                    <span className="font-bold text-red-400 font-mono text-base">
                      {selectedPosStats.mineInPos}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-mono">Veces Revelada</span>
                    <span className="font-bold text-blue-400 font-mono text-base">
                      {selectedPosStats.totalRevealed}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <p>
                    En tus {games.length} partidas registradas, la casilla #{selectedPosition} fue revelada en el{' '}
                    <strong className="text-white">{selectedPosStats.frequencyPercent.toFixed(1)}%</strong> de las partidas.
                    De esas revelaciones, el{' '}
                    <strong className="text-red-400">{selectedPosStats.mineRate.toFixed(1)}%</strong> resultó ser mina.
                  </p>
                  <p className="mt-1 text-slate-500 italic">
                    Recordatorio: Este dato refleja eventos pasados y no condiciona la aleatoriedad de la partida actual.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
