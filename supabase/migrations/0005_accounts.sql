-- Accounts: email lookup and lockout (02.01–02.02), usernames and registration (04.x), own and
-- other riders' profiles, blocking, reports, feedback and account deletion.

-- ---------------------------------------------------------------------------------------------
-- Sign-in
-- ---------------------------------------------------------------------------------------------

-- 02.01: how a typed email can sign in. The design needs this answer before the password step,
-- so it is public; GoTrue's rate limits still apply to the actual sign-in.
create or replace function public.lookup_email(p_email text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select case
        when u.encrypted_password is not null and u.encrypted_password <> ''
          then jsonb_build_object('status', 'password')
        else jsonb_build_object(
          'status', 'provider',
          'provider', coalesce(
            (select i.provider from auth.identities i
             where i.user_id = u.id and i.provider in ('google', 'apple')
             order by i.created_at limit 1),
            'google'
          )
        )
      end
      from auth.users u
      where lower(u.email) = lower(trim(p_email)) and u.deleted_at is null
      limit 1
    ),
    jsonb_build_object('status', 'new')
  )
$$;

grant execute on function public.lookup_email to anon, authenticated;

-- Wrong-password lockout (02.02 "Çok fazla deneme"): three wrong passwords in a row pause
-- password sign-in for 15 minutes. Called by GoTrue as the password verification hook.
create table private.password_attempts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  failed_count integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.hook_password_verification_attempt(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (event ->> 'user_id')::uuid;
  valid boolean := (event ->> 'valid')::boolean;
  attempt private.password_attempts;
  max_failures constant integer := 3;
  lock_for constant interval := interval '15 minutes';
begin
  select * into attempt from private.password_attempts where user_id = uid;

  if attempt.locked_until is not null and attempt.locked_until > now() then
    return jsonb_build_object(
      'decision', 'reject',
      'message', 'account_locked:' || to_char(attempt.locked_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'should_logout_user', false
    );
  end if;

  if valid then
    delete from private.password_attempts where user_id = uid;
    return jsonb_build_object('decision', 'continue');
  end if;

  insert into private.password_attempts as a (user_id, failed_count, updated_at)
  values (uid, 1, now())
  on conflict (user_id) do update set
    failed_count = case when a.locked_until is not null and a.locked_until <= now() then 1 else a.failed_count + 1 end,
    locked_until = case when a.locked_until is not null and a.locked_until <= now() then null else a.locked_until end,
    updated_at = now()
  returning * into attempt;

  if attempt.failed_count >= max_failures then
    update private.password_attempts set locked_until = now() + lock_for where user_id = uid
    returning * into attempt;
    return jsonb_build_object(
      'decision', 'reject',
      'message', 'account_locked:' || to_char(attempt.locked_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'should_logout_user', false
    );
  end if;

  return jsonb_build_object('decision', 'continue');
end;
$$;

grant usage on schema private to supabase_auth_admin;
grant all on private.password_attempts to supabase_auth_admin;
grant execute on function public.hook_password_verification_attempt to supabase_auth_admin;
revoke execute on function public.hook_password_verification_attempt from public, anon, authenticated;

-- A password reset (02.05) lifts the lock; GoTrue updates `encrypted_password`.
create or replace function private.clear_lock_on_password_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    delete from private.password_attempts where user_id = new.id;
    update public.user_settings set password_changed_at = now() where user_id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_password_change after update of encrypted_password on auth.users
  for each row execute function private.clear_lock_on_password_change();

-- ---------------------------------------------------------------------------------------------
-- Usernames and registration
-- ---------------------------------------------------------------------------------------------

-- 04.01: which of the candidates are free (the typed name first, then suggestions).
create or replace function public.free_usernames(p_candidates text[])
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(candidate order by position), '{}')
  from unnest(p_candidates) with ordinality as c(candidate, position)
  where candidate ~ '^[a-z0-9_.]{3,20}$'
    and candidate not in ('rolt', 'admin', 'support', 'destek', 'root', 'api', 'help', 'yardim')
    and not exists (
      select 1 from public.profiles p where p.handle = candidate and p.id is distinct from auth.uid()
    )
$$;

grant execute on function public.free_usernames to anon, authenticated;

-- The viewer's own profile (09.01) with the primary bike and private settings.
create or replace function public.own_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'userId', p.id,
    'name', p.name,
    'handle', coalesce(p.handle, ''),
    'avatarPath', p.avatar_path,
    'bio', p.bio,
    'city', p.city,
    'profileCompleted', p.profile_completed,
    'isPrivate', p.is_private,
    'followerCount', p.follower_count,
    'followingCount', p.following_count,
    'rideCount', p.ride_count,
    'rideDistanceM', p.ride_distance_m,
    'bike', (
      select jsonb_build_object(
        'id', b.id, 'brand', b.brand, 'modelId', b.model_id, 'model', b.model, 'year', b.year,
        'displacementCc', b.displacement_cc, 'category', b.category
      )
      from public.bikes b where b.owner_id = p.id and b.is_primary limit 1
    ),
    'settings', (
      select jsonb_build_object(
        'locale', s.locale,
        'homePlace', s.home_place,
        'defaultRideVisibility', s.default_ride_visibility,
        'hideEndpoints', s.hide_endpoints,
        'endpointDistanceM', s.endpoint_distance_m,
        'notifyLikes', s.notify_likes,
        'notifyComments', s.notify_comments,
        'notifyFollowers', s.notify_followers,
        'notifyMessages', s.notify_messages,
        'notifyRouteSuggestions', s.notify_route_suggestions,
        'notifyProductUpdates', s.notify_product_updates,
        'passwordChangedAt', s.password_changed_at
      )
      from public.user_settings s where s.user_id = p.id
    )
  )
  from public.profiles p
  where p.id = auth.uid()
$$;

revoke execute on function public.own_profile from public, anon;
grant execute on function public.own_profile to authenticated;

-- Saves registration answers (04.01–04.03) and finishes the profile. Every field is optional
-- (each step can be skipped). `p.homePlace` is { id, name, subtitle, coordinates: [lng, lat] };
-- `p.bike` is { brand, modelId, model, year, displacementCc, category }.
create or replace function public.complete_registration(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  place jsonb := p -> 'homePlace';
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if nullif(p ->> 'handle', '') is not null
    and not (p ->> 'handle' = any (public.free_usernames(array[p ->> 'handle']))) then
    raise exception 'username_taken' using errcode = '23505';
  end if;

  update public.profiles set
    name = coalesce(nullif(trim(p ->> 'name'), ''), name),
    handle = coalesce(nullif(p ->> 'handle', ''), handle),
    avatar_path = coalesce(nullif(p ->> 'avatarPath', ''), avatar_path),
    city = coalesce(nullif(p ->> 'city', ''), city),
    profile_completed = true
  where id = uid;

  if place is not null and jsonb_typeof(place -> 'coordinates') = 'array' then
    update public.user_settings set
      home_place = place,
      home_location = extensions.st_setsrid(extensions.st_makepoint(
        (place -> 'coordinates' ->> 0)::double precision,
        (place -> 'coordinates' ->> 1)::double precision
      ), 4326)::extensions.geography
    where user_id = uid;
  end if;

  if p ? 'locale' then
    update public.user_settings set locale = case when p ->> 'locale' = 'en' then 'en' else 'tr' end
    where user_id = uid;
  end if;

  if p -> 'bike' is not null and jsonb_typeof(p -> 'bike') = 'object' then
    delete from public.bikes where owner_id = uid and is_primary;
    insert into public.bikes (owner_id, brand, model_id, model, year, displacement_cc, category, is_primary)
    values (
      uid,
      p -> 'bike' ->> 'brand',
      p -> 'bike' ->> 'modelId',
      p -> 'bike' ->> 'model',
      (p -> 'bike' ->> 'year')::integer,
      (p -> 'bike' ->> 'displacementCc')::integer,
      p -> 'bike' ->> 'category',
      true
    );
  end if;

  return public.own_profile();
end;
$$;

revoke execute on function public.complete_registration from public, anon;
grant execute on function public.complete_registration to authenticated;

-- 20.x Profili düzenle and 09.01 camera: name, handle, bio, city, photo, home place.
create or replace function public.update_own_profile(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  place jsonb := p -> 'homePlace';
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p ? 'handle' and not (p ->> 'handle' = any (public.free_usernames(array[p ->> 'handle']))) then
    raise exception 'username_taken' using errcode = '23505';
  end if;
  update public.profiles set
    name = case when p ? 'name' then left(trim(p ->> 'name'), 60) else name end,
    handle = case when p ? 'handle' then p ->> 'handle' else handle end,
    bio = case when p ? 'bio' then nullif(trim(p ->> 'bio'), '') else bio end,
    city = case when p ? 'city' then nullif(trim(p ->> 'city'), '') else city end,
    avatar_path = case when p ? 'avatarPath' then nullif(p ->> 'avatarPath', '') else avatar_path end
  where id = uid;
  if p ? 'homePlace' then
    update public.user_settings set
      home_place = place,
      home_location = case when place is null or jsonb_typeof(place -> 'coordinates') <> 'array' then null
        else extensions.st_setsrid(extensions.st_makepoint(
          (place -> 'coordinates' ->> 0)::double precision,
          (place -> 'coordinates' ->> 1)::double precision
        ), 4326)::extensions.geography end
    where user_id = uid;
  end if;
  return public.own_profile();
end;
$$;

revoke execute on function public.update_own_profile from public, anon;
grant execute on function public.update_own_profile to authenticated;

-- Motorum (Akış 17): replaces or removes the primary bike.
create or replace function public.set_primary_bike(p_bike jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from public.bikes where owner_id = uid and is_primary;
  if p_bike is not null and jsonb_typeof(p_bike) = 'object' then
    insert into public.bikes (owner_id, brand, model_id, model, year, displacement_cc, category, is_primary)
    values (
      uid, p_bike ->> 'brand', p_bike ->> 'modelId', p_bike ->> 'model', (p_bike ->> 'year')::integer,
      (p_bike ->> 'displacementCc')::integer, p_bike ->> 'category', true
    );
  end if;
  return public.own_profile();
end;
$$;

revoke execute on function public.set_primary_bike from public, anon;
grant execute on function public.set_primary_bike to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Other riders
-- ---------------------------------------------------------------------------------------------

-- Another rider's profile (01.8 / 13.03) as the app's `Rider`; null when blocked either way.
create or replace function public.get_rider(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'name', coalesce(nullif(p.name, ''), p.handle, ''),
    'handle', coalesce(p.handle, ''),
    'avatarPath', p.avatar_path,
    'bio', p.bio,
    'city', p.city,
    'isOfficial', p.is_official,
    'isPrivate', p.is_private,
    'bikes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'brand', b.brand, 'model', b.model, 'year', b.year,
        'displacementCc', b.displacement_cc, 'category', b.category, 'isPrimary', b.is_primary
      ) order by b.is_primary desc, b.created_at)
      from public.bikes b where b.owner_id = p.id
    ), '[]'::jsonb),
    'followerCount', p.follower_count,
    'followingCount', p.following_count,
    'rideCount', p.ride_count,
    'isFollowing', public.follows_accepted(auth.uid(), p.id),
    'followStatus', (select f.status from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id),
    'followsYou', public.follows_accepted(p.id, auth.uid())
  )
  from public.profiles p
  where p.id = p_id and not public.is_blocked_between(auth.uid(), p.id)
