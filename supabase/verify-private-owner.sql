-- Transactional authorization probe. All fixture changes are rolled back.
begin;
insert into public.journals(owner,payload) values ('668804f0-9d88-4bef-871f-96288b202fa0','{}') on conflict do nothing;
set local role authenticated;
set local request.jwt.claims='{"sub":"668804f0-9d88-4bef-871f-96288b202fa0","email":"raulfunnels@gmail.com","role":"authenticated","is_anonymous":false}';
do $$ begin
  if (select count(*) from public.journals)<>1 then raise exception 'Owner cannot read own journal'; end if;
  if (select count(*) from public.exercise_catalog)=0 then raise exception 'Owner cannot read catalog'; end if;
end $$;
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","email":"raulfunnels@gmail.com","role":"authenticated","is_anonymous":false}';
do $$ begin
  if exists(select 1 from public.journals) or exists(select 1 from public.exercise_catalog) or exists(select 1 from storage.objects) then raise exception 'Non-owner can read data'; end if;
  begin
    perform public.save_journal('{}',0);
    raise exception 'Non-owner write unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
set local request.jwt.claims='{"sub":"668804f0-9d88-4bef-871f-96288b202fa0","email":"other@example.test","role":"authenticated","is_anonymous":false}';
do $$ begin
  if exists(select 1 from public.journals) or exists(select 1 from public.exercise_catalog) then raise exception 'Wrong email can read'; end if;
end $$;
set local request.jwt.claims='{"sub":"668804f0-9d88-4bef-871f-96288b202fa0","email":"raulfunnels@gmail.com","role":"authenticated","is_anonymous":true}';
do $$ begin
  if exists(select 1 from public.journals) or exists(select 1 from public.exercise_catalog) then raise exception 'Anonymous identity can read'; end if;
end $$;
set local role anon;
set local request.jwt.claims='{"role":"anon"}';
do $$ begin
  begin perform 1 from public.journals; raise exception 'Public journal access granted'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.exercise_catalog; raise exception 'Public catalog access granted'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: owner reads; other identity, changed email, anonymous identity and public access denied; non-owner writes denied; fixtures rolled back' as authorization_checks;
