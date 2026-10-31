import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { InjectionSite, Medication } from '../types';
import {
  addInjection,
  getInjections,
  getMedications,
  getUserSettings,
  updateUserSettings,
} from '../services/db';
import { getRecommendedNextSite, SITE_DISPLAY_NAMES } from '../services/rotation-engine';
import {
  STANDARD_DOSES,
  parseDoseInput,
  validateInjectionInput,
} from '../services/modal-helpers';

export default function ModalLogInjection() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  // Colors
  const colors = {
    bg: isDark ? '#000000' : '#F2F2F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    border: isDark ? '#38383A' : '#E5E5EA',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    textSecondary: isDark ? '#A1A1A6' : '#6B7280',
    accent: isDark ? '#0A84FF' : '#007AFF',
    accentLight: isDark ? '#1C314D' : '#EBF5FF',
    accentText: isDark ? '#70B4FF' : '#0055B3',
    badgeBg: isDark ? '#1E3A2B' : '#E3F8EB',
    badgeText: isDark ? '#34C759' : '#1E824C',
    errorBg: isDark ? '#3A1817' : '#FFEBEA',
    errorText: isDark ? '#FF6961' : '#D32F2F',
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedMedicationId, setSelectedMedicationId] = useState<string>('');
  const [selectedDoseMg, setSelectedDoseMg] = useState<number>(0.25);
  const [isCustomDose, setIsCustomDose] = useState(false);
  const [customDoseText, setCustomDoseText] = useState('');
  const [recommendedSite, setRecommendedSite] = useState<InjectionSite>('abdomen_left');
  const [selectedSite, setSelectedSite] = useState<InjectionSite>('abdomen_left');
  const [notes, setNotes] = useState('');

  // Initial Data Fetch
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const [meds, settings, injections] = await Promise.all([
          getMedications(),
          getUserSettings(),
          getInjections(),
        ]);

        if (!isMounted) return;

        setMedications(meds);

        // Determine active medication
        let initialMedId = '';
        if (settings.activeMedicationId && meds.some((m) => m.id === settings.activeMedicationId)) {
          initialMedId = settings.activeMedicationId;
        } else if (meds.length > 0) {
          initialMedId = meds[0].id;
        }
        setSelectedMedicationId(initialMedId);

        // Determine initial dose
        if (settings.currentDoseMg && settings.currentDoseMg > 0) {
          setSelectedDoseMg(settings.currentDoseMg);
          if (!STANDARD_DOSES.includes(settings.currentDoseMg)) {
            setIsCustomDose(true);
            setCustomDoseText(settings.currentDoseMg.toString());
          }
        } else {
          setSelectedDoseMg(STANDARD_DOSES[0]);
        }

        // Determine next recommended injection site
        const nextSite = getRecommendedNextSite(injections);
        setRecommendedSite(nextSite);
        setSelectedSite(nextSite);
      } catch (err) {
        if (!isMounted) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'Veriler yüklenirken bir sorun oluştu.'
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Dose Chip Press
  const handleSelectPresetDose = (dose: number) => {
    setIsCustomDose(false);
    setSelectedDoseMg(dose);
    setCustomDoseText('');
    setErrorMessage(null);
  };

  const handleSelectCustomDoseChip = () => {
    setIsCustomDose(true);
    if (!customDoseText) {
      setCustomDoseText(selectedDoseMg > 0 ? selectedDoseMg.toString() : '');
    }
    setErrorMessage(null);
  };

  const handleCustomDoseChange = (text: string) => {
    setCustomDoseText(text);
    const parsed = parseDoseInput(text);
    if (parsed !== null) {
      setSelectedDoseMg(parsed);
      setErrorMessage(null);
    }
  };

  // Handle Save
  const handleSave = async () => {
    const activeDose = isCustomDose ? parseDoseInput(customDoseText) ?? 0 : selectedDoseMg;

    const validation = validateInjectionInput(selectedMedicationId, activeDose, selectedSite);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Lütfen bilgileri kontrol edin.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      await addInjection({
        medicationId: selectedMedicationId,
        doseMg: activeDose,
        injectedAt: new Date().toISOString(),
        site: selectedSite,
        notes: notes.trim() || undefined,
      });

      // Update user settings current dose and active med for next time
      await updateUserSettings({
        activeMedicationId: selectedMedicationId,
        currentDoseMg: activeDose,
      });

      router.back();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Enjeksiyon kaydedilirken bir hata oluştu.'
      );
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: Math.max(insets.top, 16),
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Vazgeç ve kapat"
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.headerButton}>
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Vazgeç</Text>
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Enjeksiyon Kaydı</Text>

        <View style={styles.headerRightSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Bilgiler hazırlanıyor...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled">
          {errorMessage && (
            <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}>
              <Text style={[styles.errorText, { color: colors.errorText }]}>{errorMessage}</Text>
            </View>
          )}

          {/* Section: Medication */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>İlaç Seçimi</Text>
            <View style={styles.medicationsList}>
              {medications.map((med) => {
                const isSelected = med.id === selectedMedicationId;
                return (
                  <Pressable
                    key={med.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${med.name} ilacını seç`}
                    onPress={() => setSelectedMedicationId(med.id)}
                    style={[
                      styles.selectableCard,
                      {
                        backgroundColor: isSelected ? colors.accentLight : colors.bg,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.selectableCardTitle,
                        {
                          color: isSelected ? colors.accentText : colors.textPrimary,
                          fontWeight: isSelected ? '600' : '400',
                        },
                      ]}>
                      {med.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section: Dosage */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dozaj</Text>
              <Text style={[styles.doseBadge, { color: colors.accent }]}>
                {selectedDoseMg > 0 ? `${selectedDoseMg} mg` : 'Dozaj seçilmedi'}
              </Text>
            </View>

            <View style={styles.chipRow}>
              {STANDARD_DOSES.map((dose) => {
                const isSelected = !isCustomDose && selectedDoseMg === dose;
                return (
                  <Pressable
                    key={dose}
                    accessibilityRole="button"
                    accessibilityLabel={`${dose} miligram`}
                    onPress={() => handleSelectPresetDose(dose)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.bg,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? '#FFFFFF' : colors.textPrimary,
                          fontWeight: isSelected ? '600' : '500',
                        },
                      ]}>
                      {dose} mg
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Özel dozaj gir"
                onPress={handleSelectCustomDoseChip}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isCustomDose ? colors.accent : colors.bg,
                    borderColor: isCustomDose ? colors.accent : colors.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isCustomDose ? '#FFFFFF' : colors.textPrimary,
                      fontWeight: isCustomDose ? '600' : '500',
                    },
                  ]}>
                  Özel
                </Text>
              </Pressable>
            </View>

            {isCustomDose && (
              <View style={styles.customDoseInputWrapper}>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.bg,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                  value={customDoseText}
                  onChangeText={handleCustomDoseChange}
                  placeholder="Örnek: 1.25"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>mg</Text>
              </View>
            )}
          </View>

          {/* Section: Injection Site */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Enjeksiyon Bölgesi
              </Text>
              <Text style={[styles.helperSiteText, { color: colors.textSecondary }]}>
                Rotasyon kuralı uygulanır
              </Text>
            </View>

            <View style={styles.sitesGrid}>
              {(Object.keys(SITE_DISPLAY_NAMES) as InjectionSite[]).map((site) => {
                const isSelected = selectedSite === site;
                const isRecommended = recommendedSite === site;
                const displayName = SITE_DISPLAY_NAMES[site];

                return (
                  <Pressable
                    key={site}
                    accessibilityRole="button"
                    accessibilityLabel={`${displayName}${isRecommended ? ', önerilen bölge' : ''}`}
                    onPress={() => setSelectedSite(site)}
                    style={[
                      styles.siteCard,
                      {
                        backgroundColor: isSelected ? colors.accentLight : colors.bg,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}>
                    <View style={styles.siteHeaderRow}>
                      <Text
                        style={[
                          styles.siteCardText,
                          {
                            color: isSelected ? colors.accentText : colors.textPrimary,
                            fontWeight: isSelected ? '600' : '500',
                          },
                        ]}>
                        {displayName}
                      </Text>
                      {isRecommended && (
                        <View style={[styles.recommendedBadge, { backgroundColor: colors.badgeBg }]}>
                          <Text style={[styles.recommendedBadgeText, { color: colors.badgeText }]}>
                            Önerilen
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section: Notes */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notlar</Text>
            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: colors.bg,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enjeksiyonla ilgili özel bir durum var mı? (opsiyonel)"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Action CTA Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enjeksiyonu Kaydet"
            disabled={isSaving}
            onPress={handleSave}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.accent,
                opacity: isSaving ? 0.7 : 1,
              },
            ]}>
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionButtonText}>Enjeksiyonu Kaydet</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  cancelText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headerRightSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorBox: {
    padding: 14,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  helperSiteText: {
    fontSize: 12,
  },
  doseBadge: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  medicationsList: {
    gap: 8,
  },
  selectableCard: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  selectableCardTitle: {
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    minWidth: 64,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  customDoseInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  textInput: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  inputUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  sitesGrid: {
    gap: 8,
  },
  siteCard: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  siteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  siteCardText: {
    fontSize: 15,
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recommendedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notesInput: {
    minHeight: 76,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
