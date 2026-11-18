begin;
-- Company administrators manage their own pupils' plans. Coaches retain assigned, consented access.
create function raw_platform.can_edit_client(org uuid,subject uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id
 where m.organization_id=org and m.user_id=subject and m.status='active' and o.status='active' and raw_platform.member_role(org) is not null
 and ((raw_platform.member_role(org)='admin' and m.role='user')
 or (raw_platform.member_role(org) in ('admin','coach') and raw_platform.can_follow(org,subject))
 or (org=raw_platform.rise_id() and auth.uid()='668804f0-9d88-4bef-871f-96288b202fa0' and raw_platform.is_super()))),false)$$;
revoke all on function raw_platform.can_edit_client(uuid,uuid) from public,anon;
grant execute on function raw_platform.can_edit_client(uuid,uuid) to authenticated;
create or replace function raw_platform.can_view_client(org uuid,subject uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(raw_platform.can_follow(org,subject),false) or raw_platform.can_edit_client(org,subject) or (raw_platform.is_super() and exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id where m.organization_id=org and m.user_id=subject and m.status='active' and o.status='active'))$$;
-- Normalize actual daily records, ignoring only pending prescription fields and empty future placeholders.
create function raw_platform.plan_day_records(days jsonb,today text) returns jsonb language plpgsql immutable set search_path='' as $$
declare d record;v jsonb;result jsonb:='{}';empty jsonb:='{"items":[],"water":0,"weight":null,"steps":null,"minutes":0,"training":"","sleep":null,"notes":"","complete":false}';begin
 for d in select key,value from jsonb_each(coalesce(days,'{}')) loop
  if d.key<today or coalesce((d.value->>'complete')::boolean,false) then v:=d.value;
  else v:=d.value-array['foodPlan','target','nutrition','competition','supplementForecast'];end if;
  if v<>empty or d.key<today or coalesce((d.value->>'complete')::boolean,false) then result:=result||jsonb_build_object(d.key,v);end if;
 end loop;return result;
