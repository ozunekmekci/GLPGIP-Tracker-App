import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
import { useAppTheme } from '../../context/theme-context';
import { GlassCard } from '../../components/glass-card';

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DashboardScreen() {
  const { isDark, tokens } = useAppTheme();

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

  const trackBg = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)';
  const badgeGreenBg = isDark ? 'rgba(52, 199, 89, 0.22)' : 'rgba(52, 199, 89, 0.14)';
  const badgeOrangeBg = isDark ? 'rgba(255, 149, 0, 0.22)' : 'rgba(255, 149, 0, 0.14)';
  const badgeBlueBg = isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.12)';
  const celebrationBg = isDark ? 'rgba(52, 199, 89, 0.18)' : 'rgba(52, 199, 89, 0.12)';
  const celebrationBorder = isDark ? 'rgba(52, 199, 89, 0.35)' : 'rgba(52, 199, 89, 0.25)';

  let nextBadgeBg = badgeGreenBg;
  let nextBadgeTextColor = tokens.accentGreen;
  let nextBadgeLabel = nextInfo.countdownText;

  if (nextInfo.isFirstDose) {
    nextBadgeBg = badgeBlueBg;
    nextBadgeTextColor = tokens.accent;
    nextBadgeLabel = '+ Doz Kaydet';
  } else if (nextInfo.isOverdue) {
    nextBadgeBg = badgeOrangeBg;
    nextBadgeTextColor = tokens.accentOrange;
    nextBadgeLabel = nextInfo.countdownText;
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.bg }]}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
          Veriler yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.bg }]}
      contentContainerStyle={styles.content}>
      {/* Quick Action Navigation Buttons */}
      <View style={styles.quickActionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enjeksiyon kaydet ekranına git"
          onPress={() => router.push('/modal-log-injection')}
          style={({ pressed }) => [
            styles.quickButton,
            {
              backgroundColor: isDark ? 'rgba(0, 122, 255, 0.18)' : 'rgba(0, 122, 255, 0.10)',
              borderColor: isDark ? 'rgba(0, 122, 255, 0.35)' : 'rgba(0, 122, 255, 0.25)',
              borderWidth: StyleSheet.hairlineWidth,
              opacity: pressed ? 0.75 : 1,
            },
          ]}>
          <Text style={[styles.quickButtonText, { color: tokens.accent }]}>+ Doz Kaydet</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kilo gir ekranına git"
          onPress={() => router.push('/modal-log-weight')}
          style={({ pressed }) => [
            styles.quickButton,
            {
              backgroundColor: tokens.cardBg,
              borderColor: tokens.cardBorder,
              borderWidth: StyleSheet.hairlineWidth,
              opacity: pressed ? 0.75 : 1,
            },
          ]}>
          <Text style={[styles.quickButtonText, { color: tokens.textPrimary }]}>+ Kilo Gir</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yan etki gir ekranına git"
          onPress={() => router.push('/modal-log-symptom')}
          style={({ pressed }) => [
            styles.quickButton,
            {
              backgroundColor: tokens.cardBg,
              borderColor: tokens.cardBorder,
              borderWidth: StyleSheet.hairlineWidth,
              opacity: pressed ? 0.75 : 1,
            },
          ]}>
          <Text style={[styles.quickButtonText, { color: tokens.textPrimary }]}>+ Yan Etki</Text>
        </Pressable>
      </View>

      {/* Next Injection Status Card */}
      <GlassCard
        onPress={() => router.push('/modal-log-injection')}
        variant="prominent"
        style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
            Sıradaki Enjeksiyon
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: nextBadgeBg }]}>
            <Text style={[styles.statusBadgeText, { color: nextBadgeTextColor }]}>
              {nextBadgeLabel}
            </Text>
          </View>
        </View>

        {nextInfo.isFirstDose && (
          <Text style={[styles.firstDosePromptText, { color: tokens.textSecondary }]}>
            {nextInfo.countdownText}
          </Text>
        )}

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: tokens.textSecondary }]}>
              {nextInfo.isFirstDose ? 'Başlangıç Dozu' : 'Planlanan Doz'}
            </Text>
            <Text style={[styles.metricValue, { color: tokens.textPrimary }]}>
              {currentDoseMg} mg
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: tokens.textSecondary }]}>
              Önerilen Bölge
            </Text>
            <Text style={[styles.metricValue, { color: tokens.textPrimary }]}>
              {recommendedSiteLabel}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: tokens.textSecondary }]}>
              Aktif İlaç
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.metricValue, { color: tokens.textPrimary, maxWidth: 110 }]}>
              {activeMed.name.split(' ')[0]}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Real-Time Drug Concentration Level Card */}
      <GlassCard variant="default" style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
            Aktif İlaç Seviyesi
          </Text>
          <Text style={[styles.subText, { color: tokens.textSecondary }]}>
            Yarı ömür: {Math.round(activeMed.halfLifeHours / 24)} gün
          </Text>
        </View>

        <View style={styles.gaugeContainer}>
          <View style={styles.gaugeValueRow}>
            <Text style={[styles.largeValue, { color: tokens.accent }]}>
              {currentLevelMg.toFixed(2)}
            </Text>
            <Text style={[styles.unitText, { color: tokens.textSecondary }]}>mg kanda aktif</Text>
          </View>

          {/* Concentration Meter Bar */}
          <View style={[styles.progressBarTrack, { backgroundColor: trackBg }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: tokens.accent,
                  width: `${Math.min(100, Math.max(8, (currentLevelMg / (currentDoseMg * 2 || 1)) * 100))}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.gaugeHint, { color: tokens.textSecondary }]}>
            {injections.length === 0
              ? 'Henüz enjeksiyon kaydı yok. İlk dozunuzu kaydederek başlayın.'
              : 'Farmakokinetik tek-kompartman modeline göre anlık hesaplanmaktadır.'}
          </Text>
        </View>
      </GlassCard>

      {/* Daily Nutrition & Hydration Card */}
      <GlassCard variant="default" style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
            Bugünkü Beslenme & Hidrasyon
          </Text>
        </View>

        {/* Celebratory Banner when both goals completed */}
        {proteinPercent >= 100 && waterPercent >= 100 && (
          <View
            style={[
              styles.celebrationBanner,
              {
                backgroundColor: celebrationBg,
                borderColor: celebrationBorder,
              },
            ]}>
            <Text style={[styles.celebrationBannerText, { color: tokens.accentGreen }]}>
              🎯 Bugünün hedeflerine ulaştınız!
            </Text>
          </View>
        )}

        {/* Protein Section */}
        <View style={styles.nutrientBlock}>
          <View style={styles.nutrientHeader}>
            <View style={styles.nutrientTitleRow}>
              <Text style={[styles.nutrientLabel, { color: tokens.textPrimary }]}>
                Protein Hedefi
              </Text>
              {proteinPercent >= 100 && (
                <View style={[styles.goalBadge, { backgroundColor: badgeGreenBg }]}>
                  <Text style={[styles.goalBadgeText, { color: tokens.accentGreen }]}>
                    ✓ Hedef Tamamlandı
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.nutrientNumbers, { color: tokens.textPrimary }]}>
              {proteinG} / {proteinTargetG} g ({proteinPercent}%)
            </Text>
          </View>

          <View style={[styles.progressBarTrack, { backgroundColor: trackBg }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: tokens.accentGreen,
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
              style={({ pressed }) => [
                styles.incrementButton,
                {
                  backgroundColor: tokens.cardBg,
                  borderColor: tokens.cardBorder,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <Text style={[styles.incrementText, { color: tokens.textPrimary }]}>+10g</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="25 gram protein ekle"
              onPress={() => handleAddProtein(25)}
              style={({ pressed }) => [
                styles.incrementButton,
                {
                  backgroundColor: tokens.cardBg,
                  borderColor: tokens.cardBorder,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <Text style={[styles.incrementText, { color: tokens.textPrimary }]}>+25g</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: tokens.cardBorder }]} />

        {/* Water Section */}
        <View style={styles.nutrientBlock}>
          <View style={styles.nutrientHeader}>
            <View style={styles.nutrientTitleRow}>
              <Text style={[styles.nutrientLabel, { color: tokens.textPrimary }]}>
                Su Hedefi
              </Text>
              {waterPercent >= 100 && (
                <View style={[styles.goalBadge, { backgroundColor: badgeGreenBg }]}>
                  <Text style={[styles.goalBadgeText, { color: tokens.accentGreen }]}>
                    ✓ Hedef Tamamlandı
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.nutrientNumbers, { color: tokens.textPrimary }]}>
              {waterMl} / {waterTargetMl} ml ({waterPercent}%)
            </Text>
          </View>

          <View style={[styles.progressBarTrack, { backgroundColor: trackBg }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: tokens.accent,
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
              style={({ pressed }) => [
                styles.incrementButton,
                {
                  backgroundColor: tokens.cardBg,
                  borderColor: tokens.cardBorder,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <Text style={[styles.incrementText, { color: tokens.textPrimary }]}>+250ml</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="500 mililitre su ekle"
              onPress={() => handleAddWater(500)}
              style={({ pressed }) => [
                styles.incrementButton,
                {
                  backgroundColor: tokens.cardBg,
                  borderColor: tokens.cardBorder,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <Text style={[styles.incrementText, { color: tokens.textPrimary }]}>+500ml</Text>
            </Pressable>
          </View>
        </View>
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
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
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
    fontVariant: ['tabular-nums'],
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
  firstDosePromptText: {
    fontSize: 13,
    lineHeight: 18,
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
  celebrationBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationBannerText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  nutrientBlock: {
    gap: 10,
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutrientTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  goalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  goalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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
