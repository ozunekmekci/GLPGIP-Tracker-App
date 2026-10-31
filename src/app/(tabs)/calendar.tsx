import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Injection, Medication, SymptomLog, UserSettings } from '../../types';
import {
  getInjections,
  getMedications,
  getSymptomLogs,
  getUserSettings,
} from '../../services/db';
import {
  CalendarDay,
  calculateEstimatedLevelAtDate,
  getCalendarGrid,
  predictNextDoses,
} from '../../services/calendar-helpers';
import { useAppTheme } from '../../context/theme-context';
import { AmbientMesh } from '../../components/ambient-mesh';
import { GlassCard } from '../../components/glass-card';

export const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const MONTH_NAMES_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

export const SITE_NAMES_TR: Record<string, string> = {
  abdomen_left: 'Sol Karın',
  abdomen_right: 'Sağ Karın',
  thigh_left: 'Sol Uyluk',
  thigh_right: 'Sağ Uyluk',
  arm_left: 'Sol Kol',
  arm_right: 'Sağ Kol',
};

export const SYMPTOM_LABELS_TR: Record<string, string> = {
  nausea: 'Mide Bulantısı',
  fatigue: 'Yorgunluk',
  headache: 'Baş Ağrısı',
  acid_reflux: 'Mide Yanması / Reflü',
  constipation: 'Kabızlık',
  other: 'Diğer Belirti',
};

export function formatMonthYear(year: number, month: number): string {
  const monthName = MONTH_NAMES_TR[month - 1] || '';
  return `${monthName} ${year}`;
}

export function formatDayDetailTitle(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const monthName = MONTH_NAMES_TR[monthIndex] || '';
  return `${day} ${monthName} ${year}`;
}

function getInitialDateState(): {
  year: number;
  month: number;
  todayStr: string;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  return {
    year,
    month,
    todayStr: `${year}-${monthStr}-${dayStr}`,
  };
}

