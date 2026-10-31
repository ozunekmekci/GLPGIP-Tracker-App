import React from 'react';
import {
  Platform,
  StyleSheet,
  View,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme, LIGHT_TOKENS, DARK_TOKENS } from '../context/theme-context';

export type GlassCardVariant = 'default' | 'prominent' | 'subtle';

export interface GlassCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  variant?: GlassCardVariant;
  padded?: boolean;
  onPress?: () => void;
  testID?: string;
  glowColor?: string;
}

export interface GlassCardStyleResult {
  backgroundColor: string;
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
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export function getGlassCardStyles(
  isDark: boolean,
  variant: GlassCardVariant = 'default'
): GlassCardStyleResult {
  const borderRadius = 24;
  const hairlineWidth = StyleSheet.hairlineWidth;

  let backgroundColor: string;
  if (variant === 'prominent') {
    backgroundColor = isDark
      ? 'rgba(44, 44, 46, 0.80)'
      : 'rgba(255, 255, 255, 0.85)';
  } else if (variant === 'subtle') {
    backgroundColor = isDark
      ? 'rgba(28, 28, 30, 0.40)'
      : 'rgba(255, 255, 255, 0.45)';
  } else {
    backgroundColor = isDark ? DARK_TOKENS.cardBg : LIGHT_TOKENS.cardBg;
  }

  return {
    backgroundColor,
    borderRadius,
    overflow: 'hidden',
    borderTopWidth: 1.5,
    borderTopColor: isDark
      ? 'rgba(255, 255, 255, 0.45)'
      : 'rgba(255, 255, 255, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: isDark
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.06)',
    borderLeftWidth: hairlineWidth,
    borderRightWidth: hairlineWidth,
    borderLeftColor: isDark
      ? 'rgba(255, 255, 255, 0.18)'
      : 'rgba(255, 255, 255, 0.45)',
    borderRightColor: isDark
      ? 'rgba(255, 255, 255, 0.18)'
      : 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.35 : 0.08,
    shadowRadius: 14,
    elevation: 4,
  };
}

export function resolveGlassConfig(
  tokensBlurTint: 'light' | 'dark',
  intensity?: number,
  tint?: 'light' | 'dark' | 'default'
): { intensity: number; tint: 'light' | 'dark' | 'default' } {
  return {
    intensity: intensity !== undefined ? intensity : 70,
    tint: tint !== undefined ? tint : tokensBlurTint,
  };
}

export function GlassCard({
  children,
  style,
  intensity = 70,
  tint,
  variant = 'default',
  padded = false,
  onPress,
  testID,
  glowColor,
}: GlassCardProps) {
  const { isDark, tokens } = useAppTheme();
  const cardStyles = getGlassCardStyles(isDark, variant);
  const { intensity: resolvedIntensity, tint: resolvedTint } = resolveGlassConfig(
    tokens.blurTint,
    intensity,
    tint
  );

  const glowStyle: ViewStyle | undefined = glowColor
    ? {
        shadowColor: glowColor,
        shadowOpacity: isDark ? 0.45 : 0.25,
        shadowRadius: 18,
        elevation: 6,
      }
    : undefined;

  const isWeb = Platform.OS === 'web';
  const webStyle: ViewStyle | undefined = isWeb
    ? ({
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      } as unknown as ViewStyle)
    : undefined;

  const specularLine = (
    <View
      pointerEvents="none"
      testID="glass-card-specular-line"
      style={[
        styles.topSpecularLine,
        {
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.22)'
            : 'rgba(255, 255, 255, 0.55)',
        },
      ]}
    />
  );

  const content = isWeb ? (
    <View
      testID={onPress ? undefined : testID}
      style={[
        cardStyles,
        glowStyle,
        padded && styles.padded,
        webStyle,
        style,
      ]}
    >
      {specularLine}
      {children}
    </View>
  ) : (
    <BlurView
      testID={onPress ? undefined : testID}
      intensity={resolvedIntensity}
      tint={resolvedTint}
      style={[
        cardStyles,
        glowStyle,
        padded && styles.padded,
        style,
      ]}
    >
      {specularLine}
      {children}
    </BlurView>
  );

  if (onPress) {
    const flatStyle = StyleSheet.flatten(style);
    const outerLayoutStyle: ViewStyle = {
      ...(flatStyle?.flex !== undefined ? { flex: flatStyle.flex } : {}),
      ...(flatStyle?.flexGrow !== undefined ? { flexGrow: flatStyle.flexGrow } : {}),
      ...(flatStyle?.alignSelf !== undefined ? { alignSelf: flatStyle.alignSelf } : {}),
    };

    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          outerLayoutStyle,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  padded: {
    padding: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  topSpecularLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    marginHorizontal: 16,
    opacity: 0.9,
  },
});
