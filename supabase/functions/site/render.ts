// HTML of the roltapp.com pages served by the `site` function. Same look as the landing page
// (web/index.html): ink background, brand blue, Inter, the Bakbak One wordmark, Barlow Condensed
// for numbers. Every inserted value goes through `esc` (names, titles and notes are user content).

import type { Locale } from '../_shared/env.ts';
import { copyFor, fill, formatDate, formatKm, formatMinutes, formatNumber, slugify } from './copy.ts';
import { storageUrl, type Ride, type Rider, type Route } from './data.ts';

export const SITE = 'https://roltapp.com';
const FALLBACK_IMAGE = `${SITE}/og.jpg`;

export const esc = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** JSON inside <script>: no "</script>" break-out. */
const jsonScript = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

type Head = {
  locale: Locale;
  title: string;
  description: string;
  path: string;
  image?: string | null;
  /** Share pages (/u/, /r/) stay out of search results; routes and lists are indexed. */
  index: boolean;
  type?: 'website' | 'article' | 'profile';
  jsonLd?: unknown;
};

const STYLES = `
:root{--ink:#0b0b13;--white:#fff;--muted:rgba(255,255,255,.66);--faint:rgba(255,255,255,.42);--line:rgba(255,255,255,.1);--card:rgba(255,255,255,.045);--brand:#1515ff;--brand-pressed:#1111d9;--accent:#3bd3b8;--hazard:#ffd60a}
*{box-sizing:border-box;margin:0;padding:0}
html{background:var(--ink);color-scheme:dark}
body{background:var(--ink);color:var(--white);font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.5}
a{color:inherit;text-decoration:none}
img{display:block;max-width:100%}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.glow{position:fixed;z-index:-1;left:50%;top:-420px;width:900px;height:900px;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(21,21,255,.38),rgba(21,21,255,0) 70%);pointer-events:none}
header.top{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
.logo{font-family:'Bakbak One',sans-serif;font-size:30px;letter-spacing:1px;line-height:1}
.navlink{font-size:15px;font-weight:500;color:var(--muted);padding:10px 4px}
.navlink:hover{color:var(--white)}
.crumbs{font-size:14px;color:var(--faint);margin:12px 0 10px}
.crumbs a{color:var(--muted)}
.crumbs a:hover{color:var(--white)}
h1{font-size:clamp(30px,5vw,44px);line-height:1.1;font-weight:700;letter-spacing:-.02em}
h2{font-size:20px;line-height:1.3;font-weight:600;margin:0 0 14px}
.lede{font-size:17px;color:var(--muted);margin-top:10px;max-width:640px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.chip{display:inline-flex;align-items:center;height:30px;padding:0 12px;border-radius:999px;font-size:13px;font-weight:600;border:1px solid var(--line);color:var(--muted)}
.chip.brand{background:var(--brand);border-color:var(--brand);color:var(--white)}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:32px;margin:28px 0 56px;align-items:start}
.cover{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:20px;background:var(--card)}
.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0 0}
.metric{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 16px}
.metric dt{font-size:13px;color:var(--faint)}
.metric dd{font-family:'Barlow Condensed','Inter',sans-serif;font-weight:700;font-size:28px;line-height:1.15;letter-spacing:.01em}
section.block{margin-top:36px}
.way{display:flex;align-items:center;gap:12px;font-size:17px;font-weight:500}
.way .arrow{color:var(--faint)}
.map{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:16px;border:1px solid var(--line);background:var(--card)}
.stops{list-style:none;position:relative;padding-left:26px}
.stops:before{content:'';position:absolute;left:6px;top:10px;bottom:10px;border-left:1.5px dashed var(--faint)}
.stops li{position:relative;padding:8px 0}
.stops li:before{content:'';position:absolute;left:-26px;top:14px;width:13px;height:13px;border-radius:50%;background:var(--ink);border:2px solid var(--white)}
.stops li.end:before,.stops li.start:before{background:var(--white)}
.stops .name{font-weight:500}
.stops .meta{font-size:14px;color:var(--faint)}
.notes{white-space:pre-line;color:var(--muted);background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px}
.photos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.photos img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;background:var(--card)}
.cta{position:sticky;top:20px;background:var(--brand);border-radius:20px;padding:24px;box-shadow:0 20px 60px rgba(21,21,255,.35)}
.cta h2{font-size:22px;margin-bottom:8px}
.cta p{color:rgba(255,255,255,.8);font-size:15px}
.btn{display:flex;align-items:center;justify-content:center;height:48px;padding:0 22px;border-radius:12px;font-size:15px;font-weight:600;margin-top:18px;background:var(--white);color:var(--ink)}
.btn:active{opacity:.85}
.btn.ghost{background:transparent;color:var(--white);border:1px solid rgba(255,255,255,.4);margin-top:10px}
.author{display:flex;align-items:center;gap:10px;margin-top:20px;font-size:14px;color:rgba(255,255,255,.8)}
.avatar{width:36px;height:36px;border-radius:50%;object-fit:cover;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;flex:none}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.card{display:block;border-radius:18px;transition:transform .2s ease}
.card:hover{transform:translateY(-2px)}
.card img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:16px;background:var(--card)}
.card .name{font-size:17px;font-weight:600;margin-top:12px}
.card .sub{font-size:14px;color:var(--faint);margin-top:2px}
.card .meta{font-size:14px;color:var(--muted);margin-top:6px}
.city{margin-top:44px}
.city-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px}
.city-head a{font-size:14px;font-weight:500;color:var(--muted)}
.list-head{margin:20px 0 8px}
.share{max-width:480px;margin:24px auto 64px;text-align:center}
.share .media{width:100%;aspect-ratio:1200/630;object-fit:cover;border-radius:20px;border:1px solid var(--line);background:var(--card);margin-bottom:24px}
.share h1{font-size:28px}
.share .lede{margin:10px auto 0}
.share .metrics{grid-template-columns:repeat(3,minmax(0,1fr));text-align:left}
.share .avatar.big{width:96px;height:96px;font-size:34px;margin:0 auto 20px}
.share .btn{background:var(--brand);color:var(--white)}
.share .btn.ghost{background:transparent}
footer{border-top:1px solid var(--line);padding:28px 0 40px;font-size:14px;color:var(--faint);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
@media (max-width:900px){.layout{grid-template-columns:1fr}.cta{position:static}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.grid{grid-template-columns:1fr}.photos{grid-template-columns:repeat(2,minmax(0,1fr))}.share .metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.share .metric dd{font-size:22px}}
@media (prefers-reduced-motion:reduce){.card{transition:none}}
`;

