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
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  Injection,
  Medication,
  NutritionLog,
  SymptomLog,
  ThemePreference,
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
import { useAppTheme } from '../../context/theme-context';
import { GlassCard } from '../../components/glass-card';
import { AmbientMesh } from '../../components/ambient-mesh';

export const DAYS_OF_WEEK = [
  { id: 0, label: 'Paz' },
  { id: 1, label: 'Pzt' },
  { id: 2, label: 'Sal' },
  { id: 3, label: 'Çar' },
  { id: 4, label: 'Per' },
  { id: 5, label: 'Cum' },
  { id: 6, label: 'Cmt' },
];

export const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'Sistem 📱' },
  { id: 'light', label: 'Açık ☀️' },
  { id: 'dark', label: 'Koyu 🌙' },
];

export default function SettingsScreen() {
  const { themePreference, setThemePreference, tokens, isDark } = useAppTheme();

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
      <View style={[styles.center, { backgroundColor: tokens.bg }]}>
        <AmbientMesh />
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
          Ayarlar yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      <AmbientMesh />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {statusMessage && (
            <View
              style={[
                styles.successBanner,
                {
                  backgroundColor: isDark
                    ? 'rgba(52, 199, 89, 0.18)'
                    : 'rgba(52, 199, 89, 0.12)',
                  borderColor: isDark
                    ? 'rgba(52, 199, 89, 0.35)'
                    : 'rgba(52, 199, 89, 0.25)',
                },
              ]}>
              <Text style={[styles.successText, { color: tokens.accentGreen }]}>
                {statusMessage}
              </Text>
            </View>
          )}

          {/* Section: Appearance & Theme Selector */}
          <GlassCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
              Görünüm & Tema
            </Text>
            <Text style={[styles.subText, { color: tokens.textSecondary }]}>
              Uygulama temasını sistem ayarlarınıza göre eşitleyin veya manuel seçin.
            </Text>

            <View
              style={[
                styles.segmentedContainer,
                {
                  backgroundColor: isDark
                    ? 'rgba(0, 0, 0, 0.32)'
                    : 'rgba(0, 0, 0, 0.05)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.10)'
                    : 'rgba(0, 0, 0, 0.06)',
                },
              ]}>
              {THEME_OPTIONS.map((opt) => {
                const isActive = themePreference === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${opt.label} temasını seç`}
                    onPress={async () => {
                      await setThemePreference(opt.id);
                    }}
                    style={[
                      styles.segmentItem,
                      isActive
                        ? [
                            styles.activeSegment,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.18)'
                                : '#FFFFFF',
                              borderTopColor: isDark
                                ? 'rgba(255, 255, 255, 0.45)'
                                : 'rgba(255, 255, 255, 0.95)',
                              borderBottomColor: isDark
                                ? 'rgba(255, 255, 255, 0.08)'
                                : 'rgba(0, 0, 0, 0.06)',
                              borderLeftColor: isDark
                                ? 'rgba(255, 255, 255, 0.15)'
                                : 'rgba(0, 0, 0, 0.04)',
                              borderRightColor: isDark
                                ? 'rgba(255, 255, 255, 0.15)'
                                : 'rgba(0, 0, 0, 0.04)',
                            },
                          ]
                        : styles.inactiveSegment,
                    ]}>
                    <Text
                      style={[
                        styles.segmentText,
                        {
                          color: isActive ? tokens.textPrimary : tokens.textSecondary,
                          fontWeight: isActive ? '700' : '500',
                        },
                      ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          {/* Section: Active Medication */}
          <GlassCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
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
                      isSelected
                        ? [
                            styles.medOptionSelected,
                            {
                              backgroundColor: isDark
                                ? 'rgba(0, 122, 255, 0.18)'
                                : 'rgba(0, 122, 255, 0.10)',
                              borderTopColor: isDark
                                ? 'rgba(0, 122, 255, 0.60)'
                                : 'rgba(0, 122, 255, 0.45)',
                              borderBottomColor: isDark
                                ? 'rgba(0, 122, 255, 0.25)'
                                : 'rgba(0, 122, 255, 0.20)',
                              borderLeftColor: isDark
                                ? 'rgba(0, 122, 255, 0.40)'
                                : 'rgba(0, 122, 255, 0.30)',
                              borderRightColor: isDark
                                ? 'rgba(0, 122, 255, 0.40)'
                                : 'rgba(0, 122, 255, 0.30)',
                            },
                          ]
                        : [
                            styles.medOptionUnselected,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.04)'
                                : 'rgba(255, 255, 255, 0.45)',
                              borderTopColor: isDark
                                ? 'rgba(255, 255, 255, 0.16)'
                                : 'rgba(255, 255, 255, 0.70)',
                              borderBottomColor: isDark
                                ? 'rgba(255, 255, 255, 0.04)'
                                : 'rgba(0, 0, 0, 0.04)',
                              borderLeftColor: tokens.cardBorder,
                              borderRightColor: tokens.cardBorder,
                            },
                          ],
                    ]}>
                    <View style={styles.medOptionContent}>
                      <View style={styles.medOptionInfo}>
                        <Text
                          style={[
                            styles.medOptionText,
                            {
                              color: isSelected ? tokens.accent : tokens.textPrimary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}>
                          {med.name}
                        </Text>
                        <Text style={[styles.medOptionSub, { color: tokens.textSecondary }]}>
                          Yarı ömür: {Math.round(med.halfLifeHours / 24)} gün
                        </Text>
                      </View>
                      {isSelected && (
                        <View
                          style={[
                            styles.medActiveBadge,
                            {
                              backgroundColor: isDark
                                ? 'rgba(0, 122, 255, 0.25)'
                                : 'rgba(0, 122, 255, 0.15)',
                            },
                          ]}>
                          <Text style={[styles.medActiveBadgeText, { color: tokens.accent }]}>
                            Aktif ✓
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          {/* Section: Preferred Injection Day */}
          <GlassCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
              Tercih Edilen Enjeksiyon Günü
            </Text>
            <Text style={[styles.subText, { color: tokens.textSecondary }]}>
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
                      isSelected
                        ? [
                            styles.dayChipSelected,
                            {
                              backgroundColor: tokens.accent,
                              borderTopColor: 'rgba(255, 255, 255, 0.65)',
                              borderBottomColor: 'rgba(0, 0, 0, 0.15)',
                              borderLeftColor: 'rgba(255, 255, 255, 0.25)',
                              borderRightColor: 'rgba(255, 255, 255, 0.25)',
                            },
                          ]
                        : [
                            styles.dayChipUnselected,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(0, 0, 0, 0.04)',
                              borderTopColor: isDark
                                ? 'rgba(255, 255, 255, 0.15)'
                                : 'rgba(255, 255, 255, 0.80)',
                              borderBottomColor: isDark
                                ? 'rgba(0, 0, 0, 0.20)'
                                : 'rgba(0, 0, 0, 0.05)',
                              borderLeftColor: tokens.cardBorder,
                              borderRightColor: tokens.cardBorder,
                            },
                          ],
                    ]}>
                    <Text
                      style={[
                        styles.dayChipText,
                        {
                          color: isSelected ? '#FFFFFF' : tokens.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}>
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          {/* Section: Health & Nutrition Targets */}
          <GlassCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
              Sağlık & Beslenme Hedefleri
            </Text>

            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: tokens.textPrimary }]}>
                Hedef Kilo (kg)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark
                      ? 'rgba(0, 0, 0, 0.28)'
                      : 'rgba(255, 255, 255, 0.65)',
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.20)'
                      : 'rgba(255, 255, 255, 0.90)',
                    borderBottomColor: isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(0, 0, 0, 0.06)',
                    borderLeftColor: tokens.cardBorder,
                    borderRightColor: tokens.cardBorder,
                    color: tokens.textPrimary,
                  },
                ]}
                value={targetWeightText}
                onChangeText={setTargetWeightText}
                placeholder="Örn: 70.0"
                placeholderTextColor={tokens.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: tokens.textPrimary }]}>
                Günlük Protein Hedefi (g)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark
                      ? 'rgba(0, 0, 0, 0.28)'
                      : 'rgba(255, 255, 255, 0.65)',
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.20)'
                      : 'rgba(255, 255, 255, 0.90)',
                    borderBottomColor: isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(0, 0, 0, 0.06)',
                    borderLeftColor: tokens.cardBorder,
                    borderRightColor: tokens.cardBorder,
                    color: tokens.textPrimary,
                  },
                ]}
                value={proteinTargetText}
                onChangeText={setProteinTargetText}
                placeholder="100"
                placeholderTextColor={tokens.textTertiary}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={[styles.formLabel, { color: tokens.textPrimary }]}>
                Günlük Su Hedefi (ml)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: isDark
                      ? 'rgba(0, 0, 0, 0.28)'
                      : 'rgba(255, 255, 255, 0.65)',
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.20)'
                      : 'rgba(255, 255, 255, 0.90)',
                    borderBottomColor: isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(0, 0, 0, 0.06)',
                    borderLeftColor: tokens.cardBorder,
                    borderRightColor: tokens.cardBorder,
                    color: tokens.textPrimary,
                  },
                ]}
                value={waterTargetText}
                onChangeText={setWaterTargetText}
                placeholder="2500"
                placeholderTextColor={tokens.textTertiary}
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
                  backgroundColor: tokens.accent,
                  opacity: isSaving ? 0.7 : 1,
                  shadowColor: tokens.accent,
                },
              ]}>
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Hedefleri Kaydet</Text>
              )}
            </Pressable>
          </GlassCard>

          {/* Section: Clinical Data Export */}
          <GlassCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
              Klinik Rapor & Veri Dışa Aktarma
            </Text>
            <Text style={[styles.subText, { color: tokens.textSecondary }]}>
              Doktorunuzla paylaşmak veya yedeklemek için klinik özet raporu oluşturun.
            </Text>

            <View style={styles.exportButtonsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="CSV formatında rapor oluştur"
                onPress={handleGenerateCsv}
                style={[
                  styles.exportButton,
                  styles.exportButtonPrimary,
                  {
                    backgroundColor: isDark
                      ? 'rgba(0, 122, 255, 0.20)'
                      : 'rgba(0, 122, 255, 0.12)',
                    borderTopColor: isDark
                      ? 'rgba(0, 122, 255, 0.50)'
                      : 'rgba(255, 255, 255, 0.85)',
                    borderBottomColor: isDark
                      ? 'rgba(0, 122, 255, 0.15)'
                      : 'rgba(0, 122, 255, 0.15)',
                    borderLeftColor: isDark
                      ? 'rgba(0, 122, 255, 0.30)'
                      : 'rgba(0, 122, 255, 0.20)',
                    borderRightColor: isDark
                      ? 'rgba(0, 122, 255, 0.30)'
                      : 'rgba(0, 122, 255, 0.20)',
                  },
                ]}>
                <Text style={[styles.exportButtonText, { color: tokens.accent }]}>
                  CSV Klinik Rapor
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="JSON formatında yedek oluştur"
                onPress={handleGenerateJson}
                style={[
                  styles.exportButton,
                  styles.exportButtonSecondary,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.07)'
                      : 'rgba(0, 0, 0, 0.04)',
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.22)'
                      : 'rgba(255, 255, 255, 0.85)',
                    borderBottomColor: isDark
                      ? 'rgba(0, 0, 0, 0.20)'
                      : 'rgba(0, 0, 0, 0.05)',
                    borderLeftColor: tokens.cardBorder,
                    borderRightColor: tokens.cardBorder,
                  },
                ]}>
                <Text style={[styles.exportButtonText, { color: tokens.textPrimary }]}>
                  JSON Tam Yedek
                </Text>
              </Pressable>
            </View>

            {exportPreview && (
              <View
                style={[
                  styles.previewContainer,
                  {
                    backgroundColor: isDark
                      ? 'rgba(0, 0, 0, 0.30)'
                      : 'rgba(255, 255, 255, 0.50)',
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.25)'
                      : 'rgba(255, 255, 255, 0.90)',
                    borderBottomColor: isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(0, 0, 0, 0.06)',
                    borderLeftColor: tokens.cardBorder,
                    borderRightColor: tokens.cardBorder,
                  },
                ]}>
                <View style={styles.previewHeader}>
                  <Text style={[styles.previewTitle, { color: tokens.textPrimary }]}>
                    {exportPreview.format.toUpperCase()} Rapor Önizleme
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Önizlemeyi kapat"
                    hitSlop={6}
                    onPress={() => setExportPreview(null)}
                    style={styles.closePreviewButton}>
                    <Text style={[styles.closePreviewText, { color: tokens.textSecondary }]}>
                      Kapat
                    </Text>
                  </Pressable>
                </View>

                <TextInput
                  style={[
                    styles.previewBox,
                    {
                      backgroundColor: isDark
                        ? 'rgba(0, 0, 0, 0.40)'
                        : 'rgba(255, 255, 255, 0.75)',
                      color: tokens.textPrimary,
                      borderTopColor: isDark
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(255, 255, 255, 0.85)',
                      borderBottomColor: isDark
                        ? 'rgba(0, 0, 0, 0.25)'
                        : 'rgba(0, 0, 0, 0.05)',
                      borderLeftColor: tokens.cardBorder,
                      borderRightColor: tokens.cardBorder,
                    },
                  ]}
                  value={exportPreview.content}
                  multiline
                  editable={false}
                />
              </View>
            )}
          </GlassCard>

          {/* Section: Database Record Counters */}
          <GlassCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
              Yerel Veritabanı İstatistikleri
            </Text>

            <View style={styles.countersGrid}>
              <View
                style={[
                  styles.counterBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.60)',
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.22)'
                      : 'rgba(255, 255, 255, 0.90)',
                    borderBottomColor: isDark
                      ? 'rgba(0, 0, 0, 0.20)'
                      : 'rgba(0, 0, 0, 0.04)',
                    borderLeftColor: tokens.cardBorder,
                    borderRightColor: tokens.cardBorder,
                  },
                ]}>
                <Text style={[styles.counterNumber, { color: tokens.accent }]}>
                  {injections.length}
                </Text>
                <Text style={[styles.counterLabel, { color: tokens.textSecondary }]}>
                  Enjeksiyon
                </Text>
              </View>

              <View
                style={[
                  styles.counterBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.60)',
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.22)'
                      : 'rgba(255, 255, 255, 0.90)',
                    borderBottomColor: isDark
                      ? 'rgba(0, 0, 0, 0.20)'
                      : 'rgba(0, 0, 0, 0.04)',
                    borderLeftColor: tokens.cardBorder,
                    borderRightColor: tokens.cardBorder,
                  },
                ]}>
                <Text style={[styles.counterNumber, { color: tokens.accent }]}>
                  {weightLogs.length}
                </Text>
                <Text style={[styles.counterLabel, { color: tokens.textSecondary }]}>
                  Kilo Kaydı
                </Text>
              </View>

              <View
                style={[
                  styles.counterBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.60)',
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.22)'
                      : 'rgba(255, 255, 255, 0.90)',
                    borderBottomColor: isDark
                      ? 'rgba(0, 0, 0, 0.20)'
                      : 'rgba(0, 0, 0, 0.04)',
                    borderLeftColor: tokens.cardBorder,
                    borderRightColor: tokens.cardBorder,
                  },
                ]}>
                <Text style={[styles.counterNumber, { color: tokens.accent }]}>
                  {symptomLogs.length}
                </Text>
                <Text style={[styles.counterLabel, { color: tokens.textSecondary }]}>
                  Yan Etki
                </Text>
              </View>

              <View
                style={[
                  styles.counterBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.60)',
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.22)'
                      : 'rgba(255, 255, 255, 0.90)',
                    borderBottomColor: isDark
                      ? 'rgba(0, 0, 0, 0.20)'
                      : 'rgba(0, 0, 0, 0.04)',
                    borderLeftColor: tokens.cardBorder,
                    borderRightColor: tokens.cardBorder,
                  },
                ]}>
                <Text style={[styles.counterNumber, { color: tokens.accent }]}>
                  {nutritionLogs.length}
                </Text>
                <Text style={[styles.counterLabel, { color: tokens.textSecondary }]}>
                  Beslenme Günü
                </Text>
              </View>
            </View>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
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
  successBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
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
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSegment: {
    borderTopWidth: 1.5,
    borderBottomWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  inactiveSegment: {},
  segmentText: {
    fontSize: 13,
    textAlign: 'center',
  },
  medicationsColumn: {
    gap: 8,
  },
  medOption: {
    minHeight: 54,
    borderRadius: 14,
    borderTopWidth: 1.5,
    borderBottomWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  medOptionSelected: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  medOptionUnselected: {},
  medOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  medOptionInfo: {
    flex: 1,
  },
  medActiveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medActiveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  medOptionText: {
    fontSize: 15,
  },
  medOptionSub: {
    fontSize: 12,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  dayChip: {
    flex: 1,
    minHeight: 46,
    minWidth: 44,
    borderRadius: 12,
    borderTopWidth: 1.5,
    borderBottomWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipSelected: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  dayChipUnselected: {},
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
    borderRadius: 12,
    borderTopWidth: 1.2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  saveButton: {
    minHeight: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.45)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
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
    minHeight: 48,
    borderRadius: 14,
    borderTopWidth: 1.5,
    borderBottomWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  exportButtonPrimary: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },
  exportButtonSecondary: {},
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    borderRadius: 14,
    borderTopWidth: 1.5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
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
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  closePreviewText: {
    fontSize: 13,
    fontWeight: '500',
  },
  previewBox: {
    height: 160,
    borderRadius: 10,
    borderTopWidth: 1.2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    padding: 10,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontVariant: ['tabular-nums'],
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
    minHeight: 80,
    borderRadius: 16,
    borderTopWidth: 1.5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  counterNumber: {
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  counterLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
