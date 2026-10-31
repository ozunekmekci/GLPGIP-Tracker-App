import { MedicationType, InjectionSite, ThemePreference } from './index';

describe('Domain Types', () => {
  it('defines valid medication types', () => {
    const types: MedicationType[] = ['semaglutide', 'tirzepatide', 'retatrutide', 'custom'];
    expect(types).toHaveLength(4);
  });

  it('defines 6 primary injection sites', () => {
    const sites: InjectionSite[] = [
      'abdomen_left',
      'abdomen_right',
      'thigh_left',
      'thigh_right',
      'arm_left',
      'arm_right',
    ];
    expect(sites).toHaveLength(6);
  });

  it('defines valid theme preferences', () => {
    const preferences: ThemePreference[] = ['system', 'light', 'dark'];
    expect(preferences).toHaveLength(3);
  });
});