$$;

-- "Ortak noktalar": routes both riders rode, and the ride type they share most. Null for guests,
-- yourself, or riders without overlap.
create or replace function public.rider_match(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select route_id, ride_type from public.rides where owner_id = auth.uid()
  ),
  theirs as (
    select route_id, ride_type from public.rides
    where owner_id = p_id and public.can_view_ride(owner_id, visibility)
  ),
  shared_routes as (
    select count(distinct m.route_id) as n
    from mine m join theirs t on t.route_id = m.route_id
    where m.route_id is not null
  ),
  shared_type as (
    select m.ride_type, count(*) as n
    from mine m join theirs t on t.ride_type = m.ride_type
    group by m.ride_type
    order by count(*) desc
    limit 1
  ),
  totals as (
    select (select count(distinct ride_type) from mine) as mine_types,
           (select count(distinct ride_type) from theirs) as their_types
  )
  select case
    when auth.uid() is null or auth.uid() = p_id or (select n from shared_routes) = 0 and not exists (select 1 from shared_type)
      then null
    else jsonb_build_object(
      'score', least(98, 40 + (select n from shared_routes) * 12
        + coalesce((select n from shared_type), 0) * 3),
      'sharedRouteCount', (select n from shared_routes),
      'reason', case (select ride_type from shared_type)
        when 'coast' then 'coast'
        when 'curves' then 'curvyRoads'
        when 'nature' then 'mountainRoads'
        when 'city' then 'city'
        when 'longRide' then 'longTour'
        when 'offRoad' then 'offRoad'
        when 'sport' then 'curvyRoads'
        else 'weekendGetaway'
      end
    )
  end
