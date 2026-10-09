-- Community (Akış 22): posts with text / photos / a shared ride, likes and comments.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text text check (char_length(text) <= 2000),
  -- The shared ride, when there is one; `ride_snapshot` keeps the card as posted (`PostRide`).
  ride_id text references public.rides (id) on delete set null,
  ride_snapshot jsonb,
  -- Storage paths in the `post-photos` bucket.
  photo_paths text[] not null default '{}',
  audience text not null default 'public' check (audience in ('public', 'followers')),
  like_count integer not null default 0,
  comment_count integer not null default 0,
  search_text text generated always as (public.search_norm(coalesce(text, '') || ' ' || coalesce(ride_snapshot ->> 'title', ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nullif(trim(text), '') is not null or ride_snapshot is not null or cardinality(photo_paths) > 0)
);

create index posts_created_idx on public.posts (created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_search_idx on public.posts using gin (search_text extensions.gin_trgm_ops);
create trigger posts_touch before update on public.posts
  for each row execute function private.touch_updated_at();

create table public.post_likes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index post_likes_post_idx on public.post_likes (post_id);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Future threaded replies.
  parent_id uuid references public.post_comments (id) on delete cascade,
  text text not null check (char_length(trim(text)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments (post_id, created_at);

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
    )
$$;

create or replace function private.post_child_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
  target uuid := coalesce(new.post_id, old.post_id);
begin
  if tg_table_name = 'post_likes' then
    update public.posts set like_count = greatest(like_count + delta, 0) where id = target;
  else
    update public.posts set comment_count = greatest(comment_count + delta, 0) where id = target;
  end if;
  return null;
end;
$$;

create trigger post_likes_counts after insert or delete on public.post_likes
  for each row execute function private.post_child_counts();
create trigger post_comments_counts after insert or delete on public.post_comments
  for each row execute function private.post_child_counts();

-- Row level security ---------------------------------------------------------------------------

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

create policy "visible posts" on public.posts
  for select to anon, authenticated
  using (public.can_view_post(author_id, audience));
create policy "post as yourself" on public.posts
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_verified()
    and (ride_id is null or exists (select 1 from public.rides r where r.id = ride_id and r.owner_id = auth.uid())));
create policy "edit own posts" on public.posts
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "delete own posts" on public.posts
  for delete to authenticated using (author_id = auth.uid());
revoke update on public.posts from anon, authenticated;
grant update (text, audience) on public.posts to authenticated;

create policy "likes of visible posts" on public.post_likes
  for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy "like as yourself" on public.post_likes
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_verified()
    and exists (select 1 from public.posts p where p.id = post_id));
create policy "unlike" on public.post_likes
  for delete to authenticated using (user_id = auth.uid());

create policy "comments of visible posts" on public.post_comments
  for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id)
    and not public.is_blocked_between(auth.uid(), author_id));
create policy "comment as yourself" on public.post_comments
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_verified()
    and exists (select 1 from public.posts p where p.id = post_id));
create policy "delete own comment or on own post" on public.post_comments
  for delete to authenticated
  using (author_id = auth.uid()
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

-- Read model ------------------------------------------------------------------------------------

create or replace function public.author_json(p public.profiles)
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
    'isOfficial', p.is_official,
    'bike', (
      select b.brand || ' ' || b.model from public.bikes b
      where b.owner_id = p.id and b.is_primary limit 1
    )
  )
$$;

-- One post as the app's `CommunityPost` (src/features/community/types.ts), relative to the viewer.
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
    'rideId', p.ride_id,
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

-- "Son paylaşılanlar" (13.01): everyone or only followed riders (plus the viewer), newest first;
-- `p_before` pages back.
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
$$;

-- Comments of a post (`target = 'post'`) or a ride (`target = 'ride'`), oldest first.
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
    select pc.id, pc.post_id::text as target_id, pc.author_id, pc.created_at, pc.text
    from public.post_comments pc
    join public.posts p on p.id = pc.post_id
    where p_target = 'post' and pc.post_id::text = p_id and public.can_view_post(p.author_id, p.audience)
    union all
    select rc.id, rc.ride_id, rc.author_id, rc.created_at, rc.text
    from public.ride_comments rc
    join public.rides r on r.id = rc.ride_id
    where p_target = 'ride' and rc.ride_id = p_id and public.can_view_ride(r.owner_id, r.visibility)
  ) c
  join public.profiles a on a.id = c.author_id
  where not public.is_blocked_between(auth.uid(), c.author_id)
  order by c.created_at
$$;

create or replace function public.add_comment(p_target text, p_id text, p_text text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
  created timestamptz;
begin
  if p_target = 'post' then
    insert into public.post_comments (post_id, text) values (p_id::uuid, trim(p_text))
    returning id, created_at into new_id, created;
  elsif p_target = 'ride' then
    insert into public.ride_comments (ride_id, text) values (p_id, trim(p_text))
    returning id, created_at into new_id, created;
  else
    raise exception 'unknown target %', p_target;
  end if;
  return jsonb_build_object(
    'id', new_id,
    'postId', p_id,
    'author', (select public.author_json(a) from public.profiles a where a.id = auth.uid()),
    'createdAt', created,
    'text', trim(p_text)
  );
end;
$$;

revoke execute on function public.add_comment from public, anon;
grant execute on function public.add_comment to authenticated;

-- 13.04 search: riders, public rides shared in posts, and places with their ride counts.
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
            where r.visibility = 'public' and r.start_point is not null
              and extensions.st_dwithin(r.start_point, pl.centre, 25000)
          )
        ) as item
        from public.places pl, q
        where pl.search_text like '%' || q.term || '%'
        limit p_limit
      ) places
    ), '[]'::jsonb)
  )
$$;
