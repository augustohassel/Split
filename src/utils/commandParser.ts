import { DraftGoalData, DraftMarkData, MarkContext, PoolLength, SwimEventId, WaterFeel } from '../types';
import { parseTimeInput } from './calculator';
import { SWIM_EVENTS } from './events';

export interface QuickCommandResult {
  isMatch: boolean;
  type?: 'mark' | 'goal';
  draftMark?: DraftMarkData;
  draftGoal?: DraftGoalData;
  rawText: string;
  explanation?: string;
}

/**
 * Normaliza una cadena quitando tildes, pasando a minúsculas y eliminando signos de puntuación extraños.
 */
export function normalizeForSwimMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const STROKE_PATTERNS: { regex: RegExp; stroke: string }[] = [
  { regex: /\b(mariposa|maripo|marip|fly|delfin)\b/i, stroke: 'butterfly' },
  { regex: /\b(espalda|dorso|back|backstroke)\b/i, stroke: 'backstroke' },
  { regex: /\b(pecho|braza|breast|breaststroke)\b/i, stroke: 'breaststroke' },
  { regex: /\b(libre|libres|crol|crawl|free|freestyle)\b/i, stroke: 'freestyle' },
  { regex: /\b(combinado|combinados|medley|ci|im|estilos|cuatro estilos)\b/i, stroke: 'medley' },
];

const DISTANCE_PATTERNS = [1500, 800, 400, 200, 100, 50];

/**
 * Detecta la prueba de natación a partir del texto normalizado
 */
export function extractSwimEvent(text: string): SwimEventId | null {
  let detectedStroke: string | null = null;
  for (const { regex, stroke } of STROKE_PATTERNS) {
    if (regex.test(text)) {
      detectedStroke = stroke;
      break;
    }
  }

  let detectedDistance: number | null = null;
  for (const dist of DISTANCE_PATTERNS) {
    // Buscar el número de distancia precedido o seguido por "m", "mts", "metros" o espacio
    const distRegex = new RegExp(`(?:^|\\b)${dist}(?:\\s*(?:m|mts|metros))?\\b`, 'i');
    if (distRegex.test(text)) {
      detectedDistance = dist;
      break;
    }
  }

  if (!detectedDistance) {
    return null;
  }

  // Si no se especificó estilo pero sí distancia, en natación la distancia reina suele ser libre por defecto
  // a menos que sea 100 CI o distancias exclusivas de libre (400, 800, 1500 libre/medley)
  if (!detectedStroke) {
    if (detectedDistance === 400) {
      if (text.includes('ci') || text.includes('medley') || text.includes('combinado')) {
        detectedStroke = 'medley';
      } else {
        detectedStroke = 'freestyle';
      }
    } else if (detectedDistance === 800 || detectedDistance === 1500) {
      detectedStroke = 'freestyle';
    } else {
      return null;
    }
  }

  const candidateId = `${detectedDistance}-${
    detectedStroke === 'butterfly'
      ? 'fly'
      : detectedStroke === 'backstroke'
      ? 'back'
      : detectedStroke === 'breaststroke'
      ? 'breast'
      : detectedStroke === 'freestyle'
      ? 'free'
      : 'medley'
  }` as SwimEventId;

  const validEvent = SWIM_EVENTS.find((e) => e.id === candidateId);
  return validEvent ? validEvent.id : null;
}

/**
 * Detecta el tamaño de la pileta (25m o 50m)
 */
export function extractPoolLength(text: string, defaultPool: PoolLength = 25): PoolLength {
  if (/\b(?:pileta\s+(?:de\s+)?50|en\s+50m?|50\s*(?:m|mts|metros)\b|olimpica|larga)\b/i.test(text)) {
    return 50;
  }
  if (/\b(?:pileta\s+(?:de\s+)?25|en\s+25m?|25\s*(?:m|mts|metros)\b|corta)\b/i.test(text)) {
    return 25;
  }
  return defaultPool;
}

/**
 * Detecta el contexto de la marca (carrera vs entrenamiento)
 */
export function extractContext(text: string): MarkContext {
  if (/\b(entrenamiento|entreno|practica|pile)\b/i.test(text)) {
    return 'training';
  }
  return 'race';
}

/**
 * Detecta la sensación en el agua (1 a 5)
 */
export function extractFeel(text: string): WaterFeel | undefined {
  const feelMatch = text.match(/\b(?:sensacion|feel|sintiendome|senti|nota)\s*(?:en\s+el\s+agua\s*)?(?:de\s*|:\s*)?([1-5])(?:\/5|\s|$|\b)/i);
  if (feelMatch) {
    const val = parseInt(feelMatch[1], 10);
    if (val >= 1 && val <= 5) {
      return val as WaterFeel;
    }
  }
  return undefined;
}

/**
 * Detecta posibles menciones de sede o torneo
 */
