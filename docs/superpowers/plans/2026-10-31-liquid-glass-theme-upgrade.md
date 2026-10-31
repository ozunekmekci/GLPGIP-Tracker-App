# Liquid Glass & Dinamik Tema Yükseltmesi Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uygulamayı Apple iOS 18 Liquid Glass tasarım diline geçirmek, Ayarlar sekmesine anlık Açık/Koyu tema seçicisi eklemek ve mantık/UX aksaklıklarını gidermek.

**Architecture:** `ThemeContext` ile tek kaynaktan reaktif tema dağıtımı (Sistem / Açık / Koyu), `expo-blur` destekli `GlassCard` ve yüzen Liquid Glass TabBar mimarisi, SQLite tabanlı tema tercihi kalıcılığı.

**Tech Stack:** React Native, Expo SDK 58, `expo-blur`, `react-native-svg`, TypeScript, SQLite.

---

### Task 1: Tema Mimarisi, SQLite Şeması ve `ThemeContext`

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/services/db.ts`
- Create: `src/context/theme-context.tsx`
- Create: `src/context/theme-context.test.ts`
- Modify: `src/app/_layout.tsx`

- [x] **Step 1: Domain tiplerine `themePreference` ekle**
In `src/types/index.ts`:
```typescript
export type ThemePreference = 'system' | 'light' | 'dark';
// UserSettings içerisine:
// themePreference?: ThemePreference;
```

- [x] **Step 2: SQLite şeması ve `user_settings` fonksiyonlarını güncelle**
In `src/services/db.ts`:
Add `theme_preference` column to `user_settings` table and map to `themePreference`.

- [x] **Step 3: `ThemeContext` ve renk tokenlarını yaz**
In `src/context/theme-context.tsx`:
Implement `ThemeProvider`, `useAppTheme()` hook with semantic Apple colors (`bg`, `surface`, `cardBg`, `cardBorder`, `textPrimary`, `textSecondary`, `accent`, `tint`, `isDark`, `setThemePreference`).

- [x] **Step 4: `src/app/_layout.tsx` dosyasını `ThemeProvider` ile sar**

- [x] **Step 5: Testleri çalıştır ve tip kontrolü yap**
Run: `npm test && npx tsc --noEmit && npx eslint .`
Expected: PASS

- [x] **Step 6: Commit**
```bash
git add src/types/index.ts src/services/db.ts src/context/ src/app/_layout.tsx
git commit -m "feat: implement dynamic theme context and sqlite persistence"
```

---

### Task 2: Reusable `GlassCard` Bileşeni ve Liquid Glass Stilleri

**Files:**
- Create: `src/components/glass-card.tsx`
- Create: `src/components/glass-card.test.ts`

- [x] **Step 1: `GlassCard` bileşenini `expo-blur` ve web fallback ile geliştir**
- [x] **Step 2: Unit testlerini yaz**
- [x] **Step 3: Tip ve lint kontrollerini çalıştır**
Run: `npm test && npx tsc --noEmit && npx eslint .`
Expected: PASS
- [x] **Step 4: Commit**
```bash
git add src/components/glass-card.tsx src/components/glass-card.test.ts
git commit -m "feat: add reusable Liquid Glass card component with blur effect"
```

---

### Task 3: Yüzen Liquid Glass TabBar ve Navigasyon Düzenlemesi

**Files:**
- Modify: `src/app/(tabs)/_layout.tsx`

- [x] **Step 1: TabBar'ı yarı saydam yüzen BlurView çubuğuna dönüştür**
`tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 }`
- [x] **Step 2: Tüm sekmelerin alt dolgusunu (paddingBottom: 100) ayarla**
- [x] **Step 3: Tip ve lint kontrollerini çalıştır**
Run: `npm test && npx tsc --noEmit && npx eslint .`
Expected: PASS
- [ ] **Step 4: Commit**
```bash
git add src/app/(tabs)/_layout.tsx
git commit -m "feat: implement floating liquid glass tab bar"
```

---

### Task 4: Mantık & UX İyileştirmeleri (Gecikmiş İğne, Boş Durum, Hedef Kutlaması)

**Files:**
- Modify: `src/services/analytics-helpers.ts`
- Modify: `src/services/analytics-helpers.test.ts`
- Modify: `src/app/(tabs)/index.tsx`

- [ ] **Step 1: `calculateNextInjectionInfo` mantığını güncelle** (gecikmiş iğne tespiti, ilk iğne yönlendirmesi).
- [ ] **Step 2: Unit testleri güncelle ve çalıştır** (`npm test src/services/analytics-helpers.test.ts`).
- [ ] **Step 3: `(tabs)/index.tsx` ekranını Liquid Glass kartları ve hedef tamamlama rozetleriyle güncelle**.
- [ ] **Step 4: Tip ve lint kontrollerini çalıştır**
Run: `npm test && npx tsc --noEmit && npx eslint .`
Expected: PASS
- [ ] **Step 5: Commit**
```bash
git add src/services/analytics-helpers.* src/app/(tabs)/index.tsx
git commit -m "feat: enhance dashboard with liquid glass and overdue injection logic"
```

---

### Task 5: Ayarlar Sekmesinde Açık/Koyu Tema Seçicisi ve Tasarım Yenilemesi

**Files:**
- Modify: `src/app/(tabs)/settings.tsx`
- Modify: `src/app/(tabs)/medication.tsx`
- Modify: `src/app/(tabs)/analytics.tsx`

- [ ] **Step 1: `settings.tsx` ekranına iOS segmented tema seçiciyi ekle** (`[Sistem] [Açık] [Koyu]`).
- [ ] **Step 2: `medication.tsx` ve `analytics.tsx` ekranlarını `GlassCard` ve yeni tema tokenlarına bağla**.
- [ ] **Step 3: Tip ve lint kontrollerini çalıştır**
Run: `npm test && npx tsc --noEmit && npx eslint .`
Expected: PASS
- [ ] **Step 4: Commit**
```bash
git add src/app/(tabs)/settings.tsx src/app/(tabs)/medication.tsx src/app/(tabs)/analytics.tsx
git commit -m "feat: add theme selector in settings and upgrade remaining screens to liquid glass"
```

---

### Task 6: Bütünsel Doğrulama ve Canlı Yayına Alma

- [ ] **Step 1: Tüm testleri çalıştır** (`npm test`).
- [ ] **Step 2: Tip kontrolü ve linter** (`npx tsc --noEmit && npx eslint .`).
- [ ] **Step 3: Web derleme kontrolü** (`npx expo export -p web`).
- [ ] **Step 4: GitHub'a pushla** (`git push origin main`).
