// Server-rendered pages of roltapp.com (the website's nginx proxies these paths here):
//
//   /rota/<id>                 route page (indexed): photos, metrics, map, stops, "ROLT'ta aç"
//   /rotalar, /rotalar/<city>  route lists (indexed)
//   /r/<ride id>, /u/<handle>  share links: real title, text and picture for link previews
//                              (WhatsApp, Instagram, iMessage read the HTML, not JavaScript),
//                              then the app opens as before (noindex)
//   /harita/rota/<id>.png, /harita/r/<id>.png   static map of the line (Mapbox), cached
//   /sitemap.xml
//
// Reads with the anon key only (see data.ts), so nothing private can reach a page.

import { toLocale, type Locale } from '../_shared/env.ts';
import { slugify } from './copy.ts';
import { getRide, getRiderByHandle, getRoute, listRoutes } from './data.ts';
import { staticMapUrl } from './map.ts';
import { notFoundPage, ridePage, riderPage, routeListPage, routePage, sitemap, SITE } from './render.ts';

const localeOf = (req: Request): Locale =>
  toLocale(/^en\b/i.test(req.headers.get('accept-language') ?? '') ? 'en' : 'tr');

function respond(body: string, options: { status?: number; type?: string; maxAge?: number } = {}) {
  return new Response(body, {
    status: options.status ?? 200,
    headers: {
      'Content-Type': options.type ?? 'text/html; charset=utf-8',
      // Short: a renamed route or a ride made private should not linger in previews.
      'Cache-Control': `public, max-age=${options.maxAge ?? 300}`,
      Vary: 'Accept-Language',
    },
  });
}

const noIndex = (response: Response) => {
  response.headers.set('X-Robots-Tag', 'noindex');
  return response;
};

/** The path as the site sees it; the edge runtime may pass "/site/…" or "/functions/v1/site/…". */
function sitePath(req: Request) {
  const path = new URL(req.url).pathname.replace(/^\/functions\/v1/, '').replace(/^\/site(?=\/|$)/, '');
  return path.replace(/\/+$/, '') || '/';
}

async function mapImage(segments: [number, number][][] | null | undefined) {
  const url = segments?.length ? staticMapUrl(segments, 1200, 630) : null;
  if (!url) {
    return Response.redirect(`${SITE}/og.jpg`, 302);
  }
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    console.error('static map failed', upstream.status);
    return Response.redirect(`${SITE}/og.jpg`, 302);
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

async function handle(req: Request): Promise<Response> {
  const locale = localeOf(req);
  const path = sitePath(req);
  const parts = path.split('/').filter(Boolean).map((part) => decodeURIComponent(part));

  if (path === '/sitemap.xml') {
    return respond(sitemap(await listRoutes()), { type: 'application/xml; charset=utf-8', maxAge: 3600 });
  }

  if (parts[0] === 'rotalar' && parts.length <= 2) {
    const routes = await listRoutes();
    if (parts.length === 1) {
      return respond(routeListPage(locale, routes, null));
    }
    const inCity = routes.filter((route) => slugify(route.city) === parts[1]);
    if (inCity.length === 0) {
      return noIndex(respond(notFoundPage(locale, path), { status: 404 }));
    }
    return respond(routeListPage(locale, inCity, inCity[0]!.city));
  }

  if (parts[0] === 'rota' && parts.length === 2) {
    const route = await getRoute(parts[1]!);
    if (!route) {
      return noIndex(respond(notFoundPage(locale, path), { status: 404 }));
    }
    const related = (await listRoutes()).filter((item) => item.city === route.city && item.id !== route.id).slice(0, 3);
    return respond(routePage(locale, route, related));
  }

  if (parts[0] === 'r' && parts.length === 2) {
    return noIndex(respond(ridePage(locale, parts[1]!, await getRide(parts[1]!))));
  }

  if (parts[0] === 'u' && parts.length === 2) {
    return noIndex(respond(riderPage(locale, parts[1]!, await getRiderByHandle(parts[1]!))));
  }

  if (parts[0] === 'harita' && parts.length === 3 && parts[2]!.endsWith('.png')) {
    const id = parts[2]!.slice(0, -'.png'.length);
    if (parts[1] === 'rota') {
      const route = await getRoute(id);
      return noIndex(await mapImage(route ? [route.coordinates] : null));
    }
    if (parts[1] === 'r') {
      const ride = await getRide(id);
      return noIndex(await mapImage(ride?.preview));
    }
  }

  return noIndex(respond(notFoundPage(locale, path), { status: 404 }));
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }
  try {
    return await handle(req);
  } catch (error) {
    console.error('site page failed', error);
    // nginx serves the old static page for share links when this fails.
    return new Response('Unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
});
