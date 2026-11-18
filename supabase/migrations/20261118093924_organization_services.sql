begin;
alter table public.coach_reviews add column organization_id uuid not null default raw_platform.rise_id() references public.organizations(id);
alter table public.coach_reviews drop constraint coach_reviews_pkey;
alter table public.coach_reviews add primary key(organization_id,owner,request_day,slot);
alter table public.coach_weekly_reviews add column organization_id uuid not null default raw_platform.rise_id() references public.organizations(id);
alter table public.coach_weekly_reviews drop constraint coach_weekly_reviews_owner_profile_week_key;
alter table public.coach_weekly_reviews add unique(organization_id,owner,profile,week);
alter table raw_internal.coach_weekly_jobs add column organization_id uuid not null default raw_platform.rise_id() references public.organizations(id);
alter table raw_internal.coach_weekly_jobs drop constraint coach_weekly_jobs_owner_profile_week_key;
alter table raw_internal.coach_weekly_jobs add unique(organization_id,owner,profile,week);
create index coach_weekly_jobs_organization on raw_internal.coach_weekly_jobs(organization_id,state,week);
alter table public.food_photo_reviews add column organization_id uuid not null default raw_platform.rise_id() references public.organizations(id);
create index food_photo_reviews_organization on public.food_photo_reviews(organization_id,owner);
create policy organization_ai_boundary on public.coach_reviews as restrictive for all to authenticated using(raw_platform.module_enabled(organization_id,'ai')) with check(raw_platform.module_enabled(organization_id,'ai'));
create policy organization_ai_boundary on public.coach_weekly_reviews as restrictive for all to authenticated using(raw_platform.module_enabled(organization_id,'ai')) with check(raw_platform.module_enabled(organization_id,'ai'));
create policy organization_ai_boundary on public.food_photo_reviews as restrictive for all to authenticated using(raw_platform.module_enabled(organization_id,'ai')) with check(raw_platform.module_enabled(organization_id,'ai'));
create function raw_platform.photo_scope(name text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare parts text[]:=string_to_array(name,'/');org uuid;begin
 if auth.uid() is null or parts[1]<>auth.uid()::text then return false;end if;
 if parts[2]='organizations' then
  if parts[3] !~ '^[a-f0-9-]{36}$' then return false;end if;
  begin org:=parts[3]::uuid;exception when invalid_text_representation then return false;end;
 else org:=raw_platform.rise_id();end if;
 return coalesce(raw_platform.module_enabled(org,'photos'),false);
end$$;
revoke all on function raw_platform.photo_scope(text) from public,anon;
grant execute on function raw_platform.photo_scope(text) to authenticated;
create policy organization_photo_boundary on storage.objects as restrictive for all to authenticated using(bucket_id<>'progress-photos' or raw_platform.photo_scope(name)) with check(bucket_id<>'progress-photos' or raw_platform.photo_scope(name));
create function raw_platform.worker_payload(org uuid,subject uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select case when org=raw_platform.rise_id() then (select payload from public.journals where owner=subject)
 else (select payload from public.organization_journals where organization_id=org and owner=subject) end
 where exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id where m.organization_id=org and m.user_id=subject and m.status='active' and o.status='active' and o.modules->>'ai'='true')
$$;
revoke all on function raw_platform.worker_payload(uuid,uuid) from public,anon,authenticated;
create or replace function raw_internal.claim_weekly(job uuid,secret uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare q raw_internal.coach_weekly_jobs;p jsonb;begin
 if auth.uid() is not null then return null;end if;
 select * into q from raw_internal.coach_weekly_jobs where id=job and token=secret for update;
 if not found or q.state in ('done','cancelled') or q.attempts>=3 or q.week<((now() at time zone 'Europe/Madrid')::date-6) or (q.state='working' and q.touched_at>now()-interval '10 minutes') then return null;end if;
 select x into p from jsonb_array_elements(raw_platform.worker_payload(q.organization_id,q.owner)->'profiles')x where x->>'id'=q.profile and x->>'confirmed'='true' and x#>>'{preparation,coach,enabled}'='true' and x#>>'{preparation,coach,weekly}'='true';
 if p is null then update raw_internal.coach_weekly_jobs set state='cancelled' where id=job;return null;end if;
 update raw_internal.coach_weekly_jobs set state='working',attempts=attempts+1,touched_at=now() where id=job;
 return jsonb_build_object('profile',p,'date',(now() at time zone 'Europe/Madrid')::date,'organization_id',q.organization_id);end$$;
create or replace function raw_internal.finish_weekly(job uuid,secret uuid,result jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare q raw_internal.coach_weekly_jobs;begin
 if auth.uid() is not null then return false;end if;
 select * into q from raw_internal.coach_weekly_jobs where id=job and token=secret for update;
 if not found or q.state<>'working' or q.touched_at<now()-interval '10 minutes' then return false;end if;
 if not exists(select 1 from jsonb_array_elements(raw_platform.worker_payload(q.organization_id,q.owner)->'profiles')p where p->>'id'=q.profile and p#>>'{preparation,coach,enabled}'='true' and p#>>'{preparation,coach,weekly}'='true') then update raw_internal.coach_weekly_jobs set state='cancelled' where id=job;return false;end if;
 if result is null then update raw_internal.coach_weekly_jobs set state='failed',touched_at=now() where id=job;return true;end if;
 insert into public.coach_weekly_reviews(id,organization_id,owner,profile,week,review) values(q.id,q.organization_id,q.owner,q.profile,q.week,result) on conflict(organization_id,owner,profile,week) do nothing;
 update raw_internal.coach_weekly_jobs set state='done',touched_at=now() where id=job;return true;end$$;
create or replace function raw_internal.dispatch_weekly() returns void language plpgsql security definer set search_path='' as $$
declare local_now timestamp:=now() at time zone 'Europe/Madrid';q raw_internal.coach_weekly_jobs;begin
 if extract(isodow from local_now)=1 and extract(hour from local_now)=8 then
 insert into raw_internal.coach_weekly_jobs(organization_id,owner,profile,week)
 select j.organization_id,j.owner,p->>'id',local_now::date from (select raw_platform.rise_id() as organization_id,owner,payload from public.journals union all select organization_id,owner,payload from public.organization_journals)j
 join public.organizations o on o.id=j.organization_id and o.status='active' and o.modules->>'ai'='true'
 join public.organization_members m on m.organization_id=j.organization_id and m.user_id=j.owner and m.status='active'
 cross join lateral jsonb_array_elements(j.payload->'profiles')p
 where p->>'confirmed'='true' and p#>>'{preparation,coach,enabled}'='true' and p#>>'{preparation,coach,weekly}'='true'
 on conflict(organization_id,owner,profile,week) do nothing;end if;
 for q in select * from raw_internal.coach_weekly_jobs where state not in ('done','cancelled') and attempts<3 and dispatched<3 and week>=local_now::date-6 and (dispatched=0 or touched_at<now()-interval '50 minutes') order by week,id limit 20 for update skip locked loop
 update raw_internal.coach_weekly_jobs set state='pending',dispatched=dispatched+1,touched_at=now(),
 request_id=net.http_post(url:='https://raw-1-0.vercel.app/api/coach/weekly/worker',body:=jsonb_build_object('job',q.id,'secret',q.token),timeout_milliseconds:=60000) where id=q.id;end loop;end$$;
commit;
