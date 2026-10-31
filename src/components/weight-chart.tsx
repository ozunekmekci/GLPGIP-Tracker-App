import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { WeightLog } from '../types';

export interface WeightChartProps {
  weightLogs: WeightLog[];
  targetWeightKg?: number;
  height?: number;
}

export interface WeightChartPadding {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface WeightCoordinateResult {
  points: { x: number; y: number; weightKg: number; timestamp: number; dateStr: string }[];
  linePath: string;
  areaPath: string;
  targetY: number | null;
  minWeight: number;
  maxWeight: number;
  startWeight: number | null;
  latestWeight: number | null;
  deltaWeight: number | null;
  baselineY: number;
}

export function buildWeightLinePath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  return coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(' ');
}

export function buildWeightAreaPath(coords: { x: number; y: number }[], baselineY: number): string {
  if (coords.length < 2) return '';
  const line = buildWeightLinePath(coords);
  const first = coords[0];
  const last = coords[coords.length - 1];
  return `${line} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

export function calculateWeightCoordinates(
  logs: WeightLog[],
  width: number,
  height: number,
  targetWeightKg?: number,
  customPadding?: WeightChartPadding
): WeightCoordinateResult {
  const padding = {
    top: customPadding?.top ?? 20,
    bottom: customPadding?.bottom ?? 24,
    left: customPadding?.left ?? 16,
    right: customPadding?.right ?? 16,
  };

  const plotWidth = Math.max(width - padding.left - padding.right, 1);
  const plotHeight = Math.max(height - padding.top - padding.bottom, 1);
  const baselineY = padding.top + plotHeight;

  const validLogs = (logs || [])
    .filter((l) => !l.deletedAt && typeof l.weightKg === 'number' && !isNaN(l.weightKg))
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());

  if (validLogs.length === 0) {
    return {
      points: [],
      linePath: '',
      areaPath: '',
      targetY: null,
      minWeight: 0,
      maxWeight: 0,
      startWeight: null,
      latestWeight: null,
      deltaWeight: null,
      baselineY,
    };
  }

  const startWeight = validLogs[0].weightKg;
  const latestWeight = validLogs[validLogs.length - 1].weightKg;
  const deltaWeight = Number((latestWeight - startWeight).toFixed(1));

  const weights = validLogs.map((l) => l.weightKg);
  const minRaw = Math.min(...weights);
  const maxRaw = Math.max(...weights);

  let minBound = minRaw;
  let maxBound = maxRaw;

  if (typeof targetWeightKg === 'number' && !isNaN(targetWeightKg) && targetWeightKg > 0) {
    minBound = Math.min(minBound, targetWeightKg);
    maxBound = Math.max(maxBound, targetWeightKg);
  }

  if (minBound === maxBound) {
    minBound -= 2;
    maxBound += 2;
  }

  const verticalPadding = (maxBound - minBound) * 0.12 || 1;
  const effectiveMin = minBound - verticalPadding;
  const effectiveMax = maxBound + verticalPadding;
  const weightRange = effectiveMax - effectiveMin;

  const minTime = new Date(validLogs[0].loggedAt).getTime();
  const maxTime = new Date(validLogs[validLogs.length - 1].loggedAt).getTime();
  const timeRange = maxTime - minTime;

  const points = validLogs.map((log) => {
    const t = new Date(log.loggedAt).getTime();
    const x =
      timeRange > 0
        ? padding.left + ((t - minTime) / timeRange) * plotWidth
        : padding.left + plotWidth / 2;
    const y =
      weightRange > 0
        ? padding.top + plotHeight - ((log.weightKg - effectiveMin) / weightRange) * plotHeight
        : padding.top + plotHeight / 2;

    const d = new Date(t);
    const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;

    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      weightKg: log.weightKg,
      timestamp: t,
      dateStr,
    };
  });

  let targetY: number | null = null;
  if (typeof targetWeightKg === 'number' && !isNaN(targetWeightKg) && targetWeightKg > 0) {
    const calculatedTargetY =
      weightRange > 0
        ? padding.top + plotHeight - ((targetWeightKg - effectiveMin) / weightRange) * plotHeight
        : padding.top + plotHeight / 2;
    targetY = Number(calculatedTargetY.toFixed(2));
  }

  const linePath = buildWeightLinePath(points);
  const areaPath = buildWeightAreaPath(points, baselineY);

  return {
    points,
    linePath,
    areaPath,
    targetY,
    minWeight: minRaw,
    maxWeight: maxRaw,
    startWeight,
    latestWeight,
    deltaWeight,
    baselineY,
  };
}

export function WeightChart({ weightLogs, targetWeightKg, height = 200 }: WeightChartProps) {
  const isDark = useColorScheme() === 'dark';
  const [containerWidth, setContainerWidth] = useState<number>(320);

  const theme = useMemo(
    () => ({
      surface: isDark ? '#1C1C1E' : '#FFFFFF',
      separator: isDark ? '#2C2C2E' : '#E5E5EA',
      textPrimary: isDark ? '#FFFFFF' : '#1C1C1E',
      textSecondary: isDark ? '#AEAEB2' : '#636366',
      accent: '#34C759',
      targetLine: '#FF9500',
      lossColor: '#34C759',
      gainColor: '#FF9500',
    }),
    [isDark]
  );

  const chartData = useMemo(() => {
    return calculateWeightCoordinates(weightLogs, containerWidth, height, targetWeightKg);
  }, [weightLogs, containerWidth, height, targetWeightKg]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 1) {
      setContainerWidth(w);
    }
  };

  if (chartData.points.length === 0) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.separator },
        ]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Kilo Takibi</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            Kayıtlı Kilo Verisi Yok
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Kilo değişim eğrisini ve hedef grafiğinizi görmek için tartı kaydı ekleyin.
          </Text>
        </View>
      </View>
    );
  }

  const deltaText =
    chartData.deltaWeight !== null
      ? `${chartData.deltaWeight > 0 ? '+' : ''}${chartData.deltaWeight.toFixed(1)} kg`
      : '-';

  const deltaColor =
    chartData.deltaWeight !== null && chartData.deltaWeight < 0
      ? theme.lossColor
      : chartData.deltaWeight !== null && chartData.deltaWeight > 0
      ? theme.gainColor
      : theme.textPrimary;

  const firstDate = chartData.points[0]?.dateStr ?? '';
  const lastDate = chartData.points[chartData.points.length - 1]?.dateStr ?? '';

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.separator },
      ]}
      onLayout={handleLayout}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Kilo Takibi</Text>
          {typeof targetWeightKg === 'number' && targetWeightKg > 0 ? (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Hedef: {targetWeightKg.toFixed(1)} kg
            </Text>
          ) : null}
        </View>

        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Başlangıç</Text>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
              {chartData.startWeight !== null ? `${chartData.startWeight.toFixed(1)} kg` : '-'}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Son</Text>
            <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
              {chartData.latestWeight !== null ? `${chartData.latestWeight.toFixed(1)} kg` : '-'}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Fark</Text>
            <Text style={[styles.metricValue, { color: deltaColor }]}>{deltaText}</Text>
          </View>
        </View>
      </View>

      <View style={{ height }}>
        <Svg width={containerWidth} height={height}>
          <Defs>
            <LinearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.accent} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={theme.accent} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Baseline */}
          <Line
            x1={16}
            y1={chartData.baselineY}
            x2={containerWidth - 16}
            y2={chartData.baselineY}
            stroke={theme.separator}
            strokeWidth={1}
          />

          {/* Target Weight horizontal dashed line */}
          {chartData.targetY !== null ? (
            <>
              <Line
                x1={16}
                y1={chartData.targetY}
                x2={containerWidth - 16}
                y2={chartData.targetY}
                stroke={theme.targetLine}
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <SvgText
                x={containerWidth - 18}
                y={chartData.targetY < 32 ? chartData.targetY + 12 : chartData.targetY - 5}
                fill={theme.targetLine}
                fontSize={10}
                fontWeight="600"
                textAnchor="end">
                Hedef: {targetWeightKg?.toFixed(1)} kg
              </SvgText>
            </>
          ) : null}

          {/* Area fill */}
          {chartData.areaPath ? (
            <Path d={chartData.areaPath} fill="url(#weightGradient)" />
          ) : null}

          {/* Line trend */}
          {chartData.linePath ? (
            <Path
              d={chartData.linePath}
              fill="none"
              stroke={theme.accent}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Circles at data points */}
          {chartData.points.map((pt, idx) => (
            <Circle
              key={`${pt.timestamp}-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={4}
              fill={theme.accent}
              stroke={theme.surface}
              strokeWidth={2}
            />
          ))}
        </Svg>
      </View>

      <View style={styles.footerRow}>
        <Text style={[styles.axisLabel, { color: theme.textSecondary }]}>{firstDate}</Text>
        <Text style={[styles.axisLabel, { color: theme.textSecondary }]}>{lastDate}</Text>
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
    gap: 12,
  },
  metricItem: {
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
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
