import {
  calculatePKCoordinates,
  buildPKSmoothPath,
  buildPKAreaPath,
} from './pk-chart';
import {
  calculateWeightCoordinates,
  buildWeightLinePath,
  buildWeightAreaPath,
} from './weight-chart';
import { Injection, WeightLog } from '../types';
import { generateConcentrationCurve } from '../services/pk-engine';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: (styles: any) => styles,
    hairlineWidth: 1,
  },
  useColorScheme: () => 'light',
  Platform: { OS: 'ios' },
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Svg: 'Svg',
  Path: 'Path',
  Line: 'Line',
  Circle: 'Circle',
  Text: 'SvgText',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  Stop: 'Stop',
  Rect: 'Rect',
}));

describe('PK Chart Coordinate & Path Generation', () => {
  const baseTime = 1700000000000;

  it('handles empty curve points safely without NaN or crash', () => {
    const result = calculatePKCoordinates([], 320, 180);
    expect(result.points).toEqual([]);
    expect(result.linePath).toBe('');
    expect(result.areaPath).toBe('');
    expect(result.maxLevel).toBe(0);
    expect(result.currentLevel).toBe(0);
    expect(result.nowX).toBeNull();
    expect(result.nowY).toBeNull();
    expect(Number.isNaN(result.baselineY)).toBe(false);
  });

  it('handles zero-concentration curve points without division by zero', () => {
    const zeroPoints = [
      { timestamp: baseTime, dateStr: '11/14 0:00', levelMg: 0 },
      { timestamp: baseTime + 3600000 * 6, dateStr: '11/14 6:00', levelMg: 0 },
      { timestamp: baseTime + 3600000 * 12, dateStr: '11/14 12:00', levelMg: 0 },
    ];

    const result = calculatePKCoordinates(zeroPoints, 320, 180, undefined, baseTime + 3600000 * 6);
    expect(result.maxLevel).toBe(0);
    expect(result.points.length).toBe(3);
    for (const pt of result.points) {
      expect(Number.isNaN(pt.x)).toBe(false);
      expect(Number.isNaN(pt.y)).toBe(false);
      expect(Number.isFinite(pt.x)).toBe(true);
      expect(Number.isFinite(pt.y)).toBe(true);
      expect(pt.y).toBe(result.baselineY);
    }
    expect(result.linePath).not.toContain('NaN');
    expect(result.areaPath).not.toContain('NaN');
  });

  it('calculates valid coordinates and smooth bezier path for realistic injection data', () => {
    const testNow = Date.now();
    const injections: Injection[] = [
      {
        id: 'inj-1',
        medicationId: 'med-1',
        doseMg: 2.5,
        injectedAt: new Date(testNow - 86400000 * 2).toISOString(),
        site: 'abdomen_left',
        createdAt: new Date(testNow - 86400000 * 2).toISOString(),
        updatedAt: new Date(testNow - 86400000 * 2).toISOString(),
      },
    ];

    const curvePoints = generateConcentrationCurve(injections, 120, 7, 7);
    const result = calculatePKCoordinates(curvePoints, 350, 200, undefined, testNow);

    expect(result.points.length).toBe(curvePoints.length);
    expect(result.maxLevel).toBeGreaterThan(0);
    expect(result.currentLevel).toBeGreaterThan(0);

    for (const pt of result.points) {
      expect(Number.isFinite(pt.x)).toBe(true);
      expect(Number.isFinite(pt.y)).toBe(true);
      expect(Number.isNaN(pt.x)).toBe(false);
      expect(Number.isNaN(pt.y)).toBe(false);
      expect(pt.y).toBeGreaterThanOrEqual(16); // padding top
      expect(pt.y).toBeLessThanOrEqual(result.baselineY);
    }

    expect(result.linePath.startsWith('M')).toBe(true);
    expect(result.linePath).toContain('C');
    expect(result.areaPath.endsWith('Z')).toBe(true);
    expect(result.linePath).not.toContain('NaN');
    expect(result.areaPath).not.toContain('NaN');

    if (result.nowX !== null) {
      expect(Number.isFinite(result.nowX)).toBe(true);
      expect(Number.isFinite(result.nowY)).toBe(true);
    }
  });

  it('buildPKSmoothPath and buildPKAreaPath handle edge cases', () => {
    expect(buildPKSmoothPath([])).toBe('');
    expect(buildPKAreaPath([], 150)).toBe('');

    const singlePoint = [{ x: 100, y: 50 }];
    expect(buildPKSmoothPath(singlePoint)).toBe('M 100 50');
    expect(buildPKAreaPath(singlePoint, 150)).toBe('');

    const twoPoints = [
      { x: 10, y: 20 },
      { x: 50, y: 80 },
    ];
    expect(buildPKSmoothPath(twoPoints)).toBe('M 10 20 L 50 80');
    expect(buildPKAreaPath(twoPoints, 100)).toBe('M 10 20 L 50 80 L 50.00 100.00 L 10.00 100.00 Z');
  });
});

