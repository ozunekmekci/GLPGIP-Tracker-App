import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { Injection } from '../types';
import { CurvePoint, generateConcentrationCurve } from '../services/pk-engine';

export interface PKChartProps {
  injections: Injection[];
  halfLifeHours: number;
  height?: number;
}

export interface ChartPadding {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface PKCoordinateResult {
  points: { x: number; y: number; levelMg: number; timestamp: number }[];
  linePath: string;
  areaPath: string;
  nowX: number | null;
  nowY: number | null;
  maxLevel: number;
  currentLevel: number;
  minTime: number;
  maxTime: number;
  baselineY: number;
}

export function buildPKSmoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  if (coords.length === 2) {
    return `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y}`;
  }

  let d = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = i > 0 ? coords[i - 1] : coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = i + 2 < coords.length ? coords[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export function buildPKAreaPath(coords: { x: number; y: number }[], baselineY: number): string {
  if (coords.length < 2) return '';
  const line = buildPKSmoothPath(coords);
  const first = coords[0];
  const last = coords[coords.length - 1];
  return `${line} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

export function calculatePKCoordinates(
  points: CurvePoint[],
  width: number,
  height: number,
  customPadding?: ChartPadding,
  nowTimestamp?: number
): PKCoordinateResult {
  const padding = {
    top: customPadding?.top ?? 18,
    bottom: customPadding?.bottom ?? 24,
    left: customPadding?.left ?? 16,
    right: customPadding?.right ?? 16,
  };

  const plotWidth = Math.max(width - padding.left - padding.right, 1);
  const plotHeight = Math.max(height - padding.top - padding.bottom, 1);
  const baselineY = padding.top + plotHeight;

  if (!points || points.length === 0) {
    return {
      points: [],
      linePath: '',
      areaPath: '',
      nowX: null,
      nowY: null,
      maxLevel: 0,
      currentLevel: 0,
      minTime: 0,
      maxTime: 0,
      baselineY,
    };
  }

  const maxLevel = Math.max(...points.map((p) => p.levelMg), 0);
  const effectiveMax = maxLevel > 0 ? maxLevel * 1.15 : 1;

  const minTime = points[0].timestamp;
  const maxTime = points[points.length - 1].timestamp;
  const timeRange = maxTime - minTime;

  const mappedPoints = points.map((p) => {
    const x =
      timeRange > 0
        ? padding.left + ((p.timestamp - minTime) / timeRange) * plotWidth
        : padding.left + plotWidth / 2;
    const y =
      maxLevel > 0
        ? padding.top + plotHeight - (p.levelMg / effectiveMax) * plotHeight
        : baselineY;
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      levelMg: p.levelMg,
      timestamp: p.timestamp,
    };
  });

  const now = nowTimestamp ?? Date.now();
  let nowX: number | null = null;
  let nowY: number | null = null;
  let currentLevel = 0;

  if (now >= minTime && now <= maxTime && timeRange > 0) {
    nowX = Number((padding.left + ((now - minTime) / timeRange) * plotWidth).toFixed(2));

    // Find surrounding curve points for level interpolation
    for (let i = 0; i < points.length - 1; i++) {
      if (now >= points[i].timestamp && now <= points[i + 1].timestamp) {
        const span = points[i + 1].timestamp - points[i].timestamp;
        const progress = span > 0 ? (now - points[i].timestamp) / span : 0;
        currentLevel =
          points[i].levelMg + progress * (points[i + 1].levelMg - points[i].levelMg);
        break;
      }
    }

    if (currentLevel === 0 && points.length > 0) {
      currentLevel = points[points.length - 1].levelMg;
    }

    nowY =
      maxLevel > 0
        ? Number((padding.top + plotHeight - (currentLevel / effectiveMax) * plotHeight).toFixed(2))
        : baselineY;
  } else if (points.length > 0) {
    currentLevel = points[points.length - 1].levelMg;
  }

  const linePath = buildPKSmoothPath(mappedPoints);
  const areaPath = buildPKAreaPath(mappedPoints, baselineY);

  return {
    points: mappedPoints,
    linePath,
    areaPath,
    nowX,
    nowY,
    maxLevel: Number(maxLevel.toFixed(2)),
    currentLevel: Number(currentLevel.toFixed(2)),
    minTime,
    maxTime,
    baselineY,
  };
}

export function PKChart({ injections, halfLifeHours, height = 200 }: PKChartProps) {
  const isDark = useColorScheme() === 'dark';
  const [containerWidth, setContainerWidth] = useState<number>(320);

  const theme = useMemo(
    () => ({
      surface: isDark ? '#1C1C1E' : '#FFFFFF',
      separator: isDark ? '#2C2C2E' : '#E5E5EA',
      textPrimary: isDark ? '#FFFFFF' : '#1C1C1E',
      textSecondary: isDark ? '#AEAEB2' : '#636366',
      accent: '#007AFF',
      gridLine: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    }),
    [isDark]
  );

  const activeInjections = useMemo(
    () => (injections || []).filter((inj) => !inj.deletedAt),
    [injections]
  );

  const curvePoints = useMemo(() => {
    if (activeInjections.length === 0 || halfLifeHours <= 0) return [];
    return generateConcentrationCurve(activeInjections, halfLifeHours, 14, 7);
  }, [activeInjections, halfLifeHours]);

  const chartData = useMemo(() => {
    return calculatePKCoordinates(curvePoints, containerWidth, height);
  }, [curvePoints, containerWidth, height]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 1) {
      setContainerWidth(w);
    }
  };

  if (activeInjections.length === 0) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.separator },
        ]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Kandaki İlaç Seviyesi (PK)
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            Aktif Enjeksiyon Bulunmuyor
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            İlaç birikimi ve yarılanma ömrü grafiğini görmek için bir doz kaydedin.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.separator },
      ]}
      onLayout={handleLayout}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Kandaki İlaç Seviyesi (PK)
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Yarılanma Ömrü: {halfLifeHours} sa
          </Text>
        </View>

        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Mevcut</Text>
            <Text style={[styles.metricValue, { color: theme.accent }]}>
              {chartData.currentLevel.toFixed(2)} mg
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Zirve</Text>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
              {chartData.maxLevel.toFixed(2)} mg
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height }}>
        <Svg width={containerWidth} height={height}>
          <Defs>
            <LinearGradient id="pkGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.accent} stopOpacity="0.32" />
              <Stop offset="100%" stopColor={theme.accent} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Background subtle reference grid lines */}
          <Line
            x1={16}
            y1={18}
            x2={containerWidth - 16}
            y2={18}
            stroke={theme.gridLine}
            strokeWidth={1}
          />
          <Line
            x1={16}
            y1={chartData.baselineY}
            x2={containerWidth - 16}
            y2={chartData.baselineY}
            stroke={theme.separator}
            strokeWidth={1}
          />

          {/* Area fill */}
          {chartData.areaPath ? (
            <Path d={chartData.areaPath} fill="url(#pkGradient)" />
          ) : null}

          {/* Concentration curve line */}
          {chartData.linePath ? (
            <Path
              d={chartData.linePath}
              fill="none"
              stroke={theme.accent}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          ) : null}

          {/* Current time "Şimdi" reference line */}
          {chartData.nowX !== null ? (
            <>
              <Line
                x1={chartData.nowX}
                y1={18}
                x2={chartData.nowX}
                y2={chartData.baselineY}
                stroke={theme.textSecondary}
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <SvgText
                x={chartData.nowX}
                y={14}
                fill={theme.textSecondary}
                fontSize={10}
                fontWeight="600"
                textAnchor="middle">
                Şimdi
              </SvgText>
              {chartData.nowY !== null ? (
                <Circle
                  cx={chartData.nowX}
                  cy={chartData.nowY}
                  r={4.5}
                  fill={theme.accent}
                  stroke={theme.surface}
                  strokeWidth={2}
                />
              ) : null}
            </>
          ) : null}
        </Svg>
      </View>

      <View style={styles.footerRow}>
        <Text style={[styles.axisLabel, { color: theme.textSecondary }]}>-14 gün</Text>
        <Text style={[styles.axisLabel, { color: theme.textSecondary }]}>Bugün</Text>
        <Text style={[styles.axisLabel, { color: theme.textSecondary }]}>+7 gün</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  metricItem: {
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  axisLabel: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  emptyContainer: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
