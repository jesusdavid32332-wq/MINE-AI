import React, { useState } from 'react';
import { Board5x5 } from './Board5x5';
import { GameRecord, CellData, CellState } from '../types';
import { deleteGameRecord, updateGameRecord } from '../services/firestoreService';
import {
  HistoryIcon3D,
  Gem3D,
  Mine3D,
  Chest3D,
  TileClosed3D,
  ValidationIcon3D,
  TrophyGold3D,
} from './Icons3D';
import { soundFX } from '../utils/soundEffects';

interface HistoryViewProps {
  games: GameRecord[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ games }) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'win' | 'lost' | 'ongoing'>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingCells, setEditingCells] = useState<CellData[]>([]);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter games list
  const filteredGames = games.filter((g) => {
    if (filterStatus !== 'all' && g.gameStatus !== filterStatus) return false;
    if (filterDate) {
      const gDate = (g.createdAt || g.gameDate || '').substring(0, 10);
      if (gDate !== filterDate) return false;
    }
    return true;
  });

  const handleOpenDetail = (game: GameRecord) => {
    soundFX.playTileClick();
    setSelectedGame(game);
    setEditingCells(game.cells || []);
    setIsEditing(false);
    setActionError(null);
  };

  const handleDelete = async (gameId: string) => {
    if (
      !window.confirm(
        '¿Deseas eliminar permanentemente esta partida de tu base de datos Firestore?'
      )
    ) {
      return;
    }
    setIsDeletingId(gameId);
    setActionError(null);
    try {
      await deleteGameRecord(gameId);
      soundFX.playTileClick();
      if (selectedGame?.gameId === gameId) {
        setSelectedGame(null);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error al eliminar la partida.');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleCellStateEdit = (position: number, newState: CellState) => {
    setEditingCells((prev) =>
      prev.map((c) =>
        c.position === position ? { ...c, state: newState, confirmedByUser: true } : c
      )
    );
  };

  const handleSaveEdits = async () => {
    if (!selectedGame) return;
    setIsUpdating(true);
    setActionError(null);
    try {
      const safeCount = editingCells.filter((c) => c.state === 'SEGURA').length;
      const mineCount = editingCells.filter((c) => c.state === 'MINA').length;
      const chestCount = editingCells.filter((c) => c.state === 'COFRE').length;
      const revealedTotal = safeCount + mineCount + chestCount;

      await updateGameRecord(
        selectedGame.gameId,
        {
          revealedCount: revealedTotal,
          safeCount,
          mineCountRevealed: mineCount,
          chestCount,
          cells: editingCells,
        },
        editingCells
      );

      soundFX.playGemReveal();
      setSelectedGame({
        ...selectedGame,
        revealedCount: revealedTotal,
        safeCount,
        mineCountRevealed: mineCount,
        chestCount,
        cells: editingCells,
      });
      setIsEditing(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error al actualizar la partida.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#10172e] via-[#0b1020] to-[#16122d] border border-cyan-500/30 p-5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-950/70 border border-cyan-500/40 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0">
              <HistoryIcon3D className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  Historial de Partidas Reales
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 tabular-nums">
                  {games.length} {games.length === 1 ? 'partida' : 'partidas'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed">
                Registro inmutable sincronizado en Firestore. Consulta, audita o ajusta cualquier casilla registrada.
              </p>
            </div>
          </div>

          {/* Quick Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-[#0a0f1e] p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold self-end sm:self-center shrink-0">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'win', label: 'Victorias' },
              { id: 'lost', label: 'Derrotas' },
              { id: 'ongoing', label: 'En curso' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  soundFX.playTileClick();
                  setFilterStatus(f.id as any);
                }}
                className={`px-3 py-1.5 rounded-xl transition ${
                  filterStatus === f.id
                    ? 'bg-cyan-600 text-white font-bold shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real Statistics Summary Strip (Derived Exclusively from Saved Firestore Games) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#0b1020]/90 border border-slate-800 text-center">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Partidas Totales</span>
          <span className="text-xl font-black text-white font-mono tabular-nums">{games.length}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0b1020]/90 border border-emerald-500/30 text-center">
          <span className="text-[10px] font-mono text-emerald-400 uppercase block">Completadas (3/3)</span>
          <span className="text-xl font-black text-emerald-300 font-mono tabular-nums">
            {games.filter((g) => g.gameStatus === 'win').length}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0b1020]/90 border border-rose-500/30 text-center">
          <span className="text-[10px] font-mono text-rose-400 uppercase block">Perdidas (Mina)</span>
          <span className="text-xl font-black text-rose-300 font-mono tabular-nums">
            {games.filter((g) => g.gameStatus === 'lost').length}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0b1020]/90 border border-cyan-500/30 text-center">
          <span className="text-[10px] font-mono text-cyan-400 uppercase block">Gemas Seguras</span>
          <span className="text-xl font-black text-cyan-300 font-mono tabular-nums">
            {games.reduce((acc, g) => acc + (g.safeCount || 0), 0)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0b1020]/90 border border-red-500/30 text-center">
          <span className="text-[10px] font-mono text-red-400 uppercase block">Minas Halladas</span>
          <span className="text-xl font-black text-red-300 font-mono tabular-nums">
            {games.reduce((acc, g) => acc + (g.mineCountRevealed || 0), 0)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0b1020]/90 border border-violet-500/30 text-center">
          <span className="text-[10px] font-mono text-violet-400 uppercase block">Tasa de Victoria</span>
          <span className="text-xl font-black text-violet-300 font-mono tabular-nums">
            {games.length > 0
              ? `${((games.filter((g) => g.gameStatus === 'win').length / games.length) * 100).toFixed(0)}%`
              : '0%'}
          </span>
        </div>
      </div>

      {/* Main Grid: Game List + Game Detail Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Game Records List (7 cols) */}
        <div className="lg:col-span-7 bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">
              Lista de Rondas ({filteredGames.length})
            </h3>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-[#11192e] border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none font-mono"
            />
          </div>

          {filteredGames.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <TileClosed3D className="w-12 h-12 mx-auto opacity-40" />
              <p className="text-sm font-semibold text-slate-300">
                No hay partidas que coincidan con los filtros seleccionados
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGames.map((game) => {
                const isSelected = selectedGame?.gameId === game.gameId;
                return (
                  <div
                    key={game.gameId}
                    onClick={() => handleOpenDetail(game)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-950/60 via-[#131d36] to-[#0c1326] border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                        : 'bg-[#10172e]/70 border-slate-800/80 hover:border-slate-700 hover:bg-[#131d38]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Board5x5 cells={game.cells || []} readOnly={true} size="sm" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-lg font-mono ${
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
                          {game.gameDate ? new Date(game.gameDate).toLocaleString() : 'Fecha N/A'}
                        </p>
                        <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-0.5">
                          <span className="text-emerald-400">{game.safeCount} Gemas</span>
                          <span>·</span>
                          <span className="text-rose-400">{game.mineCountRevealed} Minas</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(game.gameId);
                        }}
                        disabled={isDeletingId === game.gameId}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 transition"
                      >
                        {isDeletingId === game.gameId ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Game Detail Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {selectedGame ? (
            <div className="bg-[#0b1020]/90 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5 flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-black text-white">Detalle de Partida</h3>
                  <span className="text-xs font-mono text-slate-400 truncate block max-w-[200px]">
                    ID: {selectedGame.gameId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    isEditing
                      ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {isEditing ? 'Cancelar Edición' : 'Editar Casillas'}
                </button>
              </div>

              {/* The 5x5 Board in Detail */}
              <Board5x5
                cells={isEditing ? editingCells : selectedGame.cells || []}
                onCellStateChange={isEditing ? handleCellStateEdit : undefined}
                readOnly={!isEditing}
                showCoordinates={true}
                size="md"
              />

              {isEditing && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleSaveEdits}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg"
                >
                  {isUpdating ? 'Guardando cambios...' : 'Guardar Modificaciones'}
                </button>
              )}

              {actionError && (
                <div className="w-full p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs">
                  {actionError}
                </div>
              )}

              <div className="w-full p-4 rounded-2xl bg-[#10172e] border border-slate-800 text-xs space-y-2 font-mono text-slate-300">
                <div className="flex justify-between">
                  <span>Plataforma:</span>
                  <span className="font-bold text-white">{selectedGame.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span>Minas Configuradas:</span>
                  <span className="font-bold text-cyan-400">{selectedGame.mineCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Resultado:</span>
                  <span className="font-bold text-emerald-400 uppercase">{selectedGame.gameStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span>Casillas Reveladas:</span>
                  <span className="font-bold text-white">{selectedGame.revealedCount} / 25</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-3">
              <HistoryIcon3D className="w-12 h-12 mx-auto opacity-50" />
              <p className="text-sm font-semibold text-slate-300">
                Selecciona una partida del listado
              </p>
              <p className="text-xs text-slate-500">
                Podrás inspeccionar la cuadrícula 5×5 completa y realizar correcciones manuales.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
