-- Waitlist for roltapp.com. Anonymous visitors can only insert; nobody can read through the API.
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source text not null default 'web' check (char_length(source) <= 32),
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_key on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

revoke all on public.waitlist from anon, authenticated;
grant insert (email, source) on public.waitlist to anon;

drop policy if exists "anon can join waitlist" on public.waitlist;
create policy "anon can join waitlist" on public.waitlist for insert to anon with check (true);