function page(head: Head, body: string, script = '') {
  const t = copyFor(head.locale);
  const url = `${SITE}${head.path}`;
  const image = head.image || FALLBACK_IMAGE;
  return `<!doctype html>
<html lang="${head.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(head.title)}</title>
<meta name="description" content="${esc(head.description)}">
${head.index ? `<link rel="canonical" href="${esc(url)}">` : '<meta name="robots" content="noindex">'}
<meta name="theme-color" content="#0B0B13">
<meta property="og:site_name" content="ROLT">
<meta property="og:type" content="${head.type ?? 'website'}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(head.title)}">
<meta property="og:description" content="${esc(head.description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${head.locale === 'en' ? 'en_US' : 'tr_TR'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bakbak+One&family=Barlow+Condensed:wght@700&family=Inter:wght@400;500;600;700&display=swap">
<style>${STYLES}</style>
${head.jsonLd ? `<script type="application/ld+json">${jsonScript(head.jsonLd)}</script>` : ''}
</head>
<body>
<div class="glow" aria-hidden="true"></div>
<div class="wrap">
<header class="top"><a class="logo" href="/" aria-label="ROLT">ROLT</a><a class="navlink" href="/rotalar">${esc(t.nav.routes)}</a></header>
${body}
<footer><span>© ROLT · roltapp.com</span><span>${esc(t.tagline)}</span></footer>
</div>
${script}
</body>
</html>`;
}

/** Phones with the app installed switch over at once (share links only); others stay on the page. */
const openAppScript = (deepLink: string) =>
  `<script>if(/iPhone|iPad|Android/i.test(navigator.userAgent)){setTimeout(function(){location.href=${jsonScript(deepLink)}},120)}</script>`;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toLocaleUpperCase('tr-TR'))
    .join('') || 'R';

function avatar(person: { name: string; avatarPath?: string | null }, className = 'avatar') {
  return person.avatarPath
    ? `<img class="${className}" src="${esc(storageUrl('avatars', person.avatarPath, { width: 192, height: 192 }))}" alt="" loading="lazy">`
    : `<span class="${className}" aria-hidden="true">${esc(initials(person.name))}</span>`;
}

const tagLabel = (locale: Locale, tag: string) => (copyFor(locale).tags as Record<string, string>)[tag] ?? tag;

const routeImage = (route: Pick<Route, 'coverPath'>, width: number, height: number) =>
  route.coverPath ? storageUrl('route-photos', route.coverPath, { width, height }) : null;

export const routePath = (id: string) => `/rota/${encodeURIComponent(id)}`;
export const cityPath = (city: string) => `/rotalar/${slugify(city)}`;

