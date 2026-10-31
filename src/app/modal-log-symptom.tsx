import React, { useState } from 'react';
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
import { SymptomType } from '../types';
import { addSymptomLog } from '../services/db';
import {
  SEVERITY_LEVELS,
  SYMPTOM_OPTIONS,
  validateSymptomInput,
} from '../services/modal-helpers';

export default function ModalLogSymptom() {
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
    errorBg: isDark ? '#3A1817' : '#FFEBEA',
    errorText: isDark ? '#FF6961' : '#D32F2F',
  };

  const [selectedSymptom, setSelectedSymptom] = useState<SymptomType>('nausea');
  const [selectedSeverity, setSelectedSeverity] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeSeverityObj =
    SEVERITY_LEVELS.find((s) => s.level === selectedSeverity) || SEVERITY_LEVELS[1];

  const handleSave = async () => {
    const validation = validateSymptomInput(selectedSymptom, selectedSeverity);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Lütfen bilgileri kontrol edin.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      await addSymptomLog({
        symptomType: selectedSymptom,
        severity: selectedSeverity,
        notes: notes.trim() || undefined,
        loggedAt: new Date().toISOString(),
      });

      router.back();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Yan etki kaydedilirken bir sorun oluştu.'
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

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Yan Etki Kaydı</Text>

        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled">
        {errorMessage && (
          <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}>
            <Text style={[styles.errorText, { color: colors.errorText }]}>{errorMessage}</Text>
          </View>
        )}

        {/* Section: Symptom Selection */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Belirti / Yan Etki</Text>
          <View style={styles.symptomsGrid}>
            {SYMPTOM_OPTIONS.map((item) => {
              const isSelected = item.type === selectedSymptom;
              return (
                <Pressable
                  key={item.type}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} belirtisini seç`}
                  onPress={() => {
                    setSelectedSymptom(item.type);
                    setErrorMessage(null);
                  }}
                  style={[
                    styles.symptomCard,
                    {
                      backgroundColor: isSelected ? colors.accentLight : colors.bg,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.symptomTitle,
                      {
                        color: isSelected ? colors.accentText : colors.textPrimary,
                        fontWeight: isSelected ? '600' : '500',
                      },
                    ]}>
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.symptomDescription,
                      {
                        color: colors.textSecondary,
                      },
                    ]}>
                    {item.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section: Severity Rating */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Şiddet Derecesi
            </Text>
            <Text
              style={[
                styles.severityLabel,
                { color: activeSeverityObj.color, fontVariant: ['tabular-nums'] },
              ]}>
              {selectedSeverity} - {activeSeverityObj.label}
            </Text>
          </View>

          <View style={styles.severityRow}>
            {SEVERITY_LEVELS.map((levelObj) => {
              const isSelected = levelObj.level === selectedSeverity;
              return (
                <Pressable
                  key={levelObj.level}
                  accessibilityRole="button"
                  accessibilityLabel={`Şiddet ${levelObj.level}: ${levelObj.label}`}
                  onPress={() => {
                    setSelectedSeverity(levelObj.level);
                    setErrorMessage(null);
                  }}
                  style={[
                    styles.severityButton,
                    {
                      backgroundColor: isSelected ? levelObj.color : colors.bg,
                      borderColor: isSelected ? levelObj.color : colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.severityButtonText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}>
                    {levelObj.level}
                  </Text>
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
            placeholder="Ne zaman başladı, ne kadar sürdü? (opsiyonel)"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Action CTA Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yan Etkiyi Kaydet"
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
            <Text style={styles.actionButtonText}>Yan Etkiyi Kaydet</Text>
          )}
        </Pressable>
      </ScrollView>
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
  severityLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  symptomsGrid: {
    gap: 8,
  },
  symptomCard: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 2,
  },
  symptomTitle: {
    fontSize: 15,
  },
  symptomDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityButtonText: {
    fontSize: 17,
    fontVariant: ['tabular-nums'],
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
