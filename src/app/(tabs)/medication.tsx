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
import { Injection, InjectionSite, Medication } from '../../types';
import {
  deleteInjection,
  getInjections,
  getMedications,
  getUserSettings,
} from '../../services/db';
import { PKChart } from '../../components/pk-chart';
import {
  getSiteRotationHistory,
  getRecommendedNextSite,
} from '../../services/rotation-engine';
import { useAppTheme } from '../../context/theme-context';
import { GlassCard } from '../../components/glass-card';
import { AmbientMesh } from '../../components/ambient-mesh';

export interface AnatomicalZoneConfig {
  key: InjectionSite;
  zoneName: string;
  sideLabel: string;
  category: 'abdomen' | 'thigh' | 'arm';
}

export const ANATOMICAL_ZONES: AnatomicalZoneConfig[] = [
  {
    key: 'abdomen_left',
    zoneName: 'Abdomen Sol',
    sideLabel: 'Sol Karın',
    category: 'abdomen',
  },
  {
    key: 'abdomen_right',
    zoneName: 'Abdomen Sağ',
    sideLabel: 'Sağ Karın',
    category: 'abdomen',
  },
  {
    key: 'thigh_left',
    zoneName: 'Uyluk (Bacak) Sol',
    sideLabel: 'Sol Üst Bacak',
    category: 'thigh',
  },
  {
    key: 'thigh_right',
    zoneName: 'Uyluk (Bacak) Sağ',
    sideLabel: 'Sağ Üst Bacak',
    category: 'thigh',
  },
  {
    key: 'arm_left',
    zoneName: 'Kol Sol',
    sideLabel: 'Sol Üst Kol',
    category: 'arm',
  },
  {
    key: 'arm_right',
    zoneName: 'Kol Sağ',
    sideLabel: 'Sağ Üst Kol',
    category: 'arm',
  },
];

export const STANDARD_TITRATION_STEPS = [0.25, 0.5, 1.0, 1.7, 2.4];
export const TIRZEPATIDE_TITRATION_STEPS = [2.5, 5.0, 7.5, 10.0, 12.5, 15.0];

export function getTitrationSteps(medicationType?: string): number[] {
  if (medicationType === 'tirzepatide') {
    return TIRZEPATIDE_TITRATION_STEPS;
  }
  return STANDARD_TITRATION_STEPS;
}

export type TitrationStepStatus = 'completed' | 'active' | 'upcoming';

export function getTitrationStepStatus(
  stepDose: number,
  currentDose: number,
  injections: Injection[] = []
): TitrationStepStatus {
  if (stepDose === currentDose) {
    return 'active';
  }
  const hasTakenHigher =
    currentDose > stepDose ||
    injections.some((inj) => !inj.deletedAt && inj.doseMg >= stepDose);
  if (hasTakenHigher) {
    return 'completed';
  }
  return 'upcoming';
}

