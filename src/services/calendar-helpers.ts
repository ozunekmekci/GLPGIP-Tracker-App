import { Injection } from '../types';
import { calculateCurrentBloodLevel } from './pk-engine';

export interface CalendarDay {
  dateStr: string; // 'YYYY-MM-DD'
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

function getSystemTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns a Monday-first 7-column calendar grid (42 days) for the specified year and month.
 * @param year e.g. 2026
 * @param month 1-12 (1 = January, 10 = October)
 * @param todayStr Optional 'YYYY-MM-DD' date string to mark isToday. Defaults to system today.
 */
export function getCalendarGrid(
  year: number,
  month: number,
  todayStr?: string
): CalendarDay[] {
  const resolvedTodayStr = todayStr || getSystemTodayStr();
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeek = (firstDayOfMonth.getUTCDay() + 6) % 7;
  const startDate = new Date(Date.UTC(year, month - 1, 1 - firstDayOfWeek));

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate() + i
      )
    );
    const cellYear = cellDate.getUTCFullYear();
    const cellMonth = cellDate.getUTCMonth() + 1;
    const cellDay = cellDate.getUTCDate();
    const dateStr = `${cellYear}-${String(cellMonth).padStart(2, '0')}-${String(
      cellDay
    ).padStart(2, '0')}`;

    days.push({
      dateStr,
      dayNumber: cellDay,
      isCurrentMonth: cellYear === year && cellMonth === month,
      isToday: dateStr === resolvedTodayStr,
    });
  }

  return days;
}

/**
 * Projects future dose dates based on the last injection date and weekly interval.
 * @param lastInjectedAt ISO string or YYYY-MM-DD string
 * @param count Number of projected doses (default 4)
 * @param intervalDays Days between doses (default 7)
 */
export function predictNextDoses(
  lastInjectedAt: string | null | undefined,
  count: number = 4,
  intervalDays: number = 7
): string[] {
  if (!lastInjectedAt || count <= 0 || intervalDays <= 0) {
    return [];
  }

  let y: number;
  let m: number;
  let d: number;

  const match = lastInjectedAt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    y = parseInt(match[1], 10);
    m = parseInt(match[2], 10) - 1;
    d = parseInt(match[3], 10);
  } else {
    const parsed = new Date(lastInjectedAt);
    if (isNaN(parsed.getTime())) {
      return [];
    }
    y = parsed.getFullYear();
    m = parsed.getMonth();
    d = parsed.getDate();
  }

  const projected: string[] = [];
  for (let step = 1; step <= count; step++) {
    const nextDate = new Date(Date.UTC(y, m, d + step * intervalDays));
    const py = nextDate.getUTCFullYear();
    const pm = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
    const pd = String(nextDate.getUTCDate()).padStart(2, '0');
    projected.push(`${py}-${pm}-${pd}`);
  }

  return projected;
}

/**
 * Calculates estimated active medication level at 12:00:00 UTC on the target date.
 * Returns rounded to 2 decimal places.
 */
export function calculateEstimatedLevelAtDate(
  injections: Injection[],
  targetDateStr: string,
  halfLifeHours: number
): number {
  if (!injections || injections.length === 0 || halfLifeHours <= 0) {
    return 0;
  }

  const targetTimestamp = new Date(`${targetDateStr}T12:00:00Z`).getTime();
  if (isNaN(targetTimestamp)) {
    return 0;
  }

  const rawLevel = calculateCurrentBloodLevel(
    injections,
    halfLifeHours,
    targetTimestamp
  );
  return Number(rawLevel.toFixed(2));
}
