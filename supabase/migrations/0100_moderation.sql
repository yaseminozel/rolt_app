-- Moderation: an admin role, automatic hiding of reported content and suspended riders.
--
-- * Admins are accounts whose `auth.users.raw_app_meta_data ->> 'role'` is 'admin'. Only the
--   service role can write app metadata (`scripts/supabase/make-admin.mjs <email>`).
-- * When three distinct verified riders (other than the owner) have an open report on the same
--   post, comment, ride, route or rider, it is hidden until an admin reviews it (`hidden_at`,
--   routes `status = 'hidden'`, riders `profiles.is_suspended`). Hidden content disappears for
--   everyone but its owner and admins; a suspended rider's profile and content disappear too.
--   The reported rider is not notified.
-- * Reports are deduplicated per reporter and target while open.

-- ---------------------------------------------------------------------------------------------
-- Admin role
-- ---------------------------------------------------------------------------------------------

-- Read from `auth.users` (not the JWT), so demoting an admin takes effect at once.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from auth.users
    where id = auth.uid() and raw_app_meta_data ->> 'role' = 'admin'
  )
$$;

grant execute on function public.is_admin to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------------------------

-- `reports`: automatic (three reports), `admin`: hidden on review, `removed`: removed on review
-- (rides and routes are kept hidden instead of deleted).
alter table public.posts
  add column hidden_at timestamptz,
  add column hidden_reason text check (hidden_reason in ('reports', 'admin', 'removed'));
alter table public.post_comments
  add column hidden_at timestamptz,
  add column hidden_reason text check (hidden_reason in ('reports', 'admin', 'removed'));
alter table public.ride_comments
  add column hidden_at timestamptz,
  add column hidden_reason text check (hidden_reason in ('reports', 'admin', 'removed'));
alter table public.rides
  add column hidden_at timestamptz,
  add column hidden_reason text check (hidden_reason in ('reports', 'admin', 'removed'));
-- Routes hide with `status = 'hidden'`; the reason tells moderation apart from a route hidden by
-- hand (no reason), which a dismissed report must not publish again.
alter table public.routes
  add column hidden_at timestamptz,
  add column hidden_reason text check (hidden_reason in ('reports', 'admin', 'removed'));

alter table public.profiles
  add column is_suspended boolean not null default false,
  add column suspended_at timestamptz,
  add column suspended_reason text check (suspended_reason in ('reports', 'admin'));

alter table public.reports
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  -- dismiss | hide | remove | suspend
  add column resolution text,
  add column resolution_note text check (char_length(resolution_note) <= 1000);

create index reports_target_idx on public.reports (target_type, target_id);
create index reports_open_idx on public.reports (created_at desc) where status = 'open';
create unique index reports_open_once on public.reports (reporter_id, target_type, target_id)
  where status = 'open';
create index posts_hidden_idx on public.posts (hidden_at) where hidden_at is not null;
create index rides_hidden_idx on public.rides (hidden_at) where hidden_at is not null;
create index profiles_suspended_idx on public.profiles (id) where is_suspended;

-- ---------------------------------------------------------------------------------------------
-- Visibility helpers
-- ---------------------------------------------------------------------------------------------

create or replace function public.is_suspended(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_suspended from public.profiles where id = p_id), false)
$$;

