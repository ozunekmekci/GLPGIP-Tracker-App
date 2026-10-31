import {
  calculateWeightMetrics,
  calculateSymptomStats,
  calculateNextInjectionInfo,
  generateJsonExport,
  generateCsvExport,
} from './analytics-helpers';
import { Injection, Medication, NutritionLog, SymptomLog, UserSettings, WeightLog } from '../types';

describe('Analytics & Clinical Export Helpers', () => {
  describe('calculateWeightMetrics', () => {
    it('handles empty weight logs safely', () => {
      const metrics = calculateWeightMetrics([]);
      expect(metrics.startWeight).toBeNull();
      expect(metrics.currentWeight).toBeNull();
      expect(metrics.totalChangeKg).toBeNull();
      expect(metrics.weeklyRateKg).toBeNull();
      expect(metrics.remainingToTargetKg).toBeNull();
      expect(metrics.isTargetReached).toBe(false);
    });

    it('handles single weight log correctly', () => {
      const logs: WeightLog[] = [
        {
          id: '1',
          weightKg: 85.0,
          loggedAt: '2026-10-01T08:00:00.000Z',
          createdAt: '2026-10-01T08:00:00.000Z',
          updatedAt: '2026-10-01T08:00:00.000Z',
        },
      ];
      const metrics = calculateWeightMetrics(logs, 75.0);
      expect(metrics.startWeight).toBe(85.0);
      expect(metrics.currentWeight).toBe(85.0);
      expect(metrics.totalChangeKg).toBe(0);
      expect(metrics.weeklyRateKg).toBe(0);
      expect(metrics.remainingToTargetKg).toBe(10.0);
      expect(metrics.isTargetReached).toBe(false);
    });

    it('calculates total change, weekly rate, and target proximity for multiple logs', () => {
      const logs: WeightLog[] = [
        {
          id: '1',
          weightKg: 90.0,
          loggedAt: '2026-10-01T08:00:00.000Z',
          createdAt: '2026-10-01T08:00:00.000Z',
          updatedAt: '2026-10-01T08:00:00.000Z',
        },
        {
          id: '2',
          weightKg: 88.0,
          loggedAt: '2026-10-15T08:00:00.000Z', // 14 days later = 2 weeks
          createdAt: '2026-10-15T08:00:00.000Z',
          updatedAt: '2026-10-15T08:00:00.000Z',
        },
      ];
      const metrics = calculateWeightMetrics(logs, 80.0);
      expect(metrics.startWeight).toBe(90.0);
      expect(metrics.currentWeight).toBe(88.0);
      expect(metrics.totalChangeKg).toBe(-2.0);
      expect(metrics.weeklyRateKg).toBe(-1.0); // -2kg over 2 weeks = -1kg/wk
      expect(metrics.remainingToTargetKg).toBe(8.0);
      expect(metrics.isTargetReached).toBe(false);
    });

    it('detects when target weight is reached', () => {
      const logs: WeightLog[] = [
        {
          id: '1',
          weightKg: 90.0,
          loggedAt: '2026-10-01T08:00:00.000Z',
          createdAt: '2026-10-01T08:00:00.000Z',
          updatedAt: '2026-10-01T08:00:00.000Z',
        },
        {
          id: '2',
          weightKg: 79.5,
          loggedAt: '2026-10-28T08:00:00.000Z',
          createdAt: '2026-10-28T08:00:00.000Z',
          updatedAt: '2026-10-28T08:00:00.000Z',
        },
      ];
      const metrics = calculateWeightMetrics(logs, 80.0);
      expect(metrics.isTargetReached).toBe(true);
      expect(metrics.remainingToTargetKg).toBe(0);
    });
  });

  describe('calculateSymptomStats', () => {
    const baseNow = new Date('2026-10-31T12:00:00.000Z').getTime();

    it('handles empty symptom logs safely', () => {
      const stats = calculateSymptomStats([], 30, baseNow);
      expect(stats.totalCount).toBe(0);
      expect(stats.averageSeverity).toBe(0);
      expect(stats.breakdown.length).toBeGreaterThan(0);
      expect(stats.breakdown.every((b) => b.count === 0)).toBe(true);
    });

    it('aggregates symptoms and filters out logs older than daysLimit', () => {
      const logs: SymptomLog[] = [
        {
          id: 's1',
          symptomType: 'nausea',
          severity: 3,
          loggedAt: '2026-10-30T10:00:00.000Z', // 1 day ago (in limit)
          createdAt: '2026-10-30T10:00:00.000Z',
        },
        {
          id: 's2',
          symptomType: 'nausea',
          severity: 1,
          loggedAt: '2026-10-25T10:00:00.000Z', // 6 days ago (in limit)
          createdAt: '2026-10-25T10:00:00.000Z',
        },
        {
          id: 's3',
          symptomType: 'fatigue',
          severity: 2,
          loggedAt: '2026-10-20T10:00:00.000Z', // 11 days ago (in limit)
          createdAt: '2026-10-20T10:00:00.000Z',
        },
        {
          id: 's4',
          symptomType: 'headache',
          severity: 4,
          loggedAt: '2026-08-01T10:00:00.000Z', // ~90 days ago (out of limit)
          createdAt: '2026-08-01T10:00:00.000Z',
        },
      ];

      const stats = calculateSymptomStats(logs, 30, baseNow);
      expect(stats.totalCount).toBe(3);
      // Severities: 3, 1, 2 -> average = 6 / 3 = 2.0
      expect(stats.averageSeverity).toBe(2.0);

      const nausea = stats.breakdown.find((b) => b.symptomType === 'nausea');
      expect(nausea?.count).toBe(2);
      expect(nausea?.averageSeverity).toBe(2.0);

      const fatigue = stats.breakdown.find((b) => b.symptomType === 'fatigue');
      expect(fatigue?.count).toBe(1);
      expect(fatigue?.averageSeverity).toBe(2.0);

      const headache = stats.breakdown.find((b) => b.symptomType === 'headache');
      expect(headache?.count).toBe(0);
    });
  });

  describe('calculateNextInjectionInfo', () => {
    it('returns fallback info when no injections exist', () => {
      const info = calculateNextInjectionInfo([]);
      expect(info.nextDate).toBeNull();
      expect(info.countdownText).toBe('İlk dozunuzu kaydetmek için dokunun');
      expect(info.isOverdue).toBe(false);
      expect(info.isFirstDose).toBe(true);
    });

    it('calculates remaining countdown when next injection is in the future', () => {
      // Injected 4 days ago, next is in 3 days
      const now = new Date('2026-10-31T12:00:00.000Z').getTime();
      const injectedAt = new Date(now - 4 * 24 * 3600 * 1000).toISOString();

      const injections: Injection[] = [
        {
          id: 'inj1',
          medicationId: 'med1',
          doseMg: 0.5,
          injectedAt,
          site: 'abdomen_left',
          createdAt: injectedAt,
          updatedAt: injectedAt,
        },
      ];

      const info = calculateNextInjectionInfo(injections, undefined, now);
      expect(info.isOverdue).toBe(false);
      expect(info.isFirstDose).toBe(false);
      expect(info.daysRemaining).toBe(3);
      expect(info.countdownText).toBe('3 gün 0 saat kaldı');
    });

    it('detects overdue injection when past 7 days', () => {
      const now = new Date('2026-10-31T12:00:00.000Z').getTime();
      const injectedAt = new Date(now - 9 * 24 * 3600 * 1000).toISOString(); // 9 days ago

      const injections: Injection[] = [
        {
          id: 'inj1',
          medicationId: 'med1',
          doseMg: 0.5,
          injectedAt,
          site: 'abdomen_left',
          createdAt: injectedAt,
          updatedAt: injectedAt,
        },
      ];

      const info = calculateNextInjectionInfo(injections, undefined, now);
      expect(info.isOverdue).toBe(true);
      expect(info.isFirstDose).toBe(false);
      expect(info.countdownText).toContain('gecikti');
    });

    it('filters out deleted injections when determining next injection info', () => {
      const now = new Date('2026-10-31T12:00:00.000Z').getTime();
      const injectedAt = new Date(now - 2 * 24 * 3600 * 1000).toISOString();

      const injections: Injection[] = [
        {
          id: 'inj1',
          medicationId: 'med1',
          doseMg: 0.5,
          injectedAt,
          site: 'abdomen_left',
          deletedAt: '2026-10-30T10:00:00.000Z',
          createdAt: injectedAt,
          updatedAt: injectedAt,
        },
      ];

      const info = calculateNextInjectionInfo(injections, undefined, now);
      expect(info.isFirstDose).toBe(true);
      expect(info.nextDate).toBeNull();
      expect(info.countdownText).toBe('İlk dozunuzu kaydetmek için dokunun');
    });
  });

  describe('generateJsonExport & generateCsvExport', () => {
    const mockMeds: Medication[] = [
      {
        id: 'med1',
        name: 'Semaglutid (Ozempic)',
        type: 'semaglutide',
        halfLifeHours: 168,
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ];

    const mockInjections: Injection[] = [
      {
        id: 'inj1',
        medicationId: 'med1',
        doseMg: 0.25,
        injectedAt: '2026-10-24T09:00:00.000Z',
        site: 'abdomen_left',
        notes: 'İlk doz',
        createdAt: '2026-10-24T09:00:00.000Z',
        updatedAt: '2026-10-24T09:00:00.000Z',
      },
    ];

    const mockWeights: WeightLog[] = [
      {
        id: 'w1',
        weightKg: 85.5,
        loggedAt: '2026-10-24T08:00:00.000Z',
        createdAt: '2026-10-24T08:00:00.000Z',
        updatedAt: '2026-10-24T08:00:00.000Z',
      },
    ];

    const mockSymptoms: SymptomLog[] = [
      {
        id: 's1',
        symptomType: 'nausea',
        severity: 2,
        notes: 'Hafif bulantı',
        loggedAt: '2026-10-25T11:00:00.000Z',
        createdAt: '2026-10-25T11:00:00.000Z',
      },
    ];

    const mockNutrition: NutritionLog[] = [
      {
        id: 'n1',
        proteinG: 95,
        waterMl: 2400,
        date: '2026-10-25',
        createdAt: '2026-10-25T20:00:00.000Z',
        updatedAt: '2026-10-25T20:00:00.000Z',
      },
    ];

    const mockSettings: UserSettings = {
      id: 'usr1',
      activeMedicationId: 'med1',
      currentDoseMg: 0.25,
      targetWeightKg: 75.0,
      dailyProteinTargetG: 100,
      dailyWaterTargetMl: 2500,
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    it('generates valid JSON export string', () => {
      const json = generateJsonExport({
        medications: mockMeds,
        injections: mockInjections,
        weightLogs: mockWeights,
        symptomLogs: mockSymptoms,
        nutritionLogs: mockNutrition,
        userSettings: mockSettings,
      });

      const parsed = JSON.parse(json);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.injections.length).toBe(1);
      expect(parsed.weightLogs.length).toBe(1);
      expect(parsed.symptomLogs.length).toBe(1);
    });

    it('generates valid CSV export string containing all sections', () => {
      const csv = generateCsvExport({
        medications: mockMeds,
        injections: mockInjections,
        weightLogs: mockWeights,
        symptomLogs: mockSymptoms,
        nutritionLogs: mockNutrition,
        userSettings: mockSettings,
      });

      expect(csv).toContain('--- ENJEKSIYONLAR ---');
      expect(csv).toContain('0.25');
      expect(csv).toContain('Sol Karın');
      expect(csv).toContain('--- KILO TAKIBI ---');
      expect(csv).toContain('85.5');
      expect(csv).toContain('--- YAN ETKILER ---');
      expect(csv).toContain('Mide Bulantısı');
      expect(csv).toContain('--- BESLENME VE HIDRASYON ---');
      expect(csv).toContain('2400');
    });
  });
});
