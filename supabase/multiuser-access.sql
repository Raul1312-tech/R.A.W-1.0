-- Apply only to R.A.W. lzkbddtsrwpsvsnzkqdi after verification.
-- Replaces owner-only restriction, retaining per-user ownership policies.
begin;
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='journals' and policyname='journals_read_own')
 or not exists(select 1 from pg_policies where schemaname='public' and tablename='journals' and policyname='journals_update_own')
 or not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='raw_photos_read_own')
 then raise exception 'Ownership policies missing'; end if;
 if exists(select 1 from storage.buckets where id='progress-photos' and public) then raise exception 'Photo bucket must remain private'; end if;
end $$;
drop policy if exists raw_owner_only on public.journals;
drop policy if exists raw_owner_only on public.exercise_catalog;
drop policy if exists raw_owner_only on storage.objects;
-- Defense in depth: even a future permissive policy cannot grant cross-user access.
create policy raw_account_boundary on public.journals as restrictive for all to anon,authenticated
using ((select auth.uid())=owner and coalesce((select auth.jwt())->>'is_anonymous','false')='false')
with check ((select auth.uid())=owner and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
create policy raw_photo_boundary on storage.objects as restrictive for all to anon,authenticated
using (bucket_id='progress-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and coalesce((select auth.jwt())->>'is_anonymous','false')='false')
with check (bucket_id='progress-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
-- The shared exercise catalog remains read-only through its existing published policy.
commit;
