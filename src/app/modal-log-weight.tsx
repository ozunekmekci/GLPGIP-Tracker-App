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
import { addWeightLog, getWeightLogs, getUserSettings } from '../services/db';
import {
  adjustWeight,
  parseWeightInput,
  validateWeightInput,
} from '../services/modal-helpers';

export default function ModalLogWeight() {
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
    stepperBg: isDark ? '#2C2C2E' : '#F2F2F7',
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [weightKg, setWeightKg] = useState<number>(75.0);
  const [weightInputText, setWeightInputText] = useState<string>('75.0');
  const [lastWeightInfo, setLastWeightInfo] = useState<{
    weightKg: number;
    dateStr: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const [logs, settings] = await Promise.all([
          getWeightLogs(),
          getUserSettings(),
        ]);

        if (!isMounted) return;

        if (logs.length > 0) {
          const latest = logs[0];
          setWeightKg(latest.weightKg);
          setWeightInputText(latest.weightKg.toFixed(1));

          const date = new Date(latest.loggedAt);
          const formattedDate = date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
          });
          setLastWeightInfo({
            weightKg: latest.weightKg,
            dateStr: formattedDate,
          });
        } else if (settings.targetWeightKg && settings.targetWeightKg > 0) {
          setWeightKg(settings.targetWeightKg);
          setWeightInputText(settings.targetWeightKg.toFixed(1));
        } else {
          setWeightKg(75.0);
          setWeightInputText('75.0');
        }
      } catch (err) {
        if (!isMounted) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'Kilo verileri yüklenirken bir hata oluştu.'
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

  // Adjust weight with quick steppers
  const handleStepDelta = (delta: number) => {
    const current = parseWeightInput(weightInputText) ?? weightKg;
    const adjusted = adjustWeight(current, delta);
    setWeightKg(adjusted);
    setWeightInputText(adjusted.toFixed(1));
    setErrorMessage(null);
  };

  const handleTextChange = (text: string) => {
    setWeightInputText(text);
    const parsed = parseWeightInput(text);
    if (parsed !== null) {
      setWeightKg(parsed);
      setErrorMessage(null);
    }
  };

  const handleSave = async () => {
    const finalWeight = parseWeightInput(weightInputText) ?? weightKg;

    const validation = validateWeightInput(finalWeight);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Lütfen geçerli bir kilo değeri girin.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      await addWeightLog(finalWeight, new Date().toISOString());
      router.back();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Kilo kaydedilirken bir sorun oluştu.'
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

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Kilo Kaydı</Text>

        <View style={styles.headerRightSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Yükleniyor...
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

          {/* Hero Card for Current Weight */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.heroSubheader, { color: colors.textSecondary }]}>
              Güncel Kilo
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.weightDisplayInput,
                  {
                    color: colors.textPrimary,
                  },
                ]}
                value={weightInputText}
                onChangeText={handleTextChange}
                keyboardType="decimal-pad"
                selectTextOnFocus
                maxLength={6}
                placeholder="75.0"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>kg</Text>
            </View>

            {lastWeightInfo && (
              <Text style={[styles.lastLoggedText, { color: colors.textSecondary }]}>
                Son kayıt: {lastWeightInfo.weightKg.toFixed(1)} kg ({lastWeightInfo.dateStr})
              </Text>
            )}

            {/* Quick Increment/Decrement Buttons */}
            <View style={styles.stepperRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yarım kilo azalt"
                onPress={() => handleStepDelta(-0.5)}
                style={[
                  styles.stepperButton,
                  { backgroundColor: colors.stepperBg, borderColor: colors.border },
                ]}>
                <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>
                  -0.5 kg
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yüz gram azalt"
                onPress={() => handleStepDelta(-0.1)}
                style={[
                  styles.stepperButton,
                  { backgroundColor: colors.stepperBg, borderColor: colors.border },
                ]}>
                <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>
                  -0.1 kg
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yüz gram artır"
                onPress={() => handleStepDelta(0.1)}
                style={[
                  styles.stepperButton,
                  { backgroundColor: colors.stepperBg, borderColor: colors.border },
                ]}>
                <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>
                  +0.1 kg
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yarım kilo artır"
                onPress={() => handleStepDelta(0.5)}
                style={[
                  styles.stepperButton,
                  { backgroundColor: colors.stepperBg, borderColor: colors.border },
                ]}>
                <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>
                  +0.5 kg
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Action CTA Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kilo Kaydet"
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
              <Text style={styles.actionButtonText}>Kilo Kaydet</Text>
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
  heroCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  heroSubheader: {
    fontSize: 15,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  weightDisplayInput: {
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    minWidth: 160,
    padding: 0,
  },
  unitLabel: {
    fontSize: 22,
    fontWeight: '600',
    marginLeft: 6,
  },
  lastLoggedText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    width: '100%',
    justifyContent: 'space-between',
  },
  stepperButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  stepperButtonText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
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
