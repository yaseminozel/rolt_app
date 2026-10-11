-- Light route lines in lists. Every list RPC returned each route's full line (hundreds of
-- points); lists only draw it small (cards, Haritada keşfet, start distance), so they now get a
-- simplified line and `route_by_id` alone the exact one (Rota detayı, Rotayı sür, offline maps).
-- Douglas–Peucker keeps a line's first and last points, so start / end based logic (distance to
-- the start, travel time, "Yakın Rotalar", area checks) sees the same coordinates as before.
-- `geometryDetail` tells the app which one it holds.

-- The full read model, now labelled.
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
    'geometryDetail', 'full',
    'popularity', r.popularity,
    'isLoop', r.is_loop,
    'rating', r.rating,
    'ratingCount', r.rating_count,
    'saveCount', r.save_count
  )
  from (select 1) as one
  left join public.profiles p on p.id = r.author_id
$$;

-- The list read model: the same JSON with the line simplified to ~20 m (0.0002°), 5 decimals.
create or replace function private.route_list_json(r public.routes)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.route_json(r) || jsonb_build_object(
    'coordinates',
    (extensions.st_asgeojson(extensions.st_simplifypreservetopology(r.path, 0.0002), 5)::jsonb)
      -> 'coordinates',
    'geometryDetail', 'simplified'
  )
$$;

revoke execute on function private.route_list_json(public.routes) from public, anon, authenticated;

create or replace function public.routes_recommended(p_list text default 'home')
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.route_list_json(r)
  from private.visible_routes() r
  where case when p_list = 'home' then r.home_rank is not null else r.featured_rank is not null end
  order by case when p_list = 'home' then r.home_rank else r.featured_rank end, r.popularity desc
$$;

create or replace function public.routes_search(p_query text, p_limit integer default 100)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.route_list_json(r)
  from private.visible_routes() r
  where r.search_text like '%' || public.search_norm(p_query) || '%'
  order by r.popularity desc
  limit least(greatest(p_limit, 1), 200)
$$;

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
      select jsonb_agg(private.route_list_json(r) order by r.popularity desc)
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
  select private.route_list_json(r)
  from private.visible_routes() r
  where r.path operator(extensions.&&) extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
    and (coalesce(p_query, '') = '' or r.search_text like '%' || public.search_norm(p_query) || '%')
  order by r.popularity desc
  limit 300
$$;

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
  select private.route_list_json(r)
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
  select private.route_list_json(r)
  from private.visible_routes() r
  join unnest(p_ids) with ordinality as wanted(id, position) on wanted.id = r.id
  order by wanted.position
$$;

create or replace function public.routes_by_author(p_author uuid)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.route_list_json(r)
  from private.visible_routes() r
  where r.author_id = p_author
  order by r.published_at desc
$$;
