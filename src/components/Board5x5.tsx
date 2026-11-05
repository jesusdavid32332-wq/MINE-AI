import React, { useState } from 'react';
import { CellData, CellState } from '../types';
import { Bomb, Gem, Archive, HelpCircle, EyeOff, Check, AlertTriangle } from 'lucide-react';

interface Board5x5Props {
  cells: CellData[];
  onCellClick?: (position: number, currentState: CellState) => void;
  onCellStateChange?: (position: number, newState: CellState) => void;
  readOnly?: boolean;
  showConfidence?: boolean;
  showCoordinates?: boolean;
  highlightPosition?: number | null;
  heatmapValues?: { [position: number]: number }; // 0.0 to 1.0 for heatmap overlay
  heatmapColor?: 'red' | 'green' | 'blue' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

const STATE_CONFIG: Record<
  CellState,
  {
    label: string;
    bg: string;
    border: string;
    glow: string;
    text: string;
    icon: React.ReactNode;
  }
> = {
  OCULTA: {
    label: 'Oculta',
    bg: 'bg-slate-900/90',
    border: 'border-slate-800 hover:border-slate-600',
    glow: '',
    text: 'text-slate-400',
    icon: <EyeOff className="w-5 h-5 opacity-40" />,
  },
  SEGURA: {
    label: 'Segura',
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-500/80',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.35)]',
    text: 'text-emerald-400',
    icon: <Gem className="w-5 h-5 text-emerald-400 animate-pulse" />,
  },
  MINA: {
    label: 'Mina',
    bg: 'bg-red-950/90',
    border: 'border-red-500/90',
    glow: 'shadow-[0_0_18px_rgba(239,68,68,0.45)]',
    text: 'text-red-400',
    icon: <Bomb className="w-5 h-5 text-red-400" />,
  },
  COFRE: {
    label: 'Cofre',
    bg: 'bg-amber-950/80',
    border: 'border-amber-500/80',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.35)]',
    text: 'text-amber-300',
    icon: <Archive className="w-5 h-5 text-amber-300" />,
  },
  DESCONOCIDA: {
    label: 'Desconocida',
    bg: 'bg-orange-950/70',
    border: 'border-orange-500/70 border-dashed',
    glow: 'shadow-[0_0_12px_rgba(249,115,22,0.25)]',
    text: 'text-orange-400',
    icon: <HelpCircle className="w-5 h-5 text-orange-400" />,
  },
};

