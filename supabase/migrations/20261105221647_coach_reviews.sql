create table public.coach_reviews (
 owner uuid not null references auth.users(id) on delete cascade,
 request_day date not null,
 slot smallint not null check(slot between 0 and 2),
 profile text not null check(length(profile) between 1 and 100),
 input_hash text not null check(length(input_hash)=64),
 choice jsonb check(choice is null or octet_length(choice::text)<2000),
 created_at timestamptz not null default now(),
 primary key(owner,request_day,slot)
);
alter table public.coach_reviews enable row level security;
revoke all on public.coach_reviews from anon,authenticated;
grant select,insert on public.coach_reviews to authenticated;
grant update(choice) on public.coach_reviews to authenticated;
create policy coach_read_own on public.coach_reviews for select to authenticated using ((select auth.uid())=owner and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
create policy coach_insert_own on public.coach_reviews for insert to authenticated with check ((select auth.uid())=owner and request_day=(now() at time zone 'utc')::date and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
create policy coach_update_own on public.coach_reviews for update to authenticated using ((select auth.uid())=owner and coalesce((select auth.jwt())->>'is_anonymous','false')='false') with check ((select auth.uid())=owner and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
