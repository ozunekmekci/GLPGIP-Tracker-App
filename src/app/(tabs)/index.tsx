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
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
import { useAppTheme, ThemeTokens } from '../../context/theme-context';
import { GlassCard } from '../../components/glass-card';
import { AmbientMesh } from '../../components/ambient-mesh';

export function getTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type PhysiologicalPhaseType = 'initial' | 'peak' | 'steady' | 'elimination';

export interface PhysiologicalPhaseInfo {
  phase: PhysiologicalPhaseType;
  label: string;
  badgeBg: string;
  badgeTextColor: string;
}

export function getPhysiologicalPhase(
  injections: Injection[],
  isDark: boolean,
  tokens: ThemeTokens,
  nowTimestamp: number = Date.now()
): PhysiologicalPhaseInfo {
  const activeInjections = injections
    .filter((inj) => !inj.deletedAt)
    .sort(
      (a, b) => new Date(b.injectedAt).getTime() - new Date(a.injectedAt).getTime()
    );

  if (activeInjections.length === 0) {
    return {
      phase: 'initial',
      label: 'Başlangıç Evresi',
      badgeBg: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
      badgeTextColor: tokens.textSecondary,
    };
  }

  const lastInj = activeInjections[0];
  const lastTime = new Date(lastInj.injectedAt).getTime();
  const elapsedHours = (nowTimestamp - lastTime) / (3600 * 1000);

  if (elapsedHours <= 48) {
    return {
      phase: 'peak',
      label: 'Pik Seviyesi ⚡',
      badgeBg: isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.12)',
      badgeTextColor: tokens.accent,
    };
  }

  if (elapsedHours <= 120) {
    return {
      phase: 'steady',
      label: 'Kararlı Durum 🟢',
      badgeBg: isDark ? 'rgba(52, 199, 89, 0.22)' : 'rgba(52, 199, 89, 0.14)',
      badgeTextColor: tokens.accentGreen,
    };
  }

  return {
    phase: 'elimination',
    label: 'Eliminasyon Evresi 📉',
    badgeBg: isDark ? 'rgba(255, 149, 0, 0.22)' : 'rgba(255, 149, 0, 0.14)',
    badgeTextColor: tokens.accentOrange,
  };
}

export interface AccumulationStats {
  accumulationPercent: number;
  clampedWidthPercent: number;
  targetDoseMg: number;
}

export function calculateAccumulationStats(
  currentLevelMg: number,
  targetDoseMg: number
): AccumulationStats {
  const safeTarget = targetDoseMg > 0 ? targetDoseMg : 0.25;
  const accumulationPercent = Math.round((currentLevelMg / safeTarget) * 100);
  const clampedWidthPercent = Math.max(0, Math.min(100, accumulationPercent));
  return {
    accumulationPercent,
    clampedWidthPercent,
    targetDoseMg: safeTarget,
  };
}

export interface NextInjectionBadgeStyle {
  label: string;
  bg: string;
  textColor: string;
}

export function getNextInjectionBadge(
  nextInfo: { isFirstDose?: boolean; isOverdue?: boolean; countdownText: string },
  isDark: boolean,
  tokens: ThemeTokens
): NextInjectionBadgeStyle {
  if (nextInfo.isFirstDose) {
    return {
      label: '+ Doz Kaydet',
      bg: isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.12)',
      textColor: tokens.accent,
    };
  }
  if (nextInfo.isOverdue) {
    return {
      label: nextInfo.countdownText,
      bg: isDark ? 'rgba(255, 149, 0, 0.22)' : 'rgba(255, 149, 0, 0.14)',
      textColor: tokens.accentOrange,
    };
  }
  return {
    label: nextInfo.countdownText,
    bg: isDark ? 'rgba(52, 199, 89, 0.22)' : 'rgba(52, 199, 89, 0.14)',
    textColor: tokens.accentGreen,
  };
}

export interface NutritionProgress {
  proteinPercent: number;
  waterPercent: number;
  isAllGoalsCompleted: boolean;
}

