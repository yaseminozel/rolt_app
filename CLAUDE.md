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

Tek doğruluk kaynağı pencil.dev dosyası: `/Users/noname/.pencil/documents/5d001c98-ecd1-4fee-823a-30f1c54e8880/pencil-new.pen`

- `.pen` dosyasını **yalnızca Pencil MCP araçlarıyla** oku (`mcp__pencil__execute` içinde `Get`, `TakeScreenshot`); Read/Grep ile açma.
- Ekran frame'leri 393 × 852 (iPhone 15/16 boyutu), yan boşluk 16 px, içerik genişliği 361 px.
- Frame adları `NN.N Alan / Ekran — Durum` biçiminde numaralı (ör. `02.2 Record / Paused`).
- Kanvas bölgeleri: ekranlar (y ≈ -6100 … 6700), Core Components panoları (y ≈ -14193), App Icon (y ≈ -9571), UX araştırma panoları (y ≈ 9266 … 12000).

## MVP kapsamı ve ürün kuralları

**Navigasyon:** Alt tarafta yüzen (floating) 3 sekmeli bar: **Keşfet / Kaydet / Profil** (Discover / Record / Profile).
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
- **Harita:** Mapbox (`@rnmapbox/maps`, Maps SDK v11). Tüm haritalar `src/components/map/BaseMap.tsx` üzerinden; token `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (`.env.local`, bkz. `.env.example`), stil `EXPO_PUBLIC_MAPBOX_STYLE_URL` (yoksa Mapbox Outdoors). Mapbox logo/attribution gizlenmez (lisans şartı). Expo Go'da çalışmaz → development build.
- **Rota hesaplama:** MVP'de Mapbox Directions (A→B, yola oturan çizgi); motosiklete özel tercihler (virajlı/manzaralı) için sonra Valhalla veya GraphHopper. Kaydedilen GPS izi Mapbox Map Matching ile temizlenebilir.
- **Konum:** `expo-location` + `expo-task-manager`, arka planda konum açık (iOS "Always", Android foreground service). İzin metni tasarımdaki "Konum izni" ekranından türetildi.
- **Backend:** **Self-hosted Supabase** — entegrasyon ileride yapılacak, şimdilik backend kodu yazma; veri katmanını arayüzlerle soyutla ki mock'tan Supabase'e geçiş kolay olsun. (Postgres + **PostGIS**, Auth: Google/Apple/e-posta, Storage: sürüş fotoğrafları). **Realtime kullanılmıyor**: sürüş önce cihazda (SQLite) tutulur, bitince/bağlantı gelince toplu yüklenir; rota/keşif işlemleri normal sorgu. Realtime yalnızca canlı konum paylaşımı (grup sürüşü, Yakındaki Sürücüler) gelirse özellik bazında eklenir.

**Açık kararlar (uygulamadan önce kullanıcıya sor):**
- Sürüş görünürlüğü varsayılanı: brief "Public" diyor; öneri "ilk sürüş Private, sonra son seçim hatırlansın". Henüz onaylanmadı.
- Like / Follow ve Story/paylaşım şablonlarının MVP'deki yeri.

## Ekran envanteri (Pencil)

| Alan | Ekranlar |
|---|---|
| 00 Launch / Onboarding / Auth | Splash, Get Started, Giriş (boş/dolu, e-posta + Google/Apple), Şifre (mevcut/yeni hesap), Şifremi unuttum, E-posta kontrol, Yeni şifre, Şifre güncellendi |
| 01 Discover | Home (harita odaklı: konum, arama, kategori chip'leri, bölgede N rota, "Senin için önerilenler"), Search (aktif/sonuç/sonuç yok/sıralama sheet), Önerilen rotalar — Tümü, Rota detayı (standart/uzun), Haritada keşfet — rota listesi |
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

- **Tab bar** — Pencil'de `Navigation Bar / Floating` (ör. node `Hk8Qh`; Keşfet / Kaydet / Profil) → Expo Router **NativeTabs**.
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
| Alt sabit CTA | Kayıt ekranlarında 56 pt, Get Started 48 pt, auth 44 pt | Ekranın altına sabitlenen tam genişlik CTA `size="lg"` (48 pt); içerik içindeki butonlar 44 pt |
| Get Started butonu | Marka mavisi, panoda yok | `Button tone="brand"`; basılı `#1111D9` |
| Kayıt alanları | Ekran 48 pt / 14 padding / 1.5 focus | TextField standardı 44 / 12 / 1 |
| Arama alanı | Ekran 18 pt ikon, 15 pt yazı, `#F6F7F7` | `SearchField`: 20 pt ikon, 16 pt yazı, `surfaceMuted` |
| Tempo / Deneyim kontrolleri | Ekranda 44 pt, farklı yazı ve gölge | Standart `SegmentedControl` |
| Model yılı | 5 ayrı hap | `SelectableChip role="radio"`, eşit genişlik |
| Yol tercihi ikonları | Iconoir'da dağ/çadır yok; seçili çipler ikon göstermiyor | Dağ yolları ve Off-road ikonları tasarımdaki çizimden SVG; Virajlı `PathArrow`, Sahil `SeaAndSun`, Uzun tur `RideTypeIcon longRide`, Hafta sonu `Calendar`, Şehir içi `City`, Gece `HalfMoon` |
| "e-Posta" etiketi | Etiket "e-Posta", buton "E-posta ile devam et" | "E-posta" (TDK yazımı, butonla tutarlı) |
| Auth alt ekran başlığı | Tasarımda geri butonu yok, e-posta alanı salt okunur | Şeffaf native header, yalnız geri butonu; akış sonu ekranlarında (yeni şifre, güncellendi) geri yok |
| Onboarding fotoğrafı (`sLkVv`) | Tasarımda görsel "stretch" ile oranı bozularak frame'e çekilmiş (motorlar yatayda ~%35 sıkışık) | Orijinal görsel (`images/image-import-3.png`, 1015×1421) `cover` ile; oran korunur, her ekran boyutunda ortadan kırpılır. Tasarımdan görsel alırken frame export'u değil orijinal dosyayı kullan |
| Kilit geri sayımı | Tasarımda Inter 700 22 | JetBrains Mono (`metricLarge`); sayaç rakamları titremesin. Süre dolunca kart yeşile döner, "Tekrar dene" ana eylem olur |
| Deneme hakkı | Tasarım "2 deneme hakkın kaldı" | 3 deneme; 3. hatada doğrudan kilit ekranı (mesaj yalnız 2 ve 1 için görünür); metin i18n çoğul formuyla |
| Bağlı hesap ekranı | Brief "birincil buton" diyordu | Tasarım (`EV75c`): resmi logolu outlined buton; Google ve Apple aynı yerleşim |
| Turuncu uyarı notu | Amber warning token'larından farklı tonlar | Ayrı `caution*` token'ları + yerel `CautionNote` |
| Türkçe saat eki | "14:05’te" sabit | Saate göre çalışma zamanında hesaplanır (’te/’da…); İngilizce tarih `en-GB` biçimi |
| Misafir giriş sheet'i | "Şimdi değil" 40 pt / 13 semibold gri | Standart metin `Button` (44 pt); başlık 20 semibold; sebep (`reason`) parametresiyle başlık/ikon değişir |
| Lucide → Iconoir | Tasarımda lock, link-2, clock-alert | `Lock`, `Link`, `Clock`; açık kilit olmadığı için süre dolunca `CheckCircle` |
| Auth wordmark konumu | Ekranlara göre farklı | Status bar'ın 52 pt altı ya da native header'ın 8 pt altı; tüm auth adımlarında sabit |
| Auth alt başlıkları | 14/20 ve farklı boşluklar | 14/20, başlık-alt başlık arası 8 |
| Alana ait olmayan hatalar | Tasarımda yok | Alt başlık ile form arasında satır içi failure `Toast` |
| Yasal linkler | Metinden ayırt edilmiyor | `textSecondary` + altı çizili (link olduğu anlaşılsın) |
| E-posta maskeleme | "yas••••@gmail.com" | İlk 3 karakter + sabit `••••` (uzunluk sızmaz); 3 karakter veya daha kısa yerel kısımda yalnız ilk harf |
| Tekrar gönder (sayaç) | Pasif hâli #6B6E73 | Standart pasif buton rengi |
| Süresi dolmuş / geçersiz sıfırlama linki | Tasarım artık `b1m1YP` ekranını veriyor | Her ikisi de `reset-link-expired` ekranına gider; geçersiz linkte e-posta bilinmediği için gönderim notu gizlenir ve "Yeni bağlantı gönder" şifremi unuttum ekranını açar |
| Kayıt içerik boşluğu | Auth 16 pt, kayıt 32 pt | Kayıt içeriği 32 pt, alt CTA çubuğu 16 pt (tasarım) |
| Kayıt "Atla" | Tasarımda yalnız marka ve sürüş tarzı adımlarında | Profil ve model adımında yok; markada atla → sürüş tarzına geçer (model adımı marka ister) |
| Model yılı hapları | Tasarım 2024–2021 | İçinde bulunulan yıl ve önceki 3 yıl + "Diğer" (1950…gelecek yıl) |
| Tempo / Deneyim varsayılanı | Segmented control boş gösteremez | Ortadaki seçenek seçili gelir (Dengeli, 3–5 yıl); görünür olduğu için örtük onay sayılır |
| Listede olmayan marka/model | Tasarımı yok | Kart seçilince yerinde "Marka adı" / "Model adı" alanı açılır; logosuz markada baş harf gösterilir |
| Model satırı radio'su | 22 pt mavi halka | Standart `RadioButton` (tek radio sistemi); seçili satırın mavi zemini korunur |
| Tamamlandı kartı etiketleri | Tek seferlik hap etiketler | Küçük nötr `Badge`, kısa etiketler, satıra sarılır; eksik veride ilgili bölüm gizlenir |
| Şehir seçimi | Tasarımı yok | "Dil" sheet deseninde form sheet: `SheetHeader` + arama (Türkçe harf duyarsız) + işaretli satırlar |
| Zorunlu kayıt alanları | Tasarımda belirtilmemiş | Profil: ad + müsait kullanıcı adı; fotoğraf ve şehir opsiyonel. Marka ve model zorunlu (atlanabilir adımlar hariç); yıl opsiyonel |

