# GLP-1 / GIP Takip ve Yönetim Uygulaması - Mimari ve Tasarım Spesifikasyonu

**Tarih:** 2026-10-31  
**Durum:** Onaylandı / Tasarım Aşamasından Uygulama Planına Geçiş  
**Platform:** iOS (Expo SDK 58, React Native, TypeScript, Expo Router)  
**Veri Modeli:** Yerel SQLite (Gelecekteki PostgreSQL/Supabase senkronizasyonuna tam uyumlu)

---

## 1. Amaç ve Vizyon

Bu uygulama; GLP-1, GIP ve Glukagon reseptör agonistlerini (Semaglutid/Ozempic/Wegovy, Tirzepatid/Mounjaro/Zepbound, Retatrutid vb.) kullanan bireylerin tedavi süreçlerini güvenli, bilinçli ve veri odaklı yönetmelerini sağlar.

Kullanıcıların temel ihtiyaçları:
1. Bir sonraki enjeksiyonun ne zaman ve hangi anatomik bölgeye yapılması gerektiğini bilmek (rotasyon takibi).
2. Kandaki tahmini kümülatif ilaç seviyesini (yarı ömür eğrisi ve steady-state) izleyerek iştah ve yan etki dalgalanmalarını anlamlandırmak.
3. Kilo değişim temposunu ve kas kaybını önleyici kritik protein/su hedeflerini izlemek.
4. Doktor muayenelerinde sunulabilecek net bir tedavi raporuna sahip olmak.

---

## 2. Farmakokinetik (PK) Matematik Motoru

### 2.1 Desteklenen İlaçlar ve Eliminasyon Parametreleri

| İlaç Etken Maddesi | Ticari İsimler | Ortalama Yarı Ömür ($t_{1/2}$) | Eliminasyon Sabiti ($k = \frac{\ln 2}{t_{1/2}}$) |
|---|---|---|---|
| **Semaglutid** | Ozempic, Wegovy | 168 saat (7 gün) | $\approx 0.004126 \text{ saat}^{-1}$ |
| **Tirzepatid** | Mounjaro, Zepbound | 120 saat (5 gün) | $\approx 0.005776 \text{ saat}^{-1}$ |
| **Retatrutid** | Retatrutide | 144 saat (6 gün) | $\approx 0.004813 \text{ saat}^{-1}$ |
| **Özel İlaç** | Kullanıcı Tanımlı | Kullanıcı Girişi (saat) | $\frac{\ln 2}{t_{1/2}}$ |

### 2.2 Konsantrasyon ve Birikim Formülasyonu
Geçmişte $n$ adet enjeksiyon yapılmış olsun. Her $i$ enjeksiyonu için:
- Dozaj: $D_i$ (mg)
- Enjeksiyon Zamanı: $t_i$ (saat cinsinden zaman damgası)

Herhangi bir $t \ge t_i$ anında, o enjeksiyondan vücutta kalan aktif miktar:
$$A_i(t) = D_i \cdot e^{-k \cdot (t - t_i)}$$

Vücuttaki anlık toplam aktif ilaç miktarı (Kümülatif Seviye):
$$A_{toplam}(t) = \sum_{i, \, t_i \le t} D_i \cdot e^{-k \cdot (t - t_i)}$$

Gelecek projeksiyonunda planlanan dozlar da formüle eklenerek 4 haftalık ileriye dönük simülasyon eğrisi çizilir.

---

## 3. SQLite Veritabanı Şeması

Tüm tablolarda UUID birincil anahtar, ISO-8601 UTC zaman damgaları ve yumuşak silme (`deleted_at`) uygulanır. Bu yapı, gelecekte PostgreSQL / Supabase ile iki yönlü senkronizasyon kurulduğunda şema dönüşümü gerektirmez.

