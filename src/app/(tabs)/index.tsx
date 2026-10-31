import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Injection, Medication, UserSettings } from '../../types';
import {
  getInjections,
  getMedications,
  getNutritionLog,
  getUserSettings,
  saveNutritionLog,
} from '../../services/db';
import { calculateCurrentBloodLevel } from '../../services/pk-engine';
import { getRecommendedNextSite, getSiteDisplayName } from '../../services/rotation-engine';
import { calculateNextInjectionInfo } from '../../services/analytics-helpers';

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DashboardScreen() {
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
    trackBg: isDark ? '#2C2C2E' : '#E5E5EA',
    pillBg: isDark ? '#2C2C2E' : '#F2F2F7',
  };

  const [isLoading, setIsLoading] = useState(true);
  const [injections, setInjections] = useState<Injection[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [proteinG, setProteinG] = useState(0);
  const [waterMl, setWaterMl] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const today = getTodayDateString();
      const [meds, injs, userSet, nutLog] = await Promise.all([
        getMedications(),
        getInjections(),
        getUserSettings(),
        getNutritionLog(today),
      ]);

      setMedications(meds);
      setInjections(injs);
      setSettings(userSet);

      if (nutLog) {
        setProteinG(nutLog.proteinG);
        setWaterMl(nutLog.waterMl);
      } else {
        setProteinG(0);
        setWaterMl(0);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const activeMed =
    medications.find((m) => m.id === settings?.activeMedicationId) ||
    medications[0] || {
      id: 'default',
      name: 'GLP-1 İlaç',
      type: 'semaglutide',
      halfLifeHours: 168,
      createdAt: '',
    };

  const currentLevelMg = calculateCurrentBloodLevel(
    injections,
    activeMed.halfLifeHours
  );

  const nextInfo = calculateNextInjectionInfo(
    injections,
    settings?.preferredInjectionDay
  );

  const recommendedSite = getRecommendedNextSite(injections);
  const recommendedSiteLabel = getSiteDisplayName(recommendedSite);

  const currentDoseMg =
    settings?.currentDoseMg ||
    (injections.length > 0 ? injections[0].doseMg : 0.25);

  const proteinTargetG = settings?.dailyProteinTargetG || 100;
  const waterTargetMl = settings?.dailyWaterTargetMl || 2500;

  const proteinPercent = Math.min(
    100,
    Math.round((proteinG / proteinTargetG) * 100)
  );
  const waterPercent = Math.min(
    100,
    Math.round((waterMl / waterTargetMl) * 100)
  );

  const handleAddProtein = async (amount: number) => {
    const today = getTodayDateString();
    const newProtein = proteinG + amount;
    setProteinG(newProtein);
    await saveNutritionLog(today, newProtein, waterMl);
  };

  const handleAddWater = async (amount: number) => {
    const today = getTodayDateString();
    const newWater = waterMl + amount;
    setWaterMl(newWater);
    await saveNutritionLog(today, proteinG, newWater);
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Veriler yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}>
      {/* Quick Action Navigation Buttons */}
      <View style={styles.quickActionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enjeksiyon kaydet ekranına git"
          onPress={() => router.push('/modal-log-injection')}
          style={[styles.quickButton, { backgroundColor: colors.accentBg, borderColor: colors.border }]}>
          <Text style={[styles.quickButtonText, { color: colors.accent }]}>+ Doz Kaydet</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kilo gir ekranına git"
          onPress={() => router.push('/modal-log-weight')}
          style={[styles.quickButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.quickButtonText, { color: colors.textPrimary }]}>+ Kilo Gir</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yan etki gir ekranına git"
          onPress={() => router.push('/modal-log-symptom')}
          style={[styles.quickButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.quickButtonText, { color: colors.textPrimary }]}>+ Yan Etki</Text>
        </Pressable>
      </View>

      {/* Next Injection Status Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Sıradaki Enjeksiyon
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: nextInfo.isOverdue
                  ? colors.warningBg
                  : colors.successBg,
              },
            ]}>
            <Text
              style={[
                styles.statusBadgeText,
                {
                  color: nextInfo.isOverdue ? colors.warning : colors.success,
                },
              ]}>
              {nextInfo.countdownText}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Planlanan Doz
            </Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {currentDoseMg} mg
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Önerilen Bölge
            </Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {recommendedSiteLabel}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              Aktif İlaç
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.metricValue, { color: colors.textPrimary, maxWidth: 110 }]}>
              {activeMed.name.split(' ')[0]}
            </Text>
          </View>
        </View>
      </View>

      {/* Real-Time Drug Concentration Level Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Aktif İlaç Seviyesi
          </Text>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            Yarı ömür: {Math.round(activeMed.halfLifeHours / 24)} gün
          </Text>
        </View>

        <View style={styles.gaugeContainer}>
          <View style={styles.gaugeValueRow}>
            <Text style={[styles.largeValue, { color: colors.accent }]}>
              {currentLevelMg.toFixed(2)}
            </Text>
            <Text style={[styles.unitText, { color: colors.textSecondary }]}>mg kanda aktif</Text>
          </View>

          {/* Concentration Meter Bar */}
          <View style={[styles.progressBarTrack, { backgroundColor: colors.trackBg }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.accent,
                  width: `${Math.min(100, Math.max(8, (currentLevelMg / (currentDoseMg * 2 || 1)) * 100))}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.gaugeHint, { color: colors.textSecondary }]}>
            {injections.length === 0
              ? 'Henüz enjeksiyon kaydı yok. İlk dozunuzu kaydederek başlayın.'
              : 'Farmakokinetik tek-kompartman modeline göre anlık hesaplanmaktadır.'}
          </Text>
        </View>
      </View>

      {/* Daily Nutrition & Hydration Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          Bugünkü Beslenme & Hidrasyon
        </Text>

        {/* Protein Section */}
        <View style={styles.nutrientBlock}>
          <View style={styles.nutrientHeader}>
            <Text style={[styles.nutrientLabel, { color: colors.textPrimary }]}>
              Protein Hedefi
            </Text>
            <Text style={[styles.nutrientNumbers, { color: colors.textPrimary }]}>
              {proteinG} / {proteinTargetG} g ({proteinPercent}%)
            </Text>
          </View>

          <View style={[styles.progressBarTrack, { backgroundColor: colors.trackBg }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.success,
                  width: `${proteinPercent}%`,
                },
              ]}
            />
          </View>

          <View style={styles.quickAddRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="10 gram protein ekle"
              onPress={() => handleAddProtein(10)}
              style={[styles.incrementButton, { backgroundColor: colors.pillBg, borderColor: colors.border }]}>
              <Text style={[styles.incrementText, { color: colors.textPrimary }]}>+10g</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="25 gram protein ekle"
              onPress={() => handleAddProtein(25)}
              style={[styles.incrementButton, { backgroundColor: colors.pillBg, borderColor: colors.border }]}>
              <Text style={[styles.incrementText, { color: colors.textPrimary }]}>+25g</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Water Section */}
        <View style={styles.nutrientBlock}>
          <View style={styles.nutrientHeader}>
            <Text style={[styles.nutrientLabel, { color: colors.textPrimary }]}>
              Su Hedefi
            </Text>
            <Text style={[styles.nutrientNumbers, { color: colors.textPrimary }]}>
              {waterMl} / {waterTargetMl} ml ({waterPercent}%)
            </Text>
          </View>

          <View style={[styles.progressBarTrack, { backgroundColor: colors.trackBg }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.accent,
                  width: `${waterPercent}%`,
                },
              ]}
            />
          </View>

          <View style={styles.quickAddRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="250 mililitre su ekle"
              onPress={() => handleAddWater(250)}
              style={[styles.incrementButton, { backgroundColor: colors.pillBg, borderColor: colors.border }]}>
              <Text style={[styles.incrementText, { color: colors.textPrimary }]}>+250ml</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="500 mililitre su ekle"
              onPress={() => handleAddWater(500)}
              style={[styles.incrementButton, { backgroundColor: colors.pillBg, borderColor: colors.border }]}>
              <Text style={[styles.incrementText, { color: colors.textPrimary }]}>+500ml</Text>
            </Pressable>
          </View>
        </View>
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
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subText: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 4,
  },
  metricItem: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  gaugeContainer: {
    gap: 10,
  },
  gaugeValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  largeValue: {
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  gaugeHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  nutrientBlock: {
    gap: 10,
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutrientLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  nutrientNumbers: {
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 10,
  },
  incrementButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incrementText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
});
