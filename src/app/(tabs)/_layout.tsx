import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useAppTheme, ThemeTokens } from '../../context/theme-context';

export function TodayIcon({ color, size }: { color?: string; size: number }) {
  const strokeColor = color || '#007AFF';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 2V6M8 2V6M3 10H21"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 15H10L12 18L14 13H17"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MedicationIcon({ color, size }: { color?: string; size: number }) {
  const strokeColor = color || '#007AFF';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.5 4.5L19.5 13.5C20.3284 14.3284 20.3284 15.6716 19.5 16.5L16.5 19.5C15.6716 20.3284 14.3284 20.3284 13.5 19.5L4.5 10.5C3.67157 9.67157 3.67157 8.32843 4.5 7.5L7.5 4.5C8.32843 3.67157 9.67157 3.67157 10.5 4.5Z"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 6.5L17.5 15.5"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 17L3 21"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AnalyticsIcon({ color, size }: { color?: string; size: number }) {
  const strokeColor = color || '#007AFF';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 3V21H21"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 9L12 14L16 10L21 16"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CalendarIcon({ color, size }: { color?: string; size: number }) {
  const strokeColor = color || '#007AFF';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke={strokeColor}
        strokeWidth="2"
      />
      <Path
        d="M16 2V6M8 2V6M3 10H21"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="8" cy="14" r="1" fill={strokeColor} />
      <Circle cx="12" cy="14" r="1" fill={strokeColor} />
      <Circle cx="16" cy="14" r="1" fill={strokeColor} />
      <Circle cx="8" cy="18" r="1" fill={strokeColor} />
      <Circle cx="12" cy="18" r="1" fill={strokeColor} />
      <Circle cx="16" cy="18" r="1" fill={strokeColor} />
    </Svg>
  );
}

export function SettingsIcon({ color, size }: { color?: string; size: number }) {
  const strokeColor = color || '#007AFF';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r="3"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19.4 15A1.65 1.65 0 0 0 20 16.3V18A2 2 0 0 1 18 20H6A2 2 0 0 1 4 18V16.3A1.65 1.65 0 0 0 4.6 15L4.4 14.5A1.65 1.65 0 0 0 3 13.1V10.9A1.65 1.65 0 0 0 4.4 9.5L4.6 9A1.65 1.65 0 0 0 4 7.7V6A2 2 0 0 1 6 4H18A2 2 0 0 1 20 6V7.7A1.65 1.65 0 0 0 19.4 9L19.6 9.5A1.65 1.65 0 0 0 21 10.9V13.1A1.65 1.65 0 0 0 19.6 14.5L19.4 15Z"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export interface TabScreenOptionsResult {
  headerShown: boolean;
  headerStyle: { backgroundColor: string };
  headerTitleStyle: { fontWeight: '700'; fontSize: number; color: string };
  headerShadowVisible: boolean;
  tabBarActiveTintColor: string;
  tabBarInactiveTintColor: string;
  tabBarStyle: {
    position: 'absolute';
    bottom: number;
    left: number;
    right: number;
    height: number;
    borderRadius: number;
    backgroundColor: string;
    borderTopWidth: number;
    borderWidth: number;
    elevation: number;
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    paddingTop: number;
    paddingBottom: number;
  };
  tabBarLabelStyle: {
    fontSize: number;
    fontWeight: '700';
    letterSpacing: number;
    marginTop: number;
  };
  tabBarItemStyle: {
    minHeight: number;
    paddingVertical: number;
  };
}

export function getTabScreenOptions(
  tokens: ThemeTokens,
  platformOS: string = Platform.OS
): TabScreenOptionsResult {
  return {
    headerShown: true,
    headerStyle: {
      backgroundColor: tokens.bg,
    },
    headerTitleStyle: {
      fontWeight: '700',
      fontSize: 18,
      color: tokens.textPrimary,
    },
    headerShadowVisible: false,
    tabBarActiveTintColor: tokens.accent,
    tabBarInactiveTintColor: tokens.textSecondary,
    tabBarStyle: {
      position: 'absolute',
      bottom: platformOS === 'ios' ? 24 : 16,
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
      shadowOpacity: tokens.blurTint === 'dark' ? 0.45 : 0.14,
      shadowRadius: 20,
      paddingTop: 8,
      paddingBottom: 8,
    },
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.4,
      marginTop: 2,
    },
    tabBarItemStyle: {
      minHeight: 44,
      paddingVertical: 2,
    },
  };
}

