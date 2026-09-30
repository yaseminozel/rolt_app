import cityData from './data/turkishCities.json';

export type TurkishCity = {
  /** Two-digit plate code, e.g. "34". */
  plateCode: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Geographic region, e.g. "Marmara". */
  region: string;
};

/**
 * Turkey's 81 provinces with plate code, centre coordinates and region.
 * Source: github.com/mevlutcelik/turkey-cities-data (MIT); names cross-checked against
 * github.com/muratgozel/turkey-neighbourhoods (MIT).
 */
export const TURKISH_CITIES: readonly TurkishCity[] = cityData;

const turkishCollator = new Intl.Collator('tr');

/** Cities in Turkish alphabetical order for pickers. */
export const TURKISH_CITIES_ALPHABETICAL: readonly TurkishCity[] = [...TURKISH_CITIES].sort((a, b) =>
  turkishCollator.compare(a.name, b.name),
);

export const findCityByName = (name: string | undefined) =>
  TURKISH_CITIES.find((city) => city.name === name);