export function extractVenue(text: string): string | undefined {
  // Ejemplos: "en CENARD", "en River", "torneo CENARD", "sede Parque Roca"
  const venueMatch = text.match(/\b(?:en|torneo|sede|club)\s+([A-Za-z0-9ÁÉÍÓÚáéíóúñÑ\s]+?)(?=(?:\s+(?:en\s+25|en\s+50|pileta|sensacion|tiempo|con|el\s+dia|fecha)|$))/i);
  if (venueMatch) {
    const candidate = venueMatch[1].trim();
    // Excluir si la coincidencia fue la pileta ("25m", "50m") o estilo
    if (!/^(25|50)\s*(m|mts|metros)?$/i.test(candidate) && !/^(carrera|entrenamiento)$/i.test(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Detecta el tiempo registrado o tiempo meta
 */
export function extractTime(text: string): number | null {
  // 1. Caso explícito: "sub 25", "sub 1:00", "bajar de 26"
  const subMatch = text.match(/\b(?:sub|bajar\s+de)\s+([0-9:.,]+)/i);
  if (subMatch) {
    const parsed = parseTimeInput(subMatch[1]);
    if (parsed && parsed > 10 && parsed < 3600) {
      return parsed;
    }
  }

  // 2. Extraer candidatos de tiempo en formato mm:ss.cc, mm.ss.cc, o ss.cc
  // Ejemplos: "1:02.15", "1.02.15", "26.40", "26,40", "15:20.48", "2:15.30"
  const candidateMatches = text.match(/\b\d{1,2}(?::|\.)\d{2}(?::|\.|,)\d{1,2}\b|\b\d{1,2}(?::|\.|,)\d{2}\b/g);

  if (candidateMatches && candidateMatches.length > 0) {
    for (const match of candidateMatches) {
      const parsed = parseTimeInput(match);
      // Validar tiempos razonables en natación (ej. entre 18s y 3600s)
      if (parsed !== null && parsed >= 18 && parsed <= 3600) {
        return parsed;
      }
    }
  }

  // 3. Caso números enteros o con 1 decimal en contexto de tiempo (ej. "en 26 segundos", "hice 25")
  const secWordMatch = text.match(/\b(?:tiempo\s*(?:de)?|marca\s*(?:de)?|hice|clave|toque\s*(?:en)?|en)\s+(\d{2}(?:[.,]\d{1,2})?)\s*(?:s|seg|segundos)?\b/i);
  if (secWordMatch) {
    const parsed = parseTimeInput(secWordMatch[1]);
    if (parsed !== null && parsed >= 18 && parsed <= 3600) {
      return parsed;
    }
  }

  return null;
}

/**
 * Interpreta un mensaje en lenguaje natural como un comando rápido de natación (100% offline).
 */
export function parseQuickSwimCommand(
  rawText: string,
  defaultPool: PoolLength = 25
): QuickCommandResult {
  if (!rawText || typeof rawText !== 'string') {
    return { isMatch: false, rawText: '' };
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return { isMatch: false, rawText };
  }

  const normalized = normalizeForSwimMatch(trimmed);

  // Determinar si es un comando de Objetivo
  const isGoal = /\b(objetivo|meta|target|quiero bajar|proximo objetivo|plan)\b/i.test(normalized);

  const eventId = extractSwimEvent(normalized);
  const timeSec = extractTime(normalized);

  if (!eventId || timeSec === null) {
    return { isMatch: false, rawText: trimmed };
  }

  const poolLength = extractPoolLength(normalized, defaultPool);

  // 100m Combinado solo existe en pileta de 25m
  const effectivePoolLength: PoolLength = eventId === '100-medley' ? 25 : poolLength;

  if (isGoal) {
    const draftGoal: DraftGoalData = {
      eventId,
      poolLength: effectivePoolLength,
      targetTimeSec: timeSec,
      label: 'Meta conversacional',
      confirmed: false,
    };

    return {
      isMatch: true,
      type: 'goal',
      draftGoal,
      rawText: trimmed,
      explanation: `Detecté un objetivo para ${eventId} en ${effectivePoolLength}m con meta de ${timeSec}s.`,
    };
  }

  const context = extractContext(normalized);
  const feel = extractFeel(normalized);
  const venue = extractVenue(trimmed);
  const todayStr = new Date().toISOString().slice(0, 10);

  const draftMark: DraftMarkData = {
    eventId,
    timeSec,
    poolLength: effectivePoolLength,
    date: todayStr,
    venue: venue || (context === 'race' ? 'Torneo' : 'Pileta habitual'),
    context,
    modality: 'individual',
    timing: context === 'race' ? 'electronic' : 'manual',
    feel,
    notes: trimmed,
    confirmed: false,
  };

  return {
    isMatch: true,
    type: 'mark',
    draftMark,
    rawText: trimmed,
    explanation: `Detecté una marca de ${eventId} en ${effectivePoolLength}m con tiempo de ${timeSec}s (${context === 'race' ? 'Carrera' : 'Entrenamiento'}).`,
  };
}

