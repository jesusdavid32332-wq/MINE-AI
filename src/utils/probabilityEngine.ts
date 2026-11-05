import { CellData, GameRecord, PositionStatistics, GlobalStatistics, TrainingSample } from '../types';

export interface LiveRoundProbability {
  totalCells: number; // 25
  totalMinesConfigured: number;
  revealedSafe: number;
  revealedMines: number;
  revealedChests: number;
  remainingHiddenCells: number;
  remainingMines: number;
  exactProbabilityMine: number; // (Remaining Mines) / (Remaining Hidden)
  exactProbabilitySafe: number; // 1 - exactProbabilityMine
  riskLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' | 'CERTAIN_DEATH' | 'CERTAIN_SAFE';
  mathematicalVerdict: string;
  hasEnoughDataForRecommendation: boolean;
}

/**
 * Calculates genuine conditional probability for the current live board.
 * Based strictly on combinatorial logic and game configuration.
 */
export function calculateLiveRoundProbabilities(
  cells: CellData[],
  totalMinesConfigured: number
): LiveRoundProbability {
  const totalCells = 25;
  const safeCount = cells.filter((c) => c.state === 'SEGURA').length;
  const mineCount = cells.filter((c) => c.state === 'MINA').length;
  const chestCount = cells.filter((c) => c.state === 'COFRE').length;
  const hiddenCount = cells.filter((c) => c.state === 'OCULTA' || c.state === 'DESCONOCIDA').length;

  const remainingMines = Math.max(0, totalMinesConfigured - mineCount);

  if (hiddenCount === 0) {
    return {
      totalCells,
      totalMinesConfigured,
      revealedSafe: safeCount,
      revealedMines: mineCount,
      revealedChests: chestCount,
      remainingHiddenCells: 0,
      remainingMines: 0,
      exactProbabilityMine: 0,
      exactProbabilitySafe: 1,
      riskLevel: 'CERTAIN_SAFE',
      mathematicalVerdict: 'Todas las casillas del tablero han sido reveladas.',
      hasEnoughDataForRecommendation: false,
    };
  }

  // Exact conditional probability
  const probMine = remainingMines / hiddenCount;
  const probSafe = 1 - probMine;

  let riskLevel: LiveRoundProbability['riskLevel'] = 'MEDIUM';
  if (probMine >= 1) riskLevel = 'CERTAIN_DEATH';
  else if (probMine === 0) riskLevel = 'CERTAIN_SAFE';
  else if (probMine > 0.5) riskLevel = 'EXTREME';
  else if (probMine > 0.25) riskLevel = 'HIGH';
  else if (probMine > 0.15) riskLevel = 'MEDIUM';
  else if (probMine > 0.08) riskLevel = 'LOW';
  else riskLevel = 'VERY_LOW';

  let mathematicalVerdict = '';
  if (probMine === 0) {
    mathematicalVerdict = `Todas las ${totalMinesConfigured} minas ya se revelaron. Las ${hiddenCount} casillas restantes son 100% seguras.`;
  } else if (remainingMines === hiddenCount) {
    mathematicalVerdict = `Las ${hiddenCount} casillas restantes son todas minas (100% de probabilidad de detonación).`;
  } else {
    mathematicalVerdict = `Quedan ${remainingMines} mina(s) repartidas entre ${hiddenCount} casillas ocultas. Cada casilla oculta tiene exactamente un ${(probMine * 100).toFixed(1)}% de probabilidad de ser mina. Dado que la distribución es aleatoria e independiente, ninguna casilla oculta tiene mayor o menor probabilidad matemática que otra.`;
  }

  return {
    totalCells,
    totalMinesConfigured,
    revealedSafe: safeCount,
    revealedMines: mineCount,
    revealedChests: chestCount,
    remainingHiddenCells: hiddenCount,
    remainingMines,
    exactProbabilityMine: probMine,
    exactProbabilitySafe: probSafe,
    riskLevel,
    mathematicalVerdict,
    hasEnoughDataForRecommendation: true,
  };
}

