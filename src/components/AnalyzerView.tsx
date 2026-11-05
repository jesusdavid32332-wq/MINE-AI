import React, { useState, useRef } from 'react';
import { Board5x5 } from './Board5x5';
import { CellData, CellState, GameRecord } from '../types';
import { saveGameRecord, recordTrainingSample } from '../services/firestoreService';
import { auth, signInWithPopup, googleProvider } from '../firebase';
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  HelpCircle,
  Eye,
  ShieldCheck,
  Smartphone,
  Globe,
  LogIn
} from 'lucide-react';

interface AnalyzerViewProps {
  onGameSaved?: (gameId: string) => void;
  initialMinesCount?: number;
}

export const AnalyzerView: React.FC<AnalyzerViewProps> = ({
  onGameSaved,
  initialMinesCount = 3,
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mineCount, setMineCount] = useState<number>(initialMinesCount);
  const [platform, setPlatform] = useState<string>('WIN10K Mobile');
  const [gameStatus, setGameStatus] = useState<'ongoing' | 'win' | 'lost'>('ongoing');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);

  // Vision detection results
  const [qualityAssessment, setQualityAssessment] = useState<string>('');
  const [qualityNotes, setQualityNotes] = useState<string>('');
  const [overallConfidence, setOverallConfidence] = useState<number | null>(null);

  // Active 25 cells state for review
  const [cells, setCells] = useState<CellData[]>(() =>
    Array.from({ length: 25 }, (_, i) => ({
      position: i,
      row: Math.floor(i / 5),
      column: i % 5,
      state: 'OCULTA',
      confidence: 1.0,
      confirmedByUser: false,
    }))
  );

  // Store original AI predictions to track corrections in training samples
  const originalAiPredictionsRef = useRef<{ [pos: number]: { state: CellState; confidence: number } }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedImage(file);
    }
  };

  const processSelectedImage = (file: File) => {
    setImageFile(file);
    setSaveSuccess(false);
    setAnalysisError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      processSelectedImage(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Run Gemini Vision Analysis via server API
  const handleAnalyze = async () => {
    if (!imagePreview) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: imageFile?.type || 'image/png',
          mineCount,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error en el análisis (${response.status})`);
      }

      const result = await response.json();

      setQualityAssessment(result.quality_assessment || 'CLEAR');
      setQualityNotes(result.quality_notes || 'Análisis completado');
      setOverallConfidence(result.overall_confidence);

      if (result.detected_mine_count && result.detected_mine_count > 0 && result.detected_mine_count <= 24) {
        setMineCount(result.detected_mine_count);
      }

      if (result.detected_game_status && ['ongoing', 'win', 'lost'].includes(result.detected_game_status)) {
        setGameStatus(result.detected_game_status);
      }

      // Map cells and record AI initial predictions
      const predictionsMap: { [pos: number]: { state: CellState; confidence: number } } = {};
      const newCells: CellData[] = (result.cells || []).map((c: any) => {
        predictionsMap[c.position] = { state: c.state, confidence: c.confidence };
        return {
          position: c.position,
          row: c.row,
          column: c.column,
          state: c.state,
          confidence: c.confidence,
          confirmedByUser: false,
          visualDescription: c.visual_description,
          aiPredictedState: c.state,
        };
      });

      originalAiPredictionsRef.current = predictionsMap;
      setCells(newCells);
    } catch (err: unknown) {
      console.error(err);
      setAnalysisError(
        err instanceof Error ? err.message : 'No se pudo conectar con el servicio de análisis de visión.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // User manually edits a cell state
  const handleCellStateChange = (position: number, newState: CellState) => {
    setCells((prev) =>
      prev.map((c) =>
        c.position === position
          ? {
              ...c,
              state: newState,
              confirmedByUser: true,
            }
          : c
      )
    );
  };

  // Save reviewed game to real Firestore
  const handleSaveGame = async () => {
    setIsSaving(true);
    setAnalysisError(null);

    try {
      let currentUser = auth.currentUser;
      if (!currentUser) {
        const cred = await signInWithPopup(auth, googleProvider);
        currentUser = cred.user;
      }

      if (!currentUser) {
        throw new Error('Por favor inicia sesión con Google para guardar partidas en tu base de datos.');
      }

      // Prevent duplicate saving if already saved
      if (saveSuccess) {
        return;
      }

      const revealedSafe = cells.filter((c) => c.state === 'SEGURA').length;
      const revealedMines = cells.filter((c) => c.state === 'MINA').length;
      const revealedChests = cells.filter((c) => c.state === 'COFRE').length;
      const revealedTotal = revealedSafe + revealedMines + revealedChests;

      const finalStatus =
        revealedMines > 0 ? 'lost' : revealedTotal >= 25 - mineCount ? 'win' : gameStatus;

      const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Zero-cost mode: images processed purely in-memory; no storage buckets or base64 in Firestore
      setStorageNotice(
        'Partida y 25 casillas guardadas con éxito en Cloud Firestore. Modo sin costos activo: la imagen se procesó en memoria sin generar cargos de almacenamiento.'
      );

      const gamePayload: Omit<GameRecord, 'userId' | 'createdAt'> = {
        gameId,
        platform,
        gameDate: new Date().toISOString(),
        boardSize: 5,
        mineCount,
        gameStatus: finalStatus,
        screenshotUrl: '',
        revealedCount: revealedTotal,
        safeCount: revealedSafe,
        mineCountRevealed: revealedMines,
        chestCount: revealedChests,
        cells,
      };

      const savedId = await saveGameRecord(gamePayload, cells);

      // Record vision validation training samples if this game was scanned by AI
      if (Object.keys(originalAiPredictionsRef.current).length > 0) {
        for (const cell of cells) {
          const aiPred = originalAiPredictionsRef.current[cell.position];
          if (aiPred) {
            const isMatch = aiPred.state === cell.state;
            await recordTrainingSample({
              confirmedClass: cell.state,
              modelPrediction: aiPred.state,
              confidence: aiPred.confidence,
              isCorrect: isMatch,
              visualFeatures: cell.visualDescription || 'Casilla 5x5',
            }).catch(() => {});
          }
        }
      }

      setSaveSuccess(true);
      if (onGameSaved && savedId) {
        onGameSaved(savedId);
      }
    } catch (err: unknown) {
      console.error(err);
      setAnalysisError(
        err instanceof Error ? err.message : 'Error al guardar la partida en la base de datos.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Reset current board
  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setOverallConfidence(null);
    setQualityAssessment('');
    setQualityNotes('');
    setSaveSuccess(false);
    setStorageNotice(null);
    setAnalysisError(null);
    setCells(
      Array.from({ length: 25 }, (_, i) => ({
        position: i,
        row: Math.floor(i / 5),
        column: i % 5,
        state: 'OCULTA',
        confidence: 1.0,
        confirmedByUser: false,
      }))
    );
    originalAiPredictionsRef.current = {};
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner with Strict Transparency */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-950/60 border border-blue-500/30 rounded-xl text-blue-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Analizador de Partidas Reales WIN10K
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Gemini 3.8 Flash Vision
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Sube la captura de tu partida en WIN10K o configura el tablero manualmente. Las casillas no reveladas permanecen estrictamente ocultas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar
          </button>
        </div>
      </div>

      {/* Main Grid: Upload & Configuration + 5x5 Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input, Upload & Game Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Screenshot Upload Dropzone */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" />
              1. Captura de pantalla de WIN10K
            </h3>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200
                ${imagePreview ? 'border-blue-500/50 bg-blue-950/10' : 'border-slate-700/80 hover:border-slate-500 bg-slate-950/40'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {imagePreview ? (
                <div className="space-y-3">
                  <div className="relative max-h-56 overflow-hidden rounded-lg border border-slate-700 mx-auto">
                    <img
                      src={imagePreview}
                      alt="Captura WIN10K"
                      className="w-full h-full object-contain mx-auto"
                    />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-blue-950/60 backdrop-blur-xs flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                        <span className="text-xs font-medium text-blue-200 animate-pulse">
                          Escaneando cuadrícula 5x5...
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Haz clic o arrastra para cambiar la imagen
                  </p>
                </div>
              ) : (
                <div className="py-8 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-blue-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-300">
                    Arrastra tu captura aquí o pulsa para seleccionar
                  </p>
                  <p className="text-xs text-slate-500">
                    Admite capturas desde iPhone, Android o navegador de WIN10K
                  </p>
                </div>
              )}
            </div>

            {/* Action Analyze button */}
            {imagePreview && (
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={handleAnalyze}
                className="mt-4 w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analizando con Visión IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Reconocer Tablero con Gemini
                  </>
                )}
              </button>
            )}

            {/* Quality assessment report if available */}
            {qualityAssessment && (
              <div
                className={`mt-4 p-3 rounded-xl border text-xs ${
                  qualityAssessment === 'CLEAR'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}
              >
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    {qualityAssessment === 'CLEAR' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    Calidad visual: {qualityAssessment}
                  </span>
                  {overallConfidence !== null && (
                    <span className="font-mono">
                      Confianza: {(overallConfidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="opacity-90">{qualityNotes}</p>
              </div>
            )}
          </div>

          {/* Game Parameters */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              2. Parámetros de la Partida
            </h3>

            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-400 font-medium">Número de Minas configuradas en WIN10K</span>
                <span className="font-mono font-bold text-blue-400 text-sm">{mineCount} minas</span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                value={mineCount}
                onChange={(e) => setMineCount(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>1 mina</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20</span>
                <span>24 minas</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Plataforma</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="WIN10K Mobile">WIN10K Móvil (iPhone/Android)</option>
                  <option value="WIN10K Web">WIN10K Web (Navegador PC)</option>
                  <option value="WIN10K iOS">WIN10K iOS App / Safari</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Estado de Partida</label>
                <select
                  value={gameStatus}
                  onChange={(e) => setGameStatus(e.target.value as any)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ongoing">En curso (abriendo)</option>
                  <option value="win">Victoria (Retirada/Cashout)</option>
                  <option value="lost">Derrota (Detonada)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 5x5 Interactive Board & Manual Verification (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Cuadrícula 5 × 5 de la Partida
                </h3>
                <p className="text-xs text-slate-400">
                  Pulsa cualquier casilla para verificar o corregir su estado real antes de guardar.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono text-slate-400">
                  {cells.filter((c) => c.state !== 'OCULTA').length} / 25 reveladas
                </span>
              </div>
            </div>

            {/* The 5x5 Board Component */}
            <Board5x5
              cells={cells}
              onCellStateChange={handleCellStateChange}
              showCoordinates={true}
              showConfidence={true}
              size="lg"
            />

            {/* Visual Legend */}
            <div className="w-full mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-300">Segura</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500" />
                <span className="text-slate-300">Mina</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-slate-300">Cofre</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-orange-500" />
                <span className="text-slate-300">Desconocida</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-700" />
                <span className="text-slate-300">Oculta (Sin abrir)</span>
              </div>
            </div>

            {/* Error banner if any */}
            {analysisError && (
              <div className="w-full mt-4 p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{analysisError}</span>
              </div>
            )}

            {/* Success banner */}
            {saveSuccess && (
              <div className="w-full mt-4 p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Partida y 25 casillas guardadas con éxito en Firestore.
                </span>
                <span className="font-semibold text-emerald-200">Sincronizado</span>
              </div>
            )}

            {/* Storage notice banner */}
            {storageNotice && (
              <div className="w-full mt-2.5 p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{storageNotice}</span>
              </div>
            )}

            {/* Save Action Button */}
            <div className="w-full mt-5">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveGame}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white shadow-xl shadow-blue-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando en Firebase...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Partida Verificada en Firestore
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-500 text-center mt-2">
                Guarda los resultados confirmados para alimentar el historial real y los mapas de calor empíricos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