end$$;
revoke all on function raw_platform.plan_day_records(jsonb,text) from public,anon,authenticated;
create function raw_platform.assert_client_plan(before jsonb,after jsonb,kind text) returns void language plpgsql security definer set search_path='' as $$
declare oldp jsonb;newp jsonb;oldplans jsonb;newplans jsonb;prefix_old jsonb;prefix_new jsonb;d record;r jsonb;oldrecords jsonb;newrecords jsonb;today text:=((now() at time zone 'Europe/Madrid')::date)::text;i integer;begin
 if (before-'profiles') is distinct from (after-'profiles') or jsonb_array_length(before->'profiles')<>jsonb_array_length(after->'profiles') then raise exception 'El cambio debe conservar los perfiles y la selección del usuario.' using errcode='42501';end if;
 for i in 0..jsonb_array_length(before->'profiles')-1 loop
  oldp:=before->'profiles'->i;newp:=after->'profiles'->i;
  if kind='training' then
   if (oldp-'workouts') is distinct from (newp-'workouts') or coalesce(oldp#>'{workouts,logs}','[]') is distinct from coalesce(newp#>'{workouts,logs}','[]') or coalesce(oldp#>'{workouts,drafts}','[]') is distinct from coalesce(newp#>'{workouts,drafts}','[]')
   then raise exception 'Los datos del perfil y las sesiones realizadas o iniciadas se conservan.' using errcode='42501';end if;
   oldplans:=coalesce(oldp#>'{workouts,plans}','[]');newplans:=coalesce(newp#>'{workouts,plans}','[]');
   if oldplans is distinct from newplans then
    if jsonb_array_length(newplans)<>least(12,jsonb_array_length(oldplans)+1) then raise exception 'La planificación debe conservar sus versiones anteriores.' using errcode='42501';end if;
    select coalesce(jsonb_agg(x order by n),'[]') into prefix_old from jsonb_array_elements(oldplans) with ordinality e(x,n) where n>greatest(0,jsonb_array_length(oldplans)-11);
    select coalesce(jsonb_agg(x order by n),'[]') into prefix_new from jsonb_array_elements(newplans) with ordinality e(x,n) where n<jsonb_array_length(newplans);
    if prefix_old is distinct from prefix_new then raise exception 'Las versiones guardadas no se sobrescriben.' using errcode='42501';end if;
   end if;
  else
   if (oldp-'days') is distinct from (newp-'days') or raw_platform.plan_day_records(oldp->'days',today) is distinct from raw_platform.plan_day_records(newp->'days',today)
   then raise exception 'La edición de dieta conserva perfil, consumos, medidas y días pasados.' using errcode='42501';end if;
   for d in select key,value from jsonb_each(coalesce(oldp->'days','{}')) where key>=today loop
    oldrecords:=coalesce(d.value#>'{foodPlan,records}','[]');newrecords:=coalesce(newp->'days'->d.key#>'{foodPlan,records}','[]');
    if d.value->'foodPlan' is not null and oldrecords is distinct from newrecords then raise exception 'Los registros de comidas no se alteran al planificar.' using errcode='42501';end if;
    if jsonb_array_length(oldrecords)>0 then
     if d.value#>'{foodPlan,labels}' is distinct from newp->'days'->d.key#>'{foodPlan,labels}' then raise exception 'Las franjas registradas se conservan.' using errcode='42501';end if;
     for r in select value from jsonb_array_elements(oldrecords) loop
      if d.value#>array['foodPlan','meals',r->>'slot'] is distinct from newp->'days'->d.key#>array['foodPlan','meals',r->>'slot'] then raise exception 'La comida ya registrada se conserva.' using errcode='42501';end if;
     end loop;
    end if;
    if d.value->'foodPlan' is null then
     for r in select value from jsonb_array_elements(newrecords) loop
      if r->>'status'<>'alternative' or exists(select 1 from jsonb_array_elements_text(r->'itemIds') id where not exists(select 1 from jsonb_array_elements(d.value->'items') item where item->>'id'=id))
      then raise exception 'Solo se pueden enlazar alimentos ya registrados.' using errcode='42501';end if;
     end loop;
    end if;
   end loop;
  end if;
 end loop;
end$$;
revoke all on function raw_platform.assert_client_plan(jsonb,jsonb,text) from public,anon,authenticated;
create function raw_platform.save_client_plan(org uuid,subject uuid,new_payload jsonb,expected integer,change jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare previous jsonb;revision_n integer;kind text:=change->>'kind';begin
 if not raw_platform.can_edit_client(org,subject) then raise exception 'No puedes editar planes de este alumno en esta empresa.' using errcode='42501';end if;
 if kind not in ('meal','publish-nutrition','training') or expected is null or expected<1 or expected>2147483646 or jsonb_typeof(new_payload)<>'object' or octet_length(new_payload::text)>2200000 or octet_length(change::text)>5000 then raise exception 'Propuesta no válida.' using errcode='22023';end if;
 if not raw_platform.module_enabled(org,case when kind='training' then 'training' else 'nutrition' end) then raise exception 'El módulo del plan no está activo.' using errcode='42501';end if;
 if org=raw_platform.rise_id() then select j.payload,j.revision into previous,revision_n from public.journals j where j.owner=subject for update;
 else select j.payload,j.revision into previous,revision_n from public.organization_journals j where j.organization_id=org and j.owner=subject for update;end if;
 if previous is null then raise exception 'El alumno debe completar primero su perfil.' using errcode='P0002';end if;
 if revision_n<>expected then return null;end if;
 if previous=new_payload then raise exception 'No hay cambios que guardar.' using errcode='22023';end if;
 perform raw_platform.assert_client_plan(previous,new_payload,kind);
 perform raw_platform.check_modules(org,previous,new_payload);
 if org=raw_platform.rise_id() then update public.journals set payload=new_payload,revision=revision+1,updated_at=now() where owner=subject returning revision into revision_n;
 else update public.organization_journals set payload=new_payload,revision=revision+1,updated_at=now() where organization_id=org and owner=subject returning revision into revision_n;end if;
 perform raw_platform.audit(org,'client.plan_updated',subject::text,change||jsonb_build_object('revision',revision_n));return revision_n;
end$$;
revoke all on function raw_platform.save_client_plan(uuid,uuid,jsonb,integer,jsonb) from public,anon;
grant execute on function raw_platform.save_client_plan(uuid,uuid,jsonb,integer,jsonb) to authenticated;
create function public.platform_save_client_plan(org uuid,subject uuid,new_payload jsonb,expected integer,change jsonb) returns integer language sql security invoker set search_path='' as $$select raw_platform.save_client_plan(org,subject,new_payload,expected,change)$$;
revoke all on function public.platform_save_client_plan(uuid,uuid,jsonb,integer,jsonb) from public,anon;
grant execute on function public.platform_save_client_plan(uuid,uuid,jsonb,integer,jsonb) to authenticated;
create or replace function raw_platform.client_detail(org uuid,subject uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare state jsonb;rev integer;stamp timestamptz;editable boolean;profile_access boolean;begin
 if not raw_platform.can_view_client(org,subject) or (not raw_platform.is_super() and coalesce(raw_platform.member_role(org),'') not in ('admin','coach')) then raise exception 'Seguimiento no autorizado.' using errcode='42501';end if;
 profile_access:=coalesce(raw_platform.member_role(org) in ('admin','coach') and raw_platform.can_follow(org,subject),false);
 editable:=raw_platform.can_edit_client(org,subject);
 if org=raw_platform.rise_id() then select j.payload,j.revision,j.updated_at into state,rev,stamp from public.journals j where j.owner=subject;
 else select j.payload,j.revision,j.updated_at into state,rev,stamp from public.organization_journals j where j.organization_id=org and j.owner=subject;end if;
 perform raw_platform.audit(org,case when editable then 'client.viewed' else 'client.supervision_viewed' end,subject::text);
 return jsonb_build_object('state',state,'revision',coalesce(rev,0),'updatedAt',stamp,'canEdit',editable,'canManageProfile',profile_access,
 'notes',coalesce((select jsonb_agg(to_jsonb(n) order by created_at desc) from (select id,content,created_at from public.organization_client_notes where organization_id=org and user_id=subject order by created_at desc limit 100)n),'[]'),
 'activity',coalesce((select jsonb_agg(to_jsonb(a) order by created_at desc) from (select * from public.organization_activity where organization_id=org and (actor_id=subject or target=subject::text) order by created_at desc limit 120)a),'[]'),
 'reviews',coalesce((select jsonb_agg(to_jsonb(r) order by created_at desc) from (select request_day,profile,choice,created_at from public.coach_reviews where organization_id=org and owner=subject order by created_at desc limit 60)r),'[]'),
 'weekly',coalesce((select jsonb_agg(to_jsonb(w) order by reviewed_at desc) from (select week,profile,review,reviewed_at,dismissed from public.coach_weekly_reviews where organization_id=org and owner=subject order by reviewed_at desc limit 30)w),'[]'),
 'foodPhotos',coalesce((select jsonb_agg(to_jsonb(f) order by created_at desc) from (select request_day,choice,created_at from public.food_photo_reviews where organization_id=org and owner=subject order by created_at desc limit 30)f),'[]'));
end$$;
commit;
