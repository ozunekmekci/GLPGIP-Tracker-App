import React from 'react';
import {
  Dimensions,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useAppTheme } from '../context/theme-context';

export interface AmbientMeshOrb {
  cx: string;
  cy: string;
  r: string;
  color: string;
  opacity: number;
}

export function getAmbientMeshColors(isDark: boolean): AmbientMeshOrb[] {
  if (isDark) {
    return [
      { cx: '85%', cy: '12%', r: '45%', color: '#007AFF', opacity: 0.22 },
      { cx: '15%', cy: '48%', r: '42%', color: '#8B5CF6', opacity: 0.20 },
      { cx: '80%', cy: '82%', r: '38%', color: '#10B981', opacity: 0.18 },
    ];
  }
  return [
    { cx: '85%', cy: '12%', r: '45%', color: '#38BDF8', opacity: 0.14 },
    { cx: '15%', cy: '48%', r: '42%', color: '#C084FC', opacity: 0.12 },
    { cx: '80%', cy: '82%', r: '38%', color: '#34D399', opacity: 0.12 },
  ];
}

export interface AmbientMeshProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function AmbientMesh({ style, testID }: AmbientMeshProps = {}) {
  const { isDark } = useAppTheme();
  const orbs = getAmbientMeshColors(isDark);
  const { width, height } = Dimensions.get('window');
  const isWeb = Platform.OS === 'web';

  return (
    <View
      pointerEvents="none"
      testID={testID}
      style={[StyleSheet.absoluteFill, styles.container, style]}
    >
      <Svg
        style={StyleSheet.absoluteFill}
        width={isWeb ? '100%' : width}
        height={isWeb ? '100%' : height}
        pointerEvents="none"
      >
        <Defs>
          {orbs.map((orb, index) => (
            <RadialGradient
              key={`ambient-grad-${index}`}
              id={`ambient-grad-${index}`}
              cx={orb.cx}
              cy={orb.cy}
              r={orb.r}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor={orb.color} stopOpacity={orb.opacity} />
              <Stop offset="100%" stopColor={orb.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect width="100%" height="100%" fill="transparent" />
        {orbs.map((orb, index) => (
          <Circle
            key={`ambient-orb-${index}`}
            cx={orb.cx}
            cy={orb.cy}
            r={orb.r}
            fill={`url(#ambient-grad-${index})`}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
