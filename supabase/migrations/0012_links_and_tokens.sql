-- Share links and push token clean-up.

-- https://roltapp.com/u/<handle> opens rolt://u/<handle>: the app resolves the rider id.
create or replace function public.rider_id_by_handle(p_handle text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p
  where p.handle = lower(trim(p_handle)) and not public.is_blocked_between(auth.uid(), p.id)
$$;

grant execute on function public.rider_id_by_handle to anon, authenticated;

-- A phone that signed out offline couldn't remove its push token; it forgets it later, without a
-- session. Only the device knows its token, so knowing it is enough to stop pushes to it.
create or replace function public.forget_push_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = p_token
$$;

grant execute on function public.forget_push_token to anon, authenticated;
