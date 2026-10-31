import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useFocusEffect } from 'expo-router';
import {
  Injection,
  Medication,
  NutritionLog,
  SymptomLog,
  WeightLog,
} from '../../types';
import {
  getAllNutritionLogs,
  getInjections,
  getMedications,
  getSymptomLogs,
  getUserSettings,
  getWeightLogs,
  updateUserSettings,
} from '../../services/db';
import {
  generateCsvExport,
  generateJsonExport,
} from '../../services/analytics-helpers';

const DAYS_OF_WEEK = [
  { id: 0, label: 'Paz' },
  { id: 1, label: 'Pzt' },
  { id: 2, label: 'Sal' },
  { id: 3, label: 'Çar' },
  { id: 4, label: 'Per' },
  { id: 5, label: 'Cum' },
  { id: 6, label: 'Cmt' },
];

export default function SettingsScreen() {
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
    pillBg: isDark ? '#2C2C2E' : '#F2F2F7',
    danger: isDark ? '#FF453A' : '#FF3B30',
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Database Records
  const [medications, setMedications] = useState<Medication[]>([]);
  const [injections, setInjections] = useState<Injection[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);

  // Settings State
  const [selectedMedId, setSelectedMedId] = useState<string>('');
  const [preferredDay, setPreferredDay] = useState<number | undefined>(undefined);
  const [targetWeightText, setTargetWeightText] = useState<string>('');
  const [proteinTargetText, setProteinTargetText] = useState<string>('100');
  const [waterTargetText, setWaterTargetText] = useState<string>('2500');

  // Export State
  const [exportPreview, setExportPreview] = useState<{
    format: 'csv' | 'json';
    content: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [meds, injs, weights, symptoms, nutrition, currentSettings] =
        await Promise.all([
          getMedications(),
          getInjections(),
          getWeightLogs(),
          getSymptomLogs(),
          getAllNutritionLogs(),
          getUserSettings(),
        ]);

      setMedications(meds);
      setInjections(injs);
      setWeightLogs(weights);
      setSymptomLogs(symptoms);
      setNutritionLogs(nutrition);

      setSelectedMedId(
        currentSettings.activeMedicationId || (meds.length > 0 ? meds[0].id : '')
      );
      setPreferredDay(currentSettings.preferredInjectionDay);
      setTargetWeightText(
        currentSettings.targetWeightKg ? currentSettings.targetWeightKg.toString() : ''
      );
      setProteinTargetText(currentSettings.dailyProteinTargetG.toString());
      setWaterTargetText(currentSettings.dailyWaterTargetMl.toString());
    } catch (error) {
      console.error('Failed to load settings data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setStatusMessage(null);

      const targetWeightKg = targetWeightText.trim()
        ? parseFloat(targetWeightText.replace(',', '.'))
        : undefined;

      const dailyProteinTargetG = proteinTargetText.trim()
        ? parseFloat(proteinTargetText.replace(',', '.'))
        : 100;

      const dailyWaterTargetMl = waterTargetText.trim()
        ? parseFloat(waterTargetText.replace(',', '.'))
        : 2500;

      await updateUserSettings({
        activeMedicationId: selectedMedId,
        preferredInjectionDay: preferredDay,
        targetWeightKg: isNaN(targetWeightKg ?? NaN) ? undefined : targetWeightKg,
        dailyProteinTargetG: isNaN(dailyProteinTargetG) ? 100 : dailyProteinTargetG,
        dailyWaterTargetMl: isNaN(dailyWaterTargetMl) ? 2500 : dailyWaterTargetMl,
      });

      setStatusMessage('Ayarlar başarıyla güncellendi.');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch {
      Alert.alert('Hata', 'Ayarlar kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateCsv = async () => {
    const currentSettings = await getUserSettings();
    const csv = generateCsvExport({
      medications,
      injections,
      weightLogs,
      symptomLogs,
      nutritionLogs,
      userSettings: currentSettings,
    });
    setExportPreview({ format: 'csv', content: csv });
  };

  const handleGenerateJson = async () => {
    const currentSettings = await getUserSettings();
    const json = generateJsonExport({
      medications,
      injections,
      weightLogs,
      symptomLogs,
      nutritionLogs,
      userSettings: currentSettings,
    });
    setExportPreview({ format: 'json', content: json });
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Ayarlar yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {statusMessage && (
          <View style={[styles.successBanner, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.successText, { color: colors.success }]}>
              {statusMessage}
            </Text>
          </View>
        )}

        {/* Section: Active Medication */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Aktif İlaç Seçimi
          </Text>
          <View style={styles.medicationsColumn}>
            {medications.map((med) => {
              const isSelected = med.id === selectedMedId;
              return (
                <Pressable
                  key={med.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${med.name} ilacını aktif yap`}
                  onPress={() => setSelectedMedId(med.id)}
                  style={[
                    styles.medOption,
                    {
                      backgroundColor: isSelected ? colors.accentBg : colors.bg,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.medOptionText,
                      {
                        color: isSelected ? colors.accent : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}>
                    {med.name}
                  </Text>
                  <Text style={[styles.medOptionSub, { color: colors.textSecondary }]}>
                    Yarı ömür: {Math.round(med.halfLifeHours / 24)} gün
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section: Preferred Injection Day */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Tercih Edilen Enjeksiyon Günü
          </Text>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            Haftalık doz hatırlatması ve geri sayım için baz alınır.
          </Text>

          <View style={styles.daysRow}>
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = preferredDay === day.id;
              return (
                <Pressable
                  key={day.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Enjeksiyon günü ${day.label}`}
                  onPress={() => setPreferredDay(isSelected ? undefined : day.id)}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.pillBg,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.dayChipText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}>
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section: Health & Nutrition Targets */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Sağlık & Beslenme Hedefleri
          </Text>

          <View style={styles.formRow}>
            <Text style={[styles.formLabel, { color: colors.textPrimary }]}>
              Hedef Kilo (kg)
            </Text>
            <TextInput
              style={[
                styles.formInput,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={targetWeightText}
              onChangeText={setTargetWeightText}
              placeholder="Örn: 70.0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={[styles.formLabel, { color: colors.textPrimary }]}>
              Günlük Protein Hedefi (g)
            </Text>
            <TextInput
              style={[
                styles.formInput,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={proteinTargetText}
              onChangeText={setProteinTargetText}
              placeholder="100"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={[styles.formLabel, { color: colors.textPrimary }]}>
              Günlük Su Hedefi (ml)
            </Text>
            <TextInput
              style={[
                styles.formInput,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={waterTargetText}
              onChangeText={setWaterTargetText}
              placeholder="2500"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hedefleri kaydet"
            disabled={isSaving}
            onPress={handleSaveSettings}
            style={[
              styles.saveButton,
              {
                backgroundColor: colors.accent,
                opacity: isSaving ? 0.7 : 1,
              },
            ]}>
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Hedefleri Kaydet</Text>
            )}
          </Pressable>
        </View>

        {/* Section: Clinical Data Export */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Klinik Rapor & Veri Dışa Aktarma
          </Text>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            Doktorunuzla paylaşmak veya yedeklemek için klinik özet raporu oluşturun.
          </Text>

          <View style={styles.exportButtonsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="CSV formatında rapor oluştur"
              onPress={handleGenerateCsv}
              style={[styles.exportButton, { backgroundColor: colors.accentBg, borderColor: colors.border }]}>
              <Text style={[styles.exportButtonText, { color: colors.accent }]}>
                CSV Klinik Rapor
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="JSON formatında yedek oluştur"
              onPress={handleGenerateJson}
              style={[styles.exportButton, { backgroundColor: colors.pillBg, borderColor: colors.border }]}>
              <Text style={[styles.exportButtonText, { color: colors.textPrimary }]}>
                JSON Tam Yedek
              </Text>
            </Pressable>
          </View>

          {exportPreview && (
            <View style={[styles.previewContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <View style={styles.previewHeader}>
                <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
                  {exportPreview.format.toUpperCase()} Rapor Önizleme
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Önizlemeyi kapat"
                  onPress={() => setExportPreview(null)}
                  style={styles.closePreviewButton}>
                  <Text style={[styles.closePreviewText, { color: colors.textSecondary }]}>
                    Kapat
                  </Text>
                </Pressable>
              </View>

              <TextInput
                style={[
                  styles.previewBox,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                value={exportPreview.content}
                multiline
                editable={false}
              />
            </View>
          )}
        </View>

        {/* Section: Database Record Counters */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Yerel Veritabanı İstatistikleri
          </Text>

          <View style={styles.countersGrid}>
            <View style={[styles.counterBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={[styles.counterNumber, { color: colors.accent }]}>
                {injections.length}
              </Text>
              <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>
                Enjeksiyon
              </Text>
            </View>

            <View style={[styles.counterBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={[styles.counterNumber, { color: colors.accent }]}>
                {weightLogs.length}
              </Text>
              <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>
                Kilo Kaydı
              </Text>
            </View>

            <View style={[styles.counterBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={[styles.counterNumber, { color: colors.accent }]}>
                {symptomLogs.length}
              </Text>
              <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>
                Yan Etki
              </Text>
            </View>

            <View style={[styles.counterBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={[styles.counterNumber, { color: colors.accent }]}>
                {nutritionLogs.length}
              </Text>
              <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>
                Beslenme Günü
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: 40,
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
  successBanner: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subText: {
    fontSize: 13,
    lineHeight: 18,
  },
  medicationsColumn: {
    gap: 8,
  },
  medOption: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  medOptionText: {
    fontSize: 15,
  },
  medOptionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  dayChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipText: {
    fontSize: 13,
  },
  formRow: {
    gap: 6,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  formInput: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  saveButton: {
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exportButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  closePreviewButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  closePreviewText: {
    fontSize: 13,
    fontWeight: '500',
  },
  previewBox: {
    height: 160,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlignVertical: 'top',
  },
  countersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  counterBox: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  counterNumber: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  counterLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
