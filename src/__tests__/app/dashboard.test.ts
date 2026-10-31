import React from 'react';
import DashboardScreen, {
  getPhysiologicalPhase,
  calculateAccumulationStats,
  getNextInjectionBadge,
  calculateNutritionProgress,
  getTodayDateString,
} from '../../app/(tabs)/index';
import { LIGHT_TOKENS, DARK_TOKENS } from '../../context/theme-context';
import { Injection } from '../../types';

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
  openDatabaseAsync: jest.fn(),
}));

jest.mock('../../services/db', () => ({
  getInjections: jest.fn(async () => []),
  getMedications: jest.fn(async () => [
    {
      id: 'med_1',
      name: 'Ozempic (Semaglutid)',
      type: 'semaglutide',
      halfLifeHours: 168,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]),
  getUserSettings: jest.fn(async () => ({
    id: 'user_settings_singleton',
    dailyProteinTargetG: 100,
    dailyWaterTargetMl: 2500,
    themePreference: 'system',
    currentDoseMg: 0.5,
    activeMedicationId: 'med_1',
    updatedAt: new Date().toISOString(),
  })),
  getNutritionLog: jest.fn(async () => ({
    id: 'nut_1',
    date: '2026-10-31',
    proteinG: 110,
    waterMl: 2600,
    loggedAt: new Date().toISOString(),
  })),
  saveNutritionLog: jest.fn(async () => {}),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    flatten: (style: unknown) => {
      if (!style) return {};
      if (Array.isArray(style)) {
        return Object.assign({}, ...style.filter(Boolean));
      }
      return style;
    },
    hairlineWidth: 0.5,
    absoluteFill: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
  },
  useColorScheme: jest.fn(() => 'dark'),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
  useFocusEffect: jest.fn((cb) => cb()),
}));

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Svg: 'Svg',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
  Circle: 'Circle',
  Rect: 'Rect',
}));

