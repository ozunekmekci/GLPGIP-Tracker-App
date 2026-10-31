import { LIGHT_TOKENS, DARK_TOKENS } from '../../context/theme-context';
import {
  getTabScreenOptions,
  getTabBarBackgroundProps,
  CalendarIcon,
  TodayIcon,
  MedicationIcon,
  AnalyticsIcon,
  SettingsIcon,
} from '../../app/(tabs)/_layout';

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
  openDatabaseAsync: jest.fn(),
}));

jest.mock('../../services/db', () => ({
  getUserSettings: jest.fn(async () => ({ themePreference: 'system' })),
  updateUserSettings: jest.fn(async (settings: unknown) => settings),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  useColorScheme: jest.fn(() => 'light'),
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
}));

jest.mock('expo-router', () => ({
  Tabs: Object.assign(() => null, {
    Screen: () => null,
  }),
}));

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('react-native-svg', () => ({
  default: 'Svg',
  Circle: 'Circle',
  Path: 'Path',
  Rect: 'Rect',
}));

describe('TabLayout Navigation & Liquid Glass TabBar Options', () => {
  describe('getTabScreenOptions', () => {
    it('generates correct screen options for iOS with light tokens', () => {
      const options = getTabScreenOptions(LIGHT_TOKENS, 'ios');

      expect(options.headerShown).toBe(true);
      expect(options.headerStyle.backgroundColor).toBe(LIGHT_TOKENS.bg);
      expect(options.headerTitleStyle.color).toBe(LIGHT_TOKENS.textPrimary);
      expect(options.headerTitleStyle.fontWeight).toBe('700');
      expect(options.headerTitleStyle.fontSize).toBe(18);
      expect(options.headerShadowVisible).toBe(false);

      expect(options.tabBarActiveTintColor).toBe(LIGHT_TOKENS.accent);
      expect(options.tabBarInactiveTintColor).toBe(LIGHT_TOKENS.textSecondary);

      expect(options.tabBarStyle).toEqual({
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        height: 68,
        borderRadius: 34,
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        borderWidth: 0,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
        paddingTop: 8,
        paddingBottom: 8,
      });
      expect(options.tabBarLabelStyle).toEqual({
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.4,
        marginTop: 2,
      });
      expect(options.tabBarItemStyle).toEqual({
        minHeight: 44,
        paddingVertical: 2,
      });
    });

    it('generates correct screen options for Android with dark tokens', () => {
      const options = getTabScreenOptions(DARK_TOKENS, 'android');

      expect(options.headerStyle.backgroundColor).toBe(DARK_TOKENS.bg);
      expect(options.headerTitleStyle.color).toBe(DARK_TOKENS.textPrimary);
      expect(options.tabBarActiveTintColor).toBe(DARK_TOKENS.accent);
      expect(options.tabBarInactiveTintColor).toBe(DARK_TOKENS.textSecondary);

      expect(options.tabBarStyle).toEqual({
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        height: 68,
        borderRadius: 34,
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        borderWidth: 0,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
        paddingTop: 8,
        paddingBottom: 8,
      });
    });
  });

  describe('getTabBarBackgroundProps', () => {
    it('returns web blur properties with specular borders and backdrop filter', () => {
      const webProps = getTabBarBackgroundProps(LIGHT_TOKENS, true);
      expect(webProps.isWeb).toBe(true);
      expect(webProps.backgroundColor).toBe(LIGHT_TOKENS.tabBarBg);
      expect(webProps.borderRadius).toBe(34);
      expect(webProps.overflow).toBe('hidden');
      expect(webProps.borderTopWidth).toBe(1.5);
      expect(webProps.borderTopColor).toBe('rgba(255, 255, 255, 0.85)');
      expect(webProps.borderBottomWidth).toBe(1);
      expect(webProps.borderBottomColor).toBe('rgba(0, 0, 0, 0.06)');
      expect(webProps.borderLeftWidth).toBe(0.5);
      expect(webProps.borderRightWidth).toBe(0.5);
      expect(webProps.borderLeftColor).toBe('rgba(255, 255, 255, 0.45)');
      expect(webProps.borderRightColor).toBe('rgba(255, 255, 255, 0.45)');
      expect(webProps.backdropFilter).toBe('blur(20px)');
    });

    it('returns native BlurView properties with blurTint and intensity 85 for dark mode', () => {
      const nativePropsDark = getTabBarBackgroundProps(DARK_TOKENS, false);
      expect(nativePropsDark.isWeb).toBe(false);
      expect(nativePropsDark.intensity).toBe(85);
      expect(nativePropsDark.tint).toBe('dark');
      expect(nativePropsDark.borderRadius).toBe(34);
      expect(nativePropsDark.overflow).toBe('hidden');
      expect(nativePropsDark.borderTopWidth).toBe(1.5);
      expect(nativePropsDark.borderTopColor).toBe('rgba(255, 255, 255, 0.40)');
      expect(nativePropsDark.borderBottomWidth).toBe(1);
      expect(nativePropsDark.borderBottomColor).toBe('rgba(255, 255, 255, 0.08)');
      expect(nativePropsDark.borderLeftWidth).toBe(0.5);
      expect(nativePropsDark.borderRightWidth).toBe(0.5);
      expect(nativePropsDark.borderLeftColor).toBe('rgba(255, 255, 255, 0.18)');
      expect(nativePropsDark.borderRightColor).toBe('rgba(255, 255, 255, 0.18)');
    });

    it('returns native BlurView properties with blurTint and intensity 85 for light mode', () => {
      const nativePropsLight = getTabBarBackgroundProps(LIGHT_TOKENS, false);
      expect(nativePropsLight.isWeb).toBe(false);
      expect(nativePropsLight.tint).toBe('light');
      expect(nativePropsLight.intensity).toBe(85);
      expect(nativePropsLight.borderRadius).toBe(34);
      expect(nativePropsLight.overflow).toBe('hidden');
      expect(nativePropsLight.borderTopWidth).toBe(1.5);
      expect(nativePropsLight.borderTopColor).toBe('rgba(255, 255, 255, 0.85)');
      expect(nativePropsLight.borderBottomWidth).toBe(1);
      expect(nativePropsLight.borderBottomColor).toBe('rgba(0, 0, 0, 0.06)');
      expect(nativePropsLight.borderLeftWidth).toBe(0.5);
      expect(nativePropsLight.borderRightWidth).toBe(0.5);
      expect(nativePropsLight.borderLeftColor).toBe('rgba(255, 255, 255, 0.45)');
      expect(nativePropsLight.borderRightColor).toBe('rgba(255, 255, 255, 0.45)');
    });
  });

  describe('Tab Icons', () => {
    it('renders CalendarIcon and all tab icons without error', () => {
      expect(CalendarIcon({ size: 22 })).toBeTruthy();
      expect(TodayIcon({ size: 22 })).toBeTruthy();
      expect(MedicationIcon({ size: 22 })).toBeTruthy();
      expect(AnalyticsIcon({ size: 22 })).toBeTruthy();
      expect(SettingsIcon({ size: 22 })).toBeTruthy();
    });
  });
});
