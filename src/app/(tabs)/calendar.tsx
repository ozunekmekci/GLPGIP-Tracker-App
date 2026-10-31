import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../context/theme-context';

export default function CalendarScreen() {
  const { tokens } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      <Text style={[styles.title, { color: tokens.textPrimary }]}>Takvim</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
