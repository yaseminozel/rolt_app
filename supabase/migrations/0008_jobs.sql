-- Scheduled jobs (pg_cron, times in UTC).

create extension if not exists pg_cron;

-- Saturdays 10:00 Türkiye: new routes near each rider's home location.
select cron.schedule('rolt-weekly-routes-nearby', '0 7 * * 6', $$select private.notify_new_routes_nearby()$$);

-- Nightly: read notifications older than 120 days, unread older than a year.
select cron.schedule(
  'rolt-cleanup-notifications',
  '30 3 * * *',
  $$delete from public.notifications
    where (read_at is not null and created_at < now() - interval '120 days')
       or created_at < now() - interval '365 days'$$
);

-- Nightly: lockout rows nobody hit again.
select cron.schedule(
  'rolt-cleanup-password-attempts',
  '40 3 * * *',
  $$delete from private.password_attempts where updated_at < now() - interval '1 day'$$
);
