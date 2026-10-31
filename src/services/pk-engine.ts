import { Injection } from '../types';

export interface CurvePoint {
  timestamp: number;
  dateStr: string;
  levelMg: number;
}

export function calculateEliminationRate(halfLifeHours: number): number {
  if (halfLifeHours <= 0) return 0;
  return Math.LN2 / halfLifeHours;
}

export function calculateRemainingDose(
  doseMg: number,
  halfLifeHours: number,
  elapsedHours: number
): number {
  if (elapsedHours < 0 || doseMg <= 0 || halfLifeHours <= 0) return 0;
  const k = calculateEliminationRate(halfLifeHours);
  return doseMg * Math.exp(-k * elapsedHours);
}

export function calculateCurrentBloodLevel(
  injections: Injection[],
  halfLifeHours: number,
  targetTimestamp: number = Date.now()
): number {
  if (!injections.length || halfLifeHours <= 0) return 0;

  let totalActive = 0;
  for (const inj of injections) {
    if (inj.deletedAt) continue;
    const injTime = new Date(inj.injectedAt).getTime();
    if (injTime <= targetTimestamp) {
      const elapsedHours = (targetTimestamp - injTime) / (1000 * 3600);
      totalActive += calculateRemainingDose(inj.doseMg, halfLifeHours, elapsedHours);
    }
  }

  return Number(totalActive.toFixed(4));
}

export function generateConcentrationCurve(
  injections: Injection[],
  halfLifeHours: number,
  startDaysAgo: number = 14,
  futureDays: number = 7
): CurvePoint[] {
  const points: CurvePoint[] = [];
  const now = Date.now();
  const startTime = now - startDaysAgo * 24 * 3600 * 1000;
  const endTime = now + futureDays * 24 * 3600 * 1000;
  const stepMs = 6 * 3600 * 1000; // 6-hour interval

  for (let t = startTime; t <= endTime; t += stepMs) {
    const level = calculateCurrentBloodLevel(injections, halfLifeHours, t);
    const d = new Date(t);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
    points.push({
      timestamp: t,
      dateStr,
      levelMg: Number(level.toFixed(3)),
    });
  }

  return points;
}