describe('Weight Chart Coordinate & Path Generation', () => {
  it('handles empty weight logs safely', () => {
    const result = calculateWeightCoordinates([], 320, 180);
    expect(result.points).toEqual([]);
    expect(result.linePath).toBe('');
    expect(result.areaPath).toBe('');
    expect(result.targetY).toBeNull();
    expect(result.startWeight).toBeNull();
    expect(result.latestWeight).toBeNull();
    expect(result.deltaWeight).toBeNull();
  });

  it('ignores soft-deleted logs and handles list with only deleted logs', () => {
    const deletedLogs: WeightLog[] = [
      {
        id: 'w1',
        weightKg: 85.0,
        loggedAt: '2026-10-01T08:00:00Z',
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
        deletedAt: '2026-10-02T08:00:00Z',
      },
    ];
    const result = calculateWeightCoordinates(deletedLogs, 320, 180);
    expect(result.points).toEqual([]);
    expect(result.startWeight).toBeNull();
  });

  it('handles single data point without division by zero or NaN', () => {
    const singleLog: WeightLog[] = [
      {
        id: 'w1',
        weightKg: 82.5,
        loggedAt: '2026-10-10T08:00:00Z',
        createdAt: '2026-10-10T08:00:00Z',
        updatedAt: '2026-10-10T08:00:00Z',
      },
    ];

    const result = calculateWeightCoordinates(singleLog, 320, 180, 75);
    expect(result.points.length).toBe(1);
    const p = result.points[0];
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
    expect(Number.isNaN(p.x)).toBe(false);
    expect(Number.isNaN(p.y)).toBe(false);
    expect(result.startWeight).toBe(82.5);
    expect(result.latestWeight).toBe(82.5);
    expect(result.deltaWeight).toBe(0);
    expect(result.targetY).not.toBeNull();
    expect(Number.isFinite(result.targetY!)).toBe(true);
    expect(Number.isNaN(result.targetY!)).toBe(false);
  });

  it('sorts logs chronologically and calculates accurate delta', () => {
    const unorderedLogs: WeightLog[] = [
      {
        id: 'w3',
        weightKg: 80.2,
        loggedAt: '2026-10-25T08:00:00Z',
        createdAt: '2026-10-25T08:00:00Z',
        updatedAt: '2026-10-25T08:00:00Z',
      },
      {
        id: 'w1',
        weightKg: 85.0,
        loggedAt: '2026-10-01T08:00:00Z',
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'w2',
        weightKg: 83.1,
        loggedAt: '2026-10-12T08:00:00Z',
        createdAt: '2026-10-12T08:00:00Z',
        updatedAt: '2026-10-12T08:00:00Z',
      },
    ];

    const result = calculateWeightCoordinates(unorderedLogs, 350, 200, 75);
    expect(result.points.length).toBe(3);
    expect(result.startWeight).toBe(85.0);
    expect(result.latestWeight).toBe(80.2);
    expect(result.deltaWeight).toBe(-4.8);

    // Points should be monotonically increasing in x
    expect(result.points[0].x).toBeLessThan(result.points[1].x);
    expect(result.points[1].x).toBeLessThan(result.points[2].x);

    // Check paths
    expect(result.linePath.startsWith('M')).toBe(true);
    expect(result.linePath).toContain('L');
    expect(result.linePath).not.toContain('NaN');
    expect(result.areaPath.endsWith('Z')).toBe(true);
    expect(result.areaPath).not.toContain('NaN');
  });

  it('handles identical weight values across multiple logs without division by zero', () => {
    const identicalLogs: WeightLog[] = [
      {
        id: 'w1',
        weightKg: 78.0,
        loggedAt: '2026-10-01T08:00:00Z',
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
      {
        id: 'w2',
        weightKg: 78.0,
        loggedAt: '2026-10-10T08:00:00Z',
        createdAt: '2026-10-10T08:00:00Z',
        updatedAt: '2026-10-10T08:00:00Z',
      },
    ];

    const result = calculateWeightCoordinates(identicalLogs, 320, 180);
    expect(result.points.length).toBe(2);
    expect(Number.isFinite(result.points[0].y)).toBe(true);
    expect(Number.isFinite(result.points[1].y)).toBe(true);
    expect(result.deltaWeight).toBe(0);
    expect(result.linePath).not.toContain('NaN');
  });

  it('buildWeightLinePath and buildWeightAreaPath handle single and multiple points', () => {
    expect(buildWeightLinePath([])).toBe('');
    expect(buildWeightAreaPath([], 100)).toBe('');

    const single = [{ x: 50, y: 50 }];
    expect(buildWeightLinePath(single)).toBe('M 50 50');
    expect(buildWeightAreaPath(single, 100)).toBe('');

    const multi = [
      { x: 10, y: 20 },
      { x: 40, y: 30 },
      { x: 80, y: 25 },
    ];
    expect(buildWeightLinePath(multi)).toBe('M 10.00 20.00 L 40.00 30.00 L 80.00 25.00');
    expect(buildWeightAreaPath(multi, 100)).toBe(
      'M 10.00 20.00 L 40.00 30.00 L 80.00 25.00 L 80.00 100.00 L 10.00 100.00 Z'
    );
  });
});
