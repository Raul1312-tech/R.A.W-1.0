-- R.A.W private progress album. Apply once to the existing R.A.W project.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('progress-photos','progress-photos',false,2000000,array['image/jpeg']);
create policy raw_photos_read_own on storage.objects for select to authenticated
using (bucket_id='progress-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
create policy raw_photos_insert_own on storage.objects for insert to authenticated
with check (bucket_id='progress-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
create policy raw_photos_delete_own on storage.objects for delete to authenticated
using (bucket_id='progress-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
commit;
