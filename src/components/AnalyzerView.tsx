import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Board5x5 } from './Board5x5';
import { UserSelectionBoard } from './UserSelectionBoard';
import { CellData, CellState, GameRecord, UserSelectionCell, UserSelectionState } from '../types';
import { saveGameRecord, recordTrainingSample } from '../services/firestoreService';
import { auth } from '../firebase';
import {
  ScannerIcon3D,
  Gem3D,
  Mine3D,
  ValidationIcon3D,
  Win10kAuditIcon3D,
  ProbabilityIcon3D,
  TrophyGold3D,
} from './Icons3D';
import { soundFX } from '../utils/soundEffects';
import {
  calculateWin10kFixedStrategy,
  computeEmpiricalStatistics,
  Win10kFixedStrategyState,
} from '../utils/probabilityEngine';

interface RoundStep {
  stepNumber: number;
  label: string;
  timestamp: string;
  revealedCount: number;
  cells: CellData[];
}

interface AnalyzerViewProps {
  onGameSaved?: (gameId: string) => void;
  initialMinesCount?: number;
  games?: GameRecord[];
}

export const AnalyzerView: React.FC<AnalyzerViewProps> = ({
  onGameSaved,
  games = [],
}) => {
  // Mode 1: Nueva Partida | Mode 2: Actualizar Partida
  const [analysisMode, setAnalysisMode] = useState<'MODE_1_NEW' | 'MODE_2_UPDATE'>('MODE_1_NEW');

  // Board View: 'BOTH' (side by side) | 'GREEN' (Analysis only) | 'BLUE' (Selections only)
  const [boardViewMode, setBoardViewMode] = useState<'BOTH' | 'GREEN' | 'BLUE'>('BOTH');

  // Currently inspected cell position (0 to 24)
  const [inspectedPosition, setInspectedPosition] = useState<number | null>(null);

  // Screenshot upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fixed WIN10K rules: strictly 3 mines, 22 safe, target 3 safe tiles
  const mineCount = 3;
  const platform = 'WIN10K Mobile';
  const [gameStatus, setGameStatus] = useState<'ongoing' | 'win' | 'lost'>('ongoing');

  // Vision scan execution state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStepLabel, setAnalysisStepLabel] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);

  // Vision detection results
  const [qualityAssessment, setQualityAssessment] = useState<string>('');
  const [qualityNotes, setQualityNotes] = useState<string>('');
  const [overallConfidence, setOverallConfidence] = useState<number | null>(null);

  // Active 25 cells state (Tablero Verde: Panel de Análisis y Probabilidades)
  const [cells, setCells] = useState<CellData[]>(() =>
    Array.from({ length: 25 }, (_, i) => ({
      position: i,
      coordinate: `F${Math.floor(i / 5) + 1}-C${(i % 5) + 1}`,
      row: Math.floor(i / 5),
      column: i % 5,
      state: 'OCULTA',
      confidence: 1.0,
      confirmedByUser: false,
    }))
  );

  // User manual selections in WIN10K (Tablero Azul: Seguimiento de Selecciones)
  const [userSelections, setUserSelections] = useState<UserSelectionCell[]>(() =>
    Array.from({ length: 25 }, (_, i) => ({
      position: i,
      coordinate: `F${Math.floor(i / 5) + 1}-C${(i % 5) + 1}`,
      row: Math.floor(i / 5),
      column: i % 5,
      status: 'UNSELECTED' as UserSelectionState,
    }))
  );

  // Round progression history
  const [roundHistory, setRoundHistory] = useState<RoundStep[]>([]);
  const [newlyRevealedPositions, setNewlyRevealedPositions] = useState<number[]>([]);
  const [recentChangesSummary, setRecentChangesSummary] = useState<string | null>(null);

  // Track AI predictions for training samples
  const originalAiPredictionsRef = useRef<{ [pos: number]: { state: CellState; confidence: number } }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real empirical statistics computed strictly from recorded Firestore games
  const empiricalStats = useMemo(() => {
    return computeEmpiricalStatistics(games || []);
  }, [games]);

  // Fixed WIN10K Strategy Engine (3 mines, target 3 safe)
  const strategyState: Win10kFixedStrategyState = useMemo(() => {
    return calculateWin10kFixedStrategy(cells, empiricalStats.positions);
  }, [cells, empiricalStats]);

  // Synchronize gameStatus automatically with board cells
  useEffect(() => {
    if (strategyState.isGameLost) {
      setGameStatus('lost');
    } else if (strategyState.isGameWon) {
      setGameStatus('win');
    } else {
      setGameStatus('ongoing');
    }
  }, [strategyState.isGameLost, strategyState.isGameWon]);

  // Cell ranks map for Green Board
  const cellRanksMap = useMemo(() => {
    const map: { [pos: number]: number } = {};
    for (const r of strategyState.rankedCells) {
      if (r.rank > 0) {
        map[r.position] = r.rank;
      }
    }
    return map;
  }, [strategyState.rankedCells]);

  const recommendedPositions = useMemo(() => {
    return strategyState.rankedCells
      .filter((r) => r.isRecommended)
      .map((r) => r.position);
  }, [strategyState.rankedCells]);

  const safeCount = cells.filter((c) => c.state === 'SEGURA').length;
  const mineCountRevealed = cells.filter((c) => c.state === 'MINA').length;
  const hiddenCount = cells.filter((c) => c.state === 'OCULTA' || c.state === 'DESCONOCIDA').length;

  // Blue Board selection counts
  const pendingCount = userSelections.filter((s) => s.status === 'PENDING').length;
  const confirmedSafeCount = userSelections.filter((s) => s.status === 'CONFIRMED_SAFE').length;
  const confirmedMinesCount = userSelections.filter((s) => s.status === 'CONFIRMED_MINE').length;
  const unselectedCount = userSelections.filter((s) => s.status === 'UNSELECTED').length;

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
    setMismatchWarning(null);
    setRecentChangesSummary(null);
    soundFX.playTileClick();

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

  // Run Gemini Vision Analysis with real progress simulation
  const handleAnalyze = async () => {
    if (!imagePreview) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setMismatchWarning(null);
    setSaveSuccess(false);
    setAnalysisProgress(15);
    setAnalysisStepLabel(
      analysisMode === 'MODE_1_NEW'
        ? 'Iniciando reconocimiento de tablero 5x5 inicial...'
        : 'Comparando captura con el tablero de la ronda en curso...'
    );
    soundFX.playScanSweep();

    const pTimer1 = setTimeout(() => {
      setAnalysisProgress(45);
      setAnalysisStepLabel('Aislando cuadrícula 5x5 y coordenadas F1-C1 a F5-C5...');
    }, 700);

    const pTimer2 = setTimeout(() => {
      setAnalysisProgress(75);
      setAnalysisStepLabel('Evaluando gemas visibles y descartando minas...');
    }, 1500);

    try {
      const response = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: imageFile?.type || 'image/png',
          mineCount: 3,
        }),
      });

      clearTimeout(pTimer1);
      clearTimeout(pTimer2);
      setAnalysisProgress(95);
      setAnalysisStepLabel('Calculando probabilidades hipergeométricas...');

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error en el análisis (${response.status})`);
      }

      const result = await response.json();

      setQualityAssessment(result.quality_assessment || 'CLEAR');
      setQualityNotes(result.quality_notes || 'Análisis completado satisfactoriamente.');
      setOverallConfidence(result.overall_confidence);

      // If blurry or cropped, request another capture instead of guessing
      if (
        result.quality_assessment === 'BLURRY' ||
        result.quality_assessment === 'CROPPED' ||
        result.quality_assessment === 'NOT_MINES_GAME'
      ) {
        setAnalysisError(
          `La captura de WIN10K no permite reconocer con suficiente nitidez las 25 casillas (${result.quality_assessment}). Por favor, toma una captura completa y nítida del juego en tu pantalla en lugar de intentar estimar casillas dudosas.`
        );
        setIsAnalyzing(false);
        return;
      }

      // Map incoming cells
      const predictionsMap: { [pos: number]: { state: CellState; confidence: number } } = {};
      const incomingCells: CellData[] = (result.cells || []).map((c: any) => {
        predictionsMap[c.position] = { state: c.state, confidence: c.confidence };
        const row = Math.floor(c.position / 5);
        const col = c.position % 5;
        return {
          position: c.position,
          coordinate: `F${row + 1}-C${col + 1}`,
          row,
          column: col,
          state: c.state,
          confidence: c.confidence,
          confirmedByUser: false,
          visualDescription: c.visual_description,
          aiPredictedState: c.state,
        };
      });

      originalAiPredictionsRef.current = predictionsMap;

      // MODE 1: NUEVA PARTIDA
      if (analysisMode === 'MODE_1_NEW') {
        const initialMerged: CellData[] = incomingCells.map((c) => ({
          ...c,
          // If fresh start, cells are OCULTA unless user uploaded a game in progress
        }));

        setCells(initialMerged);

        // Reset user selections on Blue Board
        setUserSelections(
          initialMerged.map((c) => {
            let status: UserSelectionState = 'UNSELECTED';
            if (c.state === 'SEGURA') status = 'CONFIRMED_SAFE';
            else if (c.state === 'MINA') status = 'CONFIRMED_MINE';
            return {
              position: c.position,
              coordinate: c.coordinate || `F${c.row + 1}-C${c.column + 1}`,
              row: c.row,
              column: c.column,
              status,
            };
          })
        );

        setNewlyRevealedPositions([]);
        const totalSafeNow = initialMerged.filter((c) => c.state === 'SEGURA').length;
        const hasMineNow = initialMerged.some((c) => c.state === 'MINA');

        if (hasMineNow) {
          setGameStatus('lost');
          soundFX.playMineDetonation();
        } else if (totalSafeNow >= 3) {
          setGameStatus('win');
          soundFX.playChestFanfare();
        } else {
          setGameStatus('ongoing');
          soundFX.playTileClick();
        }

        setRecentChangesSummary(
          `Nueva partida iniciada: Tablero 5×5 reconocido con 3 minas configuradas. Progreso inicial: ${Math.min(
            3,
            totalSafeNow
          )}/3 casillas seguras.`
        );

        const newStep: RoundStep = {
          stepNumber: 1,
          label: 'Tablero Inicial (Modo 1)',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          revealedCount: initialMerged.filter((c) => c.state !== 'OCULTA').length,
          cells: initialMerged,
        };
        setRoundHistory([newStep]);

        // Auto transition to Mode 2 for following captures
        setAnalysisMode('MODE_2_UPDATE');
      } else {
        // MODE 2: ACTUALIZAR PARTIDA EN CURSO
        const previousCells = cells;
        const newlyDiscovered: number[] = [];
        let newSafeCount = 0;
        let newMinesCount = 0;
        let conflictDetected = false;

        // Check if previously confirmed cells disappeared (different game check)
        for (const prev of previousCells) {
          if (prev.state === 'SEGURA' || prev.state === 'MINA') {
            const incoming = incomingCells.find((c) => c.position === prev.position);
            if (incoming && incoming.state === 'OCULTA') {
              conflictDetected = true;
            }
          }
        }

        if (conflictDetected) {
          setMismatchWarning(
            'Atención: La captura parece corresponder a otra partida porque casillas ya confirmadas aparecen cerradas. Los resultados anteriores se han conservado por seguridad.'
          );
        }

        const mergedCells: CellData[] = incomingCells.map((newCell) => {
          const prev = previousCells.find((p) => p.position === newCell.position);
          // Never erase previously revealed safe or mine
          if (prev && (prev.state === 'SEGURA' || prev.state === 'MINA')) {
            return prev;
          }
          if (prev && prev.state === 'OCULTA' && newCell.state !== 'OCULTA') {
            newlyDiscovered.push(newCell.position);
            if (newCell.state === 'SEGURA') newSafeCount++;
            if (newCell.state === 'MINA') newMinesCount++;
          }
          return newCell;
        });

        setNewlyRevealedPositions(newlyDiscovered);

        // Synchronize Blue Board selections with newly confirmed results
        setUserSelections((prevSelections) =>
          prevSelections.map((sel) => {
            const cell = mergedCells.find((c) => c.position === sel.position);
            if (cell) {
              if (cell.state === 'SEGURA') return { ...sel, status: 'CONFIRMED_SAFE' };
              if (cell.state === 'MINA') return { ...sel, status: 'CONFIRMED_MINE' };
            }
            return sel;
          })
        );

        const totalSafeNow = mergedCells.filter((c) => c.state === 'SEGURA').length;
        const hasMineNow = mergedCells.some((c) => c.state === 'MINA');

        if (hasMineNow) {
          setGameStatus('lost');
          soundFX.playMineDetonation();
        } else if (totalSafeNow >= 3) {
          setGameStatus('win');
          soundFX.playChestFanfare();
        } else {
          setGameStatus('ongoing');
        }

        if (newlyDiscovered.length > 0) {
          setRecentChangesSummary(
            `¡Actualización detectada! Se identificaron ${newlyDiscovered.length} nuevas casillas reveladas (+${newSafeCount} Gemas${
              newMinesCount > 0 ? `, +${newMinesCount} Minas` : ''
            }). Progreso: ${Math.min(3, totalSafeNow)}/3 casillas seguras.`
          );
          if (!hasMineNow && totalSafeNow < 3) {
            soundFX.playGemReveal();
          }
        } else {
          const revealedTotal = mergedCells.filter((c) => c.state !== 'OCULTA').length;
          setRecentChangesSummary(
            `Tablero sincronizado: ${revealedTotal} casillas activas reconocidas. Progreso: ${Math.min(
              3,
              totalSafeNow
            )}/3.`
          );
          soundFX.playTileClick();
        }

        setCells(mergedCells);

        const currentRevealed = mergedCells.filter((c) => c.state !== 'OCULTA').length;
        const newStep: RoundStep = {
          stepNumber: roundHistory.length + 1,
          label: `Paso #${roundHistory.length + 1} (${Math.min(3, totalSafeNow)}/3)`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          revealedCount: currentRevealed,
          cells: mergedCells,
        };
        setRoundHistory((prev) => [...prev, newStep]);
      }
    } catch (err: unknown) {
      console.warn('Aviso de análisis de visión:', err);
      setAnalysisError(
        err instanceof Error ? err.message : 'No se pudo conectar con el servicio de análisis de visión.'
      );
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(100);
    }
  };

  // User manually edits a cell state on Green Board
  const handleGreenCellClick = (position: number) => {
    setInspectedPosition(position);
  };

  const handleGreenCellStateChange = (position: number, newState: CellState) => {
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

    // Sync to Blue Board
    setUserSelections((prev) =>
      prev.map((s) => {
        if (s.position === position) {
          if (newState === 'SEGURA') return { ...s, status: 'CONFIRMED_SAFE' };
          if (newState === 'MINA') return { ...s, status: 'CONFIRMED_MINE' };
          if (newState === 'OCULTA') return { ...s, status: 'UNSELECTED' };
        }
        return s;
      })
    );
  };

  // User manually updates Blue Board (Tracking manual selections in WIN10K)
  const handleUserSelectionChange = (position: number, newStatus: UserSelectionState) => {
    setUserSelections((prev) =>
      prev.map((s) => (s.position === position ? { ...s, status: newStatus, updatedAt: new Date().toISOString() } : s))
    );

    // If confirmed as safe or mine on the blue board, also reflect on green board
    if (newStatus === 'CONFIRMED_SAFE') {
      setCells((prev) =>
        prev.map((c) => (c.position === position ? { ...c, state: 'SEGURA', confirmedByUser: true } : c))
      );
    } else if (newStatus === 'CONFIRMED_MINE') {
      setCells((prev) =>
        prev.map((c) => (c.position === position ? { ...c, state: 'MINA', confirmedByUser: true } : c))
      );
    } else if (newStatus === 'UNSELECTED') {
      setCells((prev) =>
        prev.map((c) => (c.position === position ? { ...c, state: 'OCULTA', confirmedByUser: true } : c))
      );
    }
  };

  // Reset to Modo 1 (Nueva Partida)
  const handleResetNewGame = () => {
    soundFX.playTileClick();
    setImageFile(null);
    setImagePreview(null);
    setOverallConfidence(null);
    setQualityAssessment('');
    setQualityNotes('');
    setSaveSuccess(false);
    setStorageNotice(null);
    setAnalysisError(null);
    setMismatchWarning(null);
    setRecentChangesSummary(null);
    setNewlyRevealedPositions([]);
    setRoundHistory([]);
    setInspectedPosition(null);
    setAnalysisMode('MODE_1_NEW');
    setGameStatus('ongoing');

    setCells(
      Array.from({ length: 25 }, (_, i) => ({
        position: i,
        coordinate: `F${Math.floor(i / 5) + 1}-C${(i % 5) + 1}`,
        row: Math.floor(i / 5),
        column: i % 5,
        state: 'OCULTA',
        confidence: 1.0,
        confirmedByUser: false,
      }))
    );

    setUserSelections(
      Array.from({ length: 25 }, (_, i) => ({
        position: i,
        coordinate: `F${Math.floor(i / 5) + 1}-C${(i % 5) + 1}`,
        row: Math.floor(i / 5),
        column: i % 5,
        status: 'UNSELECTED',
      }))
    );

    originalAiPredictionsRef.current = {};
  };

  // Restore past round step
  const handleSelectHistoryStep = (step: RoundStep) => {
    setCells(step.cells);
    setNewlyRevealedPositions([]);
    soundFX.playTileClick();
  };

  // Save reviewed game to real Firestore
  const handleSaveGame = async () => {
    setIsSaving(true);
    setAnalysisError(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setAnalysisError(
          'Para respaldar partidas en Cloud Firestore, pulsa "Conectar Google Auth" en la barra superior. En modo demostración/invitado puedes seguir analizando capturas sin restricciones.'
        );
        setIsSaving(false);
        return;
      }

      if (saveSuccess) return;

      const revealedSafe = cells.filter((c) => c.state === 'SEGURA').length;
      const revealedMines = cells.filter((c) => c.state === 'MINA').length;
      const revealedChests = cells.filter((c) => c.state === 'COFRE').length;
      const revealedTotal = revealedSafe + revealedMines + revealedChests;

      const finalStatus = revealedMines > 0 ? 'lost' : revealedSafe >= 3 ? 'win' : gameStatus;
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      setStorageNotice(
        'Partida registrada en Cloud Firestore sin cargos de almacenamiento: la captura se procesó en memoria.'
      );

      const gamePayload: Omit<GameRecord, 'userId' | 'createdAt'> = {
        gameId,
        platform,
        gameDate: new Date().toISOString(),
        boardSize: 5,
        mineCount: 3,
        gameStatus: finalStatus,
        screenshotUrl: '',
        revealedCount: revealedTotal,
        safeCount: revealedSafe,
        mineCountRevealed: revealedMines,
        chestCount: revealedChests,
        cells,
      };

      const savedId = await saveGameRecord(gamePayload, cells);

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
              visualFeatures: cell.visualDescription || `Casilla ${cell.coordinate || '5x5'}`,
            }).catch(() => {});
          }
        }
      }

      soundFX.playChestFanfare();
      setSaveSuccess(true);
      if (onGameSaved && savedId) {
        onGameSaved(savedId);
      }
    } catch (err: unknown) {
      console.warn('Aviso al guardar la partida:', err);
      setAnalysisError(
        err instanceof Error ? err.message : 'Error al guardar la partida en la base de datos.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Inspect detail for clicked position
  const inspectedCell = inspectedPosition !== null ? cells.find((c) => c.position === inspectedPosition) : null;
  const inspectedSelection =
    inspectedPosition !== null ? userSelections.find((s) => s.position === inspectedPosition) : null;
  const inspectedHistorical =
    inspectedPosition !== null ? empiricalStats.positions.find((p) => p.position === inspectedPosition) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Platform Separation & Independence Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#09152b] via-[#081024] to-[#120a26] border border-cyan-500/30 p-5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.85)]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-950/80 border border-cyan-400/40 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0">
              <ScannerIcon3D className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  MINES AI — Analizador Visual Independiente WIN10K
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">
                  Dos Plataformas Separadas
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                <strong>Plataforma A (WIN10K):</strong> Donde juegas manualmente. &nbsp;|&nbsp;&nbsp;
                <strong>Plataforma B (MINES AI):</strong> Tu asistente de análisis matemático. Nunca se conecta al casino ni apuesta automáticamente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
            <button
              type="button"
              onClick={handleResetNewGame}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/80 transition active:scale-95"
            >
              Reiniciar Partida
            </button>
          </div>
        </div>
      </div>

      {/* Mode Selector & Strategy Progress Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Mode 1 vs Mode 2 Controller (6 cols) */}
        <div className="lg:col-span-6 bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ScannerIcon3D className="w-4 h-4 text-cyan-400" />
                <span>Flujo de Capturas WIN10K</span>
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-400/50 text-cyan-300">
                {analysisMode === 'MODE_1_NEW' ? 'Modo 1 Activo' : 'Modo 2 Activo'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAnalysisMode('MODE_1_NEW');
                  soundFX.playTileClick();
                }}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border ${
                  analysisMode === 'MODE_1_NEW'
                    ? 'bg-gradient-to-r from-cyan-900/80 to-blue-900/80 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-[#11192e] border-slate-700/80 text-slate-400 hover:text-white'
                }`}
              >
                <span className="font-mono text-[10px] uppercase text-cyan-300">Modo 1</span>
                <span>Nueva Partida</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAnalysisMode('MODE_2_UPDATE');
                  soundFX.playTileClick();
                }}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border ${
                  analysisMode === 'MODE_2_UPDATE'
                    ? 'bg-gradient-to-r from-blue-900/80 to-indigo-900/80 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'bg-[#11192e] border-slate-700/80 text-slate-400 hover:text-white'
                }`}
              >
                <span className="font-mono text-[10px] uppercase text-blue-300">Modo 2</span>
                <span>Actualizar Partida</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {analysisMode === 'MODE_1_NEW'
              ? 'Sube la captura inicial de tu partida en WIN10K para reconocer la cuadrícula 5x5, confirmar las 3 minas e inicializar el análisis.'
              : 'Sube la nueva captura tras pulsar casillas en WIN10K. Se comparará con el estado previo para identificar gemas descubiertas sin perder datos.'}
          </p>
        </div>

        {/* Strategy Objective Tracker (6 cols) */}
        <div className="lg:col-span-6 bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Win10kAuditIcon3D className="w-5 h-5" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Estrategia Fija WIN10K (3 Minas · Objetivo 3 Seguras)
              </h3>
            </div>
            <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded-lg border border-cyan-500/40">
              {strategyState.progressFraction}
            </span>
          </div>

          {/* 4-Step Progress Bar */}
          <div>
            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-400 mb-1">
              <span className={safeCount >= 0 ? 'text-cyan-400' : ''}>0/3 Inicio</span>
              <span className={safeCount >= 1 ? 'text-cyan-300' : ''}>1/3 Paso 1</span>
              <span className={safeCount >= 2 ? 'text-cyan-200' : ''}>2/3 Paso 2</span>
              <span className={safeCount >= 3 ? 'text-emerald-400' : ''}>3/3 Éxito</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  strategyState.isGameWon
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_15px_#10b981]'
                    : strategyState.isGameLost
                    ? 'bg-gradient-to-r from-red-600 to-rose-700 shadow-[0_0_15px_#ef4444]'
                    : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-[0_0_10px_#06b6d4]'
                }`}
                style={{ width: `${Math.max(5, strategyState.progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Quick Odds Bar */}
          <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Prob. Segura:</span>
              <span className="font-bold text-cyan-300">
                {(strategyState.nextSafeProbability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Prob. Mina:</span>
              <span className="font-bold text-rose-400">
                {(strategyState.nextMineProbability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Multiplicador:</span>
              <span className="font-bold text-emerald-400">
                ~{strategyState.estimatedMultiplier.toFixed(2)}x
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone & Scan Trigger */}
      <div className="bg-[#0b1020]/90 border border-[#1e2a4a] rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ScannerIcon3D className="w-5 h-5" />
              <span>
                {analysisMode === 'MODE_1_NEW'
                  ? 'Paso 1: Cargar Captura Inicial de WIN10K'
                  : 'Paso 2: Cargar Nueva Captura para Actualizar'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sube la imagen tomada de tu pantalla de WIN10K (cuadrícula 5×5).
            </p>
          </div>

          {roundHistory.length > 0 && (
            <span className="text-xs font-mono px-3 py-1 rounded-xl bg-indigo-950/80 text-indigo-300 border border-indigo-500/40">
              Historial de Ronda: {roundHistory.length} capturas analizadas
            </span>
          )}
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 overflow-hidden group
            ${
              imagePreview
                ? 'border-cyan-500/50 bg-[#091222]/80 hover:border-cyan-400'
                : 'border-slate-700/80 hover:border-cyan-500/70 bg-[#060a14]/60'
            }
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
              <div className="relative max-h-56 overflow-hidden rounded-xl border border-slate-700/80 mx-auto bg-black">
                <img
                  src={imagePreview}
                  alt="Captura WIN10K"
                  className="w-full h-full object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.01]"
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-cyan-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-4">
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse top-1/2 -translate-y-1/2" />
                    <div className="w-12 h-12 rounded-2xl bg-cyan-900/80 border border-cyan-400 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                      <ScannerIcon3D className="w-7 h-7 animate-spin" />
                    </div>
                    <span className="text-xs font-bold text-white tracking-wider font-mono">
                      {analysisStepLabel}
                    </span>
                    <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-3 border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-300"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Haz clic o arrastra para cambiar la captura de esta ronda
              </p>
            </div>
          ) : (
            <div className="py-7 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-950 to-indigo-950 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-lg group-hover:scale-105 transition-transform">
                <ScannerIcon3D className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">
                  Arrastra tu captura de WIN10K aquí
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Admite capturas de móvil (iPhone/Android) o capturas de navegador PC
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Scan Button Trigger */}
        {imagePreview && (
          <button
            type="button"
            disabled={isAnalyzing}
            onClick={handleAnalyze}
            className="mt-4 w-full py-3 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-[0_10px_25px_rgba(6,182,212,0.35)] active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2.5"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Analizando Cuadrícula 5x5 con Gemini...</span>
              </>
            ) : (
              <>
                <ScannerIcon3D className="w-5 h-5 shrink-0" />
                <span>
                  {analysisMode === 'MODE_1_NEW'
                    ? 'Escanear Tablero Inicial (Modo 1)'
                    : 'Actualizar y Comparar con Estado Previo (Modo 2)'}
                </span>
              </>
            )}
          </button>
        )}

        {/* Error or Warnings */}
        {analysisError && (
          <div className="mt-4 p-3.5 bg-rose-950/70 border border-rose-500/50 rounded-2xl text-rose-300 text-xs flex items-center gap-2.5">
            <span className="font-bold text-base shrink-0">!</span>
            <span>{analysisError}</span>
          </div>
        )}

        {mismatchWarning && (
          <div className="mt-4 p-3.5 bg-amber-950/70 border border-amber-500/50 rounded-2xl text-amber-200 text-xs flex items-center justify-between gap-2">
            <span>{mismatchWarning}</span>
            <button
              type="button"
              onClick={handleResetNewGame}
              className="px-3 py-1 rounded-xl bg-amber-800 text-white font-bold shrink-0 hover:bg-amber-700 transition"
            >
              Iniciar como Nueva Partida
            </button>
          </div>
        )}

        {recentChangesSummary && (
          <div className="mt-4 p-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <span>{recentChangesSummary}</span>
          </div>
        )}
      </div>

      {/* Game State Banner (Victory / Defeat / Ongoing) */}
      {strategyState.isGameWon && (
        <div className="p-4 rounded-3xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TrophyGold3D className="w-8 h-8 shrink-0" />
            <div>
              <h3 className="text-sm font-black text-emerald-300">
                ¡OBJETIVO DE 3 CASILLAS COMPLETADO CON ÉXITO! (3/3)
              </h3>
              <p className="text-xs opacity-90 mt-0.5">
                Has alcanzado las 3 gemas requeridas sin minas. <strong>Retirada / Cashout recomendada de inmediato en WIN10K (~1.48x)</strong> para consolidar ganancias.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-emerald-900 border border-emerald-400 text-emerald-200 shrink-0">
            Retirada Ganadora
          </span>
        </div>
      )}

      {strategyState.isGameLost && (
        <div className="p-4 rounded-3xl bg-red-950/80 border border-red-500/60 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.3)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Mine3D className="w-8 h-8 shrink-0" />
            <div>
              <h3 className="text-sm font-black text-red-300">
                PARTIDA PERDIDA (MINA DETONADA)
              </h3>
              <p className="text-xs opacity-90 mt-0.5">
                Se ha descubierto una mina en el tablero. La partida finaliza en derrota. Pulsa "Reiniciar Partida" arriba para comenzar la siguiente ronda de 3 casillas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetNewGame}
            className="px-3 py-1.5 rounded-xl bg-red-900 hover:bg-red-800 text-white font-bold text-xs shrink-0 transition"
          >
            Nueva Partida
          </button>
        </div>
      )}

      {/* Board View Switcher Buttons */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black text-white">Visualización de Tableros</h2>
          <span className="text-xs text-slate-400">Coordenadas fijas F1-C1 a F5-C5</span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0e1629] p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setBoardViewMode('BOTH')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
              boardViewMode === 'BOTH'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ambos Tableros
          </button>
          <button
            type="button"
            onClick={() => setBoardViewMode('GREEN')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              boardViewMode === 'GREEN'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Tablero Verde (Análisis)
          </button>
          <button
            type="button"
            onClick={() => setBoardViewMode('BLUE')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              boardViewMode === 'BLUE'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Tablero Azul (Selecciones)
          </button>
        </div>
      </div>

      {/* Main Boards Display Grid */}
      <div
        className={`grid gap-6 items-start ${
          boardViewMode === 'BOTH' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 max-w-3xl mx-auto'
        }`}
      >
        {/* =============================================================== */}
        {/* SECCIÓN 4: TABLERO VERDE — PANEL DE ANÁLISIS Y PROBABILIDADES */}
        {/* =============================================================== */}
        {(boardViewMode === 'BOTH' || boardViewMode === 'GREEN') && (
          <div className="bg-[#0b1020]/90 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col items-center">
            {/* Header */}
            <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-emerald-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Tablero Verde — Panel de Análisis
                  </h3>
                  <p className="text-[11px] text-emerald-300/80 font-mono">
                    Probabilidades hipergeométricas exactas y casillas confirmadas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold">
                  <Gem3D className="w-3.5 h-3.5" />
                  {safeCount}/3
                </span>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-red-950 border border-red-500/50 text-red-300 text-xs font-mono font-bold">
                  <Mine3D className="w-3.5 h-3.5" />
                  {mineCountRevealed}/3
                </span>
              </div>
            </div>

            {/* Green Board */}
            <Board5x5
              cells={cells}
              onCellClick={handleGreenCellClick}
              onCellStateChange={handleGreenCellStateChange}
              newlyRevealedPositions={newlyRevealedPositions}
              cellRanks={cellRanksMap}
              recommendedPositions={recommendedPositions}
              showRankBadges={true}
              showCoordinates={true}
              showConfidence={true}
              boardVariant="green"
              hiddenSafeProbability={strategyState.nextSafeProbability}
              highlightPosition={inspectedPosition}
              size="lg"
            />

            {/* Mathematical Transparency Clarification */}
            <div className="w-full mt-4 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs leading-relaxed space-y-1">
              <div className="flex items-center justify-between font-bold text-emerald-300">
                <span>Transparencia Matemática WIN10K</span>
                <span className="font-mono">{(strategyState.nextSafeProbability * 100).toFixed(1)}% segura</span>
              </div>
              <p className="text-[11px] opacity-90">
                Matemáticamente, todas las casillas ocultas comparten la misma probabilidad teórica en esta ronda. No existe ventaja matemática previa en ninguna casilla oculta.
              </p>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* SECCIÓN 5: TABLERO AZUL — SEGUIMIENTO DE SELECCIONES EN WIN10K */}
        {/* =============================================================== */}
        {(boardViewMode === 'BOTH' || boardViewMode === 'BLUE') && (
          <div className="bg-[#0b1020]/90 border border-blue-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col items-center">
            {/* Header */}
            <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-blue-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-blue-400 shadow-[0_0_10px_#3b82f6]" />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Tablero Azul — Seguimiento WIN10K
                  </h3>
                  <p className="text-[11px] text-blue-300/80 font-mono">
                    Registra tus selecciones manuales y sincroniza resultados
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold">
                  {pendingCount} Pend
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-blue-950/80 border border-blue-500/40 text-blue-300 text-[11px] font-mono font-bold">
                  {unselectedCount} Libres
                </span>
              </div>
            </div>

            {/* Blue Board */}
            <UserSelectionBoard
              selections={userSelections}
              onSelectionChange={handleUserSelectionChange}
              highlightPosition={inspectedPosition}
              size="lg"
            />

            {/* Legend for 4 States of the Blue Board */}
            <div className="w-full mt-4 p-3 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs">
              <div className="text-blue-300 font-bold mb-1.5 flex items-center justify-between text-[11px]">
                <span>Leyenda de Estados del Tablero Azul:</span>
                <span className="text-[10px] text-slate-400">Pulsa cualquier casilla para cambiar estado</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                <div className="flex items-center gap-1.5 text-blue-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Azul: Sin seleccionar</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>Amarillo: Pendiente</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Verde: Confirmada segura</span>
                </div>
                <div className="flex items-center gap-1.5 text-red-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span>Rojo: Mina confirmada</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inspected Cell Detail Inspector (if user clicked any tile) */}
      {inspectedCell && (
        <div className="p-5 rounded-3xl bg-[#0e1629] border border-cyan-500/40 shadow-2xl animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-400 flex items-center justify-center font-mono font-black text-cyan-300 text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                {inspectedCell.coordinate}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Inspector de Casilla {inspectedCell.coordinate}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  Fila {inspectedCell.row + 1}, Columna {inspectedCell.column + 1} · Posición #{inspectedCell.position}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 font-mono text-slate-300">
                Tablero Verde: <strong>{inspectedCell.state}</strong>
              </span>
              <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 font-mono text-slate-300">
                Tablero Azul: <strong>{inspectedSelection?.status || 'UNSELECTED'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setInspectedPosition(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs ml-2"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Probabilidad Matemática Pura:</span>
              <span className="text-base font-bold text-cyan-300">
                {(strategyState.nextSafeProbability * 100).toFixed(1)}% Segura
              </span>
              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                Idéntica a todas las casillas ocultas en esta ronda.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Historial en tus Partidas:</span>
              <span className="text-base font-bold text-emerald-400">
                {inspectedHistorical
                  ? `${(inspectedHistorical.safeRate * 100).toFixed(1)}% segura`
                  : 'Sin datos previos'}
              </span>
              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                {inspectedHistorical
                  ? `${inspectedHistorical.totalGamesExamined} veces examinada (Descriptivo)`
                  : 'Aún no se ha registrado en partidas anteriores.'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-slate-400 text-[10px] block">Acción Manual Sugerida:</span>
                <span className="text-xs font-bold text-slate-200">
                  {inspectedCell.state === 'SEGURA'
                    ? 'Gema confirmada en WIN10K'
                    : inspectedCell.state === 'MINA'
                    ? 'Mina detonada'
                    : 'Casilla oculta disponible'}
                </span>
              </div>
              <span className="text-[10px] text-cyan-400/90 font-sans mt-1">
                Haz clic en el Tablero Azul para marcarla si la pulsaste en WIN10K.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sequence of Round Steps */}
      {roundHistory.length > 1 && (
        <div className="p-5 rounded-3xl bg-[#0b1020]/90 border border-[#1e2a4a] text-xs space-y-3">
          <div className="flex items-center justify-between text-slate-300 font-bold">
            <span>Historial de Actualizaciones de esta Ronda:</span>
            <span className="text-[11px] font-mono text-slate-500">
              {roundHistory.length} pasos registrados
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {roundHistory.map((step, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectHistoryStep(step)}
                className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-[#131b31] border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition shrink-0 flex items-center gap-2"
              >
                <span className="w-4 h-4 rounded-full bg-cyan-950 border border-cyan-400 text-cyan-300 text-[10px] flex items-center justify-center font-bold">
                  {step.stepNumber}
                </span>
                <span>{step.label}</span>
                <span className="text-slate-500 text-[10px]">{step.revealedCount} rev</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save Button to Cloud Firestore */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#0b1020]/90 border border-[#1e2a4a] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <ValidationIcon3D className="w-5 h-5" />
            <span>Guardar Resultados Reales en Cloud Firestore</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Almacena los resultados confirmados de ambos tableros para alimentar tus estadísticas descriptivas reales.
          </p>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSaveGame}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-xs bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 active:scale-[0.98] text-white shadow-[0_10px_30px_rgba(16,185,129,0.35)] transition disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Guardando en Firestore...</span>
            </>
          ) : (
            <>
              <ValidationIcon3D className="w-4 h-4 shrink-0" />
              <span>{saveSuccess ? 'Partida Guardada ✓' : 'Guardar Partida Verificada'}</span>
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ValidationIcon3D className="w-4 h-4 shrink-0" />
            Partida y casillas guardadas con éxito en Cloud Firestore.
          </span>
          <span className="font-bold text-emerald-200 font-mono">Sincronizado</span>
        </div>
      )}

      {storageNotice && (
        <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-start gap-2">
          <span className="font-bold shrink-0">ℹ</span>
          <span className="leading-relaxed">{storageNotice}</span>
        </div>
      )}
    </div>
  );
};
