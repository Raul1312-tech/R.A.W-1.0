begin;
create index coach_reviews_owner_fk on public.coach_reviews(owner);
create index coach_weekly_reviews_owner_fk on public.coach_weekly_reviews(owner);
create index coach_weekly_jobs_owner_fk on raw_internal.coach_weekly_jobs(owner);
commit;
