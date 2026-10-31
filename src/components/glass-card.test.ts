import {
  getGlassCardStyles,
  resolveGlassConfig,
  GlassCard,
} from './glass-card';
import { LIGHT_TOKENS, DARK_TOKENS } from '../context/theme-context';
import { Platform } from 'react-native';

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
  openDatabaseAsync: jest.fn(),
}));

jest.mock('../services/db', () => ({
  getUserSettings: jest.fn(async () => ({ themePreference: 'system' })),
  updateUserSettings: jest.fn(async (settings) => settings),
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
  },
  View: 'View',
  Pressable: 'Pressable',
}));

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('../context/theme-context', () => {
  const actual = jest.requireActual('../context/theme-context');
  return {
    ...actual,
    useAppTheme: jest.fn(() => ({
      isDark: false,
      tokens: actual.LIGHT_TOKENS,
      themePreference: 'system',
      setThemePreference: jest.fn(),
    })),
  };
});

describe('GlassCard & Liquid Glass Styler', () => {
  describe('getGlassCardStyles', () => {
    describe('default variant', () => {
      it('returns expected tokens and dimensions for light mode with default variant', () => {
        const styles = getGlassCardStyles(false, 'default');
        expect(styles.backgroundColor).toBe(LIGHT_TOKENS.cardBg);
        expect(styles.borderColor).toBe(LIGHT_TOKENS.cardBorder);
        expect(styles.borderWidth).toBe(0.5);
        expect(styles.borderRadius).toBe(20);
        expect(styles.overflow).toBe('hidden');
      });

      it('defaults to default variant when variant argument is omitted', () => {
        const styles = getGlassCardStyles(false);
        expect(styles.backgroundColor).toBe(LIGHT_TOKENS.cardBg);
        expect(styles.borderColor).toBe(LIGHT_TOKENS.cardBorder);
        expect(styles.borderWidth).toBe(0.5);
        expect(styles.borderRadius).toBe(20);
        expect(styles.overflow).toBe('hidden');
      });

      it('returns expected tokens and dimensions for dark mode with default variant', () => {
        const styles = getGlassCardStyles(true, 'default');
        expect(styles.backgroundColor).toBe(DARK_TOKENS.cardBg);
        expect(styles.borderColor).toBe(DARK_TOKENS.cardBorder);
        expect(styles.borderWidth).toBe(0.5);
        expect(styles.borderRadius).toBe(20);
        expect(styles.overflow).toBe('hidden');
      });
    });

    describe('prominent variant', () => {
      it('returns higher contrast background and border for light mode', () => {
        const styles = getGlassCardStyles(false, 'prominent');
        expect(styles.backgroundColor).toBe('rgba(255, 255, 255, 0.85)');
        expect(styles.borderColor).toBe('rgba(0, 0, 0, 0.14)');
        expect(styles.borderWidth).toBe(0.5);
        expect(styles.borderRadius).toBe(20);
        expect(styles.overflow).toBe('hidden');
      });

      it('returns higher contrast background and border for dark mode', () => {
        const styles = getGlassCardStyles(true, 'prominent');
        expect(styles.backgroundColor).toBe('rgba(44, 44, 46, 0.80)');
        expect(styles.borderColor).toBe('rgba(255, 255, 255, 0.22)');
        expect(styles.borderWidth).toBe(0.5);
        expect(styles.borderRadius).toBe(20);
        expect(styles.overflow).toBe('hidden');
      });
    });

    describe('subtle variant', () => {
      it('returns softer, lower opacity background and border for light mode', () => {
        const styles = getGlassCardStyles(false, 'subtle');
        expect(styles.backgroundColor).toBe('rgba(255, 255, 255, 0.45)');
        expect(styles.borderColor).toBe('rgba(0, 0, 0, 0.04)');
        expect(styles.borderWidth).toBe(0.5);
        expect(styles.borderRadius).toBe(20);
        expect(styles.overflow).toBe('hidden');
      });

      it('returns softer, lower opacity background and border for dark mode', () => {
        const styles = getGlassCardStyles(true, 'subtle');
        expect(styles.backgroundColor).toBe('rgba(28, 28, 30, 0.40)');
        expect(styles.borderColor).toBe('rgba(255, 255, 255, 0.08)');
        expect(styles.borderWidth).toBe(0.5);
        expect(styles.borderRadius).toBe(20);
        expect(styles.overflow).toBe('hidden');
      });
    });
  });

  describe('resolveGlassConfig', () => {
    it('defaults intensity to 50 when not provided', () => {
      const config = resolveGlassConfig('light');
      expect(config.intensity).toBe(50);
    });

    it('preserves custom intensity when provided', () => {
      const configCustom = resolveGlassConfig('light', 85);
      expect(configCustom.intensity).toBe(85);

      const configZero = resolveGlassConfig('light', 0);
      expect(configZero.intensity).toBe(0);
    });

    it('defaults tint to tokens blurTint when tint is undefined', () => {
      expect(resolveGlassConfig('light').tint).toBe('light');
      expect(resolveGlassConfig('dark').tint).toBe('dark');
    });

    it('respects explicit tint overrides over tokens blurTint', () => {
      expect(resolveGlassConfig('light', 50, 'dark').tint).toBe('dark');
      expect(resolveGlassConfig('dark', 50, 'light').tint).toBe('light');
      expect(resolveGlassConfig('light', 50, 'default').tint).toBe('default');
    });
  });

  describe('GlassCard component logic', () => {
    it('renders native BlurView when onPress is not provided', () => {
      const element = GlassCard({
        children: 'Card Content',
        testID: 'glass-card-native',
      });
      expect(element).toBeDefined();
      expect(element.type).toBe('BlurView');
      expect(element.props.testID).toBe('glass-card-native');
    });

    it('wraps with Pressable when onPress is provided', () => {
      const onPressMock = jest.fn();
      const element = GlassCard({
        children: 'Touchable Content',
        onPress: onPressMock,
        testID: 'glass-card-pressable',
      });
      expect(element).toBeDefined();
      expect(element.type).toBe('Pressable');
      expect(element.props.testID).toBe('glass-card-pressable');
      expect(element.props.onPress).toBe(onPressMock);
      expect(element.props.children.type).toBe('BlurView');
    });

    it('renders View on Web platform', () => {
      const originalOS = Platform.OS;
      (Platform as { OS: string }).OS = 'web';

      const element = GlassCard({
        children: 'Web Content',
        testID: 'glass-card-web',
      });
      expect(element.type).toBe('View');
      expect(element.props.testID).toBe('glass-card-web');

      (Platform as { OS: string }).OS = originalOS;
    });
  });
});