-- Whether moderation lets the viewer see an item of `p_owner`: the owner and admins always,
-- everyone else only while it isn't hidden and its owner isn't suspended.
create or replace function public.moderation_visible(p_owner uuid, p_hidden_at timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (p_owner is not null and p_owner = auth.uid())
    or (p_hidden_at is null and not public.is_suspended(p_owner))
    or public.is_admin()
$$;

grant execute on function public.is_suspended, public.moderation_visible to anon, authenticated;

-- A suspended rider's posts and rides are hidden from others (admins still see them).
create or replace function public.can_view_post(p_author uuid, p_audience text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_author = auth.uid()
    or (
      not public.is_blocked_between(auth.uid(), p_author)
      and (p_audience = 'public' or public.follows_accepted(auth.uid(), p_author))
      and (not public.is_suspended(p_author) or public.is_admin())
    )
$$;

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
      and (not public.is_suspended(p_owner) or public.is_admin())
    )
$$;

-- ---------------------------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------------------------

drop policy "profiles are public unless blocked" on public.profiles;
create policy "profiles are public unless blocked" on public.profiles
  for select to anon, authenticated
  using (
    not public.is_blocked_between(auth.uid(), id)
    and (not is_suspended or id = auth.uid() or public.is_admin())
  );

drop policy "visible posts" on public.posts;
create policy "visible posts" on public.posts
  for select to anon, authenticated
  using (public.can_view_post(author_id, audience) and public.moderation_visible(author_id, hidden_at));

drop policy "visible rides" on public.rides;
create policy "visible rides" on public.rides
  for select to anon, authenticated
  using (public.can_view_ride(owner_id, visibility) and public.moderation_visible(owner_id, hidden_at));

drop policy "comments of visible posts" on public.post_comments;
create policy "comments of visible posts" on public.post_comments
  for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id)
    and not public.is_blocked_between(auth.uid(), author_id)
    and public.moderation_visible(author_id, hidden_at));

drop policy "comments of visible rides" on public.ride_comments;
create policy "comments of visible rides" on public.ride_comments
  for select to anon, authenticated
  using (exists (select 1 from public.rides r where r.id = ride_id)
    and not public.is_blocked_between(auth.uid(), author_id)
    and public.moderation_visible(author_id, hidden_at));

drop policy "published routes are public" on public.routes;
create policy "published routes are public" on public.routes
  for select to anon, authenticated
  using ((status = 'published' and not public.is_suspended(author_id)) or author_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------------------------
-- Read models (same as before plus the moderation checks)
-- ---------------------------------------------------------------------------------------------

create or replace function private.visible_routes()
returns setof public.routes
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.routes r
  where r.status = 'published' and not public.is_blocked_between(auth.uid(), r.author_id)
    and not exists (select 1 from public.profiles a where a.id = r.author_id and a.is_suspended)
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
    and (
      (r.status = 'published' and not exists (select 1 from public.profiles a where a.id = r.author_id and a.is_suspended))
      or r.author_id = auth.uid()
      or public.is_admin()
    )
    and not public.is_blocked_between(auth.uid(), r.author_id)
$$;

create or replace function public.post_json(p public.posts)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'author', public.author_json(a),
    'createdAt', p.created_at,
    'text', p.text,
    'ride', p.ride_snapshot,
    'rideId', (
      select r.id from public.rides r
      where r.id = p.ride_id and public.can_view_ride(r.owner_id, r.visibility)
        and public.moderation_visible(r.owner_id, r.hidden_at)
    ),
    'photoPaths', to_jsonb(p.photo_paths),
    'likeCount', p.like_count,
    'commentCount', p.comment_count,
    'isLiked', exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
    'isFollowingAuthor', p.author_id = auth.uid() or public.follows_accepted(auth.uid(), p.author_id),
    'audience', p.audience
  )
  from public.profiles a
  where a.id = p.author_id
$$;

create or replace function public.community_feed(
  p_filter text default 'all',
  p_before timestamptz default null,
  p_limit integer default 20
)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.post_json(p)
  from public.posts p
  where public.can_view_post(p.author_id, p.audience)
    and public.moderation_visible(p.author_id, p.hidden_at)
    and (p_before is null or p.created_at < p_before)
    and (
      p_filter <> 'following'
      or p.author_id = auth.uid()
      or public.follows_accepted(auth.uid(), p.author_id)
    )
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 50)
$$;

