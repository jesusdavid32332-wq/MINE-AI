import React, { useState, useRef } from 'react';
import {
  ScannerIcon3D,
  StarCoin3D,
  Win10kBomb3D,
  Win10kChest3D,
  Win10kClosedTile,
  TileUnknown3D,
  Gem3D,
  Mine3D,
  Chest3D,
  TrophyGold3D,
} from './Icons3D';
import { soundFX } from '../utils/soundEffects';
import { optimizeScreenshotForVision } from '../utils/imageOptimizer';
import { saveGameRecord } from '../services/firestoreService';
import { auth } from '../firebase';
import { GameRecord } from '../types';

interface CellDetection {
  position: number;
  row: number;
  column: number;
  state: 'OCULTA' | 'SEGURA' | 'MINA' | 'COFRE' | 'DESCONOCIDA';
  confidence: number;
  visual_description: string;
}

interface ScanAnalysisResult {
  quality_assessment: 'CLEAR' | 'BLURRY' | 'CROPPED' | 'NOT_MINES_GAME';
  quality_notes: string;
  overall_confidence: number;
  detected_mine_count: number | null;
  detected_game_status: 'ready' | 'ongoing' | 'win' | 'lost' | 'unknown';
  bet_amount_detected?: string | null;
  multiplier_detected?: string | null;
  balance_detected?: string | null;
  pattern_notes?: string;
  revealed_count: number;
  safe_count: number;
  mine_count: number;
  chest_count: number;
  hidden_count: number;
  cells: CellDetection[];
  model_used?: string;
  latency_ms?: number;
}

interface AnalyzerViewProps {
  onGameSaved?: (gameId: string) => void;
  initialMinesCount?: number;
  games?: GameRecord[];
  onLoginClick?: () => void;
  onOpenGameWithBoard?: (detectedCells: { [pos: number]: string }, detectedMines: Set<number>) => void;
}