export function calculateNutritionProgress(
  proteinG: number,
  proteinTargetG: number,
  waterMl: number,
  waterTargetMl: number
): NutritionProgress {
  const safeProteinTarget = proteinTargetG > 0 ? proteinTargetG : 100;
  const safeWaterTarget = waterTargetMl > 0 ? waterTargetMl : 2500;

  const proteinPercent = Math.min(100, Math.round((proteinG / safeProteinTarget) * 100));
  const waterPercent = Math.min(100, Math.round((waterMl / safeWaterTarget) * 100));

  return {
    proteinPercent,
    waterPercent,
    isAllGoalsCompleted: proteinPercent >= 100 && waterPercent >= 100,
  };
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

  const { proteinPercent, waterPercent, isAllGoalsCompleted } =
    calculateNutritionProgress(proteinG, proteinTargetG, waterMl, waterTargetMl);

  const phaseInfo = getPhysiologicalPhase(injections, isDark, tokens);
  const accumulationStats = calculateAccumulationStats(currentLevelMg, currentDoseMg);
  const nextBadgeStyle = getNextInjectionBadge(nextInfo, isDark, tokens);

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
  const celebrationBg = isDark ? 'rgba(52, 199, 89, 0.18)' : 'rgba(52, 199, 89, 0.12)';
  const celebrationBorder = isDark ? 'rgba(52, 199, 89, 0.35)' : 'rgba(52, 199, 89, 0.25)';

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.bg }]}>
        <AmbientMesh />
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
          Veriler yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      <AmbientMesh />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* 1. Shotsy-style Hero Drug Concentration Bubble */}
        <GlassCard
          variant="prominent"
          glowColor={tokens.accent}
          style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View
              style={[
                styles.medBadge,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.05)',
                  borderColor: tokens.cardBorder,
                },
              ]}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.medBadgeText, { color: tokens.textPrimary }]}>
                {activeMed.name}
              </Text>
              <Text
                style={[styles.medBadgeSubtext, { color: tokens.textSecondary }]}>
                • {Math.round(activeMed.halfLifeHours / 24)} gün yarılanma
              </Text>
            </View>

            <View
              style={[
                styles.phaseBadge,
                { backgroundColor: phaseInfo.badgeBg },
              ]}>
              <Text
                style={[
                  styles.phaseBadgeText,
                  { color: phaseInfo.badgeTextColor },
                ]}>
                {phaseInfo.label}
              </Text>
            </View>
          </View>

          <View style={styles.heroReadoutContainer}>
            <Text style={[styles.heroLevelValue, { color: tokens.accent }]}>
              {currentLevelMg.toFixed(2)}
            </Text>
            <Text style={[styles.heroUnitText, { color: tokens.textSecondary }]}>
              mg kanda aktif
            </Text>
          </View>

          <View style={styles.accumulationContainer}>
            <View style={styles.accumulationHeaderRow}>
              <Text
                style={[styles.accumulationLabel, { color: tokens.textSecondary }]}>
                Mevcut Birikim
              </Text>
              <Text
                style={[styles.accumulationNumbers, { color: tokens.textPrimary }]}>
                %{accumulationStats.accumulationPercent} (Hedef: {currentDoseMg} mg)
              </Text>
            </View>

            <View style={styles.svgBarContainer}>
              <Svg width="100%" height={14} viewBox="0 0 320 14" style={styles.svgBar}>
                <Defs>
                  <LinearGradient id="heroGradient" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor={tokens.accent} stopOpacity={0.85} />
                    <Stop offset="100%" stopColor={tokens.accentGreen} stopOpacity={1} />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="2" width="320" height="10" rx="5" ry="5" fill={trackBg} />
                <Rect
                  x="0"
                  y="2"
                  width={Math.max(
                    6,
                    Math.min(320, (accumulationStats.clampedWidthPercent / 100) * 320)
                  )}
                  height="10"
                  rx="5"
                  ry="5"
                  fill="url(#heroGradient)"
                />
              </Svg>
            </View>

            <Text style={[styles.heroHintText, { color: tokens.textSecondary }]}>
              {injections.length === 0
                ? 'Henüz enjeksiyon kaydı yok. İlk dozunuzu kaydederek başlayın.'
                : 'Farmakokinetik tek-kompartman modeline göre anlık hesaplanmaktadır.'}
            </Text>
          </View>
        </GlassCard>

        {/* 2. Sıradaki Enjeksiyon Card */}
        <GlassCard
          variant="prominent"
          onPress={() => router.push('/modal-log-injection')}
          style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
              Sıradaki Enjeksiyon
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: nextBadgeStyle.bg },
              ]}>
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: nextBadgeStyle.textColor },
                ]}>
                {nextBadgeStyle.label}
              </Text>
            </View>
          </View>

          {nextInfo.isFirstDose ? (
            <View
              style={[
                styles.firstDoseCtaBanner,
                {
                  backgroundColor: isDark
                    ? 'rgba(0, 122, 255, 0.16)'
                    : 'rgba(0, 122, 255, 0.08)',
                  borderColor: isDark
                    ? 'rgba(0, 122, 255, 0.35)'
                    : 'rgba(0, 122, 255, 0.22)',
                },
              ]}>
              <Text style={[styles.firstDoseCtaText, { color: tokens.accent }]}>
                + İlk Dozunuzu Kaydetmek İçin Dokunun
              </Text>
            </View>
          ) : nextInfo.isOverdue ? (
            <View
              style={[
                styles.overdueBanner,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 149, 0, 0.16)'
                    : 'rgba(255, 149, 0, 0.10)',
                  borderColor: isDark
                    ? 'rgba(255, 149, 0, 0.35)'
                    : 'rgba(255, 149, 0, 0.22)',
                },
              ]}>
              <Text
                style={[styles.overdueBannerText, { color: tokens.accentOrange }]}>
                ⚠️ Enjeksiyon zamanı geçti: {nextInfo.countdownText}
              </Text>
            </View>
          ) : null}

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
              <View
                style={[
                  styles.siteBadge,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.05)',
                    borderColor: tokens.cardBorder,
                  },
                ]}>
                <Text
                  numberOfLines={1}
                  style={[styles.siteBadgeText, { color: tokens.textPrimary }]}>
                  {recommendedSiteLabel}
                </Text>
              </View>
            </View>

            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: tokens.textSecondary }]}>
                Aktif İlaç
              </Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.metricValue,
                  { color: tokens.textPrimary, maxWidth: 110 },
                ]}>
                {activeMed.name.split(' ')[0]}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* 3. Quick Actions Row (3 liquid glass pills) */}
        <View style={styles.quickActionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enjeksiyon kaydet ekranına git"
            onPress={() => router.push('/modal-log-injection')}
            style={({ pressed }) => [
              styles.quickActionPill,
              {
                backgroundColor: isDark
                  ? 'rgba(0, 122, 255, 0.22)'
                  : 'rgba(0, 122, 255, 0.12)',
                borderTopColor: isDark
                  ? 'rgba(120, 190, 255, 0.65)'
                  : 'rgba(255, 255, 255, 0.95)',
                borderBottomColor: isDark
                  ? 'rgba(0, 122, 255, 0.25)'
                  : 'rgba(0, 122, 255, 0.15)',
                borderLeftColor: isDark
                  ? 'rgba(0, 122, 255, 0.35)'
                  : 'rgba(0, 122, 255, 0.25)',
                borderRightColor: isDark
                  ? 'rgba(0, 122, 255, 0.35)'
                  : 'rgba(0, 122, 255, 0.25)',
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <Text
              style={[styles.quickActionPrimaryText, { color: tokens.accent }]}>
              + Doz Kaydet
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kilo gir ekranına git"
            onPress={() => router.push('/modal-log-weight')}
            style={({ pressed }) => [
              styles.quickActionPill,
              {
                backgroundColor: isDark
                  ? 'rgba(44, 44, 46, 0.70)'
                  : 'rgba(255, 255, 255, 0.80)',
                borderTopColor: isDark
                  ? 'rgba(255, 255, 255, 0.40)'
                  : 'rgba(255, 255, 255, 0.85)',
                borderBottomColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.06)',
                borderLeftColor: isDark
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.45)',
                borderRightColor: isDark
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.45)',
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <Text
              style={[
                styles.quickActionSecondaryText,
                { color: tokens.textPrimary },
              ]}
              numberOfLines={1}>
              + Kilo Gir
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yan etki gir ekranına git"
            onPress={() => router.push('/modal-log-symptom')}
            style={({ pressed }) => [
              styles.quickActionPill,
              {
                backgroundColor: isDark
                  ? 'rgba(44, 44, 46, 0.70)'
                  : 'rgba(255, 255, 255, 0.80)',
                borderTopColor: isDark
                  ? 'rgba(255, 255, 255, 0.40)'
                  : 'rgba(255, 255, 255, 0.85)',
                borderBottomColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.06)',
                borderLeftColor: isDark
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.45)',
                borderRightColor: isDark
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.45)',
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <Text
              style={[
                styles.quickActionSecondaryText,
                { color: tokens.textPrimary },
              ]}
              numberOfLines={1}>
              + Yan Etki
            </Text>
          </Pressable>
        </View>

        {/* 4. Daily Nutrition & Hydration Card */}
        <GlassCard variant="default" style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
              Bugünkü Beslenme & Hidrasyon
            </Text>
          </View>

          {/* Celebratory Banner when both goals completed */}
          {isAllGoalsCompleted && (
            <View
              style={[
                styles.celebrationBanner,
                {
                  backgroundColor: celebrationBg,
                  borderColor: celebrationBorder,
                },
              ]}>
              <Text
                style={[
                  styles.celebrationBannerText,
                  { color: tokens.accentGreen },
                ]}>
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
                    <Text
                      style={[styles.goalBadgeText, { color: tokens.accentGreen }]}>
                      ✓ Hedef Tamamlandı
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.nutrientNumbers, { color: tokens.textPrimary }]}>
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
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.35)'
                      : 'rgba(255, 255, 255, 0.85)',
                    borderBottomColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                    borderLeftColor: isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.45)',
                    borderRightColor: isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.45)',
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}>
                <Text style={[styles.incrementText, { color: tokens.textPrimary }]}>
                  +10g
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="25 gram protein ekle"
                onPress={() => handleAddProtein(25)}
                style={({ pressed }) => [
                  styles.incrementButton,
                  {
                    backgroundColor: tokens.cardBg,
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.35)'
                      : 'rgba(255, 255, 255, 0.85)',
                    borderBottomColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                    borderLeftColor: isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.45)',
                    borderRightColor: isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.45)',
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}>
                <Text style={[styles.incrementText, { color: tokens.textPrimary }]}>
                  +25g
                </Text>
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
                    <Text
                      style={[styles.goalBadgeText, { color: tokens.accentGreen }]}>
                      ✓ Hedef Tamamlandı
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.nutrientNumbers, { color: tokens.textPrimary }]}>
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
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.35)'
                      : 'rgba(255, 255, 255, 0.85)',
                    borderBottomColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                    borderLeftColor: isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.45)',
                    borderRightColor: isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.45)',
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}>
                <Text style={[styles.incrementText, { color: tokens.textPrimary }]}>
                  +250ml
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="500 mililitre su ekle"
                onPress={() => handleAddWater(500)}
                style={({ pressed }) => [
                  styles.incrementButton,
                  {
                    backgroundColor: tokens.cardBg,
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.35)'
                      : 'rgba(255, 255, 255, 0.85)',
                    borderBottomColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                    borderLeftColor: isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.45)',
                    borderRightColor: isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.45)',
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}>
                <Text style={[styles.incrementText, { color: tokens.textPrimary }]}>
                  +500ml
                </Text>
              </Pressable>
            </View>
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
  heroCard: {
    padding: 20,
    gap: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  medBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '55%',
    gap: 4,
  },
  medBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  medBadgeSubtext: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  phaseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heroReadoutContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  heroLevelValue: {
    fontSize: 44,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
    lineHeight: 52,
  },
  heroUnitText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  accumulationContainer: {
    gap: 8,
    paddingTop: 4,
  },
  accumulationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accumulationLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  accumulationNumbers: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  svgBarContainer: {
    width: '100%',
    height: 14,
    justifyContent: 'center',
  },
  svgBar: {
    width: '100%',
    height: 14,
  },
  heroHintText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
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
  firstDoseCtaBanner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstDoseCtaText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  overdueBanner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueBannerText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  siteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  siteBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionPill: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    borderTopWidth: 1.5,
    borderBottomWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  quickActionSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
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
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 10,
  },
  incrementButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderTopWidth: 1.5,
    borderBottomWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
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
