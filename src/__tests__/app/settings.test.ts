import { THEME_OPTIONS } from '../../app/(tabs)/settings';
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
    flatten: (style: unknown) => style || {},
    hairlineWidth: 0.5,
  },
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn((cb) => cb()),
}));

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

describe('Settings Theme Segmented Control & Configuration', () => {
  it('defines 3 iOS segmented theme options: system, light, dark', () => {
    expect(THEME_OPTIONS).toHaveLength(3);
    expect(THEME_OPTIONS.map((o) => o.id)).toEqual(['system', 'light', 'dark']);
    expect(THEME_OPTIONS.find((o) => o.id === 'system')?.label).toBe('Sistem 📱');
    expect(THEME_OPTIONS.find((o) => o.id === 'light')?.label).toBe('Açık ☀️');
    expect(THEME_OPTIONS.find((o) => o.id === 'dark')?.label).toBe('Koyu 🌙');
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
});
