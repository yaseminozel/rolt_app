-- Recorded rides (Ride ≠ Route). Rides are recorded and saved on the device first (P0); the app
-- uploads a saved ride with `upsert_ride`. Others only ever see `preview_path`: the track with
-- the owner's start / finish privacy cut (10.05) and simplified.

create table public.rides (
  -- The device-generated id, so uploads are idempotent.
  id text primary key check (char_length(id) between 8 and 80),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  route_id text references public.routes (id) on delete set null,
  route_name text,
  title text not null default '' check (char_length(title) <= 120),
  notes text not null default '' check (char_length(notes) <= 2000),
  ride_type text not null check (ride_type in ('city', 'longRide', 'nature', 'curves', 'sport', 'offRoad', 'coast')),
  difficulty text not null default 'moderate' check (difficulty in ('easy', 'moderate', 'hard')),
  surface text not null default 'asphalt' check (surface in ('asphalt', 'mixed', 'gravel')),
  visibility text not null default 'private' check (visibility in ('public', 'followers', 'private')),
  city text,
  started_at timestamptz not null,
  ended_at timestamptz,
  distance_m double precision not null default 0,
  duration_s integer not null default 0,
  break_s integer not null default 0,
  break_count integer not null default 0,
  max_speed_mps double precision not null default 0,
  curve_count integer not null default 0,
  max_lean_left_deg double precision,
  max_lean_right_deg double precision,
  -- Storage paths in the `ride-photos` bucket, in the rider's order.
  photo_paths text[] not null default '{}',
  preview_path extensions.geometry(multilinestring, 4326),
  start_point extensions.geography(point, 4326),
  like_count integer not null default 0,
  comment_count integer not null default 0,
  save_count integer not null default 0,
  search_text text generated always as (public.search_norm(title || ' ' || coalesce(city, '') || ' ' || coalesce(route_name, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rides_owner_idx on public.rides (owner_id, started_at desc);
create index rides_route_idx on public.rides (route_id);
create index rides_public_idx on public.rides (started_at desc) where visibility = 'public';
create index rides_search_idx on public.rides using gin (search_text extensions.gin_trgm_ops);
create index rides_start_idx on public.rides using gist (start_point);
create trigger rides_touch before update on public.rides
  for each row execute function private.touch_updated_at();

-- The full GPS track, readable by the owner only (restoring rides on a new device).
create table public.ride_tracks (
  ride_id text primary key references public.rides (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  track extensions.geometry(multilinestring, 4326) not null
);

create table public.ride_likes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  ride_id text not null references public.rides (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, ride_id)
);
create index ride_likes_ride_idx on public.ride_likes (ride_id);

create table public.ride_saves (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  ride_id text not null references public.rides (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, ride_id)
);
create index ride_saves_ride_idx on public.ride_saves (ride_id);

create table public.ride_comments (
  id uuid primary key default gen_random_uuid(),
  ride_id text not null references public.rides (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text text not null check (char_length(trim(text)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index ride_comments_ride_idx on public.ride_comments (ride_id, created_at);

-- Whether the current viewer may see a ride: the owner, public rides, and followers-only rides
-- for accepted followers; never across a block.
create or replace function public.can_view_ride(p_owner uuid, p_visibility text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_owner = auth.uid()
    or (
      not public.is_blocked_between(auth.uid(), p_owner)
      and (p_visibility = 'public' or (p_visibility = 'followers' and public.follows_accepted(auth.uid(), p_owner)))
    )
$$;

-- Counters -------------------------------------------------------------------------------------

create or replace function private.ride_child_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
  target text := coalesce(new.ride_id, old.ride_id);
begin
  if tg_table_name = 'ride_likes' then
    update public.rides set like_count = greatest(like_count + delta, 0) where id = target;
  elsif tg_table_name = 'ride_saves' then
    update public.rides set save_count = greatest(save_count + delta, 0) where id = target;
  else
    update public.rides set comment_count = greatest(comment_count + delta, 0) where id = target;
  end if;
  return null;
end;
$$;

create trigger ride_likes_counts after insert or delete on public.ride_likes
  for each row execute function private.ride_child_counts();
create trigger ride_saves_counts after insert or delete on public.ride_saves
  for each row execute function private.ride_child_counts();
create trigger ride_comments_counts after insert or delete on public.ride_comments
  for each row execute function private.ride_child_counts();

create or replace function private.ride_owner_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.profiles
    set ride_count = greatest(ride_count - 1, 0), ride_distance_m = greatest(ride_distance_m - old.distance_m, 0)
    where id = old.owner_id;
    if old.route_id is not null then
      update public.routes set ride_count = greatest(ride_count - 1, 0) where id = old.route_id;
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.profiles
    set ride_count = ride_count + 1, ride_distance_m = ride_distance_m + new.distance_m
    where id = new.owner_id;
    if new.route_id is not null then
      update public.routes set ride_count = ride_count + 1, popularity = popularity + 1 where id = new.route_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger rides_owner_counts after insert or delete or update of distance_m, route_id on public.rides
  for each row execute function private.ride_owner_counts();

-- Row level security ---------------------------------------------------------------------------

alter table public.rides enable row level security;
alter table public.ride_tracks enable row level security;
alter table public.ride_likes enable row level security;
alter table public.ride_saves enable row level security;
alter table public.ride_comments enable row level security;

create policy "visible rides" on public.rides
  for select to anon, authenticated
  using (public.can_view_ride(owner_id, visibility));
create policy "own rides are editable" on public.rides
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own rides are deletable" on public.rides
  for delete to authenticated
  using (owner_id = auth.uid());
-- Inserts and track changes go through `upsert_ride`.
revoke insert on public.rides from anon, authenticated;
revoke update on public.rides from anon, authenticated;
grant update (title, notes, ride_type, difficulty, surface, visibility, photo_paths) on public.rides to authenticated;

create policy "own tracks" on public.ride_tracks
  for select to authenticated using (owner_id = auth.uid());
revoke insert, update, delete on public.ride_tracks from anon, authenticated;

create policy "likes of visible rides" on public.ride_likes
  for select to anon, authenticated
  using (exists (select 1 from public.rides r where r.id = ride_id));
create policy "like as yourself" on public.ride_likes
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_verified()
    and exists (select 1 from public.rides r where r.id = ride_id));
create policy "unlike" on public.ride_likes
  for delete to authenticated using (user_id = auth.uid());

create policy "own ride saves" on public.ride_saves
  for select to authenticated using (user_id = auth.uid());
create policy "save visible rides" on public.ride_saves
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.rides r where r.id = ride_id));
create policy "unsave" on public.ride_saves
  for delete to authenticated using (user_id = auth.uid());

create policy "comments of visible rides" on public.ride_comments
  for select to anon, authenticated
  using (exists (select 1 from public.rides r where r.id = ride_id)
    and not public.is_blocked_between(auth.uid(), author_id));
create policy "comment as yourself" on public.ride_comments
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_verified()
    and exists (select 1 from public.rides r where r.id = ride_id));
create policy "delete own comment or on own ride" on public.ride_comments
  for delete to authenticated
  using (author_id = auth.uid()
    or exists (select 1 from public.rides r where r.id = ride_id and r.owner_id = auth.uid()));

-- Upload ----------------------------------------------------------------------------------------

-- Cuts `distance_m` metres off both ends of every track (10.05 "Başlangıç/bitiş noktası"):
-- from the first segment's start and the last segment's end.
create or replace function private.trim_track_ends(track extensions.geometry, distance_m double precision)
returns extensions.geometry
language plpgsql
immutable
set search_path = ''
as $$
declare
  parts extensions.geometry[];
  total double precision := 0;
  part extensions.geometry;
  length_m double precision;
  head double precision := distance_m;
  tail double precision := distance_m;
  i integer;
  result extensions.geometry[] := '{}';
begin
  if track is null or distance_m <= 0 then
    return track;
  end if;
  select array_agg(d.geom order by d.path) into parts from extensions.st_dump(track) d;
  -- Head: drop or cut segments from the beginning.
  i := 1;
  while i <= coalesce(array_length(parts, 1), 0) and head > 0 loop
    length_m := extensions.st_length(parts[i]::extensions.geography);
    if length_m <= head then
      head := head - length_m;
      parts[i] := null;
      i := i + 1;
    else
      parts[i] := extensions.st_linesubstring(parts[i], head / length_m, 1);
      head := 0;
    end if;
  end loop;
  -- Tail: drop or cut segments from the end.
  i := coalesce(array_length(parts, 1), 0);
  while i >= 1 and tail > 0 loop
    if parts[i] is null then
      i := i - 1;
      continue;
    end if;
    length_m := extensions.st_length(parts[i]::extensions.geography);
    if length_m <= tail then
      tail := tail - length_m;
      parts[i] := null;
      i := i - 1;
    else
      parts[i] := extensions.st_linesubstring(parts[i], 0, 1 - tail / length_m);
      tail := 0;
    end if;
  end loop;
  foreach part in array parts loop
    if part is not null and extensions.st_npoints(part) >= 2 then
      result := result || part;
    end if;
  end loop;
  if array_length(result, 1) is null then
    return null;
  end if;
  return extensions.st_multi(extensions.st_collect(result));
end;
$$;

create or replace function private.ride_preview(p_owner uuid, track extensions.geometry)
returns extensions.geometry
language sql
stable
security definer
set search_path = ''
as $$
  select extensions.st_multi(extensions.st_simplifypreservetopology(
    case when s.hide_endpoints then private.trim_track_ends(track, s.endpoint_distance_m) else track end,
    0.00005
  ))
  from (select 1) as one
  left join public.user_settings s on s.user_id = p_owner
$$;

-- Creates or updates the viewer's ride from the device record (`RideRecord`). `p_ride.track` is
-- the GPS track as segments ([[[lng, lat], …], …]); photo paths must already be uploaded.
create or replace function public.upsert_ride(p_ride jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  segments jsonb := coalesce(p_ride -> 'track', '[]'::jsonb);
  usable jsonb;
  track extensions.geometry;
  saved public.rides;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if exists (select 1 from public.rides where id = p_ride ->> 'id' and owner_id <> uid) then
    raise exception 'not your ride' using errcode = '42501';
  end if;
  select jsonb_agg(segment) into usable
  from jsonb_array_elements(segments) as segment
  where jsonb_typeof(segment) = 'array' and jsonb_array_length(segment) >= 2;
  if usable is not null then
    track := extensions.st_setsrid(extensions.st_geomfromgeojson(
      jsonb_build_object('type', 'MultiLineString', 'coordinates', usable)::text
    ), 4326);
  end if;

  insert into public.rides as r (
    id, owner_id, route_id, route_name, title, notes, ride_type, difficulty, surface, visibility,
    city, started_at, ended_at, distance_m, duration_s, break_s, break_count, max_speed_mps,
    curve_count, max_lean_left_deg, max_lean_right_deg, photo_paths, preview_path, start_point
  )
  values (
    p_ride ->> 'id',
    uid,
    (select id from public.routes where id = p_ride ->> 'routeId'),
    p_ride ->> 'routeName',
    coalesce(p_ride ->> 'title', ''),
    coalesce(p_ride ->> 'notes', ''),
    p_ride ->> 'rideType',
    coalesce(p_ride ->> 'difficulty', 'moderate'),
    coalesce(p_ride ->> 'surface', 'asphalt'),
    coalesce(p_ride ->> 'visibility', 'private'),
    p_ride ->> 'city',
    to_timestamp((p_ride ->> 'startedAt')::double precision / 1000),
    case when p_ride ? 'endedAt' and p_ride ->> 'endedAt' is not null
      then to_timestamp((p_ride ->> 'endedAt')::double precision / 1000) end,
    coalesce((p_ride -> 'stats' ->> 'distanceM')::double precision, 0),
    coalesce((p_ride -> 'stats' ->> 'durationS')::double precision, 0)::integer,
    coalesce((p_ride -> 'stats' ->> 'breakS')::double precision, 0)::integer,
    coalesce((p_ride -> 'stats' ->> 'breakCount')::integer, 0),
    coalesce((p_ride -> 'stats' ->> 'maxSpeedMps')::double precision, 0),
    coalesce((p_ride -> 'stats' ->> 'curveCount')::integer, 0),
    (p_ride -> 'stats' ->> 'maxLeanLeftDeg')::double precision,
    (p_ride -> 'stats' ->> 'maxLeanRightDeg')::double precision,
    coalesce((select array_agg(value) from jsonb_array_elements_text(p_ride -> 'photoPaths')), '{}'),
    private.ride_preview(uid, track),
    case when track is not null then extensions.st_startpoint(extensions.st_geometryn(track, 1))::extensions.geography end
  )
  on conflict (id) do update set
    route_id = excluded.route_id,
    route_name = excluded.route_name,
    title = excluded.title,
    notes = excluded.notes,
    ride_type = excluded.ride_type,
    difficulty = excluded.difficulty,
    surface = excluded.surface,
    visibility = excluded.visibility,
    city = excluded.city,
    started_at = excluded.started_at,
    ended_at = excluded.ended_at,
    distance_m = excluded.distance_m,
    duration_s = excluded.duration_s,
    break_s = excluded.break_s,
    break_count = excluded.break_count,
    max_speed_mps = excluded.max_speed_mps,
    curve_count = excluded.curve_count,
    max_lean_left_deg = excluded.max_lean_left_deg,
    max_lean_right_deg = excluded.max_lean_right_deg,
    photo_paths = excluded.photo_paths,
    preview_path = coalesce(excluded.preview_path, r.preview_path),
    start_point = coalesce(excluded.start_point, r.start_point)
  returning * into saved;

  if track is not null then
    insert into public.ride_tracks (ride_id, owner_id, track)
    values (saved.id, uid, track)
    on conflict (ride_id) do update set track = excluded.track;
  end if;

  return jsonb_build_object('id', saved.id, 'updatedAt', saved.updated_at);
end;
$$;

revoke execute on function public.upsert_ride from public, anon;
grant execute on function public.upsert_ride to authenticated;

-- Read model ------------------------------------------------------------------------------------

-- One ride as the app's `RideSummary` (src/features/riders/types.ts), relative to the viewer.
create or replace function public.ride_summary_json(r public.rides)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'riderId', r.owner_id,
    'title', r.title,
    'description', nullif(r.notes, ''),
    'rideType', r.ride_type,
    'routeId', r.route_id,
    'routeName', r.route_name,
    'city', r.city,
    'visibility', r.visibility,
    'startedAt', r.started_at,
    'endedAt', r.ended_at,
    'distanceM', r.distance_m,
    'durationS', r.duration_s,
    'breakS', r.break_s,
    'breakCount', r.break_count,
    'maxSpeedMps', r.max_speed_mps,
    'curveCount', r.curve_count,
    'maxLeanLeftDeg', r.max_lean_left_deg,
    'maxLeanRightDeg', r.max_lean_right_deg,
    'likeCount', r.like_count,
    'commentCount', r.comment_count,
    'saveCount', r.save_count,
    'isLiked', exists (select 1 from public.ride_likes l where l.ride_id = r.id and l.user_id = auth.uid()),
    'isSaved', exists (select 1 from public.ride_saves s where s.ride_id = r.id and s.user_id = auth.uid()),
    'photoPaths', to_jsonb(r.photo_paths),
    'preview', (extensions.st_asgeojson(r.preview_path, 5)::jsonb) -> 'coordinates'
  )
$$;

-- "Sürüşler" of a rider profile, newest first; `p_before` pages back.
create or replace function public.rider_rides(p_rider uuid, p_before timestamptz default null, p_limit integer default 30)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.ride_summary_json(r)
  from public.rides r
  where r.owner_id = p_rider
    and public.can_view_ride(r.owner_id, r.visibility)
    and (p_before is null or r.started_at < p_before)
  order by r.started_at desc
  limit least(greatest(p_limit, 1), 100)
$$;

-- The viewer's own rides with full tracks, for restoring them on a new device.
create or replace function public.own_rides_for_restore(p_known_ids text[] default '{}')
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.ride_summary_json(r) || jsonb_build_object(
    'notes', r.notes,
    'title', r.title,
    'difficulty', r.difficulty,
    'surface', r.surface,
    'updatedAt', r.updated_at,
    'track', (extensions.st_asgeojson(t.track, 6)::jsonb) -> 'coordinates'
  )
  from public.rides r
  left join public.ride_tracks t on t.ride_id = r.id
  where r.owner_id = auth.uid() and not (r.id = any (coalesce(p_known_ids, '{}')))
  order by r.started_at desc
$$;

revoke execute on function public.own_rides_for_restore from public, anon;
grant execute on function public.own_rides_for_restore to authenticated;
