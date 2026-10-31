import {
  ROTATION_ORDER,
  SITE_DISPLAY_NAMES,
  getRecommendedNextSite,
  getSiteDisplayName,
  getSiteRotationHistory,
} from './rotation-engine';
import { Injection, InjectionSite } from '../types';

describe('Injection Site Rotation Engine', () => {
  describe('Constants and Display Names', () => {
    it('defines 6 anatomical injection sites in recommended rotation order', () => {
      expect(ROTATION_ORDER).toEqual([
        'abdomen_left',
        'abdomen_right',
        'thigh_left',
        'thigh_right',
        'arm_left',
        'arm_right',
      ]);
    });

    it('returns Turkish localized display names for all 6 sites', () => {
      expect(getSiteDisplayName('abdomen_left')).toBe('Sol Karın');
      expect(getSiteDisplayName('abdomen_right')).toBe('Sağ Karın');
      expect(getSiteDisplayName('thigh_left')).toBe('Sol Uyluk');
      expect(getSiteDisplayName('thigh_right')).toBe('Sağ Uyluk');
      expect(getSiteDisplayName('arm_left')).toBe('Sol Kol');
      expect(getSiteDisplayName('arm_right')).toBe('Sağ Kol');
    });

    it('falls back to site string for unknown site', () => {
      expect(getSiteDisplayName('unknown_site' as InjectionSite)).toBe('unknown_site');
    });
  });

  describe('getRecommendedNextSite', () => {
    it('returns default site (abdomen_left) when no previous injections exist', () => {
      expect(getRecommendedNextSite([])).toBe('abdomen_left');
    });

    it('rotates sequentially through each site', () => {
      const createInjection = (site: InjectionSite, injectedAt: string): Injection => ({
        id: 'inj-1',
        medicationId: 'med-1',
        doseMg: 0.5,
        site,
        injectedAt,
        createdAt: injectedAt,
        updatedAt: injectedAt,
      });

      // abdomen_left -> abdomen_right
      expect(
        getRecommendedNextSite([createInjection('abdomen_left', '2026-10-01T10:00:00Z')])
      ).toBe('abdomen_right');

      // abdomen_right -> thigh_left
      expect(
        getRecommendedNextSite([createInjection('abdomen_right', '2026-10-08T10:00:00Z')])
      ).toBe('thigh_left');

      // thigh_left -> thigh_right
      expect(
        getRecommendedNextSite([createInjection('thigh_left', '2026-10-15T10:00:00Z')])
      ).toBe('thigh_right');

      // thigh_right -> arm_left
      expect(
        getRecommendedNextSite([createInjection('thigh_right', '2026-10-22T10:00:00Z')])
      ).toBe('arm_left');

      // arm_left -> arm_right
      expect(
        getRecommendedNextSite([createInjection('arm_left', '2026-10-29T10:00:00Z')])
      ).toBe('arm_right');

      // arm_right -> abdomen_left (wraps around)
      expect(
        getRecommendedNextSite([createInjection('arm_right', '2026-11-05T10:00:00Z')])
      ).toBe('abdomen_left');
    });

    it('sorts injections chronologically so the most recent injection determines rotation', () => {
      // Injections provided in non-chronological order (older first, newer second or vice versa)
      const injections: Injection[] = [
        {
          id: 'inj-old',
          medicationId: 'med-1',
          doseMg: 0.25,
          site: 'thigh_left',
          injectedAt: '2026-10-01T10:00:00Z',
          createdAt: '2026-10-01T10:00:00Z',
          updatedAt: '2026-10-01T10:00:00Z',
        },
        {
          id: 'inj-new',
          medicationId: 'med-1',
          doseMg: 0.5,
          site: 'abdomen_left',
          injectedAt: '2026-10-15T10:00:00Z', // Most recent
          createdAt: '2026-10-15T10:00:00Z',
          updatedAt: '2026-10-15T10:00:00Z',
        },
      ];

      // Most recent is abdomen_left -> next should be abdomen_right
      expect(getRecommendedNextSite(injections)).toBe('abdomen_right');
    });

    it('ignores soft-deleted injections', () => {
      const injections: Injection[] = [
        {
          id: 'inj-1',
          medicationId: 'med-1',
          doseMg: 0.25,
          site: 'thigh_left',
          injectedAt: '2026-10-01T10:00:00Z',
          createdAt: '2026-10-01T10:00:00Z',
          updatedAt: '2026-10-01T10:00:00Z',
        },
        {
          id: 'inj-deleted',
          medicationId: 'med-1',
          doseMg: 0.5,
          site: 'arm_left',
          injectedAt: '2026-10-15T10:00:00Z',
          createdAt: '2026-10-15T10:00:00Z',
          updatedAt: '2026-10-15T10:00:00Z',
          deletedAt: '2026-10-16T12:00:00Z', // Soft deleted!
        },
      ];

      // Latest active is thigh_left -> next should be thigh_right
      expect(getRecommendedNextSite(injections)).toBe('thigh_right');
    });

    it('returns default site when all injections are soft-deleted', () => {
      const injections: Injection[] = [
        {
          id: 'inj-deleted',
          medicationId: 'med-1',
          doseMg: 0.5,
          site: 'thigh_right',
          injectedAt: '2026-10-15T10:00:00Z',
          createdAt: '2026-10-15T10:00:00Z',
          updatedAt: '2026-10-15T10:00:00Z',
          deletedAt: '2026-10-16T12:00:00Z',
        },
      ];

      expect(getRecommendedNextSite(injections)).toBe('abdomen_left');
    });
  });

  describe('getSiteRotationHistory', () => {
    it('provides breakdown of usage count and last used date for all 6 sites when empty', () => {
      const history = getSiteRotationHistory([]);

      expect(Object.keys(history)).toHaveLength(6);
      for (const site of ROTATION_ORDER) {
        expect(history[site]).toEqual({
          site,
          displayName: SITE_DISPLAY_NAMES[site],
          count: 0,
          lastUsedAt: null,
        });
      }
    });

    it('correctly aggregates counts and identifies last used date', () => {
      const injections: Injection[] = [
        {
          id: 'inj-1',
          medicationId: 'med-1',
          doseMg: 0.25,
          site: 'abdomen_left',
          injectedAt: '2026-10-01T08:00:00Z',
          createdAt: '2026-10-01T08:00:00Z',
          updatedAt: '2026-10-01T08:00:00Z',
        },
        {
          id: 'inj-2',
          medicationId: 'med-1',
          doseMg: 0.25,
          site: 'abdomen_left',
          injectedAt: '2026-10-15T08:00:00Z', // Later
          createdAt: '2026-10-15T08:00:00Z',
          updatedAt: '2026-10-15T08:00:00Z',
        },
        {
          id: 'inj-3',
          medicationId: 'med-1',
          doseMg: 0.5,
          site: 'thigh_right',
          injectedAt: '2026-10-22T08:00:00Z',
          createdAt: '2026-10-22T08:00:00Z',
          updatedAt: '2026-10-22T08:00:00Z',
        },
      ];

      const history = getSiteRotationHistory(injections);

      expect(history.abdomen_left.count).toBe(2);
      expect(history.abdomen_left.lastUsedAt).toBe('2026-10-15T08:00:00Z');

      expect(history.thigh_right.count).toBe(1);
      expect(history.thigh_right.lastUsedAt).toBe('2026-10-22T08:00:00Z');

      expect(history.arm_left.count).toBe(0);
      expect(history.arm_left.lastUsedAt).toBeNull();
    });

    it('ignores soft-deleted injections when calculating site history', () => {
      const injections: Injection[] = [
        {
          id: 'inj-1',
          medicationId: 'med-1',
          doseMg: 0.25,
          site: 'abdomen_left',
          injectedAt: '2026-10-01T08:00:00Z',
          createdAt: '2026-10-01T08:00:00Z',
          updatedAt: '2026-10-01T08:00:00Z',
        },
        {
          id: 'inj-deleted',
          medicationId: 'med-1',
          doseMg: 0.5,
          site: 'abdomen_left',
          injectedAt: '2026-10-20T08:00:00Z',
          createdAt: '2026-10-20T08:00:00Z',
          updatedAt: '2026-10-20T08:00:00Z',
          deletedAt: '2026-10-21T08:00:00Z', // Deleted
        },
      ];

      const history = getSiteRotationHistory(injections);

      expect(history.abdomen_left.count).toBe(1);
      expect(history.abdomen_left.lastUsedAt).toBe('2026-10-01T08:00:00Z');
    });
  });
});
