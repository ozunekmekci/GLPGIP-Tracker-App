import {
  Injection,
  Medication,
  NutritionLog,
  SymptomLog,
  SymptomType,
  UserSettings,
  WeightLog,
} from '../types';
import { SITE_DISPLAY_NAMES } from './rotation-engine';
import { SYMPTOM_OPTIONS } from './modal-helpers';

export interface WeightMetrics {
  startWeight: number | null;
  currentWeight: number | null;
  totalChangeKg: number | null;
  weeklyRateKg: number | null;
  remainingToTargetKg: number | null;
  isTargetReached: boolean;
}

export function calculateWeightMetrics(
  logs: WeightLog[],
  targetWeightKg?: number
): WeightMetrics {
  const activeLogs = logs
    .filter((l) => !l.deletedAt)
    .sort(
      (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
    );

  if (activeLogs.length === 0) {
    return {
      startWeight: null,
      currentWeight: null,
      totalChangeKg: null,
      weeklyRateKg: null,
      remainingToTargetKg: null,
      isTargetReached: false,
    };
  }

  const startLog = activeLogs[0];
  const latestLog = activeLogs[activeLogs.length - 1];

  const startWeight = startLog.weightKg;
  const currentWeight = latestLog.weightKg;

  if (activeLogs.length === 1) {
    let remainingToTargetKg: number | null = null;
    let isTargetReached = false;

    if (targetWeightKg !== undefined) {
      if (currentWeight <= targetWeightKg) {
        remainingToTargetKg = 0;
        isTargetReached = true;
      } else {
        remainingToTargetKg = Number((currentWeight - targetWeightKg).toFixed(1));
      }
    }

    return {
      startWeight,
      currentWeight,
      totalChangeKg: 0,
      weeklyRateKg: 0,
      remainingToTargetKg,
      isTargetReached,
    };
  }

  const totalChangeKg = Number((currentWeight - startWeight).toFixed(1));

  // Time diff in weeks
  const startTime = new Date(startLog.loggedAt).getTime();
  const latestTime = new Date(latestLog.loggedAt).getTime();
  const diffDays = (latestTime - startTime) / (1000 * 3600 * 24);
  const diffWeeks = diffDays / 7;

  let weeklyRateKg = 0;
  if (diffWeeks >= 0.1) {
    weeklyRateKg = Number((totalChangeKg / diffWeeks).toFixed(2));
  }

  let remainingToTargetKg: number | null = null;
  let isTargetReached = false;

  if (targetWeightKg !== undefined) {
    if (startWeight >= targetWeightKg) {
      // Weight loss goal
      if (currentWeight <= targetWeightKg) {
        remainingToTargetKg = 0;
        isTargetReached = true;
      } else {
        remainingToTargetKg = Number((currentWeight - targetWeightKg).toFixed(1));
      }
    } else {
      // Weight gain goal
      if (currentWeight >= targetWeightKg) {
        remainingToTargetKg = 0;
        isTargetReached = true;
      } else {
        remainingToTargetKg = Number((targetWeightKg - currentWeight).toFixed(1));
      }
    }
  }

  return {
    startWeight,
    currentWeight,
    totalChangeKg,
    weeklyRateKg,
    remainingToTargetKg,
    isTargetReached,
  };
}

export interface SymptomSummary {
  symptomType: SymptomType;
  label: string;
  count: number;
  averageSeverity: number;
}

export interface OverallSymptomStats {
  totalCount: number;
  averageSeverity: number;
  breakdown: SymptomSummary[];
}

export function calculateSymptomStats(
  logs: SymptomLog[],
  daysLimit: number = 30,
  nowTimestamp: number = Date.now()
): OverallSymptomStats {
  const windowStart = nowTimestamp - daysLimit * 24 * 3600 * 1000;

  const validLogs = logs.filter((log) => {
    if (log.deletedAt) return false;
    const time = new Date(log.loggedAt).getTime();
    return time >= windowStart && time <= nowTimestamp;
  });

  const totalCount = validLogs.length;
  let totalSeveritySum = 0;

  const typeCounts: Record<SymptomType, { count: number; severitySum: number }> = {
    nausea: { count: 0, severitySum: 0 },
    fatigue: { count: 0, severitySum: 0 },
    headache: { count: 0, severitySum: 0 },
    acid_reflux: { count: 0, severitySum: 0 },
    constipation: { count: 0, severitySum: 0 },
    other: { count: 0, severitySum: 0 },
  };

  for (const log of validLogs) {
    totalSeveritySum += log.severity;
    if (typeCounts[log.symptomType]) {
      typeCounts[log.symptomType].count += 1;
      typeCounts[log.symptomType].severitySum += log.severity;
    }
  }

  const averageSeverity =
    totalCount > 0 ? Number((totalSeveritySum / totalCount).toFixed(1)) : 0;

  const breakdown: SymptomSummary[] = SYMPTOM_OPTIONS.map((opt) => {
    const data = typeCounts[opt.type];
    const avg = data.count > 0 ? Number((data.severitySum / data.count).toFixed(1)) : 0;
    return {
      symptomType: opt.type,
      label: opt.label,
      count: data.count,
      averageSeverity: avg,
    };
  });

  return {
    totalCount,
    averageSeverity,
    breakdown,
  };
}

export interface NextInjectionInfo {
  nextDate: Date | null;
  countdownText: string;
  isOverdue: boolean;
  daysRemaining: number;
  hoursRemaining: number;
}

export function calculateNextInjectionInfo(
  injections: Injection[],
  preferredDay?: number,
  nowTimestamp: number = Date.now()
): NextInjectionInfo {
  const activeInjections = injections
    .filter((inj) => !inj.deletedAt)
    .sort(
      (a, b) => new Date(b.injectedAt).getTime() - new Date(a.injectedAt).getTime()
    );

  if (activeInjections.length === 0) {
    return {
      nextDate: null,
      countdownText: 'İlk doz planlanmadı',
      isOverdue: false,
      daysRemaining: 0,
      hoursRemaining: 0,
    };
  }

  const lastInj = activeInjections[0];
  const lastTime = new Date(lastInj.injectedAt).getTime();
  const nextTime = lastTime + 7 * 24 * 3600 * 1000; // 7 days interval

  const diffMs = nextTime - nowTimestamp;

  if (diffMs < 0) {
    const absDiff = Math.abs(diffMs);
    const days = Math.floor(absDiff / (24 * 3600 * 1000));
    const hours = Math.floor((absDiff % (24 * 3600 * 1000)) / (3600 * 1000));
    const countdownText =
      days === 0 ? `${hours} saat gecikti` : `${days} gün ${hours} saat gecikti`;

    return {
      nextDate: new Date(nextTime),
      countdownText,
      isOverdue: true,
      daysRemaining: -days,
      hoursRemaining: -hours,
    };
  }

  const days = Math.floor(diffMs / (24 * 3600 * 1000));
  const hours = Math.floor((diffMs % (24 * 3600 * 1000)) / (3600 * 1000));

  let countdownText = '';
  if (days === 0 && hours === 0) {
    countdownText = 'Bugün enjeksiyon vakti';
  } else if (days === 0) {
    countdownText = `${hours} saat kaldı`;
  } else {
    countdownText = `${days} gün ${hours} saat kaldı`;
  }

  return {
    nextDate: new Date(nextTime),
    countdownText,
    isOverdue: false,
    daysRemaining: days,
    hoursRemaining: hours,
  };
}

export interface ExportDataPayload {
  medications: Medication[];
  injections: Injection[];
  weightLogs: WeightLog[];
  symptomLogs: SymptomLog[];
  nutritionLogs?: NutritionLog[];
  userSettings: UserSettings;
}

export function generateJsonExport(data: ExportDataPayload): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      userSettings: data.userSettings,
      medications: data.medications,
      injections: data.injections.filter((i) => !i.deletedAt),
      weightLogs: data.weightLogs.filter((w) => !w.deletedAt),
      symptomLogs: data.symptomLogs.filter((s) => !s.deletedAt),
      nutritionLogs: data.nutritionLogs || [],
    },
    null,
    2
  );
}

