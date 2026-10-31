# GLP-1 / GIP Tracker Uygulaması Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GLP-1 ve GIP kullanıcıları için yerel SQLite tabanlı doz, farmakokinetik kanda birikim projeksiyonu, kilo ve semptom takip uygulamasını geliştirmek.

**Architecture:** Katmanlı ve modüler mimari. Veri katmanında `expo-sqlite` (UUID ve soft-delete ile gelecekteki bulut uyumu), iş mantığı katmanında izole matematiksel farmakokinetik motoru (`pk-engine`) ve rotasyon motoru (`rotation-engine`), sunum katmanında Expo Router NativeTabs ve hafif SVG grafikleri.

**Tech Stack:** React Native, Expo SDK 58, Expo Router, TypeScript, `expo-sqlite`, `react-native-svg`, Jest.

**Spec:** `docs/superpowers/specs/2026-10-31-glp-gip-tracker-design.md`

## Global Constraints

- Tüm dosyalarda TypeScript katı tip tanımları (`strict: true`), sıfır `any` kullanımı.
- Tüm veritabanı kayıtlarında UUID birincil anahtar, ISO-8601 UTC tarih dizgileri ve `deleted_at` alanı.
- `antislop` kuralları: Gradyan metinler yok, gereksiz kart yığınları yok, yüksek kontrast (≥ 4.5:1), sayısal değerlerde `fontVariant: ['tabular-nums']`.
- Paket yüklemelerinde `npm install` yerine daima `npx expo install <paket>` kullanımı.
- Her görev TDD (Test-Driven Development) adımlarını ve commit kuralını takip eder.

---

### Task 1: Bağımlılıkların Kurulumu, Jest Altyapısı ve Domain Tipleri

**Files:**
- Modify: `package.json`
- Create: `src/types/index.ts`
- Create: `src/types/index.test.ts`

**Interfaces:**
- Produces: `MedicationType`, `Medication`, `InjectionSite`, `Injection`, `WeightLog`, `SymptomType`, `SymptomLog`, `NutritionLog`, `UserSettings`.

- [ ] **Step 1: Bağımlılıkları yükle**
Run: `npx expo install expo-sqlite react-native-svg`
Run: `npm install -D jest @types/jest ts-jest`

- [ ] **Step 2: Tip doğrulama testini yaz (Failing Test)**
Write `src/types/index.test.ts`:
```typescript
import { MedicationType, InjectionSite } from './index';

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
});
```

- [ ] **Step 3: Testi çalıştır ve başarısız olduğunu gör**
Run: `npx jest src/types/index.test.ts`
Expected: FAIL (Cannot find module './index')

- [ ] **Step 4: Minimal tip tanımlarını oluştur**
Write `src/types/index.ts`:
```typescript
export type MedicationType = 'semaglutide' | 'tirzepatide' | 'retatrutide' | 'custom';

export interface Medication {
  id: string;
  name: string;
  type: MedicationType;
  halfLifeHours: number;
  createdAt: string;
}

export type InjectionSite =
  | 'abdomen_left'
  | 'abdomen_right'
  | 'thigh_left'
  | 'thigh_right'
  | 'arm_left'
  | 'arm_right';

export interface Injection {
  id: string;
  medicationId: string;
  doseMg: number;
  injectedAt: string;
  site: InjectionSite;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface WeightLog {
  id: string;
  weightKg: number;
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type SymptomType =
  | 'nausea'
  | 'fatigue'
  | 'headache'
  | 'acid_reflux'
  | 'constipation'
  | 'other';

export interface SymptomLog {
  id: string;
  symptomType: SymptomType;
  severity: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  loggedAt: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface NutritionLog {
  id: string;
  proteinG: number;
  waterMl: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  activeMedicationId?: string;
  currentDoseMg?: number;
  preferredInjectionDay?: number;
  targetWeightKg?: number;
  dailyProteinTargetG: number;
  dailyWaterTargetMl: number;
  updatedAt: string;
}
```

