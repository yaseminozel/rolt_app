-- A conversation nobody is in anymore (members deleted their accounts or left) is removed.

create or replace function private.drop_empty_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.conversations c
  where c.id = old.conversation_id
    and not exists (select 1 from public.conversation_members m where m.conversation_id = c.id);
  return null;
end;
$$;

create trigger conversation_members_cleanup after delete on public.conversation_members
  for each row execute function private.drop_empty_conversation();

delete from public.conversations c
where not exists (select 1 from public.conversation_members m where m.conversation_id = c.id);
