import {
  resolveTheme,
  LIGHT_TOKENS,
  DARK_TOKENS,
  ThemeTokens,
} from './theme-context';

jest.mock('react-native', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('../services/db', () => ({
  getUserSettings: jest.fn(async () => ({ themePreference: 'system' })),
  updateUserSettings: jest.fn(async (settings) => settings),
}));

describe('Theme Context & Token Architecture', () => {
  describe('resolveTheme', () => {
    it("resolves to light (isDark: false) when preference is 'light' even if system is dark", () => {
      const result = resolveTheme('light', 'dark');
      expect(result.isDark).toBe(false);
      expect(result.tokens).toBe(LIGHT_TOKENS);
    });

    it("resolves to dark (isDark: true) when preference is 'dark' even if system is light", () => {
      const result = resolveTheme('dark', 'light');
      expect(result.isDark).toBe(true);
      expect(result.tokens).toBe(DARK_TOKENS);
    });

    it("resolves to dark (isDark: true) when preference is 'system' and system is dark", () => {
      const result = resolveTheme('system', 'dark');
      expect(result.isDark).toBe(true);
      expect(result.tokens).toBe(DARK_TOKENS);
    });

    it("resolves to light (isDark: false) when preference is 'system' and system is light", () => {
      const result = resolveTheme('system', 'light');
      expect(result.isDark).toBe(false);
      expect(result.tokens).toBe(LIGHT_TOKENS);
    });

    it("defaults to light (isDark: false) when preference is 'system' and system scheme is null or undefined", () => {
      expect(resolveTheme('system', null).isDark).toBe(false);
      expect(resolveTheme('system', undefined).isDark).toBe(false);
    });
  });

  describe('Theme Tokens Validity', () => {
    const requiredKeys: (keyof ThemeTokens)[] = [
      'bg',
      'surface',
      'cardBg',
      'cardBorder',
      'textPrimary',
      'textSecondary',
      'textTertiary',
      'accent',
      'accentGreen',
      'accentOrange',
      'accentRed',
      'blurTint',
      'tabBarBg',
    ];

    it('ensures all light tokens are defined and non-empty strings', () => {
      requiredKeys.forEach((key) => {
        const val = LIGHT_TOKENS[key];
        expect(typeof val).toBe('string');
        expect(val.length).toBeGreaterThan(0);
      });
      expect(LIGHT_TOKENS.blurTint).toBe('light');
    });

    it('ensures all dark tokens are defined and non-empty strings', () => {
      requiredKeys.forEach((key) => {
        const val = DARK_TOKENS[key];
        expect(typeof val).toBe('string');
        expect(val.length).toBeGreaterThan(0);
      });
      expect(DARK_TOKENS.blurTint).toBe('dark');
    });

    it('ensures high-contrast accessibility values conform to Apple design specifications', () => {
      expect(LIGHT_TOKENS.bg).toBe('#F2F2F7');
      expect(DARK_TOKENS.bg).toBe('#000000');
      expect(LIGHT_TOKENS.textPrimary).toBe('#000000');
      expect(DARK_TOKENS.textPrimary).toBe('#FFFFFF');
      expect(LIGHT_TOKENS.accent).toBe('#007AFF');
      expect(DARK_TOKENS.accent).toBe('#007AFF');
    });
  });
});