function routeCard(locale: Locale, route: Route) {
  const image = routeImage(route, 720, 450);
  return `<a class="card" href="${routePath(route.id)}">
${image ? `<img src="${esc(image)}" alt="" loading="lazy">` : ''}
<p class="name">${esc(route.name)}</p>
<p class="sub">${esc(route.summary)}</p>
<p class="meta">${esc(`${formatKm(locale, route.distanceKm)} · ${formatMinutes(locale, route.durationMinutes)} · ${tagLabel(locale, route.tag)}`)}</p>
</a>`;
}

const metric = (label: string, value: string) => `<div class="metric"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;

export function routePage(locale: Locale, route: Route, related: Route[]) {
  const t = copyFor(locale);
  const tag = tagLabel(locale, route.tag);
  const title = `${route.name} · ${route.city} ${t.route.titleSuffix} | ROLT`;
  const description = fill(t.route.description, {
    city: route.city,
    distance: formatKm(locale, route.distanceKm),
    tag: tag.toLocaleLowerCase(locale === 'en' ? 'en-US' : 'tr-TR'),
    start: route.startName,
    end: route.endName,
    summary: route.summary,
  }).trim();
  const cover = routeImage(route, 1600, 900);
  const stops = route.stops?.length
    ? `<section class="block"><h2>${esc(t.route.stops)}</h2><ol class="stops">${route.stops
        .map(
          (stop) =>
            `<li class="${esc(stop.kind)}"><p class="name">${esc(stop.name)}</p><p class="meta">${esc(
              stop.kind === 'start'
                ? `0 ${t.units.km}`
                : `${formatKm(locale, stop.distanceKm)} · ${formatMinutes(locale, stop.durationMinutes)}`,
            )}</p></li>`,
        )
        .join('')}</ol></section>`
    : '';
  const photos = route.photoPaths.length
    ? `<section class="block"><h2>${esc(t.route.photos)}</h2><div class="photos">${route.photoPaths
        .slice(0, 6)
        .map((path) => `<img src="${esc(storageUrl('route-photos', path, { width: 480, height: 480 }))}" alt="" loading="lazy">`)
        .join('')}</div></section>`
    : '';
  const notes = route.notes?.trim()
    ? `<section class="block"><h2>${esc(t.route.notes)}</h2><p class="notes">${esc(route.notes.trim())}</p></section>`
    : '';
  const more = related.length
    ? `<section class="block"><div class="city-head"><h2>${esc(fill(t.route.more, { city: route.city }))}</h2><a href="${cityPath(route.city)}">${esc(t.list.seeAll)}</a></div><div class="grid">${related
        .map((item) => routeCard(locale, item))
        .join('')}</div></section>`
    : '';
  const author = route.author
    ? `<div class="author">${avatar(route.author)}<span>${esc(t.route.by)}: ${esc(route.author.name)}</span></div>`
    : '';

  const body = `<nav class="crumbs"><a href="/rotalar">${esc(t.route.breadcrumb)}</a> › <a href="${cityPath(route.city)}">${esc(route.city)}</a></nav>
<h1>${esc(route.name)}</h1>
<p class="lede">${esc(route.summary)}</p>
<div class="chips"><span class="chip brand">${esc(tag)}</span><span class="chip">${esc((t.difficulty as Record<string, string>)[route.difficulty] ?? route.difficulty)}</span><span class="chip">${esc((t.surface as Record<string, string>)[route.surface] ?? route.surface)}</span></div>
<div class="layout">
<article>
${cover ? `<img class="cover" src="${esc(cover)}" alt="${esc(route.name)}">` : ''}
<dl class="metrics">
${metric(t.metrics.distance, formatKm(locale, route.distanceKm))}
${metric(t.metrics.duration, formatMinutes(locale, route.durationMinutes))}
${metric(t.metrics.curves, formatNumber(locale, route.curveCount))}
${metric(t.metrics.climb, `${formatNumber(locale, Math.max(0, route.elevationGainM))} ${t.units.m}`)}
</dl>
<section class="block"><h2>${esc(t.route.way)}</h2><p class="way"><span>${esc(route.startName)}</span><span class="arrow" aria-hidden="true">→</span><span>${esc(route.endName)}</span></p></section>
<section class="block"><h2>${esc(t.route.map)}</h2><img class="map" src="/harita/rota/${encodeURIComponent(route.id)}.png" alt="${esc(t.route.map)}: ${esc(route.name)}" loading="lazy"></section>
${stops}
${photos}
${notes}
</article>
<aside class="cta">
<h2>${esc(t.route.ctaTitle)}</h2>
<p>${esc(t.route.ctaText)}</p>
<a class="btn" href="rolt://route/${encodeURIComponent(route.id)}">${esc(t.openApp)}</a>
<a class="btn ghost" href="/">${esc(t.waitlist)}</a>
${author}
</aside>
</div>
${more}`;

  return page(
    {
      locale,
      title,
      description,
      path: routePath(route.id),
      image: routeImage(route, 1200, 630),
      index: true,
      type: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t.route.breadcrumb, item: `${SITE}/rotalar` },
          { '@type': 'ListItem', position: 2, name: route.city, item: `${SITE}${cityPath(route.city)}` },
          { '@type': 'ListItem', position: 3, name: route.name, item: `${SITE}${routePath(route.id)}` },
        ],
      },
    },
    body,
  );
}

/** /rotalar: every route grouped by city (most routes first); /rotalar/<city>: one city. */
export function routeListPage(locale: Locale, routes: Route[], city: string | null) {
  const t = copyFor(locale);
  if (city) {
    const title = `${fill(t.list.cityTitle, { city })} | ROLT`;
    const body = `<nav class="crumbs"><a href="/rotalar">${esc(t.route.breadcrumb)}</a> › ${esc(city)}</nav>
