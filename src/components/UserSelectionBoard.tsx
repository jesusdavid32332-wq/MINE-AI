import React, { useState } from 'react';
import { UserSelectionCell, UserSelectionState } from '../types';
import { Gem3D, Mine3D, TileClosed3D } from './Icons3D';
import { soundFX } from '../utils/soundEffects';

interface UserSelectionBoardProps {
  selections: UserSelectionCell[];
  onSelectionChange: (position: number, newStatus: UserSelectionState) => void;
  highlightPosition?: number | null;
  recommendedPositions?: number[];
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserSelectionBoard: React.FC<UserSelectionBoardProps> = ({
  selections,
  onSelectionChange,
  highlightPosition = null,
  recommendedPositions = [],
  readOnly = false,
  size = 'md',
  className = '',
}) => {
  const [activeModalPos, setActiveModalPos] = useState<number | null>(null);

  // Normalize 25 cells
  const fullCells: UserSelectionCell[] = Array.from({ length: 25 }, (_, i) => {
    const existing = selections.find((s) => s.position === i);
    const row = Math.floor(i / 5);
    const col = i % 5;
    return (
      existing || {
        position: i,
        coordinate: `F${row + 1}-C${col + 1}`,
        row,
        column: col,
        status: 'UNSELECTED',
      }
    );
  });

  const handleTileClick = (cell: UserSelectionCell) => {
    if (readOnly) return;
    soundFX.playTileClick();
    setActiveModalPos(cell.position);
  };

  const setStatus = (pos: number, status: UserSelectionState) => {
    if (status === 'CONFIRMED_SAFE') soundFX.playGemReveal();
    else if (status === 'CONFIRMED_MINE') soundFX.playMineDetonation();
    else soundFX.playTileClick();

    onSelectionChange(pos, status);
    setActiveModalPos(null);
  };

  const sizeDimensions = {
    sm: 'w-10 h-10 sm:w-11 sm:h-11',
    md: 'w-14 h-14 sm:w-16 sm:h-16',
    lg: 'w-16 h-16 sm:w-20 sm:h-20',
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8 sm:w-10 sm:h-10',
    lg: 'w-10 h-10 sm:w-13 sm:h-13',
  };

  return (
    <div className={`relative inline-block select-none ${className}`}>
      {/* Blue Casino Board Table Frame */}
      <div className="relative p-3.5 sm:p-5 rounded-3xl bg-gradient-to-b from-[#0e1b38]/95 via-[#081126]/95 to-[#040816] border border-[#25427b]/80 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(147,197,253,0.15)] backdrop-blur-xl">
        {/* Ambient Reflected Light Pools (Blue) */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 right-1/3 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent pointer-events-none" />

        {/* 5x5 Grid */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {fullCells.map((cell) => {
            const isHighlighted = highlightPosition === cell.position;

            // Visual styling based on UserSelectionState
            let surfaceStyle = '';
            let ringStyle = '';

            const isRec = recommendedPositions.includes(cell.position);
            const recNum = isRec ? recommendedPositions.indexOf(cell.position) + 1 : 0;

            if (cell.status === 'CONFIRMED_SAFE') {
              // Verde: confirmada como segura
              surfaceStyle =
                'bg-gradient-to-b from-emerald-900/80 via-[#064e3b]/90 to-[#022c22] border-emerald-400/80 shadow-[inset_0_1px_1px_rgba(209,250,229,0.35),0_0_20px_rgba(16,185,129,0.4)] text-emerald-100';
            } else if (cell.status === 'CONFIRMED_MINE') {
              // Rojo: mina confirmada
              surfaceStyle =
                'bg-gradient-to-b from-red-950/90 via-[#450a0a]/90 to-[#1c0404] border-red-500/80 shadow-[inset_0_1px_1px_rgba(254,202,202,0.35),0_0_25px_rgba(239,68,68,0.5)] text-red-100';
            } else if (cell.status === 'PENDING') {
              // Amarillo: resultado pendiente de confirmar
              surfaceStyle =
                'bg-gradient-to-b from-amber-900/80 via-[#78350f]/85 to-[#3b1704] border-amber-400/90 shadow-[inset_0_1px_1px_rgba(254,240,138,0.4),0_0_22px_rgba(245,158,11,0.5)] animate-pulse text-amber-100';
            } else if (isRec) {
              // Azul con borde cian para posición recomendada
              surfaceStyle =
                'bg-gradient-to-b from-[#162a5c] via-[#0d1d44] to-[#07112c] border-2 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:border-cyan-300 hover:from-[#1d3570] text-cyan-100';
            } else {
              // Azul: casilla todavía no seleccionada
              surfaceStyle =
                'bg-gradient-to-b from-[#172554] via-[#0f1d44] to-[#09122c] border-[#25427b]/90 shadow-[inset_0_1px_1px_rgba(147,197,253,0.2),0_4px_12px_rgba(0,0,0,0.6)] hover:border-blue-400/70 hover:from-[#1e346f] text-blue-100';
            }

            if (isHighlighted) {
              ringStyle = 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-105 z-10';
            } else if (isRec && cell.status === 'UNSELECTED') {
              ringStyle = 'ring-1 ring-cyan-400/80';
            }

            return (
              <button
                key={cell.position}
                type="button"
                disabled={readOnly}
                onClick={() => handleTileClick(cell)}
                className={`
                  relative flex flex-col items-center justify-center rounded-2xl border transition-all duration-150
                  ${sizeDimensions[size]}
                  ${surfaceStyle}
                  ${ringStyle}
                  ${!readOnly ? 'cursor-pointer active:scale-95 hover:-translate-y-0.5' : 'cursor-default'}
                `}
                title={`Coordenada ${cell.coordinate} [Fila ${cell.row + 1}, Columna ${cell.column + 1}] - Estado: ${
                  cell.status === 'CONFIRMED_SAFE'
                    ? 'Confirmada Segura (Gema)'
                    : cell.status === 'CONFIRMED_MINE'
                    ? 'Mina Confirmada (Derrota)'
                    : cell.status === 'PENDING'
                    ? 'Seleccionada en WIN10K (Pendiente)'
                    : isRec
                    ? `Sugerencia #${recNum} para WIN10K (Haz clic para registrar resultado)`
                    : 'No seleccionada'
                }`}
              >
                {/* Fixed Coordinate Label: F1-C1 .. F5-C5 */}
                <span className="absolute top-1 left-1.5 text-[8px] sm:text-[9px] font-mono font-bold tracking-tight pointer-events-none opacity-80">
                  {cell.coordinate}
                </span>

                {/* Recommendation badge on Blue Board */}
                {isRec && cell.status === 'UNSELECTED' && (
                  <span className="absolute top-1 right-1.5 text-[8px] sm:text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-cyan-500/90 text-black shadow-sm pointer-events-none">
                    #{recNum}
                  </span>
                )}

                {/* Status Indicator Dot/Badge */}
                <div className="flex items-center justify-center pointer-events-none">
                  {cell.status === 'CONFIRMED_SAFE' && (
                    <Gem3D className={`${iconSizes[size]} drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]`} />
                  )}
                  {cell.status === 'CONFIRMED_MINE' && (
                    <Mine3D className={`${iconSizes[size]} drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]`} />
                  )}
                  {cell.status === 'PENDING' && (
                    <div className="flex flex-col items-center">
                      <span className="w-4 h-4 rounded-full bg-amber-400 border border-amber-200 animate-ping mb-1" />
                      <span className="text-[9px] font-mono font-bold text-amber-200 uppercase tracking-tighter">
                        Paso ?
                      </span>
                    </div>
                  )}
                  {cell.status === 'UNSELECTED' && (
                    isRec ? (
                      <div className="flex flex-col items-center justify-center">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-mono font-black text-xs flex items-center justify-center">
                          {recNum}
                        </span>
                      </div>
                    ) : (
                      <TileClosed3D className={`${iconSizes[size]} opacity-40 group-hover:opacity-80`} />
                    )
                  )}
                </div>

                {/* State Tag at Bottom */}
                <span className="absolute bottom-1 right-1 text-[7px] sm:text-[8px] font-mono px-1 rounded font-bold pointer-events-none">
                  {cell.status === 'CONFIRMED_SAFE' && (
                    <span className="text-emerald-300">SEGURA</span>
                  )}
                  {cell.status === 'CONFIRMED_MINE' && (
                    <span className="text-red-300">MINA</span>
                  )}
                  {cell.status === 'PENDING' && (
                    <span className="text-amber-300">PEND</span>
                  )}
                  {cell.status === 'UNSELECTED' && (
                    <span className="text-blue-400/70">LIBRE</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Selection Action Modal */}
      {activeModalPos !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActiveModalPos(null)}
        >
          <div
            className="w-full max-w-sm bg-[#0c1428] border border-blue-500/40 rounded-3xl p-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>Coordenada {fullCells[activeModalPos].coordinate}</span>
                  <span className="text-xs font-mono text-blue-400">
                    (Fila {fullCells[activeModalPos].row + 1}, Columna {fullCells[activeModalPos].column + 1})
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Actualiza el estado de tu selección manual en WIN10K
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalPos(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setStatus(activeModalPos, 'PENDING')}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-200 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                  <span>Amarillo: Seleccionada (Pendiente de confirmar)</span>
                </div>
                <span className="font-mono text-[10px]">PENDIENTE</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus(activeModalPos, 'CONFIRMED_SAFE')}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <Gem3D className="w-4 h-4" />
                  <span>Verde: Confirmada como Segura (Gema)</span>
                </div>
                <span className="font-mono text-[10px]">+1 GEMA</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus(activeModalPos, 'CONFIRMED_MINE')}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <Mine3D className="w-4 h-4" />
                  <span>Rojo: Mina Confirmada (Derrota)</span>
                </div>
                <span className="font-mono text-[10px]">DERROTA</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus(activeModalPos, 'UNSELECTED')}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500/60" />
                  <span>Azul: Casilla no seleccionada</span>
                </div>
                <span className="font-mono text-[10px]">DESMARCAR</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
