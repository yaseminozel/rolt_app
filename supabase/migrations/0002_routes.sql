-- Route catalog (Route ≠ Ride), places, bookmarks and route suggestions (Akış 08, 10–12, Rota öner).

create table public.routes (
  id text primary key default replace(gen_random_uuid()::text, '-', ''),
  author_id uuid references public.profiles (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  summary text not null default '',
  tag text not null check (tag in ('coast', 'curvy', 'scenic', 'city', 'nature', 'offRoad', 'longTour')),
  -- Province the route starts in (`TurkishCity.name`).
  city text not null,
  start_name text not null,
  end_name text not null,
  distance_km double precision not null,
  duration_minutes integer not null,
  average_speed_kmh double precision not null default 0,
  max_speed_kmh double precision not null default 0,
  curve_count integer not null default 0,
  break_count integer not null default 0,
  elevation_gain_m integer not null default 0,
  elevation_loss_m integer not null default 0,
  difficulty text not null default 'moderate' check (difficulty in ('easy', 'moderate', 'hard')),
  surface text not null default 'asphalt' check (surface in ('asphalt', 'mixed', 'gravel')),
  notes text,
  -- [{ kind: 'start' | 'stop' | 'end', name, distanceKm, durationMinutes }]
  stops jsonb,
  -- Storage paths in the `route-photos` bucket.
  cover_path text,
  photo_paths text[] not null default '{}',
  path extensions.geometry(linestring, 4326) not null,
  start_point extensions.geography(point, 4326)
    generated always as (extensions.st_startpoint(path)::extensions.geography) stored,
  is_loop boolean not null default false,
  popularity integer not null default 0,
  rating double precision not null default 0,
  rating_count integer not null default 0,
  -- Curated "Önerilen rotalar": lower ranks first; null = not featured.
  featured_rank integer,
  -- Home page shelf (05.01) uses its own short list.
  home_rank integer,
  status text not null default 'published' check (status in ('published', 'hidden')),
  save_count integer not null default 0,
  ride_count integer not null default 0,
  source_suggestion_id uuid,
  search_text text generated always as (public.search_norm(name || ' ' || summary || ' ' || city)) stored,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index routes_path_idx on public.routes using gist (path);
create index routes_start_idx on public.routes using gist (start_point);
create index routes_search_idx on public.routes using gin (search_text extensions.gin_trgm_ops);
create index routes_author_idx on public.routes (author_id);
create trigger routes_touch before update on public.routes
  for each row execute function private.touch_updated_at();

-- "YERLER" in search suggestions (01.1) and "Konumlar" in community search (13.04).
create table public.places (
  id text primary key,
  name text not null,
  district text not null default '',
  province text not null,
  centre extensions.geography(point, 4326) not null,
  search_text text generated always as (public.search_norm(name || ' ' || district || ' ' || province)) stored
);

create index places_search_idx on public.places using gin (search_text extensions.gin_trgm_ops);

create table public.saved_routes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  route_id text not null references public.routes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, route_id)
);

create or replace function private.saved_route_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.routes set save_count = save_count + 1 where id = new.route_id;
  else
    update public.routes set save_count = greatest(save_count - 1, 0) where id = old.route_id;
  end if;
  return null;
end;
$$;

create trigger saved_routes_counts after insert or delete on public.saved_routes
  for each row execute function private.saved_route_counts();