<div class="list-head"><h1>${esc(fill(t.list.cityTitle, { city }))}</h1><p class="lede">${esc(fill(t.list.cityIntro, { city, count: routes.length }))}</p></div>
<div class="grid" style="margin:28px 0 56px">${routes.map((route) => routeCard(locale, route)).join('')}</div>`;
    return page(
      {
        locale,
        title,
        description: fill(t.list.cityIntro, { city, count: routes.length }),
        path: cityPath(city),
        image: routes[0] ? routeImage(routes[0], 1200, 630) : null,
        index: true,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: t.route.breadcrumb, item: `${SITE}/rotalar` },
            { '@type': 'ListItem', position: 2, name: city, item: `${SITE}${cityPath(city)}` },
          ],
        },
      },
      body,
    );
  }

  const byCity = new Map<string, Route[]>();
  for (const route of routes) {
    byCity.set(route.city, [...(byCity.get(route.city) ?? []), route]);
  }
  const cities = [...byCity.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'tr'));
  const body = `<div class="list-head"><h1>${esc(t.list.title)}</h1><p class="lede">${esc(t.list.intro)}</p></div>
${cities
  .map(
    ([name, items]) => `<section class="city"><div class="city-head"><h2>${esc(name)} · ${esc(fill(t.list.count, { count: items.length }))}</h2>${
      items.length > 6 ? `<a href="${cityPath(name)}">${esc(t.list.seeAll)}</a>` : ''
    }</div><div class="grid">${items
      .slice(0, 6)
      .map((route) => routeCard(locale, route))
      .join('')}</div></section>`,
  )
  .join('')}
<div style="height:56px"></div>`;
  return page(
    {
      locale,
      title: `${t.list.title} | ROLT`,
      description: t.list.intro,
      path: '/rotalar',
      image: routes[0] ? routeImage(routes[0], 1200, 630) : null,
      index: true,
    },
    body,
  );
}

export function ridePage(locale: Locale, rideId: string, ride: Ride | null) {
  const t = copyFor(locale);
  const deepLink = `rolt://rides/${encodeURIComponent(rideId)}`;
  const path = `/r/${encodeURIComponent(rideId)}`;
  if (!ride) {
    // Private, followers-only, removed or unknown: the same page as before, nothing about the ride.
    const body = `<div class="share"><h1>${esc(t.ride.titleAnonymous)}</h1><p class="lede">${esc(t.ride.text)}</p>
<a class="btn" href="${esc(deepLink)}">${esc(t.openApp)}</a><a class="btn ghost" href="/">${esc(t.noApp)}</a></div>`;
    return page({ locale, title: t.ride.titleAnonymous, description: t.ride.text, path, index: false }, body, openAppScript(deepLink));
  }
  const name = ride.author.name || `@${ride.author.handle}`;
  const title = ride.title?.trim() || ride.routeName || t.ride.titleAnonymous;
  const heading = fill(t.ride.title, { name });
  const movingMinutes = Math.max(0, ride.durationS - (ride.breakS ?? 0)) / 60;
  const averageKmh = movingMinutes > 0 ? ride.distanceM / 1000 / (movingMinutes / 60) : 0;
  const summary = [
    formatKm(locale, ride.distanceM / 1000),
    formatMinutes(locale, ride.durationS / 60),
    ride.city,
    formatDate(locale, ride.startedAt),
  ]
    .filter(Boolean)
    .join(' · ');
  const image = ride.photoPaths[0]
    ? storageUrl('ride-photos', ride.photoPaths[0], { width: 1200, height: 630 })
    : ride.preview?.length
      ? `${SITE}/harita/r/${encodeURIComponent(ride.id)}.png`
      : null;
  const media = ride.preview?.length
    ? `<img class="media" src="/harita/r/${encodeURIComponent(ride.id)}.png" alt="">`
    : image
      ? `<img class="media" src="${esc(image)}" alt="">`
      : '';
  const body = `<div class="share">${media}
<h1>${esc(title)}</h1>
<p class="lede">${esc(`${name} · ${summary}`)}</p>
<dl class="metrics">
${metric(t.metrics.distance, formatKm(locale, ride.distanceM / 1000))}
${metric(t.metrics.duration, formatMinutes(locale, ride.durationS / 60))}
${metric(t.metrics.averageSpeed, `${formatNumber(locale, averageKmh)} ${t.units.kmh}`)}
</dl>
<a class="btn" href="${esc(deepLink)}">${esc(t.openApp)}</a><a class="btn ghost" href="/">${esc(t.noApp)}</a></div>`;
  return page(
    { locale, title: `${title} · ${heading}`, description: summary, path, image, index: false, type: 'article' },
    body,
    openAppScript(deepLink),
  );
}

