// Texts of the roltapp.com pages served by the `site` function (TR / EN, picked from
// Accept-Language; crawlers without one get Turkish). Labels match the app's i18n files
// (`routes:tags.*`, `routes:difficulty.*`, `routes:surface.*`, `rides:types.*`).

import type { Locale } from '../_shared/env.ts';

const tr = {
  siteName: 'ROLT',
  tagline: 'Motosikletçiler için rota keşfetme, sürüş kaydetme ve paylaşma uygulaması.',
  nav: { routes: 'Rotalar' },
  openApp: 'ROLT’ta aç',
  noApp: 'Uygulama yok mu? Bekleme listesine katıl',
  waitlist: 'Bekleme listesine katıl',
  metrics: {
    distance: 'Mesafe',
    duration: 'Süre',
    curves: 'Viraj',
    climb: 'Tırmanış',
    averageSpeed: 'Ort. hız',
    rides: 'Sürüş',
    followers: 'Takipçi',
  },
  units: { km: 'km', m: 'm', kmh: 'km/sa', hour: 'sa', minute: 'dk' },
  route: {
    titleSuffix: 'motosiklet rotası',
    breadcrumb: 'Rotalar',
    way: 'Güzergah',
    stops: 'Rota durakları',
    notes: 'Notlar',
    photos: 'Rota görselleri',
    map: 'Rota haritası',
    ctaTitle: 'Bu rotayı ROLT’ta sür',
    ctaText: 'Adım adım sesli yönlendirmeyle sür, sürüşünü kaydet ve paylaş.',
    more: '{city} çevresinde diğer rotalar',
    by: 'Hazırlayan',
    description: '{city} çıkışlı {distance} {tag} motosiklet rotası: {start} → {end}. {summary}',
  },
  list: {
    title: 'Motosiklet rotaları',
    intro: 'Türkiye’nin dört bir yanından, motosikletçilerin seçtiği sahil, viraj ve doğa rotaları.',
    cityTitle: '{city} motosiklet rotaları',
    cityIntro: '{city} çevresinde {count} motosiklet rotası: mesafe, süre ve viraj bilgileriyle.',
    seeAll: 'Tümünü gör',
    count: '{count} rota',
  },
  ride: {
    title: '{name} ROLT’ta bir sürüş paylaştı',
    titleAnonymous: 'ROLT’ta bir sürüş',
    text: 'Rotayı, istatistikleri ve fotoğrafları görmek için sürüşü ROLT uygulamasında aç.',
    on: '{date}',
  },
  rider: {
    title: '@{handle} ROLT’ta',
    text: 'Sürüşlerini ve rotalarını görmek için profili ROLT uygulamasında aç.',
    description: '{name} ROLT’ta: {rides} sürüş, {followers} takipçi.',
  },
  notFound: {
    title: 'Sayfa bulunamadı',
    text: 'Aradığın sayfa kaldırılmış ya da hiç olmamış olabilir.',
    home: 'Ana sayfaya dön',
  },
  tags: { coast: 'Sahil', curvy: 'Virajlı', scenic: 'Manzara', city: 'Şehir İçi', nature: 'Doğa', offRoad: 'Off-road', longTour: 'Uzun tur' },
  difficulty: { easy: 'Kolay', moderate: 'Orta', hard: 'Zorlu' },
  surface: { asphalt: 'Asfalt', mixed: 'Karışık', gravel: 'Toprak' },
  rideTypes: { city: 'Şehir İçi', longRide: 'Uzun Yol', nature: 'Doğa', curves: 'Viraj', sport: 'Sportif', offRoad: 'Off-road', coast: 'Sahil' },
  mapAttribution: '© Mapbox © OpenStreetMap',
};

type Copy = typeof tr;

const en: Copy = {
  siteName: 'ROLT',
  tagline: 'The app for motorcyclists to discover routes, record rides and share them.',
  nav: { routes: 'Routes' },
  openApp: 'Open in ROLT',
  noApp: 'Don’t have the app? Join the waitlist',
  waitlist: 'Join the waitlist',
  metrics: {
    distance: 'Distance',
    duration: 'Time',
    curves: 'Curves',
    climb: 'Climb',
    averageSpeed: 'Avg. speed',
    rides: 'Rides',
    followers: 'Followers',
  },
  units: { km: 'km', m: 'm', kmh: 'km/h', hour: 'h', minute: 'min' },
  route: {
    titleSuffix: 'motorcycle route',
    breadcrumb: 'Routes',
    way: 'Route',
    stops: 'Stops',
    notes: 'Notes',
    photos: 'Route photos',
    map: 'Route map',
    ctaTitle: 'Ride this route with ROLT',
    ctaText: 'Turn-by-turn voice guidance, record your ride and share it.',
    more: 'More routes around {city}',
    by: 'By',
    description: '{distance} {tag} motorcycle route from {city}: {start} → {end}. {summary}',
  },
  list: {
    title: 'Motorcycle routes',
    intro: 'Coastal roads, curves and nature routes across Türkiye, picked by riders.',
    cityTitle: 'Motorcycle routes in {city}',
    cityIntro: '{count} motorcycle routes around {city}, with distance, time and curves.',
    seeAll: 'See all',
    count: '{count} routes',
  },
  ride: {
    title: '{name} shared a ride on ROLT',
    titleAnonymous: 'A ride on ROLT',
    text: 'Open the ride in the ROLT app to see the route, stats and photos.',
    on: '{date}',
  },
  rider: {
    title: '@{handle} on ROLT',
    text: 'Open the profile in the ROLT app to see their rides and routes.',
    description: '{name} on ROLT: {rides} rides, {followers} followers.',
  },
  notFound: {
    title: 'Page not found',
    text: 'The page you’re looking for was removed or never existed.',
    home: 'Back to the home page',
  },
  tags: { coast: 'Coast', curvy: 'Curvy', scenic: 'Scenic', city: 'City', nature: 'Nature', offRoad: 'Off-road', longTour: 'Long tour' },
  difficulty: { easy: 'Easy', moderate: 'Moderate', hard: 'Challenging' },
  surface: { asphalt: 'Asphalt', mixed: 'Mixed', gravel: 'Gravel' },
  rideTypes: { city: 'City', longRide: 'Long ride', nature: 'Nature', curves: 'Curves', sport: 'Sport', offRoad: 'Off-road', coast: 'Coast' },
  mapAttribution: '© Mapbox © OpenStreetMap',
};

export const copyFor = (locale: Locale): Copy => (locale === 'en' ? en : tr);

/** `fill('{city} rotaları', { city: 'Antalya' })`. */
export const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));

const numberFormat = (locale: Locale, digits: number) =>
  new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'tr-TR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const formatNumber = (locale: Locale, value: number, digits = 0) => numberFormat(locale, digits).format(value);

export function formatKm(locale: Locale, km: number) {
  return `${formatNumber(locale, km, km < 100 ? 1 : 0)} ${copyFor(locale).units.km}`;
}

export function formatMinutes(locale: Locale, minutes: number) {
  const units = copyFor(locale).units;
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (hours === 0) {
    return `${rest} ${units.minute}`;
  }
  return rest === 0 ? `${hours} ${units.hour}` : `${hours} ${units.hour} ${rest} ${units.minute}`;
}

export function formatDate(locale: Locale, iso: string) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(iso));
}

/** URL slug of a Turkish place name: "Muğla" → "mugla", "İzmir" → "izmir". */
export function slugify(value: string) {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return value
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıiöşüâîû]/g, (char) => map[char] ?? char)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
