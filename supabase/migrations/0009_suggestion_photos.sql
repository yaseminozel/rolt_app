-- Approved route suggestions: their photos live in the private `suggestion-photos` bucket, routes
-- read from the public `route-photos` bucket. Approval now points the route at copies under
-- `route-photos/suggestions/<suggestion id>/…` and asks the `copy-photos` function to make them.

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
  copies text[];
  url text := (select value from private.config where key = 'copy_photos_url');
  secret text := (select value from private.config where key = 'internal_secret');
begin
  select * into s from public.route_suggestions where id = p_id for update;
  if s.id is null or s.status <> 'pending' then
    raise exception 'suggestion not pending';
  end if;
  first_place := s.waypoints -> 0 -> 'place';
  last_place := s.waypoints -> (jsonb_array_length(s.waypoints) - 1) -> 'place';
  select coalesce(array_agg('suggestions/' || s.id || '/' || regexp_replace(path, '^.*/', '') order by position), '{}')
    into copies
  from unnest(s.photo_paths) with ordinality as p(path, position);

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
    copies[1],
    copies,
    s.path,
    extensions.st_dwithin(extensions.st_startpoint(s.path)::extensions.geography, extensions.st_endpoint(s.path)::extensions.geography, 300),
    s.id
  )
  returning id into new_route_id;
  update public.route_suggestions set status = 'approved', route_id = new_route_id, reviewed_at = now() where id = s.id;

  if cardinality(s.photo_paths) > 0 and url is not null and secret is not null then
    perform net.http_post(
      url := url,
      body := jsonb_build_object(
        'from', jsonb_build_object('bucket', 'suggestion-photos', 'paths', to_jsonb(s.photo_paths)),
        'to', jsonb_build_object('bucket', 'route-photos', 'paths', to_jsonb(copies))
      ),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-rolt-secret', secret),
      timeout_milliseconds := 30000
    );
  end if;

  perform private.notify(
    s.user_id, null, 'suggestionApproved',
    jsonb_build_object('target', coalesce(p_overrides ->> 'name', s.name)),
    null, new_route_id
  );
  return new_route_id;
end;
$$;

revoke execute on function public.approve_route_suggestion from public, anon, authenticated;

insert into private.config (key, value) values ('copy_photos_url', 'http://functions:9000/copy-photos')
on conflict (key) do update set value = excluded.value;
