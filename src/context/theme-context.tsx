import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { ThemePreference } from '../types';
import { getUserSettings, updateUserSettings } from '../services/db';

export interface ThemeTokens {
  bg: string;
  surface: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentGreen: string;
  accentOrange: string;
  accentRed: string;
  blurTint: 'light' | 'dark';
  tabBarBg: string;
}

export const LIGHT_TOKENS: ThemeTokens = {
  bg: '#F2F2F7',
  surface: 'rgba(255, 255, 255, 0.85)',
  cardBg: 'rgba(255, 255, 255, 0.70)',
  cardBorder: 'rgba(0, 0, 0, 0.08)',
  textPrimary: '#000000',
  textSecondary: '#6E6E73',
  textTertiary: '#AEAEB2',
  accent: '#007AFF',
  accentGreen: '#34C759',
  accentOrange: '#FF9500',
  accentRed: '#FF3B30',
  blurTint: 'light',
  tabBarBg: 'rgba(249, 249, 249, 0.75)',
};

export const DARK_TOKENS: ThemeTokens = {
  bg: '#000000',
  surface: 'rgba(28, 28, 30, 0.75)',
  cardBg: 'rgba(30, 30, 32, 0.65)',
  cardBorder: 'rgba(255, 255, 255, 0.14)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  accent: '#007AFF',
  accentGreen: '#34C759',
  accentOrange: '#FF9500',
  accentRed: '#FF3B30',
  blurTint: 'dark',
  tabBarBg: 'rgba(20, 20, 22, 0.75)',
};

export function resolveTheme(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | null | undefined
): { isDark: boolean; tokens: ThemeTokens } {
  let isDark: boolean;
  if (preference === 'dark') {
    isDark = true;
  } else if (preference === 'light') {
    isDark = false;
  } else {
    isDark = systemScheme === 'dark';
  }

  return {
    isDark,
    tokens: isDark ? DARK_TOKENS : LIGHT_TOKENS,
  };
}

export interface ThemeContextValue {
  themePreference: ThemePreference;
  isDark: boolean;
  tokens: ThemeTokens;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const systemScheme = useColorScheme();

  useEffect(() => {
    let isMounted = true;
    getUserSettings()
      .then((settings) => {
        if (isMounted && settings.themePreference) {
          setThemePreferenceState(settings.themePreference);
        }
      })
      .catch((err) => {
        console.warn('Failed to load user theme preference:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemePreference = useCallback(async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      await updateUserSettings({ themePreference: pref });
    } catch (err) {
      console.warn('Failed to persist theme preference:', err);
    }
  }, []);

  const { isDark, tokens } = resolveTheme(themePreference, systemScheme);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themePreference,
      isDark,
      tokens,
      setThemePreference,
    }),
    [themePreference, isDark, tokens, setThemePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