$$;

-- 10.06 Engellenen kullanıcılar, most recently blocked first.
create or replace function public.list_blocked()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'name', coalesce(nullif(p.name, ''), p.handle, ''),
    'handle', coalesce(p.handle, ''),
    'avatarPath', p.avatar_path
  )
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc
$$;

-- Follower / following lists (future screens).
create or replace function public.list_follows(p_user uuid, p_direction text, p_limit integer default 50, p_offset integer default 0)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.author_json(p) || jsonb_build_object(
    'isFollowing', public.follows_accepted(auth.uid(), p.id),
    'followedAt', f.created_at
  )
  from public.follows f
  join public.profiles p on p.id = case when p_direction = 'followers' then f.follower_id else f.followee_id end
  where f.status = 'accepted'
    and case when p_direction = 'followers' then f.followee_id else f.follower_id end = p_user
    and not public.is_blocked_between(auth.uid(), p.id)
    and not public.is_blocked_between(auth.uid(), p_user)
  order by f.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
$$;

-- ---------------------------------------------------------------------------------------------
-- Reports, feedback, account deletion
-- ---------------------------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('rider', 'ride', 'post', 'comment', 'route', 'message')),
  target_id text not null,
  reason text check (char_length(reason) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references public.profiles (id) on delete set null,
  topic text not null check (topic in ('bug', 'idea', 'route', 'other')),
  message text not null check (char_length(message) between 1 and 5000),
  -- Storage paths in the private `feedback` bucket.
  screenshot_paths text[] not null default '{}',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- "Neden ayrılıyorsun?" (10.16), kept without the account.
create table public.account_deletions (
  id uuid primary key default gen_random_uuid(),
  reason text,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
alter table public.feedback enable row level security;
alter table public.account_deletions enable row level security;

create policy "report as yourself" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy "send feedback" on public.feedback
  for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());
revoke select, update, delete on public.reports, public.feedback, public.account_deletions from anon, authenticated;
revoke insert on public.account_deletions from anon, authenticated;
