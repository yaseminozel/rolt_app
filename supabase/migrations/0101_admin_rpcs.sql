-- Admin panel (https://roltapp.com/admin, web/admin.html): overview counts, reports grouped by
-- reported item, their resolution, and route suggestion review. Every function checks
-- `public.is_admin()`; the panel signs in with Supabase Auth and calls them with the anon key.

create or replace function private.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$$;

-- A rider as shown in the panel.
create or replace function private.admin_person(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'handle', p.handle,
    'avatarPath', p.avatar_path,
    'isSuspended', p.is_suspended,
    'isOfficial', p.is_official
  )
  from public.profiles p
  where p.id = p_id
$$;

-- What a report points at, for the panel. `exists: false` when it was deleted. Photo paths come
-- with their bucket (public buckets: the panel builds public URLs).
create or replace function private.report_target_preview(p_type text, p_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  is_uuid boolean := p_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  result jsonb;
begin
  if p_type = 'rider' and is_uuid then
    select jsonb_build_object(
      'exists', true,
      'title', coalesce(nullif(p.name, ''), p.handle),
      'text', p.bio,
      'subtitle', p.city,
      'bucket', 'avatars',
      'photoPaths', case when p.avatar_path is null then '[]'::jsonb else jsonb_build_array(p.avatar_path) end,
      'author', private.admin_person(p.id),
      'createdAt', p.created_at,
      'hidden', p.is_suspended,
      'hiddenReason', p.suspended_reason,
      'stats', jsonb_build_object('followers', p.follower_count, 'rides', p.ride_count)
    ) into result
    from public.profiles p where p.id = p_id::uuid;
  elsif p_type = 'post' and is_uuid then
    select jsonb_build_object(
      'exists', true,
      'title', p.ride_snapshot ->> 'title',
      'text', p.text,
      'subtitle', p.audience,
      'bucket', 'post-photos',
      'photoPaths', to_jsonb(p.photo_paths),
      'author', private.admin_person(p.author_id),
      'createdAt', p.created_at,
      'hidden', p.hidden_at is not null,
      'hiddenReason', p.hidden_reason
    ) into result
    from public.posts p where p.id = p_id::uuid;
  elsif p_type = 'comment' and private.comment_table(p_id) = 'post' then
    select jsonb_build_object(
      'exists', true,
      'kind', 'postComment',
      'parentId', c.post_id,
      'title', left(p.text, 120),
      'text', c.text,
      'author', private.admin_person(c.author_id),
      'createdAt', c.created_at,
      'hidden', c.hidden_at is not null,
      'hiddenReason', c.hidden_reason
    ) into result
    from public.post_comments c left join public.posts p on p.id = c.post_id
    where c.id = p_id::uuid;
  elsif p_type = 'comment' and private.comment_table(p_id) = 'ride' then
    select jsonb_build_object(
      'exists', true,
      'kind', 'rideComment',
      'parentId', c.ride_id,
      'title', r.title,
      'text', c.text,
      'author', private.admin_person(c.author_id),
      'createdAt', c.created_at,
      'hidden', c.hidden_at is not null,
      'hiddenReason', c.hidden_reason
    ) into result
    from public.ride_comments c left join public.rides r on r.id = c.ride_id
    where c.id = p_id::uuid;
  elsif p_type = 'ride' then
    select jsonb_build_object(
      'exists', true,
      'title', r.title,
      'text', nullif(r.notes, ''),
      'subtitle', r.visibility,
      'bucket', 'ride-photos',
      'photoPaths', to_jsonb(r.photo_paths),
      'author', private.admin_person(r.owner_id),
      'createdAt', r.started_at,
      'hidden', r.hidden_at is not null,
      'hiddenReason', r.hidden_reason,
      'stats', jsonb_build_object('distanceM', r.distance_m, 'durationS', r.duration_s)
    ) into result
    from public.rides r where r.id = p_id;
  elsif p_type = 'route' then
    select jsonb_build_object(
      'exists', true,
      'title', r.name,
      'text', r.summary,
      'subtitle', r.city,
      'bucket', 'route-photos',
      'photoPaths', to_jsonb(r.photo_paths),
      'author', private.admin_person(r.author_id),
      'createdAt', r.published_at,
      'hidden', r.status = 'hidden',
      'hiddenReason', r.hidden_reason,
      'stats', jsonb_build_object('distanceKm', r.distance_km, 'durationMinutes', r.duration_minutes)
    ) into result
    from public.routes r where r.id = p_id;
  elsif p_type = 'message' and is_uuid then
    select jsonb_build_object(
      'exists', m.deleted_at is null,
      'text', m.body,
      'author', private.admin_person(m.sender_id),
      'createdAt', m.created_at,
      'hidden', m.deleted_at is not null
    ) into result
    from public.messages m where m.id = p_id::uuid;
  end if;
  return coalesce(result, jsonb_build_object('exists', false));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Overview
-- ---------------------------------------------------------------------------------------------

create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  week timestamptz := now() - interval '7 days';
begin
  perform private.require_admin();
  return jsonb_build_object(
    'users', (select count(*) from auth.users),
    'usersLast7d', (select count(*) from auth.users where created_at > week),
    'profilesCompleted', (select count(*) from public.profiles where profile_completed),
    'rides', (select count(*) from public.rides),
    'ridesLast7d', (select count(*) from public.rides where created_at > week),
    'posts', (select count(*) from public.posts),
    'postsLast7d', (select count(*) from public.posts where created_at > week),
    'openReports', (select count(*) from public.reports where status = 'open'),
    'openReportTargets', (select count(distinct (target_type, target_id)) from public.reports where status = 'open'),
    'hiddenItems', (
      (select count(*) from public.posts where hidden_at is not null)
      + (select count(*) from public.post_comments where hidden_at is not null)
      + (select count(*) from public.ride_comments where hidden_at is not null)
      + (select count(*) from public.rides where hidden_at is not null)
      + (select count(*) from public.routes where hidden_reason is not null)
    ),
    'suspendedRiders', (select count(*) from public.profiles where is_suspended),
    'pendingSuggestions', (select count(*) from public.route_suggestions where status = 'pending')
  );
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------------------------

-- Reported items, most recently reported first. `p_status`: 'open' (items with open reports) or
-- 'closed' (reviewed items without open reports).
create or replace function public.admin_reports(p_status text default 'open', p_limit integer default 100)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  with grouped as (
    select r.target_type, r.target_id,
      count(*) filter (where r.status = 'open') as open_count,
      count(distinct r.reporter_id) as reporter_count,
      max(r.created_at) as last_reported_at,
      min(r.created_at) as first_reported_at,
      max(r.reviewed_at) as reviewed_at,
      (array_agg(r.resolution order by r.reviewed_at desc nulls last))[1] as resolution,
      (array_agg(r.resolution_note order by r.reviewed_at desc nulls last))[1] as resolution_note,
      jsonb_agg(jsonb_build_object(
        'id', r.id,
        'reason', r.reason,
        'status', r.status,
        'createdAt', r.created_at,
        'reporter', private.admin_person(r.reporter_id)
      ) order by r.created_at desc) as reports
    from public.reports r
    group by r.target_type, r.target_id
  )
  select jsonb_build_object(
    'targetType', g.target_type,
    'targetId', g.target_id,
    'openCount', g.open_count,
    'reportCount', jsonb_array_length(g.reports),
    'reporterCount', g.reporter_count,
    'firstReportedAt', g.first_reported_at,
    'lastReportedAt', g.last_reported_at,
    'reviewedAt', g.reviewed_at,
    'resolution', g.resolution,
    'resolutionNote', g.resolution_note,
    'reports', g.reports,
    'target', private.report_target_preview(g.target_type, g.target_id)
  )
  from grouped g
  where case when p_status = 'closed' then g.open_count = 0 else g.open_count > 0 end
  order by g.last_reported_at desc
  limit least(greatest(p_limit, 1), 500);
end;
$$;

-- Resolves every report of an item:
--   dismiss  reports were unfounded: shows the item again (reinstates a rider)
--   hide     keeps the item hidden from others (suspends a reported rider)
--   remove   deletes posts, comments and messages; rides and routes stay hidden ('removed');
--            suspends a reported rider
--   suspend  suspends the item's owner and keeps the item hidden
-- Returns the item's preview after the action.
create or replace function public.admin_resolve_report(
  p_target_type text,
  p_target_id text,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  comment_kind text;
begin
  perform private.require_admin();
  if p_action not in ('dismiss', 'hide', 'remove', 'suspend') then
    raise exception 'unknown action %', p_action using errcode = '22023';
  end if;
  if not exists (select 1 from public.reports where target_type = p_target_type and target_id = p_target_id) then
    raise exception 'no reports for this item' using errcode = 'P0002';
  end if;
  owner := private.report_target_owner(p_target_type, p_target_id);

  if p_action = 'dismiss' then
    perform private.set_target_hidden(p_target_type, p_target_id, false, null);
  elsif p_action = 'hide' then
    perform private.set_target_hidden(p_target_type, p_target_id, true, 'admin');
  elsif p_action = 'suspend' then
    if owner is null then
      raise exception 'item has no owner' using errcode = '22023';
    end if;
    perform private.set_target_hidden('rider', owner::text, true, 'admin');
    if p_target_type <> 'rider' then
      perform private.set_target_hidden(p_target_type, p_target_id, true, 'admin');
    end if;
  elsif p_action = 'remove' then
    comment_kind := case when p_target_type = 'comment' then private.comment_table(p_target_id) end;
    if p_target_type = 'post' then
      delete from public.posts where id = p_target_id::uuid;
    elsif comment_kind = 'post' then
      delete from public.post_comments where id = p_target_id::uuid;
    elsif comment_kind = 'ride' then
      delete from public.ride_comments where id = p_target_id::uuid;
    elsif p_target_type = 'message' then
      update public.messages set deleted_at = coalesce(deleted_at, now()) where id = p_target_id::uuid;
    elsif p_target_type = 'rider' then
      perform private.set_target_hidden('rider', p_target_id, true, 'admin');
    else
      -- Rides are local-first (a deleted ride would come back with the next upload) and routes
      -- belong to the catalog: both stay hidden.
      perform private.set_target_hidden(p_target_type, p_target_id, true, 'removed');
    end if;
  end if;

  update public.reports set
    status = case when p_action = 'dismiss' then 'dismissed' else 'reviewed' end,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    resolution = p_action,
    resolution_note = nullif(trim(p_note), '')
  where target_type = p_target_type and target_id = p_target_id;

  return private.report_target_preview(p_target_type, p_target_id);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Route suggestions
-- ---------------------------------------------------------------------------------------------

-- Suggestions to review (`p_status` 'pending', 'approved' or 'rejected'), oldest pending first,
-- reviewed ones newest first. Photos are paths in the private `suggestion-photos` bucket; the
-- panel signs them (admins may read that bucket).
create or replace function public.admin_route_suggestions(p_status text default 'pending', p_limit integer default 100)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select jsonb_build_object(
    'id', s.id,
    'trackingId', s.tracking_id,
    'name', s.name,
    'tags', to_jsonb(s.tags),
    'difficulty', s.difficulty,
    'description', s.description,
    'waypoints', s.waypoints,
    'distanceKm', s.distance_km,
    'durationMinutes', s.duration_minutes,
    'elevationGainM', s.elevation_gain_m,
    'pointCount', extensions.st_npoints(s.path),
    'photoPaths', to_jsonb(s.photo_paths),
    'status', s.status,
    'reviewNote', s.review_note,
    'routeId', s.route_id,
    'createdAt', s.created_at,
    'reviewedAt', s.reviewed_at,
    'author', private.admin_person(s.user_id),
    'authorEmail', (select u.email from auth.users u where u.id = s.user_id)
  )
  from public.route_suggestions s
  where s.status = coalesce(p_status, 'pending')
  order by
    case when s.status = 'pending' then s.created_at end asc,
    s.reviewed_at desc nulls last,
    s.created_at desc
  limit least(greatest(p_limit, 1), 500);
end;
$$;

-- Publishes a suggestion as a route (`approve_route_suggestion`). `p_overrides` may set name,
-- summary, tag and city of the route.
create or replace function public.admin_approve_route_suggestion(p_id uuid, p_overrides jsonb default '{}'::jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  overrides jsonb := '{}'::jsonb;
begin
  perform private.require_admin();
  select coalesce(jsonb_object_agg(key, trim(value)), '{}'::jsonb) into overrides
  from jsonb_each_text(coalesce(p_overrides, '{}'::jsonb))
  where key in ('name', 'summary', 'tag', 'city') and nullif(trim(value), '') is not null;
  return public.approve_route_suggestion(p_id, overrides);
end;
$$;

create or replace function public.admin_reject_route_suggestion(p_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  if not exists (select 1 from public.route_suggestions where id = p_id and status = 'pending') then
    raise exception 'suggestion not pending' using errcode = 'P0002';
  end if;
  perform public.reject_route_suggestion(p_id, nullif(trim(p_note), ''));
end;
$$;

revoke execute on function
  public.admin_overview,
  public.admin_reports,
  public.admin_resolve_report,
  public.admin_route_suggestions,
  public.admin_approve_route_suggestion,
  public.admin_reject_route_suggestion
from public, anon;
grant execute on function
  public.admin_overview,
  public.admin_reports,
  public.admin_resolve_report,
  public.admin_route_suggestions,
  public.admin_approve_route_suggestion,
  public.admin_reject_route_suggestion
to authenticated;

-- Admins read suggestion photos (signed URLs in the panel).
create policy "admins read suggestion photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'suggestion-photos' and public.is_admin());