- [ ] **Step 5: Testi çalıştır ve başarılı olduğunu gör**
Run: `npx jest src/types/index.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add package.json package-lock.json src/types/
git commit -m "feat: add domain models and install sqlite and svg dependencies"
```

---

### Task 2: Farmakokinetik Matematik Motoru (`pk-engine.ts`)

**Files:**
- Create: `src/services/pk-engine.ts`
- Create: `src/services/pk-engine.test.ts`

**Interfaces:**
- Consumes: `Injection`, `Medication` from `src/types`
- Produces: `calculateEliminationRate(halfLifeHours: number): number`, `calculateRemainingDose(doseMg: number, halfLifeHours: number, elapsedHours: number): number`, `calculateCurrentBloodLevel(injections: Injection[], halfLifeHours: number, targetTimestamp?: number): number`, `generateConcentrationCurve(injections: Injection[], halfLifeHours: number, startDaysAgo: number, futureDays: number): { timestamp: number; dateStr: string; levelMg: number }[]`.

- [ ] **Step 1: Başarısız farmakokinetik testini yaz (Failing Test)**
Write `src/services/pk-engine.test.ts`:
```typescript
import {
  calculateEliminationRate,
  calculateRemainingDose,
  calculateCurrentBloodLevel,
  generateConcentrationCurve,
} from './pk-engine';
import { Injection } from '../types';

describe('Pharmacokinetics Engine', () => {
  it('calculates correct elimination rate k', () => {
    const kSemaglutide = calculateEliminationRate(168);
    expect(kSemaglutide).toBeCloseTo(0.004126, 5);
  });

  it('calculates remaining dose accurately after exactly 1 half-life', () => {
    const remaining = calculateRemainingDose(1.0, 168, 168);
    expect(remaining).toBeCloseTo(0.5, 4);
  });

  it('calculates remaining dose accurately after 2 half-lives', () => {
    const remaining = calculateRemainingDose(1.0, 168, 336);
    expect(remaining).toBeCloseTo(0.25, 4);
  });

  it('calculates cumulative blood level from multiple injections', () => {
    const now = Date.now();
    const injections: Injection[] = [
      {
        id: '1',
        medicationId: 'm1',
        doseMg: 1.0,
        injectedAt: new Date(now - 7 * 24 * 3600 * 1000).toISOString(), // 1 hafta önce
        site: 'abdomen_left',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        medicationId: 'm1',
        doseMg: 1.0,
        injectedAt: new Date(now).toISOString(), // Şimdi
        site: 'thigh_right',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const currentLevel = calculateCurrentBloodLevel(injections, 168, now);
    // 0.5 (önceki) + 1.0 (yeni) = 1.5 mg
    expect(currentLevel).toBeCloseTo(1.5, 2);
  });

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
  });
});
```

- [ ] **Step 2: Testi çalıştır ve başarısız olduğunu gör**
Run: `npx jest src/services/pk-engine.test.ts`
Expected: FAIL (Cannot find module './pk-engine')

- [ ] **Step 3: Farmakokinetik motorunu uygula**
Write `src/services/pk-engine.ts`:
```typescript
import { Injection } from '../types';

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

export interface CurvePoint {
  timestamp: number;
  dateStr: string;
  levelMg: number;
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
  const stepMs = 6 * 3600 * 1000; // 6 saatlik çözünürlük

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
```

- [ ] **Step 4: Testleri çalıştır ve doğrula**
Run: `npx jest src/services/pk-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/pk-engine.ts src/services/pk-engine.test.ts
git commit -m "feat: implement pharmacokinetics blood level calculation engine"
```

---

### Task 3: Enjeksiyon Rotasyon Motoru (`rotation-engine.ts`)

**Files:**
- Create: `src/services/rotation-engine.ts`
- Create: `src/services/rotation-engine.test.ts`

**Interfaces:**
- Consumes: `Injection`, `InjectionSite`
- Produces: `getRecommendedNextSite(recentInjections: Injection[]): InjectionSite`, `getSiteDisplayName(site: InjectionSite): string`.