```sql
-- İlaç Tanımları
CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'semaglutide' | 'tirzepatide' | 'retatrutide' | 'custom'
  half_life_hours REAL NOT NULL,
  created_at TEXT NOT NULL
);

-- Enjeksiyon Kayıtları
CREATE TABLE IF NOT EXISTS injections (
  id TEXT PRIMARY KEY NOT NULL,
  medication_id TEXT NOT NULL,
  dose_mg REAL NOT NULL,
  injected_at TEXT NOT NULL,
  site TEXT NOT NULL, -- 'abdomen_left' | 'abdomen_right' | 'thigh_left' | 'thigh_right' | 'arm_left' | 'arm_right'
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (medication_id) REFERENCES medications(id)
);

-- Kilo Kayıtları
CREATE TABLE IF NOT EXISTS weight_logs (
  id TEXT PRIMARY KEY NOT NULL,
  weight_kg REAL NOT NULL,
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Yan Etki Kayıtları
CREATE TABLE IF NOT EXISTS symptom_logs (
  id TEXT PRIMARY KEY NOT NULL,
  symptom_type TEXT NOT NULL, -- 'nausea' | 'fatigue' | 'headache' | 'acid_reflux' | 'constipation' | 'other'
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  notes TEXT,
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Günlük Beslenme ve Hidrasyon Kayıtları
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id TEXT PRIMARY KEY NOT NULL,
  protein_g REAL NOT NULL DEFAULT 0,
  water_ml REAL NOT NULL DEFAULT 0,
  date TEXT NOT NULL UNIQUE, -- 'YYYY-MM-DD'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Kullanıcı Ayarları ve Tedavi Hedefleri
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY NOT NULL,
  active_medication_id TEXT,
  current_dose_mg REAL,
  preferred_injection_day INTEGER, -- 0: Pazar, 1: Pazartesi ...
  target_weight_kg REAL,
  daily_protein_target_g REAL NOT NULL DEFAULT 100,
  daily_water_target_ml REAL NOT NULL DEFAULT 2500,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (active_medication_id) REFERENCES medications(id)
);
```

---

## 4. Kullanıcı Deneyimi ve Ekran Mimarisi

Dizin yapısı: Expo Router dosya tabanlı navigasyon (`src/app/`).

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx           # 4 sekmeli iOS alt gezinme çubuğu
│   │   ├── index.tsx             # Bugün / Özet (Dashboard)
│   │   ├── medication.tsx        # Dozlar & Farmakokinetik Projeksiyon
│   │   ├── analytics.tsx         # Kilo Analizi & Yan Etki Korelasyonu
│   │   └── settings.tsx          # Protokol Ayarları & Veri İhracı
│   ├── modal-log-injection.tsx   # Enjeksiyon Hızlı Kayıt Modalı
│   ├── modal-log-weight.tsx      # Kilo Hızlı Kayıt Modalı
│   └── modal-log-symptom.tsx     # Yan Etki Hızlı Kayıt Modalı
├── components/
│   ├── pk-chart.tsx              # SVG bazlı ilaç seviyesi ve projeksiyon grafiği
│   ├── injection-body-map.tsx    # Anatomik enjeksiyon rotasyon haritası
│   ├── weight-chart.tsx          # SVG bazlı kilo ilerleme ve hedef çizgisi
│   └── quick-log-bar.tsx         # Tek dokunuşla loglama buton grubu
├── services/
│   ├── db.ts                     # expo-sqlite veritabanı başlatma ve tablolar
│   ├── pk-engine.ts              # Farmakokinetik hesaplama ve simülasyon fonksiyonları
│   └── rotation-engine.ts        # Enjeksiyon bölgesi rotasyon algoritması
└── types/
    └── index.ts                  # TypeScript veri modelleri ve enumlar
```

---

## 5. Doğrulama ve Test Standartları

1. **Birim Testleri (`jest`):**
   - `pk-engine.test.ts`: Eliminasyon ve kümülatif seviye hesaplama doğruluğu.
   - `rotation-engine.test.ts`: Bölge rotasyonunda aynı yere art arda iğne yapılmasını engelleyen algoritma doğrulaması.
2. **Tip ve Kod Hijyeni:**
   - `npx tsc --noEmit` sıfır hata.
   - `npx eslint .` sıfır hata.
3. **Cihaz Doğrulaması:**
   - Expo Go üzerinde iPhone 15/16 ve Web emülasyonunda canlı çalışma kontrolü.
