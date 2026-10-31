import { InjectionSite, SymptomType } from '../types';
import { ROTATION_ORDER } from './rotation-engine';

export const STANDARD_DOSES: readonly number[] = [
  0.25, 0.5, 1.0, 1.7, 2.4, 2.5, 5.0, 7.5, 10.0, 12.5, 15.0,
];

export const MIN_WEIGHT_KG = 30;
export const MAX_WEIGHT_KG = 300;

export interface SymptomOption {
  type: SymptomType;
  label: string;
  description: string;
}

export const SYMPTOM_OPTIONS: readonly SymptomOption[] = [
  {
    type: 'nausea',
    label: 'Mide Bulantısı',
    description: 'Hafif rahatsızlık veya kusma hissi',
  },
  {
    type: 'fatigue',
    label: 'Yorgunluk',
    description: 'Halsizlik, enerji düşüklüğü',
  },
  {
    type: 'headache',
    label: 'Baş Ağrısı',
    description: 'Şakak veya baş bölgesinde gerilim',
  },
  {
    type: 'acid_reflux',
    label: 'Mide Yanması / Reflü',
    description: 'Göğüs kafesi veya boğazda yanma',
  },
  {
    type: 'constipation',
    label: 'Kabızlık',
    description: 'Sindirim yavaşlığı veya zorlanma',
  },
  {
    type: 'other',
    label: 'Diğer',
    description: 'Belirtilmeyen diğer yan etkiler',
  },
];

export interface SeverityLevel {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  color: string;
}

export const SEVERITY_LEVELS: readonly SeverityLevel[] = [
  { level: 1, label: 'Hafif', color: '#34C759' },
  { level: 2, label: 'Hafif-Orta', color: '#85C834' },
  { level: 3, label: 'Orta', color: '#FF9500' },
  { level: 4, label: 'Şiddetli', color: '#FF6433' },
  { level: 5, label: 'Çok Şiddetli', color: '#FF3B30' },
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateInjectionInput(
  medicationId?: string,
  doseMg?: number,
  site?: string
): ValidationResult {
  if (!medicationId || !medicationId.trim()) {
    return { isValid: false, error: 'Lütfen bir ilaç seçin.' };
  }

  if (doseMg === undefined || isNaN(doseMg) || doseMg <= 0) {
    return { isValid: false, error: 'Lütfen geçerli bir dozaj (mg) girin.' };
  }

  if (doseMg > 50) {
    return {
      isValid: false,
      error: 'Dozaj değeri 50 mg üzerinde olamaz. Lütfen kontrol edin.',
    };
  }

  if (!site || !ROTATION_ORDER.includes(site as InjectionSite)) {
    return { isValid: false, error: 'Lütfen geçerli bir enjeksiyon bölgesi seçin.' };
  }

  return { isValid: true };
}

export function parseDoseInput(raw: string): number | null {
  if (!raw || !raw.trim()) return null;
  const normalized = raw.trim().replace(',', '.');
  const num = Number(normalized);
  if (isNaN(num) || num <= 0) return null;
  return Number(num.toFixed(2));
}

export function validateWeightInput(weightKg?: number): ValidationResult {
  if (weightKg === undefined || isNaN(weightKg)) {
    return { isValid: false, error: 'Lütfen geçerli bir kilo değeri girin.' };
  }

  if (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
    return {
      isValid: false,
      error: `Kilo değeri ${MIN_WEIGHT_KG} ile ${MAX_WEIGHT_KG} kg arasında olmalıdır.`,
    };
  }

  return { isValid: true };
}

export function parseWeightInput(raw: string): number | null {
  if (!raw || !raw.trim()) return null;
  const normalized = raw.trim().replace(',', '.');
  const num = Number(normalized);
  if (isNaN(num) || num <= 0) return null;
  return Number(num.toFixed(1));
}

export function adjustWeight(current: number, delta: number): number {
  const adjusted = Math.round((current + delta) * 10) / 10;
  if (adjusted < MIN_WEIGHT_KG) return MIN_WEIGHT_KG;
  if (adjusted > MAX_WEIGHT_KG) return MAX_WEIGHT_KG;
  return adjusted;
}

export function validateSymptomInput(
  symptomType?: string,
  severity?: number
): ValidationResult {
  const validTypes = SYMPTOM_OPTIONS.map((opt) => opt.type);
  if (!symptomType || !validTypes.includes(symptomType as SymptomType)) {
    return { isValid: false, error: 'Lütfen geçerli bir yan etki türü seçin.' };
  }

  if (
    severity === undefined ||
    !Number.isInteger(severity) ||
    severity < 1 ||
    severity > 5
  ) {
    return {
      isValid: false,
      error: 'Şiddet derecesi 1 ile 5 arasında bir tam sayı olmalıdır.',
    };
  }

  return { isValid: true };
}