export function riderPage(locale: Locale, handle: string, rider: Rider | null) {
  const t = copyFor(locale);
  const shownHandle = rider?.handle || handle;
  const deepLink = `rolt://u/${encodeURIComponent(shownHandle)}`;
  const path = `/u/${encodeURIComponent(shownHandle)}`;
  const title = fill(t.rider.title, { handle: shownHandle });
  if (!rider) {
    const body = `<div class="share"><h1>${esc(title)}</h1><p class="lede">${esc(t.rider.text)}</p>
<a class="btn" href="${esc(deepLink)}">${esc(t.openApp)}</a><a class="btn ghost" href="/">${esc(t.noApp)}</a></div>`;
    return page({ locale, title, description: t.rider.text, path, index: false }, body, openAppScript(deepLink));
  }
  const description = fill(t.rider.description, {
    name: rider.name,
    rides: formatNumber(locale, rider.rideCount),
    followers: formatNumber(locale, rider.followerCount),
  });
  const body = `<div class="share">${avatar(rider, 'avatar big')}
<h1>${esc(rider.name)}</h1>
<p class="lede">${esc([`@${rider.handle}`, rider.city].filter(Boolean).join(' · '))}</p>
${rider.bio ? `<p class="lede">${esc(rider.bio)}</p>` : ''}
<dl class="metrics" style="grid-template-columns:repeat(2,minmax(0,1fr))">
${metric(t.metrics.rides, formatNumber(locale, rider.rideCount))}
${metric(t.metrics.followers, formatNumber(locale, rider.followerCount))}
</dl>
<a class="btn" href="${esc(deepLink)}">${esc(t.openApp)}</a><a class="btn ghost" href="/">${esc(t.noApp)}</a></div>`;
  return page(
    {
      locale,
      title: `${rider.name} (@${rider.handle}) · ROLT`,
      description,
      path,
      image: rider.avatarPath ? storageUrl('avatars', rider.avatarPath, { width: 630, height: 630 }) : null,
      index: false,
      type: 'profile',
    },
    body,
    openAppScript(deepLink),
  );
}

export function notFoundPage(locale: Locale, path: string) {
  const t = copyFor(locale);
  const body = `<div class="share"><h1>${esc(t.notFound.title)}</h1><p class="lede">${esc(t.notFound.text)}</p>
<a class="btn" href="/rotalar">${esc(t.nav.routes)}</a><a class="btn ghost" href="/">${esc(t.notFound.home)}</a></div>`;
  return page({ locale, title: `${t.notFound.title} · ROLT`, description: t.notFound.text, path, index: false }, body);
}

export function sitemap(routes: Route[]) {
  const cities = [...new Set(routes.map((route) => route.city))];
  const urls = [
    { loc: `${SITE}/`, lastmod: null as string | null },
    { loc: `${SITE}/rotalar`, lastmod: null },
    ...cities.map((city) => ({ loc: `${SITE}${cityPath(city)}`, lastmod: null })),
    ...routes.map((route) => ({ loc: `${SITE}${routePath(route.id)}`, lastmod: route.publishedAt?.slice(0, 10) ?? null })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `<url><loc>${esc(url.loc)}</loc>${url.lastmod ? `<lastmod>${esc(url.lastmod)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
}
