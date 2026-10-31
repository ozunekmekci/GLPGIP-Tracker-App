import { Injection, InjectionSite } from '../types';

export const ROTATION_ORDER: InjectionSite[] = [
  'abdomen_left',
  'abdomen_right',
  'thigh_left',
  'thigh_right',
  'arm_left',
  'arm_right',
];

export const SITE_DISPLAY_NAMES: Record<InjectionSite, string> = {
  abdomen_left: 'Sol Karın',
  abdomen_right: 'Sağ Karın',
  thigh_left: 'Sol Uyluk',
  thigh_right: 'Sağ Uyluk',
  arm_left: 'Sol Kol',
  arm_right: 'Sağ Kol',
};

export interface SiteUsageStats {
  site: InjectionSite;
  displayName: string;
  count: number;
  lastUsedAt: string | null;
}

export function getSiteDisplayName(site: InjectionSite): string {
  return SITE_DISPLAY_NAMES[site] || site;
}

export function getRecommendedNextSite(recentInjections: Injection[]): InjectionSite {
  const activeInjections = recentInjections.filter((inj) => !inj.deletedAt);
  if (!activeInjections.length) {
    return ROTATION_ORDER[0];
  }

  const sorted = [...activeInjections].sort(
    (a, b) => new Date(b.injectedAt).getTime() - new Date(a.injectedAt).getTime()
  );
  const lastSite = sorted[0].site;
  const lastIndex = ROTATION_ORDER.indexOf(lastSite);

  if (lastIndex === -1) {
    return ROTATION_ORDER[0];
  }

  const nextIndex = (lastIndex + 1) % ROTATION_ORDER.length;
  return ROTATION_ORDER[nextIndex];
}

export function getSiteRotationHistory(
  injections: Injection[]
): Record<InjectionSite, SiteUsageStats> {
  const history = ROTATION_ORDER.reduce<Record<InjectionSite, SiteUsageStats>>(
    (acc, site) => {
      acc[site] = {
        site,
        displayName: getSiteDisplayName(site),
        count: 0,
        lastUsedAt: null,
      };
      return acc;
    },
    {} as Record<InjectionSite, SiteUsageStats>
  );

  for (const inj of injections) {
    if (inj.deletedAt || !history[inj.site]) continue;

    const stats = history[inj.site];
    stats.count += 1;

    if (
      !stats.lastUsedAt ||
      new Date(inj.injectedAt).getTime() > new Date(stats.lastUsedAt).getTime()
    ) {
      stats.lastUsedAt = inj.injectedAt;
    }
  }

  return history;
}
