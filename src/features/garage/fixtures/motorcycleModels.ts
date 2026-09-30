import type { MotorcycleModel } from '../types';

/**
 * MOCK DATA until the Supabase motorcycle catalog exists.
 * Yamaha entries are taken from the design (00.10, g4Zy4); other brands are placeholder
 * fixtures with real model names so the flow can be exercised for every brand.
 */
export const MOTORCYCLE_MODELS: readonly MotorcycleModel[] = [
  { id: 'yamaha-mt-07', brand: 'yamaha', name: 'MT-07', displacementCc: 689, category: 'Naked' },
  { id: 'yamaha-mt-09', brand: 'yamaha', name: 'MT-09', displacementCc: 890, category: 'Naked' },
  { id: 'yamaha-tracer-7', brand: 'yamaha', name: 'Tracer 7', displacementCc: 689, category: 'Sport touring' },
  { id: 'yamaha-tenere-700', brand: 'yamaha', name: 'Ténéré 700', displacementCc: 689, category: 'Adventure' },

  { id: 'honda-cb650r', brand: 'honda', name: 'CB650R', displacementCc: 649, category: 'Naked' },
  { id: 'honda-cbr650r', brand: 'honda', name: 'CBR650R', displacementCc: 649, category: 'Sport' },
  { id: 'honda-nc750x', brand: 'honda', name: 'NC750X', displacementCc: 745, category: 'Adventure' },
  { id: 'honda-africa-twin', brand: 'honda', name: 'Africa Twin', displacementCc: 1084, category: 'Adventure' },

  { id: 'kawasaki-z650', brand: 'kawasaki', name: 'Z650', displacementCc: 649, category: 'Naked' },
  { id: 'kawasaki-z900', brand: 'kawasaki', name: 'Z900', displacementCc: 948, category: 'Naked' },
  { id: 'kawasaki-ninja-650', brand: 'kawasaki', name: 'Ninja 650', displacementCc: 649, category: 'Sport' },
  { id: 'kawasaki-versys-650', brand: 'kawasaki', name: 'Versys 650', displacementCc: 649, category: 'Sport touring' },

  { id: 'suzuki-gsx-8s', brand: 'suzuki', name: 'GSX-8S', displacementCc: 776, category: 'Naked' },
  { id: 'suzuki-v-strom-800de', brand: 'suzuki', name: 'V-Strom 800DE', displacementCc: 776, category: 'Adventure' },
  { id: 'suzuki-gsx-s1000', brand: 'suzuki', name: 'GSX-S1000', displacementCc: 999, category: 'Naked' },
  { id: 'suzuki-hayabusa', brand: 'suzuki', name: 'Hayabusa', displacementCc: 1340, category: 'Sport' },

  { id: 'bmw-f-900-r', brand: 'bmw', name: 'F 900 R', displacementCc: 895, category: 'Naked' },
  { id: 'bmw-r-1300-gs', brand: 'bmw', name: 'R 1300 GS', displacementCc: 1300, category: 'Adventure' },
  { id: 'bmw-s-1000-rr', brand: 'bmw', name: 'S 1000 RR', displacementCc: 999, category: 'Sport' },
  { id: 'bmw-r-1250-rt', brand: 'bmw', name: 'R 1250 RT', displacementCc: 1254, category: 'Touring' },

  { id: 'ducati-monster', brand: 'ducati', name: 'Monster', displacementCc: 937, category: 'Naked' },
  { id: 'ducati-scrambler-icon', brand: 'ducati', name: 'Scrambler Icon', displacementCc: 803, category: 'Scrambler' },
  { id: 'ducati-multistrada-v4', brand: 'ducati', name: 'Multistrada V4', displacementCc: 1158, category: 'Adventure' },
  { id: 'ducati-panigale-v4', brand: 'ducati', name: 'Panigale V4', displacementCc: 1103, category: 'Sport' },

  { id: 'ktm-390-duke', brand: 'ktm', name: '390 Duke', displacementCc: 399, category: 'Naked' },
  { id: 'ktm-790-duke', brand: 'ktm', name: '790 Duke', displacementCc: 799, category: 'Naked' },
  { id: 'ktm-890-adventure', brand: 'ktm', name: '890 Adventure', displacementCc: 889, category: 'Adventure' },
  { id: 'ktm-1290-super-duke-r', brand: 'ktm', name: '1290 Super Duke R', displacementCc: 1301, category: 'Naked' },

  { id: 'triumph-speed-400', brand: 'triumph', name: 'Speed 400', displacementCc: 398, category: 'Naked' },
  { id: 'triumph-trident-660', brand: 'triumph', name: 'Trident 660', displacementCc: 660, category: 'Naked' },
  { id: 'triumph-street-triple-765', brand: 'triumph', name: 'Street Triple 765', displacementCc: 765, category: 'Naked' },
  { id: 'triumph-tiger-900', brand: 'triumph', name: 'Tiger 900', displacementCc: 888, category: 'Adventure' },

  { id: 'harley-davidson-sportster-s', brand: 'harleyDavidson', name: 'Sportster S', displacementCc: 1252, category: 'Cruiser' },
  { id: 'harley-davidson-fat-boy-114', brand: 'harleyDavidson', name: 'Fat Boy 114', displacementCc: 1868, category: 'Cruiser' },
  { id: 'harley-davidson-pan-america', brand: 'harleyDavidson', name: 'Pan America 1250', displacementCc: 1252, category: 'Adventure' },
  { id: 'harley-davidson-street-glide', brand: 'harleyDavidson', name: 'Street Glide', displacementCc: 1923, category: 'Touring' },

  { id: 'bajaj-pulsar-n250', brand: 'bajaj', name: 'Pulsar N250', displacementCc: 249, category: 'Naked' },
  { id: 'bajaj-pulsar-ns200', brand: 'bajaj', name: 'Pulsar NS200', displacementCc: 199, category: 'Naked' },
  { id: 'bajaj-pulsar-rs200', brand: 'bajaj', name: 'Pulsar RS200', displacementCc: 199, category: 'Sport' },
  { id: 'bajaj-dominar-400', brand: 'bajaj', name: 'Dominar 400', displacementCc: 373, category: 'Sport touring' },
];

export const modelsForBrand = (brand: MotorcycleModel['brand']) =>
  MOTORCYCLE_MODELS.filter((model) => model.brand === brand);

export const findModel = (id: string | undefined) => MOTORCYCLE_MODELS.find((model) => model.id === id);
