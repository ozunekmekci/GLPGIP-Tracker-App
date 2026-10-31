import {
  getSymptomSeverityBadge,
} from '../../app/(tabs)/analytics';
import { LIGHT_TOKENS, DARK_TOKENS } from '../../context/theme-context';

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
  openDatabaseAsync: jest.fn(),
}));

jest.mock('../../services/db', () => ({
  getWeightLogs: jest.fn(async () => []),
  getSymptomLogs: jest.fn(async () => []),
  getUserSettings: jest.fn(async () => ({
    id: 'user_settings_singleton',
    targetWeightKg: 75,
    themePreference: 'system',
    updatedAt: new Date().toISOString(),
  })),
  deleteWeightLog: jest.fn(async () => {}),
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
  Alert: {
    alert: jest.fn(),
  },
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
  Path: 'Path',
  Line: 'Line',
  Text: 'Text',
}));

describe('AnalyticsScreen Helpers & Logic', () => {
  describe('getSymptomSeverityBadge', () => {
    it('returns neutral badge when count is 0', () => {
      const badge = getSymptomSeverityBadge(0, 0, true, DARK_TOKENS);
      expect(badge.label).toBe('Kayıt yok');
      expect(badge.textColor).toBe(DARK_TOKENS.textSecondary);
    });

    it('returns mild (green) badge when averageSeverity <= 2.0', () => {
      const badge = getSymptomSeverityBadge(3, 1.7, false, LIGHT_TOKENS);
      expect(badge.label).toContain('Hafif');
      expect(badge.label).toContain('1.7/5');
      expect(badge.textColor).toBe(LIGHT_TOKENS.accentGreen);
    });

    it('returns moderate (orange) badge when averageSeverity is between 2.1 and 3.5', () => {
      const badge = getSymptomSeverityBadge(4, 3.0, true, DARK_TOKENS);
      expect(badge.label).toContain('Orta');
      expect(badge.label).toContain('3/5');
      expect(badge.textColor).toBe(DARK_TOKENS.accentOrange);
    });

    it('returns severe (red) badge when averageSeverity > 3.5', () => {
      const badge = getSymptomSeverityBadge(2, 4.5, true, DARK_TOKENS);
      expect(badge.label).toContain('Şiddetli');
      expect(badge.label).toContain('4.5/5');
      expect(badge.textColor).toBe(DARK_TOKENS.accentRed);
    });
  });
});