/**
 * Computes empirical statistics strictly from real recorded user games in Firestore.
 * Does not invent data. Returns zeroed structures if no games exist.
 */
export function computeEmpiricalStatistics(
  games: GameRecord[],
  windowSize: number | 'ALL' = 'ALL',
  trainingSamples: TrainingSample[] = [],
  recognitionThreshold = 0.7
): GlobalStatistics {
  // Sort games descending by date
  const sortedGames = [...games].sort(
    (a, b) => new Date(b.createdAt || b.gameDate).getTime() - new Date(a.createdAt || a.gameDate).getTime()
  );

  const selectedGames =
    windowSize === 'ALL' ? sortedGames : sortedGames.slice(0, windowSize);

  let totalRevealedCells = 0;
  let totalSafeCells = 0;
  let totalMineCells = 0;
  let totalChestCells = 0;
  let wonGames = 0;

  // Initialize 25 position accumulators
  const positionStatsMap: {
    [pos: number]: {
      safe: number;
      mine: number;
      chest: number;
      examined: number;
    };
  } = {};

  for (let i = 0; i < 25; i++) {
    positionStatsMap[i] = { safe: 0, mine: 0, chest: 0, examined: 0 };
  }

  for (const game of selectedGames) {
    if (game.gameStatus === 'win') wonGames++;

    if (Array.isArray(game.cells)) {
      for (const cell of game.cells) {
        const pos = cell.position;
        if (pos >= 0 && pos < 25) {
          positionStatsMap[pos].examined++;
          if (cell.state === 'SEGURA') {
            positionStatsMap[pos].safe++;
            totalSafeCells++;
            totalRevealedCells++;
          } else if (cell.state === 'MINA') {
            positionStatsMap[pos].mine++;
            totalMineCells++;
            totalRevealedCells++;
          } else if (cell.state === 'COFRE') {
            positionStatsMap[pos].chest++;
            totalChestCells++;
            totalRevealedCells++;
          }
        }
      }
    }
  }

  const positions: PositionStatistics[] = [];
  const totalGamesCount = selectedGames.length;

  for (let i = 0; i < 25; i++) {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const item = positionStatsMap[i];
    const totalRevealedInPos = item.safe + item.mine + item.chest;

    positions.push({
      position: i,
      row,
      column: col,
      totalGamesExamined: totalGamesCount,
      safeCount: item.safe,
      mineCount: item.mine,
      chestCount: item.chest,
      revealedRate: totalGamesCount > 0 ? totalRevealedInPos / totalGamesCount : 0,
      mineRate: totalRevealedInPos > 0 ? item.mine / totalRevealedInPos : 0,
      safeRate: totalRevealedInPos > 0 ? item.safe / totalRevealedInPos : 0,
    });
  }

  // Vision evaluation metrics from real training samples
  let correctVisionCount = 0;
  let incorrectVisionCount = 0;
  let rejectedConfidenceCount = 0;

  for (const sample of trainingSamples) {
    if (sample.confidence < recognitionThreshold) {
      rejectedConfidenceCount++;
    } else if (sample.isCorrect) {
      correctVisionCount++;
    } else {
      incorrectVisionCount++;
    }
  }

  const evaluatedAboveThreshold = correctVisionCount + incorrectVisionCount;
  const visionAccuracyRate =
    evaluatedAboveThreshold > 0 ? (correctVisionCount / evaluatedAboveThreshold) * 100 : 0;

  return {
    totalGames: totalGamesCount,
    totalRevealedCells,
    totalSafeCells,
    totalMineCells,
    totalChestCells,
    winRate: totalGamesCount > 0 ? (wonGames / totalGamesCount) * 100 : 0,
    visionAccuracyRate,
    totalEvaluatedSamples: trainingSamples.length,
    correctVisionCount,
    incorrectVisionCount,
    rejectedConfidenceCount,
    positions,
  };
}
