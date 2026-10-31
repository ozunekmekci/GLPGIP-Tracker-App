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
import { useAppTheme, ThemeTokens } from '../../context/theme-context';
import { GlassCard } from '../../components/glass-card';
import { AmbientMesh } from '../../components/ambient-mesh';

export interface SymptomSeverityBadge {
  label: string;
  bgColor: string;
  textColor: string;
}

export function getSymptomSeverityBadge(
  count: number,
  averageSeverity: number,
  isDark: boolean,
  tokens: ThemeTokens
): SymptomSeverityBadge {
  if (count === 0) {
    return {
      label: 'Kayıt yok',
      bgColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
      textColor: tokens.textSecondary,
    };
  }

  if (averageSeverity <= 2.0) {
    return {
      label: `Hafif (${averageSeverity}/5)`,
      bgColor: isDark ? 'rgba(52, 199, 89, 0.20)' : 'rgba(52, 199, 89, 0.12)',
      textColor: tokens.accentGreen,
    };
  }

  if (averageSeverity <= 3.5) {
    return {
      label: `Orta (${averageSeverity}/5)`,
      bgColor: isDark ? 'rgba(255, 149, 0, 0.20)' : 'rgba(255, 149, 0, 0.12)',
      textColor: tokens.accentOrange,
    };
  }

  return {
    label: `Şiddetli (${averageSeverity}/5)`,
    bgColor: isDark ? 'rgba(255, 59, 48, 0.20)' : 'rgba(255, 59, 48, 0.12)',
    textColor: tokens.accentRed,
  };
}

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
        <AmbientMesh />
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
          Analiz verileri hesaplanıyor...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.rootContainer, { backgroundColor: tokens.bg }]}>
      <AmbientMesh />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
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

        {/* 1. KPI Summary Cards Row with Specular Shine */}
        <View style={styles.metricsGrid}>
          <GlassCard variant="default" style={styles.metricCard}>
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
            <Text style={[styles.metricCardSub, { color: tokens.textSecondary }]}>
              {weightMetrics.startWeight !== null
                ? `Başlangıç: ${weightMetrics.startWeight} kg`
                : 'Kayıt bekleniyor'}
            </Text>
          </GlassCard>

          <GlassCard variant="default" style={styles.metricCard}>
            <Text style={[styles.metricCardLabel, { color: tokens.textSecondary }]}>
              Haftalık Hız
            </Text>
            <Text style={[styles.metricCardValue, { color: tokens.textPrimary }]}>
              {weightMetrics.weeklyRateKg !== null
                ? `${weightMetrics.weeklyRateKg > 0 ? '+' : ''}${weightMetrics.weeklyRateKg} kg/hf`
                : '—'}
            </Text>
            <Text style={[styles.metricCardSub, { color: tokens.textSecondary }]}>
              {weightMetrics.weeklyRateKg !== null && weightMetrics.weeklyRateKg <= 0
                ? 'İdeal seyir 📉'
                : 'Haftalık ortalama'}
            </Text>
          </GlassCard>

          <GlassCard variant="default" style={styles.metricCard}>
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
            <Text style={[styles.metricCardSub, { color: tokens.textSecondary }]}>
              {settings?.targetWeightKg
                ? `Hedef: ${settings.targetWeightKg} kg`
                : 'Hedef belirleyin'}
            </Text>
          </GlassCard>
        </View>

        {/* 2. Liquid Glass Weight Progress Chart */}
        <GlassCard
          variant="prominent"
          glowColor={tokens.accent}
          style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
              Kilo İlerleme Eğrisi
            </Text>
            <Text style={[styles.subText, { color: tokens.textSecondary }]}>
              {weightMetrics.currentWeight !== null
                ? `Güncel: ${weightMetrics.currentWeight} kg${settings?.targetWeightKg ? ` • Hedef: ${settings.targetWeightKg} kg` : ''}`
                : 'Kilo trendinizi görmek için düzenli ölçüm girin'}
            </Text>
          </View>

          <WeightChart
            weightLogs={weightLogs}
            targetWeightKg={settings?.targetWeightKg}
            height={220}
          />
        </GlassCard>

        {/* 3. Adverse Side Effects Breakdown (Last 30 Days) */}
        <GlassCard variant="default" style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
              Yan Etki Dağılımı (Son 30 Gün)
            </Text>
            <Text style={[styles.subText, { color: tokens.textSecondary }]}>
              {symptomStats.totalCount > 0
                ? `${symptomStats.totalCount} kayıt • Genel Ort. Şiddet: ${symptomStats.averageSeverity} / 5`
                : 'Son 30 günde kaydedilen yan etki yok'}
            </Text>
          </View>

          <View style={styles.symptomsList}>
            {symptomStats.breakdown.map((item) => {
              const severityBadge = getSymptomSeverityBadge(
                item.count,
                item.averageSeverity,
                isDark,
                tokens
              );

              return (
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
                      <Text
                        style={[
                          styles.symptomSeverityText,
                          { color: tokens.textSecondary },
                        ]}>
                        Ortalama Şiddet: {item.averageSeverity} / 5
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.symptomSeverityText,
                          { color: tokens.textSecondary },
                        ]}>
                        Belirti bildirilmedi
                      </Text>
                    )}
                  </View>

                  <View style={styles.symptomBadgesGroup}>
                    {/* Severity Badge */}
                    <View
                      style={[
                        styles.severityBadge,
                        { backgroundColor: severityBadge.bgColor },
                      ]}>
                      <Text
                        style={[
                          styles.severityBadgeText,
                          { color: severityBadge.textColor },
                        ]}>
                        {severityBadge.label}
                      </Text>
                    </View>

                    {/* Frequency Badge */}
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
                </View>
              );
            })}
          </View>
        </GlassCard>

        {/* 4. Weight History Log List */}
        <GlassCard variant="default" style={styles.card}>
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
                      style={[
                        styles.listDivider,
                        { backgroundColor: tokens.cardBorder },
                      ]}
                    />
                  )}
                  <View style={styles.historyItemRow}>
                    <View style={styles.historyMainContent}>
                      <Text
                        style={[styles.historyWeight, { color: tokens.textPrimary }]}>
                        {log.weightKg.toFixed(1)} kg
                      </Text>
                      <Text
                        style={[styles.historyDate, { color: tokens.textSecondary }]}>
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
                      <Text
                        style={[
                          styles.deleteButtonText,
                          { color: tokens.accentRed },
                        ]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
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
    gap: 8,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  metricCardLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricCardValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  metricCardSub: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
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
    minHeight: 52,
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
  symptomBadgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  symptomBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  symptomBadgeText: {
    fontSize: 12,
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
