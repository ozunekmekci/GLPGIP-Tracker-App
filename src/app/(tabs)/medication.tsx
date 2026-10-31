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
  ROTATION_ORDER,
  getSiteRotationHistory,
} from '../../services/rotation-engine';
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

function formatRelativeOrDate(isoStr: string | null): string {
  if (!isoStr) return 'Kullanılmadı';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return 'Kullanılmadı';
  }
}

export default function MedicationScreen() {
  const { tokens, isDark } = useAppTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [injections, setInjections] = useState<Injection[]>([]);
  const [activeMedication, setActiveMedication] = useState<Medication | null>(null);

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

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.bg }]}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
          Farmakokinetik veriler hazırlanıyor...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.bg }]}
      contentContainerStyle={styles.content}>
      {/* Top CTA Row */}
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

      {/* PK Chart Container */}
      <GlassCard style={styles.card}>
        <PKChart
          injections={injections}
          halfLifeHours={activeMedication?.halfLifeHours || 168}
          height={220}
        />
      </GlassCard>

      {/* Anatomical Site Rotation Summary Card */}
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
            Enjeksiyon Bölgeleri & Rotasyon
          </Text>
          <Text style={[styles.subText, { color: tokens.textSecondary }]}>
            Lipohipertrofiyi önlemek için rotasyon önerilir
          </Text>
        </View>

        <View style={styles.sitesGrid}>
          {ROTATION_ORDER.map((siteKey) => {
            const stats = siteHistory[siteKey as InjectionSite];
            return (
              <View
                key={siteKey}
                style={[
                  styles.siteBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.03)',
                    borderColor: tokens.cardBorder,
                  },
                ]}>
                <Text style={[styles.siteName, { color: tokens.textPrimary }]}>
                  {stats.displayName}
                </Text>
                <View style={styles.siteMetaRow}>
                  <Text style={[styles.siteCountBadge, { color: tokens.accent }]}>
                    {stats.count} enjeksiyon
                  </Text>
                  <Text style={[styles.siteLastUsed, { color: tokens.textSecondary }]}>
                    {formatRelativeOrDate(stats.lastUsedAt)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </GlassCard>

      {/* Chronological Injection History List */}
      <GlassCard style={styles.card}>
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
            <Text style={[styles.emptySubtitle, { color: tokens.textSecondary }]}>
              İlk dozunuzu kaydettiğinizde burada kronolojik olarak listelenecektir.
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
                      style={[styles.listDivider, { backgroundColor: tokens.cardBorder }]}
                    />
                  )}
                  <View style={styles.historyItemRow}>
                    <View style={styles.historyMainContent}>
                      <View style={styles.historyTopRow}>
                        <Text style={[styles.historyDose, { color: tokens.textPrimary }]}>
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
                          <Text style={[styles.siteBadgeText, { color: tokens.textSecondary }]}>
                            {siteStat?.displayName || inj.site}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.historyDate, { color: tokens.textSecondary }]}>
                        {formatDate(inj.injectedAt)}
                      </Text>

                      {inj.notes ? (
                        <Text style={[styles.historyNotes, { color: tokens.textSecondary }]}>
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
                      <Text style={[styles.deleteButtonText, { color: tokens.accentRed }]}>
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
  sitesGrid: {
    gap: 8,
  },
  siteBox: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  siteName: {
    fontSize: 15,
    fontWeight: '600',
  },
  siteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  siteCountBadge: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  siteLastUsed: {
    fontSize: 12,
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
