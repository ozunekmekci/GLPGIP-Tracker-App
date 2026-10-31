export type MedicationType = 'semaglutide' | 'tirzepatide' | 'retatrutide' | 'custom';

export interface Medication {
  id: string;
  name: string;
  type: MedicationType;
  halfLifeHours: number;
  createdAt: string;
}

export type InjectionSite =
  | 'abdomen_left'
  | 'abdomen_right'
  | 'thigh_left'
  | 'thigh_right'
  | 'arm_left'
  | 'arm_right';

export interface Injection {
  id: string;
  medicationId: string;
  doseMg: number;
  injectedAt: string;
  site: InjectionSite;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface WeightLog {
  id: string;
  weightKg: number;
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type SymptomType =
  | 'nausea'
  | 'fatigue'
  | 'headache'
  | 'acid_reflux'
  | 'constipation'
  | 'other';

export interface SymptomLog {
  id: string;
  symptomType: SymptomType;
  severity: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  loggedAt: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface NutritionLog {
  id: string;
  proteinG: number;
  waterMl: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  activeMedicationId?: string;
  currentDoseMg?: number;
  preferredInjectionDay?: number;
  targetWeightKg?: number;
  dailyProteinTargetG: number;
  dailyWaterTargetMl: number;
  updatedAt: string;
}
