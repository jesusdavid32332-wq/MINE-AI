import React, { useState } from 'react';
import { Board5x5 } from './Board5x5';
import { GameRecord, CellData, CellState } from '../types';
import { deleteGameRecord, updateGameRecord } from '../services/firestoreService';
import {
  History,
  Trash2,
  Edit3,
  Eye,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  Image as ImageIcon
} from 'lucide-react';

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
    setSelectedGame(game);
    setEditingCells(game.cells || []);
    setIsEditing(false);
    setActionError(null);
  };

  const handleDelete = async (gameId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta partida? Esta acción no se puede deshacer y actualizará las estadísticas en tiempo real.')) {
      return;
    }
    setIsDeletingId(gameId);
    setActionError(null);
    try {
      await deleteGameRecord(gameId);
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
      prev.map((c) => (c.position === position ? { ...c, state: newState, confirmedByUser: true } : c))
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
      setActionError(err instanceof Error ? err.message : 'Error al actualizar los resultados.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-950/60 border border-blue-500/40 rounded-xl text-blue-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Historial Real de Partidas
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {games.length} {games.length === 1 ? 'partida' : 'partidas'}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Consulta, filtra, audita y edita tus registros guardados en Firestore.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-transparent text-white focus:outline-none"
              >
                <option value="all" className="bg-slate-900">Todos los estados</option>
                <option value="win" className="bg-slate-900">Victorias</option>
                <option value="lost" className="bg-slate-900">Derrotas</option>
                <option value="ongoing" className="bg-slate-900">En curso</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs"
              />
              {filterDate && (
                <button
                  type="button"
                  onClick={() => setFilterDate('')}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Games List or Empty State */}
      {games.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
            <History className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-300">Base de datos de partidas vacía</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            La aplicación ha comenzado con la base de datos limpia sin registros sintéticos ni ficticios. Realiza un análisis en la pestaña &quot;Analizador&quot; y pulsa &quot;Guardar Partida&quot; para registrarla.
          </p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400 text-xs">
          No se encontraron partidas con los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGames.map((game) => {
            const isWon = game.gameStatus === 'win';
            const isLost = game.gameStatus === 'lost';
            const dateStr = new Date(game.createdAt || game.gameDate).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={game.gameId}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                        isWon
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : isLost
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {isWon ? <CheckCircle2 className="w-3 h-3" /> : isLost ? <XCircle className="w-3 h-3" /> : null}
                      {isWon ? 'Victoria' : isLost ? 'Derrota' : 'En Curso'}
                    </span>

                    <span className="text-[11px] font-mono text-slate-500">{dateStr}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs mb-3 pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-slate-500 block">Minas WIN10K</span>
                      <span className="font-bold text-white font-mono">{game.mineCount} minas</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Reveladas</span>
                      <span className="font-bold text-blue-400 font-mono">
                        {game.revealedCount || game.cells?.filter((c) => c.state !== 'OCULTA').length || 0} / 25
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Plataforma</span>
                      <span className="text-slate-300 font-medium">{game.platform || 'WIN10K'}</span>
                    </div>
                  </div>

                  {/* Miniature 5x5 board preview */}
                  <div className="flex justify-center my-3">
                    <Board5x5 cells={game.cells || []} readOnly={true} size="sm" />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(game)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    Inspeccionar
                  </button>

                  <button
                    type="button"
                    disabled={isDeletingId === game.gameId}
                    onClick={() => handleDelete(game.gameId)}
                    className="p-2 rounded-xl bg-slate-800/60 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/40 transition disabled:opacity-50"
                    title="Eliminar partida"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Game Detail Modal with Inspection, Screenshot & Cell Editing */}
      {selectedGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Auditoría de Partida
                  <span className="text-xs font-mono text-slate-400">{selectedGame.gameId}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {new Date(selectedGame.createdAt || selectedGame.gameDate).toLocaleString('es-ES')} ·{' '}
                  {selectedGame.platform} · {selectedGame.mineCount} Minas
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGame(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              {/* Board and edit toggle */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-between w-full mb-3">
                  <span className="text-xs font-semibold text-slate-300">
                    {isEditing ? 'Modo Edición: Pulsa cualquier casilla para corregirla' : 'Tablero 5x5 Registrado:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className={`text-xs px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                      isEditing
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isEditing ? 'Cancelar edición' : 'Editar casillas'}
                  </button>
                </div>

                <Board5x5
                  cells={editingCells}
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
                    className="mt-4 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isUpdating ? 'Guardando...' : 'Guardar Correcciones en Firestore'}
                  </button>
                )}
              </div>

              {/* Original Screenshot Preview if saved in Storage */}
              {selectedGame.screenshotUrl ? (
                <div className="pt-3 border-t border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    Captura Archivada en Firebase Storage
                  </span>
                  <div className="max-h-48 overflow-hidden rounded-xl border border-slate-800 bg-black/40">
                    <img
                      src={selectedGame.screenshotUrl}
                      alt="Captura original"
                      className="w-full h-full object-contain mx-auto"
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-300 font-medium block mb-0.5">Modo sin costos de almacenamiento:</span>
                  La captura fue analizada temporalmente en memoria por Gemini Vision. Todos los metadatos de la ronda y las 25 casillas verificadas están respaldadas permanentemente en Cloud Firestore.
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => handleDelete(selectedGame.gameId)}
                className="px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Partida
              </button>

              <button
                type="button"
                onClick={() => setSelectedGame(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
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