export default function CalendarScreen() {
  const { tokens, isDark } = useAppTheme();
  const initial = useMemo(() => getInitialDateState(), []);

  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [selectedDateStr, setSelectedDateStr] = useState(initial.todayStr);

  const [injections, setInjections] = useState<Injection[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [injs, meds, userSet, syms] = await Promise.all([
        getInjections(),
        getMedications(),
        getUserSettings(),
        getSymptomLogs(),
      ]);
      setInjections(injs);
      setMedications(meds);
      setSettings(userSet);
      setSymptomLogs(syms);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const activeInjections = useMemo(
    () => injections.filter((inj) => !inj.deletedAt),
    [injections]
  );

  const injectionsByDate = useMemo(() => {
    const map = new Map<string, Injection[]>();
    for (const inj of activeInjections) {
      const dateKey = inj.injectedAt.slice(0, 10);
      const list = map.get(dateKey) || [];
      list.push(inj);
      map.set(dateKey, list);
    }
    return map;
  }, [activeInjections]);

  const latestInjection = useMemo(() => {
    if (activeInjections.length === 0) return null;
    return [...activeInjections].sort(
      (a, b) =>
        new Date(b.injectedAt).getTime() - new Date(a.injectedAt).getTime()
    )[0];
  }, [activeInjections]);

  const projectedDateSet = useMemo(() => {
    if (!latestInjection) return new Set<string>();
    const projected = predictNextDoses(latestInjection.injectedAt, 4, 7);
    return new Set(projected);
  }, [latestInjection]);

  const currentMed = useMemo(() => {
    return (
      medications.find((m) => m.id === settings?.activeMedicationId) ||
      medications[0] ||
      null
    );
  }, [medications, settings]);

  const halfLifeHours = currentMed?.halfLifeHours || 120;

  const calendarGrid = useMemo(() => {
    return getCalendarGrid(viewYear, viewMonth, initial.todayStr);
  }, [viewYear, viewMonth, initial.todayStr]);

  const selectedDayInjections = useMemo(() => {
    return injectionsByDate.get(selectedDateStr) || [];
  }, [injectionsByDate, selectedDateStr]);

  const selectedDaySymptoms = useMemo(() => {
    return symptomLogs.filter(
      (s) => !s.deletedAt && s.loggedAt.slice(0, 10) === selectedDateStr
    );
  }, [symptomLogs, selectedDateStr]);

  const estimatedLevelAtSelectedDate = useMemo(() => {
    return calculateEstimatedLevelAtDate(
      activeInjections,
      selectedDateStr,
      halfLifeHours
    );
  }, [activeInjections, selectedDateStr, halfLifeHours]);

  const handlePrevMonth = useCallback(() => {
    setViewMonth((prevMonth) => {
      if (prevMonth === 1) {
        setViewYear((prevYear) => prevYear - 1);
        return 12;
      }
      return prevMonth - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((prevMonth) => {
      if (prevMonth === 12) {
        setViewYear((prevYear) => prevYear + 1);
        return 1;
      }
      return prevMonth + 1;
    });
  }, []);

  const handleTodayPress = useCallback(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curDay = String(now.getDate()).padStart(2, '0');
    const curMonthStr = String(curMonth).padStart(2, '0');
    const todayString = `${curYear}-${curMonthStr}-${curDay}`;

    setViewYear(curYear);
    setViewMonth(curMonth);
    setSelectedDateStr(todayString);
  }, []);

  const handleDayPress = useCallback((day: CalendarDay) => {
    setSelectedDateStr(day.dateStr);
    if (!day.isCurrentMonth) {
      const parts = day.dateStr.split('-');
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10));
      }
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: tokens.bg }]}>
      <AmbientMesh />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Selector Header */}
        <GlassCard variant="subtle" style={styles.monthHeaderCard}>
          <View style={styles.monthHeaderRow}>
            <View style={styles.monthNavGroup}>
              <Pressable
                onPress={handlePrevMonth}
                style={styles.navButton}
                accessibilityRole="button"
                accessibilityLabel="Önceki Ay"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  style={[styles.navArrowText, { color: tokens.textPrimary }]}
                >
                  ‹
                </Text>
              </Pressable>

              <Text
                style={[styles.monthTitleText, { color: tokens.textPrimary }]}
              >
                {formatMonthYear(viewYear, viewMonth)}
              </Text>

              <Pressable
                onPress={handleNextMonth}
                style={styles.navButton}
                accessibilityRole="button"
                accessibilityLabel="Sonraki Ay"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  style={[styles.navArrowText, { color: tokens.textPrimary }]}
                >
                  ›
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleTodayPress}
              style={[
                styles.todayQuickButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Bugüne Git"
            >
              <Text style={[styles.todayQuickText, { color: tokens.accent }]}>
                Bugün
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        {/* Calendar Grid Card */}
        <GlassCard variant="default" style={styles.gridCard}>
          {/* Weekday Headers */}
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((wkd) => (
              <View key={wkd} style={styles.weekdayCell}>
                <Text
                  style={[
                    styles.weekdayText,
                    { color: tokens.textSecondary },
                  ]}
                >
                  {wkd}
                </Text>
              </View>
            ))}
          </View>

          {/* 7-Column Days Grid */}
          <View style={styles.daysGrid}>
            {calendarGrid.map((day) => {
              const isSelected = day.dateStr === selectedDateStr;
              const hasInjection = injectionsByDate.has(day.dateStr);
              const isProjected = projectedDateSet.has(day.dateStr);

              let cellTextColor = tokens.textPrimary;
              if (!day.isCurrentMonth) {
                cellTextColor = tokens.textTertiary;
              } else if (isSelected) {
                cellTextColor = tokens.textPrimary;
              } else if (day.isToday) {
                cellTextColor = tokens.accent;
              }

              return (
                <View key={day.dateStr} style={styles.dayCol}>
                  <Pressable
                    onPress={() => handleDayPress(day)}
                    hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
                    style={[
                      styles.dayCellButton,
                      isSelected && {
                        backgroundColor: isDark
                          ? 'rgba(0, 122, 255, 0.28)'
                          : 'rgba(0, 122, 255, 0.16)',
                        borderColor: tokens.accent,
                        borderWidth: 1.5,
                      },
                      day.isToday &&
                        !isSelected && {
                          borderColor: isDark
                            ? 'rgba(255, 255, 255, 0.35)'
                            : 'rgba(0, 0, 0, 0.22)',
                          borderWidth: 1,
                        },
                      isProjected &&
                        !isSelected && {
                          borderWidth: 1.5,
                          borderColor: tokens.accent,
                          borderStyle: 'dashed',
                        },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.dateStr}${
                      hasInjection ? ', Enjeksiyon yapıldı' : ''
                    }${isProjected ? ', Öngörülen doz' : ''}`}
                  >
                    <Text
                      style={[
                        styles.dayNumberText,
                        {
                          color: cellTextColor,
                          fontWeight:
                            isSelected || day.isToday ? '700' : '500',
                        },
                      ]}
                    >
                      {day.dayNumber}
                    </Text>

                    {/* Indicator Dot */}
                    <View style={styles.dotContainer}>
                      {hasInjection ? (
                        <View
                          style={[
                            styles.injectionDot,
                            { backgroundColor: tokens.accentGreen },
                          ]}
                        />
                      ) : isProjected && !isSelected ? (
                        <View
                          style={[
                            styles.projectedDot,
                            { backgroundColor: tokens.accent },
                          ]}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </GlassCard>

        {/* Selected Day Detail Card */}
        <GlassCard variant="prominent" style={styles.detailCard}>
          <Text
            style={[styles.detailTitleText, { color: tokens.textPrimary }]}
          >
            {formatDayDetailTitle(selectedDateStr)}
          </Text>

          {/* Estimated Active Blood Concentration */}
          <View
            style={[
              styles.concentrationBox,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'rgba(0, 0, 0, 0.04)',
              },
            ]}
          >
            <View
              style={[
                styles.levelIndicatorDot,
                {
                  backgroundColor:
                    estimatedLevelAtSelectedDate > 0
                      ? tokens.accent
                      : tokens.textTertiary,
                },
              ]}
            />
            <Text
              style={[
                styles.concentrationLabelText,
                { color: tokens.textSecondary },
              ]}
            >
              Tahmini Kandaki İlaç Seviyesi:
            </Text>
            <Text
              style={[
                styles.concentrationValueText,
                { color: tokens.textPrimary },
              ]}
            >
              {currentMed?.name || 'İlaç'}:{' '}
              {estimatedLevelAtSelectedDate.toFixed(2)} mg aktif
            </Text>
          </View>

          {/* Injections Section */}
          <View style={styles.sectionBlock}>
            <Text
              style={[styles.sectionTitle, { color: tokens.textSecondary }]}
            >
              Enjeksiyonlar
            </Text>

            {selectedDayInjections.length > 0 ? (
              selectedDayInjections.map((inj) => (
                <View
                  key={inj.id}
                  style={[
                    styles.itemRow,
                    {
                      borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.08)',
                    },
                  ]}
                >
                  <View style={styles.itemHeaderRow}>
                    <Text
                      style={[
                        styles.itemHighlightText,
                        { color: tokens.accentGreen },
                      ]}
                    >
                      {inj.doseMg} mg
                    </Text>
                    <Text
                      style={[
                        styles.itemDetailText,
                        { color: tokens.textPrimary },
                      ]}
                    >
                      {SITE_NAMES_TR[inj.site] || inj.site}
                    </Text>
                  </View>
                  {inj.notes ? (
                    <Text
                      style={[
                        styles.itemNotesText,
                        { color: tokens.textSecondary },
                      ]}
                    >
                      {inj.notes}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <View style={styles.emptyActionRow}>
                <Text
                  style={[styles.emptyNoteText, { color: tokens.textTertiary }]}
                >
                  Bu tarihte enjeksiyon kaydı yok.
                </Text>
                <Pressable
                  onPress={() => router.push('/modal-log-injection')}
                  style={[
                    styles.logDoseButton,
                    { backgroundColor: tokens.accent },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Doz Kaydet"
                >
                  <Text style={styles.logDoseButtonText}>+ Doz Kaydet</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Symptoms Section */}
          <View style={styles.sectionBlock}>
            <Text
              style={[styles.sectionTitle, { color: tokens.textSecondary }]}
            >
              Belirtiler
            </Text>

            {selectedDaySymptoms.length > 0 ? (
              selectedDaySymptoms.map((sym) => (
                <View
                  key={sym.id}
                  style={[
                    styles.itemRow,
                    {
                      borderColor: isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.08)',
                    },
                  ]}
                >
                  <View style={styles.itemHeaderRow}>
                    <Text
                      style={[
                        styles.itemDetailText,
                        { color: tokens.textPrimary },
                      ]}
                    >
                      {SYMPTOM_LABELS_TR[sym.symptomType] || sym.symptomType}
                    </Text>
                    <Text
                      style={[
                        styles.severityBadgeText,
                        { color: tokens.accentOrange },
                      ]}
                    >
                      Şiddet: {sym.severity}/5
                    </Text>
                  </View>
                  {sym.notes ? (
                    <Text
                      style={[
                        styles.itemNotesText,
                        { color: tokens.textSecondary },
                      ]}
                    >
                      {sym.notes}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text
                style={[styles.emptyNoteText, { color: tokens.textTertiary }]}
              >
                Kayıtlı belirti yok.
              </Text>
            )}
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
    gap: 16,
  },
  monthHeaderCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowText: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '300',
  },
  monthTitleText: {
    fontSize: 18,
    fontWeight: '700',
  },
  todayQuickButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  todayQuickText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gridCard: {
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCol: {
    width: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  dayCellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  dotContainer: {
    height: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  injectionDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  projectedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  detailCard: {
    padding: 18,
    gap: 16,
  },
  detailTitleText: {
    fontSize: 20,
    fontWeight: '700',
  },
  concentrationBox: {
    padding: 12,
    borderRadius: 14,
    gap: 4,
  },
  levelIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  concentrationLabelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  concentrationValueText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sectionBlock: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemHighlightText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  itemDetailText: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemNotesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  severityBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  emptyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  emptyNoteText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  logDoseButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  logDoseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
