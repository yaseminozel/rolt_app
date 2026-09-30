# Mapbox: adres arama, rota hesaplama ve saklama kuralları

Rota Öner akışı (04.1–04.6) ve ileride rota üreten diğer ekranlar için teknik not.
Kaynaklar (erişim 01.10.2026): [Directions API](https://docs.mapbox.com/api/navigation/directions/),
[Geocoding API](https://docs.mapbox.com/api/search/geocoding/), [Search Box API](https://docs.mapbox.com/api/search/search-box/).

## Ekran → servis eşlemesi

| Tasarımdaki parça | Servis | Not |
|---|---|---|
| Başlangıç / ara durak / bitiş için adres arama (04.1 autocomplete) | **Search Box API** `/suggest` → `/retrieve` | Oturum bazlı faturalandırma (`session_token`); `language=tr`, `country=tr`, `proximity` (kullanıcı konumu) |
| "Haritadan seç", haritaya dokununca adres | Search Box `/reverse` (veya Geocoding v6 reverse) | İstek başına faturalandırma |
| "73 km · ~1 sa 45 dk", A→B çizgisi | **Directions API** | İstek başına **en fazla 25 koordinat** (başlangıç + 23 ara durak + bitiş); mesafe (m), süre (s), GeoJSON geometri döner |
| Ara durak ekle / sil / sırala / yer değiştir | Uygulama | Her değişiklikte Directions yeniden çağrılır (debounce) |
| "Haritada düzenle" | `@rnmapbox/maps` | Sürüklenebilir noktalar, dokunarak durak ekleme |

## Kısıtlar

1. **Saklama:**
   - Search Box API: "All data returned by the Search Box API endpoints is only available for temporary use." Kalıcı saklama için Mapbox satış ekibi gerekir.
   - Geocoding API varsayılan (temporary) sonuçlar önbelleğe alınamaz; **`permanent=true`** sonuçları süresiz saklanabilir (kredi kartı tanımlı hesap veya kurumsal sözleşme gerekir).
   - Directions dokümanı rota geometrisinin saklanması hakkında açık kural vermez → kalıcı saklamadan önce Mapbox şartları/satış ile teyit edilmeli.
2. **Motosiklet profili yok:** Profiller `driving`, `driving-traffic`, `walking`, `cycling`. Motosiklet için `driving` + isteğe bağlı `exclude=motorway,toll` (ve `ferry`, `unpaved`).
3. **Türkiye kapsamı:** Search Box dokümanı desteklenen bölgeleri "United States, Canada, and Europe" olarak listeliyor. Türkiye'deki adres/POI kalitesi gerçek token ile test edilmeli; zayıfsa Geocoding v6 (dünya geneli) kullanılır.
4. **Maliyet:** Autocomplete her tuşta istek üretir → en az 2–3 karakter + debounce; Search Box'ta aynı oturumdaki `/suggest` çağrıları + tek `/retrieve` tek oturum sayılır.

## Karar (MVP)

- Harita, adres arama ve rota hesabı Mapbox ile, **istemciden public token** (`pk.`) kullanılarak.
- Kaydedilen rota önerisinde yalnızca kullanıcının seçtiği **noktalar** (koordinat + ad) saklanır; adlar gönderimde **Geocoding `permanent=true`** ile yeniden çözülür (backend tarafında, Supabase gelince).
- Çizgi gösterilirken Directions'tan yeniden hesaplanır (geometri kalıcı saklanmaz) — saklama kuralı riski yok.
- Token yoksa (veya Expo Go'da harita yokken) servisler **mock** uygulamaya düşer; akış uçtan uca denenebilir.

## Sonraki adım (Supabase ile)

- Rota geometrisini kalıcı saklamak ve motosiklete özel tercihler (virajlı / manzaralı) için self-host **Valhalla** (OpenStreetMap, `motorcycle` costing, sonuçları saklamak serbest; OSM atfı gerekli). Harita Mapbox'ta kalır, yalnızca routing sağlayıcısı değişir (`EXPO_PUBLIC_ROUTING_PROVIDER`).
- Gönderim, kalıcı adlandırma (permanent geocoding) ve Valhalla çağrıları backend'de (token istemciye çıkmaz).

## Kod

- Arayüzler: `src/features/route-suggestion/services/` → `PlaceSearchService`, `RoutingService`.
- Uygulamalar: Mapbox (`mapbox*.ts`) ve mock; seçim `.env`'deki token ve `EXPO_PUBLIC_ROUTING_PROVIDER` ile.
