import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SymptomLog, UserSettings, WeightLog } from '../../types';
import {
  deleteWeightLog,
  getSymptomLogs,
  getUserSettings,
  getWeightLogs,
} from '../../services/db';
import { WeightChart } from '../../components/weight-chart';
import {
  calculateSymptomStats,
  calculateWeightMetrics,
} from '../../services/analytics-helpers';
import { useAppTheme } from '../../context/theme-context';
import { GlassCard } from '../../components/glass-card';

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

export default function AnalyticsScreen() {
  const { tokens, isDark } = useAppTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [weights, symptoms, userSet] = await Promise.all([
        getWeightLogs(),
        getSymptomLogs(),
        getUserSettings(),
      ]);

      setWeightLogs(weights);
      setSymptomLogs(symptoms);
      setSettings(userSet);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDeleteWeight = (log: WeightLog) => {
    const message = `${log.weightKg} kg kilo kaydını silmek istediğinize emin misiniz?`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        deleteWeightLog(log.id).then(() => loadData());
      }
      return;
    }

    Alert.alert('Kilo Kaydını Sil', message, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteWeightLog(log.id);
          await loadData();
        },
      },
    ]);
  };

  const weightMetrics = calculateWeightMetrics(
    weightLogs,
    settings?.targetWeightKg
  );
  const symptomStats = calculateSymptomStats(symptomLogs, 30);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.bg }]}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
          Analiz verileri hesaplanıyor...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.bg }]}
      contentContainerStyle={styles.content}>
      {/* Top Action CTA Header */}
      <View style={styles.topRow}>
        <Text style={[styles.screenHeadline, { color: tokens.textPrimary }]}>
          Kilo & Yan Etki Analizi
        </Text>
        <View style={styles.actionButtonsGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yeni kilo kaydet"
            onPress={() => router.push('/modal-log-weight')}
            style={[styles.smallActionButton, { backgroundColor: tokens.accent }]}>
            <Text style={styles.smallActionText}>+ Kilo</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yeni yan etki kaydet"
            onPress={() => router.push('/modal-log-symptom')}
            style={[
              styles.smallActionButton,
              {
                backgroundColor: tokens.cardBg,
                borderColor: tokens.cardBorder,
                borderWidth: 1,
              },
            ]}>
            <Text style={[styles.smallActionText, { color: tokens.textPrimary }]}>
              + Yan Etki
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Metrics Cards Grid */}
      <View style={styles.metricsGrid}>
        <GlassCard style={styles.metricCard}>
          <Text style={[styles.metricCardLabel, { color: tokens.textSecondary }]}>
            Toplam Değişim
          </Text>
          <Text
            style={[
              styles.metricCardValue,
              {
                color:
                  weightMetrics.totalChangeKg === null
                    ? tokens.textPrimary
                    : weightMetrics.totalChangeKg <= 0
                    ? tokens.accentGreen
                    : tokens.accentOrange,
              },
            ]}>
            {weightMetrics.totalChangeKg !== null
              ? `${weightMetrics.totalChangeKg > 0 ? '+' : ''}${weightMetrics.totalChangeKg} kg`
              : '—'}
          </Text>
        </GlassCard>

        <GlassCard style={styles.metricCard}>
          <Text style={[styles.metricCardLabel, { color: tokens.textSecondary }]}>
            Haftalık Hız
          </Text>
          <Text style={[styles.metricCardValue, { color: tokens.textPrimary }]}>
            {weightMetrics.weeklyRateKg !== null
              ? `${weightMetrics.weeklyRateKg > 0 ? '+' : ''}${weightMetrics.weeklyRateKg} kg/hf`
              : '—'}
          </Text>
        </GlassCard>

        <GlassCard style={styles.metricCard}>
          <Text style={[styles.metricCardLabel, { color: tokens.textSecondary }]}>
            Hedefe Kalan
          </Text>
          <Text
            style={[
              styles.metricCardValue,
              {
                color: weightMetrics.isTargetReached
                  ? tokens.accentGreen
                  : tokens.accent,
              },
            ]}>
            {weightMetrics.isTargetReached
              ? 'Ulaşıldı!'
              : weightMetrics.remainingToTargetKg !== null
              ? `${weightMetrics.remainingToTargetKg} kg`
              : 'Hedef yok'}
          </Text>
        </GlassCard>
      </View>

      {/* Weight Chart Container */}
      <GlassCard style={styles.card}>
        <WeightChart
          weightLogs={weightLogs}
          targetWeightKg={settings?.targetWeightKg}
          height={220}
        />
      </GlassCard>

      {/* Adverse Side Effects Breakdown (Last 30 Days) */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
            Yan Etki Dağılımı (Son 30 Gün)
          </Text>
          <Text style={[styles.subText, { color: tokens.textSecondary }]}>
            {symptomStats.totalCount > 0
              ? `${symptomStats.totalCount} kayıt • Ort. Şiddet: ${symptomStats.averageSeverity} / 5`
              : 'Son 30 günde kaydedilen yan etki yok'}
          </Text>
        </View>

        <View style={styles.symptomsList}>
          {symptomStats.breakdown.map((item) => (
            <View
              key={item.symptomType}
              style={[
                styles.symptomRow,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.03)',
                  borderColor: tokens.cardBorder,
                },
              ]}>
              <View style={styles.symptomLeft}>
                <Text style={[styles.symptomName, { color: tokens.textPrimary }]}>
                  {item.label}
                </Text>
                {item.count > 0 ? (
                  <Text style={[styles.symptomSeverityText, { color: tokens.textSecondary }]}>
                    Ortalama Şiddet: {item.averageSeverity} / 5
                  </Text>
                ) : null}
              </View>

              <View
                style={[
                  styles.symptomBadge,
                  {
                    backgroundColor:
                      item.count > 0
                        ? isDark
                          ? 'rgba(0, 122, 255, 0.18)'
                          : 'rgba(0, 122, 255, 0.10)'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}>
                <Text
                  style={[
                    styles.symptomBadgeText,
                    {
                      color: item.count > 0 ? tokens.accent : tokens.textSecondary,
                    },
                  ]}>
                  {item.count} kez
                </Text>
              </View>
            </View>
          ))}
        </View>
      </GlassCard>

      {/* Weight History Log List */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
            Kilo Kayıtları Geçmişi ({weightLogs.length})
          </Text>
        </View>

        {weightLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: tokens.textPrimary }]}>
              Henüz kilo kaydı bulunmuyor
            </Text>
            <Text style={[styles.emptySubtitle, { color: tokens.textSecondary }]}>
              İlerlemenizi takip etmek için ilk kilo ölçümünüzü girin.
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {weightLogs.map((log, index) => (
              <View key={log.id}>
                {index > 0 && (
                  <View
                    style={[styles.listDivider, { backgroundColor: tokens.cardBorder }]}
                  />
                )}
                <View style={styles.historyItemRow}>
                  <View style={styles.historyMainContent}>
                    <Text style={[styles.historyWeight, { color: tokens.textPrimary }]}>
                      {log.weightKg.toFixed(1)} kg
                    </Text>
                    <Text style={[styles.historyDate, { color: tokens.textSecondary }]}>
                      {formatDate(log.loggedAt)}
                    </Text>
                  </View>

                  {/* Soft Delete Button */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Bu kilo kaydını sil"
                    hitSlop={12}
                    onPress={() => handleDeleteWeight(log)}
                    style={[
                      styles.deleteButton,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 59, 48, 0.18)'
                          : 'rgba(255, 59, 48, 0.12)',
                      },
                    ]}>
                    <Text style={[styles.deleteButtonText, { color: tokens.accentRed }]}>
                      Sil
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 110,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  screenHeadline: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  smallActionButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  metricCardLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricCardValue: {
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  card: {
    padding: 18,
    gap: 14,
  },
  cardHeader: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  subText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  symptomsList: {
    gap: 8,
  },
  symptomRow: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  symptomLeft: {
    flex: 1,
    gap: 2,
  },
  symptomName: {
    fontSize: 15,
    fontWeight: '600',
  },
  symptomSeverityText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  symptomBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  symptomBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  historyList: {
    gap: 2,
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyMainContent: {
    flex: 1,
    gap: 2,
  },
  historyWeight: {
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  historyDate: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  deleteButton: {
    minHeight: 44,
    minWidth: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
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
