export type SwimStroke = 'butterfly' | 'backstroke' | 'breaststroke' | 'freestyle' | 'medley';

export type SwimDistance = 50 | 100 | 200 | 400 | 800 | 1500;

export type PoolLength = 25 | 50;

export type SwimmerGender = 'male' | 'female';

export type SwimEventId =
  | '50-fly'
  | '100-fly'
  | '200-fly'
  | '50-back'
  | '100-back'
  | '200-back'
  | '50-breast'
  | '100-breast'
  | '200-breast'
  | '50-free'
  | '100-free'
  | '200-free'
  | '400-free'
  | '800-free'
  | '1500-free'
  | '100-medley'
  | '200-medley'
  | '400-medley';

export interface SwimEvent {
  id: SwimEventId;
  name: string;
  shortName: string;
  stroke: SwimStroke;
  strokeLabel: string;
  distance: SwimDistance;
  poolLengths: PoolLength[];
}

export type MarkContext = 'race' | 'training';

export type MarkModality = 'individual' | 'relay_lead' | 'relay_flying';

export type TimingMethod = 'electronic' | 'manual';

export type WaterFeel = 1 | 2 | 3 | 4 | 5;

export type SplitGranularity = '50m-race' | '25m' | '50m' | '100m';

export interface SplitEntry {
  distance: number;
  cumulativeTimeSec: number;
  strokeCount?: number;
  dolphinKicks?: number;
}

export interface ComputedLapSplit {
  fromDistance: number;
  toDistance: number;
  segmentDistance: number;
  label: string;
  cumulativeTimeSec: number;
  lapTimeSec: number;
  strokeCount?: number;
  dolphinKicks?: number;
}

export interface SwimmerProfile {
  id?: number;
  name: string;
  gender: SwimmerGender;
  birthYear?: number;
  category?: string;
  club?: string;
  defaultPoolLength: PoolLength;
  favoriteEventIds: SwimEventId[];
  updatedAt: string;
}

export interface SwimMark {
  id?: number;
  eventId: SwimEventId;
  timeSec: number;
  date: string;
  venue: string;
  poolLength: PoolLength;
  context: MarkContext;
  modality: MarkModality;
  timing: TimingMethod;
  splits: SplitEntry[];
  splitGranularity?: SplitGranularity;
  include15mSplit?: boolean;
  feel?: WaterFeel;
  notes?: string;
  createdAt: string;
}

export interface SwimGoal {
  id?: number;
  eventId: SwimEventId;
  poolLength: PoolLength;
  targetTimeSec: number;
  targetSplits?: SplitEntry[];
  label?: string;
  updatedAt: string;
}

export interface EventPersonalBests {
  eventId: SwimEventId;
  poolLength: PoolLength;
  /** PB Principal: Mejor marca en Carrera con largada estática (Individual o 1er Relevo) */
  racePB?: SwimMark;
  /** PB de Entrenamiento: Mejor marca en Entrenamiento con largada estática */
  trainingPB?: SwimMark;
  /** Última marca registrada con largada estática */
  latestMark?: SwimMark;
}

export interface GoalGapAnalysis {
  goal: SwimGoal;
  event: SwimEvent;
  targetFinaPoints: number;
  /** Referencia principal: PB de Carrera (o PB de Entrenamiento como fallback secundario identificado) */
  racePB?: SwimMark;
  trainingPB?: SwimMark;
  latestMark?: SwimMark;
  /** Brecha contra PB de Carrera (tiempo actual - objetivo; <= 0 indica objetivo cumplido) */
  gapVsRacePBSec?: number;
  /** Brecha contra PB de Entrenamiento */
  gapVsTrainingPBSec?: number;
  /** Brecha contra última marca */
  gapVsLatestSec?: number;
  achievedInRace: boolean;
  achievedInTraining: boolean;
  progressPercent: number;
}

export type ActiveTab = 'dashboard' | 'register' | 'history' | 'goals';