export const Board5x5: React.FC<Board5x5Props> = ({
  cells,
  onCellClick,
  onCellStateChange,
  readOnly = false,
  showConfidence = false,
  showCoordinates = false,
  highlightPosition = null,
  heatmapValues,
  heatmapColor = 'red',
  size = 'md',
}) => {
  const [activeCellModal, setActiveCellModal] = useState<number | null>(null);

  // Normalize cells into 25 items array
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
    if (onCellStateChange) {
      onCellStateChange(pos, newState);
    }
    setActiveCellModal(null);
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 sm:w-16 sm:h-16 text-sm',
    lg: 'w-16 h-16 sm:w-20 sm:h-20 text-base',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  return (
    <div className="relative inline-block select-none">
      <div className="grid grid-cols-5 gap-2 sm:gap-2.5 p-3 sm:p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
        {fullCells.map((cell) => {
          const config = STATE_CONFIG[cell.state] || STATE_CONFIG.DESCONOCIDA;
          const isHighlighted = highlightPosition === cell.position;
          const heatVal = heatmapValues ? heatmapValues[cell.position] || 0 : null;

          // Heatmap background calculation
          let heatmapBgStyle = {};
          if (heatVal !== null && heatVal > 0) {
            const alpha = Math.min(0.9, Math.max(0.15, heatVal));
            if (heatmapColor === 'red') {
              heatmapBgStyle = { backgroundColor: `rgba(239, 68, 68, ${alpha})` };
            } else if (heatmapColor === 'green') {
              heatmapBgStyle = { backgroundColor: `rgba(16, 185, 129, ${alpha})` };
            } else if (heatmapColor === 'blue') {
              heatmapBgStyle = { backgroundColor: `rgba(56, 189, 248, ${alpha})` };
            } else if (heatmapColor === 'gold') {
              heatmapBgStyle = { backgroundColor: `rgba(245, 158, 11, ${alpha})` };
            }
          }

          return (
            <button
              key={cell.position}
              type="button"
              disabled={readOnly && !onCellClick}
              onClick={() => handleCellClick(cell.position, cell.state)}
              style={heatmapBgStyle}
              className={`
                relative flex flex-col items-center justify-center rounded-xl border transition-all duration-200
                ${sizeClasses[size]}
                ${config.bg}
                ${config.border}
                ${config.glow}
                ${isHighlighted ? 'ring-2 ring-blue-400 scale-105 z-10' : ''}
                ${!readOnly ? 'cursor-pointer active:scale-95 hover:brightness-125' : 'cursor-default'}
              `}
              title={`Casilla #${cell.position} [Fila ${cell.row}, Col ${cell.column}] - ${config.label}`}
            >
              {/* Heatmap value badge */}
              {heatVal !== null && (
                <span className="font-mono text-[10px] sm:text-xs font-bold text-white drop-shadow-md">
                  {(heatVal * 100).toFixed(0)}%
                </span>
              )}

              {/* Normal Icon display if not heatmap */}
              {heatVal === null && (
                <div className="flex items-center justify-center">
                  {cell.state === 'SEGURA' && <Gem className={`${iconSizes[size]} text-emerald-400`} />}
                  {cell.state === 'MINA' && <Bomb className={`${iconSizes[size]} text-red-400`} />}
                  {cell.state === 'COFRE' && <Archive className={`${iconSizes[size]} text-amber-300`} />}
                  {cell.state === 'DESCONOCIDA' && <HelpCircle className={`${iconSizes[size]} text-orange-400`} />}
                  {cell.state === 'OCULTA' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-700/60 group-hover:bg-slate-500" />
                  )}
                </div>
              )}

              {/* Position Coordinate Label */}
              {showCoordinates && (
                <span className="absolute top-1 left-1.5 text-[8px] sm:text-[9px] font-mono text-slate-500">
                  {cell.position}
                </span>
              )}

              {/* Vision Confidence Indicator */}
              {showConfidence && cell.confidence > 0 && cell.state !== 'OCULTA' && (
                <span
                  className={`absolute bottom-1 right-1 text-[8px] font-mono px-1 py-0.2 rounded ${
                    cell.confidence >= 0.8
                      ? 'text-emerald-300 bg-emerald-950/80'
                      : cell.confidence >= 0.6
                      ? 'text-yellow-300 bg-yellow-950/80'
                      : 'text-red-300 bg-red-950/80'
                  }`}
                >
                  {(cell.confidence * 100).toFixed(0)}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Manual State Quick-Selector Modal */}
      {activeCellModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-xs w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <div>
                <h4 className="font-semibold text-white text-base">Modificar Casilla #{activeCellModal}</h4>
                <p className="text-xs text-slate-400">
                  Fila {Math.floor(activeCellModal / 5)}, Columna {activeCellModal % 5}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCellModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Selecciona el estado real que observas en la partida de WIN10K:
            </p>

            <div className="grid grid-cols-1 gap-2">
              {(['OCULTA', 'SEGURA', 'MINA', 'COFRE', 'DESCONOCIDA'] as CellState[]).map((st) => {
                const conf = STATE_CONFIG[st];
                const isCurrent = fullCells[activeCellModal]?.state === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStateSelect(activeCellModal, st)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-sm font-medium ${
                      isCurrent
                        ? `${conf.bg} ${conf.border} text-white shadow-lg`
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={conf.text}>{conf.icon}</span>
                      <span>{conf.label}</span>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveCellModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
