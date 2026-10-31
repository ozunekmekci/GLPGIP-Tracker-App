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
      it('returns expected specular tokens, borders, and shadows for light mode', () => {
        const styles = getGlassCardStyles(false, 'default');
        expect(styles.backgroundColor).toBe(LIGHT_TOKENS.cardBg);
        expect(styles.borderRadius).toBe(24);
        expect(styles.overflow).toBe('hidden');
        expect(styles.borderTopWidth).toBe(1.5);
        expect(styles.borderTopColor).toBe('rgba(255, 255, 255, 0.85)');
        expect(styles.borderBottomWidth).toBe(1);
        expect(styles.borderBottomColor).toBe('rgba(0, 0, 0, 0.06)');
        expect(styles.borderLeftWidth).toBe(0.5);
        expect(styles.borderRightWidth).toBe(0.5);
        expect(styles.borderLeftColor).toBe('rgba(255, 255, 255, 0.45)');
        expect(styles.borderRightColor).toBe('rgba(255, 255, 255, 0.45)');
        expect(styles.shadowColor).toBe('#000');
        expect(styles.shadowOffset).toEqual({ width: 0, height: 6 });
        expect(styles.shadowOpacity).toBe(0.08);
        expect(styles.shadowRadius).toBe(14);
        expect(styles.elevation).toBe(4);
      });

      it('defaults to default variant when variant argument is omitted', () => {
        const styles = getGlassCardStyles(false);
        expect(styles.backgroundColor).toBe(LIGHT_TOKENS.cardBg);
        expect(styles.borderRadius).toBe(24);
        expect(styles.borderTopWidth).toBe(1.5);
        expect(styles.borderTopColor).toBe('rgba(255, 255, 255, 0.85)');
      });

      it('returns expected specular tokens, borders, and shadows for dark mode', () => {
        const styles = getGlassCardStyles(true, 'default');
        expect(styles.backgroundColor).toBe(DARK_TOKENS.cardBg);
        expect(styles.borderRadius).toBe(24);
        expect(styles.overflow).toBe('hidden');
        expect(styles.borderTopWidth).toBe(1.5);
        expect(styles.borderTopColor).toBe('rgba(255, 255, 255, 0.45)');
        expect(styles.borderBottomWidth).toBe(1);
        expect(styles.borderBottomColor).toBe('rgba(255, 255, 255, 0.08)');
        expect(styles.borderLeftWidth).toBe(0.5);
        expect(styles.borderRightWidth).toBe(0.5);
        expect(styles.borderLeftColor).toBe('rgba(255, 255, 255, 0.18)');
        expect(styles.borderRightColor).toBe('rgba(255, 255, 255, 0.18)');
        expect(styles.shadowColor).toBe('#000');
        expect(styles.shadowOffset).toEqual({ width: 0, height: 6 });
        expect(styles.shadowOpacity).toBe(0.35);
        expect(styles.shadowRadius).toBe(14);
        expect(styles.elevation).toBe(4);
      });
    });

    describe('prominent variant', () => {
      it('returns higher contrast background for light mode', () => {
        const styles = getGlassCardStyles(false, 'prominent');
        expect(styles.backgroundColor).toBe('rgba(255, 255, 255, 0.85)');
        expect(styles.borderRadius).toBe(24);
        expect(styles.borderTopWidth).toBe(1.5);
      });

      it('returns higher contrast background for dark mode', () => {
        const styles = getGlassCardStyles(true, 'prominent');
        expect(styles.backgroundColor).toBe('rgba(44, 44, 46, 0.80)');
        expect(styles.borderRadius).toBe(24);
        expect(styles.borderTopWidth).toBe(1.5);
      });
    });

    describe('subtle variant', () => {
      it('returns softer, lower opacity background for light mode', () => {
        const styles = getGlassCardStyles(false, 'subtle');
        expect(styles.backgroundColor).toBe('rgba(255, 255, 255, 0.45)');
        expect(styles.borderRadius).toBe(24);
        expect(styles.borderTopWidth).toBe(1.5);
      });

      it('returns softer, lower opacity background for dark mode', () => {
        const styles = getGlassCardStyles(true, 'subtle');
        expect(styles.backgroundColor).toBe('rgba(28, 28, 30, 0.40)');
        expect(styles.borderRadius).toBe(24);
        expect(styles.borderTopWidth).toBe(1.5);
      });
    });
  });

  describe('resolveGlassConfig', () => {
    it('defaults intensity to 70 when not provided', () => {
      const config = resolveGlassConfig('light');
      expect(config.intensity).toBe(70);
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
      expect(resolveGlassConfig('light', 70, 'dark').tint).toBe('dark');
      expect(resolveGlassConfig('dark', 70, 'light').tint).toBe('light');
      expect(resolveGlassConfig('light', 70, 'default').tint).toBe('default');
    });
  });

  describe('GlassCard component logic', () => {
    it('renders native BlurView with default intensity 70 and top specular highlight line', () => {
      const element = GlassCard({
        children: 'Card Content',
        testID: 'glass-card-native',
      });
      expect(element).toBeDefined();
      expect(element.type).toBe('BlurView');
      expect(element.props.testID).toBe('glass-card-native');
      expect(element.props.intensity).toBe(70);

      const childrenArray = element.props.children;
      expect(Array.isArray(childrenArray)).toBe(true);
      const specularLine = childrenArray[0];
      expect(specularLine.props.testID).toBe('glass-card-specular-line');
      expect(childrenArray[1]).toBe('Card Content');
    });

    it('supports glowColor prop adding tinted glow style', () => {
      const element = GlassCard({
        children: 'Glowing Content',
        glowColor: '#007AFF',
      });
      expect(element).toBeDefined();
      const styleList = element.props.style;
      const glowStyle = styleList.find((s: Record<string, unknown> | undefined) => s?.shadowColor === '#007AFF');
      expect(glowStyle).toBeDefined();
      expect(glowStyle?.shadowColor).toBe('#007AFF');
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

    it('renders View on Web platform with specular highlight line', () => {
      const originalOS = Platform.OS;
      (Platform as { OS: string }).OS = 'web';

      const element = GlassCard({
        children: 'Web Content',
        testID: 'glass-card-web',
      });
      expect(element.type).toBe('View');
      expect(element.props.testID).toBe('glass-card-web');
      const childrenArray = element.props.children;
      expect(Array.isArray(childrenArray)).toBe(true);
      expect(childrenArray[0].props.testID).toBe('glass-card-specular-line');

      (Platform as { OS: string }).OS = originalOS;
    });
  });
});