create table public.route_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  tracking_id text not null unique
    default ('RLT-' || lpad((floor(random() * 90000) + 10000)::text, 5, '0')),
  name text not null check (char_length(name) between 1 and 120),
  tags text[] not null check (cardinality(tags) between 1 and 3),
  difficulty text not null default 'moderate' check (difficulty in ('easy', 'moderate', 'hard')),
  description text not null default '' check (char_length(description) <= 500),
  -- [{ kind, place: { id, name, subtitle, coordinates } }]
  waypoints jsonb not null,
  path extensions.geometry(linestring, 4326) not null,
  distance_km double precision not null,
  duration_minutes integer not null,
  elevation_gain_m integer,
  photo_paths text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  route_id text references public.routes (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index route_suggestions_user_idx on public.route_suggestions (user_id, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------------------------

alter table public.routes enable row level security;
alter table public.places enable row level security;
alter table public.saved_routes enable row level security;
alter table public.route_suggestions enable row level security;

create policy "published routes are public" on public.routes
  for select to anon, authenticated
  using (status = 'published' or author_id = auth.uid());

create policy "places are public" on public.places
  for select to anon, authenticated using (true);

create policy "own bookmarks" on public.saved_routes
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own suggestions are readable" on public.route_suggestions
  for select to authenticated using (user_id = auth.uid());
-- Inserted through `submit_route_suggestion` (geometry from GeoJSON).
revoke insert, update, delete on public.route_suggestions from anon, authenticated;
revoke insert, update, delete on public.routes, public.places from anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Read model: one route as the app's `Route` JSON (src/features/routes/types.ts). Storage
-- paths are returned as-is; the app turns them into URLs.
-- ---------------------------------------------------------------------------------------------

create or replace function public.route_json(r public.routes)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'summary', r.summary,
    'tag', r.tag,
    'city', r.city,
    'startName', r.start_name,
    'endName', r.end_name,
    'distanceKm', r.distance_km,
    'durationMinutes', r.duration_minutes,
    'averageSpeedKmh', r.average_speed_kmh,
    'maxSpeedKmh', r.max_speed_kmh,
    'curveCount', r.curve_count,
    'breakCount', r.break_count,
    'elevationGainM', r.elevation_gain_m,
    'elevationLossM', r.elevation_loss_m,
    'difficulty', r.difficulty,
    'surface', r.surface,
    'author', jsonb_build_object(
      'id', p.id,
      'name', coalesce(nullif(p.name, ''), p.handle, ''),
      'avatarPath', p.avatar_path
    ),
    'publishedAt', r.published_at,
    'notes', r.notes,
    'stops', r.stops,
    'coverPath', r.cover_path,
    'photoPaths', to_jsonb(r.photo_paths),
    'coordinates', (extensions.st_asgeojson(r.path, 5)::jsonb) -> 'coordinates',
    'popularity', r.popularity,
    'isLoop', r.is_loop,
    'rating', r.rating,
    'ratingCount', r.rating_count,
    'saveCount', r.save_count
  )
  from (select 1) as one
  left join public.profiles p on p.id = r.author_id
$$;

create or replace function private.visible_routes()
returns setof public.routes
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.routes r
  where r.status = 'published' and not public.is_blocked_between(auth.uid(), r.author_id)
$$;

-- 05.01 "Önerilen rotalar": the curated home shelf, then the curated list (05.03), then the rest
-- by popularity. Category / nearby chips are applied by the app (`filterRoutes`).
create or replace function public.routes_recommended(p_list text default 'home')
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.route_json(r)
  from private.visible_routes() r
  where case when p_list = 'home' then r.home_rank is not null else r.featured_rank is not null end
  order by case when p_list = 'home' then r.home_rank else r.featured_rank end, r.popularity desc
$$;

-- 05.02 search: name, summary or city contains the query (Turkish-insensitive). Sort and the
-- filter sheet are applied by the app on the result.
create or replace function public.routes_search(p_query text, p_limit integer default 100)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.route_json(r)
  from private.visible_routes() r
  where r.search_text like '%' || public.search_norm(p_query) || '%'
  order by r.popularity desc
  limit least(greatest(p_limit, 1), 200)
$$;

-- 01.1 typing suggestions: route names and places.
create or replace function public.routes_suggest(p_query text, p_limit integer default 3)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with q as (select public.search_norm(p_query) as term)
  select jsonb_build_object(
    'routes', coalesce((
      select jsonb_agg(public.route_json(r) order by r.popularity desc)
      from (
        select r.* from private.visible_routes() r, q
        where public.search_norm(r.name) like '%' || q.term || '%'
        order by r.popularity desc
        limit p_limit
      ) r
    ), '[]'::jsonb),
    'places', coalesce((
      select jsonb_agg(place order by (place ->> 'routeCount')::integer desc)
      from (
        select jsonb_build_object(
          'id', pl.id,
          'name', pl.name,
          'district', pl.district,
          'province', pl.province,
          'routeCount', (
            select count(*) from private.visible_routes() r
            where extensions.st_dwithin(r.start_point, pl.centre, 25000)
               or extensions.st_dwithin(r.path::extensions.geography, pl.centre, 5000)
          ),
          'centre', jsonb_build_array(
            extensions.st_x(pl.centre::extensions.geometry),
            extensions.st_y(pl.centre::extensions.geometry)
          )
        ) as place
        from public.places pl, q
        where public.search_norm(pl.name) like '%' || q.term || '%'
        limit p_limit * 3
      ) ranked
    ), '[]'::jsonb)
  )
$$;

-- 07.01 Haritada keşfet: routes crossing the visible area, optionally narrowed by a query.
create or replace function public.routes_in_area(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_query text default ''
)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.route_json(r)
  from private.visible_routes() r
  where r.path operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
    and (coalesce(p_query, '') = '' or r.search_text like '%' || public.search_norm(p_query) || '%')
  order by r.popularity desc
  limit 300
$$;

-- "1 saatte ulaşabileceğin": routes starting within a straight-line radius (PostGIS).
create or replace function public.routes_near(
  p_lng double precision,
  p_lat double precision,
  p_radius_km double precision
)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.route_json(r)
  from private.visible_routes() r
  where extensions.st_dwithin(
    r.start_point,
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    p_radius_km * 1000
  )
  order by r.start_point operator(extensions.<->)
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
  limit 200
$$;

create or replace function public.routes_by_ids(p_ids text[])
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.route_json(r)
  from private.visible_routes() r
  join unnest(p_ids) with ordinality as wanted(id, position) on wanted.id = r.id
  order by wanted.position
$$;

create or replace function public.route_by_id(p_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.route_json(r)
  from public.routes r
  where r.id = p_id
    and (r.status = 'published' or r.author_id = auth.uid())
    and not public.is_blocked_between(auth.uid(), r.author_id)
$$;

-- Rider profile "Rotalar" tab.
create or replace function public.routes_by_author(p_author uuid)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.route_json(r)
  from private.visible_routes() r
  where r.author_id = p_author
  order by r.published_at desc
$$;

-- "Kaydettiklerim": the viewer's bookmarks, newest first.
create or replace function public.saved_route_ids()
returns text[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(route_id order by created_at desc), '{}')
  from public.saved_routes
  where user_id = auth.uid()
$$;

-- Rota öner (04.4): stores a suggestion for review. `p_path` is a GeoJSON LineString.
create or replace function public.submit_route_suggestion(
  p_name text,
  p_tags text[],
  p_difficulty text,
  p_description text,
  p_waypoints jsonb,
  p_path jsonb,
  p_distance_km double precision,
  p_duration_minutes integer,
  p_elevation_gain_m integer,
  p_photo_paths text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  suggestion public.route_suggestions;
begin
  if auth.uid() is null or not public.is_verified() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.route_suggestions (
    user_id, name, tags, difficulty, description, waypoints, path, distance_km,
    duration_minutes, elevation_gain_m, photo_paths
  )
  values (
    auth.uid(), trim(p_name), p_tags, coalesce(p_difficulty, 'moderate'), coalesce(p_description, ''),
    p_waypoints, extensions.st_setsrid(extensions.st_geomfromgeojson(p_path::text), 4326),
    p_distance_km, p_duration_minutes, p_elevation_gain_m, coalesce(p_photo_paths, '{}')
  )
  returning * into suggestion;
  return jsonb_build_object('trackingId', suggestion.tracking_id, 'submittedAt', suggestion.created_at);
end;
$$;

revoke execute on function public.submit_route_suggestion from public, anon;
grant execute on function public.submit_route_suggestion to authenticated;
