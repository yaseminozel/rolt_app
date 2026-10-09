-- Marketing email consent (10.09 "E-posta ile haberler ve kampanyalar").
-- Off by default. Every change is logged with its source and the wording the rider saw, which is
-- the record of consent; unsubscribe links in marketing emails turn it off without a session.

alter table public.user_settings
  add column if not exists email_marketing boolean not null default false,
  add column if not exists email_marketing_updated_at timestamptz;

grant update (email_marketing) on public.user_settings to authenticated;

-- Consent record (not exposed through the API). Kept when the account is deleted: the address
-- and the time it opted in or out are the proof the law asks senders to keep.
create table if not exists private.consent_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  channel text not null default 'email' check (channel in ('email')),
  purpose text not null default 'marketing' check (purpose in ('marketing')),
  granted boolean not null,
  -- 'app' (10.09 switch), 'unsubscribe_link' (link / one-click header in an email), 'admin'.
  source text not null check (source in ('app', 'unsubscribe_link', 'admin')),
  -- Version of the consent wording shown next to the switch (i18n `notificationsPage.emailMarketingHint`).
  text_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists consent_log_email_idx on private.consent_log (lower(email), created_at desc);

create or replace function private.log_email_marketing_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  if new.email_marketing is not distinct from old.email_marketing then
    return new;
  end if;
  new.email_marketing_updated_at := now();
  select u.email into v_email from auth.users u where u.id = new.user_id;
  if v_email is not null then
    insert into private.consent_log (user_id, email, granted, source, text_version)
    values (
      new.user_id,
      lower(v_email),
      new.email_marketing,
      coalesce(nullif(current_setting('rolt.consent_source', true), ''), 'app'),
      'email-marketing-2026-10-09'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists user_settings_email_marketing on public.user_settings;
create trigger user_settings_email_marketing before update of email_marketing on public.user_settings
  for each row execute function private.log_email_marketing_change();

-- The waitlist (web/supabase/waitlist.sql) only asked to be told when the app opens; an
-- unsubscribe still has to stop that one email too.
do $$
begin
  if to_regclass('public.waitlist') is not null then
    alter table public.waitlist add column if not exists unsubscribed_at timestamptz;
  end if;
end;
$$;

-- Unsubscribe link / one-click header (`unsubscribe` function, service role only): turns marketing
-- off for the account with this address and marks it on the waitlist. Idempotent.
create or replace function public.email_marketing_unsubscribe(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('rolt.consent_source', 'unsubscribe_link', true);
  update public.user_settings s set email_marketing = false
  from auth.users u
  where u.id = s.user_id and lower(u.email) = lower(trim(p_email)) and s.email_marketing;
  if to_regclass('public.waitlist') is not null then
    execute 'update public.waitlist set unsubscribed_at = now()
      where lower(email) = lower(trim($1)) and unsubscribed_at is null' using p_email;
  end if;
  -- PostgREST answers void functions without a JSON body; a value keeps the caller simple.
  return true;
end;
$$;

revoke execute on function public.email_marketing_unsubscribe from public, anon, authenticated;
grant execute on function public.email_marketing_unsubscribe to service_role;

-- Who may receive a marketing email right now: confirmed accounts that opted in, with the language
-- for the template. Service role / SQL editor only (export to the sending tool, or a send function).
create or replace function public.email_marketing_audience()
returns table (user_id uuid, email text, name text, locale text, opted_in_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, lower(u.email), coalesce(nullif(p.name, ''), p.handle, ''), s.locale, s.email_marketing_updated_at
  from public.user_settings s
  join auth.users u on u.id = s.user_id
  join public.profiles p on p.id = s.user_id
  where s.email_marketing and u.email is not null and u.email_confirmed_at is not null
  order by s.email_marketing_updated_at
$$;

revoke execute on function public.email_marketing_audience from public, anon, authenticated;
grant execute on function public.email_marketing_audience to service_role;
