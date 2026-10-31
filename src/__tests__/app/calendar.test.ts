import React from 'react';
import CalendarScreen, {
  formatDayDetailTitle,
  formatMonthYear,
  MONTH_NAMES_TR,
  SITE_NAMES_TR,
  SYMPTOM_LABELS_TR,
  WEEKDAY_LABELS,
} from '../../app/(tabs)/calendar';

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
  openDatabaseAsync: jest.fn(),
}));

jest.mock('../../services/db', () => ({
  getInjections: jest.fn(async () => []),
  getMedications: jest.fn(async () => []),
  getUserSettings: jest.fn(async () => ({
    id: 'user_settings_singleton',
    dailyProteinTargetG: 100,
    dailyWaterTargetMl: 2500,
    themePreference: 'system',
    updatedAt: new Date().toISOString(),
  })),
  getSymptomLogs: jest.fn(async () => []),
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
    get: jest.fn(() => ({ width: 375, height: 812 })),
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
  default: 'Svg',
  Circle: 'Circle',
  Path: 'Path',
  Rect: 'Rect',
  Defs: 'Defs',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
}));

describe('CalendarScreen and helpers', () => {
  describe('Turkish formatting and localization helpers', () => {
    it('defines 7 Monday-first weekday labels', () => {
      expect(WEEKDAY_LABELS).toEqual([
        'Pzt',
        'Sal',
        'Çar',
        'Per',
        'Cum',
        'Cmt',
        'Paz',
      ]);
    });

    it('defines 12 Turkish month names', () => {
      expect(MONTH_NAMES_TR.length).toBe(12);
      expect(MONTH_NAMES_TR[0]).toBe('Ocak');
      expect(MONTH_NAMES_TR[9]).toBe('Ekim');
      expect(MONTH_NAMES_TR[11]).toBe('Aralık');
    });

    it('formats month and year title correctly', () => {
      expect(formatMonthYear(2026, 10)).toBe('Ekim 2026');
      expect(formatMonthYear(2025, 1)).toBe('Ocak 2025');
    });

    it('formats day detail title correctly', () => {
      expect(formatDayDetailTitle('2026-10-15')).toBe('15 Ekim 2026');
      expect(formatDayDetailTitle('2025-01-01')).toBe('1 Ocak 2025');
      expect(formatDayDetailTitle('invalid')).toBe('invalid');
    });

    it('provides Turkish translation maps for injection sites and symptoms', () => {
      expect(SITE_NAMES_TR.abdomen_left).toBe('Sol Karın');
      expect(SITE_NAMES_TR.thigh_right).toBe('Sağ Uyluk');
      expect(SYMPTOM_LABELS_TR.nausea).toBe('Mide Bulantısı');
      expect(SYMPTOM_LABELS_TR.fatigue).toBe('Yorgunluk');
    });
  });

  describe('CalendarScreen component definition', () => {
    it('exports CalendarScreen as a valid React component function', () => {
      expect(typeof CalendarScreen).toBe('function');
      const element = React.createElement(CalendarScreen);
      expect(React.isValidElement(element)).toBe(true);
    });
  });
});
