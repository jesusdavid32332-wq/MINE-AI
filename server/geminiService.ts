import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[MINES AI] GEMINI_API_KEY no detectada en process.env. Las funciones de visión IA requerirán la clave configurada.');
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

export interface CellDetection {
  position: number; // 0 to 24
  row: number; // 0 to 4
  column: number; // 0 to 4
  state: 'OCULTA' | 'SEGURA' | 'MINA' | 'COFRE' | 'DESCONOCIDA';
  confidence: number; // 0.0 to 1.0
  visual_description: string;
}

export interface BoardAnalysisResult {
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

const SYSTEM_INSTRUCTION = `Eres el sistema especializado de visión computacional de MINES AI para el juego de casino Mines de WIN10K (win10kk.com).
Tu función es inspeccionar con absoluta precisión la captura de pantalla de la partida real del usuario e identificar el estado visual fiel de la cuadrícula de 5 filas por 5 columnas (25 casillas numeradas del 0 al 24 en orden de lectura natural):

MAPA DE COORDENADAS 5x5:
- Fila 0 (superior): Casillas 0, 1, 2, 3, 4 (Coordenadas F1-C1 a F1-C5)
- Fila 1: Casillas 5, 6, 7, 8, 9 (Coordenadas F2-C1 a F2-C5)
- Fila 2 (central): Casillas 10, 11, 12, 13, 14 (Coordenadas F3-C1 a F3-C5)
- Fila 3: Casillas 15, 16, 17, 18, 19 (Coordenadas F4-C1 a F4-C5)
- Fila 4 (inferior): Casillas 20, 21, 22, 23, 24 (Coordenadas F5-C1 a F5-C5)

CRITERIOS DE CLASIFICACIÓN VISUAL ESTRICTA:
1. 'OCULTA': La casilla no ha sido pulsada / permanece cerrada. En WIN10K muestra una ficha redonda, medallón azul o casilla cerrada sin abrir.
   CRÍTICO: Si la casilla no está abierta, NUNCA predigas lo que hay debajo; su estado ES 'OCULTA'.
2. 'SEGURA': Casilla pulsada exitosamente que ha revelado una moneda dorada con estrella central, un diamante azul/verde o un multiplicador de ganancia.
3. 'MINA': Casilla revelada que contiene una bomba negra o roja, mecha encendida con chispa, calavera o estallido.
4. 'COFRE': Casilla que reveló un cofre dorado de tesoro con gemas desbordantes.
5. 'DESCONOCIDA': Únicamente si la casilla está tapada por un cartel emergente, dedo o mancha ilegible.

DATOS DE LA INTERFAZ DE WIN10K A LEER:
- detected_mine_count: Número de minas configurado (ej: 3 minas, visible junto al icono de bomba o título).
- detected_game_status:
  * 'ready': Tablero inicial limpio, todas o casi todas las casillas cerradas, botón 'BET' o 'APUESTA' activo.
  * 'ongoing': Partida en curso con al menos una casilla segura revelada y botón 'CASHOUT' o 'RETIRAR' activo.
  * 'win': Partida ganada y cobrada con éxito.
  * 'lost': Mina detonada visible (partida terminada por explosión).
- quality_assessment:
  * 'CLEAR': Cuadrícula 5x5 claramente visible y distinguible.
  * 'BLURRY': Imagen excesivamente desenfocada o con baja resolución.
  * 'CROPPED': La captura no muestra las 25 casillas completas.
  * 'NOT_MINES_GAME': La imagen no corresponde al juego Mines.
- quality_notes: Explicación honesta y detallada en español de lo observado visualmente en la imagen.`;

export async function analyzeMinesScreenshot(
  imageBase64: string,
  mimeType: string = 'image/png',
  userMinesConfig?: number
): Promise<BoardAnalysisResult> {
  const t0 = Date.now();
  const ai = getAIClient();

  if (!ai) {
    throw new Error(
      'La clave de Gemini no está configurada en el servidor. Por favor verifica las credenciales en Settings > Secrets.'
    );
  }

  // Clean base64 if it has data URL prefix
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  let rawResponseText = '';
  let usedModel = 'gemini-3.1-flash-lite';
  let lastError: any = null;

  // Candidates: Try gemini-3.1-flash-lite first for minimal latency (<2.5s)
  // Fallback to gemini-3.8-flash with LOW thinking if needed
  const modelConfigs = [
    {
      model: 'gemini-3.1-flash-lite',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    },
    {
      model: 'gemini-3.8-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    },
  ];

  for (const { model, config } of modelConfigs) {
    try {
      usedModel = model;
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || 'image/jpeg',
                },
              },
              {
                text: `Inspecciona minuciosamente esta captura de Mines de WIN10K. Determina con rigor el estado de cada una de las 25 casillas (0 a 24), el número de minas configurado (por defecto 3) y el estado de la partida. Devuelve un JSON estructurado.`,
              },
            ],
          },
        ],
        config: {
          ...config,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quality_assessment: {
                type: Type.STRING,
                description: 'CLEAR, BLURRY, CROPPED, o NOT_MINES_GAME',
              },
              quality_notes: {
                type: Type.STRING,
                description: 'Resumen descriptivo en español de lo observado en la captura',
              },
              overall_confidence: {
                type: Type.NUMBER,
                description: 'Confianza de 0.0 a 1.0',
              },
              detected_mine_count: {
                type: Type.INTEGER,
                description: 'Número de minas configuradas en la interfaz (ej: 3)',
              },
              detected_game_status: {
                type: Type.STRING,
                description: 'ready, ongoing, win, o lost',
              },
              bet_amount_detected: {
                type: Type.STRING,
                description: 'Valor de apuesta visible en la interfaz (ej: 500.00 COP) o null si no se aprecia',
              },
              multiplier_detected: {
                type: Type.STRING,
                description: 'Multiplicador visible (ej: 1.10x) o null',
              },
              balance_detected: {
                type: Type.STRING,
                description: 'Saldo visible del usuario (ej: 0.10 COP) o null',
              },
              pattern_notes: {
                type: Type.STRING,
                description: 'Detalles de patrones visuales, simetría y distribución observada en el tablero',
              },
              cells: {
                type: Type.ARRAY,
                description: 'Lista exacta de las 25 casillas de la cuadrícula de 5x5 en orden de la 0 a la 24',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    position: { type: Type.INTEGER, description: 'Índice de la casilla 0 a 24' },
                    state: {
                      type: Type.STRING,
                      description: 'OCULTA, SEGURA, MINA, COFRE, o DESCONOCIDA',
                    },
                    confidence: { type: Type.NUMBER, description: 'Confianza de 0.0 a 1.0' },
                    visual_description: {
                      type: Type.STRING,
                      description: 'Breve descripción visual (ej: Moneda dorada con estrella, Casilla azul cerrada, Bomba detonada)',
                    },
                  },
                  required: ['position', 'state', 'confidence'],
                },
              },
            },
            required: [
              'quality_assessment',
              'quality_notes',
              'overall_confidence',
              'detected_game_status',
              'cells',
            ],
          },
        },
      });

      if (response && response.text) {
        rawResponseText = response.text.trim();
        break;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[MINES AI Vision] Modelo ${model} reportó: ${err?.message || err}. Probando alternativa...`);
    }
  }

  if (!rawResponseText) {
    throw new Error(
      `No se pudo procesar la imagen con Gemini Visión: ${lastError?.message || 'Error de comunicación con la IA'}`
    );
  }

  // Parse structured JSON cleanly
  let parsed: any = null;
  try {
    const cleanJson = rawResponseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    console.error('Error parseando respuesta JSON de Gemini:', rawResponseText);
    throw new Error('La respuesta de Gemini Visión no tuvo formato JSON válido');
  }

  // Validate and map 25 cells
  const cellsMap = new Map<number, CellDetection>();
  if (Array.isArray(parsed.cells)) {
    for (const c of parsed.cells) {
      const pos =
        typeof c.position === 'number' && c.position >= 0 && c.position <= 24
          ? c.position
          : (c.row ?? 0) * 5 + (c.column ?? 0);

      const row = Math.floor(pos / 5);
      const col = pos % 5;
      const validStates = ['OCULTA', 'SEGURA', 'MINA', 'COFRE', 'DESCONOCIDA'];
      const state = validStates.includes(c.state) ? c.state : 'OCULTA';
      const confidence = typeof c.confidence === 'number' ? Math.max(0, Math.min(1, c.confidence)) : 0.95;

      cellsMap.set(pos, {
        position: pos,
        row,
        column: col,
        state,
        confidence,
        visual_description: c.visual_description || (state === 'OCULTA' ? 'Casilla cerrada WIN10K' : state === 'SEGURA' ? 'Moneda de oro con estrella' : state === 'MINA' ? 'Mina detonada' : 'Cofre'),
      });
    }
  }

  // Ensure every single position 0..24 is populated
  const normalizedCells: CellDetection[] = [];
  let safeCount = 0;
  let mineCount = 0;
  let chestCount = 0;
  let hiddenCount = 0;

  for (let i = 0; i < 25; i++) {
    const existing = cellsMap.get(i);
    const cell: CellDetection = existing || {
      position: i,
      row: Math.floor(i / 5),
      column: i % 5,
      state: 'OCULTA',
      confidence: 0.9,
      visual_description: 'Casilla cerrada WIN10K',
    };
    normalizedCells.push(cell);

    if (cell.state === 'SEGURA') safeCount++;
    else if (cell.state === 'MINA') mineCount++;
    else if (cell.state === 'COFRE') chestCount++;
    else if (cell.state === 'OCULTA') hiddenCount++;
  }

  const revealedCount = safeCount + mineCount + chestCount;
  const latencyMs = Date.now() - t0;

  let gameStatus: 'ready' | 'ongoing' | 'win' | 'lost' | 'unknown' = 'unknown';
  if (['ready', 'ongoing', 'win', 'lost'].includes(parsed.detected_game_status)) {
    gameStatus = parsed.detected_game_status;
  } else {
    if (mineCount > 0) gameStatus = 'lost';
    else if (safeCount >= 3) gameStatus = 'win';
    else if (revealedCount === 0) gameStatus = 'ready';
    else gameStatus = 'ongoing';
  }

  const detectedMines = typeof parsed.detected_mine_count === 'number'
    ? parsed.detected_mine_count
    : (userMinesConfig || 3);

  return {
    quality_assessment: parsed.quality_assessment || 'CLEAR',
    quality_notes: parsed.quality_notes || `Análisis visual completado con ${usedModel} (${latencyMs}ms).`,
    overall_confidence: typeof parsed.overall_confidence === 'number' ? parsed.overall_confidence : 0.95,
    detected_mine_count: detectedMines,
    detected_game_status: gameStatus,
    bet_amount_detected: parsed.bet_amount_detected || null,
    multiplier_detected: parsed.multiplier_detected || null,
    balance_detected: parsed.balance_detected || null,
    pattern_notes: parsed.pattern_notes || '',
    revealed_count: revealedCount,
    safe_count: safeCount,
    mine_count: mineCount,
    chest_count: chestCount,
    hidden_count: hiddenCount,
    cells: normalizedCells,
    model_used: usedModel,
    latency_ms: latencyMs,
  };
}
