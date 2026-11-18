-- Only synthetic pupils and companies. All writes are rolled back.
begin;
insert into auth.users(id,aud,role,email,email_confirmed_at) select ('d0010000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','plan-test-'||n||'@example.invalid',now() from generate_series(1,4)n;
insert into public.organizations(id,name,slug,kind,brand,modules,max_users,max_staff)
select ('d0020000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Plan test '||n,'plan-test-'||n,'boxing','{"logo":"","primary":"#006747","accent":"#d3a44a","tagline":"Test"}','{"nutrition":true,"training":true,"boxing":true,"competition":true,"ai":true,"photos":true,"learning":true,"progress":true}',10,10 from generate_series(1,2)n;
insert into public.organization_members(organization_id,user_id,role,coach_id) values
('d0020000-0000-4000-8000-000000000001','d0010000-0000-4000-8000-000000000001','admin',null),
('d0020000-0000-4000-8000-000000000002','d0010000-0000-4000-8000-000000000002','admin',null),
('d0020000-0000-4000-8000-000000000001','d0010000-0000-4000-8000-000000000003','user','d0010000-0000-4000-8000-000000000004'),
('d0020000-0000-4000-8000-000000000002','d0010000-0000-4000-8000-000000000003','user',null),
('d0020000-0000-4000-8000-000000000001','d0010000-0000-4000-8000-000000000004','coach',null);
insert into public.organization_journals(organization_id,owner,payload) values
('d0020000-0000-4000-8000-000000000001','d0010000-0000-4000-8000-000000000003','{"active":"student-profile","profiles":[{"id":"student-profile","name":"Synthetic pupil","age":30,"sex":"male","height":175,"weight":70,"goal":75,"activity":1.6,"surplus":300,"waterGoal":2500,"confirmed":true,"allergens":[],"excluded":[],"health":"Pendiente de confirmar.","training":"Frecuencia y duración pendientes de confirmar.","budget":"Pendiente.","plans":[],"days":{"2026-11-18":{"items":[{"id":"recorded-food","meal":"Primera comida","food":{"id":"bread","name":"Pan integral","unit":"tal como se vende","k":250,"p":9,"c":43,"f":4,"allergens":["gluten"]},"grams":50}],"water":2500,"weight":null,"steps":null,"minutes":0,"training":"","sleep":null,"notes":"Original feedback","complete":false,"target":{"bmr":1648.75,"maintenance":2638,"k":2950,"p":140,"f":89,"c":397.25},"foodPlan":{"planId":"synthetic","autoAdjust":false,"labels":["Primera comida","Comida","Cena"],"records":[{"slot":0,"status":"planned","itemIds":["recorded-food"]}],"meals":[{"name":"Recorded breakfast","items":[{"food":{"id":"bread","name":"Pan integral","unit":"tal como se vende","k":250,"p":9,"c":43,"f":4,"allergens":["gluten"]},"grams":50}]},{"name":"Lunch","items":[{"food":{"id":"rice","name":"Arroz","unit":"en seco","k":356,"p":7,"c":79,"f":1,"allergens":[]},"grams":100}]},{"name":"Dinner","items":[{"food":{"id":"chicken","name":"Pechuga de pollo","unit":"cruda, sin hueso","k":110,"p":23,"c":0,"f":2,"allergens":[]},"grams":150}]}]}},"2026-11-01":{"items":[],"water":0,"weight":null,"steps":null,"minutes":0,"training":"","sleep":null,"notes":"Past record","complete":false,"target":{"bmr":1648.75,"maintenance":2638,"k":2950,"p":140,"f":89,"c":397.25}}},"legacyFlag":"keep"}],"legacyRoot":{"keep":true}}'),
('d0020000-0000-4000-8000-000000000002','d0010000-0000-4000-8000-000000000003','{"active":"other","profiles":[{"id":"other","plans":[],"days":{}}]}');
insert into public.organization_members(organization_id,user_id,role) select id,'d0010000-0000-4000-8000-000000000003','user' from public.organizations where slug='rise';
set local role authenticated;
do $$declare org uuid:='d0020000-0000-4000-8000-000000000001';other uuid:='d0020000-0000-4000-8000-000000000002';pupil uuid:='d0010000-0000-4000-8000-000000000003';before jsonb;next jsonb;modified jsonb;path text[];today text:=((now() at time zone 'Europe/Madrid')::date)::text;begin
 perform set_config('request.jwt.claims','{"sub":"d0010000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
 if not raw_platform.can_edit_client(org,pupil) or raw_platform.can_edit_client(other,pupil) then raise exception 'Admin company boundary failed';end if;
 before:=public.platform_client_detail(org,pupil)->'state';
 if public.platform_client_detail(org,pupil)->>'canManageProfile'<>'false' then raise exception 'Pupil permissions expanded beyond plan management';end if;
 path:=array['profiles','0','days',today,'foodPlan','meals','1','items','0','grams'];next:=jsonb_set(before,path,'125');
 if public.platform_save_client_plan(org,pupil,next,1,'{"kind":"meal","month":"2026-11"}')<>2 then raise exception 'Plan save failed';end if;
 if public.platform_save_client_plan(org,pupil,before,1,'{"kind":"meal"}') is not null then raise exception 'Stale revision overwrote new data';end if;
 modified:=jsonb_set(next,array['profiles','0','days',today,'water'],'100');
 begin perform public.platform_save_client_plan(org,pupil,modified,2,'{"kind":"meal"}');raise exception 'Water altered by planner';exception when insufficient_privilege then null;end;
 modified:=jsonb_set(next,array['profiles','0','days',today,'items','0','grams'],'10');
 begin perform public.platform_save_client_plan(org,pupil,modified,2,'{"kind":"meal"}');raise exception 'Consumed intake altered';exception when insufficient_privilege then null;end;
 modified:=jsonb_set(next,array['profiles','0','days',today,'foodPlan','meals','0','name'],'"Changed recorded meal"');
 begin perform public.platform_save_client_plan(org,pupil,modified,2,'{"kind":"meal"}');raise exception 'Recorded meal altered';exception when insufficient_privilege then null;end;
 modified:=jsonb_set(next,'{profiles,0,days,2026-11-01,notes}','"Changed history"');
 begin perform public.platform_save_client_plan(org,pupil,modified,2,'{"kind":"meal"}');raise exception 'Historical record altered';exception when insufficient_privilege then null;end;
 modified:=jsonb_set(next,'{profiles,0,age}','45');
 begin perform public.platform_save_client_plan(org,pupil,modified,2,'{"kind":"meal"}');raise exception 'Profile changed by plan editor';exception when insufficient_privilege then null;end;
 begin perform public.platform_save_client_plan(org,pupil,before,2,'{"kind":"training"}');raise exception 'Plan kind spoofing changed food';exception when insufficient_privilege then null;end;
 modified:=jsonb_set(next,'{profiles,0,workouts}',jsonb_build_object('plans',jsonb_build_array(jsonb_build_object('id','new-month-plan','month','2026-11','sessions','[]'::jsonb)),'logs','[]'::jsonb));
 if public.platform_save_client_plan(org,pupil,modified,2,'{"kind":"training"}')<>3 then raise exception 'Routine plan save failed';end if;
 next:=modified;
 modified:=jsonb_set(next,'{profiles,0,workouts,logs}','[{"fake":"new actual record"}]');
 begin perform public.platform_save_client_plan(org,pupil,modified,3,'{"kind":"training"}');raise exception 'Planner created actual workout log';exception when insufficient_privilege then null;end;
 modified:=jsonb_set(next,'{profiles,0,workouts,plans}','[{"id":"rewritten-old"},{"id":"another-plan"}]');
 begin perform public.platform_save_client_plan(org,pupil,modified,3,'{"kind":"training"}');raise exception 'Previous plan version was replaced';exception when insufficient_privilege then null;end;
 begin perform public.platform_save_client_plan(other,pupil,next,1,'{"kind":"meal"}');raise exception 'Foreign company edited';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims','{"sub":"d0010000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',true);
 if public.platform_client_detail(other,pupil)#>>'{state,active}'<>'other' then raise exception 'Other company overwritten';end if;
 begin perform public.platform_save_client_plan(org,pupil,before,2,'{"kind":"meal"}');raise exception 'Other admin edited company A';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims','{"sub":"d0010000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false}',true);
 if raw_platform.can_edit_client(org,pupil) then raise exception 'Coach bypassed consent';end if;
 perform set_config('request.jwt.claims','{"sub":"d0010000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}',true);
 perform public.platform_action('consent',jsonb_build_object('organization_id',org,'share_followup',true));
 perform set_config('request.jwt.claims','{"sub":"d0010000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false}',true);
 if not raw_platform.can_edit_client(org,pupil) then raise exception 'Assigned coach lost access';end if;
 perform set_config('request.jwt.claims','{"sub":"668804f0-9d88-4bef-871f-96288b202fa0","role":"authenticated","is_anonymous":false}',true);
 if raw_platform.can_edit_client(org,pupil) then raise exception 'Owner gained foreign company writes';end if;
 if not raw_platform.can_edit_client(raw_platform.rise_id(),pupil) then raise exception 'Rise owner cannot edit Rise pupil';end if;
end$$;
reset role;
update public.organizations set modules=modules||'{"nutrition":false,"competition":false}' where id='d0020000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d0010000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
do $$declare p jsonb;begin p:=public.platform_client_detail('d0020000-0000-4000-8000-000000000001','d0010000-0000-4000-8000-000000000003')->'state';begin perform public.platform_save_client_plan('d0020000-0000-4000-8000-000000000001','d0010000-0000-4000-8000-000000000003',p,2,'{"kind":"meal"}');raise exception 'Disabled module accepted a write';exception when insufficient_privilege then null;end;end$$;
set local role anon;
do $$begin begin perform public.platform_save_client_plan(null,null,'{}',1,'{"kind":"meal"}');raise exception 'Anonymous plan save allowed';exception when insufficient_privilege then null;end;end$$;
rollback;
select 'PASS: company pupil plans, scoped Rise owner editing, coach consent, CAS, module gates, immutable consumption, meals, profile and past data. Fixtures rolled back.' as verification;