export const AnalyzerView: React.FC<AnalyzerViewProps> = ({
  onGameSaved,
  onLoginClick,
}) => {
  // Photograph selection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [optimizedBase64, setOptimizedBase64] = useState<string | null>(null);
  const [optimizedMime, setOptimizedMime] = useState<string>('image/jpeg');
  const [fileDetails, setFileDetails] = useState<{ name: string; sizeKb: number; width: number; height: number } | null>(null);

  // Scanning execution state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressLabel, setProgressLabel] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Gemini Analysis Result
  const [scanResult, setScanResult] = useState<ScanAnalysisResult | null>(null);

  // Automated Sequential Slow Reveal State (Abriendo casillas una por una lentamente tras escanear)
  const [displayedCellsMap, setDisplayedCellsMap] = useState<{ [pos: number]: CellDetection }>({});
  const [isOpeningSequentially, setIsOpeningSequentially] = useState<boolean>(false);
  const [currentlyOpeningPos, setCurrentlyOpeningPos] = useState<number | null>(null);
  const [openingProgress, setOpeningProgress] = useState<{ current: number; total: number; currentCoord: string } | null>(null);
  const abortRevealRef = useRef<boolean>(false);

  // Saving state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Process chosen photograph
  const processImageFile = async (file: File) => {
    abortRevealRef.current = true;
    setSelectedFile(file);
    setError(null);
    setScanResult(null);
    setDisplayedCellsMap({});
    setIsOpeningSequentially(false);
    setCurrentlyOpeningPos(null);
    setOpeningProgress(null);
    setSaveSuccess(false);
    soundFX.playTileClick();

    try {
      const opt = await optimizeScreenshotForVision(file, 1200, 0.88);
      setImagePreview(opt.dataUrl);
      setOptimizedBase64(opt.base64);
      setOptimizedMime(opt.mimeType);
      setFileDetails({
        name: file.name,
        sizeKb: opt.optimizedSizeKb,
        width: opt.width,
        height: opt.height,
      });
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        const str = reader.result as string;
        setImagePreview(str);
        setOptimizedBase64(str.replace(/^data:[^;]+;base64,/, ''));
        setOptimizedMime(file.type || 'image/png');
        setFileDetails({
          name: file.name,
          sizeKb: Math.round(file.size / 1024),
          width: 0,
          height: 0,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Quick preset test loaders for authentic WIN10K screenshots
  const handleLoadSample = async (samplePath: string, fileName: string) => {
    try {
      soundFX.playTileClick();
      setError(null);
      setScanResult(null);
      setSaveSuccess(false);
      const res = await fetch(samplePath);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      await processImageFile(file);
    } catch (err) {
      console.warn('Error cargando muestra de prueba:', err);
    }
  };

  // Reset scanner to cleanly analyze another photograph
  const handleReset = () => {
    abortRevealRef.current = true;
    soundFX.playTileClick();
    setSelectedFile(null);
    setImagePreview(null);
    setOptimizedBase64(null);
    setFileDetails(null);
    setScanResult(null);
    setDisplayedCellsMap({});
    setIsOpeningSequentially(false);
    setCurrentlyOpeningPos(null);
    setOpeningProgress(null);
    setError(null);
    setSaveSuccess(false);
    setProgressPercent(0);
    setProgressLabel('');
  };

  // Automated Sequential Slow Reveal Animation
  const startSequentialReveal = async (cells: CellDetection[]) => {
    abortRevealRef.current = false;
    const revealedCells = cells.filter((c) => c.state && c.state !== 'OCULTA');

    // Initialize all cells as closed (OCULTA)
    const initialMap: { [pos: number]: CellDetection } = {};
    cells.forEach((c) => {
      initialMap[c.position] = { ...c, state: 'OCULTA' };
    });
    setDisplayedCellsMap(initialMap);

    if (revealedCells.length === 0) {
      setIsOpeningSequentially(false);
      setCurrentlyOpeningPos(null);
      setOpeningProgress(null);
      return;
    }

    setIsOpeningSequentially(true);
    const workingMap = { ...initialMap };

    for (let i = 0; i < revealedCells.length; i++) {
      if (abortRevealRef.current) break;

      const cell = revealedCells[i];
      setCurrentlyOpeningPos(cell.position);
      setOpeningProgress({
        current: i + 1,
        total: revealedCells.length,
        currentCoord: `F${cell.row + 1}-C${cell.column + 1}`,
      });

      // Suspense delay before flipping tile (550ms)
      await new Promise((resolve) => setTimeout(resolve, 550));
      if (abortRevealRef.current) break;

      // Play audio effect based on revealed element
      if (cell.state === 'SEGURA') {
        soundFX.playGemReveal();
      } else if (cell.state === 'MINA') {
        soundFX.playMineDetonation();
      } else if (cell.state === 'COFRE') {
        soundFX.playChestFanfare();
      } else {
        soundFX.playTileClick();
      }

      workingMap[cell.position] = cell;
      setDisplayedCellsMap({ ...workingMap });

      // Brief moment to admire the uncovered gem or bomb
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    setCurrentlyOpeningPos(null);
    setIsOpeningSequentially(false);
    setOpeningProgress(null);

    if (!abortRevealRef.current) {
      soundFX.playChestFanfare();
    }
  };

  // Skip animation to instantly see all revealed cells
  const handleSkipAnimation = (allCells: CellDetection[]) => {
    abortRevealRef.current = true;
    const fullMap: { [pos: number]: CellDetection } = {};
    allCells.forEach((c) => {
      fullMap[c.position] = c;
    });
    setDisplayedCellsMap(fullMap);
    setCurrentlyOpeningPos(null);
    setIsOpeningSequentially(false);
    setOpeningProgress(null);
    soundFX.playChestFanfare();
  };

  // Trigger Gemini Vision Analysis
  const handleStartScan = async () => {
    if (!imagePreview && !optimizedBase64) {
      setError('Por favor selecciona o sube una fotografía antes de escanear.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setScanResult(null);
    setDisplayedCellsMap({});
    setIsOpeningSequentially(false);
    setCurrentlyOpeningPos(null);
    setOpeningProgress(null);
    setSaveSuccess(false);
    setProgressPercent(15);
    setProgressLabel('Enviando fotografía al motor Gemini Visión...');
    soundFX.playScanSweep();

    // Smooth real-time progress steps while request is processed
    const progressTimer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev < 40) {
          setProgressLabel('Aislando cuadrícula y analizando símbolos...');
          return prev + 15;
        }
        if (prev < 80) {
          setProgressLabel('Identificando coordenadas F1-C1 a F5-C5...');
          return prev + 12;
        }
        if (prev < 92) {
          setProgressLabel('Verificando multiplicadores y estado de ronda...');
          return prev + 4;
        }
        return prev;
      });
    }, 400);

    try {
      const payloadBase64 = optimizedBase64 || imagePreview?.replace(/^data:[^;]+;base64,/, '');

      const response = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: payloadBase64,
          mimeType: optimizedMime || selectedFile?.type || 'image/jpeg',
          mineCount: 3,
        }),
      });

      clearInterval(progressTimer);
      setProgressPercent(100);
      setProgressLabel('¡Investigación con IA completada! Preparando apertura...');

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error del servidor (${response.status})`);
      }

      const data: ScanAnalysisResult = await response.json();

      // Check quality assessment
      if (data.quality_assessment === 'NOT_MINES_GAME') {
        setError(
          `La imagen no corresponde a una partida de Mines de WIN10K. Por favor sube una captura de pantalla del juego.`
        );
        setIsAnalyzing(false);
        return;
      }

      if (data.quality_assessment === 'BLURRY' || data.quality_assessment === 'CROPPED') {
        setError(
          `La captura presenta problemas de visibilidad (${data.quality_assessment}). Diagnóstico: ${data.quality_notes || 'Intenta tomar una captura más clara y completa'}.`
        );
      }

      setScanResult(data);

      // Start automatic sequential slow reveal of all detected cells!
      startSequentialReveal(data.cells);
    } catch (err: any) {
      clearInterval(progressTimer);
      console.error('Scan error:', err);
      setError(
        err?.message || 'No se pudo conectar con el servicio de análisis de Gemini. Verifica tu conexión.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save reviewed game record to Firestore
  const handleSaveToFirestore = async () => {
    if (!scanResult) return;
    setIsSaving(true);
    setError(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        if (onLoginClick) onLoginClick();
        setError('Inicia sesión con Google para guardar la partida en tu historial en la nube.');
        setIsSaving(false);
        return;
      }

      const revealedTotal = scanResult.safe_count + scanResult.mine_count + scanResult.chest_count;
      const gameId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const cellDataFormatted = scanResult.cells.map((c) => ({
        position: c.position,
        coordinate: `F${c.row + 1}-C${c.column + 1}`,
        row: c.row,
        column: c.column,
        state: c.state,
        confidence: c.confidence,
        confirmedByUser: true,
        visualDescription: c.visual_description,
      }));

      const payload: Omit<GameRecord, 'userId' | 'createdAt'> = {
        gameId,
        platform: 'WIN10K Mobile (Gemini Scan)',
        gameDate: new Date().toISOString(),
        boardSize: 5,
        mineCount: scanResult.detected_mine_count || 3,
        gameStatus: scanResult.detected_game_status === 'ready' ? 'ongoing' : (scanResult.detected_game_status as any),
        screenshotUrl: '',
        revealedCount: revealedTotal,
        safeCount: scanResult.safe_count,
        mineCountRevealed: scanResult.mine_count,
        chestCount: scanResult.chest_count,
        cells: cellDataFormatted,
      };

      const savedId = await saveGameRecord(payload, cellDataFormatted);
      setSaveSuccess(true);
      soundFX.playChestFanfare();
      if (onGameSaved && savedId) onGameSaved(savedId);
    } catch (err: any) {
      console.warn('Error guardando partida:', err);
      setError(err?.message || 'Error al registrar la partida en Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  // Dynamic live count calculations during slow reveal
  const liveSafeCount = Object.values(displayedCellsMap).filter((c) => c.state === 'SEGURA').length;
  const liveMineCount = Object.values(displayedCellsMap).filter((c) => c.state === 'MINA').length;
  const liveChestCount = Object.values(displayedCellsMap).filter((c) => c.state === 'COFRE').length;
  const liveHiddenCount = 25 - (liveSafeCount + liveMineCount + liveChestCount);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Header del Escáner Inteligente */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#09152b] via-[#081024] to-[#120a26] border border-cyan-500/30 p-5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.85)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)] shrink-0">
              <ScannerIcon3D className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  Escáner Inteligente Gemini
                </h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/50">
                  Apertura Secuencial Automática
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Sube 1 sola fotografía. Gemini investigará minuciosamente el tablero y abrirá automáticamente las casillas una por una con suspenso.
              </p>
            </div>
          </div>

          {scanResult && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition active:scale-95 shrink-0 shadow-md"
            >
              🔄 Nueva Foto
            </button>
          )}
        </div>
      </div>

      {/* 2. Sección: Subir / Seleccionar UNA Fotografía */}
      {!scanResult && (
        <div className="rounded-3xl bg-[#0b1224]/90 border border-[#1e2d52] p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Paso 1: Selecciona o toma UNA fotografía</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Carga la captura de tu juego en WIN10K (cuadrícula 5×5)
              </p>
            </div>
            {selectedFile && (
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                ✓ Imagen Cargada
              </span>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Dropzone / Preview Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-3xl p-5 sm:p-6 text-center cursor-pointer transition-all duration-200 overflow-hidden group
              ${
                imagePreview
                  ? 'border-cyan-500/60 bg-[#071020]/90 hover:border-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]'
                  : 'border-slate-700/80 hover:border-cyan-500/70 bg-[#060a16]/70'
              }
            `}
          >
            {imagePreview ? (
              <div className="space-y-4">
                <div className="relative max-h-72 overflow-hidden rounded-2xl border border-cyan-500/30 mx-auto bg-black shadow-xl">
                  <img
                    src={imagePreview}
                    alt="Fotografía a escanear"
                    className="w-full h-full max-h-72 object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.01]"
                  />

                  {/* Active Scanning Animation Overlay */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-[#040814]/85 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                      {/* Laser Scan Line */}
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee] animate-scan-line pointer-events-none" />

                      <div className="w-14 h-14 rounded-2xl bg-cyan-950/90 border-2 border-cyan-400 flex items-center justify-center mb-3 shadow-[0_0_25px_rgba(6,182,212,0.6)] animate-pulse">
                        <ScannerIcon3D className="w-8 h-8 text-cyan-300" />
                      </div>

                      <span className="text-xs sm:text-sm font-black text-white tracking-wide font-mono text-center max-w-xs">
                        {progressLabel}
                      </span>

                      {/* Progress Bar */}
                      <div className="w-56 h-2 bg-slate-900 rounded-full overflow-hidden mt-3 border border-cyan-500/40 p-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-cyan-300 mt-1">
                        {progressPercent}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-400">Archivo:</span>
                    <span className="font-mono text-slate-200">{fileDetails?.name || 'captura.png'}</span>
                    {fileDetails && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({fileDetails.width}x{fileDetails.height} · {fileDetails.sizeKb} KB)
                      </span>
                    )}
                  </div>
                  <span className="text-cyan-300 hover:text-white underline font-semibold text-[11px]">
                    Cambiar fotografía
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-950 to-blue-950 border border-cyan-500/40 flex items-center justify-center mx-auto shadow-xl group-hover:scale-105 transition-transform">
                  <ScannerIcon3D className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-slate-200">
                    Arrastra aquí tu fotografía o pulsa para seleccionarla
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Admite capturas de pantalla de móvil (iPhone/Android) o cámara
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick 1-Click Samples for Easy Authentic Testing */}
          <div className="p-3.5 rounded-2xl bg-[#071328] border border-cyan-500/30 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span>💡</span>
                <span>O prueba instantáneamente con capturas reales de WIN10K:</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLoadSample('/assets/aistudio/IMG_7795_9e7da139.png', 'captura_partida_con_monedas_y_minas.png')}
                className="p-2.5 rounded-xl bg-[#0c1f3d] hover:bg-[#132d57] border border-[#23497d] text-left text-xs font-bold text-cyan-200 flex items-center justify-between transition active:scale-95 shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">📸</span>
                  <div>
                    <div className="text-white text-xs font-bold">Partida con Monedas y Minas</div>
                    <div className="text-[10px] text-slate-400">22 monedas, 3 minas, 1 cofre</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                  Cargar
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample('/assets/aistudio/IMG_7799_e9109cce.png', 'captura_tablero_cerrado_inicial.png')}
                className="p-2.5 rounded-xl bg-[#0c1f3d] hover:bg-[#132d57] border border-[#23497d] text-left text-xs font-bold text-cyan-200 flex items-center justify-between transition active:scale-95 shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">📸</span>
                  <div>
                    <div className="text-white text-xs font-bold">Tablero Inicial Cerrado</div>
                    <div className="text-[10px] text-slate-400">25 casillas cerradas (3 minas)</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                  Cargar
                </span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in">
              <span className="w-5 h-5 rounded-full bg-rose-900 border border-rose-400 text-rose-200 flex items-center justify-center font-black shrink-0">
                !
              </span>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Step 3: Main Big Button: ESCANEAR IMAGEN */}
          <button
            type="button"
            disabled={isAnalyzing || !imagePreview}
            onClick={handleStartScan}
            className={`
              w-full py-4 px-6 rounded-2xl font-black text-sm tracking-wide flex items-center justify-center gap-3 transition-all duration-200 shadow-xl
              ${
                isAnalyzing || !imagePreview
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-[0_10px_30px_rgba(6,182,212,0.4)] active:scale-[0.98] border border-cyan-300/40'
              }
            `}
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Investigando imagen con Gemini Visión...</span>
              </>
            ) : (
              <>
                <ScannerIcon3D className="w-6 h-6 shrink-0" />
                <span>ESCANEAR IMAGEN CON GEMINI</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 3. RESULTADOS DEL ANÁLISIS DE GEMINI (CON APERTURA SECUENCIAL AUTOMÁTICA LENTA) */}
      {scanResult && (
        <div className="space-y-6 animate-in zoom-in-95 fade-in duration-300">
          {/* Header de Resultados */}
          <div className="rounded-3xl bg-[#09152b] border-2 border-cyan-500/50 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-cyan-500/25">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-slate-950 text-sm shadow-[0_0_20px_#10b981]">
                  ✓
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      {isOpeningSequentially ? 'ABRIENDO CASILLAS AUTOMÁTICAMENTE...' : 'ESCANEO COMPLETADO'}
                    </span>
                    {scanResult.model_used && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                        {scanResult.model_used}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-wide mt-1">
                    {isOpeningSequentially ? 'Revelando Casillas Detectadas con la IA' : 'Resultados de la Fotografía Analizada'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md active:scale-95 transition"
                >
                  📷 Escanear otra foto
                </button>
              </div>
            </div>

            {/* Banner Dinámico de Progreso de Apertura Automática */}
            {isOpeningSequentially && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950 via-[#451a03] to-[#290e02] border-2 border-yellow-400/90 shadow-[0_0_25px_rgba(250,204,21,0.4)] text-yellow-200 flex flex-wrap items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-yellow-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-lg">
                    {openingProgress?.current || 1}
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">
                      Abriendo casillas una por una ({openingProgress?.current} de {openingProgress?.total})
                    </div>
                    <div className="text-[11px] text-yellow-300 font-mono">
                      Revelando casilla en coordenada {openingProgress?.currentCoord}...
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSkipAnimation(scanResult.cells)}
                  className="px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs shadow active:scale-95 transition shrink-0"
                >
                  ⚡ Mostrar Todo (Saltar)
                </button>
              </div>
            )}

            {/* Banner de Estado Detectado cuando termina */}
            {!isOpeningSequentially && scanResult.detected_game_status === 'win' && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-emerald-200 flex items-center justify-between gap-3 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <div className="flex items-center gap-2.5">
                  <TrophyGold3D className="w-7 h-7 shrink-0" />
                  <span className="text-xs font-black">
                    ¡PARTIDA COBRADA / VICTORIA DETECTADA! Se abrieron todas las casillas seguras sin detonaciones.
                  </span>
                </div>
              </div>
            )}

            {!isOpeningSequentially && scanResult.detected_game_status === 'lost' && (
              <div className="p-3.5 rounded-2xl bg-red-950/90 border border-red-500 text-red-200 flex items-center justify-between gap-3 shadow-[0_0_25px_rgba(239,68,68,0.3)]">
                <div className="flex items-center gap-2.5">
                  <Mine3D className="w-7 h-7 shrink-0" />
                  <span className="text-xs font-black">
                    MINA DETONADA DETECTADA: Se visualiza una o más bombas activadas que provocaron la pérdida de la ronda.
                  </span>
                </div>
              </div>
            )}

            {!isOpeningSequentially && scanResult.detected_game_status === 'ready' && (
              <div className="p-3.5 rounded-2xl bg-blue-950/80 border border-cyan-400/50 text-cyan-200 flex items-center gap-2.5 text-xs font-bold">
                <span className="text-lg">🎯</span>
                <span>
                  TABLERO INICIAL LIMPIO: Todas las casillas están cerradas y listas para jugar.
                </span>
              </div>
            )}

            {/* 4 Métricas Clave Identificadas (Actualizadas en vivo a medida que se abren las casillas) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono">
              <div className="p-3 rounded-2xl bg-[#061022] border border-[#1b3a6b]">
                <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] uppercase font-bold">
                  <Gem3D className="w-3.5 h-3.5" />
                  <span>Monedas / Seguras</span>
                </div>
                <div className="text-lg sm:text-xl font-black text-emerald-300 mt-1">
                  {isOpeningSequentially ? liveSafeCount : scanResult.safe_count}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#061022] border border-[#1b3a6b]">
                <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] uppercase font-bold">
                  <Mine3D className="w-3.5 h-3.5" />
                  <span>Minas Detectadas</span>
                </div>
                <div className="text-lg sm:text-xl font-black text-rose-400 mt-1">
                  {isOpeningSequentially ? liveMineCount : scanResult.mine_count}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#061022] border border-[#1b3a6b]">
                <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] uppercase font-bold">
                  <Chest3D className="w-3.5 h-3.5" />
                  <span>Cofres de Tesoro</span>
                </div>
                <div className="text-lg sm:text-xl font-black text-amber-300 mt-1">
                  {isOpeningSequentially ? liveChestCount : scanResult.chest_count}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#061022] border border-[#1b3a6b]">
                <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] uppercase font-bold">
                  <span>🔒</span>
                  <span>Casillas Ocultas</span>
                </div>
                <div className="text-lg sm:text-xl font-black text-cyan-300 mt-1">
                  {isOpeningSequentially ? liveHiddenCount : scanResult.hidden_count}
                </div>
              </div>
            </div>

            {/* Detalles Detectados de la Interfaz (Apuesta, Multiplicador, Saldo) */}
            {(scanResult.bet_amount_detected || scanResult.multiplier_detected || scanResult.balance_detected || scanResult.detected_mine_count) && (
              <div className="p-3 rounded-2xl bg-[#071328] border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">Configuración:</span>
                  <span className="font-mono font-black text-cyan-300">
                    {scanResult.detected_mine_count || 3} Minas
                  </span>
                </div>

                {scanResult.bet_amount_detected && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">Apuesta:</span>
                    <span className="font-mono font-black text-white">
                      {scanResult.bet_amount_detected}
                    </span>
                  </div>
                )}

                {scanResult.multiplier_detected && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">Multiplicador:</span>
                    <span className="font-mono font-black text-yellow-400">
                      {scanResult.multiplier_detected}
                    </span>
                  </div>
                )}

                {scanResult.balance_detected && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">Saldo:</span>
                    <span className="font-mono font-black text-emerald-400">
                      {scanResult.balance_detected}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* TABLERO VISUAL 5×5 CON ANIMACIÓN DE APERTURA CASILLA POR CASILLA */}
            <div className="flex flex-col items-center justify-center pt-2">
              <div className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isOpeningSequentially ? 'bg-yellow-400 animate-ping' : 'bg-cyan-400 animate-pulse'}`} />
                <span>
                  {isOpeningSequentially
                    ? 'Apertura automática en curso casilla por casilla...'
                    : 'Cuadrícula 5×5 Identificada por Gemini (Coordenadas F1-C1 a F5-C5)'}
                </span>
              </div>

              <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-b from-[#0c2417]/95 via-[#06170e]/95 to-[#030d07] border border-[#065f46] shadow-[0_20px_50px_rgba(0,0,0,0.85)] max-w-sm w-full">
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {scanResult.cells.map((originalCell) => {
                    const cell = displayedCellsMap[originalCell.position] || originalCell;
                    const coord = `F${cell.row + 1}-C${cell.column + 1}`;
                    const isCurrentlyOpening = currentlyOpeningPos === cell.position;
                    let bgStyle = '';

                    if (cell.state === 'SEGURA') {
                      bgStyle =
                        'bg-gradient-to-b from-emerald-900/80 via-[#064e3b]/95 to-[#022c22] border-emerald-400 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.4)]';
                    } else if (cell.state === 'MINA') {
                      bgStyle =
                        'bg-gradient-to-b from-red-950/90 via-[#450a0a]/95 to-[#1c0404] border-red-500 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.5)]';
                    } else if (cell.state === 'COFRE') {
                      bgStyle =
                        'bg-gradient-to-b from-amber-900/85 via-[#78350f]/90 to-[#3b1704] border-amber-400 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
                    } else if (cell.state === 'DESCONOCIDA') {
                      bgStyle =
                        'bg-slate-900/90 border-slate-700 text-slate-400';
                    } else {
                      // OCULTA
                      bgStyle =
                        'bg-gradient-to-b from-[#0f291e] via-[#091b13] to-[#04100b] border-[#164e37]/90 text-slate-400';
                    }

                    return (
                      <div
                        key={cell.position}
                        className={`
                          relative aspect-square rounded-2xl border flex flex-col items-center justify-center p-1 transition-all duration-200
                          ${bgStyle}
                          ${isCurrentlyOpening ? 'scale-110 ring-4 ring-yellow-400 shadow-[0_0_30px_#facc15] z-30 animate-pulse' : ''}
                        `}
                        title={`Coordenada ${coord} (Fila ${cell.row + 1}, Columna ${cell.column + 1}): ${cell.visual_description || cell.state}`}
                      >
                        <span className="absolute top-1 left-1.5 text-[8px] font-mono font-bold text-slate-400">
                          {coord}
                        </span>

                        <div className="flex items-center justify-center w-full h-full">
                          {cell.state === 'SEGURA' && (
                            <div className="w-full h-full flex items-center justify-center animate-in zoom-in duration-200">
                              <StarCoin3D className="w-[82%] h-[82%] drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" />
                            </div>
                          )}
                          {cell.state === 'MINA' && (
                            <div className="w-full h-full flex items-center justify-center animate-in zoom-in duration-200">
                              <Win10kBomb3D className="w-[82%] h-[82%] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]" />
                            </div>
                          )}
                          {cell.state === 'COFRE' && (
                            <div className="w-full h-full flex items-center justify-center animate-in zoom-in duration-200">
                              <Win10kChest3D className="w-[85%] h-[85%] drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" />
                            </div>
                          )}
                          {cell.state === 'DESCONOCIDA' && (
                            <TileUnknown3D className="w-[80%] h-[80%] opacity-80" />
                          )}
                          {cell.state === 'OCULTA' && (
                            <Win10kClosedTile className="w-[80%] h-[80%] opacity-70" />
                          )}
                        </div>

                        {cell.state === 'OCULTA' && (
                          <span className="absolute bottom-1 text-[7px] font-mono text-cyan-300/80">
                            Cerrada
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Diagnóstico Textual Detallado de Gemini */}
            <div className="p-4 rounded-2xl bg-[#081326] border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <span>🤖</span>
                  <span>Diagnóstico Visual de Gemini:</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  Calidad: <span className="text-white">{scanResult.quality_assessment}</span> | Confianza: <span className="text-emerald-400">{Math.round(scanResult.overall_confidence * 100)}%</span>
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {scanResult.quality_notes}
              </p>
              {scanResult.pattern_notes && (
                <p className="text-[11px] text-cyan-200/90 leading-relaxed pt-1 border-t border-slate-800">
                  <strong>Patrones y Disposición:</strong> {scanResult.pattern_notes}
                </p>
              )}
            </div>

            {/* Transparencia Criptográfica & Anti-Simulación */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 leading-relaxed space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Transparencia Criptográfica WIN10K (Provably Fair HMAC-SHA256):</span>
              </div>
              <p>
                La IA Gemini investiga minuciosamente todo lo visible en tu fotografía y abre secuencialmente las casillas identificadas con suspenso. No inventa casillas ni repite resultados de partidas pasadas.
              </p>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 shadow-md flex items-center gap-2"
              >
                <span>🔄 Escanear Otra Fotografía</span>
              </button>

              <button
                type="button"
                disabled={isSaving || saveSuccess || isOpeningSequentially}
                onClick={handleSaveToFirestore}
                className={`
                  px-4 py-2.5 rounded-xl font-black text-xs transition active:scale-95 shadow-md flex items-center gap-2
                  ${
                    saveSuccess
                      ? 'bg-emerald-900 text-emerald-200 border border-emerald-500/50 cursor-default'
                      : isOpeningSequentially
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  }
                `}
              >
                {isSaving ? (
                  <span>Guardando en la nube...</span>
                ) : saveSuccess ? (
                  <span>✓ Partida Respaldada en Firestore</span>
                ) : (
                  <span>💾 Guardar Partida en Historial</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
