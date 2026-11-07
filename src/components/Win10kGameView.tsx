import React, { useState, useMemo, useRef } from 'react';
import {
  StarCoin3D,
  Win10kBomb3D,
  Win10kChest3D,
  Win10kClosedTile,
  SoundOn3D,
  SoundOff3D,
  ScannerIcon3D,
} from './Icons3D';
import { soundFX } from '../utils/soundEffects';
import { CellData, CellState, GameRecord } from '../types';
import { saveGameRecord } from '../services/firestoreService';
import { auth } from '../firebase';
import { optimizeScreenshotForVision } from '../utils/imageOptimizer';
import { PWAInstallButton } from './PWAInstallButton';

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
    return new Set([2, 11, 23]);
  });
  const [revealedCells, setRevealedCells] = useState<{ [pos: number]: CellState }>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isWon, setIsWon] = useState<boolean>(false);

  // Automated Sequential Slow Reveal State after Gemini Vision Scan
  const [isAutoRevealing, setIsAutoRevealing] = useState<boolean>(false);
  const [currentlyFlippingPos, setCurrentlyFlippingPos] = useState<number | null>(null);
  const abortAutoRevealRef = useRef<boolean>(false);
  const pendingDetectedCellsRef = useRef<{ [pos: number]: CellState }>({});

  // In-Place Scanner States (Single photo -> Gemini Vision)
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStepLabel, setScanStepLabel] = useState<string>('');
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [scannedImagePreview, setScannedImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sound Mute Toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundFX.getSoundEnabled());

  // UI Dropdowns & Modals
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

  // Start new round
  const startNewGame = (customMines?: Set<number>) => {
    abortAutoRevealRef.current = true;
    setIsAutoRevealing(false);
    setCurrentlyFlippingPos(null);

    if (balance < betAmount) {
      setScanNotice('⚠️ Saldo insuficiente para realizar esta apuesta.');
      return null;
    }

    soundFX.playTileClick();
    setBalance((prev) => Math.max(0, prev - betAmount));
    setEarnings(0);
    setIsWon(false);
    setGameOver(false);

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

  // Click on a tile directly reveals the cell immediately
  const handleCellClick = (pos: number) => {
    if (isAutoRevealing) return; // Busy running automatic slow reveal
    if (revealedCells[pos]) return;

    let activeMines = minePositions;
    if (!isPlaying) {
      const generated = startNewGame();
      if (!generated) return;
      activeMines = generated;
    }

    revealSingleCell(pos, activeMines);
  };

  // Reveal a single cell directly
  const revealSingleCell = (pos: number, activeMines: Set<number> = minePositions) => {
    if (revealedCells[pos]) return;

    if (activeMines.has(pos)) {
      // BOMB EXPLOSION
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
    } else {
      // SAFE COIN REVEAL
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
    }
  };

  // Cashout / Cobrar
  const handleCashout = () => {
    if (!isPlaying || revealedSafeCount === 0 || isAutoRevealing) return;
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
    setScanNotice(`🎉 ¡Cobraste exitosamente $${currentCashoutProfit.toLocaleString('es-CO')} (${currentMultiplier.toFixed(2)}x)!`);
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

  // AUTOMATED SEQUENTIAL SLOW REVEAL FUNCTION
  // Abre automáticamente una por una y lentamente las casillas investigadas por Gemini
  const revealDetectedCellsSequentially = async (
    targetMap: { [pos: number]: CellState },
    data: any
  ) => {
    abortAutoRevealRef.current = false;
    pendingDetectedCellsRef.current = targetMap;

    const entries = Object.entries(targetMap).map(([p, state]) => ({
      pos: parseInt(p, 10),
      state,
    }));

    if (entries.length === 0) {
      setRevealedCells({});
      setScanNotice(`✅ Tablero inicial cerrado: Todas las 25 casillas están cerradas y listas.`);
      return;
    }

    setIsAutoRevealing(true);
    setRevealedCells({}); // Start clean closed board
    const workingMap: { [pos: number]: CellState } = {};

    for (let i = 0; i < entries.length; i++) {
      if (abortAutoRevealRef.current) break;

      const item = entries[i];
      setCurrentlyFlippingPos(item.pos);
      const row = Math.floor(item.pos / 5) + 1;
      const col = (item.pos % 5) + 1;
      setScanNotice(
        `🤖 Gemini abriendo casillas automáticamente: ${i + 1} de ${entries.length} (Fila ${row}, Col ${col})...`
      );

      // Suspense delay between tile openings (550ms)
      await new Promise((resolve) => setTimeout(resolve, 550));
      if (abortAutoRevealRef.current) break;

      if (item.state === 'SEGURA') {
        soundFX.playGemReveal();
      } else if (item.state === 'MINA') {
        soundFX.playMineDetonation();
      } else if (item.state === 'COFRE') {
        soundFX.playChestFanfare();
      } else {
        soundFX.playTileClick();
      }

      workingMap[item.pos] = item.state;
      setRevealedCells({ ...workingMap });

      // Live update of earnings based on revealed safe count so far
      const safeSoFar = Object.values(workingMap).filter(
        (s) => s === 'SEGURA' || s === 'COFRE'
      ).length;
      if (safeSoFar > 0) {
        const mult = MULTIPLIERS_3_MINES[Math.min(safeSoFar - 1, MULTIPLIERS_3_MINES.length - 1)];
        setEarnings(Math.floor(betAmount * mult));
      }

      // Small pause to admire the uncovered gem or bomb
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    setCurrentlyFlippingPos(null);
    setIsAutoRevealing(false);

    if (!abortAutoRevealRef.current) {
      soundFX.playChestFanfare();
      setScanNotice(
        `✅ ¡Apertura completada! Gemini reveló automáticamente las ${entries.length} casillas detectadas en la foto.`
      );
    }
  };

  // Skip animation to instantly see all revealed cells
  const handleSkipAutoReveal = (targetMap: { [pos: number]: CellState }) => {
    abortAutoRevealRef.current = true;
    setRevealedCells(targetMap);
    setCurrentlyFlippingPos(null);
    setIsAutoRevealing(false);
    soundFX.playChestFanfare();
    const safeTotal = Object.values(targetMap).filter((s) => s === 'SEGURA' || s === 'COFRE').length;
    if (safeTotal > 0) {
      const mult = MULTIPLIERS_3_MINES[Math.min(safeTotal - 1, MULTIPLIERS_3_MINES.length - 1)];
      setEarnings(Math.floor(betAmount * mult));
    }
    setScanNotice(`✅ Casillas abiertas por completo.`);
  };

  // IN-PLACE SINGLE-PHOTO SCANNING FUNCTION (Pure Gemini Vision -> Automatic Slow Reveal)
  const handleScanImage = async (base64OrFile: string | File) => {
    setIsScanning(true);
    setScanProgress(25);
    setScanStepLabel('Optimizando fotografía para la IA...');
    soundFX.playScanSweep();

    let base64String = '';
    let mimeType = 'image/jpeg';

    try {
      const opt = await optimizeScreenshotForVision(base64OrFile, 1200, 0.88);
      base64String = opt.base64;
      mimeType = opt.mimeType;
      setScannedImagePreview(opt.dataUrl);
    } catch {
      if (typeof base64OrFile === 'string') {
        base64String = base64OrFile.replace(/^data:[^;]+;base64,/, '');
        setScannedImagePreview(base64OrFile);
      } else {
        mimeType = base64OrFile.type || 'image/png';
        base64String = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            setScannedImagePreview(res);
            resolve(res.replace(/^data:[^;]+;base64,/, ''));
          };
          reader.readAsDataURL(base64OrFile);
        });
      }
    }

    const pTimer = setInterval(() => {
      setScanProgress((prev) => (prev < 85 ? prev + 15 : prev));
      setScanStepLabel('Gemini investigando cuadrícula, símbolos y posiciones...');
    }, 400);

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

      clearInterval(pTimer);
      setScanProgress(100);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al conectar con Gemini Visión');
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

      // Synchronize mines and game states
      if (newMinePositions.size > 0) {
        setMinePositions(newMinePositions);
      }
      setIsPlaying(true);
      setGameOver(data.detected_game_status === 'lost');
      setIsWon(data.detected_game_status === 'win');

      // Close modal and transition directly to the board
      setIsScannerModalOpen(false);

      // Trigger automatic slow reveal of all detected cells one by one!
      revealDetectedCellsSequentially(detectedCells, data);
    } catch (err: any) {
      console.warn('Scan warning:', err);
      setScanNotice(
        `⚠️ ${err?.message || 'No se pudo completar el análisis de la fotografía'}. Puedes pulsar en el tablero directamente.`
      );
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f4494] via-[#0d3b82] to-[#082252] text-white flex flex-col items-center justify-between selection:bg-yellow-400 selection:text-black select-none font-sans relative overflow-x-hidden pb-14 sm:pb-6">
      {/* 1. COMPACT TOP STATUS HEADER */}
      <header className="w-full max-w-md px-3 pt-2.5 pb-1 flex items-center justify-between text-xs z-30">
        {/* Left: WIN10K Casino Brand / History */}
        <button
          type="button"
          onClick={() => {
            soundFX.playTileClick();
            if (onOpenMenu) onOpenMenu('history');
          }}
          className="flex items-center gap-1.5 active:scale-95 transition"
        >
          <div className="w-7 h-7 rounded-full bg-[#0a2350] border border-cyan-400/50 flex flex-col items-center justify-center shadow-md">
            <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-white" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-black text-xs tracking-wide text-white drop-shadow">WIN10K</span>
        </button>

        {/* Center: Mines Count Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMineDropdown((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#0e316a] border border-[#2a56a0] text-cyan-200 font-bold text-[11px] shadow-inner active:scale-95 transition"
          >
            <span>Mines: {mineCount}</span>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-cyan-400">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {showMineDropdown && (
            <div className="absolute top-7 left-1/2 -translate-x-1/2 w-48 bg-[#0a224a] border border-cyan-500/40 rounded-2xl p-2 shadow-2xl z-50 grid grid-cols-4 gap-1 max-h-48 overflow-y-auto">
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

        {/* Right: Next Multiplier, Sound Toggle, and Mobile PWA Install */}
        <div className="flex items-center gap-1.5">
          <div className="px-2.5 py-0.5 rounded-full bg-[#facc15] text-[#713f12] font-black text-[11px] shadow-[0_2px_6px_rgba(250,204,21,0.35)]">
            {nextMultiplier.toFixed(2)}x
          </div>

          <button
            type="button"
            onClick={handleToggleSound}
            className="w-7 h-7 rounded-lg bg-[#0e316a] border border-[#2a56a0] flex items-center justify-center text-cyan-300 active:scale-95 transition"
            title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
          >
            {soundEnabled ? <SoundOn3D className="w-3.5 h-3.5" /> : <SoundOff3D className="w-3.5 h-3.5" />}
          </button>

          <PWAInstallButton variant="icon-only" />
        </div>
      </header>

      {/* 2. NOTICE BANNER / ACTIVE AUTO-REVEAL CONTROLS */}
      {isAutoRevealing ? (
        <div className="w-full max-w-md px-3 my-0.5 animate-in fade-in duration-200 z-20">
          <div className="bg-gradient-to-r from-amber-950 via-[#451a03] to-[#290e02] border border-yellow-400/90 px-3 py-1.5 rounded-xl text-xs text-yellow-200 flex items-center justify-between shadow-[0_0_20px_rgba(250,204,21,0.4)] animate-pulse">
            <div className="flex items-center gap-2 truncate pr-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping shrink-0" />
              <span className="leading-tight font-black text-white truncate">{scanNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => handleSkipAutoReveal(pendingDetectedCellsRef.current)}
              className="px-2.5 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-[10px] shadow active:scale-95 transition shrink-0"
            >
              ⚡ Abrir Todo
            </button>
          </div>
        </div>
      ) : scanNotice ? (
        <div className="w-full max-w-md px-3 my-0.5 animate-in fade-in duration-200 z-20">
          <div className="bg-[#0b244d] border border-cyan-400/50 px-3 py-1.5 rounded-xl text-xs text-cyan-200 flex items-center justify-between shadow-lg">
            <span className="leading-tight truncate pr-2">{scanNotice}</span>
            <button
              type="button"
              onClick={() => setScanNotice(null)}
              className="text-slate-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      {/* 3. CENTER GAME ARENA (COMPACT VERTICAL DISTRIBUTION) */}
      <div className="w-full max-w-md flex flex-col items-center justify-center flex-1 px-3 z-10 space-y-1">
        {/* Compact Jackpot & Stats Ribbon */}
        <div className="w-full bg-[#0a234f]/90 border border-[#1e4687] rounded-2xl px-3 py-1.5 flex items-center justify-between shadow-md">
          {/* Safe Remaining */}
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-xl bg-[#0d2f66] border border-[#2857a4] flex items-center justify-center shadow-inner">
              <StarCoin3D className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-cyan-300/80">Seguras</span>
              <span className="text-xs font-black text-cyan-100">{25 - mineCount - revealedSafeCount}</span>
            </div>
          </div>

          {/* Center Jackpot Title */}
          <div className="text-center px-1">
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#fef08a] via-[#facc15] to-[#f97316]">
                JACKPOT
              </span>
              <span className="text-xs">🎁</span>
            </div>
            <div className="text-sm font-black text-[#facc15] tracking-tight leading-none">
              $930.461,77
            </div>
          </div>

          {/* Mines Configured */}
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase font-bold text-cyan-300/80">Minas</span>
              <span className="text-xs font-black text-cyan-100">{mineCount}</span>
            </div>
            <div className="w-7 h-7 rounded-xl bg-[#0d2f66] border border-[#2857a4] flex items-center justify-center shadow-inner">
              <Win10kBomb3D className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Multiplier Track Strip */}
        <div className="w-full overflow-hidden px-0.5">
          <div className="flex items-center justify-between gap-1 text-[10px] font-black text-cyan-200 bg-[#09224c]/80 px-2 py-1 rounded-xl border border-[#1e4687]/80">
            {MULTIPLIERS_3_MINES.slice(0, 6).map((mult, idx) => {
              const isCurrent = revealedSafeCount === idx + 1;
              return (
                <div
                  key={mult}
                  className={`px-1.5 py-0.5 rounded-md transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black shadow-[0_0_8px_#facc15]'
                      : 'text-cyan-300/80'
                  }`}
                >
                  {mult.toFixed(2)}x
                </div>
              );
            })}
          </div>
        </div>

        {/* 5x5 WIN10K GAME BOARD (Crisp square, instant tile touch, automatic slow reveal support) */}
        <div className="w-full aspect-square max-w-[325px] sm:max-w-[350px] bg-gradient-to-b from-[#113a7a]/90 via-[#0c2c63]/90 to-[#071b3e] p-2 rounded-2xl border border-[#2857a4]/80 shadow-[0_10px_25px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.15)] grid grid-cols-5 gap-1.5 relative">
          {Array.from({ length: 25 }, (_, pos) => {
            const state = revealedCells[pos];
            const isCurrentlyFlipping = currentlyFlippingPos === pos;

            return (
              <button
                key={pos}
                type="button"
                disabled={isAutoRevealing}
                onClick={() => handleCellClick(pos)}
                className={`
                  relative aspect-square rounded-xl flex items-center justify-center transition-all duration-150 select-none
                  ${!state && !isAutoRevealing ? 'hover:scale-[1.03] cursor-pointer active:scale-95' : 'cursor-default'}
                  ${isCurrentlyFlipping ? 'scale-110 ring-4 ring-yellow-400 shadow-[0_0_30px_#facc15] z-30 animate-pulse' : ''}
                `}
              >
                {state === 'SEGURA' ? (
                  <div className="w-full h-full flex items-center justify-center animate-in zoom-in duration-150">
                    <StarCoin3D className="w-[88%] h-[88%] drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]" />
                  </div>
                ) : state === 'MINA' ? (
                  <div className="w-full h-full flex items-center justify-center animate-in zoom-in duration-150">
                    <Win10kBomb3D className="w-[88%] h-[88%] drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]" />
                  </div>
                ) : state === 'COFRE' ? (
                  <div className="w-full h-full flex items-center justify-center animate-in zoom-in duration-150">
                    <Win10kChest3D className="w-[90%] h-[90%] drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]" />
                  </div>
                ) : (
                  <div className="w-full h-full relative">
                    <Win10kClosedTile className="w-full h-full" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* GEMINI SMART SCANNER SHORTCUT BUTTON (1 Click, Single Photo) */}
        <div className="w-full flex items-center gap-2 pt-0.5">
          <button
            type="button"
            disabled={isAutoRevealing}
            onClick={() => {
              soundFX.playTileClick();
              setIsScannerModalOpen(true);
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 border border-cyan-400/60 text-white font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.35)] active:scale-95 transition"
          >
            <ScannerIcon3D className="w-4 h-4" />
            <span>📷 ESCANEAR FOTO CON GEMINI IA</span>
          </button>

          {onOpenScanner && (
            <button
              type="button"
              disabled={isAutoRevealing}
              onClick={() => {
                soundFX.playTileClick();
                onOpenScanner();
              }}
              className="py-2 px-3 rounded-xl bg-[#0c2854] hover:bg-[#12366e] border border-[#234c8c] text-cyan-200 font-bold text-xs shrink-0 active:scale-95 transition"
              title="Abrir Escáner Dedicado"
            >
              Modo Completo →
            </button>
          )}
        </div>

        {/* 4. COMPACT BETTING AND CASHOUT CONTROLS */}
        <div className="w-full bg-gradient-to-b from-[#143c7d] to-[#0c2754] p-2.5 rounded-2xl border border-[#2556a3] shadow-lg flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {/* Reset / New Game Button */}
            <button
              type="button"
              disabled={isAutoRevealing}
              onClick={() => startNewGame()}
              className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#2154a4] to-[#143973] border border-[#3b75d1] flex items-center justify-center text-cyan-200 shadow-md active:scale-95 transition shrink-0"
              title="Reiniciar ronda"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Giant BET or CASHOUT Button */}
            {isPlaying && revealedSafeCount > 0 ? (
              <button
                type="button"
                disabled={isAutoRevealing}
                onClick={handleCashout}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(16,185,129,0.5)] border border-emerald-300 active:scale-95 transition"
              >
                <span>COBRAR ${currentCashoutProfit.toLocaleString('es-CO')}</span>
                <span className="text-[11px] bg-slate-950/20 px-1.5 py-0.5 rounded font-mono">
                  {currentMultiplier.toFixed(2)}x
                </span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isAutoRevealing}
                onClick={() => startNewGame()}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#4ade80] via-[#22c55e] to-[#16a34a] hover:from-[#86efac] hover:to-[#22c55e] text-slate-950 font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(34,197,94,0.4)] border border-[#86efac] active:scale-95 transition"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-950">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>{isPlaying ? 'JUGANDO (TOCA CASILLAS)' : 'APOSTAR / BET'}</span>
              </button>
            )}
          </div>

          {/* Bet COP Input Row */}
          <div className="flex items-center justify-between bg-[#0a2046] px-3 py-1 rounded-xl border border-[#1b4382]">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400">Bet COP</span>
              <span className="text-xs font-black font-mono text-white tracking-wide">
                {betAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isAutoRevealing}
                onClick={() => setBetAmount((prev) => Math.max(100, prev - 100))}
                className="w-6 h-6 rounded-lg bg-[#143973] border border-[#2b5ea9] font-black text-xs text-cyan-200 flex items-center justify-center active:scale-95"
              >
                -
              </button>

              <button
                type="button"
                disabled={isAutoRevealing}
                onClick={() => setShowBetPresets((prev) => !prev)}
                className="px-2 h-6 rounded-lg bg-[#143973] border border-[#2b5ea9] text-[10px] font-black text-yellow-300 flex items-center justify-center gap-0.5 active:scale-95"
                title="Valores predeterminados"
              >
                <span>🪙</span>
              </button>

              <button
                type="button"
                disabled={isAutoRevealing}
                onClick={() => setBetAmount((prev) => prev + 100)}
                className="w-6 h-6 rounded-lg bg-[#143973] border border-[#2b5ea9] font-black text-xs text-cyan-200 flex items-center justify-center active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Bet Quick Presets Ribbon */}
          {showBetPresets && (
            <div className="flex items-center justify-between gap-1 animate-in fade-in duration-150">
              {[100, 500, 1000, 2000, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setBetAmount(preset);
                    setShowBetPresets(false);
                    soundFX.playTileClick();
                  }}
                  className={`flex-1 py-0.5 rounded-lg text-[9px] font-bold border transition ${
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
        <div className="w-full flex items-center justify-between px-2 text-[11px] font-bold text-slate-300">
          <div>
            Saldo : <span className="text-[#facc15] font-mono font-black">${balance.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div>
            Ganancias : <span className="text-emerald-400 font-mono font-black">${earnings.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </div>

      {/* 5. WIN10K BOTTOM NAVIGATION BAR */}
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

        <button
          type="button"
          onClick={() => setShowRulesModal(true)}
          className="w-6 h-6 rounded-full bg-[#143973] border border-cyan-400/40 text-cyan-200 font-black text-xs flex items-center justify-center active:scale-95"
        >
          ?
        </button>

        <div className="font-mono font-black text-cyan-300 text-xs">
          {balance.toFixed(2)} COP
        </div>

        <button
          type="button"
          onClick={() => {
            soundFX.playTileClick();
            if (onOpenMenu) onOpenMenu('menu');
          }}
          className="w-7 h-7 rounded-lg bg-[#143973] border border-[#2b5ea9] text-cyan-200 flex items-center justify-center active:scale-95"
          title="Menú de herramientas"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </footer>

      {/* 6. IN-PLACE SCREENSHOT SCANNER MODAL (SINGLE PHOTO -> GEMINI VISION -> AUTO SLOW REVEAL) */}
      {isScannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b1e42] border border-cyan-500/50 rounded-3xl max-w-sm w-full p-5 text-slate-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1b3a6e] pb-3">
              <div className="flex items-center gap-2">
                <ScannerIcon3D className="w-5 h-5 text-cyan-400" />
                <h3 className="font-black text-sm text-white">Escáner de Foto Gemini IA</h3>
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

            {/* Single Photo Upload Button */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-500/50 rounded-2xl p-6 text-center cursor-pointer hover:border-cyan-400 hover:bg-[#102d61]/40 transition group"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition shadow-md">
                <ScannerIcon3D className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Subir 1 Fotografía</h4>
              <p className="text-[10px] text-cyan-300/80">
                Toma una foto con tu cámara o selecciona la captura de tu partida en WIN10K.
              </p>
            </div>

            {/* Quick Demo Previews */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                O prueba una captura de muestra:
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/assets/aistudio/IMG_7795_9e7da139.png');
                      const blob = await res.blob();
                      handleScanImage(new File([blob], 'captura_win10k.png', { type: 'image/png' }));
                    } catch (e) {
                      console.warn(e);
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-[#0e2752] hover:bg-[#14366e] border border-[#234c8c] text-left text-xs font-bold text-cyan-200 flex items-center justify-between transition"
                >
                  <span className="truncate">📸 Captura WIN10K (Monedas y Minas)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300">Escanear</span>
                </button>
              </div>
            </div>

            {/* Scanning Progress Bar */}
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

      {/* 7. RULES MODAL */}
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
              <div>📷 <strong>Escáner de Visión Gemini:</strong> Sube una fotografía para que la IA investigue el tablero y abra automáticamente las casillas una por una con suspenso.</div>
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
