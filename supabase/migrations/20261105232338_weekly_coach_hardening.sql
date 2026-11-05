-- Restrict networking helpers without replacing the installed extension.
revoke all on schema net from public,anon,authenticated;
revoke execute on all functions in schema net from public,anon,authenticated;
create policy weekly_jobs_deny_clients on raw_internal.coach_weekly_jobs for all to anon,authenticated using(false) with check(false);
