-- In-app notifications (12.01), Expo push delivery and the events that create notifications.
--
-- Flow: a social event (like, comment, follow, approved suggestion, new routes nearby) inserts or
-- updates a row in `notifications` with ready-to-show text in the recipient's language. A trigger
-- then calls the `push` edge function through pg_net, which sends it to the recipient's Expo
-- push tokens if their settings allow it. The app also listens to `notifications` over Realtime.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  -- The last rider who caused it (aggregated likes keep the latest).
  actor_id uuid references public.profiles (id) on delete cascade,
  kind text not null check (kind in (
    'comment', 'like', 'routeSuggestion', 'follower', 'suggestionApproved',
    'followRequest', 'message', 'productUpdate'
  )),
  title text not null,
  body text not null,
  route_id text references public.routes (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  ride_id text references public.rides (id) on delete cascade,
  conversation_id uuid,
  -- Unread notifications with the same key are merged ("Ayşe ve 4 kişi daha …").
  group_key text,
  actor_count integer not null default 1,
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_group_idx on public.notifications (recipient_id, group_key) where read_at is null;

create table public.push_tokens (
  -- Expo push token, e.g. "ExponentPushToken[…]". A device moving between accounts re-registers.
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text check (platform in ('ios', 'android', 'web')),
  device_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

-- Internal settings (edge function URL, shared secret), readable only by definer functions.
create table private.config (
  key text primary key,
  value text not null
);

alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

create policy "own notifications" on public.notifications
  for select to authenticated using (recipient_id = auth.uid());
create policy "mark own notifications read" on public.notifications
  for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "delete own notifications" on public.notifications
  for delete to authenticated using (recipient_id = auth.uid());
revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "own push tokens" on public.push_tokens
  for select to authenticated using (user_id = auth.uid());
create policy "remove own push tokens" on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());
revoke insert, update on public.push_tokens from anon, authenticated;

-- Registers the device's Expo push token for the signed-in rider (moves it from another account).
create or replace function public.register_push_token(p_token text, p_platform text, p_device_name text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_token !~ '^(ExponentPushToken|ExpoPushToken)\[.+\]$' then
    raise exception 'invalid push token' using errcode = '22023';
  end if;
  insert into public.push_tokens (token, user_id, platform, device_name)
  values (p_token, auth.uid(), p_platform, p_device_name)
  on conflict (token) do update set
    user_id = excluded.user_id, platform = excluded.platform,
    device_name = excluded.device_name, updated_at = now();
end;
$$;

revoke execute on function public.register_push_token from public, anon;
grant execute on function public.register_push_token to authenticated;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.notifications set read_at = now() where recipient_id = auth.uid() and read_at is null
$$;

revoke execute on function public.mark_all_notifications_read from public, anon;
grant execute on function public.mark_all_notifications_read to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Text (TR / EN). Mirrors the copy of `notifications:mock.*` in the app.
-- ---------------------------------------------------------------------------------------------

create or replace function private.display_name(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(name, ''), handle, 'ROLT') from public.profiles where id = p_id
$$;

create or replace function private.notification_text(p_kind text, p_locale text, params jsonb)
returns table (title text, body text)
language plpgsql
immutable
set search_path = ''
as $$
declare
  en boolean := p_locale = 'en';
  actor text := coalesce(params ->> 'actor', '');
  others integer := greatest(coalesce((params ->> 'count')::integer, 1) - 1, 0);
  target text := coalesce(params ->> 'target', '');
  preview text := coalesce(params ->> 'text', '');
begin
  case p_kind
    when 'like' then
      if params ->> 'subject' = 'post' then
        title := case when en then 'Your post got likes' else 'Gönderin beğenildi' end;
        body := case
          when others > 0 and en then format('%s and %s others liked your post.', actor, others)
          when others > 0 then format('%s ve %s kişi daha gönderini beğendi.', actor, others)
          when en then format('%s liked your post.', actor)
          else format('%s gönderini beğendi.', actor)
        end;
      else
        title := case when en then 'Your ride got likes' else 'Sürüşün beğenildi' end;
        body := case
          when others > 0 and en then format('%s and %s others liked your %s ride.', actor, others, target)
          when others > 0 then format('%s ve %s kişi daha %s sürüşünü beğendi.', actor, others, target)
          when en then format('%s liked your %s ride.', actor, target)
          else format('%s, %s sürüşünü beğendi.', actor, target)
        end;
      end if;
    when 'comment' then
      if params ->> 'subject' = 'post' then
        title := case when en then 'New comment' else 'Yeni yorum' end;
        body := case when en then format('%s commented on your post: “%s”', actor, preview)
          else format('%s gönderine yorum yaptı: “%s”', actor, preview) end;
      else
        title := case when en then 'New ride comment' else 'Yeni sürüş yorumu' end;
        body := case when en then format('%s commented on your “%s” ride: “%s”', actor, target, preview)
          else format('%s, “%s” sürüşüne yorum yaptı: “%s”', actor, target, preview) end;
      end if;
    when 'follower' then
      title := case when en then 'New follower' else 'Yeni takipçi' end;
      body := case when en then format('%s started following you.', actor)
        else format('%s seni takip etmeye başladı.', actor) end;
    when 'followRequest' then
      title := case when en then 'Follow request' else 'Takip isteği' end;
      body := case when en then format('%s wants to follow you.', actor)
        else format('%s seni takip etmek istiyor.', actor) end;
    when 'suggestionApproved' then
      title := case when en then 'Your route suggestion was approved' else 'Rota önerin onaylandı' end;
      body := case when en then format('“%s” is now live in Discover.', target)
        else format('“%s” artık Keşfet’te yayında.', target) end;
    when 'routeSuggestion' then
      title := case when en then 'New route suggestions' else 'Yeni rota önerisi' end;
      body := case
        when (params ->> 'count')::integer > 1 and en
          then format('There are %s new routes for you around %s. Discover them now.', params ->> 'count', target)
        when (params ->> 'count')::integer > 1
          then format('%s çevresinde senin için %s yeni rota var. Hemen keşfet.', target, params ->> 'count')
        when en then format('A new route around %s: “%s”. Discover it now.', target, params ->> 'route')
        else format('%s çevresinde yeni bir rota var: “%s”. Hemen keşfet.', target, params ->> 'route')
      end;
    when 'message' then
      title := actor;
      body := preview;
    else
      title := coalesce(params ->> 'title', 'ROLT');
      body := coalesce(params ->> 'body', '');
  end case;
  return next;
end;
$$;

-- Creates a notification, or merges it into the recipient's unread one with the same group key.
create or replace function private.notify(
  p_recipient uuid,
  p_actor uuid,
  p_kind text,
  p_params jsonb,
  p_group_key text default null,
  p_route_id text default null,
  p_post_id uuid default null,
  p_ride_id text default null,
  p_conversation_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_locale text;
  existing public.notifications;
  params jsonb := p_params || jsonb_build_object('actor', private.display_name(p_actor));
  text_row record;
begin
  if p_recipient is null or p_recipient = p_actor or public.is_blocked_between(p_recipient, p_actor) then
    return;
  end if;
  select locale into recipient_locale from public.user_settings where user_id = p_recipient;

  if p_group_key is not null then
    select * into existing from public.notifications
    where recipient_id = p_recipient and group_key = p_group_key and read_at is null
    order by created_at desc limit 1;
  end if;

  if existing.id is not null then
    params := params || jsonb_build_object('count', existing.actor_count + 1);
    select * into text_row from private.notification_text(p_kind, recipient_locale, params);
    update public.notifications set
      actor_id = p_actor, actor_count = existing.actor_count + 1,
      title = text_row.title, body = text_row.body, created_at = now()
    where id = existing.id;
  else
    select * into text_row from private.notification_text(p_kind, recipient_locale, params || '{"count": 1}'::jsonb);
    insert into public.notifications (
      recipient_id, actor_id, kind, title, body, route_id, post_id, ride_id, conversation_id, group_key
    )
    values (
      p_recipient, p_actor, p_kind, text_row.title, text_row.body, p_route_id, p_post_id, p_ride_id,
      p_conversation_id, p_group_key
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Push: notifications → `push` edge function → Expo
-- ---------------------------------------------------------------------------------------------

create or replace function private.dispatch_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  url text := (select value from private.config where key = 'push_url');
  secret text := (select value from private.config where key = 'internal_secret');
begin
  if url is null or secret is null then
    return null;
  end if;
  -- Merged likes push again at most once an hour.
  if tg_op = 'UPDATE' and old.pushed_at is not null and old.pushed_at > now() - interval '1 hour' then
    return null;
  end if;
  perform net.http_post(
    url := url,
    body := jsonb_build_object('notificationId', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-rolt-secret', secret),
    timeout_milliseconds := 10000
  );
  return null;
end;
$$;

create trigger notifications_push after insert on public.notifications
  for each row execute function private.dispatch_push();
create trigger notifications_push_merged after update of actor_count on public.notifications
  for each row execute function private.dispatch_push();

-- ---------------------------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------------------------

create or replace function private.on_post_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post public.posts;
begin
  select * into post from public.posts where id = new.post_id;
  perform private.notify(
    post.author_id, new.user_id, 'like', jsonb_build_object('subject', 'post'),
    'like:post:' || post.id, null, post.id
  );
  return null;
end;
$$;

create trigger post_likes_notify after insert on public.post_likes
  for each row execute function private.on_post_like();

create or replace function private.on_ride_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ride public.rides;
begin
  select * into ride from public.rides where id = new.ride_id;
  perform private.notify(
    ride.owner_id, new.user_id, 'like',
    jsonb_build_object('subject', 'ride', 'target', coalesce(nullif(ride.title, ''), ride.route_name, ride.city, '')),
    'like:ride:' || ride.id, ride.route_id, null, ride.id
  );
  return null;
end;
$$;

create trigger ride_likes_notify after insert on public.ride_likes
  for each row execute function private.on_ride_like();

create or replace function private.on_post_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post public.posts;
begin
  select * into post from public.posts where id = new.post_id;
  perform private.notify(
    post.author_id, new.author_id, 'comment',
    jsonb_build_object('subject', 'post', 'text', left(new.text, 80)),
    null, null, post.id
  );
  return null;
end;
$$;

create trigger post_comments_notify after insert on public.post_comments
  for each row execute function private.on_post_comment();

create or replace function private.on_ride_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ride public.rides;
begin
  select * into ride from public.rides where id = new.ride_id;
  perform private.notify(
    ride.owner_id, new.author_id, 'comment',
    jsonb_build_object('subject', 'ride', 'target', coalesce(nullif(ride.title, ''), ride.route_name, ride.city, ''),
      'text', left(new.text, 80)),
    null, ride.route_id, null, ride.id
  );
  return null;
end;
$$;

create trigger ride_comments_notify after insert on public.ride_comments
  for each row execute function private.on_ride_comment();

create or replace function private.on_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status <> 'accepted') then
    -- Unfollow + follow again within a day doesn't notify twice.
    if not exists (
      select 1 from public.notifications
      where recipient_id = new.followee_id and actor_id = new.follower_id and kind = 'follower'
        and created_at > now() - interval '1 day'
    ) then
      perform private.notify(new.followee_id, new.follower_id, 'follower', '{}'::jsonb);
    end if;
  elsif new.status = 'pending' and tg_op = 'INSERT' then
    perform private.notify(new.followee_id, new.follower_id, 'followRequest', '{}'::jsonb);
  end if;
  return null;
end;
$$;

create trigger follows_notify after insert or update of status on public.follows
  for each row execute function private.on_follow();

-- Reviewer action (service role / Studio): publishes a suggestion as a route and tells the rider.
create or replace function public.approve_route_suggestion(p_id uuid, p_overrides jsonb default '{}'::jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.route_suggestions;
  new_route_id text;
  first_place jsonb;
  last_place jsonb;
begin
  select * into s from public.route_suggestions where id = p_id for update;
  if s.id is null or s.status <> 'pending' then
    raise exception 'suggestion not pending';
  end if;
  first_place := s.waypoints -> 0 -> 'place';
  last_place := s.waypoints -> (jsonb_array_length(s.waypoints) - 1) -> 'place';
  insert into public.routes (
    author_id, name, summary, tag, city, start_name, end_name, distance_km, duration_minutes,
    average_speed_kmh, max_speed_kmh, elevation_gain_m, difficulty, notes, cover_path, photo_paths,
    path, is_loop, source_suggestion_id
  )
  values (
    s.user_id,
    coalesce(p_overrides ->> 'name', s.name),
    coalesce(p_overrides ->> 'summary', left(s.description, 80)),
    coalesce(p_overrides ->> 'tag', s.tags[1]),
    coalesce(p_overrides ->> 'city', 'Antalya'),
    coalesce(first_place ->> 'name', ''),
    coalesce(last_place ->> 'name', ''),
    s.distance_km,
    s.duration_minutes,
    case when s.duration_minutes > 0 then round((s.distance_km / (s.duration_minutes / 60.0))::numeric, 1) else 0 end,
    case when s.duration_minutes > 0 then round((s.distance_km / (s.duration_minutes / 60.0) * 1.7)::numeric, 1) else 0 end,
    coalesce(s.elevation_gain_m, 0),
    s.difficulty,
    nullif(s.description, ''),
    s.photo_paths[1],
    s.photo_paths,
    s.path,
    extensions.st_dwithin(extensions.st_startpoint(s.path)::extensions.geography, extensions.st_endpoint(s.path)::extensions.geography, 300),
    s.id
  )
  returning id into new_route_id;
  update public.route_suggestions set status = 'approved', route_id = new_route_id, reviewed_at = now() where id = s.id;
  perform private.notify(
    s.user_id, null, 'suggestionApproved',
    jsonb_build_object('target', coalesce(p_overrides ->> 'name', s.name)),
    null, new_route_id
  );
  return new_route_id;
end;
$$;

revoke execute on function public.approve_route_suggestion from public, anon, authenticated;

create or replace function public.reject_route_suggestion(p_id uuid, p_note text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.route_suggestions set status = 'rejected', review_note = p_note, reviewed_at = now()
  where id = p_id and status = 'pending'
$$;

revoke execute on function public.reject_route_suggestion from public, anon, authenticated;

-- Weekly digest: riders with a home location hear about routes published near it in the last
-- week ("Antalya çevresinde senin için 3 yeni rota var").
create or replace function private.notify_new_routes_nearby()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  rider record;
  sent integer := 0;
begin
  for rider in
    select s.user_id,
           coalesce(s.home_place ->> 'name', p.city, '') as area,
           count(r.id) as route_count,
           (array_agg(r.name order by r.published_at desc))[1] as latest_name,
           (array_agg(r.id order by r.published_at desc))[1] as latest_id
    from public.user_settings s
    join public.profiles p on p.id = s.user_id
    join public.routes r on r.status = 'published'
      and r.published_at > now() - interval '7 days'
      and (r.author_id is null or r.author_id <> s.user_id)
      and extensions.st_dwithin(r.start_point, s.home_location, 100000)
    where s.home_location is not null and s.notify_route_suggestions and p.profile_completed
    group by s.user_id, s.home_place, p.city
  loop
    perform private.notify(
      rider.user_id, null, 'routeSuggestion',
      jsonb_build_object('count', rider.route_count, 'target', split_part(rider.area, ',', 1), 'route', rider.latest_name),
      null, case when rider.route_count = 1 then rider.latest_id end
    );
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

-- Product announcements (Studio / service role): to every rider who opted in.
create or replace function public.broadcast_product_update(
  p_title_tr text, p_body_tr text, p_title_en text, p_body_en text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  sent integer;
begin
  insert into public.notifications (recipient_id, kind, title, body)
  select s.user_id, 'productUpdate',
    case when s.locale = 'en' then p_title_en else p_title_tr end,
    case when s.locale = 'en' then p_body_en else p_body_tr end
  from public.user_settings s
  where s.notify_product_updates;
  get diagnostics sent = row_count;
  return sent;
end;
$$;

revoke execute on function public.broadcast_product_update from public, anon, authenticated;

-- The `push` edge function reads the notification, the recipient's tokens and whether this kind
-- of push is enabled, in one call (service role).
create or replace function public.push_payload(p_notification uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', n.id,
    'kind', n.kind,
    'title', n.title,
    'body', n.body,
    'routeId', n.route_id,
    'postId', n.post_id,
    'rideId', n.ride_id,
    'conversationId', n.conversation_id,
    'actorId', n.actor_id,
    'unreadCount', (select count(*) from public.notifications u where u.recipient_id = n.recipient_id and u.read_at is null),
    'enabled', case n.kind
      when 'like' then s.notify_likes
      when 'comment' then s.notify_comments
      when 'follower' then s.notify_followers
      when 'followRequest' then s.notify_followers
      when 'message' then s.notify_messages
      when 'routeSuggestion' then s.notify_route_suggestions
      when 'productUpdate' then s.notify_product_updates
      else true
    end,
    'tokens', coalesce((select jsonb_agg(t.token) from public.push_tokens t where t.user_id = n.recipient_id), '[]'::jsonb)
  )
  from public.notifications n
  join public.user_settings s on s.user_id = n.recipient_id
  where n.id = p_notification
$$;

revoke execute on function public.push_payload from public, anon, authenticated;
grant execute on function public.push_payload to service_role;
