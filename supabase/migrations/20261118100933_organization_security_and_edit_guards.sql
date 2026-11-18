begin;
create or replace function raw_platform.is_super() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce(auth.jwt()->>'is_anonymous','false')='false' and exists(select 1 from public.platform_admins a join auth.users u on u.id=a.user_id where a.user_id=auth.uid() and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<now()))$$;
create or replace function raw_platform.member_role(org uuid) returns text language sql stable security definer set search_path='' as $$
 select m.role from public.organization_members m join public.organizations o on o.id=m.organization_id join auth.users u on u.id=m.user_id where m.organization_id=org and m.user_id=auth.uid() and m.status='active' and o.status='active' and coalesce(auth.jwt()->>'is_anonymous','false')='false' and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<now())$$;
create function raw_platform.valid_brand(b jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(b)='object' and b ?& array['logo','primary','accent','tagline'] and octet_length(b::text)<=200000 and length(b->>'tagline')<=160 and b->>'primary' ~ '^#[0-9a-fA-F]{6}$' and b->>'accent' ~ '^#[0-9a-fA-F]{6}$' and length(b->>'logo')<=180000 and (b->>'logo'='' or b->>'logo' ~ '^https://[^[:space:]<>"]+$' or b->>'logo' ~ '^/[^/][a-zA-Z0-9/_.-]*$' or b->>'logo' ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$'),false)$$;
revoke all on function raw_platform.valid_brand(jsonb) from public,anon;
grant execute on function raw_platform.valid_brand(jsonb) to authenticated;
alter table public.organizations add constraint organizations_safe_brand check(raw_platform.valid_brand(brand));
create index organization_members_coach_id_fk on public.organization_members(coach_id);
create index organization_invitations_inviter_fk on public.organization_invitations(invited_by);
create index organization_activity_actor_fk on public.organization_activity(actor_id);
create index organization_client_notes_author_fk on public.organization_client_notes(author_id);
create index organization_client_notes_user_fk on public.organization_client_notes(user_id);
create index organization_templates_creator_fk on public.organization_templates(created_by);
create or replace function raw_platform.action(kind text,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare org uuid;uid uuid:=auth.uid();super boolean:=raw_platform.is_super();c public.organizations;subject uuid;desired_role text;desired_status text;token text;invite public.organization_invitations;member public.organization_members;new_id uuid;result jsonb:='{}';begin
 if uid is null or coalesce(auth.jwt()->>'is_anonymous','false')<>'false' or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'Inicia sesión.' using errcode='42501';end if;
 if args ? 'organization_id' then org:=(args->>'organization_id')::uuid;end if;
 if kind='accept_invite' then
  select * into invite from public.organization_invitations where token_hash=encode(extensions.digest(args->>'token','sha256'),'hex') for update;
  if not found or invite.accepted_at is not null or invite.revoked_at is not null or invite.expires_at<=now() or not exists(select 1 from auth.users where id=uid and lower(email)=lower(invite.email) and email_confirmed_at is not null)
  or not exists(select 1 from public.organizations where id=invite.organization_id and status='active')
  or not (exists(select 1 from public.platform_admins where user_id=invite.invited_by) or exists(select 1 from public.organization_members where organization_id=invite.organization_id and user_id=invite.invited_by and role='admin' and status='active'))
  then raise exception 'Invitación no válida para esta cuenta, caducada o ya utilizada.' using errcode='42501';end if;
  org:=invite.organization_id;desired_role:=invite.role;select * into c from public.organizations where id=org for update;
  if exists(select 1 from public.organization_members where organization_id=org and user_id=uid and role<>desired_role) then raise exception 'Ya perteneces a esta empresa con otro rol. Un administrador debe modificar tu acceso.' using errcode='42501';end if;
  if (select count(*) from public.organization_members where organization_id=org and user_id<>uid and status='active' and (case when desired_role='user' then role='user' else role<>'user' end)) >= (case when desired_role='user' then c.max_users else c.max_staff end) then raise exception 'Se ha alcanzado el límite de plazas.';end if;
  insert into public.organization_members(organization_id,user_id,role,display_name) select org,uid,desired_role,left(coalesce(raw_user_meta_data->>'full_name',split_part(email,'@',1),'Usuario'),100) from auth.users where id=uid
  on conflict(organization_id,user_id) do update set role=excluded.role,status='active';
  update public.organization_invitations set accepted_at=now() where id=invite.id;perform raw_platform.audit(org,'invitation.accepted',uid::text);return jsonb_build_object('slug',c.slug);
 elsif kind='consent' then
  if raw_platform.member_role(org) is null then raise exception 'Sin acceso.' using errcode='42501';end if;
  update public.organization_members set share_followup=(args->>'share_followup')::boolean where organization_id=org and user_id=uid;perform raw_platform.audit(org,'consent.changed',uid::text,jsonb_build_object('enabled',args->'share_followup'));return '{"ok":true}';
 elsif kind='create_company' then
  if not super then raise exception 'Solo superadmin.' using errcode='42501';end if;
  insert into public.organizations(name,slug,kind,status,brand,modules,max_users,max_staff,self_signup) values(args->>'name',args->>'slug',args->>'kind',args->>'status',args->'brand',args->'modules',(args->>'max_users')::integer,(args->>'max_staff')::integer,false) returning id into org;
  insert into public.organization_subscriptions(organization_id) values(org);result:=jsonb_build_object('id',org);
 elsif kind='update_company' then
  if not super then raise exception 'Solo superadmin.' using errcode='42501';end if;
  select * into c from public.organizations where id=org for update;
  if not found then raise exception 'Empresa no encontrada.' using errcode='P0002';end if;
  if nullif(args->>'expected_updated_at','')::timestamptz is distinct from c.updated_at then raise exception 'La configuración ha cambiado. Actualiza el panel antes de guardar.' using errcode='40001';end if;
  if c.slug='rise' and args->>'slug'<>'rise' then raise exception 'Se conserva el identificador de Rise.';end if;
  if (args->>'max_users')::integer<(select count(*) from public.organization_members where organization_id=org and role='user' and status='active') or (args->>'max_staff')::integer<(select count(*) from public.organization_members where organization_id=org and role<>'user' and status='active') then raise exception 'Los límites son inferiores a las plazas activas.';end if;
  update public.organizations set name=args->>'name',slug=args->>'slug',kind=args->>'kind',status=args->>'status',brand=args->'brand',modules=args->'modules',max_users=(args->>'max_users')::integer,max_staff=(args->>'max_staff')::integer,self_signup=case when c.slug='rise' then (args->>'self_signup')::boolean else false end,updated_at=now() where id=org;
 elsif kind='brand' then
  if not raw_platform.manages(org) then raise exception 'Solo administradores.' using errcode='42501';end if;
  select * into c from public.organizations where id=org for update;
  if not found then raise exception 'Empresa no encontrada.' using errcode='P0002';end if;
  if nullif(args->>'expected_updated_at','')::timestamptz is distinct from c.updated_at then raise exception 'La marca ha cambiado. Actualiza el panel antes de guardar.' using errcode='40001';end if;
  update public.organizations set brand=args->'brand',name=args->>'name',updated_at=clock_timestamp() where id=org;
 elsif kind='invite' then
  if not raw_platform.manages(org) then raise exception 'Solo administradores.' using errcode='42501';end if;desired_role:=args->>'role';
  if desired_role not in ('admin','coach','user') or args->>'email' !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Revisa la invitación.';end if;
  if (select count(*) from public.organization_invitations where organization_id=org and accepted_at is null and revoked_at is null and expires_at>now())>=100 then raise exception 'Ya hay 100 invitaciones pendientes.';end if;
  token:=encode(extensions.gen_random_bytes(32),'hex');insert into public.organization_invitations(organization_id,email,role,token_hash,invited_by) values(org,lower(args->>'email'),desired_role,encode(extensions.digest(token,'sha256'),'hex'),uid);result:=jsonb_build_object('token',token);
 elsif kind='revoke_invite' then
  if not raw_platform.manages(org) then raise exception 'Solo administradores.' using errcode='42501';end if;update public.organization_invitations set revoked_at=now() where id=(args->>'id')::uuid and organization_id=org and accepted_at is null;
 elsif kind='member' then
  if not raw_platform.manages(org) then raise exception 'Solo administradores.' using errcode='42501';end if;
  subject:=(args->>'user_id')::uuid;desired_role:=args->>'role';desired_status:=args->>'status';
  if subject=uid then raise exception 'Tu propio acceso se conserva; otro administrador puede revisarlo.';end if;
  select * into c from public.organizations where id=org for update;select * into member from public.organization_members where organization_id=org and user_id=subject;
  if not found then raise exception 'Usuario no encontrado.';end if;
  if member.role='admin' and member.status='active' and (desired_role<>'admin' or desired_status<>'active') and not exists(select 1 from public.organization_members where organization_id=org and user_id<>subject and role='admin' and status='active') then raise exception 'Debe quedar un administrador activo.';end if;
  if desired_status='active' and (select count(*) from public.organization_members where organization_id=org and user_id<>subject and status='active' and (case when desired_role='user' then role='user' else role<>'user' end))>=(case when desired_role='user' then c.max_users else c.max_staff end) then raise exception 'Se ha alcanzado el límite de plazas.';end if;
  if nullif(args->>'coach_id','') is not null and not exists(select 1 from public.organization_members where organization_id=org and user_id=(args->>'coach_id')::uuid and role in ('coach','admin') and status='active') then raise exception 'El entrenador debe pertenecer al equipo activo de esta empresa.';end if;
  update public.organization_members set role=desired_role,status=desired_status,coach_id=nullif(args->>'coach_id','')::uuid where organization_id=org and user_id=subject;
 elsif kind='subscription' then
  if not super then raise exception 'Solo superadmin.' using errcode='42501';end if;
  insert into public.organization_subscriptions(organization_id,plan,status,monthly_cents,currency,renewal_date,billing_email,tax_id,legal_name) values(org,args->>'plan',args->>'status',(args->>'monthly_cents')::integer,'EUR',nullif(args->>'renewal_date','')::date,coalesce(args->>'billing_email',''),coalesce(args->>'tax_id',''),coalesce(args->>'legal_name',''))
  on conflict(organization_id) do update set plan=excluded.plan,status=excluded.status,monthly_cents=excluded.monthly_cents,renewal_date=excluded.renewal_date,billing_email=excluded.billing_email,tax_id=excluded.tax_id,legal_name=excluded.legal_name,updated_at=now();
 elsif kind='invoice' then
  if not super then raise exception 'Solo superadmin.' using errcode='42501';end if;insert into public.organization_invoices(organization_id,number,description,amount_cents,due_date,status,period_start,period_end) values(org,args->>'number',args->>'description',(args->>'amount_cents')::integer,(args->>'due_date')::date,args->>'status',(args->>'period_start')::date,(args->>'period_end')::date) returning id into new_id;result:=jsonb_build_object('id',new_id);
 elsif kind='invoice_status' then
  if not super then raise exception 'Solo superadmin.' using errcode='42501';end if;update public.organization_invoices set status=args->>'status',updated_at=now() where id=(args->>'id')::uuid and organization_id=org;
 elsif kind='note' then
  subject:=(args->>'user_id')::uuid;if raw_platform.member_role(org) is null or raw_platform.member_role(org) not in ('admin','coach') or not coalesce(raw_platform.can_follow(org,subject),false) then raise exception 'Seguimiento no autorizado.' using errcode='42501';end if;insert into public.organization_client_notes(organization_id,user_id,author_id,content) values(org,subject,uid,args->>'content');
 elsif kind='template' then
  if not super and (raw_platform.member_role(org) is null or raw_platform.member_role(org) not in ('admin','coach')) then raise exception 'Solo profesionales.' using errcode='42501';end if;
  if (select count(*) from public.organization_templates where organization_id=org)>=100 then raise exception 'Máximo 100 plantillas por empresa.';end if;
  insert into public.organization_templates(organization_id,title,kind,payload,created_by) values(org,args->>'title',args->>'kind',args->'payload',uid) returning id into new_id;result:=jsonb_build_object('id',new_id);
 elsif kind='delete_template' then
  if not raw_platform.manages(org) then raise exception 'Solo administradores.' using errcode='42501';end if;delete from public.organization_templates where id=(args->>'id')::uuid and organization_id=org;
 else raise exception 'Acción no disponible.' using errcode='22023';end if;
 perform raw_platform.audit(org,kind,coalesce(args->>'user_id',args->>'id',org::text),case when kind in ('create_company','update_company','member') then args-'brand'-'modules' else '{}' end);
 return result;end$$;
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
 'mrrCents',(select coalesce(sum(s.monthly_cents),0) from public.organization_subscriptions s join public.organizations o on o.id=s.organization_id where s.status='active' and o.status='active' and (org is null and super or s.organization_id=org and actor_role='admin')),
 'paidCents',(select coalesce(sum(amount_cents),0) from public.organization_invoices where status='paid' and (org is null and super or organization_id=org and actor_role='admin')),
 'overdueCents',(select coalesce(sum(amount_cents),0) from public.organization_invoices where status='open' and due_date<(now() at time zone 'Europe/Madrid')::date and (org is null and super or organization_id=org and actor_role='admin')),
 'aiRequests30',(select count(*) from public.coach_reviews where created_at>now()-interval '30 days' and (org is null and super or organization_id=org and actor_role='admin'))),
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
 where raw_platform.can_follow(org,m.user_id)),'[]'));
end$$;
create or replace function raw_platform.public_brand(requested text) returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('name',name,'slug',slug,'brand',brand,'status',status,'kind',kind,'modules',modules) from public.organizations where slug=requested and status='active'$$;
commit;