export interface TabBarBackgroundProps {
  isWeb: boolean;
  backgroundColor?: string;
  borderRadius: number;
  overflow: 'hidden';
  borderTopWidth: number;
  borderTopColor: string;
  borderBottomWidth: number;
  borderBottomColor: string;
  borderLeftWidth: number;
  borderRightWidth: number;
  borderLeftColor: string;
  borderRightColor: string;
  backdropFilter?: string;
  intensity?: number;
  tint?: 'light' | 'dark';
}

export function getTabBarBackgroundProps(
  tokens: ThemeTokens,
  isWeb: boolean = Platform.OS === 'web'
): TabBarBackgroundProps {
  const isDark = tokens.blurTint === 'dark';
  const borderTopColor = isDark
    ? 'rgba(255, 255, 255, 0.40)'
    : 'rgba(255, 255, 255, 0.85)';
  const borderBottomColor = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(0, 0, 0, 0.06)';
  const borderSidesColor = isDark
    ? 'rgba(255, 255, 255, 0.18)'
    : 'rgba(255, 255, 255, 0.45)';

  if (isWeb) {
    return {
      isWeb: true,
      backgroundColor: tokens.tabBarBg,
      borderRadius: 34,
      overflow: 'hidden',
      borderTopWidth: 1.5,
      borderTopColor,
      borderBottomWidth: 1,
      borderBottomColor,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderLeftColor: borderSidesColor,
      borderRightColor: borderSidesColor,
      backdropFilter: 'blur(20px)',
    };
  }

  return {
    isWeb: false,
    intensity: 85,
    tint: tokens.blurTint,
    borderRadius: 34,
    overflow: 'hidden',
    borderTopWidth: 1.5,
    borderTopColor,
    borderBottomWidth: 1,
    borderBottomColor,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderLeftColor: borderSidesColor,
    borderRightColor: borderSidesColor,
  };
}

export default function TabLayout() {
  const { tokens } = useAppTheme();
  const screenOptions = getTabScreenOptions(tokens);
  const bgProps = getTabBarBackgroundProps(tokens, Platform.OS === 'web');

  return (
    <Tabs
      screenOptions={{
        ...screenOptions,
        tabBarBackground: () => (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: bgProps.borderRadius,
                overflow: bgProps.overflow,
                borderTopWidth: bgProps.borderTopWidth,
                borderTopColor: bgProps.borderTopColor,
                borderBottomWidth: bgProps.borderBottomWidth,
                borderBottomColor: bgProps.borderBottomColor,
                borderLeftWidth: bgProps.borderLeftWidth,
                borderRightWidth: bgProps.borderRightWidth,
                borderLeftColor: bgProps.borderLeftColor,
                borderRightColor: bgProps.borderRightColor,
              },
            ]}>
            {Platform.OS === 'web' ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: tokens.tabBarBg,
                    ...({
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                    } as unknown as object),
                  },
                ]}
              />
            ) : (
              <BlurView
                intensity={bgProps.intensity}
                tint={bgProps.tint}
                style={StyleSheet.absoluteFill}
              />
            )}
          </View>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Özet',
          tabBarLabel: 'ÖZET',
          tabBarIcon: ({ color }) => (
            <TodayIcon
              color={typeof color === 'string' ? color : undefined}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="medication"
        options={{
          title: 'Dozlar',
          tabBarLabel: 'DOZLAR',
          tabBarIcon: ({ color }) => (
            <MedicationIcon
              color={typeof color === 'string' ? color : undefined}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Sonuçlar',
          tabBarLabel: 'SONUÇLAR',
          tabBarIcon: ({ color }) => (
            <AnalyticsIcon
              color={typeof color === 'string' ? color : undefined}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Takvim',
          tabBarLabel: 'TAKVİM',
          tabBarIcon: ({ color }) => (
            <CalendarIcon
              color={typeof color === 'string' ? color : undefined}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarLabel: 'AYARLAR',
          tabBarIcon: ({ color }) => (
            <SettingsIcon
              color={typeof color === 'string' ? color : undefined}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
