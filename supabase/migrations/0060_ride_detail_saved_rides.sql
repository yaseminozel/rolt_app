-- Another rider's ride (09.06 read-only, shared ride links) and the viewer's bookmarked rides
-- ("Kaydettiklerim"). Both return `ride_summary_json` plus the rider (`author_json`), and only
-- rides the viewer may see (`can_view_ride`: owner, public, accepted followers; never across a
-- block).

-- One ride with what the detail screen needs beyond the profile card: the rider, difficulty and
-- surface. Null when the ride doesn't exist or isn't visible. Open to guests (public rides).
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
$$;

grant execute on function public.get_ride to anon, authenticated;

-- The viewer's bookmarked rides, most recently saved first. A saved ride that became hidden
-- (visibility changed, unfollowed, blocked) drops out until it is visible again.
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
  order by s.created_at desc
  limit least(greatest(p_limit, 1), 100)
$$;

revoke execute on function public.saved_rides from public, anon;
grant execute on function public.saved_rides to authenticated;
