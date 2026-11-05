export type CellState = 'OCULTA' | 'SEGURA' | 'MINA' | 'COFRE' | 'DESCONOCIDA';

export interface CellData {
  cellId?: string;
  gameId?: string;
  userId?: string;
  position: number; // 0 to 24
  row: number; // 0 to 4
  column: number; // 0 to 4
  state: CellState;
  confidence: number; // 0.0 to 1.0
  confirmedByUser: boolean;
  visualDescription?: string;
  aiPredictedState?: CellState;
}

export interface GameRecord {
  gameId: string;
  userId: string;
  platform: string;
  gameDate: string;
  boardSize: number; // strictly 5
  mineCount: number; // 1 to 24
  gameStatus: 'win' | 'lost' | 'ongoing' | 'analyzed';
  screenshotUrl?: string;
  revealedCount: number;
  safeCount: number;
  mineCountRevealed: number;
  chestCount: number;
  cells: CellData[];
  createdAt: string;
  notes?: string;
}

export interface TrainingSample {
  sampleId: string;
  userId: string;
  imageUrl?: string;
  visualFeatures?: string;
  confirmedClass: CellState;
  modelPrediction: CellState;
  confidence: number;
  isCorrect: boolean;
  createdAt: string;
}

export interface AppSettings {
  userId: string;
  recognitionThreshold: number; // e.g. 0.75
  minimumSamples: number; // e.g. 20
  theme: string;
  hapticFeedback: boolean;
  updatedAt: string;
}

export interface PositionStatistics {
  position: number;
  row: number;
  column: number;
  totalGamesExamined: number;
  safeCount: number;
  mineCount: number;
  chestCount: number;
  revealedRate: number; // safeCount + mineCount + chestCount / totalGames
  mineRate: number; // mineCount / totalRevealed
  safeRate: number; // safeCount / totalRevealed
}

export interface GlobalStatistics {
  totalGames: number;
  totalRevealedCells: number;
  totalSafeCells: number;
  totalMineCells: number;
  totalChestCells: number;
  winRate: number;
  visionAccuracyRate: number;
  totalEvaluatedSamples: number;
  correctVisionCount: number;
  incorrectVisionCount: number;
  rejectedConfidenceCount: number;
  positions: PositionStatistics[];
}

export interface Win10kAudit {
  platform: string;
  official_api_available: boolean;
  architecture: string;
  investigation_result: string;
  honest_disclaimer: string;
}
