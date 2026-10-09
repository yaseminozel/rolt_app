-- `is_blocked_between` is callable through the API (RLS policies need it). Riders may only ask
-- about blocks that involve themselves; internal callers (triggers, service role, cron) may ask
-- about any pair.

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select a is not null and b is not null
    and (
      coalesce(current_setting('role', true), 'none') not in ('anon', 'authenticated')
      or auth.uid() = a
      or auth.uid() = b
    )
    and exists (
      select 1 from public.blocks
      where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
    )
$$;
