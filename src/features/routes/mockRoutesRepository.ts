import { matchesSearch } from '@/lib/searchText';

import { PLACE_FIXTURES } from './fixtures/places';
import { RECOMMENDED_LIST_IDS, RECOMMENDED_ROUTE_IDS, ROUTE_FIXTURES } from './fixtures/routes';
import { distanceKm, isInBounds } from './geo';
import { filterRoutes } from './routeFilter';
import { sortRoutes } from './routeSort';
import { matchesSearchFilters } from './searchFilters';
import type { Route, RoutesRepository } from './types';

const NETWORK_DELAY_MS = 500;

/** Typing suggestions must feel instant; the backend would serve them from a prefix index. */
const SUGGEST_DELAY_MS = 150;
const SUGGESTION_LIMIT = 3;

const wait = (ms = NETWORK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

const startOf = (route: Route) => route.coordinates[0];

const routesByIds = (ids: readonly string[]) =>
  ids.flatMap((id) => ROUTE_FIXTURES.find((route) => route.id === id) ?? []);

/** Bookmarks of this app session, most recent first (one shared list: the mock has no users). */
let savedIds: string[] = [];

/** In-memory RoutesRepository backed by the design fixtures. */
export const mockRoutesRepository: RoutesRepository = {
  async listRecommended({ city, filter }) {
    await wait();
    return filterRoutes(routesByIds(RECOMMENDED_ROUTE_IDS), filter, city);
  },

  async listFeatured() {
    return routesByIds(RECOMMENDED_LIST_IDS);
  },

  async search({ query, sort, city, filters }) {
    await wait();
    const matches = ROUTE_FIXTURES.filter(
      (route) =>
        (matchesSearch(route.name, query) || matchesSearch(route.summary, query)) &&
        (!filters || matchesSearchFilters(route, filters)),
    );
    return sortRoutes(matches, sort, city);
  },

  async suggest({ query }) {
    await wait(SUGGEST_DELAY_MS);
    // Names only: suggestions highlight the matched letters of the name.
    const routes = ROUTE_FIXTURES.filter((route) => matchesSearch(route.name, query))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, SUGGESTION_LIMIT);
    const places = PLACE_FIXTURES.filter((place) => matchesSearch(place.name, query))
      .sort((a, b) => b.routeCount - a.routeCount)
      .slice(0, SUGGESTION_LIMIT);
    return { routes, places };
  },

  async listInArea({ bounds, filter, query = '' }) {
    await wait();
    const inArea = ROUTE_FIXTURES.filter(
      (route) =>
        route.coordinates.some((point) => isInBounds(point, bounds)) &&
        (matchesSearch(route.name, query) ||
          matchesSearch(route.summary, query) ||
          matchesSearch(route.city, query)),
    );
    return filterRoutes(inArea, filter, 'Antalya');
  },

  async listStartingNear({ origin, radiusKm }) {
    await wait();
    return ROUTE_FIXTURES.filter((route) => distanceKm(startOf(route), origin) <= radiusKm);
  },

  async listByIds(ids) {
    await wait();
    return routesByIds(ids);
  },

  async getById(id) {
    await wait();
    return ROUTE_FIXTURES.find((route) => route.id === id) ?? null;
  },

  async listByAuthor(authorId) {
    return ROUTE_FIXTURES.filter((route) => route.author.id === authorId);
  },

  async listSavedIds() {
    return savedIds;
  },

  async setSaved(routeId, saved) {
    const rest = savedIds.filter((id) => id !== routeId);
    savedIds = saved ? [routeId, ...rest] : rest;
  },
};
