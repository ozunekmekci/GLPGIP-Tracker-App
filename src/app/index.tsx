import { Platform, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';

export default function IndexScreen() {
  const isDark = useColorScheme() === 'dark';

  const theme = {
    bg: isDark ? '#000000' : '#F2F2F7',
    surface: isDark ? '#1C1C1E' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : '#1C1C1E',
    textSecondary: isDark ? '#8E8E93' : '#6C6C70',
    separator: isDark ? '#2C2C2E' : '#E5E5EA',
    accent: '#007AFF',
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.separator }]}>
        <Text style={[styles.headline, { color: theme.textPrimary }]}>
          iOS Geliştirme Ortamı Hazır
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Expo SDK 58 ve TypeScript yapılandırması tamamlandı. Telefonunuzdan canlı test edebilir veya tarayıcıda önizleyebilirsiniz.
        </Text>

        <View style={[styles.divider, { backgroundColor: theme.separator }]} />

        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Platform</Text>
          <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
            {Platform.OS === 'ios' ? 'iOS Cihaz' : Platform.OS === 'web' ? 'Web Emülatörü' : 'Android'}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Canlı Yenileme (Fast Refresh)</Text>
          <Text style={[styles.metricValue, { color: theme.accent }]}>Aktif</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.separator }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Nasıl Test Edilir?
        </Text>
        <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
          {"1. iPhone'unuzda App Store'dan "}
          <Text style={{ color: theme.accent, fontWeight: '600' }}>Expo Go</Text>
          {' uygulamasını açın.'}
        </Text>
        <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
          2. Terminaldeki QR kodu kameranızla okutun.
        </Text>
        <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
          3. Kod üzerinde yaptığımız her değişiklik anında telefonunuzun ekranına yansıyacaktır.
        </Text>
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
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: 14,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
