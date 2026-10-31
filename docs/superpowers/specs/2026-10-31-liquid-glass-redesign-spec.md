# Liquid Glass & Shotsy/CYL Tasarım Yenilemesi Spesifikasyonu

**Tarih:** 2026-10-31  
**Hedef:** Uygulamayı Shotsy ve Dose AI benzeri gerçek optik kırılmalı Liquid Glass tasarımına geçirmek, CYLTabBarController tarzı 5 sekmeli yüzen kapsül dock navigasyonu eklemek ve yeni TAKVİM ekranını hayata geçirmek.

---

## 1. Mimari Prensipler

### 1.1. Ambiyans Sıvı Mesh (Atmospheric Background Lighting)
Gerçek cam (frosted glass), arkasındaki ışığı kırarak kendini belli eder. Düz tek renkli arka planda `BlurView` opak düz panel gibi algılanır.
- `AmbientMesh` bileşeni (`src/components/ambient-mesh.tsx`):
  - Ekranların en arkasında sabit (`position: 'absolute', pointerEvents: 'none'`) SVG radyal ve doğrusal gradyan ışık küreleri oluşturur.
  - Açık tema: Yumuşak gök mavisi (`#38bdf8`), lavanta (`#c084fc`) ve nane yeşili (`#4ade80`) sıvı ışık havalesi (%8-12 opasite).
  - Koyu tema: Derin zümrüt, elektrik mavisi (`#007AFF`) ve menekşe moru (%15-25 opasite).
  - Kartlar bu ışık kürelerinin üzerinde kaydıkça camın altındaki renkler dinamik olarak kırılarak gerçek "Liquid Glass" hissi yaratır.

### 1.2. Speküler Işık Kırılmalı `GlassCard`
- Üst kenar speküler yansıma çizgisi: `borderTopWidth: 1.5`, `borderTopColor: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.85)'`.
- Alt kenar yumuşak gölge çizgisi: `borderBottomWidth: 1`, `borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'`.
- Sürekli Apple squircle köşe yarıçapı (`borderRadius: 24`).
- İçsel parlama katmanı (`rgba(255, 255, 255, 0.05)` tepe parlaması).
- `BlurView` yoğunluğu: 70 - 85.

### 1.3. CYLTabBarController Tarzı Yüzen Kapsül Dock
- Ekran tabanından 24pt yukarıda, yanlardan 16pt boşluklu yüzen kapsül:
  `position: 'absolute'`, `bottom: 24`, `left: 16`, `right: 16`, `height: 68`, `borderRadius: 34`.
- Derin sıvı cam gölgesi (`shadowRadius: 18`, `shadowOpacity: 0.25`).
- İstenen 5 sekme:
  1. **ÖZET** (`index.tsx`)
  2. **DOZLAR** (`medication.tsx`)
  3. **SONUÇLAR** (`analytics.tsx`)
  4. **TAKVİM** (`calendar.tsx` - YENİ)
  5. **AYARLAR** (`settings.tsx`)
- Aktif sekme: Sıvı cam vurgulu hap kapsülü, mikro ikon ve etiket.

### 1.4. Yeni `TAKVİM` Ekranı
- Aylık takvim ızgarası + 7 günlük kaydırılabilir haftalık şerit.
- Enjeksiyon günlerinde ilaç türüne özel parlak doz noktası (`#34C759` veya `#007AFF`).
- Sıradaki planlanan enjeksiyon günü için titreşen/vurgulu halka.
- Seçilen güne tıklandığında o günkü kanda kalan tahmini aktif ilaç miktarı ve varsa semptom/yan etki özet kartı.

---

## 2. Ekran ve Bileşen Entegrasyonları

1. `src/components/ambient-mesh.tsx`: Reaktif arka plan ışık küreleri.
2. `src/components/glass-card.tsx`: Speküler kırılma çizgili çok katmanlı sıvı cam.
3. `src/app/(tabs)/_layout.tsx`: 5 sekmeli CYL yüzen dock kapsülü.
4. `src/app/(tabs)/calendar.tsx`: Shotsy esintili takvim ekranı.
5. `src/app/(tabs)/index.tsx`: Özet ekranı (Hero sıvı cam kandaki ilaç balonu, Shotsy tarzı doz sayacı).
6. `src/app/(tabs)/medication.tsx`: Dozlar ekranı (Görsel vücut enjeksiyon haritası ve titrasyon adımları).
7. `src/app/(tabs)/analytics.tsx`: Sonuçlar ekranı (Kilo projeksiyonu ve semptom ilişkisi).
8. `src/app/(tabs)/settings.tsx`: Ayarlar ekranı (iOS segmented tema seçici, hedef ayarları, rapor dışa aktarma).