## Marka ve uygulama ikonu

- Logo kaynakları (Pencil, 1024 px, mavi gradient `#0044FF → #0000FE` + nokta deseni): `qS2Np` (kırpılmış büyük "R"), `HgIhd` (taşan "ROLT"), `e9xZmO` (ortalanmış "ROLT" — **aktif uygulama ikonu**). Wordmark fontu Bakbak One.
- Üç varyantın export'u: `assets/brand/rolt-icon-{r-mark,wordmark-bleed,wordmark}.png`.
- `assets/icon.png` (iOS, köşesiz ve alfasız), `android-icon-{background,foreground,monochrome}.png` (foreground wordmark'ı 66 dp güvenli alanda), `splash-icon.png` (saydam zeminde beyaz wordmark), `favicon.png` hepsi `e9xZmO`'dan türetildi.
- Splash `expo-splash-screen` config plugin ile: zemin `#1515FF` (Pencil `00.0 Launch / Splash`, `RBNTd`), `imageWidth: 200`.
- İkonu değiştirmek için: Pencil'de node'u köşesiz (`cornerRadius: 0`) geçici bir kopyayla `Export` et, kopyayı sil, yukarıdaki dosyaları yeniden üret.

## Kod yapısı

```
src/
  app/                    # Expo Router rotaları (yalnızca ekranlar ve _layout'lar)
    _layout.tsx           # root Stack + ThemeProvider + font yükleme + splash
    index.tsx             # → /discover yönlendirmesi
    onboarding.tsx        # 00.0 Get Started
    (auth)/               # 00.x giriş / şifre akışı
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
- İkonlar: `iconoir-react-native` (tasarım Iconoir kullanıyor). Tab bar ikonları istisna: NativeTabs sistem sembolü ister → Iconoir map/play/user yerine SF `map`/`play`/`person`, Material `map`/`play_arrow`/`person`.
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