export function formatSiteRelativeUsage(
  lastUsedAt: string | null,
  nowTimestamp: number = Date.now()
): string {
  if (!lastUsedAt) return 'Hiç kullanılmadı';
  const diffMs = nowTimestamp - new Date(lastUsedAt).getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'Hiç kullanılmadı';

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (3600 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));

  if (diffMinutes < 60) {
    return 'Az önce';
  }
  if (diffHours < 24) {
    return `${diffHours} saat önce`;
  }
  if (diffDays === 1) {
    return '1 gün önce';
  }
  if (diffDays < 30) {
    return `${diffDays} gün önce`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} ay önce`;
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

export default function MedicationScreen() {
  const { tokens, isDark } = useAppTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [injections, setInjections] = useState<Injection[]>([]);
  const [activeMedication, setActiveMedication] = useState<Medication | null>(null);
  const [currentDoseMg, setCurrentDoseMg] = useState<number>(0.25);

  const loadData = useCallback(async () => {
    try {
      const [injs, meds, settings] = await Promise.all([
        getInjections(),
        getMedications(),
        getUserSettings(),
      ]);

      setInjections(injs);

      const activeMed =
        meds.find((m) => m.id === settings.activeMedicationId) || meds[0];
      if (activeMed) {
        setActiveMedication(activeMed);
      }

      const activeDose =
        settings.currentDoseMg ||
        (injs.length > 0 ? injs[0].doseMg : 0.25);
      setCurrentDoseMg(activeDose);
    } catch (error) {
      console.error('Failed to load medication tab data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDelete = (injection: Injection) => {
    const title = 'Enjeksiyon Kaydını Sil';
    const message = `${injection.doseMg} mg doz kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        deleteInjection(injection.id).then(() => loadData());
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteInjection(injection.id);
          await loadData();
        },
      },
    ]);
  };

  const siteHistory = getSiteRotationHistory(injections);
  const recommendedSite = getRecommendedNextSite(injections);
  const titrationSteps = getTitrationSteps(activeMedication?.type);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.bg }]}>
        <AmbientMesh />
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
          Farmakokinetik veriler hazırlanıyor...
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
        {/* Top Header Row with Action CTA */}
        <View style={styles.topRow}>
          <Text style={[styles.screenHeadline, { color: tokens.textPrimary }]}>
            Farmakokinetik & Doz Takibi
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yeni enjeksiyon kaydet"
            onPress={() => router.push('/modal-log-injection')}
            style={[styles.addDoseButton, { backgroundColor: tokens.accent }]}>
            <Text style={styles.addDoseButtonText}>+ Yeni Enjeksiyon</Text>
          </Pressable>
        </View>

        {/* 1. Liquid Glass PK Chart Container */}
        <GlassCard
          variant="prominent"
          glowColor={tokens.accent}
          style={styles.card}>
          <PKChart
            injections={injections}
            halfLifeHours={activeMedication?.halfLifeHours || 168}
            height={220}
          />
        </GlassCard>

        {/* 2. Tactical Anatomical Injection Site Visual Map */}
        <GlassCard variant="default" style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
              Enjeksiyon Bölgeleri & Rotasyon
            </Text>
            <Text style={[styles.subText, { color: tokens.textSecondary }]}>
              Doku sağlığı için her dozda bölge değiştirmeniz önerilir
            </Text>
          </View>

          <View style={styles.anatomicalGrid}>
            {ANATOMICAL_ZONES.map((zone) => {
              const stats = siteHistory[zone.key];
              const isRecommended = zone.key === recommendedSite;
              const relativeTime = formatSiteRelativeUsage(
                stats?.lastUsedAt ?? null
              );

              return (
                <Pressable
                  key={zone.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${zone.zoneName}, ${stats?.count ?? 0} enjeksiyon, ${relativeTime}${isRecommended ? ', Önerilen enjeksiyon bölgesi' : ''}`}
                  onPress={() =>
                    router.push({
                      pathname: '/modal-log-injection',
                      params: { site: zone.key },
                    })
                  }
                  style={[
                    styles.anatomicalBox,
                    {
                      backgroundColor: isRecommended
                        ? isDark
                          ? 'rgba(52, 199, 89, 0.12)'
                          : 'rgba(52, 199, 89, 0.08)'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.03)',
                      borderColor: isRecommended
                        ? tokens.accentGreen
                        : tokens.cardBorder,
                      borderWidth: isRecommended ? 1.5 : StyleSheet.hairlineWidth,
                    },
                  ]}>
                  <View style={styles.zoneHeaderRow}>
                    <Text
                      style={[
                        styles.zoneTitle,
                        {
                          color: isRecommended
                            ? tokens.accentGreen
                            : tokens.textPrimary,
                        },
                      ]}>
                      {zone.zoneName}
                    </Text>
                    {isRecommended && (
                      <View
                        style={[
                          styles.recommendedBadge,
                          {
                            backgroundColor: isDark
                              ? 'rgba(52, 199, 89, 0.25)'
                              : 'rgba(52, 199, 89, 0.15)',
                          },
                        ]}>
                        <Text
                          style={[
                            styles.recommendedBadgeText,
                            { color: tokens.accentGreen },
                          ]}>
                          Önerilen
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[styles.zoneSideLabel, { color: tokens.textSecondary }]}>
                    {zone.sideLabel}
                  </Text>

                  <View style={styles.zoneStatsRow}>
                    <Text
                      style={[styles.zoneCount, { color: tokens.accent }]}>
                      {stats?.count ?? 0} doz
                    </Text>
                    <Text
                      style={[
                        styles.zoneRelativeTime,
                        { color: tokens.textSecondary },
                      ]}>
                      {relativeTime}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        {/* 3. Titration Milestone Roadmap */}
        <GlassCard variant="subtle" style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
              Titrasyon Aşamaları
            </Text>
            <Text style={[styles.subText, { color: tokens.textSecondary }]}>
              Mevcut basamak: {currentDoseMg} mg • Kademeli doz artış yol haritası
            </Text>
          </View>

          <View style={styles.titrationRamp}>
            {titrationSteps.map((stepDose, idx) => {
              const status = getTitrationStepStatus(
                stepDose,
                currentDoseMg,
                injections
              );
              const isActive = status === 'active';
              const isCompleted = status === 'completed';

              return (
                <View key={stepDose} style={styles.titrationStepWrapper}>
                  <View
                    style={[
                      styles.titrationPill,
                      {
                        backgroundColor: isActive
                          ? tokens.accent
                          : isCompleted
                          ? isDark
                            ? 'rgba(52, 199, 89, 0.20)'
                            : 'rgba(52, 199, 89, 0.14)'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(0, 0, 0, 0.04)',
                        borderColor: isActive
                          ? tokens.accent
                          : isCompleted
                          ? isDark
                            ? 'rgba(52, 199, 89, 0.40)'
                            : 'rgba(52, 199, 89, 0.35)'
                          : tokens.cardBorder,
                      },
                    ]}>
                    {isCompleted ? (
                      <Text
                        style={[
                          styles.titrationCheck,
                          { color: tokens.accentGreen },
                        ]}>
                        ✓
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        styles.titrationPillText,
                        {
                          color: isActive
                            ? '#FFFFFF'
                            : isCompleted
                            ? tokens.accentGreen
                            : tokens.textSecondary,
                          fontWeight: isActive ? '700' : '600',
                        },
                      ]}>
                      {stepDose} mg
                    </Text>
                  </View>
                  {idx < titrationSteps.length - 1 && (
                    <View
                      style={[
                        styles.titrationConnector,
                        {
                          backgroundColor:
                            isCompleted || isActive
                              ? isDark
                                ? 'rgba(52, 199, 89, 0.45)'
                                : 'rgba(52, 199, 89, 0.35)'
                              : tokens.cardBorder,
                        },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </GlassCard>

        {/* 4. Chronological Injection History */}
        <GlassCard variant="default" style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
              Enjeksiyon Geçmişi ({injections.length})
            </Text>
          </View>

          {injections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: tokens.textPrimary }]}>
                Henüz enjeksiyon kaydı bulunmuyor
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: tokens.textSecondary }]}>
                İlk dozunuzu kaydettiğinizde burada kronolojik olarak
                listelenecektir.
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {injections.map((inj, index) => {
                const siteStat = siteHistory[inj.site];
                return (
                  <View key={inj.id}>
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
                        <View style={styles.historyTopRow}>
                          <Text
                            style={[
                              styles.historyDose,
                              { color: tokens.textPrimary },
                            ]}>
                            {inj.doseMg} mg
                          </Text>
                          <View
                            style={[
                              styles.siteBadge,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(255, 255, 255, 0.08)'
                                  : 'rgba(0, 0, 0, 0.05)',
                              },
                            ]}>
                            <Text
                              style={[
                                styles.siteBadgeText,
                                { color: tokens.textSecondary },
                              ]}>
                              {siteStat?.displayName || inj.site}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.historyDate,
                            { color: tokens.textSecondary },
                          ]}>
                          {formatDate(inj.injectedAt)}
                        </Text>

                        {inj.notes ? (
                          <Text
                            style={[
                              styles.historyNotes,
                              { color: tokens.textSecondary },
                            ]}>
                            {inj.notes}
                          </Text>
                        ) : null}
                      </View>

                      {/* Soft Delete Button */}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Bu enjeksiyonu sil"
                        hitSlop={12}
                        onPress={() => handleDelete(inj)}
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
                );
              })}
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
  addDoseButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addDoseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  },
  anatomicalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  anatomicalBox: {
    width: '48%',
    minHeight: 78,
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-between',
    gap: 4,
  },
  zoneHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  zoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  zoneSideLabel: {
    fontSize: 11,
  },
  recommendedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  zoneStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  zoneCount: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  zoneRelativeTime: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  titrationRamp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  titrationStepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titrationPill: {
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: 1,
  },
  titrationCheck: {
    fontSize: 11,
    fontWeight: '700',
  },
  titrationPillText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  titrationConnector: {
    height: 2,
    width: 6,
    marginHorizontal: 1,
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
    gap: 4,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDose: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  siteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  siteBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  historyNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
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
