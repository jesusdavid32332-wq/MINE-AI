import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StarCoin3D,
  Win10kBomb3D,
  Win10kChest3D,
  Win10kClosedTile,
  UserVipIcon3D,
  SoundOn3D,
  SoundOff3D,
  ScannerIcon3D,
} from './Icons3D';
import { soundFX } from '../utils/soundEffects';
import { CellData, CellState, GameRecord } from '../types';
import { saveGameRecord } from '../services/firestoreService';
import { auth } from '../firebase';
import { calculateWin10kFixedStrategy } from '../utils/probabilityEngine';

interface Win10kGameViewProps {
  games: GameRecord[];
  onOpenScanner?: () => void;
  onOpenMenu?: (tab: string) => void;
  onLoginClick?: () => void;
  userEmail?: string | null;
}

// WIN10K Multipliers for 3 Mines (~99% RTP)
const MULTIPLIERS_3_MINES = [
  1.10, 1.28, 1.51, 1.80, 2.18, 2.68, 3.35, 4.26, 5.54, 7.38,
  10.16, 14.38, 21.09, 32.20, 51.52, 87.58, 160.57, 321.14, 734.03, 1957.42, 6851.00, 34255.00
];

export const Win10kGameView: React.FC<Win10kGameViewProps> = ({
  games,
  onOpenScanner,
  onOpenMenu,
  onLoginClick,
  userEmail,
}) => {
  // Game Configuration
  const [mineCount, setMineCount] = useState<number>(3);
  const [betAmount, setBetAmount] = useState<number>(500);
  const [balance, setBalance] = useState<number>(10000.10); // Simulated COP Balance
  const [earnings, setEarnings] = useState<number>(0);

  // Board State: 25 cells (0 to 24)
  const [minePositions, setMinePositions] = useState<Set<number>>(() => {
    // Default 3 initial mines
    return new Set([0, 4, 24]);
  });
  const [revealedCells, setRevealedCells] = useState<{ [pos: number]: CellState }>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [autoGame, setAutoGame] = useState<boolean>(false);

  // Target Cells Selection for Sequential Slow Reveal
  // Array of position indices [pos1, pos2, pos3...] chosen by user or AI
  const [selectedTargets, setSelectedTargets] = useState<number[]>([12, 6, 18]);
  const [isRevealingSequentially, setIsRevealingSequentially] = useState<boolean>(false);
  const [currentlyRevealingPos, setCurrentlyRevealingPos] = useState<number | null>(null);

  // In-Place Scanner States
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStepLabel, setScanStepLabel] = useState<string>('');
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [scannedImagePreview, setScannedImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sound Mute Toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundFX.getSoundEnabled());

  // AI Assistant Overlay Toggle
  const [aiPredictorActive, setAiPredictorActive] = useState<boolean>(true);

  // Jackpots Banner View Toggle
  const [showJackpotBanner, setShowJackpotBanner] = useState<boolean>(true);

  // Quick Bet presets modal
  const [showBetPresets, setShowBetPresets] = useState<boolean>(false);
  const [showMineDropdown, setShowMineDropdown] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  const handleToggleSound = () => {
    const updated = soundFX.toggleSound();
    setSoundEnabled(updated);
  };

  // Revealed safe count in current round
  const revealedSafeCount = useMemo(() => {
    return Object.values(revealedCells).filter((s) => s === 'SEGURA' || s === 'COFRE').length;
  }, [revealedCells]);

  // Current multiplier
  const currentMultiplier = useMemo(() => {
    if (revealedSafeCount === 0) return 1.0;
    const idx = Math.min(revealedSafeCount - 1, MULTIPLIERS_3_MINES.length - 1);
    return MULTIPLIERS_3_MINES[idx] || 1.10;
  }, [revealedSafeCount]);

  // Next multiplier
  const nextMultiplier = useMemo(() => {
    const idx = Math.min(revealedSafeCount, MULTIPLIERS_3_MINES.length - 1);
    return MULTIPLIERS_3_MINES[idx] || 1.10;
  }, [revealedSafeCount]);

  // Calculated current profit
  const currentCashoutProfit = useMemo(() => {
    if (!isPlaying || revealedSafeCount === 0) return 0;
    return Math.floor(betAmount * currentMultiplier);
  }, [isPlaying, revealedSafeCount, betAmount, currentMultiplier]);

  // AI Recommendation for unrevealed cells
  const aiRecommendations = useMemo(() => {
    if (!aiPredictorActive) return [];
    const cellDataList: CellData[] = Array.from({ length: 25 }, (_, i) => ({
      position: i,
      row: Math.floor(i / 5),
      column: i % 5,
      state: revealedCells[i] || 'OCULTA',
      confidence: 1.0,
      confirmedByUser: true,
    }));

    const strategy = calculateWin10kFixedStrategy(cellDataList);
    return strategy.rankedCells
      .filter((c) => c.isRecommended && !revealedCells[c.position])
      .map((c) => c.position);
  }, [aiPredictorActive, revealedCells]);

  // Start new round
  const startNewGame = (customMines?: Set<number>) => {
    if (balance < betAmount) {
      alert('Saldo insuficiente para realizar esta apuesta.');
      return;
    }

    soundFX.playTileClick();
    setBalance((prev) => Math.max(0, prev - betAmount));
    setEarnings(0);
    setIsWon(false);
    setGameOver(false);
    setScanNotice(null);

    // Generate random mines if not provided
    let newMines = customMines;
    if (!newMines) {
      newMines = new Set<number>();
      while (newMines.size < mineCount) {
        const randPos = Math.floor(Math.random() * 25);
        newMines.add(randPos);
      }
    }

    setMinePositions(newMines);
    setRevealedCells({});
    setIsPlaying(true);
    return newMines;
  };

  // Click on a tile directly or toggle selection
  const handleCellClick = (pos: number) => {
    if (isRevealingSequentially) return; // Busy animating reveals

    // If cell already revealed, ignore
    if (revealedCells[pos]) return;

    // If game has not started yet, or user wants to pick target cells:
    // Toggle in selectedTargets!
    if (!isPlaying) {
      soundFX.playTileClick();
      toggleTargetSelection(pos);
      return;
    }

    // If game is actively playing, reveal this cell immediately
    revealSingleCell(pos);
  };

  // Toggle cell in selectedTargets list
  const toggleTargetSelection = (pos: number) => {
    setSelectedTargets((prev) => {
      if (prev.includes(pos)) {
        return prev.filter((p) => p !== pos);
      }
      if (prev.length >= 10) return prev; // max 10
      return [...prev, pos];
    });
  };

  // Select top 3 AI recommendations as targets
  const handleSelectAiTargets = () => {
    soundFX.playTileClick();
    const unrevealedRecs = aiRecommendations.filter((p) => !revealedCells[p]);
    if (unrevealedRecs.length > 0) {
      setSelectedTargets(unrevealedRecs.slice(0, 3));
    } else {
      // Pick 3 unrevealed at random
      const unrevealed: number[] = [];
      for (let i = 0; i < 25; i++) {
        if (!revealedCells[i]) unrevealed.push(i);
      }
      setSelectedTargets(unrevealed.slice(0, 3));
    }
  };

  // Reveal a single cell directly
  const revealSingleCell = (pos: number, activeMines: Set<number> = minePositions) => {
    if (revealedCells[pos]) return;

    if (activeMines.has(pos)) {
      // BOMB EXPLOSION!
      soundFX.playMineDetonation();
      setGameOver(true);
      setIsPlaying(false);
      setEarnings(0);

      const finalCells: { [p: number]: CellState } = { ...revealedCells, [pos]: 'MINA' };
      for (let i = 0; i < 25; i++) {
        if (activeMines.has(i)) {
          finalCells[i] = 'MINA';
        } else if (!finalCells[i]) {
          finalCells[i] = 'SEGURA';
        }
      }
      setRevealedCells(finalCells);
      saveRecordToDatabase('LOSS', finalCells, 0);
      return false; // hit mine
    } else {
      // SAFE COIN REVEAL!
      soundFX.playGemReveal();
      const isChest = pos === 12 && revealedSafeCount === 2;
      const updated = { ...revealedCells, [pos]: (isChest ? 'COFRE' : 'SEGURA') as CellState };
      setRevealedCells(updated);

      const newSafeCount = Object.values(updated).filter((s) => s === 'SEGURA' || s === 'COFRE').length;
      const newMult = MULTIPLIERS_3_MINES[Math.min(newSafeCount - 1, MULTIPLIERS_3_MINES.length - 1)];
      const wonAmount = Math.floor(betAmount * newMult);
      setEarnings(wonAmount);

      if (newSafeCount === 25 - mineCount) {
        soundFX.playChestFanfare();
        setIsWon(true);
        setIsPlaying(false);
        setBalance((prev) => prev + wonAmount);
        saveRecordToDatabase('WIN', updated, wonAmount);
      }
      return true; // safe
    }
  };

  // SEQUENTIAL SLOW REVEAL (Exact feature requested by user)
  // Destapa las casillas elegidas una por una lentamente con suspenso y sonido
  const handleStartSequentialReveal = async () => {
    if (isRevealingSequentially) return;

    const targetsToReveal = selectedTargets.filter((p) => !revealedCells[p]);
    if (targetsToReveal.length === 0) {
      alert('Por favor selecciona al menos 1 casilla para destapar o pulsa "Sugerencias IA".');
      return;
    }

    // If game is not active, start the game
    let currentMines = minePositions;
    if (!isPlaying) {
      const generated = startNewGame();
      if (!generated) return;
      currentMines = generated;
    }

    setIsRevealingSequentially(true);

    let currentRevealedMap = { ...revealedCells };
    let hitBomb = false;

    for (let i = 0; i < targetsToReveal.length; i++) {
      const targetPos = targetsToReveal[i];
      setCurrentlyRevealingPos(targetPos);

      // Suspense delay before flipping tile (850ms)
      await new Promise((resolve) => setTimeout(resolve, 850));

      if (currentMines.has(targetPos)) {
        // Hit mine!
        soundFX.playMineDetonation();
        hitBomb = true;
        setGameOver(true);
        setIsPlaying(false);
        setEarnings(0);

        const finalCells: { [p: number]: CellState } = { ...currentRevealedMap, [targetPos]: 'MINA' };
        for (let k = 0; k < 25; k++) {
          if (currentMines.has(k)) finalCells[k] = 'MINA';
          else if (!finalCells[k]) finalCells[k] = 'SEGURA';
        }
        setRevealedCells(finalCells);
        saveRecordToDatabase('LOSS', finalCells, 0);
        setCurrentlyRevealingPos(null);
        break;
      } else {
        // Revealed Safe Star Coin!
        soundFX.playGemReveal();
        const isChest = targetPos === 12 && Object.keys(currentRevealedMap).length === 2;
        currentRevealedMap[targetPos] = (isChest ? 'COFRE' : 'SEGURA') as CellState;
        setRevealedCells({ ...currentRevealedMap });

        const safeCountNow = Object.values(currentRevealedMap).filter((s) => s === 'SEGURA' || s === 'COFRE').length;
        const multNow = MULTIPLIERS_3_MINES[Math.min(safeCountNow - 1, MULTIPLIERS_3_MINES.length - 1)];
        const profitNow = Math.floor(betAmount * multNow);
        setEarnings(profitNow);

        // Pause so user sees the coin shine
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    setCurrentlyRevealingPos(null);
    setIsRevealingSequentially(false);

    if (!hitBomb) {
      soundFX.playChestFanfare();
      setScanNotice(`¡Destape completado con éxito! Multiplicador actual: ${currentMultiplier.toFixed(2)}x`);
    }
  };

  // Cashout / Cobrar
  const handleCashout = () => {
    if (!isPlaying || revealedSafeCount === 0 || isRevealingSequentially) return;
    soundFX.playChestFanfare();
    setIsPlaying(false);
    setIsWon(true);
    setBalance((prev) => prev + currentCashoutProfit);

    const finalCells: { [pos: number]: CellState } = { ...revealedCells };
    for (let i = 0; i < 25; i++) {
      if (minePositions.has(i)) {
        finalCells[i] = 'MINA';
      } else if (!finalCells[i]) {
        finalCells[i] = 'SEGURA';
      }
    }
    setRevealedCells(finalCells);
    saveRecordToDatabase('WIN', finalCells, currentCashoutProfit);
  };

  // Random tile pick
  const handleRandomPick = () => {
    soundFX.playTileClick();
    const unrevealed: number[] = [];
    for (let i = 0; i < 25; i++) {
      if (!revealedCells[i]) unrevealed.push(i);
    }
    if (unrevealed.length === 0) return;
    // Pick 3 random
    const shuffled = [...unrevealed].sort(() => Math.random() - 0.5);
    setSelectedTargets(shuffled.slice(0, 3));
  };

  // Save game to Firestore
  const saveRecordToDatabase = (result: 'WIN' | 'LOSS', cellsMap: { [pos: number]: CellState }, profit: number) => {
    const user = auth.currentUser;
    const cellList: CellData[] = Array.from({ length: 25 }, (_, i) => ({
      position: i,
      row: Math.floor(i / 5),
      column: i % 5,
      state: cellsMap[i] || 'OCULTA',
      confidence: 1.0,
      confirmedByUser: true,
    }));

    if (user) {
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      saveGameRecord(
        {
          gameId,
          platform: 'WIN10K',
          gameDate: new Date().toISOString(),
          boardSize: 5,
          mineCount: mineCount,
          gameStatus: result === 'WIN' ? 'win' : 'lost',
          revealedCount: revealedSafeCount + (result === 'LOSS' ? 1 : 0),
          safeCount: revealedSafeCount,
          mineCountRevealed: result === 'LOSS' ? 1 : 0,
          chestCount: Object.values(cellsMap).filter((s) => s === 'COFRE').length,
          cells: cellList,
          notes: `Apuesta: ${betAmount} COP | Multiplicador: ${currentMultiplier.toFixed(2)}x | Ganancia: ${profit} COP`,
        },
        cellList
      ).catch((err) => console.warn('Could not save to firestore:', err));
    }
  };

  // IN-PLACE SCREENSHOT SCANNING FUNCTION
  const handleScanImage = async (base64OrFile: string | File) => {
    setIsScanning(true);
    setScanProgress(20);
    setScanStepLabel('Procesando imagen de WIN10K con visión computacional...');
    soundFX.playScanSweep();

    let base64String = '';
    let mimeType = 'image/png';

    if (typeof base64OrFile === 'string') {
      base64String = base64OrFile;
      setScannedImagePreview(base64String);
    } else {
      mimeType = base64OrFile.type || 'image/png';
      base64String = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(base64OrFile);
      });
      setScannedImagePreview(base64String);
    }

    const t1 = setTimeout(() => {
      setScanProgress(55);
      setScanStepLabel('Aislando cuadrícula 5x5 y reconociendo monedas...');
    }, 600);

    const t2 = setTimeout(() => {
      setScanProgress(85);
      setScanStepLabel('Calculando probabilidades y preparando destape...');
    }, 1200);

    try {
      const response = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64String,
          mimeType,
          mineCount: 3,
        }),
      });

      clearTimeout(t1);
      clearTimeout(t2);
      setScanProgress(100);

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor de análisis');
      }

      const data = await response.json();
      const detectedCells: { [pos: number]: CellState } = {};
      const newMinePositions = new Set<number>();

      (data.cells || []).forEach((c: any) => {
        if (c.state && c.state !== 'OCULTA') {
          detectedCells[c.position] = c.state;
          if (c.state === 'MINA') newMinePositions.add(c.position);
        }
      });

      // Synchronize initial board with recognized screenshot state!
      setRevealedCells(detectedCells);
      if (newMinePositions.size > 0) {
        setMinePositions(newMinePositions);
      }
      setIsPlaying(true);
      setGameOver(data.detected_game_status === 'lost');
      setIsWon(data.detected_game_status === 'win');

      // Pre-select the top 3 safest unrevealed cells for the sequential reveal!
      const unrevealedPositions: number[] = [];
      for (let i = 0; i < 25; i++) {
        if (!detectedCells[i]) unrevealedPositions.push(i);
      }

      const cellDataList: CellData[] = Array.from({ length: 25 }, (_, i) => ({
        position: i,
        row: Math.floor(i / 5),
        column: i % 5,
        state: detectedCells[i] || 'OCULTA',
        confidence: 1.0,
        confirmedByUser: true,
      }));
      const strat = calculateWin10kFixedStrategy(cellDataList);
      const topSafe = strat.rankedCells
        .filter((c) => c.isRecommended && !detectedCells[c.position])
        .map((c) => c.position);

      const chosenTargets = topSafe.length > 0 ? topSafe.slice(0, 3) : unrevealedPositions.slice(0, 3);
      setSelectedTargets(chosenTargets);

      soundFX.playChestFanfare();
      setScanNotice(
        `✅ Captura escaneada exitosamente: ${data.safe_count} monedas, ${data.mine_count} minas detectadas. ¡Casillas sugeridas listas para destapar!`
      );
      setIsScannerModalOpen(false);
    } catch (err) {
      console.error('Scan error:', err);
      alert('Error al escanear la captura. Se activó el tablero estándar de WIN10K.');
    } finally {
      setIsScanning(false);
    }
  };

  // Quick load of sample image
  const loadPresetSample = async (samplePath: string) => {
    try {
      const res = await fetch(samplePath);
      const blob = await res.blob();
      const file = new File([blob], 'captura_win10k.png', { type: 'image/png' });
      handleScanImage(file);
    } catch (err) {
      console.warn('Error loading preset sample:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f4494] via-[#0d3b82] to-[#082252] text-white flex flex-col items-center justify-between selection:bg-yellow-400 selection:text-black select-none font-sans relative overflow-x-hidden pb-16 sm:pb-8">
      {/* Top Mobile Status Header (Exact match to Photo 1 & 2) */}
      <header className="w-full max-w-md px-4 pt-3 pb-2 flex items-center justify-between text-xs z-30">
        {/* Left: WIN10K Casino Back Button */}
        <button
          type="button"
          onClick={() => {
            soundFX.playTileClick();
            if (onOpenMenu) onOpenMenu('history');
          }}
          className="flex items-center gap-1.5 active:scale-95 transition"
        >
          <div className="w-8 h-8 rounded-full bg-[#0a2350] border border-cyan-400/50 flex flex-col items-center justify-center shadow-md">
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-white" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[6px] font-black uppercase tracking-tighter text-cyan-300 -mt-0.5">Casino</span>
          </div>
          <span className="font-black text-sm tracking-wide text-white drop-shadow">WIN10K</span>
        </button>

        {/* Center: Mines Count Dropdown Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMineDropdown((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0e316a] border border-[#2a56a0] text-cyan-200 font-bold text-xs shadow-inner active:scale-95 transition"
          >
            <span>Mines: {mineCount}</span>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-cyan-400">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {showMineDropdown && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 bg-[#0a224a] border border-cyan-500/40 rounded-2xl p-2 shadow-2xl z-50 grid grid-cols-4 gap-1 max-h-48 overflow-y-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 22, 24].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMineCount(m);
                    setShowMineDropdown(false);
                    soundFX.playTileClick();
                  }}
                  className={`py-1 rounded-lg text-xs font-bold transition ${
                    mineCount === m ? 'bg-cyan-500 text-black' : 'hover:bg-cyan-900/60 text-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Next Multiplier Badge */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-[#facc15] text-[#713f12] font-black text-xs shadow-[0_2px_8px_rgba(250,204,21,0.4)]">
            Next: {nextMultiplier.toFixed(2)}x
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className="w-7 h-7 rounded-lg bg-[#0e316a] border border-[#2a56a0] flex items-center justify-center text-cyan-300 active:scale-95 transition"
            title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
          >
            {soundEnabled ? <SoundOn3D className="w-3.5 h-3.5" /> : <SoundOff3D className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Floating Action Controls: AI Predictor Toggle & Screenshot Scanner Button */}
      <div className="w-full max-w-md px-4 flex items-center justify-between gap-2 z-20 my-1">
        {/* Toggle AI Predictor */}
        <button
          type="button"
          onClick={() => setAiPredictorActive((prev) => !prev)}
          className={`flex-1 py-1.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition shadow-md ${
            aiPredictorActive
              ? 'bg-gradient-to-r from-emerald-950 via-[#064e3b] to-emerald-950 border-emerald-400/80 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
              : 'bg-[#0a2350]/80 border-[#224888] text-slate-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${aiPredictorActive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-slate-500'}`} />
          <span>{aiPredictorActive ? '⚡ PREDICTOR IA' : 'IA APAGADA'}</span>
        </button>

        {/* Inline Scanner Trigger Button (Opens in-place scan sheet) */}
        <button
          type="button"
          onClick={() => {
            soundFX.playTileClick();
            setIsScannerModalOpen(true);
          }}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 border border-cyan-400/60 text-white font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95 transition shrink-0"
        >
          <ScannerIcon3D className="w-4 h-4" />
          <span>📷 Escanear Foto</span>
        </button>
      </div>

      {/* Notice Banner when Scan or Win occurs */}
      {scanNotice && (
        <div className="w-full max-w-md px-4 my-1 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-gradient-to-r from-[#0c2e61] to-[#0a224a] border border-cyan-400/50 p-2.5 rounded-2xl text-xs text-cyan-200 flex items-center justify-between shadow-lg">
            <span className="leading-tight">{scanNotice}</span>
            <button
              type="button"
              onClick={() => setScanNotice(null)}
              className="text-slate-400 hover:text-white px-2 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Center Game Arena */}
      <div className="w-full max-w-md flex flex-col items-center justify-center flex-1 px-3 z-10">
        {/* Banner Section: Jackpot (Photo 1) */}
        {showJackpotBanner ? (
          <div className="w-full text-center relative py-1 mb-1">
            {/* Left Counter: Remaining Safe Count */}
            <div className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-10 h-10 rounded-2xl bg-[#0a2452] border border-[#235099] flex items-center justify-center shadow-lg">
                <StarCoin3D className="w-7 h-7" />
              </div>
              <span className="text-xs font-black text-cyan-200 mt-1">{25 - mineCount - revealedSafeCount}</span>
            </div>

            {/* Title: MINES JACKPOT $930.461,77 */}
            <div className="inline-block">
              <h1 className="text-2xl sm:text-3xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-[#fef08a] via-[#facc15] to-[#f97316] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">
                MINES
              </h1>
              <div className="flex items-center justify-center gap-1 -mt-0.5">
                <span className="text-sm sm:text-base font-black tracking-widest text-[#38bdf8] drop-shadow">
                  JACKPOT
                </span>
                <span className="text-base">🎁</span>
              </div>
              <div className="text-base sm:text-xl font-black text-[#facc15] tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] mt-0.5">
                $930.461,77
              </div>
            </div>

            {/* Right Counter: Mines Count */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-10 h-10 rounded-2xl bg-[#0a2452] border border-[#235099] flex items-center justify-center shadow-lg">
                <Win10kBomb3D className="w-7 h-7" />
              </div>
              <span className="text-xs font-black text-cyan-200 mt-1">{mineCount}</span>
            </div>
          </div>
        ) : null}

        {/* Multiplier Track Carousel Ribbon (Photo 1) */}
        <div className="w-full overflow-hidden my-1 px-1">
          <div className="flex items-center justify-between gap-1 text-[11px] font-black text-cyan-200 bg-[#09224c]/90 p-1.5 rounded-xl border border-[#1e4687]">
            <span className="text-slate-400">‹</span>
            {MULTIPLIERS_3_MINES.slice(0, 6).map((mult, idx) => {
              const isCurrent = revealedSafeCount === idx + 1;
              return (
                <div
                  key={mult}
                  className={`px-2 py-0.5 rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black shadow-[0_0_10px_#facc15] scale-105'
                      : 'text-cyan-300'
                  }`}
                >
                  {mult.toFixed(2)}x
                </div>
              );
            })}
            <span className="text-slate-400">›</span>
          </div>
        </div>

        {/* THE 5x5 WIN10K GAME BOARD WITH SEQUENTIAL SLOW REVEAL OVERLAY */}
        <div className="w-full aspect-square max-w-[370px] bg-gradient-to-b from-[#113a7a]/90 via-[#0c2c63]/90 to-[#071b3e] p-2 sm:p-2.5 rounded-3xl border border-[#2857a4]/80 shadow-[0_15px_35px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] grid grid-cols-5 gap-1.5 sm:gap-2 relative my-1">
          {Array.from({ length: 25 }, (_, pos) => {
            const state = revealedCells[pos];
            const isTarget = selectedTargets.includes(pos) && !state;
            const targetIndex = isTarget ? selectedTargets.indexOf(pos) + 1 : 0;
            const isCurrentlyFlipping = currentlyRevealingPos === pos;
            const isRec = aiPredictorActive && aiRecommendations.includes(pos) && !state;

            return (
              <button
                key={pos}
                type="button"
                disabled={isRevealingSequentially}
                onClick={() => handleCellClick(pos)}
                className={`
                  relative aspect-square rounded-2xl flex items-center justify-center transition-all duration-200 select-none
                  ${!state ? 'hover:scale-[1.03] cursor-pointer active:scale-95' : 'cursor-default'}
                  ${isCurrentlyFlipping ? 'scale-110 ring-4 ring-yellow-400 shadow-[0_0_30px_#facc15] z-30 animate-pulse' : ''}
                  ${isTarget && !isCurrentlyFlipping ? 'ring-2 ring-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.8)] z-10' : ''}
                  ${isRec && !isTarget ? 'ring-1 ring-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : ''}
                `}
              >
                {/* Visual Representation based on State */}
                {state === 'SEGURA' ? (
                  <div className="w-full h-full flex items-center justify-center animate-in zoom-in duration-200">
                    <StarCoin3D className="w-[88%] h-[88%] drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]" />
                  </div>
                ) : state === 'MINA' ? (
                  <div className="w-full h-full flex items-center justify-center animate-in zoom-in duration-200">
                    <Win10kBomb3D className="w-[88%] h-[88%] drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]" />
                  </div>
                ) : state === 'COFRE' ? (
                  <div className="w-full h-full flex items-center justify-center animate-in zoom-in duration-200">
                    <Win10kChest3D className="w-[90%] h-[90%] drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]" />
                  </div>
                ) : (
                  /* UNREVEALED TILE */
                  <div className="w-full h-full relative">
                    <Win10kClosedTile className="w-full h-full" />

                    {/* Target Selected Badge (#1, #2, #3 order badge) */}
                    {isTarget && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg ring-2 ring-white">
                          #{targetIndex}
                        </div>
                        <span className="text-[7px] font-black text-cyan-200 drop-shadow mt-0.5 uppercase tracking-wider">
                          ELEGIDA
                        </span>
                      </div>
                    )}

                    {/* AI Recommendation Badge if not selected */}
                    {isRec && !isTarget && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-400/90 text-slate-950 font-black text-[9px] flex items-center justify-center shadow">
                        ★
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* SEQUENTIAL SLOW REVEAL ACTION BAR (User Request) */}
        <div className="w-full flex items-center justify-between gap-2 px-1 my-1.5">
          {/* Button: Auto-Pick Top 3 AI Recommendations */}
          <button
            type="button"
            disabled={isRevealingSequentially}
            onClick={handleSelectAiTargets}
            className="flex-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-[#173a73] to-[#0f2a57] border border-[#2e5ea6] hover:from-[#1d478a] hover:to-[#173a73] text-cyan-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
            title="Elegir automáticamente las 3 casillas más seguras calculadas con IA"
          >
            <span>⚡ Elegir Top 3 IA</span>
          </button>

          {/* Button: Destapar Casillas Elegidas Lentamente */}
          <button
            type="button"
            disabled={isRevealingSequentially || selectedTargets.length === 0}
            onClick={handleStartSequentialReveal}
            className={`flex-1 py-2 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition ${
              isRevealingSequentially
                ? 'bg-amber-500 text-slate-950 animate-pulse'
                : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.5)]'
            }`}
          >
            <span>{isRevealingSequentially ? '⏳ Destapando...' : `▶ Destapar 1 por 1 (${selectedTargets.length})`}</span>
          </button>
        </div>

        {/* RANDOM & AUTO GAME ROW */}
        <div className="w-full flex items-center justify-between gap-3 px-1 my-1">
          <button
            type="button"
            disabled={isRevealingSequentially}
            onClick={handleRandomPick}
            className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-[#17468e] to-[#123875] border border-[#2b60b3] hover:from-[#1d54ab] hover:to-[#17468e] text-cyan-200 font-bold text-xs tracking-wider uppercase shadow-md active:scale-95 transition"
          >
            RANDOM (3)
          </button>

          <div className="flex items-center gap-2 bg-[#0a2350] px-3 py-1.5 rounded-xl border border-[#1e4687]">
            <button
              type="button"
              disabled={isRevealingSequentially}
              onClick={() => startNewGame()}
              className="text-cyan-300 hover:text-white transition"
              title="Reiniciar ronda"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
              <input
                type="checkbox"
                checked={autoGame}
                onChange={(e) => setAutoGame(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-8 h-4 rounded-full transition-colors relative ${autoGame ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.25 transition-transform ${autoGame ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span>Auto Game</span>
            </label>
          </div>
        </div>

        {/* MAIN BETTING CONTROL PANEL */}
        <div className="w-full bg-gradient-to-b from-[#143c7d] to-[#0c2754] p-3 rounded-2xl border border-[#2556a3] shadow-xl my-1 flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            {/* Blue Circular Repeat/Sync Button */}
            <button
              type="button"
              disabled={isRevealingSequentially}
              onClick={() => startNewGame()}
              className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#2154a4] to-[#143973] border border-[#3b75d1] flex items-center justify-center text-cyan-200 shadow-md active:scale-95 transition shrink-0"
              title="Nueva partida"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Giant Green BET or CASHOUT Button */}
            {isPlaying && revealedSafeCount > 0 ? (
              <button
                type="button"
                disabled={isRevealingSequentially}
                onClick={handleCashout}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.5)] border border-emerald-300 active:scale-95 transition"
              >
                <span>COBRAR ${currentCashoutProfit.toLocaleString('es-CO')}</span>
                <span className="text-xs bg-slate-950/20 px-2 py-0.5 rounded-md font-mono">
                  {currentMultiplier.toFixed(2)}x
                </span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isRevealingSequentially}
                onClick={handleStartSequentialReveal}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-[#4ade80] via-[#22c55e] to-[#16a34a] hover:from-[#86efac] hover:to-[#22c55e] text-slate-950 font-black text-base tracking-wider flex items-center justify-center gap-2.5 shadow-[0_4px_20px_rgba(34,197,94,0.45)] border border-[#86efac] active:scale-95 transition"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-950">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>BET ({selectedTargets.length} ELEGIDAS)</span>
              </button>
            )}
          </div>

          {/* Bet COP Input Field with Controls */}
          <div className="flex items-center justify-between bg-[#0a2046] px-3 py-1.5 rounded-xl border border-[#1b4382]">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400">Bet COP</span>
              <span className="text-sm font-black font-mono text-white tracking-wide">
                {betAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBetAmount((prev) => Math.max(100, prev - 100))}
                className="w-7 h-7 rounded-lg bg-[#143973] border border-[#2b5ea9] font-black text-sm text-cyan-200 flex items-center justify-center active:scale-95"
              >
                -
              </button>

              <button
                type="button"
                onClick={() => setShowBetPresets((prev) => !prev)}
                className="px-2.5 h-7 rounded-lg bg-[#143973] border border-[#2b5ea9] text-xs font-black text-yellow-300 flex items-center justify-center gap-1 active:scale-95"
                title="Valores predeterminados"
              >
                <span>🪙</span>
              </button>

              <button
                type="button"
                onClick={() => setBetAmount((prev) => prev + 100)}
                className="w-7 h-7 rounded-lg bg-[#143973] border border-[#2b5ea9] font-black text-sm text-cyan-200 flex items-center justify-center active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Bet Quick Presets Ribbon */}
          {showBetPresets && (
            <div className="flex items-center justify-between gap-1 pt-1 animate-in fade-in duration-150">
              {[100, 500, 1000, 2000, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setBetAmount(preset);
                    setShowBetPresets(false);
                    soundFX.playTileClick();
                  }}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition ${
                    betAmount === preset
                      ? 'bg-yellow-400 text-slate-950 border-yellow-300 font-black'
                      : 'bg-[#0a2046] border-[#224888] text-cyan-200'
                  }`}
                >
                  ${preset >= 1000 ? `${preset / 1000}k` : preset}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Saldo & Ganancias Status Footer */}
        <div className="w-full flex items-center justify-between px-2 text-xs font-bold text-slate-300 my-1">
          <div>
            Saldo : <span className="text-[#facc15] font-mono font-black">${balance.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div>
            Ganancias : <span className="text-emerald-400 font-mono font-black">${earnings.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </div>

      {/* WIN10K BOTTOM NAVIGATION BAR */}
      <footer className="w-full max-w-md bg-[#0a234e]/95 backdrop-blur-md border-t border-[#1e4687] px-4 py-2 flex items-center justify-between text-xs z-30">
        <button
          type="button"
          onClick={() => setShowMineDropdown(true)}
          className="flex items-center gap-1 font-bold text-cyan-200 active:scale-95"
        >
          <span>MINES</span>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Help Button */}
        <button
          type="button"
          onClick={() => setShowRulesModal(true)}
          className="w-6 h-6 rounded-full bg-[#143973] border border-cyan-400/40 text-cyan-200 font-black text-xs flex items-center justify-center active:scale-95"
        >
          ?
        </button>

        {/* Live Balance */}
        <div className="font-mono font-black text-cyan-300">
          {balance.toFixed(2)} COP
        </div>

        {/* Menu ≡ Drawer Opener */}
        <button
          type="button"
          onClick={() => {
            soundFX.playTileClick();
            if (onOpenMenu) onOpenMenu('menu');
          }}
          className="w-7 h-7 rounded-lg bg-[#143973] border border-[#2b5ea9] text-cyan-200 flex items-center justify-center active:scale-95"
          title="Menú de herramientas y estadísticas"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </footer>

      {/* IN-PLACE SCREENSHOT SCANNER MODAL (DIRECT FROM INITIAL SCREEN) */}
      {isScannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b1e42] border border-cyan-500/50 rounded-3xl max-w-sm w-full p-5 text-slate-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1b3a6e] pb-3">
              <div className="flex items-center gap-2">
                <ScannerIcon3D className="w-5 h-5 text-cyan-400" />
                <h3 className="font-black text-sm text-white">Escanear Captura WIN10K</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleScanImage(file);
              }}
            />

            {/* Drag & Drop or Upload Button */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-500/50 rounded-2xl p-6 text-center cursor-pointer hover:border-cyan-400 hover:bg-[#102d61]/40 transition group"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition shadow-md">
                <ScannerIcon3D className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Toca para subir tu foto o captura</h4>
              <p className="text-[10px] text-cyan-300/80">
                Sube la captura de tu partida en WIN10K (galería o cámara)
              </p>
            </div>

            {/* Quick Demo Previews Buttons */}
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                O prueba con las capturas de muestra:
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => loadPresetSample('/assets/aistudio/IMG_7795_9e7da139.png')}
                  className="w-full py-2 px-3 rounded-xl bg-[#0e2752] hover:bg-[#14366e] border border-[#234c8c] text-left text-xs font-bold text-cyan-200 flex items-center justify-between transition"
                >
                  <span className="truncate">📸 Captura WIN10K (Ronda con Monedas y Minas)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300">Probar</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadPresetSample('/assets/aistudio/IMG_7799_e9109cce.png')}
                  className="w-full py-2 px-3 rounded-xl bg-[#0e2752] hover:bg-[#14366e] border border-[#234c8c] text-left text-xs font-bold text-cyan-200 flex items-center justify-between transition"
                >
                  <span className="truncate">📸 Captura WIN10K (Tablero Cerrado Inicial)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300">Probar</span>
                </button>
              </div>
            </div>

            {/* Scanning Progress Overlay */}
            {isScanning && (
              <div className="bg-[#071530] p-4 rounded-2xl border border-cyan-400/40 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                  <span>{scanStepLabel}</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RULES MODAL */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1d3d] border border-cyan-500/40 rounded-3xl max-w-sm w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-white">Reglas del Juego WIN10K Mines</h3>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              El tablero consta de 25 casillas (5x5). Selecciona el número de minas (por defecto 3). Por cada casilla segura revelada (Moneda de Oro con Estrella), tu multiplicador aumentará.
            </p>
            <div className="bg-[#061228] p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div>🎯 <strong>Probabilidad Inicial:</strong> 22/25 = 88.0% segura</div>
              <div>⚡ <strong>Destape Secuencial Lento:</strong> Selecciona las casillas deseadas (#1, #2, #3) y pulsa "Destapar 1 por 1" para destaparlas lentamente con suspenso.</div>
              <div>📷 <strong>Escáner de Visión:</strong> Sube capturas reales directamente en la pantalla de inicio para cargar el tablero de inmediato.</div>
            </div>
            <button
              type="button"
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
