import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import {
  db,
  auth,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { GameRecord, CellData, TrainingSample, AppSettings } from '../types';

/**
 * Saves a complete game record and its 25 cell results atomically using a writeBatch.
 * Strictly operates in zero-cost mode: never stores raw base64 images in Firestore.
 * Prevents duplicate game registrations.
 */
export async function saveGameRecord(
  game: Omit<GameRecord, 'userId' | 'createdAt'> & { gameId?: string },
  cells: CellData[]
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado.');

  const gameId = game.gameId || `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Duplicate guard: check if game with this ID already exists
  try {
    const existingDoc = await getDoc(doc(db, 'games', gameId));
    if (existingDoc.exists()) {
      return gameId; // Already saved, prevent duplicate
    }
  } catch (err) {
    // If offline or permission check, proceed to batch
  }

  const now = new Date().toISOString();

  const fullGame: GameRecord = {
    ...game,
    gameId,
    userId: user.uid,
    createdAt: now,
    cells: cells.map((c) => ({
      ...c,
      gameId,
      userId: user.uid,
      cellId: c.cellId || `cell_${gameId}_${c.position}`,
    })),
  };

  const batch = writeBatch(db);

  // 1. Save main game document
  const gameDocRef = doc(db, 'games', gameId);
  batch.set(gameDocRef, {
    gameId: fullGame.gameId,
    userId: fullGame.userId,
    platform: fullGame.platform,
    gameDate: fullGame.gameDate,
    boardSize: 5,
    mineCount: fullGame.mineCount,
    gameStatus: fullGame.gameStatus,
    screenshotUrl: fullGame.screenshotUrl || '',
    revealedCount: fullGame.revealedCount,
    safeCount: fullGame.safeCount,
    mineCountRevealed: fullGame.mineCountRevealed,
    chestCount: fullGame.chestCount,
    createdAt: fullGame.createdAt,
    cells: fullGame.cells,
  });

  // 2. Save individual cell_results for direct indexed querying
  for (const cell of fullGame.cells) {
    const cellDocRef = doc(db, 'cell_results', cell.cellId!);
    batch.set(cellDocRef, {
      cellId: cell.cellId,
      gameId,
      userId: user.uid,
      position: cell.position,
      row: cell.row,
      column: cell.column,
      result: cell.state,
      confirmedByUser: cell.confirmedByUser ?? true,
      recognitionConfidence: cell.confidence ?? 1.0,
      createdAt: now,
    });
  }

  try {
    await batch.commit();
    return gameId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `games/${gameId}`);
  }
}

/**
 * Updates an existing game and its cells.
 */
export async function updateGameRecord(
  gameId: string,
  updatedData: Partial<GameRecord>,
  updatedCells?: CellData[]
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado.');

  const batch = writeBatch(db);
  const gameDocRef = doc(db, 'games', gameId);

  try {
    const existingSnap = await getDoc(gameDocRef);
    if (!existingSnap.exists()) {
      throw new Error('Partida no encontrada.');
    }
    const existingData = existingSnap.data() as GameRecord;
    if (existingData.userId !== user.uid) {
      throw new Error('No tienes permiso para modificar esta partida.');
    }

    const payload: Partial<GameRecord> = {
      ...updatedData,
      userId: user.uid, // preserve immutability
    };

    if (updatedCells) {
      payload.cells = updatedCells;
      // Also update cell_results
      for (const cell of updatedCells) {
        const cellId = cell.cellId || `cell_${gameId}_${cell.position}`;
        const cellRef = doc(db, 'cell_results', cellId);
        batch.set(cellRef, {
          cellId,
          gameId,
          userId: user.uid,
          position: cell.position,
          row: cell.row,
          column: cell.column,
          result: cell.state,
          confirmedByUser: true,
          recognitionConfidence: cell.confidence ?? 1.0,
          createdAt: existingData.createdAt,
        }, { merge: true });
      }
    }

    batch.set(gameDocRef, payload, { merge: true });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `games/${gameId}`);
  }
}

/**
 * Deletes a game record and its associated cell_results.
 */
export async function deleteGameRecord(gameId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado.');

  try {
    // Delete game doc
    const gameDocRef = doc(db, 'games', gameId);
    await deleteDoc(gameDocRef);

    // Delete cell_results matching gameId
    const cellsQuery = query(
      collection(db, 'cell_results'),
      where('userId', '==', user.uid),
      where('gameId', '==', gameId)
    );
    const cellsSnap = await getDocs(cellsQuery);
    const batch = writeBatch(db);
    cellsSnap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `games/${gameId}`);
  }
}

/**
 * Subscribes to real-time updates for all user games.
 */
export function subscribeToUserGames(
  onData: (games: GameRecord[]) => void,
  onError: (err: unknown) => void
): () => void {
  const user = auth.currentUser;
  if (!user) {
    onData([]);
    return () => {};
  }

  const q = query(
    collection(db, 'games'),
    where('userId', '==', user.uid),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const games: GameRecord[] = [];
      snapshot.forEach((doc) => {
        games.push(doc.data() as GameRecord);
      });
      onData(games);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'games');
      onError(error);
    }
  );
}

/**
 * Records a training / validation sample when user confirms or corrects a vision recognition.
 */
export async function recordTrainingSample(
  sample: Omit<TrainingSample, 'sampleId' | 'userId' | 'createdAt'>
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado.');

  const sampleId = `sample_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const fullSample: TrainingSample = {
    ...sample,
    sampleId,
    userId: user.uid,
    createdAt: now,
  };

  try {
    const sampleRef = doc(db, 'training_samples', sampleId);
    await setDoc(sampleRef, fullSample);
    return sampleId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `training_samples/${sampleId}`);
  }
}

/**
 * Subscribes to real-time training samples for the current user.
 */
export function subscribeToTrainingSamples(
  onData: (samples: TrainingSample[]) => void,
  onError: (err: unknown) => void
): () => void {
  const user = auth.currentUser;
  if (!user) {
    onData([]);
    return () => {};
  }

  const q = query(
    collection(db, 'training_samples'),
    where('userId', '==', user.uid),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const samples: TrainingSample[] = [];
      snapshot.forEach((doc) => {
        samples.push(doc.data() as TrainingSample);
      });
      onData(samples);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'training_samples');
      onError(error);
    }
  );
}

/**
 * Gets or initializes user settings.
 */
export async function getUserSettings(userId: string): Promise<AppSettings> {
  const defaultSettings: AppSettings = {
    userId,
    recognitionThreshold: 0.7,
    minimumSamples: 20,
    theme: 'dark',
    hapticFeedback: true,
    updatedAt: new Date().toISOString(),
  };

  try {
    const settingsRef = doc(db, 'app_settings', userId);
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      return snap.data() as AppSettings;
    } else {
      await setDoc(settingsRef, defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `app_settings/${userId}`);
  }
}

/**
 * Updates user settings.
 */
export async function updateUserSettings(
  userId: string,
  updates: Partial<AppSettings>
): Promise<void> {
  try {
    const settingsRef = doc(db, 'app_settings', userId);
    await setDoc(
      settingsRef,
      {
        ...updates,
        userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `app_settings/${userId}`);
  }
}
