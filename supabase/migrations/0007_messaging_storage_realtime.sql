-- Direct messages (backend ready, no screens yet), storage buckets, Realtime publication,
-- welcome email trigger and scheduled jobs.

-- ---------------------------------------------------------------------------------------------
-- Messaging: conversations between riders. One-to-one now; `is_group` keeps groups possible.
-- ---------------------------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  title text,
  created_by uuid references public.profiles (id) on delete set null,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  muted boolean not null default false,
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text check (char_length(body) <= 4000),
  -- [{ type: 'photo' | 'ride' | 'route', path?, id? }]
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  check (nullif(trim(body), '') is not null or jsonb_array_length(attachments) > 0)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

create or replace function public.is_conversation_member(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation and user_id = auth.uid()
  )
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy "members see conversations" on public.conversations
  for select to authenticated using (public.is_conversation_member(id));
create policy "members see members" on public.conversation_members
  for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "update own membership" on public.conversation_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leave a conversation" on public.conversation_members
  for delete to authenticated using (user_id = auth.uid());
create policy "members read messages" on public.messages
  for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "members send messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid() and public.is_verified() and public.is_conversation_member(conversation_id)
    and not exists (
      select 1 from public.conversation_members m
      where m.conversation_id = messages.conversation_id and m.user_id <> auth.uid()
        and public.is_blocked_between(auth.uid(), m.user_id)
    )
  );
create policy "edit own messages" on public.messages
  for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());
revoke insert, update, delete on public.conversations from anon, authenticated;
revoke insert, update on public.conversation_members from anon, authenticated;
grant update (last_read_at, muted) on public.conversation_members to authenticated;
revoke update on public.messages from anon, authenticated;
grant update (body, edited_at, deleted_at) on public.messages to authenticated;

-- Finds or starts the one-to-one conversation with another rider.
create or replace function public.start_direct_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  found uuid;
begin
  if uid is null or not public.is_verified() or p_other = uid then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if public.is_blocked_between(uid, p_other) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  select c.id into found
  from public.conversations c
  join public.conversation_members a on a.conversation_id = c.id and a.user_id = uid
  join public.conversation_members b on b.conversation_id = c.id and b.user_id = p_other
  where not c.is_group
  limit 1;
  if found is null then
    insert into public.conversations (created_by) values (uid) returning id into found;
    insert into public.conversation_members (conversation_id, user_id) values (found, uid), (found, p_other);
  end if;
  return found;
end;
$$;

revoke execute on function public.start_direct_conversation from public, anon;
grant execute on function public.start_direct_conversation to authenticated;

-- Inbox: the viewer's conversations, newest activity first, with the other member and unread count.
create or replace function public.list_conversations()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'isGroup', c.is_group,
    'title', c.title,
    'lastMessageAt', c.last_message_at,
    'lastMessagePreview', c.last_message_preview,
    'muted', me.muted,
    'unreadCount', (
      select count(*) from public.messages m
      where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.deleted_at is null
        and (me.last_read_at is null or m.created_at > me.last_read_at)
    ),
    'members', (
      select coalesce(jsonb_agg(public.author_json(p)), '[]'::jsonb)
      from public.conversation_members o
      join public.profiles p on p.id = o.user_id
      where o.conversation_id = c.id and o.user_id <> auth.uid()
    )
  )
  from public.conversations c
  join public.conversation_members me on me.conversation_id = c.id and me.user_id = auth.uid()
  order by coalesce(c.last_message_at, c.created_at) desc
$$;

revoke execute on function public.list_conversations from public, anon;
grant execute on function public.list_conversations to authenticated;

create or replace function private.on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member record;
begin
  update public.conversations
  set last_message_at = new.created_at, last_message_preview = left(coalesce(new.body, ''), 120)
  where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
  where conversation_id = new.conversation_id and user_id = new.sender_id;
  for member in
    select user_id from public.conversation_members
    where conversation_id = new.conversation_id and user_id <> new.sender_id and not muted
  loop
    perform private.notify(
      member.user_id, new.sender_id, 'message',
      jsonb_build_object('text', left(coalesce(new.body, ''), 120)),
      'message:' || new.conversation_id, null, null, null, new.conversation_id
    );
  end loop;
  return null;
end;
$$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function private.on_message();

-- ---------------------------------------------------------------------------------------------
-- Storage. Public buckets serve photos by URL (paths start with the owner's id and a random
-- name); private buckets are read through signed URLs or by the service role only.
-- ---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('ride-photos', 'ride-photos', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('post-photos', 'post-photos', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('route-photos', 'route-photos', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('suggestion-photos', 'suggestion-photos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('feedback', 'feedback', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('public-assets', 'public-assets', true, 5242880, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Riders write only inside their own folder: `<user id>/<file>`.
create policy "upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('avatars', 'ride-photos', 'post-photos', 'suggestion-photos', 'feedback')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "update own files" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('avatars', 'ride-photos', 'post-photos', 'suggestion-photos', 'feedback')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "delete own files" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('avatars', 'ride-photos', 'post-photos', 'suggestion-photos', 'feedback')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "read own private files" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('suggestion-photos', 'feedback')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- Guests send feedback without screenshots; nothing else is writable without an account.

-- ---------------------------------------------------------------------------------------------
-- Realtime: unread badge and notification list, open comment sheets, direct messages.
-- ---------------------------------------------------------------------------------------------

alter publication supabase_realtime add table
  public.notifications,
  public.post_comments,
  public.ride_comments,
  public.messages,
  public.conversation_members;

-- ---------------------------------------------------------------------------------------------
-- Welcome email: once, when the profile is finished (04.07 → app).
-- ---------------------------------------------------------------------------------------------

create or replace function private.on_profile_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  url text := (select value from private.config where key = 'email_url');
  secret text := (select value from private.config where key = 'internal_secret');
  claimed uuid;
begin
  if not new.profile_completed or old.profile_completed then
    return null;
  end if;
  update public.user_settings set welcome_email_sent_at = now()
  where user_id = new.id and welcome_email_sent_at is null
  returning user_id into claimed;
  if claimed is null or url is null or secret is null then
    return null;
  end if;
  perform net.http_post(
    url := url,
    body := jsonb_build_object('type', 'welcome', 'userId', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-rolt-secret', secret),
    timeout_milliseconds := 10000
  );
  return null;
end;
$$;

create trigger profiles_completed after update of profile_completed on public.profiles
  for each row execute function private.on_profile_completed();
