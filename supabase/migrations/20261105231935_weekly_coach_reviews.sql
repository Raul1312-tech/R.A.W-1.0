create extension if not exists pg_cron;
create extension if not exists pg_net;
create schema if not exists raw_internal;
revoke all on schema raw_internal from public,anon,authenticated;

create table public.coach_weekly_reviews (
 id uuid primary key, owner uuid not null references auth.users on delete cascade,
 profile text not null, week date not null, reviewed_at timestamptz not null default now(),
 review jsonb not null check(octet_length(review::text)<=60000),
 dismissed boolean not null default false, unique(owner,profile,week)
);
alter table public.coach_weekly_reviews enable row level security;
revoke all on public.coach_weekly_reviews from anon,authenticated;
grant select on public.coach_weekly_reviews to authenticated;
grant update(dismissed) on public.coach_weekly_reviews to authenticated;
create policy weekly_read_own on public.coach_weekly_reviews for select to authenticated
 using(owner=(select auth.uid()) and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
create policy weekly_dismiss_own on public.coach_weekly_reviews for update to authenticated
 using(owner=(select auth.uid())) with check(owner=(select auth.uid()));

create table raw_internal.coach_weekly_jobs (
 id uuid primary key default gen_random_uuid(), token uuid not null default gen_random_uuid(),
 owner uuid not null references auth.users on delete cascade, profile text not null, week date not null,
 state text not null default 'pending' check(state in ('pending','working','done','failed','cancelled')),
 attempts integer not null default 0, dispatched integer not null default 0,
 touched_at timestamptz not null default now(), request_id bigint,
 unique(owner,profile,week)
);
alter table raw_internal.coach_weekly_jobs enable row level security;
revoke all on raw_internal.coach_weekly_jobs from public,anon,authenticated;

-- Token capability is per job, expires with its lease, and cannot enumerate journals.
-- Workers use the public API key, never a service-role credential.
create function raw_internal.claim_weekly(job uuid, secret uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q raw_internal.coach_weekly_jobs; p jsonb;
begin
 if auth.uid() is not null then return null; end if;
 select * into q from raw_internal.coach_weekly_jobs where id=job and token=secret for update;
 if not found or q.state in ('done','cancelled') or q.attempts>=3 or q.week<((now() at time zone 'Europe/Madrid')::date-6)
 or (q.state='working' and q.touched_at>now()-interval '10 minutes') then return null; end if;
 select x into p from public.journals j cross join lateral jsonb_array_elements(j.payload->'profiles') x
 where j.owner=q.owner and x->>'id'=q.profile and x->>'confirmed'='true'
 and x#>>'{preparation,coach,enabled}'='true' and x#>>'{preparation,coach,weekly}'='true';
 if p is null then update raw_internal.coach_weekly_jobs set state='cancelled' where id=job;return null;end if;
 update raw_internal.coach_weekly_jobs set state='working',attempts=attempts+1,touched_at=now() where id=job;
 return jsonb_build_object('profile',p,'date',(now() at time zone 'Europe/Madrid')::date);
end $$;

create function raw_internal.finish_weekly(job uuid, secret uuid, result jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare q raw_internal.coach_weekly_jobs;
begin
 if auth.uid() is not null then return false;end if;
 select * into q from raw_internal.coach_weekly_jobs where id=job and token=secret for update;
 if not found or q.state<>'working' or q.touched_at<now()-interval '10 minutes' then return false;end if;
 if not exists(select 1 from public.journals j cross join lateral jsonb_array_elements(j.payload->'profiles') p
 where j.owner=q.owner and p->>'id'=q.profile and p#>>'{preparation,coach,enabled}'='true' and p#>>'{preparation,coach,weekly}'='true')
 then update raw_internal.coach_weekly_jobs set state='cancelled' where id=job;return false;end if;
 if result is null then update raw_internal.coach_weekly_jobs set state='failed',touched_at=now() where id=job;return true;end if;
 insert into public.coach_weekly_reviews(id,owner,profile,week,review) values(q.id,q.owner,q.profile,q.week,result)
 on conflict(owner,profile,week) do nothing;
 update raw_internal.coach_weekly_jobs set state='done',touched_at=now() where id=job;
 return true;
end $$;
revoke all on function raw_internal.claim_weekly(uuid,uuid),raw_internal.finish_weekly(uuid,uuid,jsonb) from public;
grant usage on schema raw_internal to anon;
grant execute on function raw_internal.claim_weekly(uuid,uuid),raw_internal.finish_weekly(uuid,uuid,jsonb) to anon;
create function public.claim_coach_weekly(job uuid, secret uuid) returns jsonb language sql security invoker set search_path='' as $$select raw_internal.claim_weekly(job,secret)$$;
create function public.finish_coach_weekly(job uuid, secret uuid,result jsonb) returns boolean language sql security invoker set search_path='' as $$select raw_internal.finish_weekly(job,secret,result)$$;
revoke all on function public.claim_coach_weekly(uuid,uuid),public.finish_coach_weekly(uuid,uuid,jsonb) from public,authenticated;
grant execute on function public.claim_coach_weekly(uuid,uuid),public.finish_coach_weekly(uuid,uuid,jsonb) to anon;

create function raw_internal.dispatch_weekly() returns void language plpgsql security definer set search_path='' as $$
declare local_now timestamp:=now() at time zone 'Europe/Madrid'; q raw_internal.coach_weekly_jobs;
begin
 -- Monday 08:00 Madrid, including summer time. Retries/overflow drain hourly.
 if extract(isodow from local_now)=1 and extract(hour from local_now)=8 then
 insert into raw_internal.coach_weekly_jobs(owner,profile,week)
 select j.owner,p->>'id',local_now::date from public.journals j
 cross join lateral jsonb_array_elements(j.payload->'profiles') p
 where p->>'confirmed'='true' and p#>>'{preparation,coach,enabled}'='true' and p#>>'{preparation,coach,weekly}'='true'
 on conflict(owner,profile,week) do nothing;
 end if;
 for q in select * from raw_internal.coach_weekly_jobs where state<>'done' and state<>'cancelled'
 and attempts<3 and dispatched<3 and week>=local_now::date-6
 and (dispatched=0 or touched_at<now()-interval '50 minutes') order by week,id limit 20 for update skip locked loop
 update raw_internal.coach_weekly_jobs set state='pending',dispatched=dispatched+1,touched_at=now(),
 request_id=net.http_post(url:='https://raw-1-0.vercel.app/api/coach/weekly/worker',
 body:=jsonb_build_object('job',q.id,'secret',q.token),timeout_milliseconds:=60000)
 where id=q.id;
 end loop;
end $$;
revoke all on function raw_internal.dispatch_weekly() from public,anon,authenticated;
select cron.schedule('raw-weekly-coach-dispatch','0 * * * *','select raw_internal.dispatch_weekly()');
