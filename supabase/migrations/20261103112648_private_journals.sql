begin;
create table public.journals (
  owner uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 2200000),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.journals enable row level security;
alter table public.journals force row level security;
revoke all on public.journals from anon, authenticated;
grant select, insert, update on public.journals to authenticated;
create policy journals_read_own on public.journals for select to authenticated
  using ((select auth.uid()) = owner and coalesce((select auth.jwt())->>'is_anonymous','false') = 'false');
create policy journals_insert_own on public.journals for insert to authenticated
  with check ((select auth.uid()) = owner and coalesce((select auth.jwt())->>'is_anonymous','false') = 'false');
create policy journals_update_own on public.journals for update to authenticated
  using ((select auth.uid()) = owner and coalesce((select auth.jwt())->>'is_anonymous','false') = 'false')
  with check ((select auth.uid()) = owner and coalesce((select auth.jwt())->>'is_anonymous','false') = 'false');

-- One atomic compare-and-swap: stale devices never overwrite newer records.
-- Runs as the caller, so ownership is enforced by the same RLS as direct reads.
create function public.save_journal(new_payload jsonb, expected_revision integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare next_revision integer;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false') <> 'false' then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if expected_revision < 0 or expected_revision is null then
    raise exception 'Invalid revision' using errcode = '22023';
  end if;
  if expected_revision = 0 then
    insert into public.journals(owner,payload,revision)
    values(auth.uid(),new_payload,1) on conflict(owner) do nothing
    returning revision into next_revision;
  else
    update public.journals set payload=new_payload,revision=revision+1,updated_at=now()
    where owner=auth.uid() and revision=expected_revision
    returning revision into next_revision;
  end if;
  return next_revision;
end;
$$;
revoke all on function public.save_journal(jsonb,integer) from public, anon;
grant execute on function public.save_journal(jsonb,integer) to authenticated;
commit;
