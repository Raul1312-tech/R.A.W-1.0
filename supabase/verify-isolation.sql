-- Synthetic identities only. Every test record is rolled back.
begin;
insert into auth.users(id,aud,role) values
('b01aa72e-44ac-4994-83e5-50fe0e391101','authenticated','authenticated'),
('b01aa72e-44ac-4994-83e5-50fe0e391102','authenticated','authenticated');
insert into public.journals(owner,payload) values
('b01aa72e-44ac-4994-83e5-50fe0e391102','{"test":"other owner"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b01aa72e-44ac-4994-83e5-50fe0e391101","role":"authenticated","is_anonymous":false}',true);
do $$ declare n integer; begin
  if exists(select 1 from public.journals) then raise exception 'Other owner visible'; end if;
  if public.save_journal('{"test":"own"}',0) <> 1 then raise exception 'Initial save failed'; end if;
  if public.save_journal('{"test":"stale initial"}',0) is not null then raise exception 'Stale insert accepted'; end if;
  if public.save_journal('{"test":"updated"}',1) <> 2 then raise exception 'Update failed'; end if;
  if public.save_journal('{"test":"stale update"}',1) is not null then raise exception 'Stale update accepted'; end if;
  if (select count(*) from public.journals) <> 1 then raise exception 'Own read failed'; end if;
  update public.journals set payload='{}' where owner='b01aa72e-44ac-4994-83e5-50fe0e391102';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Other owner write accepted'; end if;
  begin
    update public.journals set owner='b01aa72e-44ac-4994-83e5-50fe0e391103';
    raise exception 'Owner reassignment accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"b01aa72e-44ac-4994-83e5-50fe0e391102","role":"authenticated","is_anonymous":false}',true);
do $$ begin
  if (select count(*) from public.journals) <> 1 then raise exception 'Second owner isolation failed'; end if;
  if (select payload->>'test' from public.journals) <> 'other owner' then raise exception 'Other owner overwritten'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"b01aa72e-44ac-4994-83e5-50fe0e391101","role":"authenticated","is_anonymous":true}',true);
do $$ begin
  if exists(select 1 from public.journals) then raise exception 'Anonymous auth read allowed'; end if;
  begin perform public.save_journal('{}',2); raise exception 'Anonymous auth write allowed';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin perform 1 from public.journals; raise exception 'Public read allowed';
  exception when insufficient_privilege then null; end;
  begin perform public.save_journal('{}',0); raise exception 'Public RPC allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: owner isolation, revisions, anonymous rejection; test data rolled back' as verification;
