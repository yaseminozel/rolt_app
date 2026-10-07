@AGENTS.md

# ROLT — Proje Tanımı

ROLT, motosiklet sürücüleri için bir **rota keşfetme, sürüş kaydetme ve paylaşma** mobil uygulamasıdır.
Temel döngü: **rota bul → sürüşü kaydet → isterse paylaş.** Her ekranda kullanıcı bir sonraki adımı hemen anlayabilmeli; daha az karar, daha hızlı kullanım.

- Platform: iOS + Android, **Expo SDK 57 (son kararlı sürüm)** / React Native 0.86 / React 19.2 / TypeScript (bu repo). Beta SDK kullanılmaz; SDK 58 stable duyurulunca `npm install expo@^58 && npx expo install --fix` ile yükselt (native tabs import yolu `expo-router/native-tabs` olur).
- **Node 24** (`.nvmrc` = 24; SDK 58'e geçişte de gerekli). Komutlardan önce `nvm use` çalıştır. Tasarım panolarındaki "Flutter" ifadesi eski bağlamdır; uygulama Expo ile yazılır.
- Arayüz dili: **Türkçe öncelikli, İngilizce destekli** (i18n, bkz. "Çoklu dil"). Birimler: km, km/sa, m; sayılar dile göre biçimlenir (TR `12,8 km`, EN `12.8 km`).
- Yalnızca portre, mobil öncelikli.
- UX referansları: **Strava** ana referans; **REVER** (keşif + kayıt + paylaşım) ve **Calimoto** (motosiklete özgü keşif/planlama) rakip araştırmasından türetilen kararlar.
- Ürün belgeleri (repoda yok, tasarımda atıf var): `ROLT_IMPLEMENTATION_BRIEF.md`, `ROLT_MVP_SCOPE.md`.

## Tasarım kaynağı (Pencil)

Tek doğruluk kaynağı pencil.dev dosyası: `/Users/noname/.pencil/documents/a8ce9826-8c65-45dd-ba42-64f18ffaaa58/pencil-new.pen` (2026-10-07'den itibaren; eski kopya `5d001c98-…` artık kullanılmaz)

- `.pen` dosyasını **yalnızca Pencil MCP araçlarıyla** oku (`mcp__pencil__execute` içinde `Get`, `TakeScreenshot`); Read/Grep ile açma.
- Ekran frame'leri 393 × 852 (iPhone 15/16 boyutu), yan boşluk 16 px, içerik genişliği 361 px.
- Frame adları `NN.NN Alan / Ekran — Durum` biçiminde numaralı (ör. `02.02 Auth / Şifre — Yeni hesap`). Ekranlar soldaki `Etiket / Akış NN — …` panolarıyla akışlara gruplanır (Akış 01 Splash … Akış 22 Topluluk); her akışın yanında `Not / Tasarım notu` kartları kural ve ölçüm notlarını taşır.
- Kanvas: akış satırları yukarıdan aşağı (Akış 01 y ≈ -29700 … Akış 22 y ≈ -2000), etiket panoları x ≈ -12800.

## MVP kapsamı ve ürün kuralları

**Navigasyon:** Alt tarafta yüzen (floating) 4 sekmeli bar: **Keşfet / Kaydet / Topluluk / Profil** (Discover / Record / Community / Profile; Pencil `c2uK3c`).
- Saved Routes (Kaydettiklerim) → Profil içinde sekme; My Rides (Sürüşler) → Profil içinde.

**Route ≠ Ride (kritik ayrım):**
- **Route** tekrar kullanılabilir bir rotadır; Discover'da listelenir.
- **Ride** tek bir kayıt oturumudur. Public bir Ride kendiliğinden Discover rotası **olmaz**; ayrıca "Rota olarak yayımla" (Publish as Route) gerekir.
- Seçili rota kayıt ekranına iliştirilir; rotasız (serbest sürüş) başlatma her zaman mümkündür.

**Temel akışlar:**
- **A / Rota seçerek sür:** Discover → arama/şehir/öneri → Rota Detayı → "Bu rotayı sür" → (gerekirse giriş) → Ready (rota ilişik) → Başlat → Recording. Detayda tek ana eylem; Kaydet ve Paylaş ikincil. Turn-by-turn navigasyon yok, rota çizgisi takip edilir.
- **B / Serbest sürüş:** Record → (gerekirse giriş + izin/GPS hazırlığı) → Ready → Başlat → Recording. Rota, başlık, motosiklet seçimi ön koşul değildir. Giriş/izin ekranından dönüşte başlatma niyeti korunur.
- **C / Duraklat, bitir, sakla:** Recording ↔ Paused → Bitir → Özet → (başlık/fotoğraf/görünürlük, hepsi opsiyonel, otomatik başlık ör. "Antalya · Pazartesi sürüşü") → "Sürüşü kaydet" → onay → isteğe bağlı Paylaş / Rota olarak yayımla. Bitirme ve silme ayrı eylemlerdir; silme onay ister.
- **D / Kesintiden dön:** Açılışta tamamlanmamış sürüş → Devam et / Bitir / Sil (Sil onaylı).
- **E / Sistem durumu:** Recording/Paused kullanıcı durumudur; GPS yok / Offline / Arka plan ayrı gösterge. GPS yokken nokta kaydediliyormuş izlenimi verilmez.

**Kayıt güveni (P0):** Kayıt yerelde tutulur, bulut senkronu ayrı durumdur. GPS veya internet kaybı sürüşü bitirmez. "Kaydedildi" mesajı yalnızca gerçek kalıcılık sağlandıktan sonra gösterilir. Örnek metin: "Sürüş cihazına kaydediliyor. Bağlantı gelince senkronize edilecek."

**Kayıt ekranı:** Harita, mesafe, süre, ortalama hız ve her zaman görünür "Duraklat". Duraklatılmışta baskın "Devam et", daha az baskın "Sürüşü bitir". Kontroller menüye gizlenmez.

**Kaydetme (bookmark):** Kartta ve detayda aynı yer imi davranışı; tek dokunuş, kısa "Kaydedildi" toast'u + geri alma. Misafir kullanıcı girişe yönlendirilirse işlem girişten sonra tamamlanır.

**MVP dışı:** Turn-by-turn navigasyon, gelişmiş/dairesel rota üretimi, grup sürüşü, sosyal feed.

**Teknik kararlar (2026-09-30):**
- **Harita:** Mapbox (`@rnmapbox/maps`, Maps SDK v11). Tüm haritalar `src/components/map/BaseMap.tsx` üzerinden; token `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (`.env`, git'e girmez; şablon `.env.example`), stil `EXPO_PUBLIC_MAPBOX_STYLE_URL` (yoksa Mapbox Outdoors). Mapbox logo/attribution gizlenmez (lisans şartı).
  - **Expo Go'da Mapbox çalışmaz** → `BaseMap` Expo Go'da tasarımdaki harita görselini gösterir (`mapFallbacks` → `assets/images/maps/*-fallback.jpg`), development/production build'de gerçek haritayı açar.
  - **`@rnmapbox/maps`'i yalnızca `src/components/map/NativeBaseMap.tsx` import eder** (lazy yüklenir). Ekranlar Mapbox katmanlarını `renderLayers={(Mapbox) => …}` ile verir; başka hiçbir dosyada statik import yok (yoksa Expo Go açılışta çöker).
  - ScrollView içindeki küçük harita kartları (Keşfet ana sayfa) etkileşimli harita değil, statik görseldir; dokununca tam ekran haritaya gider.
- **Rota hesaplama:** MVP'de Mapbox Directions (A→B, yola oturan çizgi); motosiklete özel tercihler (virajlı/manzaralı) için sonra Valhalla veya GraphHopper. Kaydedilen GPS izi Mapbox Map Matching ile temizlenebilir.
- **Konum:** `expo-location` + `expo-task-manager`, arka planda konum açık (iOS "Always", Android foreground service). İzin metni tasarımdaki "Konum izni" ekranından türetildi.
- **Backend:** **Self-hosted Supabase** — entegrasyon ileride yapılacak, şimdilik backend kodu yazma; veri katmanını arayüzlerle soyutla ki mock'tan Supabase'e geçiş kolay olsun. (Postgres + **PostGIS**, Auth: Google/Apple/e-posta, Storage: sürüş fotoğrafları). **Realtime kullanılmıyor**: sürüş önce cihazda (SQLite) tutulur, bitince/bağlantı gelince toplu yüklenir; rota/keşif işlemleri normal sorgu. Realtime yalnızca canlı konum paylaşımı (grup sürüşü, Yakındaki Sürücüler) gelirse özellik bazında eklenir.

- **Veri katmanı:** Her alan bir repository arayüzü + mock uygulama (`src/features/<alan>/`), ekranlar yalnızca React Query kancalarını (`queries.ts`) kullanır; Supabase geldiğinde yalnızca repository değişir. Rota modeli: `src/features/routes/types.ts` (Route ≠ Ride).
- **Sheet kuralı:** Modal seçimler (sıralama, şehir/konum, misafir giriş) → native `formSheet` (Expo Router `presentation: 'formSheet'`). Harita üzerindeki kalıcı, sürüklenebilir sheet'ler (rota detayı, haritada keşfet, kayıt kontrolleri) → `@gorhom/bottom-sheet`.
- **Misafir işlemleri:** Hesap gerektiren işlemler `useRequireAccount()(reason, action)` ile; misafire giriş sheet'i açılır, işlem saklanır ve giriş (+ yeni hesapta kayıt ve izinler) bittikten sonra otomatik tamamlanır (`pendingAccountAction.ts`). Sheet kapatılırsa işlem silinir.
- **Geri bildirim:** Uygulama geneli tek toast `useToast()` (`ToastProvider`); kaydetme → "saved" + "Görüntüle", kaldırma → "removed" + "Geri al".

**Açık kararlar (uygulamadan önce kullanıcıya sor):**
- Sürüş görünürlüğü varsayılanı: brief "Public" diyor; öneri "ilk sürüş Private, sonra son seçim hatırlansın". Henüz onaylanmadı.
- Like / Follow ve Story/paylaşım şablonlarının MVP'deki yeri.

## Ekran envanteri (Pencil)

| Alan | Ekranlar |
|---|---|
| 00 Launch (Akış 01) | 00.01 Splash (00.02 "Başlarken · Alt. Grup görseli" onboarding'le değişti, uygulanmaz) |
| 01 Onboarding (Akış 02) | 01.01 Keşfet, 01.02 Sür ve kaydet, 01.03 Paylaş (açık tema) |
| 02 Auth (Akış 03–05) | 02.01 Giriş (boş/dolu/yükleniyor), 02.02 Şifre (mevcut/yeni hesap, yanlış şifre, çok fazla deneme), 02.03 Şifremi unuttum, 02.04 E-posta kontrol, 02.05 Yeni şifre, 02.06 Şifre güncellendi, 02.07 E-posta doğrulama (yeni hesap / süresi dolmuş bağlantı) |
| 03 İzinler (Akış 06) | 03.01 Konum izni, 03.02 Bildirim izni (sheet) |
| 04 Kayıt tamamlama (Akış 07) | 04.01 Profil (boş / müsait / kullanımda), 04.02 Konum (izin verilmiş / şehir ara / izin verilmemiş), 04.03 Motor (boş / seçili), 04.04–04.06 Marka / Model / Yıl sheet'leri, 04.07 Yükleniyor |
| 05 Discover (Akış 08) | 05.01 Ana sayfa (harita odaklı / konum izni yok / çevrimdışı / iskelet), 05.02 Arama (aktif / sonuçlar / sıralama / sonuç yok), 05.03 Önerilen rotalar — Tümü, 05.04 Rota detayı (standart sokak / topografik, uzun içerik) |
| 06–13 (Akış 09–22) | Rotayı sür, Map Explore, Record, Profil, Ayarlar, Motorum, Bildirimler, Topluluk — aşağıdaki satırlar eski numaralandırmayla; o akışlar yeni dosyaya göre güncellenince değiştir |
| 02 Record | Ready (rotalı/serbest, sürüş tipi şeridi alternatifi), Recording, Paused, Recovery, Sürüş modu full ekran, Durdurma onayı, Sürüşü kaydet (form), Sürüş tipi seçimi sheet |
| 03 Profil / Ayarlar | Profil genel (Sürüşler/Performans/Kaydettiklerim sekmeleri), Profili paylaş (QR), Aktivite paylaşımı (karusel şablonlar), Kaydettiklerim (liste/kaydedildi/kaldırıldı/boş), Ayarlar ve alt sayfaları: hesap, sürüş görünürlüğü, başlangıç-bitiş gizleme, engellenenler, konum/fotoğraf izni, bildirimler, dil, ölçü birimleri, yardım/SSS, geri bildirim, gizlilik politikası, kullanım koşulları, çıkış |
| 04 Motorum | Boş durum, Motor ekle (marka → model, bottom sheet), Eklendi, Motoru değiştir |
| 04 Rota öner | Konum seçimi, Rota bilgileri, Önizleme, Gönderiliyor, Başarılı, Hatalı |
| 05 Sürücü eşleşme | Yakındaki sürücüler (harita + "Günün eşleşmesi" sheet) — keşif aşamasında |

Sürüş tipleri (Tone): Şehir İçi, Uzun Yol, Doğa, Viraj, Sportif, Off-road, Sahil.

## Design system

Pencil'de "ROLT UI Library" olarak belgelenmiş Core Components panoları (Light & Dark hedefli). Bileşeni kodlamadan önce ilgili node'u `Get(id)` + `TakeScreenshot([id])` ile oku.

**Core Components panoları** (y ≈ -14193):

| # | Bileşen | Node | Özet spec |
|---|---|---|---|
| 01 | Button | `RC60W` | 44 px yükseklik, 24 px yatay padding (ikon+etiket 32), ikon 20 px + 8 px gap, radius 12, outline 1 px; Contained / Outlined / Text × Enabled / Pressed / Disabled + Destructive; Default / With icon / Icon only. (Pano başlığındaki "padding 30 / ikon 24+4 / outline 1.5" frame'lerle çelişiyor; kod frame değerlerini uygular.) |
| 02 | Input | `HbGNS` | 4 tip (Standard, Multi-line, Currency, Select) × 8 durum (normal + error satırları) |
| 03 | Checkbox | `QXn80` | 20/24 px kontrol, 40/48 px dokunma alanı, 9 durum + indeterminate |
| 04 | Radio Button | `UeboI` | 20/24 px kontrol, 40/48 px dokunma alanı, 9 durum |
| 05 | Badge / Tag | `YFU4m` | Small 24 / Large 32 px (panoda metinli Large 44 çizilmiş; lejant ve kod 32); tonlar: Neutral, Warning, Info, Success, Destructive |
| 06 | Tooltip | `u7cV7` | 4 yön, kısa / çok satır |
| 07 | Filter Chip | `iCyEV` | Dropdown (default/open/applied/disabled/removable) + Toggle |
| 08 | Switch | `NoZZf` | Off/On × Default/Hover/Focus/Disabled |
| 09 | Segmented Control | `Q2D2c` | 2–3 seçenek, 52 px yükseklik, dış radius 12, seçili radius 8, 4 px inset |
| 10 | App Bar | `A5ff7p` | Centered / Leading / Bottom sheet — kodda native Stack header (bkz. Native chrome) |
| 11 | Navigation Bar / Floating | `I3pOq` | Keşfet / Kaydet / Profil — kodda NativeTabs (bkz. Native chrome) |
| — | Route Card | `gBNKs` | Kompakt (dikey, görselli) ve Satır varyantı; opsiyonel badge + kaydet |
| — | Map / Heading Marker | `hKYfR` | Canlı konum + yön; beyaz outline ve gölge korunur, heading ile döndürülür |
| — | Choice Group | `n0gSMq` | İki seçenekten tek seçim; kart yüzeyi + border + radio durumu birlikte |

**Yardımcı bileşenler** (y ≈ -12900 … -12300):

| Bileşen | Node |
|---|---|
| Seçim / Sürüş Tipi (7 ton × seçili/değil) | `N0mch` |
| Badge / Sürüş Tipi | `a2e36` |
| List Item / Ride Type | `dlaPh` |
| Satır / Ayar (Chevron, Değer+Chevron, Değer, Anahtar, Onay, Yok, Radyo) | `MAiVR` |
| Satır / Marka | `B2BQNG` |
| Anahtar (switch, Açık/Kapalı) | `kTcEC` |
| Kontrol / Radyo | `VGCwR` |
| Üst çubuk / Alt sayfa (`Gq75K`) — ekranlarda ayar/Motorum sayfalarının tam ekran üst çubuğu → kodda **native Stack header** (ayrı bileşen yok) | `Gq75K` |
| Dialog | `s5345` |
| Toast messages (Success / Failure) | `s1KRrb` |
| Feedback / Toast (Saved / Removed) | `X3p3d7` |
| Feedback / EmptyState / SavedRoutes | `JaNLr` |
| Status Icon (Error / Success / Warning / Info / Neutral) | `YVp1V` |
| Brand / Google / Official, Brand / Apple / Official | `Q8Xitg`, `ZD4Th` |
| Motosiklet marka logoları (28 px): Honda `e7KsV`, Yamaha `avNYb`, Bajaj `w2Atk`, KTM `tkGyc`, Suzuki `U4Ywf`, Kawasaki `SRC0L`, BMW `qNemJ`, Ducati `camyX`, Triumph `SVXIR`, Harley-Davidson `UQNXV` | — |

**Önemli:** `.pen` dosyasında tanımlı **variable (token) ve reusable component yok**; tüm renkler ham hex. Kodda bu değerleri tek bir tema modülünde (`src/theme/`) token olarak topla, ekranlarda ham hex kullanma.

**Tipografi (gözlenen):**
- UI: **Inter** — 400 (gövde), 500 (etiket), 600 (başlık). Boyutlar: 12, 13, 14, 15, 16, 18, 24, 28, 32.
- Metrikler (mesafe, süre, hız, sayaçlar): **JetBrains Mono 500** — sayısal değerler hizalı görünsün.
- Logo / wordmark "ROLT": **Bakbak One**.

**Renkler (gözlenen, token önerisiyle):**

| Rol | Değer |
|---|---|
| text-primary / primary button / koyu yüzey | `#101318` (ekranlarda `#000000` da yoğun kullanılmış; `#101318`'e normalize et) |
| surface | `#FFFFFF` |
| surface-muted / subtle | `#F3F4F4` / `#F9FAFA` |
| border / border-strong | `#E5E6E8` / `#D2D3D6` |
| text-secondary / text-tertiary | `#6B6E73` / `#9EA0A4` |
| brand (logo) | `#1515FF` |
| accent (canlı sürüş, rota çizgisi, seçili sürüş tipi) | teal `#3BD3B8` (açık `#7BF1DB`, `#B7FBEF`; koyu `#0E9E82`) |
| error | `#DC2626` (stroke) / `#B91C1C` (metin) / `#FEE2E2` (bg) |
| success | `#15803D` / `#DCFCE7` |
| warning | `#B45309` / `#FEF3C7` |
| info | `#1D4ED8` / `#DBEAFE`, `#EFF6FF` |

**Radius:** 4, 8, 12 (buton/kart), 16, 24 (bottom sheet üst köşeleri `[24,24,0,0]`), 9999 (pill/chip).
**İkonlar:** Lucide.
**Genel dil:** Nötr, açık zemin, siyah birincil butonlar, ince border'lar; renk yalnızca durum ve canlı sürüş vurgusunda. Harita ekranların merkezinde; kontroller bottom sheet'lerde.

## Native chrome: iOS 26 Liquid Glass (kesin karar)

Tab bar ve ekran başlıkları **native** bileşenlerle yazılır; sistem iOS 26'da Liquid Glass olarak çizer. Bunları özel JS view, blur veya yarı saydam `View` ile **yeniden çizme**. Pencil'deki görünüm yalnızca içerik (etiket, ikon, sıra, eylemler) referansıdır; stil işletim sisteminden gelir.

- **Tab bar** — Pencil'de `Navigation Bar / Floating — MVP` (`c2uK3c`; Keşfet / Kaydet / Topluluk / Profil) → Expo Router **NativeTabs**. İçerik (sıra, etiket, ikon) tasarımla birebir; ikonlar tasarımdaki Iconoir glifleri (map, play, path-arrow, motorcycle) 24 pt @1x–3x PNG export'u olarak `NativeTabs.Trigger.Icon src` ile (iOS template image). Cam görünüm ve seçili hâl sistemden gelir.
  - SDK 57 import: `import { NativeTabs } from 'expo-router/unstable-native-tabs'` (SDK 58+ ile `expo-router/native-tabs` olur).
  - Yapı: `<NativeTabs.Trigger name="…">` + `NativeTabs.Trigger.Icon` (`sf` iOS SF Symbol, `md` Android Material Symbol) + `NativeTabs.Trigger.Label`.
  - iOS 26'da `backgroundColor` / `blurEffect` / `shadowColor` etkisiz; renkler için `tintColor` / `labelStyle` + `DynamicColorIOS`. Beyaz flaş olmaması için root layout `ThemeProvider` ile sarılır.
  - İsteğe bağlı: `minimizeBehavior="onScrollDown"`, `NativeTabs.BottomAccessory` (ör. devam eden sürüş göstergesi için aday).
  - Sınırlar: tab bar yüksekliği özelleştirilemez/ölçülemez, sekmeler statik olmalı, NativeTabs iç içe olamaz. Scroll davranışı için ScrollView ekranın ilk doğrudan çocuğu olmalı.
  - Android'de aynı API Material bottom navigation üretir (maks. 5 sekme).
- **Ekran başlığı** — Pencil'de `Screen Header` / `App Bar` (ör. node `H0lpWo`, "01.4 Önerilen Rotalar — Tümü": başlık + kapat + yapışkan arama) → her sekmenin içinde **native `Stack`** header'ı.
  - Başlık/eylemler `Stack.Screen` options ile; arama alanı `Stack.SearchBar` (`placement="automatic"`) ile. Header'ı elle çizme.
  - Doküman: https://docs.expo.dev/router/advanced/native-tabs/ — kod yazmadan önce SDK 57 sürüm dokümanını (`docs.expo.dev/versions/v57.0.0/`) kontrol et.

## Tasarım kararları (çelişkilerde senior UI kararı)

Tasarım kendi içinde çeliştiğinde karar sistem tutarlılığı, anlam ve erişilebilirliğe göre verilir ve buraya yazılır.

| Konu | Çelişki | Karar |
|---|---|---|
| Button ölçüleri | Pano başlığı padding 30 / ikon 24+4 / outline 1.5; frame'ler 24 / 20+8 / 1 | Frame değerleri (ekranlarda kullanılan gerçek çizim) |
| Badge Large | Metinli Large 44 çizilmiş; lejant 32 | 32 (lejant, icon-only 32 ve 8'lik grid ile tutarlı) |
| Hata toast'u | Failure toast check-circle ikonu kullanıyor | `xmark-circle` (ikon mesajla çelişmesin; Badge destructive ile aynı dil) |
| Dialog başlığı | Bileşen 16 medium, Çıkış ekranı 17 semibold | 16 semibold (tip skalasında kalır, 14'lük açıklamadan ağırlıkla ayrışır) |
| Destructive contained basılı | Tasarımda basılı durum yok | `dangerText` (#B91C1C) ile koyulaşır; nötr varyantla aynı geri bildirim |
| Sheet başlıkları | 18/20/22 pt başlık, 14/15 pt alt başlık, #9EA0A4 ve #6B6E73 karışık | `SheetHeader`: 18 medium başlık, 14 regular `textSecondary` alt başlık (AA kontrast), 16 gutter, opsiyonel 44 pt kapat |
| `Gq75K` üst çubuk | Sheet bileşeni gibi adlandırılmış ama tam ekran header olarak kullanılıyor | Native Stack header; kodda karşılığı yok |
| ChoiceGroup | Radio etiketin üstüne biniyor, 22 pt ayrı radio | 8 pt boşluk + standart `RadioButton` (tek radio sistemi) |
| TextField yazı boyu | Pano 14, ekranlar 16 | 16 (ekranlar) |
| Rota kartı metrikleri | Genel kural Mono, kartlar Inter | Kartlarda Inter; canlı kayıt/profil metrikleri JetBrains Mono |
| Siyah metin | Ekranlarda `#000000` | `textPrimary` (#101318) |
| Buton etiketi (auth/kayıt) | Ekranlar 12 semibold, pano 14 medium | 14 medium (pano) |
| Alt sabit CTA | Eski kayıt 56 pt, yeni kayıt (04.x) ve auth 44 pt | Kayıt (04.x) ve izin sheet'i tasarım gibi 44 pt; diğer ekranların altına sabitlenen tam genişlik CTA `size="lg"` (48 pt) |
| Kayıt alanları | Ekran 48 pt / 14 padding / 1.5 focus | TextField standardı 44 / 12 / 1 |
| Arama alanı | Ekran 18 pt ikon, 15 pt yazı, `#F6F7F7` | `SearchField`: 20 pt ikon, 16 pt yazı, `surfaceMuted` |
| "e-Posta" etiketi | Etiket "e-Posta", buton "E-posta ile devam et" | "E-posta" (TDK yazımı, butonla tutarlı) |
| Auth alt ekran başlığı | Tasarımda geri butonu yok, e-posta alanı salt okunur | Şeffaf native header, yalnız geri butonu; akış sonu ekranlarında (yeni şifre, güncellendi) geri yok |
| Fotoğraf görselleri | Tasarımda fotoğraflar "stretch" ile oranı bozularak frame'e çekilebiliyor | Fotoğraflarda orijinal dosya (`<pencil klasörü>/images/…`) `cover` ile; frame export'u değil |
| Onboarding illüstrasyonları (01.01–01.03) | Kolaj / harita / yörünge çizimleri onlarca katman, minik metinler | Her sayfanın "Görsel" frame'i (393 × 520) 3x JPEG export (`assets/images/onboarding/`); 01.03'teki dışarıda kalan poster kartı geçici kopyayla birlikte export edildi. Görseldeki örnek Türkçe metinler (rota adları, "Kayıt") i18n istisnasıdır. Kısa ekranda görsel yüksekliği küçülür, `cover` ile kırpılır |
| Onboarding metinleri | Başlık 26/700, açıklama #9EA0A4 | Başlık `typography.onboardingTitle` (Inter 700); açıklama `textSecondary` (AA kontrast). "Zaten hesabın var mı? Giriş yap" satırı 44 pt dokunma alanı, "Giriş yap" `textPrimary` medium (link anlaşılsın) |
| Onboarding ölçümü | Not `xx2W7` 4 olay tanımlıyor | `trackEvent` (`src/features/analytics/track.ts`) üzerinden; sağlayıcı seçilene kadar yalnız geliştirmede log |
| Yeni hesap başlığı | "Hoşgeldin!" | TDK yazımı "Hoş geldin!" |
| Yanlış şifre | Tasarım deneme sayısı göstermiyor | Her yanlış şifrede "Şifre hatalı. Tekrar dene ya da şifreni sıfırla." (3. hatada kilit) |
| Çok fazla deneme (`rjPx3`) | Ayrı kilit ekranı yerine şifre ekranında banner | Ekran içi `AlertBanner` + pasif CTA "MM:SS sonra tekrar dene" (pasif buton standart rengi, tasarımdaki #898989 değil) + "Şifremi sıfırla"; süre dolunca CTA "Devam et"e döner. Banner renkleri `dangerBanner*` token'ları |
| Bağlı hesap ekranı | Yeni Pencil dosyasında karşılığı yok (eski `EV75c`) | Akış gerekli olduğu için korunur: resmi logolu outlined buton; Google ve Apple aynı yerleşim |
| Turuncu uyarı tonu | Amber warning token'larından farklı tonlar | Ayrı `caution*` token'ları (Discover konum izni banner'ı) |
| Misafir giriş sheet'i | "Şimdi değil" 40 pt / 13 semibold gri | Standart metin `Button` (44 pt); başlık 20 semibold; sebep (`reason`) parametresiyle başlık/ikon değişir |
| Lucide → Iconoir | Tasarımda link-2, alert-circle | `Link`, `WarningCircle` |
| İzin sheet'i (03.01 `ylGJA`, 03.02 `KvKqT`) | Tasarımda arka planda rastgele bir auth ekranı | Tek native `formSheet` (`/permissions`, `fitToContents`, köşe 28), içinde konum → bildirim adımı. Yeni hesap (profili bitmemiş hesaba giriş) için bir kez, kayıt akışının ilk ekranının üstünde (`usePermissionPromptSheet`); yani izinler kayıttan önce (03 → 04 sırası, 04.02 izin durumlarına göre). Her iki cevapta ilerler; sheet'i kaydırıp kapatmak iki adım için de "Şimdi değil" sayılır. İllüstrasyonlar frame export'u (361 × 384), kısa ekranda küçülür. Açıklama 16 pt `textSecondary` |
| Bildirim izni metni | "…etkileşimler ve … gelişmelerden" | "…etkileşimlerden ve …" (hâl eki uyumu) |
| Konum izni | Tasarım yalnız "izin ver" diyor | Yalnız ön plan izni; arka plan izni Kayıt akışında istenir |
| Kullanıcı adı önerileri | Tasarımda örnek 3 çip | `.rides`, `_<plaka kodu>`, `<motor modeli>` sırasıyla; kurallara uyan, müsait en fazla 3 öneri. "Bunlardan birini seçebilirsin:" altında yatay kayan 32 pt çipler (dokunma alanı 44). Plaka kodu 04.02 yerinden gelir; profil önce olduğu için ilk geçişte genelde yok |
| Kullanıcı adı hata ikonu | Yalnız "kullanımda" durumunda çizilmiş (üçgen) | Tüm kullanıcı adı hatalarında 20 pt `WarningTriangle` (başarı ikonuyla aynı yer) |
| Keşfet ana sayfa (05.01) | Yeni düzen | Başlık → (çevrimdışı bandı) → arama → harita kartı ya da konum izni kartı → tek bölüm "Önerilen rotalar" (kategori çipleri bölüm başlığının altında, "Tümünü gör" marka mavisi). İkinci şerit kaldırıldı. Çiplerin hepsi 14 pt; son çipteki filtre ikonu çizim kalıntısı sayıldı (ikon yok) |
| Çevrimdışı (05.01 `INwLr`) | "İndirdiğin rotalar" başlığı | NetInfo ile koyu bant + "Tekrar dene" (yeniden yükler) ve harita kartında çevrimdışı katmanı; bölüm başlığı normal kalır, indirme özelliği olmadığı için "İndirdiğin rotalar" uygulanmadı (açık soru). "Tümünü gör" çevrimdışında gizli |
| Yükleniyor (05.01 `CImMS`) | İskelet | Önerilen ve bölge rotaları ilk kez yüklenirken arama/harita/bölüm yerine statik `DiscoverHomeSkeleton` (`skeleton` token) |
| Aramadan çıkış | Tasarımda çıkış yolu yok | Arama kutusunun yanında "Vazgeç"; sorgu ve filtreler temizlenir, sıralama korunur |
| Arama durumlarında kategori çipleri | 05.02 Aktif/Sonuçlar'da gizli, Sonuç yok'ta görünür | Tüm arama durumlarında gizli; aramada filtre sheet'i kullanılır |
| Bölge etiketi | Yeni tasarım tek etiket | Her zaman "Konumun:"; cihaz ya da seçilen bölge → "X, Türkiye"; ikisi de yoksa "Konum belirlenmedi", harita yerine "Konum iznin kapalı" kartı ve bölüm "Türkiye'de popüler rotalar". Konum izni açılışta istenmez, yalnız durumu okunur |
| Filtre sheet'i | 05.02 sonuç başlığında "Filtrele" yok | "Filtrele" korunur (filtrelere tek giriş). Başlıkta "Sıfırla" ve altta "Temizle" aynı işi yapıyordu | Yalnız alttaki "Temizle"; seçimler "N rotayı göster" ile uygulanır. Zorluk tekrar dokununca kalkan çip ("tercih yok" mümkün) |
| "Manzara" / "Manzaralı", "Şehir içi" / "Şehir İçi" | Ekranlara göre farklı | Tek sözlük: `routes:tags.*` ("Manzara", "Şehir İçi") |
| Sonuç yok görseli | Tasarımdaki fotoğraflardan biri Google logolu harita ekran görüntüsü | Kullanılamaz; rota fotoğrafıyla değiştirildi |
| Rota detayı başlık/metrikler | "Geyikbayırı Sürüşü", 12,8 km, 18:42 (sürüş verisi) | Rotanın kendi verisi (ad, 1 ondalıklı mesafe, `formatDuration`) |
| Rota detayı metrikleri | Yeni tasarımda 6 metrik her zaman açık | Mesafe, Süre, Ort. hız / Maks. hız, Viraj, Mola (JetBrains Mono 16). Viraj ve mola sürüş metriği gibi ama tasarım rotada gösteriyor → `Route.curveCount`, `breakCount` eklendi |
| Rota detayı bölümleri | Standart ve uzun içerik sırası farklı | Uzun içerik sırası: Rota durakları (varsa) → Rota görselleri → Rota detayları → Notlar. "Sürüş görselleri" yerine "Rota görselleri" (Route ≠ Ride). Duraklar `Route.stops`; başlangıçta saat yerine yalnız "0 km" (rotanın saati yok). CTA 44 pt |
| Harita üzerindeki yuvarlak buton | "Konumuma git" adlı ama oynat ikonu çizilmiş | Konumuma git (`MapsArrow`); oynat ikonu CTA'ya ait |
| Katman butonu | Katman seçici tasarlanmamış; 05.04 sokak ve topografik iki ayrı kare | Haritada keşfet'te Outdoors ↔ Uydu; rota detayında buton yok (tasarımda yok), harita Outdoors |
| Sürüş detayları satırları | Chevron var ama gidilecek yer yok | Salt okunur, chevron yok |
| Rota görselleri | Galeri tasarlanmamış | 5 sabit kutu, fazlası "+N"; kutular dokunulamaz |
| Harita rota renkleri | Tasarım yalnız sahil/virajlı/manzara renklerini çiziyor | Şehir, Doğa, Off-road için sistem içi tonlar; önizleme kartı etiketi çizgi rengiyle aynı |
| "N km uzakta" | Neyin uzaklığı belirsiz | Cihaz konumundan (izin varsa), yoksa seçili şehrin merkezinden rotanın en yakın noktasına |
| Sürücü profili (01.8) | Tasarımda alt menü görünüyor | Root stack ekranı, alt menüsüz (rota detayından gelindiğinde geri dönüş bozulmasın) |
| Sürücü profili aksiyonları | Tasarımda 40 pt butonlar, gri dolgu | Standart 44 pt `Button`; "Takip ediliyor" hâli outlined + onay ikonu; "…" menüsü native action sheet, engelleme onayı native Alert |
| Sürüş kartı sayaçları | Üçüncü sayı "paylaş" sanılabilir | Tasarımda kaydet sayısı (yer imi); paylaşımda sayı yok |
| Uyum notu | Misafire de görünüyor olabilir | Yalnız giriş yapmış kullanıcıya (misafirin tercihi yok) |
| Rota Öner çıkış diyaloğu (`zMCLP`) | Tasarımda 04.2 üzerinde gösterilmiş | Akış içinde geri gitmek serbest (taslak sağlayıcıda); diyalog yalnız akıştan çıkarken (04.1'den geri) ve giriş varsa açılır (`SuggestionExitGuard`) |
| Rota Öner doğrulama | "Önizlemeye geç" hataları ve gri CTA birlikte | CTA eksik alanda aktif, basınca hatalar gösterilir ve ilk hataya kaydırılır; yalnız fotoğraf yüklenirken / hatalıyken pasif. Ad + en az 1 tür zorunlu, zorluk varsayılan Orta |
| Şematik rota kartı | Tasarımda harita değil çizim | `RoutePreviewMap` SVG ile çizer (Mapbox'sız, her ortamda çalışır) |
| "Yola yapıştır" kapalı | Davranış tanımsız | Düzenlerken düz çizgiler, "Bitti"de yola oturtmak için tek rota hesabı |
| Gönderim arka planda | "Uygulamayı kapatma" ile "Arka planda devam et" çelişiyor | Gönderim ekrandan bağımsız sürer, bitince toast; metin "uygulamayı zorla kapatma" olarak yorumlandı |
| Otomatik yeniden deneme | Bağlantı kütüphanesi yok | Yalnız ağ hatasında, hatalı ekranı açıkken uygulama ön plana dönünce |
| Bu rotada çekilen fotoğraflar | — | Son 60 gün / 200 fotoğraf, rota çizgisine 1 km içinde; hiçbiri ön seçili değil (gizlilik) |
| Auth wordmark konumu | Ekranlara göre farklı | Status bar'ın 52 pt altı ya da native header'ın 8 pt altı; tüm auth adımlarında sabit |
| Auth alt başlıkları | 14/20 ve farklı boşluklar | 14/20, başlık-alt başlık arası 8 |
| Alana ait olmayan hatalar | Tasarımda yok | Alt başlık ile form arasında satır içi failure `Toast` |
| Yasal linkler | Metinden ayırt edilmiyor | `textSecondary` + altı çizili (link olduğu anlaşılsın) |
| Kayıt adımları (04.x) | Eski 5 adım (profil, marka, model, sürüş tarzı, tamamlandı) | 3 adım: Profil → Konum → Motor → 04.07 Yükleniyor → uygulama. Sürüş tarzı ve tamamlandı ekranı kalktı; özel marka/model girişi ("Listede yok mu?") yok |
| Kayıt üst çubuğu | "Üst çubuk / Profil" yalnız geri | Native header, başlıksız; ilk adımda native geri yok (altında ekran yok) |
| Kayıt "Atla" | Tüm adımlarda CTA altında metin butonu | Her adımda: kaydetmeden sonraki adıma; motor adımında motorsuz bitirir |
| Kayıt CTA'sı | Profil boşken tasarım aktif çizmiş, motor boşken pasif | Tutarlılık için geçerli veri olana kadar pasif: profil ad + müsait kullanıcı adı, konum seçili yer, motor marka + model + yıl |
| Kayıt metinleri | Açıklama ve ipuçları #000 | Açıklama `textPrimary` (siyah kuralı); fotoğraf ipucu `textSecondary` (ikincil bilgi) |
| Profil fotoğrafı | "Google hesabından eklendi" metni sağlayıcı fotoğrafı ister | Mock'ta sağlayıcı fotoğrafı yok: boşken "Profil fotoğrafı ekle / İsteğe bağlı…", seçilince "Profil fotoğrafı / İstersen değiştirebilirsin." |
| Konum adımı (04.02) | İzin durumu | İzin varsa cihaz konumundan il ("Konumun: Antalya"); alana dokununca arama: "Mevcut konumu kullan" + Mapbox yer arama (`placeSearch`, mock'ta örnek yerler). İzin yoksa fayda kartları + "Konum izni ver" (sistem izni, sorulamıyorsa Ayarlar). Fayda kartı fotoğrafları orijinallerden kırpıldı. Sonuç yokken boş liste (tasarımda metin yok) |
| Motor adımı başlığı | Boş durumda "Motorunu ekle", diğer 4 karede "Hangi motoru sürüyorsun?" | "Hangi motoru sürüyorsun?" + uzun açıklama; "ana motorun olarak kaydedilecek" notu her durumda |
| Motor seçim satırları | Seçili değer bazen siyah bazen gri | `SettingsRow valueChevron`; seçilen değer `textPrimary` (`valueEmphasis`), "Seç" `textSecondary`; Model/Yıl önceki seçim yokken %40 opak ve pasif. İkonlar `Motorcycle`, `DashboardSpeed`, `Clock` |
| Marka / Model / Yıl sheet'leri | 650 / 617 / 557 pt | Native `formSheet` (detent 0.76 / 0.72 / 0.65 + tam ekran), `OptionSheetList`: `SheetHeader` + çerçeveli arama + satırlar. Marka değişince model ve yıl, model değişince yıl temizlenir. Yıllar bu yıldan 1950'ye |
| E-posta maskeleme | "yas••••@gmail.com" | İlk 3 karakter + sabit `••••` (uzunluk sızmaz); 3 karakter veya daha kısa yerel kısımda yalnız ilk harf |
| Tekrar gönder (02.04, 02.07) | Tasarımda yalnız metin butonu | `ResendEmailForm`: salt okunur e-posta + "E-postayı tekrar gönder"; her gönderimden sonra 60 sn geri sayım (pasif standart renk). Mail uygulamasını aç / e-postayı değiştir / ipucu kaldırıldı (geri butonu 02.03'e döner) |
| Yasal alt bilgi | Yalnız 02.01–02.02'de çizili | `AuthScreen showLegalFooter` yalnız giriş ve şifre adımlarında |
| E-posta doğrulama (02.07) | Yeni | Yeni e-posta hesabı şifreden sonra `/email-verification`'da bekler (geri yok); bağlantı `rolt://email-verification/confirm?token=…`. Uygulamaya dönünce hesap yeniden okunur (mock bunu bağlantıya dokunmak sayar). Süresi dolmuş/geçersiz bağlantı → `expired` (24 saat, "Giriş ekranına dön" çıkış yapar) |
| Süresi dolmuş sıfırlama linki | Tasarımda artık yalnız doğrulama için süresi dolmuş ekranı var | `reset-link-expired` aynı düzeni kullanır (illüstrasyon, salt okunur e-posta, "Yeni bağlantı gönder", "Giriş ekranına dön") ve kendi 30 dk metnini; geçersiz linkte e-posta alanı gizlenir ve gönder 02.03'ü açar |

## Marka ve uygulama ikonu

- Logo kaynakları (Pencil, 1024 px, mavi gradient `#0044FF → #0000FE` + nokta deseni): `qS2Np` (kırpılmış büyük "R"), `HgIhd` (taşan "ROLT"), `e9xZmO` (ortalanmış "ROLT" — **aktif uygulama ikonu**). Wordmark fontu Bakbak One.
- Üç varyantın export'u: `assets/brand/rolt-icon-{r-mark,wordmark-bleed,wordmark}.png`.
- `assets/icon.png` (iOS, köşesiz ve alfasız), `android-icon-{background,foreground,monochrome}.png` (foreground wordmark'ı 66 dp güvenli alanda), `splash-icon.png` (saydam zeminde beyaz wordmark), `favicon.png` hepsi `e9xZmO`'dan türetildi.
- Splash `expo-splash-screen` config plugin ile: zemin `#1515FF` (Pencil `00.01 Launch / Splash`, `f1H2n6`; görünür wordmark ~100 pt), `imageWidth: 200`.
- İkonu değiştirmek için: Pencil'de node'u köşesiz (`cornerRadius: 0`) geçici bir kopyayla `Export` et, kopyayı sil, yukarıdaki dosyaları yeniden üret.

## Web sitesi (roltapp.com)

- Kaynak `web/` klasöründe; mobil uygulamadan bağımsız (`tsconfig.json` ve `eslint.config.js` dışında tutar). Framework yok: tek `index.html` (satır içi CSS/JS, Google Fonts), `nginx:alpine` + `nginx.conf` ile servis edilir.
- Tasarım: Pencil `/Users/noname/Documents/rolt.pen` → `Sabf6` ("00.0 Web / Yakında — Yol çalışması v4", 1440 × 900). 1100 px altında hero ve levha alt alta dizilir; animasyonlar `prefers-reduced-motion`'da kapanır. `og.jpg` bu frame'in export'u.
- Bekleme listesi: form `supabase.roltapp.com` → `public.waitlist` tablosuna anon key ile yazar (şema: `web/supabase/waitlist.sql`; RLS yalnız ekleme, API'den okuma yok; aynı e-posta 409 → başarı sayılır). Kayıtları okumak için Supabase Studio veya `psql`.
- Yayın: Dokploy (`palm.mers.in`), **APPS** organizasyonu → **Rolt** projesi → **Frontend** uygulaması (`rolt-frontend-omtvi9`). Aynı projede Supabase (`supabase.roltapp.com`) de var; ona dokunma.
- Kaynak: custom git `git@github.com:muhammetilbas/rolt_app.git` (`main`), salt okunur GitHub deploy key ("Dokploy roltapp.com"), build path `/web`, Dockerfile build.
- Alan adları: `roltapp.com` ve `www.roltapp.com`, Let's Encrypt.
- Otomatik deploy: GitHub push webhook'u → Dokploy; watch path `web/**` olduğu için yalnız `web/` değişiklikleri yeniden deploy eder.

## Kod yapısı

```
src/
  app/                    # Expo Router rotaları (yalnızca ekranlar ve _layout'lar)
    _layout.tsx           # root Stack + ThemeProvider + font yükleme + splash
    index.tsx             # → /discover yönlendirmesi
    onboarding.tsx        # 01.01–01.03 onboarding sayfaları
    (auth)/               # 02.01–02.06 giriş / şifre akışı
    email-verification/   # 02.07 e-posta doğrulama
    register/             # 04.01–04.07 kayıt tamamlama (profil, konum, motor + sheet'ler, yükleniyor)
    permissions.tsx       # 03.01–03.02 izin sheet'i
    (tabs)/_layout.tsx    # NativeTabs: discover / record / profile
    (tabs)/<tab>/         # her sekmede native Stack (_layout.tsx) + index.tsx
  components/
    ui/                   # Core Components: Button, TextField, Checkbox, RadioButton, Switch, SegmentedControl, FilterChip, Badge, Tooltip, ChoiceGroup
    feedback/             # StatusIcon, Toast, Dialog, EmptyState, SheetHeader
    ride/ route/ settings/ brand/   # alana özgü bileşenler
    layout/               # ScreenPlaceholder vb.
  features/<alan>/        # alan tipleri, sabitler, iş mantığı (ör. rides/rideTypes.ts)
  theme/                  # colors, typography, fonts, layout (spacing/radius/shadows)
```

- Import alias'ı: `@/` → `src/`.
- Fontlar `useFonts` ile ağırlık başına ayrı family olarak yüklenir (`fontFamily.medium` vb.); `fontWeight` kullanma. Kayıt/profil ekranlarındaki sürüş metrikleri `typography.metric*` (JetBrains Mono); rota kartlarındaki mesafe/süre tasarım gereği Inter.
- Renk, boşluk, radius, gölge değerlerini yalnızca `@/theme` token'larından al; ekranlarda ham hex yazma. Tasarımda olup token'ı olmayan bir değer gerekiyorsa önce `src/theme`'e ekle.
- İkonlar: `iconoir-react-native` (tasarım Iconoir kullanıyor). Tab bar ikonları istisna: NativeTabs görsel ister → `assets/images/tabs/*.png` (tasarımdan export edilmiş Iconoir glifleri).
- Doğrulama: `npm run typecheck`, `npm run lint`, `npx expo-doctor`.

## Çoklu dil (i18n)

- **Kullanıcıya görünen hiçbir metin kodda sabit yazılmaz** (etiket, placeholder, erişilebilirlik etiketi, hata, uyarı). Hepsi `src/i18n` üzerinden: i18next + react-i18next + expo-localization.
- Diller: `tr` (kaynak, varsayılan, fallback) ve `en`. Her anahtar iki dilde de bulunmalı; `resources.ts` tipi eksik İngilizce anahtarda derleme hatası verir. Anahtarlar tiplidir (`src/i18n/i18next.d.ts`), yanlış anahtar derlenmez.
- Namespace'ler: `common` (varsayılan: tab, ortak aksiyon, a11y, yasal), `auth`, `registration`, `rides`, `garage`. Dosyalar: `src/i18n/locales/<dil>/<namespace>.json`.
- Kullanım: `const { t } = useTranslation('auth'); t('signIn.title')`. Bileşenler çağıranın metnini prop olarak alır; yalnızca kendi iç metinleri (ör. "Kapat" erişilebilirlik etiketi) için `useTranslation()` kullanır.
- Enum etiketleri (sürüş tipi, yol tercihi, kategori) koddaki İngilizce id'den anahtar üretir: `rides:types.city`, `registration:roadPreferences.coast`, `garage:categories.naked`.
- Sayı/birim biçimleme: `src/i18n/format.ts` (`formatNumber`), aktif dile göre.
- Dil seçimi: `src/i18n/language.ts` → `DEFAULT_LANGUAGE_PREFERENCE` şimdilik `'tr'`. Cihaz diline geçmek için `'system'` yap (Türkçe cihaz → `tr`, diğer her dil → `en`). "03.10 Ayarlar / Dil" ekranı kullanıcı tercihini yazacak.
- Native metinler (izin açıklamaları, uygulama adı): `src/i18n/native/{tr,en}.json` → `app.json` `locales`. Yeni izin eklenirse iki dosyaya da ekle.

## Kod yazarken

- **Kod tamamen İngilizce:** değişken, fonksiyon, bileşen, dosya, klasör, tip adları ve yorumlar. Türkçe tanımlayıcı yok (`rideType`, `surusTipi` değil). Kullanıcıya görünen metinler i18n anahtarlarıyla; Türkçe karşılıkları tasarımdaki metinlerle birebir, İngilizceleri doğal çeviri.
- **Tasarımın dışına çıkma:** yalnızca Pencil'de olan ekran, bileşen, varyant, durum, ölçü, renk ve metni uygula. Eksik veya belirsiz bir şey varsa uydurma, sor.
- Ekran/bileşen yazmadan önce ilgili Pencil frame'ini MCP ile oku ve ekran görüntüsünü al; ölçüleri tahmin etme.
- Bileşenleri Core Components'teki isim ve varyantlarla eşleştir; aynı kavram için ikinci bir bileşen yazma.
- Dokunma hedefleri en az 44 × 44 (mobil 48 önerilir).
