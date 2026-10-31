import React from 'react';
import { Platform, useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

function TodayIcon({ color, size }: { color?: any; size: number }) {
  const strokeColor = typeof color === 'string' ? color : '#007AFF';
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

function MedicationIcon({ color, size }: { color?: any; size: number }) {
  const strokeColor = typeof color === 'string' ? color : '#007AFF';
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

function AnalyticsIcon({ color, size }: { color?: any; size: number }) {
  const strokeColor = typeof color === 'string' ? color : '#007AFF';
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

function SettingsIcon({ color, size }: { color?: any; size: number }) {
  const strokeColor = typeof color === 'string' ? color : '#007AFF';
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

export default function TabLayout() {
  const isDark = useColorScheme() === 'dark';

  const theme = {
    tabBarBg: isDark ? '#1C1C1E' : '#FFFFFF',
    border: isDark ? '#2C2C2E' : '#E5E5EA',
    activeTint: isDark ? '#0A84FF' : '#007AFF',
    inactiveTint: isDark ? '#8E8E93' : '#8E8E93',
    headerBg: isDark ? '#000000' : '#F2F2F7',
    headerText: isDark ? '#FFFFFF' : '#000000',
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.headerBg,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: theme.headerText,
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: theme.activeTint,
        tabBarInactiveTintColor: theme.inactiveTint,
        tabBarStyle: {
          backgroundColor: theme.tabBarBg,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarItemStyle: {
          minHeight: 44,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bugün',
          tabBarLabel: 'Bugün',
          tabBarIcon: ({ color }) => <TodayIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="medication"
        options={{
          title: 'İlaç & Projeksiyon',
          tabBarLabel: 'İlaç & PK',
          tabBarIcon: ({ color }) => <MedicationIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Kilo & Sağlık',
          tabBarLabel: 'Analiz',
          tabBarIcon: ({ color }) => <AnalyticsIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarLabel: 'Ayarlar',
          tabBarIcon: ({ color }) => <SettingsIcon color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
