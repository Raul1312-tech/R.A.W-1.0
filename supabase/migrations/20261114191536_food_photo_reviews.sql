create table public.food_photo_reviews (
 owner uuid not null references auth.users(id) on delete cascade,
 request_day date not null,
 slot smallint not null check(slot between 0 and 11),
 input_hash text not null check(length(input_hash)=64),
 choice jsonb check(choice is null or octet_length(choice::text)<16000),
 created_at timestamptz not null default now(),
 primary key(owner,request_day,slot),
 unique(owner,request_day,input_hash)
);
alter table public.food_photo_reviews enable row level security;
revoke all on public.food_photo_reviews from public,anon,authenticated;
grant select,insert on public.food_photo_reviews to authenticated;
grant update(choice) on public.food_photo_reviews to authenticated;
create policy food_photo_read_own on public.food_photo_reviews for select to authenticated using ((select auth.uid())=owner and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
create policy food_photo_insert_own on public.food_photo_reviews for insert to authenticated with check ((select auth.uid())=owner and request_day=(now() at time zone 'utc')::date and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
create policy food_photo_update_own on public.food_photo_reviews for update to authenticated using ((select auth.uid())=owner and coalesce((select auth.jwt())->>'is_anonymous','false')='false') with check ((select auth.uid())=owner and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
