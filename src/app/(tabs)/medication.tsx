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
  const isDark = useColorScheme() === 'dark';

  const colors = {
    bg: isDark ? '#000000' : '#F2F2F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    border: isDark ? '#2C2C2E' : '#E5E5EA',
    textPrimary: isDark ? '#FFFFFF' : '#1C1C1E',
    textSecondary: isDark ? '#8E8E93' : '#6C6C70',
    accent: isDark ? '#0A84FF' : '#007AFF',
    accentBg: isDark ? '#142845' : '#EBF5FF',
    badgeBg: isDark ? '#2C2C2E' : '#F2F2F7',
    danger: isDark ? '#FF453A' : '#FF3B30',
    dangerBg: isDark ? '#3A1412' : '#FFEBEA',
  };

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
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Farmakokinetik veriler hazırlanıyor...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}>
      {/* Top CTA Row */}
      <View style={styles.topRow}>
        <Text style={[styles.screenHeadline, { color: colors.textPrimary }]}>
          Farmakokinetik & Doz Takibi
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yeni enjeksiyon kaydet"
          onPress={() => router.push('/modal-log-injection')}
          style={[styles.addDoseButton, { backgroundColor: colors.accent }]}>
          <Text style={styles.addDoseButtonText}>+ Yeni Enjeksiyon</Text>
        </Pressable>
      </View>

      {/* PK Chart Component */}
      <PKChart
        injections={injections}
        halfLifeHours={activeMedication?.halfLifeHours || 168}
        height={220}
      />

      {/* Anatomical Site Rotation Summary Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Enjeksiyon Bölgeleri & Rotasyon
          </Text>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
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
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                  },
                ]}>
                <Text style={[styles.siteName, { color: colors.textPrimary }]}>
                  {stats.displayName}
                </Text>
                <View style={styles.siteMetaRow}>
                  <Text style={[styles.siteCountBadge, { color: colors.accent }]}>
                    {stats.count} enjeksiyon
                  </Text>
                  <Text style={[styles.siteLastUsed, { color: colors.textSecondary }]}>
                    {formatRelativeOrDate(stats.lastUsedAt)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Chronological Injection History List */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Enjeksiyon Geçmişi ({injections.length})
          </Text>
        </View>

        {injections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Henüz enjeksiyon kaydı bulunmuyor
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
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
                      style={[styles.listDivider, { backgroundColor: colors.border }]}
                    />
                  )}
                  <View style={styles.historyItemRow}>
                    <View style={styles.historyMainContent}>
                      <View style={styles.historyTopRow}>
                        <Text style={[styles.historyDose, { color: colors.textPrimary }]}>
                          {inj.doseMg} mg
                        </Text>
                        <View style={[styles.siteBadge, { backgroundColor: colors.badgeBg }]}>
                          <Text style={[styles.siteBadgeText, { color: colors.textSecondary }]}>
                            {siteStat?.displayName || inj.site}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                        {formatDate(inj.injectedAt)}
                      </Text>

                      {inj.notes ? (
                        <Text style={[styles.historyNotes, { color: colors.textSecondary }]}>
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
                        { backgroundColor: colors.dangerBg },
                      ]}>
                      <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
                        Sil
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
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
