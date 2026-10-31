import {
  formatSiteRelativeUsage,
  getTitrationSteps,
  getTitrationStepStatus,
  ANATOMICAL_ZONES,
  STANDARD_TITRATION_STEPS,
  TIRZEPATIDE_TITRATION_STEPS,
} from '../../app/(tabs)/medication';
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
    currentDoseMg: 0.5,
    activeMedicationId: 'med_1',
    preferredInjectionDay: 1,
    dailyProteinTargetG: 100,
    dailyWaterTargetMl: 2500,
    themePreference: 'system',
    updatedAt: new Date().toISOString(),
  })),
  deleteInjection: jest.fn(async () => {}),
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

describe('MedicationScreen Helpers & Business Logic', () => {
  const baseTime = new Date('2026-10-31T12:00:00.000Z').getTime();

  describe('formatSiteRelativeUsage', () => {
    it('returns "Hiç kullanılmadı" when lastUsedAt is null', () => {
      expect(formatSiteRelativeUsage(null, baseTime)).toBe('Hiç kullanılmadı');
    });

    it('returns "Az önce" when used under 60 minutes ago', () => {
      const recent = new Date(baseTime - 30 * 60 * 1000).toISOString();
      expect(formatSiteRelativeUsage(recent, baseTime)).toBe('Az önce');
    });

    it('returns "X saat önce" when used within 24 hours', () => {
      const fiveHoursAgo = new Date(baseTime - 5 * 3600 * 1000).toISOString();
      expect(formatSiteRelativeUsage(fiveHoursAgo, baseTime)).toBe('5 saat önce');
    });

    it('returns "1 gün önce" when used 1 day ago', () => {
      const oneDayAgo = new Date(baseTime - 24 * 3600 * 1000).toISOString();
      expect(formatSiteRelativeUsage(oneDayAgo, baseTime)).toBe('1 gün önce');
    });

    it('returns "3 gün önce" when used 3 days ago', () => {
      const threeDaysAgo = new Date(baseTime - 3 * 24 * 3600 * 1000).toISOString();
      expect(formatSiteRelativeUsage(threeDaysAgo, baseTime)).toBe('3 gün önce');
    });

    it('returns "X ay önce" when used 30+ days ago', () => {
      const twoMonthsAgo = new Date(baseTime - 65 * 24 * 3600 * 1000).toISOString();
      expect(formatSiteRelativeUsage(twoMonthsAgo, baseTime)).toBe('2 ay önce');
    });
  });

  describe('getTitrationSteps', () => {
    it('returns standard 5-step semaglutide doses by default', () => {
      expect(getTitrationSteps()).toEqual(STANDARD_TITRATION_STEPS);
      expect(getTitrationSteps('semaglutide')).toEqual([0.25, 0.5, 1.0, 1.7, 2.4]);
    });

    it('returns tirzepatide titration steps for tirzepatide', () => {
      expect(getTitrationSteps('tirzepatide')).toEqual(TIRZEPATIDE_TITRATION_STEPS);
      expect(getTitrationSteps('tirzepatide')).toEqual([2.5, 5.0, 7.5, 10.0, 12.5, 15.0]);
    });
  });

  describe('getTitrationStepStatus', () => {
    const mockInjections: Injection[] = [
      {
        id: 'inj_1',
        medicationId: 'med_1',
        doseMg: 0.25,
        site: 'abdomen_left',
        injectedAt: '2026-10-01T10:00:00.000Z',
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      },
    ];

    it('marks matching step as active', () => {
      expect(getTitrationStepStatus(0.5, 0.5, mockInjections)).toBe('active');
    });

    it('marks lower step as completed', () => {
      expect(getTitrationStepStatus(0.25, 0.5, mockInjections)).toBe('completed');
    });

    it('marks higher step as upcoming', () => {
      expect(getTitrationStepStatus(1.0, 0.5, mockInjections)).toBe('upcoming');
    });

    it('marks step as completed if user has taken a higher injection even if currentDose is lower', () => {
      const pastInjs: Injection[] = [
        {
          id: 'inj_past',
          medicationId: 'med_1',
          doseMg: 1.0,
          site: 'abdomen_left',
          injectedAt: '2026-09-01T10:00:00.000Z',
          createdAt: '2026-09-01T10:00:00.000Z',
          updatedAt: '2026-09-01T10:00:00.000Z',
        },
      ];
      expect(getTitrationStepStatus(1.0, 0.5, pastInjs)).toBe('completed');
    });
  });

  describe('ANATOMICAL_ZONES', () => {
    it('contains all 6 required anatomical zones', () => {
      expect(ANATOMICAL_ZONES).toHaveLength(6);
      const keys = ANATOMICAL_ZONES.map((z) => z.key);
      expect(keys).toContain('abdomen_left');
      expect(keys).toContain('abdomen_right');
      expect(keys).toContain('thigh_left');
      expect(keys).toContain('thigh_right');
      expect(keys).toContain('arm_left');
      expect(keys).toContain('arm_right');
    });

    it('has descriptive zone names adhering to anatomical specifications', () => {
      const abdomenLeft = ANATOMICAL_ZONES.find((z) => z.key === 'abdomen_left');
      expect(abdomenLeft?.zoneName).toMatch(/Abdomen|Karın/);
      const thighRight = ANATOMICAL_ZONES.find((z) => z.key === 'thigh_right');
      expect(thighRight?.zoneName).toMatch(/Uyluk|Bacak/);
      const armLeft = ANATOMICAL_ZONES.find((z) => z.key === 'arm_left');
      expect(armLeft?.zoneName).toMatch(/Kol/);
    });
  });
});
