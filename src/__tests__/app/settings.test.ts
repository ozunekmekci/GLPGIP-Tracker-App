import React from 'react';
import SettingsScreen, { DAYS_OF_WEEK, THEME_OPTIONS } from '../../app/(tabs)/settings';
import { resolveTheme } from '../../context/theme-context';
import { getUserSettings, updateUserSettings } from '../../services/db';
import { UserSettings } from '../../types';

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
  openDatabaseAsync: jest.fn(),
}));

jest.mock('../../services/db', () => {
  let storedSettings: UserSettings = {
    id: 'user_settings_singleton',
    dailyProteinTargetG: 100,
    dailyWaterTargetMl: 2500,
    themePreference: 'system',
    updatedAt: new Date().toISOString(),
  };

  return {
    getUserSettings: jest.fn(async () => storedSettings),
    updateUserSettings: jest.fn(async (partial: Partial<UserSettings>) => {
      storedSettings = { ...storedSettings, ...partial };
      return storedSettings;
    }),
    getMedications: jest.fn(async () => []),
    getInjections: jest.fn(async () => []),
    getWeightLogs: jest.fn(async () => []),
    getSymptomLogs: jest.fn(async () => []),
    getAllNutritionLogs: jest.fn(async () => []),
  };
});

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
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: jest.fn() },
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
  },
  processColor: jest.fn((c) => c),
  useColorScheme: jest.fn(() => 'dark'),
}));

jest.mock('expo-router', () => ({
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
}));

describe('Settings Theme Segmented Control & Configuration', () => {
  it('defines 3 iOS segmented theme options: system, light, dark', () => {
    expect(THEME_OPTIONS).toHaveLength(3);
    expect(THEME_OPTIONS.map((o) => o.id)).toEqual(['system', 'light', 'dark']);
    expect(THEME_OPTIONS.find((o) => o.id === 'system')?.label).toBe('Sistem 📱');
    expect(THEME_OPTIONS.find((o) => o.id === 'light')?.label).toBe('Açık ☀️');
    expect(THEME_OPTIONS.find((o) => o.id === 'dark')?.label).toBe('Koyu 🌙');
  });

  it('defines 7 days of the week starting from Sunday (0: Paz)', () => {
    expect(DAYS_OF_WEEK).toHaveLength(7);
    expect(DAYS_OF_WEEK[0]).toEqual({ id: 0, label: 'Paz' });
    expect(DAYS_OF_WEEK[1]).toEqual({ id: 1, label: 'Pzt' });
    expect(DAYS_OF_WEEK[6]).toEqual({ id: 6, label: 'Cmt' });
  });

  it('persists theme preferences correctly to storage', async () => {
    await updateUserSettings({ themePreference: 'dark' });
    let settings = await getUserSettings();
    expect(settings.themePreference).toBe('dark');

    await updateUserSettings({ themePreference: 'light' });
    settings = await getUserSettings();
    expect(settings.themePreference).toBe('light');

    await updateUserSettings({ themePreference: 'system' });
    settings = await getUserSettings();
    expect(settings.themePreference).toBe('system');
  });

  it('correctly resolves theme tokens for all preference combinations', () => {
    // 1. System mode following system light
    const sysLight = resolveTheme('system', 'light');
    expect(sysLight.isDark).toBe(false);
    expect(sysLight.tokens.bg).toBe('#F2F2F7');

    // 2. System mode following system dark
    const sysDark = resolveTheme('system', 'dark');
    expect(sysDark.isDark).toBe(true);
    expect(sysDark.tokens.bg).toBe('#000000');

    // 3. Explicit Light override (even if system is dark)
    const forcedLight = resolveTheme('light', 'dark');
    expect(forcedLight.isDark).toBe(false);
    expect(forcedLight.tokens.bg).toBe('#F2F2F7');

    // 4. Explicit Dark override (even if system is light)
    const forcedDark = resolveTheme('dark', 'light');
    expect(forcedDark.isDark).toBe(true);
    expect(forcedDark.tokens.bg).toBe('#000000');
  });

  it('exports SettingsScreen as a valid React component function', () => {
    expect(typeof SettingsScreen).toBe('function');
    const element = React.createElement(SettingsScreen);
    expect(React.isValidElement(element)).toBe(true);
  });
});
