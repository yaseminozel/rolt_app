-- ROLT backend foundation: extensions, helpers, profiles, settings, garage, follows, blocks.
-- Applied with `scripts/supabase/migrate.sh` as the `postgres` role so Supabase's default
-- grants (anon / authenticated / service_role) apply to every object created here.

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------------

-- Forgiving search key, the SQL twin of `normalizeForSearch` (src/lib/searchText.ts):
-- every I/İ/ı/i becomes "i", Turkish letters fold to ASCII, other diacritics are stripped.
create or replace function public.search_norm(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select extensions.unaccent(
    'extensions.unaccent'::regdictionary,
    lower(translate(coalesce(value, ''), 'İIıŞşĞğÜüÖöÇç', 'iiissgguuoocc'))
  )
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Profiles (public part of an account) and settings (private part)
-- ---------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Username without "@"; null until registration (04.01) picks one.
  handle text unique check (handle ~ '^[a-z0-9_.]{3,20}$'),
  name text not null default '' check (char_length(name) <= 60),
  bio text check (char_length(bio) <= 300),
  -- Free-form location line, e.g. "Antalya, Türkiye".
  city text check (char_length(city) <= 80),
  avatar_path text,
  profile_completed boolean not null default false,
  -- Future: private accounts turn new follows into requests (`follows.status = 'pending'`).
  is_private boolean not null default false,
  -- ROLT's own account, author of the curated route catalog.
  is_official boolean not null default false,
  follower_count integer not null default 0,
  following_count integer not null default 0,
  ride_count integer not null default 0,
  ride_distance_m double precision not null default 0,
  search_text text generated always as (public.search_norm(name || ' ' || coalesce(handle, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_search_idx on public.profiles using gin (search_text extensions.gin_trgm_ops);

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- Language of server-written text (notifications, emails).
  locale text not null default 'tr' check (locale in ('tr', 'en')),
  -- 04.02 "Konumun": the picked place ({ id, name, subtitle, coordinates }) and its point.
  home_place jsonb,
  home_location extensions.geography(point, 4326),
  -- 10.04 / 08.08: the first ride is private, afterwards the last choice.
  default_ride_visibility text not null default 'private'
    check (default_ride_visibility in ('public', 'followers', 'private')),
  -- 10.05: the start and end of shared rides are cut for other riders.
  hide_endpoints boolean not null default true,
  endpoint_distance_m integer not null default 250 check (endpoint_distance_m in (100, 250, 500, 1000)),
  -- 10.09 Bildirimler.
  notify_likes boolean not null default true,
  notify_comments boolean not null default true,
  notify_followers boolean not null default true,
  notify_messages boolean not null default true,
  notify_route_suggestions boolean not null default true,
  notify_product_updates boolean not null default false,
  welcome_email_sent_at timestamptz,
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_settings_home_idx on public.user_settings using gist (home_location);

create trigger user_settings_touch before update on public.user_settings
  for each row execute function private.touch_updated_at();

-- A new auth user gets an empty profile and default settings. Google / Apple accounts bring a
-- name; the app sends `locale` in the sign-up metadata.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_locale text := case when meta ->> 'locale' = 'en' then 'en' else 'tr' end;
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(meta ->> 'full_name', meta ->> 'name', ''), 60))
  on conflict (id) do nothing;
  insert into public.user_settings (user_id, locale)
  values (new.id, user_locale)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------------------------
-- Garage
-- ---------------------------------------------------------------------------------------------

create table public.bikes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  brand text not null,
  -- Catalog id (`garage/fixtures/motorcycleModels`), when picked from the list.
  model_id text,
  model text not null,
  year integer check (year between 1900 and 2100),
  displacement_cc integer,
  category text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);

create index bikes_owner_idx on public.bikes (owner_id);
create unique index bikes_one_primary on public.bikes (owner_id) where is_primary;

-- ---------------------------------------------------------------------------------------------
-- Follows and blocks
-- ---------------------------------------------------------------------------------------------

create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  -- `pending` is a follow request to a private account (future); public accounts accept at once.
  status text not null default 'accepted' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_idx on public.follows (followee_id, status);

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

-- True when either user blocked the other. Hides profiles, content and interactions both ways.
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select a is not null and b is not null and exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

-- True when `viewer` follows `target` with an accepted follow.
create or replace function public.follows_accepted(viewer uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select viewer is not null and exists (
    select 1 from public.follows
    where follower_id = viewer and followee_id = target and status = 'accepted'
  )
$$;

-- Accounts that confirmed their email (or signed in with Google / Apple) may write content;
-- unverified email accounts can sign in (02.07) but not post, like, follow or comment.
create or replace function public.is_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and email_confirmed_at is not null
  )
$$;

create or replace function private.before_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_blocked_between(new.follower_id, new.followee_id) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.status := case
      when (select is_private from public.profiles where id = new.followee_id) then 'pending'
      else 'accepted'
    end;
  end if;
  if new.status = 'accepted' and new.accepted_at is null then
    new.accepted_at := now();
  end if;
  return new;
end;
$$;

create trigger follows_before before insert or update on public.follows
  for each row execute function private.before_follow();

-- Follower / following counters count accepted follows only.
create or replace function private.follow_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_accepted boolean := tg_op in ('UPDATE', 'DELETE') and old.status = 'accepted';
  is_accepted boolean := tg_op in ('INSERT', 'UPDATE') and new.status = 'accepted';
  delta integer := (case when is_accepted then 1 else 0 end) - (case when was_accepted then 1 else 0 end);
  row_follower uuid := coalesce(new.follower_id, old.follower_id);
  row_followee uuid := coalesce(new.followee_id, old.followee_id);
begin
  if delta <> 0 then
    update public.profiles set follower_count = greatest(follower_count + delta, 0) where id = row_followee;
    update public.profiles set following_count = greatest(following_count + delta, 0) where id = row_follower;
  end if;
  return null;
end;
$$;

create trigger follows_counts after insert or update or delete on public.follows
  for each row execute function private.follow_counts();

-- Blocking ends follows in both directions.
create or replace function private.after_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return null;
end;
$$;

create trigger blocks_after after insert on public.blocks
  for each row execute function private.after_block();

-- ---------------------------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.bikes enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;

create policy "profiles are public unless blocked" on public.profiles
  for select to anon, authenticated
  using (not public.is_blocked_between(auth.uid(), id));
create policy "own profile is editable" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Counters and flags are written by triggers and admins only.
revoke update on public.profiles from anon, authenticated;
grant update (handle, name, bio, city, avatar_path, profile_completed, is_private)
  on public.profiles to authenticated;

create policy "own settings" on public.user_settings
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, update on public.user_settings from anon, authenticated;
grant update (locale, home_place, home_location, default_ride_visibility, hide_endpoints,
  endpoint_distance_m, notify_likes, notify_comments, notify_followers, notify_messages,
  notify_route_suggestions, notify_product_updates)
  on public.user_settings to authenticated;

create policy "bikes are public" on public.bikes
  for select to anon, authenticated
  using (not public.is_blocked_between(auth.uid(), owner_id));
create policy "own bikes" on public.bikes
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "follows are visible" on public.follows
  for select to anon, authenticated
  using (status = 'accepted' or follower_id = auth.uid() or followee_id = auth.uid());
create policy "follow as yourself" on public.follows
  for insert to authenticated
  with check (follower_id = auth.uid() and public.is_verified());
create policy "accept requests to you" on public.follows
  for update to authenticated
  using (followee_id = auth.uid()) with check (followee_id = auth.uid());
create policy "unfollow or remove a follower" on public.follows
  for delete to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid());

create policy "own blocks" on public.blocks
  for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
