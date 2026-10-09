-- App telemetry without a third-party account: product / GPS events (`app_events`) and JS errors
-- (`app_errors`). Clients (guests too) may only insert; nobody reads them through the API —
-- query them in Studio or psql (docs/supabase.md "Telemetry"). Kept 90 days.

create table public.app_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- Client clock when it happened (a backlog can arrive minutes or a launch later).
  occurred_at timestamptz not null default now(),
  user_id uuid default auth.uid() references public.profiles (id) on delete set null,
  -- Random per installation, stored on the device (not a device identifier).
  install_id text not null check (char_length(install_id) between 8 and 64),
  -- Random per app launch.
  session_id text not null check (char_length(session_id) between 8 and 64),
  name text not null check (name ~ '^[a-z][a-z0-9_]{0,63}$'),
  -- Flat object of primitives, small.
  props jsonb not null default '{}'::jsonb
    check (jsonb_typeof(props) = 'object' and octet_length(props::text) <= 4096),
  platform text not null check (char_length(platform) <= 16),
  os_version text check (char_length(os_version) <= 32),
  app_version text check (char_length(app_version) <= 32),
  build_version text check (char_length(build_version) <= 32),
  runtime_version text check (char_length(runtime_version) <= 128),
  update_id text check (char_length(update_id) <= 64),
  device_model text check (char_length(device_model) <= 64),
  is_dev boolean not null default false
);

create index app_events_name_created_at on public.app_events (name, created_at);
create index app_events_created_at on public.app_events (created_at);
create index app_events_user_id on public.app_events (user_id) where user_id is not null;

create table public.app_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  occurred_at timestamptz not null default now(),
  user_id uuid default auth.uid() references public.profiles (id) on delete set null,
  install_id text not null check (char_length(install_id) between 8 and 64),
  session_id text not null check (char_length(session_id) between 8 and 64),
  -- `global` (ErrorUtils), `promise` (unhandled rejection), `boundary` (React render error).
  kind text not null check (kind in ('global', 'promise', 'boundary')),
  is_fatal boolean not null default false,
  name text check (char_length(name) <= 128),
  message text not null check (char_length(message) <= 1024),
  stack text check (char_length(stack) <= 8192),
  component_stack text check (char_length(component_stack) <= 8192),
  -- Route pattern (e.g. `rides/[rideId]`), no ids.
  screen text check (char_length(screen) <= 256),
  -- Same error again in this session before it was sent.
  occurrences integer not null default 1 check (occurrences between 1 and 10000),
  platform text not null check (char_length(platform) <= 16),
  os_version text check (char_length(os_version) <= 32),
  app_version text check (char_length(app_version) <= 32),
  build_version text check (char_length(build_version) <= 32),
  runtime_version text check (char_length(runtime_version) <= 128),
  update_id text check (char_length(update_id) <= 64),
  device_model text check (char_length(device_model) <= 64),
  is_dev boolean not null default false
);

create index app_errors_created_at on public.app_errors (created_at);
create index app_errors_message on public.app_errors (message, created_at);
create index app_errors_user_id on public.app_errors (user_id) where user_id is not null;

alter table public.app_events enable row level security;
alter table public.app_errors enable row level security;

create policy "send app events" on public.app_events
  for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());
create policy "send app errors" on public.app_errors
  for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());

revoke all on public.app_events, public.app_errors from anon, authenticated;
grant insert on public.app_events, public.app_errors to anon, authenticated;

-- Flood guard: rows beyond a generous per-IP budget are dropped silently (the batch still succeeds,
-- so a well-behaved client never retries them). Requests that don't come through PostgREST pass.
create or replace function private.telemetry_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ip text := private.client_ip();
begin
  if ip is null then
    return new;
  end if;
  if tg_table_name = 'app_errors' then
    if not private.rate_limit_hit('app_errors:' || ip, 300, interval '10 minutes') then
      return null;
    end if;
  elsif not private.rate_limit_hit('app_events:' || ip, 3000, interval '10 minutes') then
    return null;
  end if;
  return new;
end;
$$;

create trigger app_events_rate_limit before insert on public.app_events
  for each row execute function private.telemetry_rate_limit();
create trigger app_errors_rate_limit before insert on public.app_errors
  for each row execute function private.telemetry_rate_limit();

-- Nightly: telemetry older than 90 days.
select cron.schedule(
  'rolt-cleanup-app-telemetry',
  '50 3 * * *',
  $$delete from public.app_events where created_at < now() - interval '90 days';
    delete from public.app_errors where created_at < now() - interval '90 days'$$
);
