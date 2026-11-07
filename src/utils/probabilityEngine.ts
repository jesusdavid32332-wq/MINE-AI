import { CellData, CellState, GameRecord, PositionStatistics, GlobalStatistics, TrainingSample } from '../types';

export interface RankedCell {
  position: number;
  row: number;
  column: number;
  coordinate: string; // e.g. "F1-C1" to "F5-C5"
  state: CellState;
  mathematicalSafeProb: number;
  empiricalSafeRate: number;
  empiricalMineRate: number;
  historicalExaminations: number;
  score: number;
  rank: number;
  isRecommended: boolean;
}

export interface Win10kFixedStrategyState {
  targetSafe: 3;
  fixedMines: 3;
  currentSafeCount: number;
  currentMinesCount: number;
  progressFraction: '0/3' | '1/3' | '2/3' | '3/3';
  progressPercent: number;
  isGameWon: boolean;
  isGameLost: boolean;
  status: 'READY' | 'STEP_1_DONE' | 'STEP_2_DONE' | 'COMPLETED_WIN' | 'LOST_BUSTED';
  nextSafeProbability: number;
  nextMineProbability: number;
  cumulativeWinProbability: number;
  estimatedMultiplier: number;
  statusTitle: string;
  actionGuidance: string;
  uniformProbabilityNote: string;
  rankedCells: RankedCell[];
  disclaimer: string;
}

/**
 * Strategy Engine specifically calibrated for WIN10K:
 * Strictly 3 Mines configured, target exactly 3 Safe tiles.
 */
