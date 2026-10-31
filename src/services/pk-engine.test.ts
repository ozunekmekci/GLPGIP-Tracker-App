import {
  calculateEliminationRate,
  calculateRemainingDose,
  calculateCurrentBloodLevel,
  generateConcentrationCurve,
} from './pk-engine';
import { Injection } from '../types';

describe('Pharmacokinetics Engine', () => {
  describe('calculateEliminationRate', () => {
    it('calculates correct elimination rate k for Semaglutide/Tirzepatide (~168 hours)', () => {
      const kSemaglutide = calculateEliminationRate(168);
      expect(kSemaglutide).toBeCloseTo(0.004126, 5);
    });

    it('returns 0 for invalid or non-positive half-life', () => {
      expect(calculateEliminationRate(0)).toBe(0);
      expect(calculateEliminationRate(-50)).toBe(0);
    });
  });

  describe('calculateRemainingDose', () => {
    it('calculates remaining dose accurately after exactly 1 half-life', () => {
      const remaining = calculateRemainingDose(1.0, 168, 168);
      expect(remaining).toBeCloseTo(0.5, 4);
    });

    it('calculates remaining dose accurately after 2 half-lives', () => {
      const remaining = calculateRemainingDose(1.0, 168, 336);
      expect(remaining).toBeCloseTo(0.25, 4);
    });

    it('returns 0 for negative elapsed hours or non-positive dose/half-life', () => {
      expect(calculateRemainingDose(1.0, 168, -10)).toBe(0);
      expect(calculateRemainingDose(0, 168, 24)).toBe(0);
      expect(calculateRemainingDose(1.0, 0, 24)).toBe(0);
    });
  });

  describe('calculateCurrentBloodLevel', () => {
    it('calculates cumulative blood level from multiple injections', () => {
      const now = Date.now();
      const injections: Injection[] = [
        {
          id: '1',
          medicationId: 'm1',
          doseMg: 1.0,
          injectedAt: new Date(now - 7 * 24 * 3600 * 1000).toISOString(), // 1 week (168h) ago
          site: 'abdomen_left',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          medicationId: 'm1',
          doseMg: 1.0,
          injectedAt: new Date(now).toISOString(), // Just now
          site: 'thigh_right',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const currentLevel = calculateCurrentBloodLevel(injections, 168, now);
      // 0.5 (from 1st injection) + 1.0 (from 2nd injection) = 1.5 mg
      expect(currentLevel).toBeCloseTo(1.5, 2);
    });

    it('ignores soft-deleted injections', () => {
      const now = Date.now();
      const injections: Injection[] = [
        {
          id: '1',
          medicationId: 'm1',
          doseMg: 1.0,
          injectedAt: new Date(now).toISOString(),
          site: 'abdomen_left',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: new Date().toISOString(), // Soft-deleted
        },
        {
          id: '2',
          medicationId: 'm1',
          doseMg: 2.5,
          injectedAt: new Date(now).toISOString(),
          site: 'abdomen_right',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const currentLevel = calculateCurrentBloodLevel(injections, 168, now);
      expect(currentLevel).toBeCloseTo(2.5, 2);
    });

    it('ignores future injections relative to target timestamp', () => {
      const now = Date.now();
      const injections: Injection[] = [
        {
          id: 'future',
          medicationId: 'm1',
          doseMg: 5.0,
          injectedAt: new Date(now + 24 * 3600 * 1000).toISOString(), // In the future
          site: 'abdomen_left',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const currentLevel = calculateCurrentBloodLevel(injections, 168, now);
      expect(currentLevel).toBe(0);
    });

    it('returns 0 when injections list is empty', () => {
      expect(calculateCurrentBloodLevel([], 168)).toBe(0);
    });
  });

  describe('generateConcentrationCurve', () => {
    it('generates chronological curve points for charts', () => {
      const now = Date.now();
      const injections: Injection[] = [
        {
          id: '1',
          medicationId: 'm1',
          doseMg: 0.5,
          injectedAt: new Date(now).toISOString(),
          site: 'abdomen_left',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const curve = generateConcentrationCurve(injections, 168, 7, 7);
      expect(curve.length).toBeGreaterThan(10);
      expect(curve[0]).toHaveProperty('levelMg');
      expect(curve[0]).toHaveProperty('timestamp');
      expect(curve[0]).toHaveProperty('dateStr');

      // Check chronological order
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i].timestamp).toBeGreaterThan(curve[i - 1].timestamp);
      }
    });
  });
});