export function generateCsvExport(data: ExportDataPayload): string {
  const medMap = new Map(data.medications.map((m) => [m.id, m.name]));
  const lines: string[] = [];

  lines.push('--- KLINIK VERI RAPORU ---');
  lines.push(`Rapor Tarihi,${new Date().toLocaleDateString('tr-TR')}`);
  lines.push('');

  // 1. Injections
  lines.push('--- ENJEKSIYONLAR ---');
  lines.push('Tarih,Ilac,Doz (mg),Bolge,Notlar');
  for (const inj of data.injections.filter((i) => !i.deletedAt)) {
    const medName = medMap.get(inj.medicationId) || inj.medicationId;
    const siteName = SITE_DISPLAY_NAMES[inj.site] || inj.site;
    const notesSafe = inj.notes ? `"${inj.notes.replace(/"/g, '""')}"` : '';
    lines.push(
      `${inj.injectedAt},"${medName}",${inj.doseMg},"${siteName}",${notesSafe}`
    );
  }
  lines.push('');

  // 2. Weights
  lines.push('--- KILO TAKIBI ---');
  lines.push('Tarih,Kilo (kg)');
  for (const w of data.weightLogs.filter((w) => !w.deletedAt)) {
    lines.push(`${w.loggedAt},${w.weightKg}`);
  }
  lines.push('');

  // 3. Symptoms
  lines.push('--- YAN ETKILER ---');
  lines.push('Tarih,Belirti,Siddet (1-5),Notlar');
  const symptomLabels: Record<SymptomType, string> = {
    nausea: 'Mide Bulantısı',
    fatigue: 'Yorgunluk',
    headache: 'Baş Ağrısı',
    acid_reflux: 'Mide Yanması / Reflü',
    constipation: 'Kabızlık',
    other: 'Diğer',
  };
  for (const sym of data.symptomLogs.filter((s) => !s.deletedAt)) {
    const label = symptomLabels[sym.symptomType] || sym.symptomType;
    const notesSafe = sym.notes ? `"${sym.notes.replace(/"/g, '""')}"` : '';
    lines.push(`${sym.loggedAt},"${label}",${sym.severity},${notesSafe}`);
  }
  lines.push('');

  // 4. Nutrition
  if (data.nutritionLogs && data.nutritionLogs.length > 0) {
    lines.push('--- BESLENME VE HIDRASYON ---');
    lines.push('Tarih,Protein (g),Su (ml)');
    for (const nut of data.nutritionLogs) {
      lines.push(`${nut.date},${nut.proteinG},${nut.waterMl}`);
    }
  }

  return lines.join('\n');
}