- [ ] **Step 1: Rotasyon testi yaz (Failing Test)**
Write `src/services/rotation-engine.test.ts`:
```typescript
import { getRecommendedNextSite, getSiteDisplayName } from './rotation-engine';
import { Injection, InjectionSite } from '../types';

describe('Injection Site Rotation Engine', () => {
  it('recommends abdomen_left when no previous injections exist', () => {
    expect(getRecommendedNextSite([])).toBe('abdomen_left');
  });

  it('cycles to a different site from the most recent injection', () => {
    const recent: Injection[] = [
      {
        id: '1',
        medicationId: 'm1',
        doseMg: 0.5,
        injectedAt: new Date().toISOString(),
        site: 'abdomen_left',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const next = getRecommendedNextSite(recent);
    expect(next).not.toBe('abdomen_left');
  });

  it('returns clean human-readable names for sites', () => {
    expect(getSiteDisplayName('abdomen_left')).toBe('Sol Karın');
    expect(getSiteDisplayName('thigh_right')).toBe('Sağ Uyluk');
  });
});
```

- [ ] **Step 2: Testi çalıştır ve başarısız olduğunu gör**
Run: `npx jest src/services/rotation-engine.test.ts`
Expected: FAIL

- [ ] **Step 3: Rotasyon motorunu uygula**
Write `src/services/rotation-engine.ts`:
```typescript
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

export function getSiteDisplayName(site: InjectionSite): string {
  return SITE_DISPLAY_NAMES[site] || site;
}

export function getRecommendedNextSite(recentInjections: Injection[]): InjectionSite {
  const activeInjections = recentInjections.filter((i) => !i.deletedAt);
  if (!activeInjections.length) {
    return 'abdomen_left';
  }

  // En son enjeksiyonu al
  const sorted = [...activeInjections].sort(
    (a, b) => new Date(b.injectedAt).getTime() - new Date(a.injectedAt).getTime()
  );
  const lastSite = sorted[0].site;

  const lastIndex = ROTATION_ORDER.indexOf(lastSite);
  if (lastIndex === -1) {
    return 'abdomen_left';
  }

  const nextIndex = (lastIndex + 1) % ROTATION_ORDER.length;
  return ROTATION_ORDER[nextIndex];
}
```

- [ ] **Step 4: Testi çalıştır ve doğrula**
Run: `npx jest src/services/rotation-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/rotation-engine.ts src/services/rotation-engine.test.ts
git commit -m "feat: implement anatomical injection site rotation engine"
```

---

### Task 4: SQLite Veritabanı ve Repository Katmanı (`db.ts`)

**Files:**
- Create: `src/services/db.ts`

**Interfaces:**
- Produces: `initDatabase(): Promise<SQLiteDatabase>`, `getMedications()`, `addInjection()`, `getInjections()`, `addWeightLog()`, `getWeightLogs()`, `addSymptomLog()`, `getSymptomLogs()`, `getNutritionLog()`, `saveNutritionLog()`, `getUserSettings()`, `updateUserSettings()`.

