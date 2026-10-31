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
}

export interface GlassCardStyleResult {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  overflow: 'hidden';
}

export function getGlassCardStyles(
  isDark: boolean,
  variant: GlassCardVariant = 'default'
): GlassCardStyleResult {
  const baseRadius = 20;
  const borderWidth = StyleSheet.hairlineWidth;

  if (variant === 'prominent') {
    return {
      backgroundColor: isDark
        ? 'rgba(44, 44, 46, 0.80)'
        : 'rgba(255, 255, 255, 0.85)',
      borderColor: isDark
        ? 'rgba(255, 255, 255, 0.22)'
        : 'rgba(0, 0, 0, 0.14)',
      borderWidth,
      borderRadius: baseRadius,
      overflow: 'hidden',
    };
  }

  if (variant === 'subtle') {
    return {
      backgroundColor: isDark
        ? 'rgba(28, 28, 30, 0.40)'
        : 'rgba(255, 255, 255, 0.45)',
      borderColor: isDark
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.04)',
      borderWidth,
      borderRadius: baseRadius,
      overflow: 'hidden',
    };
  }

  return {
    backgroundColor: isDark ? DARK_TOKENS.cardBg : LIGHT_TOKENS.cardBg,
    borderColor: isDark ? DARK_TOKENS.cardBorder : LIGHT_TOKENS.cardBorder,
    borderWidth,
    borderRadius: baseRadius,
    overflow: 'hidden',
  };
}

export function resolveGlassConfig(
  tokensBlurTint: 'light' | 'dark',
  intensity?: number,
  tint?: 'light' | 'dark' | 'default'
): { intensity: number; tint: 'light' | 'dark' | 'default' } {
  return {
    intensity: intensity !== undefined ? intensity : 50,
    tint: tint !== undefined ? tint : tokensBlurTint,
  };
}

export function GlassCard({
  children,
  style,
  intensity = 50,
  tint,
  variant = 'default',
  padded = false,
  onPress,
  testID,
}: GlassCardProps) {
  const { isDark, tokens } = useAppTheme();
  const cardStyles = getGlassCardStyles(isDark, variant);
  const { intensity: resolvedIntensity, tint: resolvedTint } = resolveGlassConfig(
    tokens.blurTint,
    intensity,
    tint
  );

  const isWeb = Platform.OS === 'web';
  const webStyle: ViewStyle | undefined = isWeb
    ? ({
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      } as unknown as ViewStyle)
    : undefined;

  const content = isWeb ? (
    <View
      testID={onPress ? undefined : testID}
      style={[
        cardStyles,
        padded && styles.padded,
        webStyle,
        style,
      ]}
    >
      {children}
    </View>
  ) : (
    <BlurView
      testID={onPress ? undefined : testID}
      intensity={resolvedIntensity}
      tint={resolvedTint}
      style={[
        cardStyles,
        padded && styles.padded,
        style,
      ]}
    >
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
});
