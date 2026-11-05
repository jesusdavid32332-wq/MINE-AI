import React, { useState } from 'react';
import { CellData, CellState } from '../types';
import { Gem3D, Mine3D, Chest3D, TileClosed3D, TileUnknown3D } from './Icons3D';
import { soundFX } from '../utils/soundEffects';

interface Board5x5Props {
  cells: CellData[];
  onCellClick?: (position: number, currentState: CellState) => void;
  onCellStateChange?: (position: number, newState: CellState) => void;
  readOnly?: boolean;
  showConfidence?: boolean;
  showCoordinates?: boolean;
  highlightPosition?: number | null;
  newlyRevealedPositions?: number[]; // Highlight recently discovered cells in multi-stage analysis
  cellRanks?: { [pos: number]: number }; // Rank 1..25 by estimated safety
  recommendedPositions?: number[]; // Top recommended positions to explore
  showRankBadges?: boolean;
  hiddenSafeProbability?: number; // e.g. 0.88 or 0.875
  boardVariant?: 'green' | 'default';
  heatmapValues?: { [position: number]: number }; // 0.0 to 1.0
  heatmapColor?: 'red' | 'green' | 'blue' | 'gold';
  hasRecognizedCapture?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Board5x5: React.FC<Board5x5Props> = ({
  cells,
  onCellClick,
  onCellStateChange,
  readOnly = false,
  showConfidence = false,
  showCoordinates = false,
  highlightPosition = null,
  newlyRevealedPositions = [],
  cellRanks,
  recommendedPositions = [],
  showRankBadges = false,
  hiddenSafeProbability,
  boardVariant = 'default',
  heatmapValues,
  heatmapColor = 'red',
  hasRecognizedCapture = false,
  size = 'md',
  className = '',
}) => {
  const [activeCellModal, setActiveCellModal] = useState<number | null>(null);

  // Normalize exactly 25 cells
  const fullCells: CellData[] = Array.from({ length: 25 }, (_, i) => {
    const existing = cells.find((c) => c.position === i);
    return (
      existing || {
        position: i,
        row: Math.floor(i / 5),
        column: i % 5,
        state: 'OCULTA',
        confidence: 0,
        confirmedByUser: false,
      }
    );
  });

  const handleCellClick = (pos: number, state: CellState) => {
    // Audio tactile feedback
    if (state === 'SEGURA') {
      soundFX.playGemReveal();
    } else if (state === 'MINA') {
      soundFX.playMineDetonation();
    } else if (state === 'COFRE') {
      soundFX.playChestFanfare();
    } else {
      soundFX.playTileClick();
    }

    if (readOnly) {
      if (onCellClick) onCellClick(pos, state);
      return;
    }

    if (onCellStateChange) {
      setActiveCellModal(pos);
    } else if (onCellClick) {
      onCellClick(pos, state);
    }
  };

  const handleStateSelect = (pos: number, newState: CellState) => {
    if (newState === 'SEGURA') soundFX.playGemReveal();
    else if (newState === 'MINA') soundFX.playMineDetonation();
    else if (newState === 'COFRE') soundFX.playChestFanfare();
    else soundFX.playTileClick();

    if (onCellStateChange) {
      onCellStateChange(pos, newState);
    }
    setActiveCellModal(null);
  };

  const sizeDimensions = {
    sm: 'w-10 h-10 sm:w-11 sm:h-11',
    md: 'w-14 h-14 sm:w-16 sm:h-16',
    lg: 'w-16 h-16 sm:w-20 sm:h-20',
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9 sm:w-11 sm:h-11',
    lg: 'w-11 h-11 sm:w-14 sm:h-14',
  };

  return (
    <div className={`relative inline-block select-none ${className}`}>
      {/* Casino Board Table Frame with Ambient Specular Rim */}
      <div
        className={`relative p-3.5 sm:p-5 rounded-3xl backdrop-blur-xl transition-all ${
          boardVariant === 'green'
            ? 'bg-gradient-to-b from-[#0c2417]/95 via-[#06170e]/95 to-[#030d07] border border-[#065f46]/80 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(52,211,153,0.2)]'
            : 'bg-gradient-to-b from-[#131b31]/95 via-[#0b1020]/95 to-[#060913] border border-[#233256]/80 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.12)]'
        }`}
      >
        {/* Subtle Ambient Reflected Light Pools */}
        <div
          className={`absolute top-0 left-1/4 right-1/4 h-[1px] pointer-events-none ${
            boardVariant === 'green'
              ? 'bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent'
              : 'bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent'
          }`}
        />
        <div
          className={`absolute bottom-0 left-1/3 right-1/3 h-[1px] pointer-events-none ${
            boardVariant === 'green'
              ? 'bg-gradient-to-r from-transparent via-teal-500/40 to-transparent'
              : 'bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent'
          }`}
        />

        {/* 5x5 Grid */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {fullCells.map((cell) => {
            const isHighlighted = highlightPosition === cell.position;
            const isNewlyRevealed = newlyRevealedPositions.includes(cell.position);
            const heatVal = heatmapValues ? heatmapValues[cell.position] || 0 : null;
            const coordinateLabel = `F${cell.row + 1}-C${cell.column + 1}`;

            // Casino 3D cell styling
            let cellSurfaceStyle = '';

            if (cell.state === 'SEGURA') {
              cellSurfaceStyle =
                'bg-gradient-to-b from-emerald-900/70 via-[#064e3b]/90 to-[#022c22] border-emerald-400/60 shadow-[inset_0_1px_1px_rgba(209,250,229,0.3),0_0_20px_rgba(16,185,129,0.35)]';
            } else if (cell.state === 'MINA') {
              cellSurfaceStyle =
                'bg-gradient-to-b from-red-950/90 via-[#450a0a]/90 to-[#1c0404] border-red-500/70 shadow-[inset_0_1px_1px_rgba(254,202,202,0.3),0_0_24px_rgba(239,68,68,0.45)]';
            } else if (cell.state === 'COFRE') {
              cellSurfaceStyle =
                'bg-gradient-to-b from-amber-900/80 via-[#78350f]/90 to-[#3b1704] border-amber-400/70 shadow-[inset_0_1px_1px_rgba(254,240,138,0.35),0_0_20px_rgba(245,158,11,0.4)]';
            } else if (cell.state === 'DESCONOCIDA') {
              cellSurfaceStyle =
                'bg-gradient-to-b from-orange-950/60 via-[#431407]/70 to-[#1c0702] border-orange-500/60 border-dashed shadow-[0_0_12px_rgba(249,115,22,0.25)]';
            } else {
              // OCULTA (Casino 3D Closed Tile)
              cellSurfaceStyle =
                boardVariant === 'green'
                  ? 'bg-gradient-to-b from-[#0f291e] via-[#091b13] to-[#04100b] border-[#164e37]/90 shadow-[inset_0_1px_1px_rgba(167,243,208,0.18),0_4px_10px_rgba(0,0,0,0.6)] hover:border-emerald-400/70 hover:from-[#133527]'
                  : 'bg-gradient-to-b from-[#1e293b] via-[#141d30] to-[#0c1220] border-[#334468]/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_4px_10px_rgba(0,0,0,0.6)] hover:border-cyan-400/60 hover:from-[#25334c]';
            }

            // Heatmap coloring override
            let heatmapStyle = {};
            if (heatVal !== null && heatVal > 0) {
              const alpha = Math.min(0.92, Math.max(0.18, heatVal));
              if (heatmapColor === 'red') {
                heatmapStyle = {
                  backgroundColor: `rgba(220, 38, 38, ${alpha})`,
                  borderColor: `rgba(248, 113, 113, ${Math.min(1, alpha + 0.2)})`,
                  boxShadow: `0 0 15px rgba(239, 68, 68, ${alpha * 0.7})`,
                };
              } else if (heatmapColor === 'green') {
                heatmapStyle = {
                  backgroundColor: `rgba(16, 185, 129, ${alpha})`,
                  borderColor: `rgba(52, 211, 153, ${Math.min(1, alpha + 0.2)})`,
                  boxShadow: `0 0 15px rgba(16, 185, 129, ${alpha * 0.7})`,
                };
              } else if (heatmapColor === 'blue') {
                heatmapStyle = {
                  backgroundColor: `rgba(14, 165, 233, ${alpha})`,
                  borderColor: `rgba(56, 189, 248, ${Math.min(1, alpha + 0.2)})`,
                  boxShadow: `0 0 15px rgba(14, 165, 233, ${alpha * 0.7})`,
                };
              } else if (heatmapColor === 'gold') {
                heatmapStyle = {
                  backgroundColor: `rgba(217, 119, 6, ${alpha})`,
                  borderColor: `rgba(251, 191, 36, ${Math.min(1, alpha + 0.2)})`,
                  boxShadow: `0 0 15px rgba(245, 158, 11, ${alpha * 0.7})`,
                };
              }
            }

            const isRecommended = Boolean(
              hasRecognizedCapture &&
              recommendedPositions.includes(cell.position) &&
              cell.state === 'OCULTA'
            );
            const recIndex = recommendedPositions.indexOf(cell.position);
            const recNumber = recIndex >= 0 ? recIndex + 1 : 1;
            const cellRank = cellRanks ? cellRanks[cell.position] : undefined;

            if (isRecommended) {
              cellSurfaceStyle =
                'bg-gradient-to-b from-[#0a3820] via-[#052614] to-[#02130a] border-2 border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.7),inset_0_1px_2px_rgba(255,255,255,0.4)]';
            }

            return (
              <button
                key={cell.position}
                type="button"
                disabled={readOnly && !onCellClick}
                onClick={() => handleCellClick(cell.position, cell.state)}
                style={heatmapStyle}
                className={`
                  relative flex flex-col items-center justify-center rounded-2xl border transition-all duration-150
                  ${sizeDimensions[size]}
                  ${cellSurfaceStyle}
                  ${
                    isNewlyRevealed
                      ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 scale-105 animate-pulse z-20'
                      : ''
                  }
                  ${isHighlighted ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-105 z-10' : ''}
                  ${isRecommended ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-105 z-20 shadow-[0_0_25px_rgba(16,185,129,0.6)] animate-pulse' : ''}
                  ${!readOnly ? 'cursor-pointer active:scale-95 hover:-translate-y-0.5' : 'cursor-default'}
                `}
                title={`Coordenada ${coordinateLabel} [Fila ${cell.row + 1}, Columna ${cell.column + 1}] - Estado: ${cell.state}${
                  isRecommended
                    ? ` (Posición sugerida #${recNumber} para WIN10K · 88.0% prob. uniforme)`
                    : cellRank && hasRecognizedCapture
                    ? ` (Ranking estimado: #${cellRank})`
                    : ''
                }${
                  cell.state === 'OCULTA' && hiddenSafeProbability !== undefined
                    ? ` | Probabilidad matemática: ${(hiddenSafeProbability * 100).toFixed(1)}% segura`
                    : ''
                }`}
              >
                {/* Heatmap value numerical display */}
                {heatVal !== null ? (
                  <span className="font-mono text-[11px] sm:text-xs font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tabular-nums">
                    {(heatVal * 100).toFixed(0)}%
                  </span>
                ) : (
                  /* 3D Visual Rendering by State */
                  <div className="flex items-center justify-center pointer-events-none">
                    {cell.state === 'SEGURA' && (
                      <Gem3D className={`${iconSizes[size]} drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]`} />
                    )}
                    {cell.state === 'MINA' && (
                      <Mine3D className={`${iconSizes[size]} drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]`} />
                    )}
                    {cell.state === 'COFRE' && (
                      <Chest3D className={`${iconSizes[size]} drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]`} />
                    )}
                    {cell.state === 'DESCONOCIDA' && (
                      <TileUnknown3D className={`${iconSizes[size]} opacity-90`} />
                    )}
                    {cell.state === 'OCULTA' && (
                      isRecommended ? (
                        <div className="flex flex-col items-center justify-center animate-in zoom-in-75 duration-200">
                          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-emerald-400 via-teal-300 to-cyan-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center shadow-[0_0_16px_#10b981] ring-2 ring-white">
                            {recNumber}
                          </div>
                          <span className="text-[7px] sm:text-[8px] font-black text-emerald-300 tracking-wider uppercase mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                            SUGERIDA
                          </span>
                        </div>
                      ) : (
                        <TileClosed3D className={`${iconSizes[size]} opacity-70 group-hover:opacity-100`} />
                      )
                    )}
                  </div>
                )}

                {/* Subtile Fixed Coordinate: F1-C1 .. F5-C5 */}
                {showCoordinates && (
                  <span className="absolute top-1 left-1.5 text-[8px] sm:text-[9px] font-mono font-bold tracking-tight text-slate-400/90 pointer-events-none">
                    {coordinateLabel}
                  </span>
                )}

                {/* Mathematical Probability Tag on Hidden Cells */}
                {cell.state === 'OCULTA' && hiddenSafeProbability !== undefined && (
                  <span className="absolute bottom-1 left-1.5 text-[8px] font-mono font-bold text-emerald-400/90 pointer-events-none tabular-nums">
                    {(hiddenSafeProbability * 100).toFixed(0)}%
                  </span>
                )}

                {/* Recommendation or Rank Badge */}
                {isRecommended ? (
                  <span className="absolute top-1 right-1.5 text-[8px] sm:text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-emerald-400 text-slate-950 shadow-[0_0_8px_#10b981] pointer-events-none">
                    #{recNumber}
                  </span>
                ) : (
                  showRankBadges && hasRecognizedCapture && cellRank && cell.state === 'OCULTA' && (
                    <span className="absolute top-1 right-1.5 text-[8px] font-mono font-bold px-1 py-0.2 rounded pointer-events-none bg-slate-900/90 text-slate-400 border border-slate-700">
                      #{cellRank}
                    </span>
                  )
                )}

                {/* AI Vision Confidence Tag */}
                {showConfidence && cell.confidence > 0 && cell.state !== 'OCULTA' && (
                  <span
                    className={`absolute bottom-1 right-1 text-[8px] font-mono px-1 py-0.5 rounded font-bold pointer-events-none tabular-nums ${
                      cell.confidence >= 0.8
                        ? 'text-emerald-300 bg-emerald-950/90 border border-emerald-500/40'
                        : cell.confidence >= 0.6
                        ? 'text-amber-300 bg-amber-950/90 border border-amber-500/40'
                        : 'text-red-300 bg-red-950/90 border border-red-500/40'
                    }`}
                  >
                    {(cell.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Quick Adjustment Modal with Casino 3D Buttons */}
      {activeCellModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-gradient-to-b from-[#131b31] via-[#0e1424] to-[#080d18] border border-cyan-500/30 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center font-mono font-bold text-cyan-400 text-sm">
                  #{activeCellModal}
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Modificar Casilla #{activeCellModal}</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Fila {Math.floor(activeCellModal / 5)} · Columna {activeCellModal % 5}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCellModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Selecciona el estado auténtico visible en tu partida de WIN10K:
            </p>

            <div className="space-y-2.5">
              {[
                {
                  id: 'OCULTA',
                  label: 'Oculta (Cerrada)',
                  desc: 'Casilla sin abrir durante la ronda',
                  icon: <TileClosed3D className="w-7 h-7" />,
                  border: 'border-slate-700 hover:border-slate-500',
                  activeBg: 'bg-slate-800/90 border-cyan-500/80',
                },
                {
                  id: 'SEGURA',
                  label: 'Segura (Gema)',
                  desc: 'Diamante / gema descubierta con éxito',
                  icon: <Gem3D className="w-7 h-7" />,
                  border: 'border-emerald-500/40 hover:border-emerald-400',
                  activeBg: 'bg-emerald-950/70 border-emerald-400',
                },
                {
                  id: 'MINA',
                  label: 'Mina (Detonada)',
                  desc: 'Bomba revelada al final de la ronda',
                  icon: <Mine3D className="w-7 h-7" />,
                  border: 'border-red-500/40 hover:border-red-400',
                  activeBg: 'bg-red-950/70 border-red-400',
                },
                {
                  id: 'COFRE',
                  label: 'Cofre Dorado',
                  desc: 'Tesoro especial / multiplicador',
                  icon: <Chest3D className="w-7 h-7" />,
                  border: 'border-amber-500/40 hover:border-amber-400',
                  activeBg: 'bg-amber-950/70 border-amber-400',
                },
                {
                  id: 'DESCONOCIDA',
                  label: 'Desconocida / Dudosa',
                  desc: 'Imagen tapada o borrosa',
                  icon: <TileUnknown3D className="w-7 h-7" />,
                  border: 'border-orange-500/40 hover:border-orange-400',
                  activeBg: 'bg-orange-950/70 border-orange-400',
                },
              ].map((opt) => {
                const isCurrent = fullCells[activeCellModal]?.state === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleStateSelect(activeCellModal, opt.id as CellState)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                      isCurrent
                        ? `${opt.activeBg} text-white shadow-lg`
                        : `bg-[#0e1526]/80 ${opt.border} text-slate-300 hover:bg-[#151f36]`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">{opt.icon}</div>
                      <div>
                        <div className="text-sm font-bold text-white">{opt.label}</div>
                        <div className="text-[11px] text-slate-400">{opt.desc}</div>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-xs font-bold text-cyan-400 font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40">
                        ACTUAL
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveCellModal(null)}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
