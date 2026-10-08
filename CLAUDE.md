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

Tek doğruluk kaynağı pencil.dev dosyası: `/Users/noname/.pencil/documents/b8309428-b7f2-4635-b126-1ba150619577/pencil-new.pen` (2026-10-09'dan itibaren; Figma `V1 Screens` sayfasının birebir aktarımı, 208 üst düzey öğe. Eski kopyalar `a8ce9826-…` ve `5d001c98-…` artık kullanılmaz; node id'leri yeni dosyaya göre)

- **Figma kopyası (2026-10-08):** `ROLT: Share Your Route (Copy)`, file key `Hy0M0G6tJYF0GcQRUSgugl`, sayfa `V1 Screens` (`397:3035`). Pencil açık olmadığında ekranlar bu dosyadan okunur; Pencil'deki import'tan sonra eklenen/değişen düğümler `1005:` dışındaki id önekleriyle (`1021`, `1025`, `1083`, `1099`…) ayırt edilir. Dosya Coze (Starter) ekibinde: Figma MCP çağrı limiti düşük, ekran görüntülerini toplu ve tek tek al.
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
- **A / Rota seçerek sür (Akış 09):** Discover → Rota Detayı → "Rotayı sürmeye başla" → (gerekirse giriş) → 06.01 Hazırlık (durak ekle, sesli yönlendirme, ekran açık) → (ilk seferde 06.04 arka plan izni) → 06.05 geri sayım → 06.06 turn-by-turn navigasyon → 06.07 varış → "Sürüşü kaydet" (Kaydet sekmesi, 08.05). Detayda tek ana eylem; Kaydet ve Paylaş ikincil.
- **B / Serbest sürüş:** Record → (gerekirse giriş + izin/GPS hazırlığı) → Ready → Başlat → Recording. Rota, başlık, motosiklet seçimi ön koşul değildir. Giriş/izin ekranından dönüşte başlatma niyeti korunur.
- **C / Duraklat, bitir, sakla:** Recording ↔ Paused → Bitir → Özet → (başlık/fotoğraf/görünürlük, hepsi opsiyonel, otomatik başlık ör. "Antalya · Pazartesi sürüşü") → "Sürüşü kaydet" → onay → isteğe bağlı Paylaş / Rota olarak yayımla. Bitirme ve silme ayrı eylemlerdir; silme onay ister.
- **D / Kesintiden dön:** Açılışta tamamlanmamış sürüş → Devam et / Bitir / Sil (Sil onaylı).
- **E / Sistem durumu:** Recording/Paused kullanıcı durumudur; GPS yok / Offline / Arka plan ayrı gösterge. GPS yokken nokta kaydediliyormuş izlenimi verilmez.

**Kayıt güveni (P0):** Kayıt yerelde tutulur, bulut senkronu ayrı durumdur. GPS veya internet kaybı sürüşü bitirmez. "Kaydedildi" mesajı yalnızca gerçek kalıcılık sağlandıktan sonra gösterilir. Örnek metin: "Sürüş cihazına kaydediliyor. Bağlantı gelince senkronize edilecek."

**Kayıt ekranı:** Harita, mesafe, süre, ortalama hız ve her zaman görünür "Duraklat". Duraklatılmışta baskın "Devam et", daha az baskın "Sürüşü bitir". Kontroller menüye gizlenmez.

**Kaydetme (bookmark):** Kartta ve detayda aynı yer imi davranışı; tek dokunuş, kısa "Kaydedildi" toast'u + geri alma. Misafir kullanıcı girişe yönlendirilirse işlem girişten sonra tamamlanır.

**MVP dışı:** Gelişmiş/dairesel rota üretimi, grup sürüşü. (Turn-by-turn navigasyon Akış 09 ile, Topluluk sekmesi Akış 22 ile kapsama girdi.)