create or replace function public.community_post(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.post_json(p)
  from public.posts p
  where p.id = p_id and public.can_view_post(p.author_id, p.audience)
    and public.moderation_visible(p.author_id, p.hidden_at)
$$;

create or replace function public.list_comments(p_target text, p_id text)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'postId', c.target_id,
    'author', public.author_json(a),
    'createdAt', c.created_at,
    'text', c.text
  )
  from (
    select pc.id, pc.post_id::text as target_id, pc.author_id, pc.created_at, pc.text, pc.hidden_at
    from public.post_comments pc
    join public.posts p on p.id = pc.post_id
    where p_target = 'post' and pc.post_id::text = p_id and public.can_view_post(p.author_id, p.audience)
      and public.moderation_visible(p.author_id, p.hidden_at)
    union all
    select rc.id, rc.ride_id, rc.author_id, rc.created_at, rc.text, rc.hidden_at
    from public.ride_comments rc
    join public.rides r on r.id = rc.ride_id
    where p_target = 'ride' and rc.ride_id = p_id and public.can_view_ride(r.owner_id, r.visibility)
      and public.moderation_visible(r.owner_id, r.hidden_at)
  ) c
  join public.profiles a on a.id = c.author_id
  where not public.is_blocked_between(auth.uid(), c.author_id)
    and public.moderation_visible(c.author_id, c.hidden_at)
  order by c.created_at
$$;

create or replace function public.community_search(p_query text, p_limit integer default 20)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with q as (select public.search_norm(p_query) as term)
  select jsonb_build_object(
    'riders', coalesce((
      select jsonb_agg(item) from (
        select jsonb_build_object(
          'kind', 'rider',
          'id', p.id,
          'name', coalesce(nullif(p.name, ''), p.handle),
          'handle', p.handle,
          'avatarPath', p.avatar_path,
          'bike', (select b.brand || ' ' || b.model from public.bikes b where b.owner_id = p.id and b.is_primary limit 1),
          'isFollowing', public.follows_accepted(auth.uid(), p.id)
        ) as item
        from public.profiles p, q
        where p.profile_completed and p.handle is not null
          and p.search_text like '%' || q.term || '%'
          and not public.is_blocked_between(auth.uid(), p.id)
          and (not p.is_suspended or p.id = auth.uid())
        order by p.follower_count desc
        limit p_limit
      ) riders
    ), '[]'::jsonb),
    'rides', coalesce((
      select jsonb_agg(item) from (
        select jsonb_build_object(
          'kind', 'ride',
          'postId', p.id,
          'title', p.ride_snapshot ->> 'title',
          'authorName', coalesce(nullif(a.name, ''), a.handle),
          'distanceKm', (p.ride_snapshot ->> 'distanceKm')::double precision,
          'durationMinutes', (p.ride_snapshot ->> 'durationMinutes')::double precision,
          'photoPath', p.photo_paths[1],
          'preview', p.ride_snapshot -> 'preview'
        ) as item
        from public.posts p
        join public.profiles a on a.id = p.author_id, q
        where p.ride_snapshot is not null and p.audience = 'public'
          and p.search_text like '%' || q.term || '%'
          and not public.is_blocked_between(auth.uid(), p.author_id)
          and ((p.hidden_at is null and not a.is_suspended) or p.author_id = auth.uid())
        order by p.like_count desc, p.created_at desc
        limit p_limit
      ) rides
    ), '[]'::jsonb),
    'places', coalesce((
      select jsonb_agg(item) from (
        select jsonb_build_object(
          'kind', 'place',
          'id', pl.id,
          'name', case when pl.name = pl.province then pl.name else pl.name || ', ' || pl.province end,
          'rideCount', (
            select count(*) from public.rides r
            where r.visibility = 'public' and r.start_point is not null and r.hidden_at is null
              and extensions.st_dwithin(r.start_point, pl.centre, 25000)
              and not exists (select 1 from public.profiles o where o.id = r.owner_id and o.is_suspended)
          )
        ) as item
        from public.places pl, q
        where pl.search_text like '%' || q.term || '%'
        limit p_limit
      ) places
    ), '[]'::jsonb)
  )
$$;

