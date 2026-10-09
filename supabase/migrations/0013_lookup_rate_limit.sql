-- Rate limit for the public email lookup (02.01): it answers whether an address has an account,
-- so one client may ask at most 30 times per 10 minutes (per IP from the proxy headers).

create table private.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);

-- True while `key` stays within `max_hits` per `window_length`; counts this hit.
create or replace function private.rate_limit_hit(p_key text, p_max_hits integer, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_hits integer;
begin
  insert into private.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - p_window then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - p_window then now() else r.window_start end
  returning hits into current_hits;
  return current_hits <= p_max_hits;
end;
$$;

-- The client IP as the proxies report it; null when the request didn't come through PostgREST.
create or replace function private.client_ip()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(trim(split_part(coalesce(
    nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for',
    nullif(current_setting('request.headers', true), '')::json ->> 'x-real-ip',
    ''
  ), ',', 1)), '')
$$;

drop function if exists public.lookup_email(text);

create function public.lookup_email(p_email text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  ip text := private.client_ip();
  result jsonb;
begin
  if ip is not null and not private.rate_limit_hit('lookup_email:' || ip, 30, interval '10 minutes') then
    raise exception 'rate_limited' using errcode = 'P0429', hint = 'Too many email lookups; try again in a few minutes.';
  end if;
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
    into result
  from auth.users u
  where lower(u.email) = lower(trim(p_email)) and u.deleted_at is null
  limit 1;
  return coalesce(result, jsonb_build_object('status', 'new'));
end;
$$;

grant execute on function public.lookup_email to anon, authenticated;

select cron.schedule(
  'rolt-cleanup-rate-limits',
  '50 3 * * *',
  $$delete from private.rate_limits where window_start < now() - interval '1 day'$$
);
