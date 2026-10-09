-- 10.05 "Başlangıç/bitiş noktası" for rides already uploaded. `upsert_ride` cuts a ride's
-- shared preview with the owner's settings at upload time; when the rider changes them later
-- (turns hiding on, or hides more), the previews of all their rides are cut again from the full
-- tracks, so ends shared before can't stay visible. The device never has to upload again.

create or replace function private.refresh_ride_previews()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.rides r
  set preview_path = private.ride_preview(new.user_id, t.track)
  from public.ride_tracks t
  where t.ride_id = r.id and r.owner_id = new.user_id;
  return null;
end;
$$;

drop trigger if exists user_settings_ride_previews on public.user_settings;
create trigger user_settings_ride_previews
  after update of hide_endpoints, endpoint_distance_m on public.user_settings
  for each row
  when (old.hide_endpoints is distinct from new.hide_endpoints
    or old.endpoint_distance_m is distinct from new.endpoint_distance_m)
  execute function private.refresh_ride_previews();
