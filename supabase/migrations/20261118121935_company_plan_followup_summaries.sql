begin;
create or replace function raw_platform.save_client_plan(org uuid,subject uuid,new_payload jsonb,expected integer,change jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare previous jsonb;revision_n integer;kind text:=change->>'kind';begin
 if not raw_platform.can_edit_client(org,subject) then raise exception 'No puedes editar planes de este alumno en esta empresa.' using errcode='42501';end if;
 if kind is null or kind not in ('meal','publish-nutrition','training') or expected is null or expected<1 or expected>2147483646 or jsonb_typeof(new_payload)<>'object' or octet_length(new_payload::text)>2200000 or octet_length(change::text)>5000 then raise exception 'Propuesta no válida.' using errcode='22023';end if;
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
create or replace function raw_platform.snapshot_page(org uuid,member_page integer,search text) returns jsonb language plpgsql security definer set search_path='' as $$
declare super boolean:=raw_platform.is_super();actor_role text:=raw_platform.member_role(org);offset_n integer:=greatest(0,least(10000,member_page))*100;needle text:=left(coalesce(search,''),100);begin
 if not super and (org is null or actor_role is null or actor_role not in ('admin','coach')) then raise exception 'Panel no autorizado.' using errcode='42501';end if;
 return jsonb_build_object(
 'organizations',coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc) from (select * from public.organizations
 where org is not null and id=org or org is null and super and (needle='' or name ilike '%'||needle||'%' or slug ilike '%'||needle||'%') order by created_at desc limit 100 offset case when org is null then offset_n else 0 end)o),'[]'),
 'organizationStats',coalesce((select jsonb_agg(jsonb_build_object('organization_id',o.id,'users',s.users,'staff',s.staff,'active30',s.active30))
 from public.organizations o cross join lateral(select count(*) filter(where m.role='user' and m.status='active') as users,count(*) filter(where m.role<>'user' and m.status='active') as staff,
 count(*) filter(where m.last_seen>now()-interval '30 days' and m.status='active') as active30 from public.organization_members m where m.organization_id=o.id)s where org is null and super or o.id=org),'[]'),
 'totals',jsonb_build_object('companies',(select count(*) from public.organizations where org is null and super or id=org),
 'members',(select count(*) from public.organization_members m join auth.users u on u.id=m.user_id where (org is null and super or m.organization_id=org)
 and (super or actor_role='admin' or m.user_id=auth.uid() or m.coach_id=auth.uid()) and (org is null or needle='' or m.display_name ilike '%'||needle||'%' or u.email ilike '%'||needle||'%')),
 'activeCompanies',(select count(*) from public.organizations where status='active' and (org is null and super or id=org)),
 'mrrCents',(select coalesce(sum(s.monthly_cents),0) from public.organization_subscriptions s join public.organizations o on o.id=s.organization_id where s.status='active' and o.status='active' and (org is null and super or s.organization_id=org and (super or actor_role='admin'))),
 'paidCents',(select coalesce(sum(amount_cents),0) from public.organization_invoices where status='paid' and (org is null and super or organization_id=org and (super or actor_role='admin'))),
 'overdueCents',(select coalesce(sum(amount_cents),0) from public.organization_invoices where status='open' and due_date<(now() at time zone 'Europe/Madrid')::date and (org is null and super or organization_id=org and (super or actor_role='admin'))),
 'aiRequests30',(select count(*) from public.coach_reviews where created_at>now()-interval '30 days' and (org is null and super or organization_id=org and (super or actor_role='admin')))),
 'members',coalesce((select jsonb_agg(to_jsonb(m) order by created_at desc) from
 (select m.*,u.email from public.organization_members m join auth.users u on u.id=m.user_id where (org is null and super or m.organization_id=org)
 and (super or actor_role='admin' or m.user_id=auth.uid() or m.coach_id=auth.uid())
 and (org is null or needle='' or m.display_name ilike '%'||needle||'%' or u.email ilike '%'||needle||'%')
 order by m.created_at desc,m.user_id limit 100 offset offset_n)m),'[]'),
 'staff',coalesce((select jsonb_agg(to_jsonb(m) order by display_name) from (select m.*,u.email from public.organization_members m join auth.users u on u.id=m.user_id where org is not null and m.organization_id=org and m.role<>'user' and (super or actor_role='admin' or m.user_id=auth.uid()) order by m.display_name limit 1000)m),'[]'),
 'subscriptions',coalesce((select jsonb_agg(to_jsonb(s)) from public.organization_subscriptions s where org is null and super or s.organization_id=org and (super or actor_role='admin')),'[]'),
 'invoices',coalesce((select jsonb_agg(to_jsonb(i) order by created_at desc) from (select * from public.organization_invoices where org is null and super or organization_id=org and (super or actor_role='admin') order by created_at desc limit 300)i),'[]'),
 'activity',coalesce((select jsonb_agg(to_jsonb(a) order by created_at desc) from (select * from public.organization_activity where org is null and super or organization_id=org and (super or actor_role='admin' or actor_id=auth.uid()) order by created_at desc limit 200)a),'[]'),
 'invitations',coalesce((select jsonb_agg(to_jsonb(i)-'token_hash' order by created_at desc) from (select * from public.organization_invitations where org is null and super or organization_id=org and (super or actor_role='admin') order by created_at desc limit 100)i),'[]'),
 'templates',coalesce((select jsonb_agg(to_jsonb(t) order by created_at desc) from public.organization_templates t where organization_id=org),'[]'),
 'clientMetrics',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'metrics',raw_platform.followup_metrics(case when m.organization_id=raw_platform.rise_id() then j.payload else oj.payload end)))
 from (select mm.* from public.organization_members mm join auth.users u on u.id=mm.user_id where org is not null and mm.organization_id=org
 and (super or actor_role='admin' or mm.user_id=auth.uid() or mm.coach_id=auth.uid())
 and (needle='' or mm.display_name ilike '%'||needle||'%' or u.email ilike '%'||needle||'%') order by mm.created_at desc,mm.user_id limit 100 offset offset_n)m
 left join public.journals j on j.owner=m.user_id and m.organization_id=raw_platform.rise_id()
 left join public.organization_journals oj on oj.organization_id=m.organization_id and oj.owner=m.user_id
 where raw_platform.can_view_client(org,m.user_id)),'[]'));
end$$;
commit;