- [ ] **Step 1: SQLite modülünü ve tablo migrationlarını yaz**
Write `src/services/db.ts` (asenkron SQLite API'si, tablolar, CRUD işlemleri ve varsayılan Ozempic/Mounjaro verileri).

- [ ] **Step 2: Tip kontrolü yap**
Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add src/services/db.ts
git commit -m "feat: implement SQLite database schema and repository layer"
```

---

### Task 5: Vektörel Grafik Bileşenleri (`pk-chart.tsx`, `weight-chart.tsx`)

**Files:**
- Create: `src/components/pk-chart.tsx`
- Create: `src/components/weight-chart.tsx`

**Interfaces:**
- Consumes: `generateConcentrationCurve` from `pk-engine`, `WeightLog`
- Produces: `PKChart({ injections, halfLifeHours })`, `WeightChart({ weightLogs, targetWeightKg })`.

- [ ] **Step 1: `PKChart` bileşenini yaz** (`react-native-svg` ile kavisli çizgi ve anlık dikey imleç).
- [ ] **Step 2: `WeightChart` bileşenini yaz** (hedef yatay kesikli çizgi, veri noktaları).
- [ ] **Step 3: Tip ve lint kontrollerini çalıştır**
Run: `npx tsc --noEmit && npx eslint .`
Expected: PASS
- [ ] **Step 4: Commit**
```bash
git add src/components/pk-chart.tsx src/components/weight-chart.tsx
git commit -m "feat: implement SVG pharmacokinetic curve and weight trend charts"
```

---

### Task 6: Hızlı Kayıt Modalları

**Files:**
- Create: `src/app/modal-log-injection.tsx`
- Create: `src/app/modal-log-weight.tsx`
- Create: `src/app/modal-log-symptom.tsx`

**Interfaces:**
- Consumes: `addInjection`, `addWeightLog`, `addSymptomLog` from `db.ts`, `ROTATION_ORDER` from `rotation-engine.ts`.

- [ ] **Step 1: Enjeksiyon kayıt modalını oluştur** (Doz seçici, tarih/saat, görsel bölge seçici, not alanı).
- [ ] **Step 2: Kilo kayıt modalını oluştur** (Sayısal klavye, tarih, hızlı kaydet).
- [ ] **Step 3: Yan etki kayıt modalını oluştur** (Semptom listesi, 1-5 şiddet butonları).
- [ ] **Step 4: Tip ve lint kontrollerini çalıştır**
Run: `npx tsc --noEmit && npx eslint .`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add src/app/modal-log-*.tsx
git commit -m "feat: add quick log modals for injection, weight, and symptoms"
```

---

### Task 7: 4 Temel Sekme Ekranı (`(tabs)/_layout.tsx`, `index.tsx`, `medication.tsx`, `analytics.tsx`, `settings.tsx`)

**Files:**
- Create: `src/app/(tabs)/_layout.tsx`
- Create: `src/app/(tabs)/index.tsx`
- Create: `src/app/(tabs)/medication.tsx`
- Create: `src/app/(tabs)/analytics.tsx`
- Create: `src/app/(tabs)/settings.tsx`
- Modify: `src/app/_layout.tsx` (Root Stack düzenlemesi)

- [ ] **Step 1: `_layout.tsx` içinde TabBar ve Stack yapılandırmasını kur**
- [ ] **Step 2: `index.tsx` (Bugün / Dashboard) ekranını hazırla** (Sıradaki iğne, aktif ilaç seviyesi, protein/su barı, hızlı butonlar).
- [ ] **Step 3: `medication.tsx` ekranını hazırla** (PK grafiği, rotasyon haritası, geçmiş iğneler listesi).
- [ ] **Step 4: `analytics.tsx` ekranını hazırla** (Kilo trendi, kayıp hızı, yan etki korelasyonu).
- [ ] **Step 5: `settings.tsx` ekranını hazırla** (İlaç seçimi, hedefler, JSON/CSV dışa aktarım).
- [ ] **Step 6: Tip ve lint kontrollerini çalıştır**
Run: `npx tsc --noEmit && npx eslint .`
Expected: PASS
- [ ] **Step 7: Commit**
```bash
git add src/app/
git commit -m "feat: implement 4 main tabs and root navigation structure"
```

---

### Task 8: Bütünsel Doğrulama, Canlı Test ve Push

**Files:**
- Test all components and flows

- [ ] **Step 1: Birim testlerini tam kapsamlı çalıştır**
Run: `npx jest --coverage`
Expected: Tüm testler PASS

- [ ] **Step 2: Tip kontrolü ve Lint çalıştır**
Run: `npx tsc --noEmit && npx eslint .`
Expected: Sıfır hata

- [ ] **Step 3: Web derleme testini çalıştır**
Run: `npx expo export -p web`
Expected: Temiz çıktı

- [ ] **Step 4: GitHub'a pushla**
Run: `git push origin main`
Expected: Başarılı push