export function calculateWin10kFixedStrategy(
  cells: CellData[],
  historicalPositions?: PositionStatistics[]
): Win10kFixedStrategyState {
  const safeCount = cells.filter((c) => c.state === 'SEGURA').length;
  const mineCount = cells.filter((c) => c.state === 'MINA').length;
  const hiddenCount = cells.filter((c) => c.state === 'OCULTA' || c.state === 'DESCONOCIDA').length;

  const isGameLost = mineCount > 0;
  const isGameWon = !isGameLost && safeCount >= 3;

  let progressFraction: '0/3' | '1/3' | '2/3' | '3/3' = '0/3';
  let progressPercent = 0;
  if (safeCount >= 3) {
    progressFraction = '3/3';
    progressPercent = 100;
  } else if (safeCount === 2) {
    progressFraction = '2/3';
    progressPercent = 66.7;
  } else if (safeCount === 1) {
    progressFraction = '1/3';
    progressPercent = 33.3;
  }

  // Exact step and cumulative hypergeometric probabilities for 3 mines on 25 tiles
  // Initial: 22/25 = 88.0%, 3-in-a-row: (22/25)*(21/24)*(20/23) = 66.96%
  // 1 safe: 21/24 = 87.5%, 2-remaining: (21/24)*(20/23) = 76.09%
  // 2 safe: 20/23 = 86.96%, 1-remaining: 20/23 = 86.96%
  // 3 safe: 100% completed
  let nextSafeProb = 0.88;
  let cumulativeWinProb = 0.6696;
  let estimatedMultiplier = 1.0;
  let status: Win10kFixedStrategyState['status'] = 'READY';
  let statusTitle = 'Inicio de Ronda (0/3 Casillas Seguras)';
  let actionGuidance = 'Estrategia activa: 3 Minas fijas · Objetivo de 3 Casillas Seguras. Probabilidad matemática inicial: 88.0% segura por casilla.';

  if (isGameLost) {
    status = 'LOST_BUSTED';
    nextSafeProb = 0;
    cumulativeWinProb = 0;
    estimatedMultiplier = 0;
    statusTitle = 'Partida Perdida (Mina Detonada)';
    actionGuidance = 'Se ha revelado una mina en esta ronda. La partida ha finalizado con derrota. Reinicia el tablero para comenzar la siguiente ronda de 3 casillas.';
  } else if (isGameWon) {
    status = 'COMPLETED_WIN';
    nextSafeProb = 1.0;
    cumulativeWinProb = 1.0;
    estimatedMultiplier = 1.48;
    statusTitle = '¡Partida Completada con Éxito! (3/3)';
    actionGuidance = 'Has encontrado exactamente las 3 casillas seguras sin detonar ninguna mina. Objetivo cumplido: Retirada / Cashout recomendada de inmediato para asegurar tus ganancias (~1.48x).';
  } else if (safeCount === 2) {
    status = 'STEP_2_DONE';
    nextSafeProb = 20 / 23; // 86.96%
    cumulativeWinProb = 20 / 23;
    estimatedMultiplier = 1.28;
    statusTitle = 'Progreso 2/3 (+2 Gemas Encontradas)';
    actionGuidance = '¡A solo 1 casilla segura de completar la estrategia! La siguiente casilla oculta tiene exactamente un 86.96% de probabilidad matemática de ser segura.';
  } else if (safeCount === 1) {
    status = 'STEP_1_DONE';
    nextSafeProb = 21 / 24; // 87.5%
    cumulativeWinProb = (21 / 24) * (20 / 23); // 76.09%
    estimatedMultiplier = 1.12;
    statusTitle = 'Progreso 1/3 (+1 Gema Encontrada)';
    actionGuidance = '1ra casilla segura confirmada. Faltan 2 casillas para el objetivo de 3. La siguiente casilla oculta tiene un 87.5% de probabilidad de ser segura.';
  }

  // Build ranking of the 25 cells by estimated safety
  const rawRanked: Array<{
    position: number;
    row: number;
    column: number;
    coordinate: string;
    state: CellState;
    mathematicalSafeProb: number;
    empiricalSafeRate: number;
    empiricalMineRate: number;
    historicalExaminations: number;
    score: number;
  }> = [];

  for (let pos = 0; pos < 25; pos++) {
    const cell = cells.find((c) => c.position === pos);
    const state: CellState = cell?.state || 'OCULTA';
    const row = Math.floor(pos / 5);
    const col = pos % 5;

    let empiricalSafe = 0.88;
    let empiricalMine = 0.12;
    let exams = 0;

    if (historicalPositions && historicalPositions.length > 0) {
      const hist = historicalPositions.find((h) => h.position === pos);
      if (hist && (hist.safeCount + hist.mineCount) > 0) {
        empiricalSafe = hist.safeRate;
        empiricalMine = hist.mineRate;
        exams = hist.safeCount + hist.mineCount + hist.chestCount;
      }
    }

    // Mathematical probability for hidden cells is uniform across remaining hidden cells
    const mathSafe = state === 'SEGURA' ? 1.0 : state === 'MINA' ? 0.0 : nextSafeProb;

    // Safety ranking score:
    // If revealed: safe = 10, mine = -10
    // If hidden: base mathSafe (88%) adjusted slightly by empirical low-mine rate
    // Safety ranking score based purely on verified mathematics and empirical game data:
    let score = mathSafe * 100;
    if (state === 'OCULTA' || state === 'DESCONOCIDA') {
      // If historical user games recorded real observations for this specific tile,
      // factor in the true recorded safety rate without fabricating positional biases.
      if (exams > 0) {
        score += (empiricalSafe - empiricalMine) * 10;
      }
    } else if (state === 'SEGURA') {
      score = -500; // already revealed
    } else if (state === 'MINA') {
      score = -1000; // detonated
    }

      rawRanked.push({
        position: pos,
        row,
        column: col,
        coordinate: `F${row + 1}-C${col + 1}`,
        state,
        mathematicalSafeProb: mathSafe,
        empiricalSafeRate: empiricalSafe,
        empiricalMineRate: empiricalMine,
        historicalExaminations: exams,
        score,
      });
    }

    // Sort by score descending
    const sorted = [...rawRanked].sort((a, b) => b.score - a.score);

    // Assign ranks 1..25 and mark top 3 hidden as recommended
    let hiddenRankCounter = 0;
    const rankedCells: RankedCell[] = sorted.map((item) => {
      let rank = 0;
      let isRecommended = false;

      if (item.state === 'OCULTA' || item.state === 'DESCONOCIDA') {
        hiddenRankCounter++;
        rank = hiddenRankCounter;
        if (hiddenRankCounter <= 3 && !isGameWon && !isGameLost) {
          isRecommended = true;
        }
      }

      return {
        ...item,
        rank,
        isRecommended,
      };
    });

    const nextMineProb = isGameLost ? 1.0 : isGameWon ? 0.0 : Math.max(0, 1 - nextSafeProb);

    return {
      targetSafe: 3,
      fixedMines: 3,
      currentSafeCount: safeCount,
      currentMinesCount: mineCount,
      progressFraction,
      progressPercent,
      isGameWon,
      isGameLost,
      status,
      nextSafeProbability: nextSafeProb,
      nextMineProbability: nextMineProb,
      cumulativeWinProbability: cumulativeWinProb,
      estimatedMultiplier,
      statusTitle,
      actionGuidance,
      uniformProbabilityNote:
        'Todas las casillas ocultas comparten matemáticamente la misma probabilidad teórica en esta ronda. No existe ventaja matemática en ninguna posición sobre otra. Los datos históricos son meramente descriptivos.',
      rankedCells,
      disclaimer:
        'Transparencia Matemática WIN10K: Cada casilla oculta tiene exactamente la misma probabilidad matemática teórica en cada ronda (generador Provably Fair HMAC-SHA256). El ranking combina la probabilidad combinatoria hipergeométrica con la frecuencia histórica de tus partidas reales sin garantizar resultados.',
    };
  }

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