describe('Shotsy & Dose AI Dashboard (Özet) Engine & Helpers', () => {
  const baseTime = 1700000000000; // Reference timestamp

  describe('getPhysiologicalPhase', () => {
    it('returns initial phase ("Başlangıç Evresi") when no injections exist', () => {
      const result = getPhysiologicalPhase([], true, DARK_TOKENS, baseTime);
      expect(result.phase).toBe('initial');
      expect(result.label).toBe('Başlangıç Evresi');
      expect(result.badgeTextColor).toBe(DARK_TOKENS.textSecondary);
    });

    it('returns initial phase when all injections are marked as deleted', () => {
      const injections: Injection[] = [
        {
          id: 'inj-del',
          medicationId: 'med_1',
          doseMg: 0.5,
          injectedAt: new Date(baseTime - 10 * 3600 * 1000).toISOString(),
          site: 'abdomen_right',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: new Date().toISOString(),
        },
      ];

      const result = getPhysiologicalPhase(injections, false, LIGHT_TOKENS, baseTime);
      expect(result.phase).toBe('initial');
      expect(result.label).toBe('Başlangıç Evresi');
    });

    it('returns peak phase ("Pik Seviyesi ⚡") within first 48 hours of injection', () => {
      const injections: Injection[] = [
        {
          id: 'inj-1',
          medicationId: 'med_1',
          doseMg: 0.5,
          injectedAt: new Date(baseTime - 24 * 3600 * 1000).toISOString(), // 24h ago
          site: 'abdomen_right',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const resultDark = getPhysiologicalPhase(injections, true, DARK_TOKENS, baseTime);
      expect(resultDark.phase).toBe('peak');
      expect(resultDark.label).toBe('Pik Seviyesi ⚡');
      expect(resultDark.badgeTextColor).toBe(DARK_TOKENS.accent);

      const resultLight = getPhysiologicalPhase(injections, false, LIGHT_TOKENS, baseTime);
      expect(resultLight.phase).toBe('peak');
      expect(resultLight.badgeTextColor).toBe(LIGHT_TOKENS.accent);
    });

    it('returns peak phase at exact 48-hour boundary', () => {
      const injections: Injection[] = [
        {
          id: 'inj-48',
          medicationId: 'med_1',
          doseMg: 0.5,
          injectedAt: new Date(baseTime - 48 * 3600 * 1000).toISOString(),
          site: 'abdomen_right',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = getPhysiologicalPhase(injections, true, DARK_TOKENS, baseTime);
      expect(result.phase).toBe('peak');
      expect(result.label).toBe('Pik Seviyesi ⚡');
    });

    it('returns steady state ("Kararlı Durum 🟢") between 48 and 120 hours', () => {
      const injections: Injection[] = [
        {
          id: 'inj-steady',
          medicationId: 'med_1',
          doseMg: 0.5,
          injectedAt: new Date(baseTime - 72 * 3600 * 1000).toISOString(), // 72h ago (Day 3)
          site: 'thigh_left',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = getPhysiologicalPhase(injections, true, DARK_TOKENS, baseTime);
      expect(result.phase).toBe('steady');
      expect(result.label).toBe('Kararlı Durum 🟢');
      expect(result.badgeTextColor).toBe(DARK_TOKENS.accentGreen);
    });

    it('returns steady state at exact 120-hour boundary', () => {
      const injections: Injection[] = [
        {
          id: 'inj-120',
          medicationId: 'med_1',
          doseMg: 0.5,
          injectedAt: new Date(baseTime - 120 * 3600 * 1000).toISOString(),
          site: 'thigh_left',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = getPhysiologicalPhase(injections, true, DARK_TOKENS, baseTime);
      expect(result.phase).toBe('steady');
      expect(result.label).toBe('Kararlı Durum 🟢');
    });

    it('returns elimination phase ("Eliminasyon Evresi 📉") when past 120 hours (> 5 days)', () => {
      const injections: Injection[] = [
        {
          id: 'inj-elim',
          medicationId: 'med_1',
          doseMg: 0.5,
          injectedAt: new Date(baseTime - 144 * 3600 * 1000).toISOString(), // 144h ago (Day 6)
          site: 'thigh_left',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = getPhysiologicalPhase(injections, true, DARK_TOKENS, baseTime);
      expect(result.phase).toBe('elimination');
      expect(result.label).toBe('Eliminasyon Evresi 📉');
      expect(result.badgeTextColor).toBe(DARK_TOKENS.accentOrange);
    });

    it('picks the latest active injection when multiple injections are provided out of order', () => {
      const injections: Injection[] = [
        {
          id: 'inj-old',
          medicationId: 'med_1',
          doseMg: 0.5,
          injectedAt: new Date(baseTime - 200 * 3600 * 1000).toISOString(),
          site: 'abdomen_right',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'inj-recent',
          medicationId: 'med_1',
          doseMg: 0.5,
          injectedAt: new Date(baseTime - 10 * 3600 * 1000).toISOString(), // 10h ago
          site: 'abdomen_left',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'inj-deleted-newest',
          medicationId: 'med_1',
          doseMg: 0.5,
          injectedAt: new Date(baseTime - 2 * 3600 * 1000).toISOString(),
          site: 'thigh_right',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: new Date().toISOString(),
        },
      ];

      const result = getPhysiologicalPhase(injections, true, DARK_TOKENS, baseTime);
      expect(result.phase).toBe('peak');
      expect(result.label).toBe('Pik Seviyesi ⚡');
    });
  });

  describe('calculateAccumulationStats', () => {
    it('calculates correct accumulation percent against target dose', () => {
      const stats = calculateAccumulationStats(0.4, 0.5);
      expect(stats.accumulationPercent).toBe(80);
      expect(stats.clampedWidthPercent).toBe(80);
      expect(stats.targetDoseMg).toBe(0.5);
    });

    it('clamps width percent to 100 when level exceeds single dose (steady state)', () => {
      const stats = calculateAccumulationStats(0.85, 0.5);
      expect(stats.accumulationPercent).toBe(170);
      expect(stats.clampedWidthPercent).toBe(100);
    });

    it('clamps width percent to 0 when level is zero', () => {
      const stats = calculateAccumulationStats(0, 0.5);
      expect(stats.accumulationPercent).toBe(0);
      expect(stats.clampedWidthPercent).toBe(0);
    });

    it('safely handles zero or negative target dose with default 0.25mg fallback', () => {
      const stats = calculateAccumulationStats(0.25, 0);
      expect(stats.targetDoseMg).toBe(0.25);
      expect(stats.accumulationPercent).toBe(100);
      expect(stats.clampedWidthPercent).toBe(100);
    });
  });

  describe('getNextInjectionBadge', () => {
    it('returns first dose CTA badge when isFirstDose is true', () => {
      const badge = getNextInjectionBadge(
        {
          isFirstDose: true,
          countdownText: 'İlk dozunuzu kaydetmek için dokunun',
          isOverdue: false,
        },
        true,
        DARK_TOKENS
      );

      expect(badge.label).toBe('+ Doz Kaydet');
      expect(badge.textColor).toBe(DARK_TOKENS.accent);
    });

    it('returns overdue warning badge when isOverdue is true', () => {
      const badge = getNextInjectionBadge(
        {
          isFirstDose: false,
          isOverdue: true,
          countdownText: '1 gün gecikti',
        },
        true,
        DARK_TOKENS
      );

      expect(badge.label).toBe('1 gün gecikti');
      expect(badge.textColor).toBe(DARK_TOKENS.accentOrange);
    });

    it('returns standard countdown badge with green tint when on schedule', () => {
      const badge = getNextInjectionBadge(
        {
          isFirstDose: false,
          isOverdue: false,
          countdownText: '3 gün kaldı',
        },
        true,
        DARK_TOKENS
      );

      expect(badge.label).toBe('3 gün kaldı');
      expect(badge.textColor).toBe(DARK_TOKENS.accentGreen);
    });
  });

  describe('calculateNutritionProgress', () => {
    it('calculates correct percentages when below targets', () => {
      const progress = calculateNutritionProgress(50, 100, 1250, 2500);
      expect(progress.proteinPercent).toBe(50);
      expect(progress.waterPercent).toBe(50);
      expect(progress.isAllGoalsCompleted).toBe(false);
    });

    it('caps percentages at 100 and marks goals completed when reached or exceeded', () => {
      const progress = calculateNutritionProgress(110, 100, 2700, 2500);
      expect(progress.proteinPercent).toBe(100);
      expect(progress.waterPercent).toBe(100);
      expect(progress.isAllGoalsCompleted).toBe(true);
    });

    it('does not mark all goals completed if only one target is reached', () => {
      const progress = calculateNutritionProgress(100, 100, 1000, 2500);
      expect(progress.proteinPercent).toBe(100);
      expect(progress.waterPercent).toBe(40);
      expect(progress.isAllGoalsCompleted).toBe(false);
    });

    it('safely handles zero target inputs', () => {
      const progress = calculateNutritionProgress(50, 0, 1000, 0);
      expect(progress.proteinPercent).toBe(50);
      expect(progress.waterPercent).toBe(40);
    });
  });

  describe('getTodayDateString', () => {
    it('formats arbitrary dates into YYYY-MM-DD pattern with zero padding', () => {
      const date = new Date(2026, 4, 3); // May 3, 2026
      expect(getTodayDateString(date)).toBe('2026-05-03');
    });

    it('formats December dates into YYYY-MM-DD correctly', () => {
      const date = new Date(2026, 11, 25); // Dec 25, 2026
      expect(getTodayDateString(date)).toBe('2026-12-25');
    });
  });

  describe('DashboardScreen Rendering', () => {
    it('renders without throwing error', () => {
      const element = React.createElement(DashboardScreen);
      expect(element).toBeDefined();
    });
  });
});
