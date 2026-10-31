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
  useColorScheme,
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
  const isDark = useColorScheme() === 'dark';

  const colors = {
    bg: isDark ? '#000000' : '#F2F2F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    border: isDark ? '#2C2C2E' : '#E5E5EA',
    textPrimary: isDark ? '#FFFFFF' : '#1C1C1E',
    textSecondary: isDark ? '#8E8E93' : '#6C6C70',
    accent: isDark ? '#0A84FF' : '#007AFF',
    accentBg: isDark ? '#142845' : '#EBF5FF',
    success: isDark ? '#30D158' : '#34C759',
    successBg: isDark ? '#143820' : '#E8F8ED',
    warning: isDark ? '#FF9F0A' : '#FF9500',
    warningBg: isDark ? '#3D2808' : '#FFF5E5',
    danger: isDark ? '#FF453A' : '#FF3B30',
    dangerBg: isDark ? '#3A1412' : '#FFEBEA',
    badgeBg: isDark ? '#2C2C2E' : '#F2F2F7',
  };

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
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Analiz verileri hesaplanıyor...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}>
      {/* Top Action CTA Header */}
      <View style={styles.topRow}>
        <Text style={[styles.screenHeadline, { color: colors.textPrimary }]}>
          Kilo & Yan Etki Analizi
        </Text>
        <View style={styles.actionButtonsGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yeni kilo kaydet"
            onPress={() => router.push('/modal-log-weight')}
            style={[styles.smallActionButton, { backgroundColor: colors.accent }]}>
            <Text style={styles.smallActionText}>+ Kilo</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yeni yan etki kaydet"
            onPress={() => router.push('/modal-log-symptom')}
            style={[styles.smallActionButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={[styles.smallActionText, { color: colors.textPrimary }]}>+ Yan Etki</Text>
          </Pressable>
        </View>
      </View>

      {/* Metrics Cards Grid */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.metricCardLabel, { color: colors.textSecondary }]}>
            Toplam Değişim
          </Text>
          <Text
            style={[
              styles.metricCardValue,
              {
                color:
                  weightMetrics.totalChangeKg === null
                    ? colors.textPrimary
                    : weightMetrics.totalChangeKg <= 0
                    ? colors.success
                    : colors.warning,
              },
            ]}>
            {weightMetrics.totalChangeKg !== null
              ? `${weightMetrics.totalChangeKg > 0 ? '+' : ''}${weightMetrics.totalChangeKg} kg`
              : '—'}
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.metricCardLabel, { color: colors.textSecondary }]}>
            Haftalık Hız
          </Text>
          <Text style={[styles.metricCardValue, { color: colors.textPrimary }]}>
            {weightMetrics.weeklyRateKg !== null
              ? `${weightMetrics.weeklyRateKg > 0 ? '+' : ''}${weightMetrics.weeklyRateKg} kg/hf`
              : '—'}
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.metricCardLabel, { color: colors.textSecondary }]}>
            Hedefe Kalan
          </Text>
          <Text
            style={[
              styles.metricCardValue,
              {
                color: weightMetrics.isTargetReached
                  ? colors.success
                  : colors.accent,
              },
            ]}>
            {weightMetrics.isTargetReached
              ? 'Ulaşıldı!'
              : weightMetrics.remainingToTargetKg !== null
              ? `${weightMetrics.remainingToTargetKg} kg`
              : 'Hedef yok'}
          </Text>
        </View>
      </View>

      {/* Weight Chart Component */}
      <WeightChart
        weightLogs={weightLogs}
        targetWeightKg={settings?.targetWeightKg}
        height={220}
      />

      {/* Adverse Side Effects Breakdown (Last 30 Days) */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Yan Etki Dağılımı (Son 30 Gün)
          </Text>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
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
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                },
              ]}>
              <View style={styles.symptomLeft}>
                <Text style={[styles.symptomName, { color: colors.textPrimary }]}>
                  {item.label}
                </Text>
                {item.count > 0 ? (
                  <Text style={[styles.symptomSeverityText, { color: colors.textSecondary }]}>
                    Ortalama Şiddet: {item.averageSeverity} / 5
                  </Text>
                ) : null}
              </View>

              <View
                style={[
                  styles.symptomBadge,
                  {
                    backgroundColor: item.count > 0 ? colors.accentBg : colors.badgeBg,
                  },
                ]}>
                <Text
                  style={[
                    styles.symptomBadgeText,
                    {
                      color: item.count > 0 ? colors.accent : colors.textSecondary,
                    },
                  ]}>
                  {item.count} kez
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Weight History Log List */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Kilo Kayıtları Geçmişi ({weightLogs.length})
          </Text>
        </View>

        {weightLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Henüz kilo kaydı bulunmuyor
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              İlerlemenizi takip etmek için ilk kilo ölçümünüzü girin.
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {weightLogs.map((log, index) => (
              <View key={log.id}>
                {index > 0 && (
                  <View
                    style={[styles.listDivider, { backgroundColor: colors.border }]}
                  />
                )}
                <View style={styles.historyItemRow}>
                  <View style={styles.historyMainContent}>
                    <Text style={[styles.historyWeight, { color: colors.textPrimary }]}>
                      {log.weightKg.toFixed(1)} kg
                    </Text>
                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
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
                      { backgroundColor: colors.dangerBg },
                    ]}>
                    <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
                      Sil
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
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
    paddingBottom: 32,
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
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
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
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
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
  },
  subText: {
    fontSize: 13,
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