**Teknik kararlar (2026-09-30):**
- **Harita:** Mapbox (`@rnmapbox/maps`, Maps SDK v11). Tüm haritalar `src/components/map/BaseMap.tsx` üzerinden; token `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (`.env`, git'e girmez; şablon `.env.example`), stil `EXPO_PUBLIC_MAPBOX_STYLE_URL` (yoksa Mapbox Outdoors). Mapbox logo/attribution gizlenmez (lisans şartı).
  - **Expo Go'da Mapbox çalışmaz** → `BaseMap` Expo Go'da tasarımdaki harita görselini gösterir (`mapFallbacks` → `assets/images/maps/*-fallback.jpg`), development/production build'de gerçek haritayı açar.
  - **`@rnmapbox/maps`'i yalnızca `src/components/map/NativeBaseMap.tsx` import eder** (lazy yüklenir). Ekranlar Mapbox katmanlarını `renderLayers={(Mapbox) => …}` ile verir; başka hiçbir dosyada statik import yok (yoksa Expo Go açılışta çöker).
  - ScrollView içindeki küçük harita kartları (Keşfet ana sayfa) etkileşimli harita değil, statik görseldir; dokununca tam ekran haritaya gider.
- **Rota hesaplama:** MVP'de Mapbox Directions (A→B, yola oturan çizgi); motosiklete özel tercihler (virajlı/manzaralı) için sonra Valhalla veya GraphHopper. Kaydedilen GPS izi Mapbox Map Matching ile temizlenebilir.
- **Konum:** `expo-location` + `expo-task-manager`, arka planda konum açık (iOS "Always", Android foreground service). İzin metni tasarımdaki "Konum izni" ekranından türetildi.
- **Navigasyon (Akış 09):** `src/features/navigation/`. Mapbox Directions `steps=true` (token yoksa mock); manevra metni sağlayıcıdan değil uygulamadan (`ride:maneuver.*`, tür + yön + yol adı). Saf `NavigationTracker` (rotaya oturtma, manevra, durak varışı 30 m, mola 20 sn, GPS zayıf > 50 m / kayıp 30 sn, rotadan çıkma 40 m × 2 ölçüm; eşleştirme rotada en fazla 150 m ya da 70 m/sn × son eşleşmeden geçen süre ileriye bakar (ilk ölçüm 500 m), böylece kendine yaklaşan rota (U dönüşü, durağa girip çıkma, döngü) ileri atlamaz; varışa yakınlık ancak rotanın yarısından sonra bitirir, sürüş istatistikleri) + `useNavigationSession` (konum kaynağı, otomatik yeniden bağlanma, `expo-speech` 400 m / 100 m anonsları). Konum kaynakları: arka plan izni varsa `startLocationUpdatesAsync` görevi (`backgroundLocationTask.ts`, root layout'ta import edilir), yoksa ön plan `watchPositionAsync`; Expo Go / web'de ya da `EXPO_PUBLIC_SIMULATE_NAVIGATION=1` ile simülatör (`EXPO_PUBLIC_NAV_SIM_SCENARIO` = offRoute / weakGps / lostGps / break, `EXPO_PUBLIC_NAV_SIM_SPEED`). Gerçek GPS, arka plan ve Mapbox çizgisi yalnız development build'de.
- **Backend:** **Self-hosted Supabase** — entegrasyon ileride yapılacak, şimdilik backend kodu yazma; veri katmanını arayüzlerle soyutla ki mock'tan Supabase'e geçiş kolay olsun. (Postgres + **PostGIS**, Auth: Google/Apple/e-posta, Storage: sürüş fotoğrafları). **Realtime kullanılmıyor**: sürüş önce cihazda (SQLite) tutulur, bitince/bağlantı gelince toplu yüklenir; rota/keşif işlemleri normal sorgu. Realtime yalnızca canlı konum paylaşımı (grup sürüşü, Yakındaki Sürücüler) gelirse özellik bazında eklenir.

- **Veri katmanı:** Her alan bir repository arayüzü + mock uygulama (`src/features/<alan>/`), ekranlar yalnızca React Query kancalarını (`queries.ts`) kullanır; Supabase geldiğinde yalnızca repository değişir. Rota modeli: `src/features/routes/types.ts` (Route ≠ Ride).
- **Sheet kuralı:** Modal seçimler (sıralama, şehir/konum, misafir giriş) → native `formSheet` (Expo Router `presentation: 'formSheet'`). Harita üzerindeki kalıcı, sürüklenebilir sheet'ler (rota detayı, haritada keşfet, kayıt kontrolleri) → `@gorhom/bottom-sheet`.
- **Misafir işlemleri:** Hesap gerektiren işlemler `useRequireAccount()(reason, action)` ile; misafire giriş sheet'i açılır, işlem saklanır ve giriş (+ yeni hesapta kayıt ve izinler) bittikten sonra otomatik tamamlanır (`pendingAccountAction.ts`). Sheet kapatılırsa işlem silinir.
- **Geri bildirim:** Uygulama geneli tek toast `useToast()` (`ToastProvider`); kaydetme → "saved" + "Görüntüle", kaldırma → "removed" + "Geri al".

**Açık kararlar (uygulamadan önce kullanıcıya sor):**
- Like / Follow ve Story/paylaşım şablonlarının MVP'deki yeri ("Paylaşım görseli oluştur" bunlara bağlı).

**Kayıt (Akış 13, 2026-10-07):**
- Sürüşler önce cihazda: `src/features/rides/storage` (iOS/Android `expo-sqlite`, web önizlemesinde `localStorage`), durumlar `recording` → `draft` → `saved`; `synced` backend gelene kadar false. "Kaydedildi" yalnız yerel yazımdan sonra (P0).
- Saf `RideRecorder` (`rideRecorder.ts`): GPS > 50 m doğrulukta veya 30 sn sessizse kayıt kendiliğinden duraklar (mesafe/süre saymaz, iz yeni parçaya geçer); 5 m altı adım ve > 70 m/sn sıçrama atılır; 60 sn durmak bir mola; aynı yöne 150 m içinde ≥ 45° dönüş bir viraj (`CurveCounter`, navigasyon sürüşlerinde `countCurves`). Ort. hız = mesafe / (süre − mola).
- `RideRecordingProvider` root layout'ta: kayıt sekme değişse de sürer, 10 sn'de bir ve her duraklatmada cihaza yazılır; açılışta yarım kayıt 08.03 kurtarma olur. Konum kaynağı navigasyonla aynı (arka plan görevi / ön plan / simülatör).
- Görünürlük varsayılanı (kullanıcı kararı): ilk sürüş "Sadece ben", sonra son seçim hatırlanır (Ayarlar > Sürüş görünürlüğü gelince oradan da). 1 km altı sürüş kaydedilemez (08.04).

## Ekran envanteri (Pencil)

| Alan | Ekranlar |
|---|---|
| 00 Launch (Akış 01) | 00.01 Splash (00.02 "Başlarken · Alt. Grup görseli" onboarding'le değişti, uygulanmaz) |
| 01 Onboarding (Akış 02) | 01.01 Keşfet, 01.02 Sür ve kaydet, 01.03 Paylaş (açık tema) |
| 02 Auth (Akış 03–05) | 02.01 Giriş (boş/dolu/yükleniyor), 02.02 Şifre (mevcut/yeni hesap, yanlış şifre, çok fazla deneme), 02.03 Şifremi unuttum, 02.04 E-posta kontrol, 02.05 Yeni şifre, 02.06 Şifre güncellendi, 02.07 E-posta doğrulama (yeni hesap / süresi dolmuş bağlantı) |
| 03 İzinler (Akış 06) | 03.01 Konum izni, 03.02 Bildirim izni (sheet) |
| 04 Kayıt tamamlama (Akış 07) | 04.01 Profil (boş / müsait / kullanımda), 04.02 Konum (izin verilmiş / şehir ara / izin verilmemiş), 04.03 Motor (boş / seçili), 04.04–04.06 Marka / Model / Yıl sheet'leri, 04.07 Yükleniyor |
| 05 Discover (Akış 08) | 05.01 Ana sayfa (harita odaklı / konum izni yok / çevrimdışı / iskelet / kaydırılmış · 1 saatte ulaşılabilir), 05.02 Arama (aktif / sonuçlar / sıralama / sonuç yok), 05.03 Önerilen rotalar — Tümü (+ Ulaşım süresi · 1 saat), 05.04 Rota detayı (standart sokak / topografik, uzun içerik) |
| 06 Rotayı sür (Akış 09) | 06.01 Hazırlık (başlangıçtan uzak / başlangıçta / duraklı), 06.02 Durak ekle (arama, haritadan seç), 06.03 Durak önizleme, 06.04 Arka plan konum izni (ön bilgi + iOS uyarısı), 06.05 Geri sayım, 06.06 Navigasyon (dönüş, rotadan çıktın, bağlandın, durağa varış, mola, sonraki durak, GPS zayıf, çıkış onayı), 06.07 Varış |
| 07 Map Explore (Akış 10–12) | 07.01 Rotalar (kümelenmiş pinler / fotoğraflı pinler / rota seçili), 07.02 Benzinlikler, 07.03 Tamirciler, 07.04 Arama (yazılıyor / aranıyor / sonuç yok) |
| 08 Record (Akış 13) | 08.01 Hazır (varsayılan / GPS aranıyor / GPS hazır / konum izni yok), 08.02 Sürüş (kayıt / duraklatıldı / tam ekran / GPS zayıf), 08.03 Kurtarma, 08.04 Çok kısa sürüş, 08.05 Sürüşü kaydet (varsayılan / fotoğraflı / kaydediliyor / kaydedilemedi), 08.06 Sürüş tipi, 08.07 Fotoğraf kaynağı, 08.08 Görünürlük, 08.09 Sil onayı, 08.10 Kaydetmeden çık, 08.11 Sürüş kaydedildi, 09.06 Sürüş detayı (+ seçenekler, silme onayı), 09.07 Sürüşü düzenle |
| 09–10 Profil / Ayarlar (Akış 14) | 09.01 Profil (genel / kaydırılmış / yeni kullanıcı), 09.02 Profili paylaş, 10.01 Ayarlar (ana menü / kaydırılmış / arama sonuçları / sonuç yok), 10.17 Çıkış onayı |
| 10 Ayarlar (Akış 15–16) | 10.02 Hesap bilgileri (e-posta / Apple / Google, şifre güncellendi), 10.03 Şifre değiştir (+ hata), 10.04 Sürüş görünürlüğü, 10.05 Başlangıç-bitiş noktası, 10.06 Engellenen kullanıcılar, 10.07 Konum izni, 10.08 Fotoğraf izni, 10.09 Bildirimler, 10.10 Dil, 10.11 Ölçü birimleri, 10.12 Yardım ve SSS, 10.13 Geri bildirim, 10.14 Gizlilik, 10.15 Kullanım koşulları |
| 11–13 (Akış 17–22) | Motorum, Bildirimler, Topluluk — aşağıdaki satırlar eski numaralandırmayla; o akışlar yeni dosyaya göre güncellenince değiştir |
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
| İzin sheet'i (03.01 `ylGJA`, 03.02 `KvKqT`) | Tasarımda arka planda rastgele bir auth ekranı | Tek native `formSheet` (`/permissions`, `fitToContents`, köşe sistemden), içinde konum → bildirim adımı. Yeni hesap (profili bitmemiş hesaba giriş) için bir kez, kayıt akışının ilk ekranının üstünde (`usePermissionPromptSheet`); yani izinler kayıttan önce (03 → 04 sırası, 04.02 izin durumlarına göre). Her iki cevapta ilerler; sheet'i kaydırıp kapatmak iki adım için de "Şimdi değil" sayılır. İllüstrasyonlar frame export'u (361 × 384), kısa ekranda küçülür. Açıklama 16 pt `textSecondary` |
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
| Rota detayı metrikleri | Pencil'de 6 metrik; Figma V1 (`1083:18408`) tek satır | Figma: Mesafe, Süre, Mola (JetBrains Mono 16). `Route.curveCount` ve hız alanları modelde kalır (kartlar ve filtreler kullanır) |
| Örnek rota çizgisi ve metrikleri | Tasarımdaki örnek sayılar (ör. Adrasan 72 km, Geyikbayırı 58 km) yerler arası düz çizgiyle uyuşmuyordu | Mock rotaların çizgisi, mesafesi, süresi, ort. hızı (mesafe / süre; maks. hız ×1,7, mola süreden) ve viraj sayısı (`countCurves` kuralı, tam çizgide) gerçek Mapbox Directions (driving) sonucu: `scripts/generate-route-geometries.mjs` → `fixtures/routeGeometries.ts` (Douglas–Peucker 12 m, 5 ondalık; yer tablosu `routes.ts` ile aynı tutulur). Tasarımdaki örnek sayılar artık tutmaz; seed'deki elle yazılı değerler yalnız çizgisi üretilmeyen Suluada tekne rotasında kullanılır, duraklar (`stops`) yeni toplamla orantılı ölçeklenir. Yerler yola ulaşılan noktalar (Tahtalı = teleferik alt istasyonu, Gelidonya = Karaöz patika başı, Olympos = vadi yolu girişi, Termessos = otopark); Geyikbayırı rotası durakları gibi Geyikbayırı → Tahtalı Dağı |
| Rota detayı bölümleri | Standart ve uzun içerik sırası farklı | Uzun içerik sırası: Rota durakları (varsa) → Rota görselleri → Rota detayları → Notlar. "Sürüş görselleri" yerine "Rota görselleri" (Route ≠ Ride). Duraklar `Route.stops`; başlangıçta saat yerine yalnız "0 km" (rotanın saati yok). CTA 44 pt |
| Harita üzerindeki yuvarlak buton | "Konumuma git" adlı ama oynat ikonu çizilmiş; Figma V1'de CTA'dan ikon kalktı, ▷ haritada kaldı | ▷ "Rotayı önizle": kamera rota boyunca uçar (24 nokta × 450 ms), ikinci dokunuş durdurur; yalnız Mapbox'ta (Expo Go'da pasif). Buton sheet'in 16 pt üstünde; sheet varsayılan üst kenarı 252 pt (852'lik karede). CTA ikonsuz "Rotayı sürmeye başla". Notlar en altta salt okunur çerçeveli alan (`RouteNotesField`, "Field / Notlar"); durak rayı kesikli 1,2 pt `textSecondary` |
| Katman butonu | Katman seçici tasarlanmamış; 05.04 sokak ve topografik iki ayrı kare | Haritada keşfet'te "Katmanlar" Outdoors ↔ Uydu; rota detayında buton yok (tasarımda yok), harita Outdoors |
| Sürüş detayları satırları | Chevron var ama gidilecek yer yok | Salt okunur, chevron yok |
| Rota görselleri | Galeri tasarlanmamış | 5 sabit kutu, fazlası "+N"; kutular dokunulamaz |
| Haritada Keşfet çizgileri (07.01) | Liste durumlarında çizgi yok, seçilide mavi + gri | Çizgiler yalnız rota seçiliyken: seçili `brand` 6 / beyaz kenar 11, diğerleri `routeInactive` 3.5 / beyaz kenar 6 (%90). Rota detayının etiket renkli çizgileri (`routeTagTones`) değişmedi |
| Kümeler ve fotoğraflı pinler (07.01) | İki frame iki yakınlık düzeyi; geçiş kuralı yok | Ekranda 72 pt'den (küme halesi) yakın pinler "N rota" rozetinde birleşir, tek kalan fotoğraflı pin olur (`clusterMarkers`, harita her durduğunda). Rozete dokununca harita üyelerini sığdırır; ayrılamayacak kadar yakınsa sokak düzeyine (zoom 15) iner. Expo Go/web'de aynı mantık tasarım haritası üzerinde çalışır |
| Seçiliyken diğer rotalar | Gri rozetler 52 pt, yazı 9,3 / 5,2 pt (ölçeklenmiş çizim); tekil rota çizilmemiş | Gri rozet mavi kümeyle aynı ölçüde (18 / 10 pt, beyaz 3 pt halka, halesiz); tekil rotalar da gri "1 rota". Gri tekil rozet o rotayı seçer, çoklu rozet seçimi kaldırıp kümeyi açar |
| Etiket rozeti renkleri (07.01) | Haritada Keşfet'te Sahil yeşil, Virajlı mavi, Manzara amber; diğer ekranlarda hepsi yeşil | Yalnız bu ekranda `routeTagBadgeTone` (Sahil success, Virajlı info, Manzara warning; çizilmeyen Şehir İçi, Doğa, Off-road, Uzun tur neutral); diğer ekranlarda `RouteCard` varsayılanı success |
| Haritada Keşfet çipleri | Tümü + 5 etiket, "Manzaralı", Tümü 16 pt | `routes:tags.*` ("Manzara"), Off-road / Uzun tur yok, hepsi `FilterChip` toggle (14 pt, 32 pt) |
| Kategori çipleri (Rotalar / Benzinlik / Tamirci) | Katman adları "filter", ikonlar farklı çizilmiş | Çizime göre `PathArrow`, `FuelPumpIcon` (tasarım geometrisi; Iconoir `Gas` tüp çiziyor), `Wrench`; `MapCategoryChip` (32 pt, gölgeli, 44 pt dokunma). Çip haritadaki içeriği değiştirir, rota seçimini kaldırır |
| Benzinlik / Tamirci verisi (07.02, 07.03) | Puan, açık/kapalı ve mesafe; kaynak belirsiz | `src/features/places` (repository + mock + Mapbox Search Box kategori araması `gas_station` / `auto_repair`, görünen alan `bbox`; motosiklete özel tamirci kategorisi yok, `auto_repair` motosiklet servislerini de kapsar). Mapbox'ta puan yok → puan gizlenir; açılış durumu `metadata.open_hours`'tan (`openingStateFromPeriods`, `day` 0 = Pazar), yoksa gizlenir. Mesafe cihaz konumundan, yoksa harita merkezinden; liste mesafeye göre sıralı. Mock'ta Mapbox'tan gerçek yerler (2026-10-08 anlık görüntüsü: Antalya, Kemer, Kumluca, Adrasan, Kaş; ad, adres, koordinat ve açılış saatleri Mapbox'tan, puan yok, saati olmayan yerde durum gizli) |
| Açılış durumu | Tasarımda "24 saat açık" (yeşil) ve "Şu an kapalı" (kırmızı) | Saatli ve şu an açık yerler için üçüncü durum "Şu an açık" (yeşil) |
| Benzinlik / Tamirci etkileşimi | "Yol tarifi" ve satıra dokunma tanımsız | "Yol tarifi" cihazın harita uygulamasında sürüş tarifi açar (iOS Apple Haritalar, diğerleri Google Haritalar; `openDirections`). Satıra ya da pine dokunmak haritayı o yere ortalar (zoom 15). Boş / hata hâli için sheet'te tek satır metin (tasarımı yok) |
| Benzinlik / Tamirci sheet'i | 400 pt kayan liste, "Katmanlar" sheet'in arkasında kalıyor, "Konumum" yok | Sheet 400 pt + tutamaç (iki konum: başlık / açık); harita kontrolleri her durumda sheet'in 16 pt üstünde. Pin 34 pt, kategori rengi `placeFuel` / `placeRepair`; satırdaki adres `textTertiary` (rota kartı alt başlığıyla aynı) |
| Harita kontrolleri (07.01) | Kümeli frame'de yalnız "Katmanlar"; sheet'e uzaklık 16 / 38 | Her durumda "Konumum" (`NavigatorAlt`) + "Katmanlar", 52 pt, sheet'in 16 pt üstünde; eski yakınlaştırma ve ölçek kaldırıldı |
| Arama alanı (07.01) | 14 pt yazı, gölgeli | `SearchField variant="floating"` (16 pt standart), temizle butonlu |
| "Bu bölgede ara" (07.04) | Yazılıyor, Aranıyor, Sonuç yok çizilmiş; sonuç durumu yok | Kullanıcı kararı: seçili katmanı süzer. Yazarken bir şey değişmez; klavyeden "Ara" ile Rotalar'da ad / özet / şehir, Benzinlik ve Tamirci'de yer adı (Mapbox'ta `forward` + `poi_category`) görünen alanda aranır, sonuçlar mevcut pin ve sheet düzeninde. Çip değişince sorgu yeni katmana uygulanır; alanı temizlemek aramayı kaldırır |
| Aranıyor / Sonuç yok (07.04) | Yükleniyor karesinde alan boş, Sonuç yok'ta sorgu silinmiş; başlık 17 pt; kontrollerin sırası ters | Sorgu alanda kalır. Arama sürerken header'ın 8 pt altında "Aranıyor…" hapı; sonuç yoksa sheet tek konumlu "Sonuç yok" (`EmptyState` + nötr `StatusIcon`, bileşen standardı 14 pt başlık). Harita kontrolleri 07.01 sırasıyla (Konumum üstte) |
| Seçili rota sheet'i | Radius 28, CTA 12 semibold, uzun açıklama | Radius 24 (`radius.xl`, diğer harita sheet'leri), standart `Button`, açıklama `summary` (2 satır). Eski önizleme kartı, "N km uzakta" ve "Sürmeye başla" kaldırıldı; tek ana eylem "Rotayı görüntüle" |
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
| Sürüş akışı yapısı | 06.x ekranları | `src/app/ride/[routeId]/` ayrı stack (sekme barı yok), `RideSessionProvider` (rota, ⇅, ≤ 3 durak, ayarlar, plan). Durak ekle, arka plan izni ve çıkış onayı native `formSheet`; Hazırlık sheet'i `@gorhom/bottom-sheet`; navigasyon/varış panelleri sabit alt panel |
| Başlangıçtan uzak (06.01 `N8AE4`) | "2,4 km uzakta", Mesafe = yaklaşma + rota | Cihaz rota başlangıcına > 200 m ise plan cihaz konumundan başlar (yaklaşma bacağı, başlangıç sessiz ara nokta); etiketler Mesafe / Tahmini varış. Yakınsa Rota / Tahmini bitiş, başlangıç adı rota adı (tasarım "Geyikbayırı Sürüşü"), bitiş `Route.endName` |
| Plan noktaları | Directions 25 koordinat sınırı | Rota çizgisi duraklar arasında parçalanıp örneklenir; duraklar gerçek waypoint, ara noktalar sessiz. Duraklar sürücünün sırasıyla (sürükleyerek ters sıralanırsa çizgi geri döner) |
| Ters sıra uyarısı (`wYzjk`) | Metin çizilmemiş | Durak satırının ikinci satırı turuncu "Bu sırada rotada geri dönmen gerekiyor" |
| 3 km sapma uyarısı (`wYzjk`) | Metin çizilmemiş | Önizleme / haritadan seç panelinde `InfoNote` |
| Durak önerileri | Sapma rozeti | Rota çizgisine < 20 m → yeşil "Rota üzerinde"; aksi hâlde "+N dk" (3 dk yoldan çıkıp dönme + gidiş-dönüş ≈ 2 × uzaklık, 40 km/sa; Antalya'da 27 yerin Mapbox Matrix sapmasıyla kalibre, 2026-10-08); < 120 m "Rota üzerinde · X. km", < 1 km "Rota yakınında", üstü "Rotadan uzak" (turuncu rozet). Önizleme gerçek sapmayı Directions ile hesaplar. Mapbox Search Box kategori + rota boyunca arama; kategori id'leri `/list/category`'den çözülür. Mock'ta tasarımdaki 6 yer her rotaya yayılır |
| Arka plan izni seçenekleri (06.04) | Radyo listesi | iOS seçiminin temsili; dokunulmaz (karar sistemde verilir). İlk "Başla"da, izin yalnız ön plan ve tekrar sorulabiliyorsa bir kez; "Kullanırken" kalırsa Hazırlık'ta `InfoNote` uyarısı (`E0DAxE`) |
| Rotadan çıkma (`W0nTTe`) | Onay yok | Sürücüden ~300 m ilerideki rota noktasına Directions ile bağlanıp kalan rotaya eklenir (yeniden planlama değil); kırmızı banner hesap süresince, yeşil "+N dk" banner 5 sn |
| Durağa varış (`yqADk` vs `h3s1pA`) | Bir not "Mola ver / Devam et" diyor, diğeri aksiyon yok | Sonraki not (`h3s1pA`, `O5EZ3F`) uygulanır: varış otomatik, kart ~3 sn (hareket edene kadar), durunca pasif "Mola" çipi; aksiyon yok. Mola süresi sürüşte ayrı tutulur (`breakS`) |
| İlerleme çubuğu (`yqADk` 5. adım) | Not "ilerleme çubuğunda durak işaretleri" diyor, karede yok | Uygulanmadı (tasarımı yok); açık soru |
| Navigasyon "Bitir" | Çıkış onayı yalnız "rota takibi duracak" diyor | Takip durur, o ana kadarki sürüş taslak olur ve doğrudan 08.05 "Sürüşü kaydet" açılır (varıştaki "Sürüşü kaydet" de); sürüş tipi rotanın etiketinden, zorluk/yol tipi rotadan gelir. "Kaydetmeden çık" 08.10 diyaloğu (`Dialog actionsLayout="column"`) |
| Kaydet sekmesi (08.01–08.04) | Tasarımda sekme barı yok, sol üstte geri | Kaydet açıkken native tab bar gizlenir (`useHiddenTabBar`, NativeTabs `hidden`); geri Keşfet'e döner. Kontroller sabit panel (sürüklenmez), "Başlat / Duraklat / Devam et / Bitir" 60 pt (`Button size="xl"`, eldivenle). Durum bandı (GPS alınıyor → GPS hazır 3 sn, GPS zayıf, yarım kalan, çok kısa 4 sn) panelin 12 pt üstünde, tek seferde biri |
| Konum izni yok (08.01 `QA0eS`) | CTA katmanı "Ayarlar'a git", etiketi "İzin ver" | Sorulabiliyorsa "İzin ver" (sistem izni), sorulamıyorsa "Ayarlar'a git"; "Şimdi değil" Keşfet'e döner |
| Arka plan izni (Kayıt) | Tasarımı yalnız navigasyonda | İlk serbest kayıtta aynı 06.04 sheet'i (`BackgroundPermissionContent`); kapanınca kayıt başlar (başlatma niyeti korunur) |
| Sürüşü kaydet formu (08.05) | 6 varyantta alan sırası ve görünürlük denetimi farklı | `VdbQJ` sırası: özet kartı, ad, sürüş detayları, notlar, görseller, görünürlük satırı (Herkes / Takipçilerim / Sadece ben sheet'i), sürüş tipi; altta "Sürüşü sil". Düzenleme (09.07) aynı form. Alanların hepsi isteğe bağlı; ad boşsa otomatik başlık ("Antalya · Çarşamba sürüşü", en yakın il merkezi). Alt CTA 48 pt |
| Zorluk / Yol tipi satırları | Seçim sheet'leri çizilmemiş | Kullanıcı kararı: dahil; görünürlük sheet'inin radyo satırlarıyla (`ChoiceRow`) Kolay/Orta/Zorlu ve Asfalt/Karışık/Toprak, seçince kapanır |
| Kayıt formu (08.05 / 09.07, Figma V1) | Notlar kutusu 79 pt, görsel kutusu kesikli; rota sürüşünde (`1083:20403`) "Rota görselleri"; düzenle CTA'sı "Kaydet" | `TextField multilineHeight`, `UploadBox dashed` (marka renkli ikon); etiket rota sürüşünde "Rota görselleri"; 09.07 CTA "Kaydet" |
| Sürüş görselleri (08.07) | "Fotoğraf veya video ekle" | Yalnız fotoğraf (video yükleme yolu yok), alt metin "Fotoğraf ekle". En fazla 10; eklenince yüklenir (mock, her 4. bir kez hata), kutucukta "%64" ve çubuk, hatalıda kırmızı çerçeve + "Tekrar dene" (dokununca yeniden), dokununca "Kaldır". Hatalı görsel varken kaydet pasif; kaydet yüklemeleri bekler ("Görseller yükleniyor · 1/2") |
| Kaydediliyor / kaydedilemedi | — | Form %48 soluk ve kilitli, buton spinner + "Kaydediliyor…" (`Button loadingLabel`); hata failure toast, form korunur |
| Sürüş özeti haritası (08.05, 08.11, 09.06) | Tasarımda statik harita görseli | `RideMapPreview`: token varsa Mapbox Static Images (merkez ve zoom iz üzerinden hesaplanır, çizgi SVG ile tam üstüne), yoksa / çevrimdışıysa tasarımın sokak haritası görseli + sığdırılmış iz. Etkileşimli harita değil (ScrollView kuralı) |
| Sürüş kaydedildi (08.11) | Paylaşım satırı, "Paylaşım görseli oluştur"; Figma V1'de durum ikonu yerine illüstrasyon (`1083:20399`) | Başlıkta 06.07'deki illüstrasyon (95 × 120, cover), alt başlık yalnız "Profiline eklendi". Kullanıcı kararı: satır çalışır, görsel sonra (CTA gizli). WhatsApp metinle açılır, yoksa sistem paylaşımı; Instagram dışarıdan metin almadığı için iki Instagram hedefi ve "Diğer" sistem paylaşımı; "Bağlantı kopyala" panoya (`expo-clipboard`) + toast. Bağlantı `rolt://ride/<id>`. Uygulama ikonları tasarım export'u (`assets/images/share/`). Geri Kaydet sekmesine döner |
| Sürüş detayı (09.06, Figma `1005:37957`) | Yeni: yatış açısı göstergesi, "Sürüş güzergahı", Maks. yatış; görünürlük rozeti ve Mola yok; tek "Paylaş" | Metrikler Mesafe / Süre / Ort. hız / Maks. hız / Viraj / Maks. yatış. Yatış GPS'ten tahmin (`LeanEstimator`: atan(v·ω/g), 15 m örnek, 5 m/sn altı sayılmaz, 60° üstü gürültü; kayıt ve navigasyon sürüşlerinde `maxLeanLeftDeg` / `maxLeanRightDeg`, eski sürüşlerde 0). Gösterge tasarım çizimi (statik), sol/sağ değerler dinamik. Güzergah: rota sürüşünde rotanın başlangıç/bitiş adı, serbest sürüşte Mapbox Geocoding v6 reverse (mahalle/yer, yoksa il) + saat. ▷ sürüşü yeniden oynatır (iz üzerinde 4 sn ilerleyen işaret; harita statik görsel kalır). Notlar en altta çerçeveli alan. "Paylaş" `ShareAndroid` ikonlu, rota sürüşünde yanında "Rotayı tekrar sür" (kullanıcı kararı, Ride ≠ Route) |
| Kendi profilim verisi (09.01) | Tasarımda örnek kullanıcı; kaynak yok | `src/features/profile` (mock, cihazda hesap başına `deviceStore`): yeni hesapta kayıt adımlarından (ad, kullanıcı adı, fotoğraf, konum, motor), örnek hesapta (yasemin@example.com) fixture sürücü. Takipçi sayıları yeni hesapta 0 |
| Profil kamera ikonu | Davranışı tanımsız | Kullanıcı kararı: profil fotoğrafını değiştirir (native action sheet: Fotoğraf çek / Galeriden seç, kare kırpma) |
| Profil aksiyonları | Gri dolgulu 40 pt butonlar | Kullanıcı isteği (birebir): `Button variant="tonal"` (`surfaceMuted` dolgu, 8 pt köşe), yükseklik 44 (dokunma alanı). "Profili düzenle" Akış 20'de bağlanır |
| Kendi profilim verisi (mock) | Google / Apple ile kayıt atlanınca e-posta ön eki görünüyordu | Kayıt verisi olmayan her hesap tasarımdaki profili (09.01 `Ct2Yd`, fixture sürücü) gösterir; kayıtta en az bir alan doldurulduysa hesabın kendi profili (0 takipçi, örnek sürüş yok → "Yeni kullanıcı") |
| Çıkış yap | — | Kullanıcı isteği: çıkış onboarding'den (01.01) başlatır; "onboarding görüldü" bayrağı da sıfırlanır |
| Profil Sürüşler sekmesi | Örnek kartlar | Cihazdaki kayıtlı sürüşler önce (iz `RideMapPreview` ile, karta / "⋮"'a dokununca 09.06 / seçenekler), örnek hesapta ardından fixture sürüşleri. Sürüşler henüz çevrimiçi olmadığı için kendi sürüşündeki beğen / yorum / kaydet / paylaş sürüş detayını açar. Hiç sürüş yoksa nötr `StatusIcon` + "Henüz sürüşün yok" + 48 pt "İlk sürüşünü kaydet" (Kaydet sekmesi); tasarımdaki çift ikon tek |
| Profil Kaydettiklerim sekmesi (09.04, Figma `1005:35739`) | "Liste" karesinde ayırıcılı, "Kaydedildi/Kaldırıldı" karelerinde başlıklı ve ayırıcısız | "Liste" uygulanır: satır kartları (mesafe, süre, ort. hız) arasında 8 + 1 + 8 pt ayırıcı, başlık yok; boş durum sekmelerin 116 pt altında "Henüz kaydedilen rota yok". Toast'lar uygulama geneli |
| Avatar baş harfleri | Yeni kullanıcı "YA" teal | Fotoğraf yoksa ilk iki kelimenin baş harfleri `accentSubtle` zeminde `accentVivid` |
| "Alt. Paylaşım odaklı" (`ED8bv`) | Alternatif varyant | Uygulanmadı (diğer "Alt." varyantları gibi) |
| Profili paylaş (09.02) | iOS paylaşım sayfası taklidi: son kişiler, AirDrop, Mesajlar… | Şeffaf modal: bulanık profil üstünde QR kartı (`QrCode`, `qrcode` kütüphanesi) + panel. Son kişiler satırı uygulanmadı (sistem paylaşım sayfasına ait). Mesajlar `sms:` ve WhatsApp bağlantıyla açılır; AirDrop (yalnız iOS), Instagram ve "Daha fazla" sistem paylaşımı. "Bağlantıyı kopyala" panoya, "Görseli kaydet" kartı `react-native-view-shot` ile fotoğraflara (yalnız ekleme izni). Bağlantı `https://roltapp.com/u/<kullanıcı adı>` (tasarımdaki "moto.app" yer tutucu; web sayfası henüz yok) |
| Ayarlar (10.01) | Başlık + × + arama alanı; sonraki karelerde menü farklı ("ROLT hakkında", Topluluk yok) | Ana menü 10.01'e göre. Kök stack'te `modal`; başlık native, arama `Stack.SearchBar`. Değerler gerçek durumdan: motor, varsayılan sürüş görünürlüğü, başlangıç/bitiş gizleme, sistem izinleri (konum her zaman / kullanırken / kapalı, fotoğraf tam / sınırlı, bildirim), dil. Arama satır etiketinde (Türkçe harf duyarsız), sonuçlarda değer yok; sonuç yoksa "Yardım ve SSS'ye git" + sık kullanılanlar. Topluluk satırları ikonsuz (`SettingsRow` ikonu opsiyonel): değerlendir `expo-store-review`, arkadaşına öner sistem paylaşımı, Instagram profili. Alt sayfalar Akış 15–18 |
| Çıkış yap (10.17) | Buton etiketleri "Button" | Diyalog yan yana: "Vazgeç" (outlined) + "Çıkış yap" (destructive); çıkınca onboarding |
| Hesap bilgileri (10.02) | Altta "Kaydet"; e-posta salt okunur | Düzenlenecek alan olmadığı için "Kaydet" yok. Giriş yöntemi oturumdan (`Session.signInMethod`; e-posta / Google / Apple resmi logosu + "Bağlı"). "Şifre değiştir" yalnız e-posta hesabında, "Son değişiklik" `Session.passwordChangedAt`'ten göreli zaman. "Hesabı sil" Akış 18'de |
| Şifre değiştir (10.03) | Kural "en az 8 karakter, bir rakam ve bir büyük harf" | `isStrongPassword` yalnız şifre değiştirmede (kayıt 02.02 yalnız uzunluk ister). Üç alan dolana kadar CTA pasif; uyuşmazlık / zayıf şifre basınca, hatalı mevcut şifre sunucudan. Başarıda geri + "Şifren güncellendi." toast'u. "Şifremi unuttum" oturum açıkken 02.03'e gidemediği için sıfırlama e-postasını doğrudan gönderir |
| Sürüş görünürlüğü (10.04) | Ayar 2 seçenek (Herkese açık / Gizli), kayıt formu 3 | Kayıt formuyla aynı 3 seçenek (Herkese açık / Takipçilere açık / Sadece ben). Tek tercih: ayar değiştirir, formda farklı seçim de onu günceller (son seçim) |
| Başlangıç/bitiş (10.05) | "Kısa açıklama satırı" yer tutucuları | Açıklamalar çıkarıldı; mesafeler 100 m / 250 m / 500 m / 1 km (varsayılan açık, 250 m), anahtar kapalıyken liste soluk. Önizleme son sürüşün (yoksa örnek rotanın) izi; gizli bölümler `trimTrackEnds` ile çizgiden çıkar, alanlar `privacyZone`. Sürüşler henüz çevrimiçi olmadığı için diğer kullanıcılara uygulanması backend ile gelecek |
| Engellenenler (10.06) | Küçük "Engeli kaldır" | Standart 44 pt outlined `Button`; kaldırınca toast; boş liste için kısa boş durum (çizilmemiş) |
| Konum / Fotoğraf izni (10.07–10.08) | Yalnız "Her zaman" ve "Sınırlı" metni çizilmiş | Native formSheet; her izin durumu için açıklama (kapalı / kullanırken / her zaman, kapalı / sınırlı / tam). İzin yalnız telefon ayarlarından değişir ("Telefon ayarlarını aç") |
| Bildirimler (10.09) | — | Tercihler cihazda (`notificationPreferences`, sosyal açık, ürün güncellemeleri kapalı); "Telefon bildirim ayarları" gerçek izni gösterir ve ayarları açar |
| Dil / Ölçü birimleri (10.10–10.11) | — | Native formSheet, "Kaydet"te uygulanır; tercih cihazda (`deviceStore`, açılışta senkron okunur). Imperial (mi · ft · mph) merkezi biçimlendiricilerde (`formatDistance` / `formatSpeed` / `formatElevation`) ve kayıt metriklerinde; navigasyon yönlendirmeleri ve keşif filtre aralıkları şimdilik metrik |
| Yardım ve SSS (10.12) | Başlık "Hesap bilgileri", son kart bildirim ayarları kopyası, cevaplar yok | Başlık "Yardım ve SSS", son kart "Bize yaz" (10.13). Kategori → soru listesi → cevap ekranları (çizilmemiş). **SSS cevapları uygulamanın gerçek davranışından yazılmış taslaktır, ürün tarafından gözden geçirilmeli**; kategori sayıları içerikten gelir. Arama soru ve cevapta |
| Geri bildirim (10.13) | Konu listesi çizilmemiş; "son hata kaydı" | Konular Hata bildirimi / Özellik önerisi / Rota veya harita sorunu / Diğer (native action sheet). Açıklama zorunlu (basınca hata), en fazla 3 ekran görüntüsü. Hata kaydı olmadığı için not "sürüm ve cihaz modeli" der. Gönderim mock |
| Gizlilik / Koşullar (10.14–10.15) | Uygulama içi tarayıcıda web sayfası | roltapp.com'da sayfalar olmadığı için aynı metin native ekranda (`LegalDocument`); giriş ve kayıt bağlantıları da bunu açar |
| Sürüş seçenekleri (09.06 `W8Hilq`) | — | Native formSheet: düzenle, görünürlük (sheet'te "Uygula" anında kaydeder), paylaş, sil (onay detay ekranında). Silince Profil sekmesi + "Sürüş silindi" toast'u (09.01 `tJEMc`) |
| Varış ekranı | İki varyant | Ana varyant (illüstrasyon); "Alt. Kutlama" uygulanmadı. Süre kayıt saati (`formatRideClock` "18:42") |
| Harita butonları (06.06) | Pusula / Ses şeffaf zemin | Okunurluk için beyaz zemin + border. Pusula elle kaydırmadan sonra sürüş yönüne takibi geri açar; Ses sesli yönlendirmeyi açıp kapatır |
| Navigasyon harita işaretleri | — | Rota çizgisi marka mavisi; yön işareti tasarım export'u, nokta etrafında döner; durak numaraları, ulaşılınca yeşil onaylı pin; bitiş bayrağı. GPS zayıfken işaret %50 + doğruluk halkası |
| Hazırlık ayar anahtarları | 44 × 26 siyah | Standart `Switch` (neutral) |
| Misafir sürüş | Akış A "gerekirse giriş" | `useRequireAccount('saveRide')` (sürüş kaydedileceği için o metin) |
| E-posta maskeleme | "yas••••@gmail.com" | İlk 3 karakter + sabit `••••` (uzunluk sızmaz); 3 karakter veya daha kısa yerel kısımda yalnız ilk harf |
| Tekrar gönder (02.04, 02.07) | Tasarımda yalnız metin butonu | `ResendEmailForm`: salt okunur e-posta + "E-postayı tekrar gönder"; her gönderimden sonra 60 sn geri sayım (pasif standart renk). Mail uygulamasını aç / e-postayı değiştir / ipucu kaldırıldı (geri butonu 02.03'e döner) |
| Yasal alt bilgi | Yalnız 02.01–02.02'de çizili | `AuthScreen showLegalFooter` yalnız giriş ve şifre adımlarında |
| E-posta doğrulama (02.07) | Yeni | Yeni e-posta hesabı şifreden sonra `/email-verification`'da bekler (geri yok); bağlantı `rolt://email-verification/confirm?token=…`. Uygulamaya dönünce hesap yeniden okunur (mock bunu bağlantıya dokunmak sayar). Süresi dolmuş/geçersiz bağlantı → `expired` (24 saat, "Giriş ekranına dön" çıkış yapar) |
| Süresi dolmuş sıfırlama linki | Tasarımda artık yalnız doğrulama için süresi dolmuş ekranı var | `reset-link-expired` aynı düzeni kullanır (illüstrasyon, salt okunur e-posta, "Yeni bağlantı gönder", "Giriş ekranına dön") ve kendi 30 dk metnini; geçersiz linkte e-posta alanı gizlenir ve gönder 02.03'ü açar |
| Harita kartı köşe butonu (05.01 `H8ChY`) | Eski "Konumuma git", tasarımda `maximize-2` ile "Haritayı genişlet" oldu | Iconoir `Enlarge`; kart gibi Haritada keşfet'i (07.01) açar. Konum izni kapalıyken karttaki eski "konumu aç" kısayolu kalktı (izin kartı ayrıca var) |
| Harita kartı → Haritada keşfet geçişi (`H8ChY` → `YUUe8`) | Tasarımda animasyon yok; kullanıcı isteği "kart büyüyormuş gibi" | `MapExpandTransition` (root overlay, Reanimated): kartın kopyası kart çerçevesinden ekrana büyür (440 ms, radius 20 → 0, görsel `cover` ile yakınlaşır, rozet ve buton ilk %25'te söner), explore altına animasyonsuz açılır, harita çizilince (Mapbox ilk idle, yedekte hemen; en çok 600 ms) kopya söner ve sheet aşağıdan gelir. Geri (buton + Android geri) tersini oynatır. Native zoom geçişi navigator'lar arası çalışmadığı için kullanılmadı. Explore'da kenar kaydırma kapalı (harita kaydırmayı alır); azaltılmış hareket ayarında animasyonsuz |
| "1 saatte ulaşabileceğin" (05.01 `m3ezc`) | Yeni bölüm; ölçüm yöntemi, konum yokken, boş ve yükleniyor hâlleri çizilmemiş | Sürüş süresi Mapbox Matrix (`driving`, tek istekte 2 saate kadar tüm pencereler; isochrone 60 dk ile sınırlı ve rota başına süre vermediği için kullanılmadı), token yoksa düz çizgi tahmini (`src/features/routes/travelTime/`). Ölçüm cihaz konumundan (~100 m yuvarlanır), yoksa seçilen bölgenin merkezinden; bölge bilinmiyorsa bölüm yok. 2 saat içinde hiç rota yoksa (veya yüklenirken / hata) bölüm gizli, en altta olduğu için geç gelince bir şey kaymaz; seçili sürede rota yoksa tek satır "Bu sürede ulaşabileceğin rota yok.". Ana sayfada en yakın 3 rota. Başlık seçime göre ("30 dakikada / 1 saatte / 2 saatte ulaşabileceğin"). Seçici `SegmentedControl variant="pill"` (40 pt, koyu seçili; Core 52 pt varyantından ayrı çizim) |
| Ulaşım filtresi (05.03 `r7NfD9`) | Çipte chevron var, seçici çizilmemiş | "Tümünü gör" → `/discover/recommended?mode=reach`: seçili sürede başlangıcına ulaşılabilen tüm rotalar, en yakından. `TravelTimeChip` (`brandApplied` zemin, marka çerçeve) "Sırala" gibi native formSheet açar (30 dk / 1 saat / 2 saat içinde), seçince kapanır; seçim ana sayfa seçicisiyle ortak (`DiscoverState.reachWindow`). "N rota" kategori çipi ve aramadan sonraki sayı |
| Rota satır kartı ulaşım satırı | "Başlangıca N dk" ve Hız metriği yalnız bu karelerde | `RouteCard row` opsiyonel `travelTime` (Lucide `navigation` → Iconoir `Navigator`, 12 semibold marka) ve `speed` (`DashboardSpeed`); yalnız ulaşım listelerinde |
| Bildirimler (12.01 `k2k0EC`, `ymxpV`, `d0nYX`) | Gruplar, dokunma hedefi ve zaman biçimi çizilmemiş | Bugün / Bu hafta (6 gün) / Daha önce; zaman sayısal ("2 gün önce", `numeric: 'always'`). Dokununca okundu + yorum, beğeni, takipçi → Profil; rota önerisi → Keşfet; onaylanan öneri → rota detayı. "Tümünü okundu işaretle" okunmamış yokken pasif, hepsi okununca marka renginde "Hepsini gördün!". Boş görsel `HzNPu` export'u |
| iOS 26 form sheet alt kenarı | Tasarımda sheet alta yapışık (`[24,24,0,0]`), iOS 26 kısmi yükseklikteki sheet'i yüzen ve dört köşesi yuvarlak çiziyor | Sistem davranışı (kapatma API'si yok), native sheet korunur (kullanıcı kararı 2026-10-08: alta yapışık özel sheet yerine "Native kalsın"); tam yükseklikte (large detent) kenara yapışır. `fitToContents` sheet'te iOS alt güvenli alanı içeriğin altına kendisi ekler → içerik boşluğu `useSheetBottomPadding` ile (iOS'ta inset tekrar eklenmez), sheet ekranı `contentStyle.backgroundColor` verir (yoksa altta gri şerit) |
| Hesabı sil (10.16, Figma `1005:35917`) | Silinecekler satırlarının ikonları ve "Bir neden seç" seçenekleri görülemedi (Figma limiti) | Satırlar `SettingsRow` (Motorcycle / PathArrow / Bookmark / User), sayılar hesabın verisinden (cihazdaki + örnek sürüşler, örnek hesabın önerdiği rotalar, kayıtlı rotalar). Neden native action sheet (Artık motor sürmüyorum / Başka uygulama / Gizlilik / İşime yaramadı / Diğer), opsiyonel. Onay kutusu işaretlenmeden CTA pasif; "Son onay" diyaloğu e-postayı gösterir. Silince hesap (`AuthService.deleteAccount`), cihazdaki sürüşler, profil ve kayıtlı rotalar silinir, onboarding'e dönülür. "(Kopya)" karesi aynı |
| Profili düzenle (09.05, Figma `1005:35794`) | Bağlantı "rolt.app/@…" | `/edit-profile` (native header). Bağlantı `profileLinkLabel` (roltapp.com/u/…). Kullanıcı adı yalnız değişince kontrol edilir; alınmışsa ilk müsait öneri "Örn. @…" ile; biyografi 160, kutu 79 pt; konum il seçici formSheet ("X, Türkiye"). "Kaydet" ad + geçerli kullanıcı adı ister, başarıda toast |
| Motorum (Akış 17) | Başlıkta "Hesap bilgileri" kalıntısı; 11.02–11.04 arka planında eski boş durum; 11.07'de "Telefon bildirim ayarları" kartı kalıntısı | Başlık "Motorum". Boş durum 11.01 (motor kartı yığını çizimi `BikeStackIllustration`, Figma görseli alınamadığı için kart konumlarından çizildi — doğrulanmadı). Ekle / değiştir tek formSheet'te adım adım (Marka → Model → Üretim yılı → "Motorunu onayla"), `SheetHeader onBack`. Kaydet profilin motorunu yazar (tek motor); toast "Motorun eklendi." / "Motorun güncellendi." / "Motorun silindi.". Detayda bildirim kartı kalıntısı uygulanmadı; sürüş ve km sayısı hesabın sürüşlerinden |
| Topluluk (Akış 22) | Gönderi kartlarının, paylaşım alanının ve arama satırlarının iç çizimi görülemedi (Figma limiti) | `src/features/community` (repository + mock, örnekler tasarım metinlerinden). Kart: yazar (baş harfli avatar, @kullanıcı adı, motor · "Bugün, 08:15"), metin (yalnız metinde 4 satırdan sonra "Devamını gör"), sürüş (başlık, açıklama, tip rozeti, Mesafe / Süre / Ort. hız, harita + foto şeridi), yalnız fotoğrafta tam genişlik karusel ("1/4"), beğeni ve yorum sayısı + paylaş. Paylaşım alanı: metin, fotoğraf (en fazla 4), cihazdaki kayıtlı sürüşlerden biri, görünürlük (Herkese açık / Takipçilerim). "Filtre" toggle'ı yalnız takip edilenler. Yorumlar formSheet, arama tam ekran (son aramalar 10, 2 karakterden 4 öneri, gruplar her birinde 2 + "Tümü (n)", sekme çipleri, sonuç yok). Beğeni / yorum / takip misafirde giriş ister. Yorum sayıları örnek veride gerçek yorum sayısıyla tutarlı (tasarımdaki 87 değil). Sürücü profili (13.03) takip ediliyorsa tek "Takibi bırak" |
| Aktiviteyi paylaş (09.03 / 09.04, Figma `1037:59320`, `1040:18071`) | Paylaşım şablonları özel çizim (213 düğüm); "Story/paylaşım şablonları" açık karar | Uygulanmadı: şablon çizimi Figma limiti yüzünden görülemedi. Profil kartındaki "Paylaş" sistem paylaşımı olarak kalır, 08.11 "Paylaşım görseli oluştur" gizli |
| Form sheet köşe yarıçapı | Tasarımda sheet üst köşeleri 24 (izin sheet'i 28) | Kullanıcı kararı (2026-10-08): `sheetCornerRadius` verilmez; native form sheet'in köşesini sistem cihaza göre ayarlar (iOS 26'da ekran köşesiyle eş merkezli). Harita üzerindeki `@gorhom/bottom-sheet` sheet'leri `radius.xl` (24) kalır |

## Marka ve uygulama ikonu

- Logo kaynakları (Pencil, 1024 px, mavi gradient `#0044FF → #0000FE` + nokta deseni): `qS2Np` (kırpılmış büyük "R"), `HgIhd` (taşan "ROLT"), `e9xZmO` (ortalanmış "ROLT" — **aktif uygulama ikonu**). Wordmark fontu Bakbak One.
- Üç varyantın export'u: `assets/brand/rolt-icon-{r-mark,wordmark-bleed,wordmark}.png`.
- `assets/icon.png` (iOS, köşesiz ve alfasız), `android-icon-{background,foreground,monochrome}.png` (foreground wordmark'ı 66 dp güvenli alanda), `splash-icon.png` (saydam zeminde beyaz wordmark), `favicon.png` hepsi `e9xZmO`'dan türetildi.
- Splash `expo-splash-screen` config plugin ile: zemin `#1515FF` (Pencil `00.01 Launch / Splash`, `f1H2n6`; görünür wordmark ~100 pt), `imageWidth: 200`.
- İkonu değiştirmek için: Pencil'de node'u köşesiz (`cornerRadius: 0`) geçici bir kopyayla `Export` et, kopyayı sil, yukarıdaki dosyaları yeniden üret.

## Mobil yayın (EAS / TestFlight)

- EAS projesi `@milbas/rolt_app` (`app.json` `extra.eas.projectId`), iOS bundle id `com.roltapp.rolt`, yalnız iPhone (`supportsTablet: false`), `usesNonExemptEncryption: false` (yalnız HTTPS; App Store Connect şifreleme sorusu sorulmaz).
- `eas.json` profilleri EAS ortamlarını kullanır (`development` / `preview` / `production`); sürüm numarası EAS'ta (`appVersionSource: remote`, production `autoIncrement`).
- `.env` EAS'a gitmez. `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` üç ortamda EAS değişkeni (`sensitive`); yeni bir `EXPO_PUBLIC_*` gerekirse `npx eas-cli@latest env:set --name … --environment production …`. **`eas env:push` kullanma**: `.env`'de Supabase sunucu sırları var. Mapbox SDK indirmesi 401 verirse `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` (`secret`) eklenir.
- TestFlight: `nvm use && npx eas-cli@latest build --platform ios --profile production --auto-submit`.

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
    ride/[routeId]/       # 06.01–06.07 rotayı sür (hazırlık, duraklar, izin, geri sayım, navigasyon, varış)
    permissions.tsx       # 03.01–03.02 izin sheet'i
    (tabs)/_layout.tsx    # NativeTabs: discover / record / community / profile
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
