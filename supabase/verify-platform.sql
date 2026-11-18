-- Synthetic tenants and identities only. Entire transaction is rolled back.
begin;
insert into auth.users(id,aud,role,email,email_confirmed_at) select ('c0010000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','platform-test-'||n||'@example.invalid',now() from generate_series(1,7)n;
insert into public.platform_admins(user_id) values('c0010000-0000-4000-8000-000000000001');
insert into public.organizations(id,name,slug,kind,brand,modules,max_users,max_staff)
select ('c0020000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Test company '||n,'platform-test-'||n,'boxing','{"logo":"","primary":"#006747","accent":"#d3a44a","tagline":"Test"}','{"nutrition":true,"training":true,"boxing":true,"competition":true,"ai":true,"photos":true,"learning":true,"progress":true}',10,10 from generate_series(1,2)n;
insert into public.organization_members(organization_id,user_id,role,share_followup,coach_id) values
('c0020000-0000-4000-8000-000000000001','c0010000-0000-4000-8000-000000000002','admin',false,null),
('c0020000-0000-4000-8000-000000000001','c0010000-0000-4000-8000-000000000003','coach',false,null),
('c0020000-0000-4000-8000-000000000001','c0010000-0000-4000-8000-000000000004','user',false,'c0010000-0000-4000-8000-000000000003'),
('c0020000-0000-4000-8000-000000000001','c0010000-0000-4000-8000-000000000005','coach',false,null),
('c0020000-0000-4000-8000-000000000002','c0010000-0000-4000-8000-000000000004','user',false,null),
('c0020000-0000-4000-8000-000000000002','c0010000-0000-4000-8000-000000000006','admin',false,null);
set local role authenticated;
do $$declare a uuid:='c0020000-0000-4000-8000-000000000001';b uuid:='c0020000-0000-4000-8000-000000000002';athlete uuid:='c0010000-0000-4000-8000-000000000004';token text;inv jsonb;stamp text;s jsonb;begin
 perform set_config('request.jwt.claims','{"sub":"c0010000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false,"user_metadata":{"role":"superadmin"}}',true);
 if raw_platform.is_super() then raise exception 'Client metadata granted root';end if;
 if public.platform_save_journal(a,'{"active":"p","profiles":[{"id":"p","plans":[],"days":{}}],"marker":"A"}',0)<>1 then raise exception 'Save A failed';end if;
 insert into public.food_photo_reviews(organization_id,owner,request_day,slot,input_hash) values(a,athlete,(now() at time zone 'utc')::date,0,repeat('a',64)),(b,athlete,(now() at time zone 'utc')::date,0,repeat('a',64));
 if public.platform_save_journal(b,'{"active":"p","profiles":[{"id":"p","plans":[],"days":{}}],"marker":"B"}',0)<>1 then raise exception 'Save B failed';end if;
 if public.platform_journal(a)->'payload'->>'marker'<>'A' or public.platform_journal(b)->'payload'->>'marker'<>'B' then raise exception 'Tenants mixed for same account';end if;
 if public.platform_save_journal(a,'{}',0) is not null then raise exception 'CAS accepted stale version';end if;
 begin perform public.platform_action('create_company','{}');raise exception 'Athlete created company';exception when insufficient_privilege then null;end;
 begin perform public.platform_snapshot(a);raise exception 'Athlete opened management';exception when insufficient_privilege then null;end;
 begin perform public.platform_action('member',jsonb_build_object('organization_id',a,'user_id',athlete,'role','admin','status','active'));raise exception 'Athlete escalated role';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims','{"sub":"c0010000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',true);
 begin perform public.platform_journal(a,athlete);raise exception 'Admin bypassed consent';exception when insufficient_privilege then null;end;
 begin perform public.platform_snapshot(b);raise exception 'Admin read other company';exception when insufficient_privilege then null;end;
 begin perform public.platform_action('brand',jsonb_build_object('organization_id',b,'brand','{}','name','Other'));raise exception 'Admin changed other brand';exception when insufficient_privilege then null;end;
 if jsonb_array_length(public.platform_snapshot(a)->'clientMetrics')<>1 then raise exception 'Private client metrics leaked';end if;
 inv:=public.platform_action('invite',jsonb_build_object('organization_id',a,'email','platform-test-7@example.invalid','role','user'));token:=inv->>'token';
 if length(token)<>64 or public.platform_invite_info(token)->>'slug'<>'platform-test-1' then raise exception 'Invitation invalid';end if;
 perform set_config('request.jwt.claims','{"sub":"c0010000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false}',true);
 begin perform public.platform_action('accept_invite',jsonb_build_object('token',token));raise exception 'Wrong email accepted invite';exception when insufficient_privilege then null;end;
 perform public.platform_action('consent',jsonb_build_object('organization_id',a,'share_followup',true));
 perform set_config('request.jwt.claims','{"sub":"c0010000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}',true);
 if public.platform_journal(a,athlete)->'payload'->>'marker'<>'A' then raise exception 'Assigned coach cannot follow';end if;
 perform public.platform_action('note',jsonb_build_object('organization_id',a,'user_id',athlete,'content','Synthetic note'));
 if jsonb_array_length(public.platform_client_notes(a,athlete))<>1 then raise exception 'Notes not scoped';end if;
 begin perform public.platform_action('invite',jsonb_build_object('organization_id',a,'email','x@example.invalid','role','admin'));raise exception 'Coach invited admin';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims','{"sub":"c0010000-0000-4000-8000-000000000005","role":"authenticated","is_anonymous":false}',true);
 begin perform public.platform_journal(a,athlete);raise exception 'Unassigned coach read private data';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims','{"sub":"c0010000-0000-4000-8000-000000000007","role":"authenticated","is_anonymous":false}',true);
 perform public.platform_action('accept_invite',jsonb_build_object('token',token));
 begin perform public.platform_action('accept_invite',jsonb_build_object('token',token));raise exception 'Invitation reused';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims','{"sub":"c0010000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
 begin perform public.platform_journal(a,athlete);raise exception 'Root bypassed private health permission';exception when insufficient_privilege then null;end;
 perform public.platform_action('subscription',jsonb_build_object('organization_id',a,'plan','Test','status','active','monthly_cents',9900,'currency','EUR','renewal_date','2026-12-18','billing_email','billing@example.invalid'));
 perform public.platform_action('invoice',jsonb_build_object('organization_id',a,'number','TEST-001','description','Synthetic invoice','amount_cents',9900,'due_date','2026-11-01','status','open','period_start','2026-11-01','period_end','2026-11-30'));
 if (public.platform_snapshot(a)#>>'{totals,mrrCents}')::integer<>9900 or (public.platform_snapshot(a)#>>'{totals,overdueCents}')::integer<>9900 then raise exception 'Commercial totals incorrect';end if;
 s:=public.platform_snapshot(a)->'organizations'->0;stamp:=s->>'updated_at';
 perform public.platform_action('update_company',(s-'id'-'created_at'-'updated_at')||jsonb_build_object('organization_id',a,'expected_updated_at',stamp,'modules',(s->'modules')||'{"nutrition":false,"competition":false}'));
 begin perform public.platform_action('brand',jsonb_build_object('organization_id',a,'name','Stale','brand',s->'brand','expected_updated_at','2000-01-01T00:00:00Z'));raise exception 'Stale brand update accepted';exception when serialization_failure then null;end;
 perform set_config('request.jwt.claims','{"sub":"c0010000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false}',true);
 if public.platform_save_journal(a,'{"active":"p","profiles":[{"id":"p","plans":[],"days":{"2026-11-18":{"items":[],"water":250}}}],"marker":"A"}',1)<>2 then raise exception 'Disabled food blocked hydration';end if;
 begin perform public.platform_save_journal(a,'{"active":"p","profiles":[{"id":"p","plans":[{"food":"new"}],"days":{}}]}',2);raise exception 'Disabled nutrition accepted changed diet';exception when insufficient_privilege then null;end;
 perform public.platform_action('consent',jsonb_build_object('organization_id',a,'share_followup',false));
 perform set_config('request.jwt.claims','{"sub":"c0010000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}',true);
 begin perform public.platform_journal(a,athlete);raise exception 'Revoked consent retained access';exception when insufficient_privilege then null;end;
end$$;
reset role;
update public.organization_members set status='suspended' where organization_id='c0020000-0000-4000-8000-000000000002' and user_id='c0010000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c0010000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false}',true);
do $$begin
 begin perform public.platform_journal('c0020000-0000-4000-8000-000000000002');raise exception 'Suspended member read data';exception when insufficient_privilege then null;end;
 if raw_platform.photo_scope('c0010000-0000-4000-8000-000000000004/organizations/c0020000-0000-4000-8000-000000000002/p/test.jpg') then raise exception 'Suspended member read photo';end if;
end$$;
reset role;
update public.organizations set status='suspended' where id='c0020000-0000-4000-8000-000000000001';
set local role authenticated;
do $$begin begin perform public.platform_save_journal('c0020000-0000-4000-8000-000000000001','{}',2);raise exception 'Suspended company allowed save';exception when insufficient_privilege then null;end;end$$;
set local role anon;
do $$begin
 if public.organization_brand('platform-test-2')->>'slug'<>'platform-test-2' then raise exception 'Public brand unavailable';end if;
 begin perform public.platform_snapshot(null);raise exception 'Anonymous opened panel';exception when insufficient_privilege then null;end;
 begin perform 1 from public.organization_journals;raise exception 'Anonymous read tenant journals';exception when insufficient_privilege then null;end;
end$$;
rollback;
select 'PASS: tenant isolation, role spoofing, consent, assigned coaches, invitations, CAS, disabled modules, suspension, photos and anonymous access. All fixtures rolled back.' as verification;