create or replace function public.get_ride(p_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.ride_summary_json(r) || jsonb_build_object(
    'author', public.author_json(a),
    'difficulty', r.difficulty,
    'surface', r.surface
  )
  from public.rides r
  join public.profiles a on a.id = r.owner_id
  where r.id = p_id and public.can_view_ride(r.owner_id, r.visibility)
    and public.moderation_visible(r.owner_id, r.hidden_at)
$$;

create or replace function public.saved_rides(p_limit integer default 50)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.ride_summary_json(r) || jsonb_build_object(
    'author', public.author_json(a),
    'savedAt', s.created_at
  )
  from public.ride_saves s
  join public.rides r on r.id = s.ride_id
  join public.profiles a on a.id = r.owner_id
  where s.user_id = auth.uid() and public.can_view_ride(r.owner_id, r.visibility)
    and public.moderation_visible(r.owner_id, r.hidden_at)
  order by s.created_at desc
  limit least(greatest(p_limit, 1), 100)
$$;

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
    and public.moderation_visible(r.owner_id, r.hidden_at)
    and (p_before is null or r.started_at < p_before)
  order by r.started_at desc
  limit least(greatest(p_limit, 1), 100)
$$;

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
      and public.moderation_visible(owner_id, hidden_at)
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

-- A suspended rider's profile is gone for others (null, like a block); they still see their own.
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
    and (not p.is_suspended or p.id = auth.uid() or public.is_admin())
$$;

create or replace function public.rider_id_by_handle(p_handle text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p
  where p.handle = lower(trim(p_handle)) and not public.is_blocked_between(auth.uid(), p.id)
    and (not p.is_suspended or p.id = auth.uid() or public.is_admin())
$$;

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
    and (not p.is_suspended or p.id = auth.uid() or public.is_admin())
  order by f.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
$$;

-- ---------------------------------------------------------------------------------------------
-- Report targets
-- ---------------------------------------------------------------------------------------------

-- Which table a reported comment lives in: 'post' (post_comments), 'ride' (ride_comments) or
-- null. Reports name both kinds 'comment'.
create or replace function private.comment_table(p_id text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then null
    when exists (select 1 from public.post_comments where id = p_id::uuid) then 'post'
    when exists (select 1 from public.ride_comments where id = p_id::uuid) then 'ride'
  end
$$;

-- The account behind a reported item (null when it no longer exists or has no owner).
create or replace function private.report_target_owner(p_type text, p_id text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  is_uuid boolean := p_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  case p_type
    when 'rider' then
      return case when is_uuid then (select id from public.profiles where id = p_id::uuid) end;
    when 'post' then
      return case when is_uuid then (select author_id from public.posts where id = p_id::uuid) end;
    when 'comment' then
      return case private.comment_table(p_id)
        when 'post' then (select author_id from public.post_comments where id = p_id::uuid)
        when 'ride' then (select author_id from public.ride_comments where id = p_id::uuid)
      end;
    when 'ride' then
      return (select owner_id from public.rides where id = p_id);
    when 'route' then
      return (select author_id from public.routes where id = p_id);
    when 'message' then
      return case when is_uuid then (select sender_id from public.messages where id = p_id::uuid) end;
    else
      return null;
  end case;
end;
$$;

-- Hides (`p_hide`) or shows a reported item. Hiding keeps an earlier time and reason unless
-- `p_reason` is 'removed'; showing only undoes moderation (a route hidden by hand stays hidden).
-- For riders this suspends / reinstates the account.
create or replace function private.set_target_hidden(p_type text, p_id text, p_hide boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_uuid boolean := p_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  comment_kind text := case when p_type = 'comment' then private.comment_table(p_id) end;
  force boolean := p_reason = 'removed';
begin
  if p_type = 'rider' and is_uuid then
    if p_hide then
      update public.profiles set
        is_suspended = true,
        suspended_at = coalesce(suspended_at, now()),
        suspended_reason = coalesce(suspended_reason, case when p_reason = 'reports' then 'reports' else 'admin' end)
      where id = p_id::uuid;
    else
      update public.profiles set is_suspended = false, suspended_at = null, suspended_reason = null
      where id = p_id::uuid;
    end if;
  elsif p_type = 'post' and is_uuid then
    if p_hide then
      update public.posts set
        hidden_at = case when force then now() else coalesce(hidden_at, now()) end,
        hidden_reason = case when force then p_reason else coalesce(hidden_reason, p_reason) end
      where id = p_id::uuid;
    else
      update public.posts set hidden_at = null, hidden_reason = null where id = p_id::uuid;
    end if;
  elsif comment_kind = 'post' then
    if p_hide then
      update public.post_comments set
        hidden_at = case when force then now() else coalesce(hidden_at, now()) end,
        hidden_reason = case when force then p_reason else coalesce(hidden_reason, p_reason) end
      where id = p_id::uuid;
    else
      update public.post_comments set hidden_at = null, hidden_reason = null where id = p_id::uuid;
    end if;
  elsif comment_kind = 'ride' then
    if p_hide then
      update public.ride_comments set
        hidden_at = case when force then now() else coalesce(hidden_at, now()) end,
        hidden_reason = case when force then p_reason else coalesce(hidden_reason, p_reason) end
      where id = p_id::uuid;
    else
      update public.ride_comments set hidden_at = null, hidden_reason = null where id = p_id::uuid;
    end if;
  elsif p_type = 'ride' then
    if p_hide then
      update public.rides set
        hidden_at = case when force then now() else coalesce(hidden_at, now()) end,
        hidden_reason = case when force then p_reason else coalesce(hidden_reason, p_reason) end
      where id = p_id;
    else
      update public.rides set hidden_at = null, hidden_reason = null where id = p_id;
    end if;
  elsif p_type = 'route' then
    if p_hide then
      -- A route hidden by hand (no reason) keeps no reason, so it is never published by moderation.
      update public.routes set
        status = 'hidden',
        hidden_at = case when force then now() else coalesce(hidden_at, now()) end,
        hidden_reason = case
          when status = 'hidden' and hidden_reason is null then null
          when force then p_reason
          else coalesce(hidden_reason, p_reason)
        end
      where id = p_id;
    else
      update public.routes set status = 'published', hidden_at = null, hidden_reason = null
      where id = p_id and status = 'hidden' and hidden_reason is not null;
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Reports: deduplication and automatic hiding
-- ---------------------------------------------------------------------------------------------

-- A rider reporting the same item again while their report is open changes nothing (no error).
create or replace function private.before_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.reports
    where reporter_id = new.reporter_id and target_type = new.target_type
      and target_id = new.target_id and status = 'open'
  ) then
    return null;
  end if;
  new.status := 'open';
  return new;
end;
$$;

create trigger reports_before before insert on public.reports
  for each row execute function private.before_report();

-- Three distinct verified reporters with open reports (the owner doesn't count) hide the item.
create or replace function private.after_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  reporters integer;
  threshold constant integer := 3;
begin
  if new.target_type not in ('rider', 'post', 'comment', 'ride', 'route') then
    return null;
  end if;
  owner := private.report_target_owner(new.target_type, new.target_id);
  if owner is null and new.target_type <> 'route' then
    return null;
  end if;
  select count(distinct r.reporter_id) into reporters
  from public.reports r
  join auth.users u on u.id = r.reporter_id
  where r.target_type = new.target_type and r.target_id = new.target_id and r.status = 'open'
    and u.email_confirmed_at is not null
    and r.reporter_id is distinct from owner;
  if reporters >= threshold then
    perform private.set_target_hidden(new.target_type, new.target_id, true, 'reports');
  end if;
  return null;
end;
$$;

create trigger reports_after after insert on public.reports
  for each row execute function private.after_report();

-- Riders can't touch moderation columns (insert sets only the report itself).
revoke insert on public.reports from anon, authenticated;
grant insert (reporter_id, target_type, target_id, reason) on public.reports to authenticated;
