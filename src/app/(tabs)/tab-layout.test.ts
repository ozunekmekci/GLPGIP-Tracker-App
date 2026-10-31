import { LIGHT_TOKENS, DARK_TOKENS } from '../../context/theme-context';
import {
  getTabScreenOptions,
  getTabBarBackgroundProps,
} from './_layout';

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
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        elevation: 0,
        paddingTop: 6,
        paddingBottom: 24,
        height: 84,
      });
      expect(options.tabBarLabelStyle).toEqual({
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
      });
      expect(options.tabBarItemStyle).toEqual({
        minHeight: 44,
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
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        elevation: 0,
        paddingTop: 6,
        paddingBottom: 8,
        height: 64,
      });
    });
  });

  describe('getTabBarBackgroundProps', () => {
    it('returns web blur properties with backdrop filter', () => {
      const webProps = getTabBarBackgroundProps(LIGHT_TOKENS, true);
      expect(webProps.isWeb).toBe(true);
      expect(webProps.backgroundColor).toBe(LIGHT_TOKENS.tabBarBg);
      expect(webProps.borderTopColor).toBe(LIGHT_TOKENS.cardBorder);
      expect(webProps.backdropFilter).toBe('blur(20px)');
      expect(webProps.borderTopWidth).toBe(0.5);
    });

    it('returns native BlurView properties with blurTint and intensity 85', () => {
      const nativePropsDark = getTabBarBackgroundProps(DARK_TOKENS, false);
      expect(nativePropsDark.isWeb).toBe(false);
      expect(nativePropsDark.intensity).toBe(85);
      expect(nativePropsDark.tint).toBe('dark');
      expect(nativePropsDark.borderTopColor).toBe(DARK_TOKENS.cardBorder);
      expect(nativePropsDark.borderTopWidth).toBe(0.5);

      const nativePropsLight = getTabBarBackgroundProps(LIGHT_TOKENS, false);
      expect(nativePropsLight.tint).toBe('light');
      expect(nativePropsLight.intensity).toBe(85);
      expect(nativePropsLight.borderTopColor).toBe(LIGHT_TOKENS.cardBorder);
    });
  });
});
