import {
  calculateEstimatedLevelAtDate,
  getCalendarGrid,
  predictNextDoses,
} from './calendar-helpers';
import { Injection } from '../types';

describe('calendar-helpers', () => {
  describe('getCalendarGrid', () => {
    it('returns 42 days (divisible by 7) for a given month', () => {
      const grid = getCalendarGrid(2026, 10, '2026-10-15');
      expect(grid.length).toBe(42);
      expect(grid.length % 7).toBe(0);
    });

    it('starts on Monday and correctly handles October 2026 boundaries', () => {
      // Oct 1, 2026 is Thursday. Monday of that week is Sep 28.
      const grid = getCalendarGrid(2026, 10, '2026-10-15');

      // First cell should be Monday Sep 28
      expect(grid[0]).toEqual({
        dateStr: '2026-09-28',
        dayNumber: 28,
        isCurrentMonth: false,
        isToday: false,
      });

      // Oct 1 should be index 3
      expect(grid[3]).toEqual({
        dateStr: '2026-10-01',
        dayNumber: 1,
        isCurrentMonth: true,
        isToday: false,
      });

      // Oct 31 should be index 33 (Saturday)
      expect(grid[33]).toEqual({
        dateStr: '2026-10-31',
        dayNumber: 31,
        isCurrentMonth: true,
        isToday: false,
      });

      // Oct 15 should have isToday: true
      const oct15 = grid.find((d) => d.dateStr === '2026-10-15');
      expect(oct15).toBeDefined();
      expect(oct15?.isToday).toBe(true);
      expect(oct15?.isCurrentMonth).toBe(true);

      // Trailing cell after Oct 31 is Nov 1 (Sunday, index 34)
      expect(grid[34]).toEqual({
        dateStr: '2026-11-01',
        dayNumber: 1,
        isCurrentMonth: false,
        isToday: false,
      });

      // Last cell (index 41) is Nov 8 (Sunday)
      expect(grid[41]).toEqual({
        dateStr: '2026-11-08',
        dayNumber: 8,
        isCurrentMonth: false,
        isToday: false,
      });
    });

    it('correctly counts days belonging to current month', () => {
      const grid = getCalendarGrid(2026, 10, '2026-10-15');
      const currentMonthDays = grid.filter((d) => d.isCurrentMonth);
      expect(currentMonthDays.length).toBe(31);
      expect(currentMonthDays[0].dayNumber).toBe(1);
      expect(currentMonthDays[30].dayNumber).toBe(31);
    });

    it('handles leap year February correctly (Feb 2024 has 29 days)', () => {
      const grid = getCalendarGrid(2024, 2, '2024-02-14');
      const currentMonthDays = grid.filter((d) => d.isCurrentMonth);
      expect(currentMonthDays.length).toBe(29);
      expect(grid.length).toBe(42);
    });

    it('handles year transition across January and December', () => {
      // Jan 1, 2026 is Thursday. Leading days come from Dec 2025.
      const grid = getCalendarGrid(2026, 1, '2026-01-01');
      expect(grid[0].dateStr).toBe('2025-12-29');
      expect(grid[0].isCurrentMonth).toBe(false);

      const jan1 = grid.find((d) => d.dateStr === '2026-01-01');
      expect(jan1?.isToday).toBe(true);
      expect(jan1?.isCurrentMonth).toBe(true);
    });
  });

  describe('predictNextDoses', () => {
    it('returns empty array if lastInjectedAt is null, undefined, or empty', () => {
      expect(predictNextDoses(null)).toEqual([]);
      expect(predictNextDoses(undefined)).toEqual([]);
      expect(predictNextDoses('')).toEqual([]);
      expect(predictNextDoses('invalid-date')).toEqual([]);
    });

    it('returns 4 projected doses at 7-day intervals by default', () => {
      const projected = predictNextDoses('2026-10-15T10:00:00Z');
      expect(projected).toEqual([
        '2026-10-22',
        '2026-10-29',
        '2026-11-05',
        '2026-11-12',
      ]);
    });

    it('respects custom count and intervalDays', () => {
      const projected = predictNextDoses('2026-10-15', 2, 5);
      expect(projected).toEqual(['2026-10-20', '2026-10-25']);
    });

    it('handles year transition for projected doses', () => {
      const projected = predictNextDoses('2026-12-20', 3, 7);
      expect(projected).toEqual([
        '2026-12-27',
        '2027-01-03',
        '2027-01-10',
      ]);
    });

    it('returns empty array if count <= 0', () => {
      expect(predictNextDoses('2026-10-15', 0)).toEqual([]);
    });
  });

  describe('calculateEstimatedLevelAtDate', () => {
    const mockInjections: Injection[] = [
      {
        id: 'inj-1',
        medicationId: 'med-1',
        doseMg: 5.0,
        injectedAt: '2026-10-15T12:00:00Z',
        site: 'abdomen_left',
        createdAt: '2026-10-15T12:00:00Z',
        updatedAt: '2026-10-15T12:00:00Z',
      },
      {
        id: 'inj-deleted',
        medicationId: 'med-1',
        doseMg: 10.0,
        injectedAt: '2026-10-15T12:00:00Z',
        site: 'abdomen_right',
        createdAt: '2026-10-15T12:00:00Z',
        updatedAt: '2026-10-15T12:00:00Z',
        deletedAt: '2026-10-15T13:00:00Z',
      },
    ];

    it('returns 0 for empty injections or invalid half-life', () => {
      expect(calculateEstimatedLevelAtDate([], '2026-10-15', 120)).toBe(0);
      expect(calculateEstimatedLevelAtDate(mockInjections, '2026-10-15', 0)).toBe(0);
      expect(calculateEstimatedLevelAtDate(mockInjections, 'invalid-date', 120)).toBe(0);
    });

    it('returns 0 for dates before any injection was administered', () => {
      const level = calculateEstimatedLevelAtDate(mockInjections, '2026-10-10', 120);
      expect(level).toBe(0);
    });

    it('computes dose level on injection day (5.00 mg)', () => {
      const level = calculateEstimatedLevelAtDate(mockInjections, '2026-10-15', 120);
      expect(level).toBe(5.0);
    });

    it('computes half-life decay after 5 days (120 hours)', () => {
      // Target date: 2026-10-20T12:00:00Z -> exactly 120 hours after inj-1
      const level = calculateEstimatedLevelAtDate(mockInjections, '2026-10-20', 120);
      expect(level).toBe(2.5);
    });

    it('accumulates multiple active injections while ignoring deleted ones', () => {
      const multiInjections: Injection[] = [
        ...mockInjections,
        {
          id: 'inj-2',
          medicationId: 'med-1',
          doseMg: 5.0,
          injectedAt: '2026-10-20T12:00:00Z',
          site: 'thigh_left',
          createdAt: '2026-10-20T12:00:00Z',
          updatedAt: '2026-10-20T12:00:00Z',
        },
      ];

      // On 2026-10-20: inj-1 has decayed to 2.5mg, inj-2 is freshly administered at 5.0mg -> total 7.5mg
      const level = calculateEstimatedLevelAtDate(multiInjections, '2026-10-20', 120);
      expect(level).toBe(7.5);
    });
  });
});
