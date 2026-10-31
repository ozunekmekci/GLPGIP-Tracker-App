# Shotsy & CYL Liquid Glass Tasarım Yenilemesi Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uygulamayı Shotsy ve Dose AI benzeri gerçek optik kırılmalı Liquid Glass tasarımına geçirmek, CYLTabBarController tarzı 5 sekmeli yüzen kapsül dock navigasyonu oluşturmak ve yeni TAKVİM ekranını eklemek.

**Architecture:** Ekranların arkasında sıvı ışık küreleri oluşturan `AmbientMesh`, üst kenar speküler ışık kırılmalı `GlassCard`, ekran altından kopuk yüzen kapsül dock TabBar, Shotsy tarzı kandaki ilaç konsantrasyonu balonu, görsel vücut enjeksiyon haritası ve takvim alt sistemi.

**Tech Stack:** React Native, Expo SDK 58, `expo-blur`, `react-native-svg`, TypeScript, SQLite.

**Spec:** `docs/superpowers/specs/2026-10-31-liquid-glass-redesign-spec.md`

---

### Task 1: `AmbientMesh` ve Speküler Işık Kırılmalı `GlassCard`

**Files:**
- Create: `src/components/ambient-mesh.tsx`
- Create: `src/components/ambient-mesh.test.ts`
- Modify: `src/components/glass-card.tsx`
- Modify: `src/components/glass-card.test.ts`

- [x] **Step 1: `AmbientMesh` bileşenini yaz** (ekran arkasında yumuşak mor, zümrüt ve camgöbeği SVG radyal gradyan küreleri).
- [x] **Step 2: `GlassCard` bileşenini speküler üst yansıma çizgisi ve iç parlama katmanıyla güncelle**.
- [x] **Step 3: Testleri yaz ve çalıştır** (`npm test`).
- [x] **Step 4: Tip ve lint kontrollerini çalıştır** (`npx tsc --noEmit && npx eslint .`).
- [x] **Step 5: Commit** (`git commit -m "feat: add ambient mesh and specular liquid glass card component"`).

---

### Task 2: CYLTabBarController Tarzı Yüzen Kapsül Dock (5 Sekmeli)

**Files:**
- Modify: `src/app/(tabs)/_layout.tsx`
- Modify: `src/__tests__/app/tab-layout.test.ts`

- [x] **Step 1: TabBar'ı ekran tabanından 24pt yukarıda yüzen yuvarlatılmış kapsül dock haline getir** (`borderRadius: 34`, `bottom: 24`, `left: 16`, `right: 16`, `height: 68`, derin yumuşak gölge ve üst ışık yansıması).
- [x] **Step 2: 5 Sekmeyi yapılandır**:
  1. `index` -> `ÖZET`
  2. `medication` -> `DOZLAR`
  3. `analytics` -> `SONUÇLAR`
  4. `calendar` -> `TAKVİM`
  5. `settings` -> `AYARLAR`
- [x] **Step 3: Aktif sekme için sıvı cam hap göstergesi ve SVG ikonları ekle**.
- [x] **Step 4: `tab-layout.test.ts` testlerini güncelle ve çalıştır**.
- [x] **Step 5: Commit** (`git commit -m "feat: implement CYL floating capsule tab bar with 5 tabs"`).

---

### Task 3: Yeni `TAKVİM` Ekranı ve Takvim Mantığı

**Files:**
- Create: `src/services/calendar-helpers.ts`
- Create: `src/services/calendar-helpers.test.ts`
- Create: `src/app/(tabs)/calendar.tsx`

- [x] **Step 1: Takvim yardımcı fonksiyonlarını ve birim testlerini yaz** (aylık günler ızgarası, enjeksiyon günü eşleştirmeleri, sonraki doz projeksiyonu).
- [x] **Step 2: `calendar.tsx` ekranını geliştir** (`AmbientMesh`, aylık takvim, gün detay kartı, aktif ilaç seviyesi projeksiyonu, hızlı doz ekleme).
- [x] **Step 3: Test ve tip kontrollerini çalıştır**.
- [x] **Step 4: Commit** (`git commit -m "feat: implement calendar tab with injection scheduling and projections"`).

---

### Task 4: Shotsy & Dose AI Esintili ÖZET (Dashboard) Yenilemesi

**Files:**
- Modify: `src/app/(tabs)/index.tsx`

- [x] **Step 1: `AmbientMesh` entegrasyonu sağla**.
- [x] **Step 2: Shotsy tarzı Hero Sıvı Cam Kandaki İlaç Konsantrasyon Göstergesini ekle** (anlık kandaki aktif seviye, pik/yarılanma evresi rozeti, haftalık döngü özeti).
- [x] **Step 3: Sıradaki Enjeksiyon kartını görsel vücut bölgesi rozetiyle zenginleştir**.
- [x] **Step 4: Beslenme ve hidrasyon kartını sıvı cam progress çubuklarıyla güncelle**.
- [x] **Step 5: Commit** (`git commit -m "feat: redesign dashboard with shotsy-style liquid glass concentration meter"`).

---

### Task 5: DOZLAR (`medication.tsx`) & SONUÇLAR (`analytics.tsx`) Yenilemesi

**Files:**
- Modify: `src/app/(tabs)/medication.tsx`
- Modify: `src/app/(tabs)/analytics.tsx`

- [x] **Step 1: `medication.tsx` ekranına `AmbientMesh` ve görsel vücut enjeksiyon haritası ekle** (Abdomen, Bacak, Kol bölgeleri görsel seçim gridi).
- [x] **Step 2: Titrasyon aşamaları rozetini ekle** (0.25 -> 0.5 -> 1.0 -> 1.7 -> 2.4 mg).
- [x] **Step 3: `analytics.tsx` ekranına `AmbientMesh`, sıvı cam kilo hedef projeksiyonu ve semptom şiddet baloncukları ekle**.
- [ ] **Step 4: Commit** (`git commit -m "feat: enhance medication and analytics screens with anatomical body map and liquid glass"`).

---

### Task 6: AYARLAR (`settings.tsx`) Ekranına Ambiyans ve Sıvı Cam Uyarlaması

**Files:**
- Modify: `src/app/(tabs)/settings.tsx`

- [ ] **Step 1: `AmbientMesh` entegre et**.
- [ ] **Step 2: Segmented tema seçiciyi ve form girişlerini speküler sıvı cam ile cilala**.
- [ ] **Step 3: Commit** (`git commit -m "feat: polish settings screen with ambient mesh and liquid glass"`).

---

### Task 7: Bütünsel Doğrulama ve Canlı Yayına Alma

- [ ] **Step 1: Tüm birim testlerini çalıştır** (`npm test`).
- [ ] **Step 2: Tip kontrolü ve linter** (`npx tsc --noEmit && npx eslint .`).
- [ ] **Step 3: Web derleme doğrulaması** (`npx expo export -p web`).
- [ ] **Step 4: GitHub'a pushla** (`git push origin main`).
