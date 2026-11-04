-- Apply only to R.A.W project lzkbddtsrwpsvsnzkqdi.
-- Restrictive policies intersect with existing ownership policies; they do not
-- grant extra access. No records, users or sessions are deleted.
begin;
do $$ begin
  if not exists (select 1 from auth.users where id='668804f0-9d88-4bef-871f-96288b202fa0' and lower(email)='raulfunnels@gmail.com' and email_confirmed_at is not null) then
    raise exception 'Verified R.A.W owner not found; refusing to apply';
  end if;
end $$;
create policy raw_owner_only on public.journals as restrictive for all to anon, authenticated
using ((select auth.uid())='668804f0-9d88-4bef-871f-96288b202fa0'::uuid and lower((select auth.jwt())->>'email')='raulfunnels@gmail.com' and coalesce((select auth.jwt())->>'is_anonymous','false')='false')
with check ((select auth.uid())='668804f0-9d88-4bef-871f-96288b202fa0'::uuid and lower((select auth.jwt())->>'email')='raulfunnels@gmail.com' and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
create policy raw_owner_only on public.exercise_catalog as restrictive for all to anon, authenticated
using ((select auth.uid())='668804f0-9d88-4bef-871f-96288b202fa0'::uuid and lower((select auth.jwt())->>'email')='raulfunnels@gmail.com' and coalesce((select auth.jwt())->>'is_anonymous','false')='false')
with check ((select auth.uid())='668804f0-9d88-4bef-871f-96288b202fa0'::uuid and lower((select auth.jwt())->>'email')='raulfunnels@gmail.com' and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
revoke all on public.exercise_catalog from anon;
create policy raw_owner_only on storage.objects as restrictive for all to anon, authenticated
using ((select auth.uid())='668804f0-9d88-4bef-871f-96288b202fa0'::uuid and lower((select auth.jwt())->>'email')='raulfunnels@gmail.com' and coalesce((select auth.jwt())->>'is_anonymous','false')='false')
with check ((select auth.uid())='668804f0-9d88-4bef-871f-96288b202fa0'::uuid and lower((select auth.jwt())->>'email')='raulfunnels@gmail.com' and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
commit;
select schemaname,tablename,policyname,permissive from pg_policies where policyname='raw_owner_only';
