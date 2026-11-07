import React from 'react';
import { CellData, UserSelectionCell, UserSelectionState } from '../types';
import {
  Gem3D,
  Mine3D,
  Chest3D,
  TileClosed3D,
  TileUnknown3D,
  ScannerIcon3D,
  TrophyGold3D,
} from './Icons3D';
import { soundFX } from '../utils/soundEffects';

interface ScanResultsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  cells: CellData[];
  userSelections: UserSelectionCell[];
  recommendedPositions: number[];
  onUserSelectionChange: (position: number, newStatus: UserSelectionState) => void;
  analysisMode: 'MODE_1_NEW' | 'MODE_2_UPDATE';
  gameStatus: 'ongoing' | 'win' | 'lost';
  safeCount: number;
  mineCountRevealed: number;
  nextSafeProbability: number;
  estimatedMultiplier: number;
  onViewFullBoards: () => void;
  onUpdateCapture: () => void;
  onNewGame: () => void;
  qualityAssessment?: string;
  qualityNotes?: string;
  overallConfidence?: number | null;
  newlyRevealedPositions?: number[];
}

export const ScanResultsOverlay: React.FC<ScanResultsOverlayProps> = ({
  isOpen,
  onClose,
  cells,
  userSelections,
  recommendedPositions,
  onUserSelectionChange,
  analysisMode,
  gameStatus,
  safeCount,
  mineCountRevealed,
  nextSafeProbability,
  estimatedMultiplier,
  onViewFullBoards,
  onUpdateCapture,
  onNewGame,
  qualityAssessment = 'CLEAR',
  qualityNotes = 'Escaneo completado exitosamente.',
  overallConfidence,
  newlyRevealedPositions = [],
}) => {
  if (!isOpen) return null;

  // Normalized 25 cells for the 5x5 grid
  const fullCells: CellData[] = Array.from({ length: 25 }, (_, i) => {
    const existing = cells.find((c) => c.position === i);
    return (
      existing || {
        position: i,
        coordinate: `F${Math.floor(i / 5) + 1}-C${(i % 5) + 1}`,
        row: Math.floor(i / 5),
        column: i % 5,
        state: 'OCULTA',
        confidence: 1.0,
        confirmedByUser: false,
      }
    );
  });

  const rowDescriptions = [
    'Fila 1 (superior / arriba del todo)',
    'Fila 2 (segunda fila)',
    'Fila 3 (fila central)',
    'Fila 4 (cuarta fila)',
    'Fila 5 (inferior / abajo del todo)',
  ];

  const colDescriptions = [
    'Columna 1 (izquierda del todo)',
    'Columna 2 (segunda columna)',
    'Columna 3 (columna central)',
    'Columna 4 (cuarta columna)',
    'Columna 5 (derecha del todo)',
  ];

  // The 3 recommended positions detail
  const top3Details = recommendedPositions.slice(0, 3).map((pos, idx) => {
    const row = Math.floor(pos / 5);
    const col = pos % 5;
    const cellData = cells.find((c) => c.position === pos);
    const userSel = userSelections.find((s) => s.position === pos);

    return {
      number: idx + 1,
      position: pos,
      coordinate: `F${row + 1}-C${col + 1}`,
      row: row + 1,
      column: col + 1,
      rowDescription: rowDescriptions[row] || `Fila ${row + 1}`,
      colDescription: colDescriptions[col] || `Columna ${col + 1}`,
      state: cellData?.state || 'OCULTA',
      userStatus: userSel?.status || 'UNSELECTED',
    };
  });

  const handleTileDirectClick = (pos: number) => {
    const current = userSelections.find((s) => s.position === pos)?.status || 'UNSELECTED';
    // Cycle status: UNSELECTED -> PENDING -> CONFIRMED_SAFE -> CONFIRMED_MINE -> UNSELECTED
    let nextStatus: UserSelectionState = 'PENDING';
    if (current === 'UNSELECTED') nextStatus = 'PENDING';
    else if (current === 'PENDING') nextStatus = 'CONFIRMED_SAFE';
    else if (current === 'CONFIRMED_SAFE') nextStatus = 'CONFIRMED_MINE';
    else if (current === 'CONFIRMED_MINE') nextStatus = 'UNSELECTED';

    soundFX.playTileClick();
    onUserSelectionChange(pos, nextStatus);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Floating Card Container */}
      <div
        className="relative w-full max-w-4xl bg-gradient-to-b from-[#0e172e] via-[#091124] to-[#040814] border-2 border-cyan-500/50 rounded-3xl p-4 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.95),inset_0_1px_2px_rgba(255,255,255,0.15)] my-auto overflow-hidden animate-scan-success"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular Ambient Glow Rings */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* 1. Header Bar with Scan Completed Indicator */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-cyan-500/25 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-[2px] shadow-[0_0_20px_rgba(6,182,212,0.5)] shrink-0">
              <div className="w-full h-full bg-[#081022] rounded-[14px] flex items-center justify-center">
                <ScannerIcon3D className="w-6 h-6 text-cyan-300 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  ESCANEO COMPLETADO CON ÉXITO
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                  {analysisMode === 'MODE_1_NEW' ? 'Modo 1: Tablero Inicial' : 'Modo 2: Ronda Actualizada'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide mt-1">
                Pantalla Flotante de Resultados (Cuadrícula 5×5)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-mono">
              <Gem3D className="w-4 h-4" />
              <span className="font-bold text-emerald-300">{safeCount}/3</span>
              <span className="text-slate-500">|</span>
              <Mine3D className="w-4 h-4" />
              <span className="font-bold text-red-300">{mineCountRevealed}/3</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center justify-center text-sm font-bold active:scale-95 shadow-md"
              title="Cerrar pantalla flotante (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Gemini Vision Real Analysis Diagnostic Banner */}
        <div className="mb-3.5 p-3 rounded-2xl bg-[#081326] border border-cyan-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2 text-slate-300">
            <span className="text-cyan-400 font-black shrink-0">🤖 Diagnóstico Gemini:</span>
            <span className="text-[11px] text-slate-300 leading-relaxed font-medium">
              {qualityNotes}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
              Calidad: {qualityAssessment}
            </span>
            {overallConfidence !== null && overallConfidence !== undefined && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold">
                Confianza: {Math.round(overallConfidence * 100)}%
              </span>
            )}
          </div>
        </div>

        {/* Game State Banner (Victory or Detonation) if applicable */}
        {gameStatus === 'win' && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-400 text-emerald-200 flex items-center justify-between gap-3 shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-pulse">
            <div className="flex items-center gap-2.5">
              <TrophyGold3D className="w-7 h-7 shrink-0" />
              <span className="text-xs font-black">
                ¡OBJETIVO DE 3 CASILLAS ALCANZADO (3/3)! Retirada / Cashout recomendada de inmediato (~{estimatedMultiplier.toFixed(2)}x).
              </span>
            </div>
            <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-lg bg-emerald-900 border border-emerald-400 shrink-0">
              CASHOUT
            </span>
          </div>
        )}

        {gameStatus === 'lost' && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-950/80 border border-red-500 text-red-200 flex items-center justify-between gap-3 shadow-[0_0_25px_rgba(239,68,68,0.3)]">
            <div className="flex items-center gap-2.5">
              <Mine3D className="w-7 h-7 shrink-0" />
              <span className="text-xs font-black">
                MINA DETONADA: La partida ha finalizado en derrota. Utiliza el botón "Nueva Partida" para reiniciar la siguiente ronda.
              </span>
            </div>
            <button
              type="button"
              onClick={onNewGame}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-900 hover:bg-red-800 text-white shrink-0 transition"
            >
              Reiniciar
            </button>
          </div>
        )}

        {/* 2. Main 5x5 Volumetric Board with Sequential Animation */}
        <div className="flex flex-col items-center justify-center my-2">
          <div className="relative p-3 sm:p-4 rounded-3xl bg-gradient-to-b from-[#0c2417]/95 via-[#06170e]/95 to-[#030d07] border border-[#065f46] shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(52,211,153,0.2)]">
            <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
              {fullCells.map((cell) => {
                const coordinateLabel = `F${cell.row + 1}-C${cell.column + 1}`;
                const userSel = userSelections.find((s) => s.position === cell.position)?.status || 'UNSELECTED';
                const isRecommended = recommendedPositions.includes(cell.position) && cell.state === 'OCULTA';
                const recIndex = recommendedPositions.indexOf(cell.position);
                const recNumber = recIndex >= 0 ? recIndex + 1 : 1;
                const isNewlyRevealed = newlyRevealedPositions.includes(cell.position);

                // Volumetric surface style
                let surfaceStyle = '';
                if (cell.state === 'SEGURA' || userSel === 'CONFIRMED_SAFE') {
                  surfaceStyle =
                    'bg-gradient-to-b from-emerald-900/80 via-[#064e3b]/95 to-[#022c22] border-emerald-400 shadow-[inset_0_1px_2px_rgba(209,250,229,0.4),0_0_20px_rgba(16,185,129,0.4)] text-emerald-100';
                } else if (cell.state === 'MINA' || userSel === 'CONFIRMED_MINE') {
                  surfaceStyle =
                    'bg-gradient-to-b from-red-950/90 via-[#450a0a]/95 to-[#1c0404] border-red-500 shadow-[inset_0_1px_2px_rgba(254,202,202,0.4),0_0_25px_rgba(239,68,68,0.5)] text-red-100';
                } else if (userSel === 'PENDING') {
                  surfaceStyle =
                    'bg-gradient-to-b from-amber-900/85 via-[#78350f]/90 to-[#3b1704] border-amber-400 shadow-[inset_0_1px_2px_rgba(254,240,138,0.4),0_0_22px_rgba(245,158,11,0.5)] animate-pulse text-amber-100';
                } else if (isRecommended) {
                  surfaceStyle =
                    'bg-gradient-to-b from-[#0a3820] via-[#052614] to-[#02130a] border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.7),inset_0_1px_2px_rgba(255,255,255,0.4)] text-emerald-100 animate-green-glow';
                } else {
                  // Oculta estándar
                  surfaceStyle =
                    'bg-gradient-to-b from-[#0f291e] via-[#091b13] to-[#04100b] border-[#164e37]/90 shadow-[inset_0_1px_1px_rgba(167,243,208,0.18),0_4px_10px_rgba(0,0,0,0.6)] hover:border-emerald-400/70 hover:from-[#133527]';
                }

                // Staggered sequential appearance delay (0 to 600ms)
                const animationDelay = `${(cell.row * 5 + cell.column) * 22}ms`;

                return (
                  <button
                    key={cell.position}
                    type="button"
                    onClick={() => handleTileDirectClick(cell.position)}
                    style={{ animationDelay }}
                    className={`
                      relative flex flex-col items-center justify-center rounded-2xl border transition-all duration-150
                      w-12 h-12 sm:w-16 sm:h-16
                      ${surfaceStyle}
                      ${isNewlyRevealed ? 'ring-2 ring-amber-400 animate-pulse z-20' : ''}
                      ${isRecommended ? 'scale-[1.03] z-20 ring-2 ring-emerald-400/90 ring-offset-2 ring-offset-slate-950' : ''}
                      cursor-pointer active:scale-95 animate-cell-appear
                    `}
                    title={`Coordenada ${coordinateLabel} [Fila ${cell.row + 1}, Columna ${cell.column + 1}]${
                      isRecommended ? ` — Posición Sugerida #${recNumber}` : ''
                    } (Haz clic para alternar resultado)`}
                  >
                    {/* Fixed Coordinate Label: F1-C1 .. F5-C5 */}
                    <span className="absolute top-1 left-1.5 text-[8px] sm:text-[9px] font-mono font-bold tracking-tight text-slate-400/90 pointer-events-none">
                      {coordinateLabel}
                    </span>

                    {/* Central Volumetric Graphic */}
                    <div className="flex items-center justify-center pointer-events-none">
                      {(cell.state === 'SEGURA' || userSel === 'CONFIRMED_SAFE') && (
                        <Gem3D className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
                      )}
                      {(cell.state === 'MINA' || userSel === 'CONFIRMED_MINE') && (
                        <Mine3D className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]" />
                      )}
                      {cell.state === 'COFRE' && (
                        <Chest3D className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
                      )}
                      {cell.state === 'DESCONOCIDA' && (
                        <TileUnknown3D className="w-8 h-8 sm:w-10 sm:h-10 opacity-90" />
                      )}
                      {cell.state === 'OCULTA' && userSel === 'PENDING' && (
                        <div className="flex flex-col items-center">
                          <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-200 animate-ping mb-0.5" />
                          <span className="text-[8px] font-mono font-bold text-amber-200">PASO ?</span>
                        </div>
                      )}
                      {cell.state === 'OCULTA' && userSel !== 'PENDING' && (
                        isRecommended ? (
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-emerald-400 via-teal-300 to-cyan-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center shadow-[0_0_15px_#10b981] ring-2 ring-white">
                              {recNumber}
                            </div>
                            <span className="text-[7px] sm:text-[8px] font-black text-emerald-300 tracking-wider uppercase mt-0.5">
                              SUGERIDA
                            </span>
                          </div>
                        ) : (
                          <TileClosed3D className="w-7 h-7 sm:w-9 sm:h-9 opacity-70 group-hover:opacity-100" />
                        )
                      )}
                    </div>

                    {/* Top-Right Badge for Recommendations */}
                    {isRecommended && (
                      <span className="absolute top-1 right-1.5 text-[8px] sm:text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-emerald-400 text-slate-950 shadow-[0_0_8px_#10b981] pointer-events-none">
                        #{recNumber}
                      </span>
                    )}

                    {/* Uniform Mathematical Probability Tag on Hidden Tiles */}
                    {cell.state === 'OCULTA' && !isRecommended && userSel === 'UNSELECTED' && (
                      <span className="absolute bottom-1 right-1 text-[7px] sm:text-[8px] font-mono font-bold text-emerald-400/80 pointer-events-none">
                        {(nextSafeProbability * 100).toFixed(0)}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Panel "MIS 3 SELECCIONES" */}
        {top3Details.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#071328] via-[#091b36] to-[#0c142c] border-2 border-emerald-400/80 shadow-[0_10px_30px_rgba(16,185,129,0.2)] space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-emerald-500/30">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-[0_0_12px_#10b981] shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>MIS 3 SELECCIONES</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-400">
                      Coordenadas para WIN10K
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Abre estas tres casillas manualmente en tu juego de WIN10K y registra los resultados:
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-xl border border-cyan-500/40">
                {(nextSafeProbability * 100).toFixed(1)}% prob. uniforme
              </span>
            </div>

            {/* The 3 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {top3Details.map((rec) => (
                <div
                  key={rec.position}
                  className="p-3 rounded-xl bg-[#081524] border border-slate-700/80 hover:border-emerald-400/80 transition flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-[0_0_8px_#10b981]">
                          {rec.number}
                        </span>
                        <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider font-mono">
                          Selección #{rec.number}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold">
                        {rec.userStatus === 'CONFIRMED_SAFE' && (
                          <span className="bg-emerald-950 border border-emerald-400 text-emerald-300 px-1.5 py-0.5 rounded">
                            💎 Gema (+1)
                          </span>
                        )}
                        {rec.userStatus === 'CONFIRMED_MINE' && (
                          <span className="bg-red-950 border border-red-500 text-red-300 px-1.5 py-0.5 rounded">
                            💣 Mina
                          </span>
                        )}
                        {rec.userStatus === 'PENDING' && (
                          <span className="bg-amber-950 border border-amber-400 text-amber-300 px-1.5 py-0.5 rounded animate-pulse">
                            ⏳ Pendiente
                          </span>
                        )}
                        {rec.userStatus === 'UNSELECTED' && (
                          <span className="bg-blue-950 border border-blue-400 text-blue-300 px-1.5 py-0.5 rounded">
                            Por abrir
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 mt-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-mono text-slate-400">Coordenada:</span>
                        <span className="text-lg font-black text-cyan-300 font-mono">
                          {rec.coordinate}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-200 mt-0.5 font-bold flex items-center justify-between border-t border-slate-800/80 pt-1">
                        <span>Fila {rec.row}</span>
                        <span>Columna {rec.column}</span>
                      </div>
                      <p className="text-[10px] text-emerald-400 mt-1 font-medium">
                        📍 {rec.rowDescription} · {rec.colDescription}
                      </p>
                    </div>
                  </div>

                  {/* 1-click Result Action Buttons */}
                  <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onUserSelectionChange(rec.position, 'PENDING')}
                      className={`py-1 px-1 rounded-md text-[10px] font-bold border transition ${
                        rec.userStatus === 'PENDING'
                          ? 'bg-amber-500 text-black border-amber-300'
                          : 'bg-amber-950/60 hover:bg-amber-900 border-amber-500/40 text-amber-200'
                      }`}
                      title="Marcar como pendiente"
                    >
                      ⏳ Pend
                    </button>
                    <button
                      type="button"
                      onClick={() => onUserSelectionChange(rec.position, 'CONFIRMED_SAFE')}
                      className={`py-1 px-1 rounded-md text-[10px] font-bold border transition ${
                        rec.userStatus === 'CONFIRMED_SAFE'
                          ? 'bg-emerald-500 text-black border-emerald-300'
                          : 'bg-emerald-950/60 hover:bg-emerald-900 border-emerald-500/40 text-emerald-200'
                      }`}
                      title="Marcar como gema segura confirmada"
                    >
                      💎 Gema
                    </button>
                    <button
                      type="button"
                      onClick={() => onUserSelectionChange(rec.position, 'CONFIRMED_MINE')}
                      className={`py-1 px-1 rounded-md text-[10px] font-bold border transition ${
                        rec.userStatus === 'CONFIRMED_MINE'
                          ? 'bg-red-500 text-black border-red-300'
                          : 'bg-red-950/60 hover:bg-red-900 border-red-500/40 text-red-200'
                      }`}
                      title="Marcar como mina detonada"
                    >
                      💣 Mina
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mandatory Mathematical Honesty & Disclaimer Notice (Requirements 4, 5, 9, 10) */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 leading-relaxed space-y-1">
              <p>
                <strong>Transparencia Matemática WIN10K:</strong> Todas las casillas ocultas comparten la misma probabilidad matemática teórica en esta ronda: <strong>{(nextSafeProbability * 100).toFixed(1)}% segura</strong>. No existe ventaja estadística previa de una casilla sobre otra; las tres sugerencias corresponden a un orden de exploración estructurado.
              </p>
              <p className="text-slate-400">
                <strong>Aviso de Responsabilidad:</strong> MINES AI no afirma que estas tres posiciones sean ganadoras ni garantiza que estén libres de minas (generador Provably Fair HMAC-SHA256). Consulta y juega con moderación.
              </p>
            </div>
          </div>
        )}

        {/* 4. Action Buttons (All 4 Functional Requirements) */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            {/* Botón CERRAR */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 shadow-md flex items-center gap-1.5"
            >
              <span>✕ Cerrar</span>
            </button>

            {/* Botón VER TABLERO COMPLETO */}
            <button
              type="button"
              onClick={onViewFullBoards}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#131f38] hover:bg-[#1a2b4e] border border-cyan-500/40 text-cyan-200 transition active:scale-95 shadow-md flex items-center gap-1.5"
            >
              <span>🔍 Ver Tablero Completo</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón ACTUALIZAR CAPTURA */}
            <button
              type="button"
              onClick={onUpdateCapture}
              className="px-4 py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] transition active:scale-95 flex items-center gap-1.5 border border-blue-400/50"
            >
              <ScannerIcon3D className="w-4 h-4" />
              <span>Actualizar Captura (Modo 2)</span>
            </button>

            {/* Botón NUEVA PARTIDA */}
            <button
              type="button"
              onClick={onNewGame}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800/90 hover:bg-red-950 hover:text-red-200 hover:border-red-500/50 text-slate-300 border border-slate-700 transition active:scale-95 shadow-md flex items-center gap-1.5"
            >
              <span>🔄 Nueva Partida</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
