begin;
create schema if not exists raw_platform;
revoke all on schema raw_platform from public,anon;
grant usage on schema raw_platform to authenticated;
create table public.platform_admins(user_id uuid primary key references auth.users(id),created_at timestamptz not null default now());
create table public.organizations(
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 100),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 60),
 kind text not null check(kind in ('boxing','gym','academy','mixed')),status text not null default 'active' check(status in ('active','suspended')),
 brand jsonb not null,modules jsonb not null,max_users integer not null default 100 check(max_users between 1 and 100000),
 max_staff integer not null default 10 check(max_staff between 1 and 1000),self_signup boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(octet_length(brand::text)<=200000 and brand->>'primary' ~ '^#[0-9a-fA-F]{6}$' and brand->>'accent' ~ '^#[0-9a-fA-F]{6}$'),
 check(jsonb_typeof(modules)='object' and modules ?& array['nutrition','training','boxing','competition','ai','photos','learning','progress'] and not jsonb_path_exists(modules,'$.* ? (@.type() != "boolean")')),
 check(not (modules->>'boxing')::boolean or (modules->>'training')::boolean),
 check(not (modules->>'competition')::boolean or ((modules->>'training')::boolean and (modules->>'nutrition')::boolean))
);
create table public.organization_members(
 organization_id uuid not null references public.organizations(id),user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('admin','coach','user')),status text not null default 'active' check(status in ('active','suspended')),
 display_name text not null default '' check(length(display_name)<=100),coach_id uuid references auth.users(id) on delete set null,
 share_followup boolean not null default false,last_seen timestamptz,created_at timestamptz not null default now(),primary key(organization_id,user_id)
);
create index organization_members_user on public.organization_members(user_id,organization_id);
create index organization_members_coach on public.organization_members(organization_id,coach_id);
create table public.organization_journals(
 organization_id uuid not null references public.organizations(id),owner uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=2200000),
 revision integer not null default 1 check(revision>0),updated_at timestamptz not null default now(),primary key(organization_id,owner));
create index organization_journals_owner on public.organization_journals(owner);
create table public.organization_invitations(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 email text not null check(length(email)<=254),role text not null check(role in ('admin','coach','user')),token_hash text not null unique check(length(token_hash)=64),
 invited_by uuid not null references auth.users(id),expires_at timestamptz not null default now()+interval '7 days',accepted_at timestamptz,revoked_at timestamptz,created_at timestamptz not null default now());
create index organization_invitations_org on public.organization_invitations(organization_id,created_at desc);
create table public.organization_subscriptions(
 organization_id uuid primary key references public.organizations(id),plan text not null default 'Personalizado' check(length(plan) between 1 and 80),
 status text not null default 'trial' check(status in ('trial','active','past_due','cancelled')),
 monthly_cents integer not null default 0 check(monthly_cents between 0 and 10000000),currency text not null default 'EUR' check(currency='EUR'),
 renewal_date date,billing_email text not null default '' check(length(billing_email)<=254),tax_id text not null default '' check(length(tax_id)<=40),
 legal_name text not null default '' check(length(legal_name)<=160),updated_at timestamptz not null default now());
create table public.organization_invoices(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 number text not null check(length(number) between 1 and 60),description text not null check(length(description) between 1 and 200),
 amount_cents integer not null check(amount_cents between 0 and 100000000),due_date date not null,status text not null check(status in ('draft','open','paid','void')),
 period_start date not null,period_end date not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,number),check(period_end>=period_start));
create index organization_invoices_due on public.organization_invoices(organization_id,status,due_date);
create table public.organization_activity(
 id uuid primary key default gen_random_uuid(),organization_id uuid references public.organizations(id),actor_id uuid references auth.users(id),
 actor_name text not null default '',action text not null,target text,details jsonb not null default '{}',created_at timestamptz not null default now(),check(octet_length(details::text)<8000));
create index organization_activity_org on public.organization_activity(organization_id,created_at desc);
create table public.organization_client_notes(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),user_id uuid not null references auth.users(id),
 author_id uuid not null references auth.users(id),content text not null check(length(content) between 1 and 4000),created_at timestamptz not null default now());
create index organization_client_notes_org on public.organization_client_notes(organization_id,user_id,created_at desc);
create table public.organization_templates(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 title text not null check(length(title) between 1 and 100),kind text not null check(kind in ('nutrition','training')),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<64000),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now());
create index organization_templates_org on public.organization_templates(organization_id);
insert into public.organizations(name,slug,kind,self_signup,max_users,max_staff,brand,modules)
values('RISE Boxing','rise','boxing',true,100000,1000,'{"logo":"","primary":"#006747","accent":"#d3a44a","tagline":"Disciplina. Oficio. Evolución."}',
'{"nutrition":true,"training":true,"boxing":true,"competition":true,"ai":true,"photos":true,"learning":true,"progress":true}');
insert into public.platform_admins(user_id) select id from auth.users where id='668804f0-9d88-4bef-871f-96288b202fa0' and lower(email)='raulfunnels@gmail.com' and email_confirmed_at is not null;
insert into public.organization_members(organization_id,user_id,role,display_name)
select o.id,u.id,case when a.user_id is not null then 'admin' else 'user' end,left(coalesce(u.raw_user_meta_data->>'full_name',split_part(u.email,'@',1),'Usuario'),100)
from auth.users u cross join public.organizations o left join public.platform_admins a on a.user_id=u.id
where o.slug='rise' and u.email_confirmed_at is not null and coalesce(u.is_anonymous,false)=false;
create function raw_platform.rise_id() returns uuid language sql stable security definer set search_path='' as $$select id from public.organizations where slug='rise'$$;
create function raw_platform.is_super() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce(auth.jwt()->>'is_anonymous','false')='false' and exists(select 1 from public.platform_admins where user_id=auth.uid())$$;
create function raw_platform.member_role(org uuid) returns text language sql stable security definer set search_path='' as $$
 select m.role from public.organization_members m join public.organizations o on o.id=m.organization_id where m.organization_id=org and m.user_id=auth.uid()
 and m.status='active' and o.status='active' and coalesce(auth.jwt()->>'is_anonymous','false')='false'$$;
create function raw_platform.manages(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select raw_platform.is_super() or coalesce(raw_platform.member_role(org)='admin',false)$$;
create function raw_platform.module_enabled(org uuid,key text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(o.status='active' and (o.modules->>key)::boolean and raw_platform.member_role(org) is not null,false) from public.organizations o where o.id=org$$;
create function raw_platform.can_follow(org uuid,subject uuid) returns boolean language sql stable security definer set search_path='' as $$
 select raw_platform.member_role(org) is not null and exists(select 1 from public.organization_members m where m.organization_id=org and m.user_id=subject and m.status='active'
 and (subject=auth.uid() or m.share_followup and (raw_platform.member_role(org)='admin' or raw_platform.member_role(org)='coach' and m.coach_id=auth.uid())))$$;
create function raw_platform.audit(org uuid,event text,subject text,extra jsonb default '{}') returns void language sql security definer set search_path='' as $$
 insert into public.organization_activity(organization_id,actor_id,actor_name,action,target,details)
 select org,auth.uid(),coalesce((select email from auth.users where id=auth.uid()),'Sistema'),event,subject,extra$$;
do $$declare name text;begin
 foreach name in array array['platform_admins','organizations','organization_members','organization_journals','organization_invitations','organization_subscriptions','organization_invoices','organization_activity','organization_client_notes','organization_templates'] loop
 execute format('alter table public.%I enable row level security',name);execute format('alter table public.%I force row level security',name);
 execute format('revoke all on public.%I from public,anon,authenticated',name);end loop;
end$$;
grant select on public.organizations,public.organization_members to authenticated;
create policy organization_read on public.organizations for select to authenticated using ((select raw_platform.is_super()) or raw_platform.member_role(id) is not null);
create policy membership_read on public.organization_members for select to authenticated using (user_id=(select auth.uid()) or raw_platform.manages(organization_id) or raw_platform.member_role(organization_id)='coach' and coach_id=(select auth.uid()));
create function raw_platform.context(requested text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();org public.organizations;m public.organization_members;super boolean;begin
 if uid is null or coalesce(auth.jwt()->>'is_anonymous','false')<>'false' or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'Inicia sesión con una cuenta confirmada.' using errcode='42501';end if;
 super:=raw_platform.is_super();select * into org from public.organizations where slug=coalesce(requested,'rise');
 if not found then raise exception 'Empresa no encontrada.' using errcode='P0002';end if;
 select * into m from public.organization_members where organization_id=org.id and user_id=uid;
 if m.user_id is null and org.slug='rise' and org.self_signup and org.status='active' then
  perform 1 from public.organizations where id=org.id for update;
  if (select count(*) from public.organization_members where organization_id=org.id and role='user' and status='active')>=org.max_users then raise exception 'Se ha alcanzado el límite de usuarios.';end if;
  insert into public.organization_members(organization_id,user_id,role,display_name) select org.id,uid,'user',left(coalesce(raw_user_meta_data->>'full_name',split_part(email,'@',1),'Usuario'),100) from auth.users where id=uid on conflict do nothing;
  select * into m from public.organization_members where organization_id=org.id and user_id=uid;perform raw_platform.audit(org.id,'member.joined',uid::text);
 end if;
 if not super and (m.user_id is null or m.status<>'active' or org.status<>'active') then raise exception 'No tienes acceso activo a esta empresa.' using errcode='42501';end if;
 if m.status='active' and (m.last_seen is null or m.last_seen<now()-interval '30 minutes') then
  update public.organization_members set last_seen=now() where organization_id=org.id and user_id=uid;perform raw_platform.audit(org.id,'session.active',uid::text);end if;
 return jsonb_build_object('superAdmin',super,'organization',to_jsonb(org),'role',case when m.status='active' then m.role else null end,'shareFollowup',coalesce(m.share_followup,false),
 'memberships',coalesce((select jsonb_agg(jsonb_build_object('organization',to_jsonb(o),'role',mm.role,'status',mm.status) order by o.name) from public.organization_members mm join public.organizations o on o.id=mm.organization_id where mm.user_id=uid),'[]'::jsonb));
end$$;
create function raw_platform.journal(org uuid,subject uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=coalesce(subject,auth.uid());result jsonb;begin
 if not coalesce(raw_platform.can_follow(org,uid),false) then raise exception 'Seguimiento no autorizado.' using errcode='42501';end if;
 if org=raw_platform.rise_id() then select jsonb_build_object('payload',payload,'revision',revision,'updated_at',updated_at) into result from public.journals where owner=uid;
 else select jsonb_build_object('payload',payload,'revision',revision,'updated_at',updated_at) into result from public.organization_journals where organization_id=org and owner=uid;end if;
 if uid<>auth.uid() then perform raw_platform.audit(org,'client.viewed',uid::text);end if;
 return coalesce(result,'{"payload":null,"revision":0,"updated_at":null}'::jsonb);
end$$;
create function raw_platform.check_modules(org uuid,before jsonb,after jsonb) returns void language plpgsql security definer set search_path='' as $$begin
 if before is null then return;end if;
 if not raw_platform.module_enabled(org,'nutrition') and (jsonb_path_query_array(before,'$.profiles[*].plans') is distinct from jsonb_path_query_array(after,'$.profiles[*].plans')
 or jsonb_path_query_array(before,'$.profiles[*].days.*.items') is distinct from jsonb_path_query_array(after,'$.profiles[*].days.*.items'))
 then raise exception 'El módulo Alimentación no está activo.' using errcode='42501';end if;
 if not raw_platform.module_enabled(org,'training') and jsonb_path_query_array(before,'$.profiles[*].workouts') is distinct from jsonb_path_query_array(after,'$.profiles[*].workouts')
 then raise exception 'El módulo Entrenamiento no está activo.' using errcode='42501';end if;
end$$;
create function raw_platform.save_journal(org uuid,new_payload jsonb,expected integer,subject uuid default null) returns integer language plpgsql security definer set search_path='' as $$
declare uid uuid:=coalesce(subject,auth.uid());next_revision integer;previous jsonb;begin
 if not coalesce(raw_platform.can_follow(org,uid),false) then raise exception 'Guardado no autorizado.' using errcode='42501';end if;
 if expected is null or expected<0 or expected>2147483646 or jsonb_typeof(new_payload)<>'object' or octet_length(new_payload::text)>2200000 then raise exception 'Registro no válido.';end if;
 if org=raw_platform.rise_id() then select payload into previous from public.journals where owner=uid for update;
 else select payload into previous from public.organization_journals where organization_id=org and owner=uid for update;end if;
 perform raw_platform.check_modules(org,previous,new_payload);
 if org=raw_platform.rise_id() then
  if expected=0 then insert into public.journals(owner,payload,revision) values(uid,new_payload,1) on conflict(owner) do nothing returning revision into next_revision;
  else update public.journals set payload=new_payload,revision=revision+1,updated_at=now() where owner=uid and revision=expected returning revision into next_revision;end if;
 else
  if expected=0 then insert into public.organization_journals(organization_id,owner,payload,revision) values(org,uid,new_payload,1) on conflict do nothing returning revision into next_revision;
  else update public.organization_journals set payload=new_payload,revision=revision+1,updated_at=now() where organization_id=org and owner=uid and revision=expected returning revision into next_revision;end if;
 end if;
 if next_revision is not null then perform raw_platform.audit(org,case when uid=auth.uid() then 'journal.saved' else 'client.plan_updated' end,uid::text,jsonb_build_object('revision',next_revision));end if;
 return next_revision;
end$$;
create policy organization_boundary on public.journals as restrictive for all to authenticated using (raw_platform.member_role(raw_platform.rise_id()) is not null) with check (raw_platform.member_role(raw_platform.rise_id()) is not null);
create function raw_platform.legacy_guard() returns trigger language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is not null then
  if raw_platform.member_role(raw_platform.rise_id()) is null then raise exception 'Empresa sin acceso activo.' using errcode='42501';end if;
  if TG_OP='UPDATE' then perform raw_platform.check_modules(raw_platform.rise_id(),old.payload,new.payload);end if;end if;return new;
end$$;
create trigger organization_legacy_guard before insert or update on public.journals for each row execute function raw_platform.legacy_guard();
create function raw_platform.snapshot(org uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare super boolean:=raw_platform.is_super();role text:=raw_platform.member_role(org);begin
 if not super and (org is null or role is null or role not in ('admin','coach')) then raise exception 'Panel no autorizado.' using errcode='42501';end if;
 return jsonb_build_object(
 'organizations',coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc) from public.organizations o where org is null and super or o.id=org),'[]'),
 'members',coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('email',u.email) order by m.created_at desc) from public.organization_members m join auth.users u on u.id=m.user_id where (org is null and super or m.organization_id=org) and (super or role='admin' or m.user_id=auth.uid() or m.coach_id=auth.uid())),'[]'),
 'subscriptions',coalesce((select jsonb_agg(to_jsonb(s)) from public.organization_subscriptions s where org is null and super or s.organization_id=org and (super or role='admin')),'[]'),
 'invoices',coalesce((select jsonb_agg(to_jsonb(i) order by created_at desc) from (select * from public.organization_invoices where org is null and super or organization_id=org and (super or role='admin') order by created_at desc limit 300) i),'[]'),
 'activity',coalesce((select jsonb_agg(to_jsonb(a) order by created_at desc) from (select * from public.organization_activity where org is null and super or organization_id=org and (super or role='admin' or actor_id=auth.uid()) order by created_at desc limit 200)a),'[]'),
 'invitations',coalesce((select jsonb_agg(to_jsonb(i)-'token_hash' order by created_at desc) from (select * from public.organization_invitations where org is null and super or organization_id=org and (super or role='admin') order by created_at desc limit 100)i),'[]'),
 'templates',coalesce((select jsonb_agg(to_jsonb(t) order by created_at desc) from public.organization_templates t where organization_id=org),'[]'),
 'clientSummaries',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'payload',case when m.organization_id=raw_platform.rise_id() then j.payload else oj.payload end))
 from public.organization_members m left join public.journals j on j.owner=m.user_id and m.organization_id=raw_platform.rise_id() left join public.organization_journals oj on oj.organization_id=m.organization_id and oj.owner=m.user_id
 where org is not null and m.organization_id=org and raw_platform.can_follow(org,m.user_id)),'[]'));
end$$;
create function raw_platform.action(kind text,args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare org uuid;uid uuid:=auth.uid();super boolean:=raw_platform.is_super();c public.organizations;subject uuid;desired_role text;desired_status text;token text;invite public.organization_invitations;member public.organization_members;new_id uuid;result jsonb:='{}';begin
 if uid is null or coalesce(auth.jwt()->>'is_anonymous','false')<>'false' then raise exception 'Inicia sesión.' using errcode='42501';end if;
 if args ? 'organization_id' then org:=(args->>'organization_id')::uuid;end if;
 if kind='accept_invite' then
  select * into invite from public.organization_invitations where token_hash=encode(extensions.digest(args->>'token','sha256'),'hex') for update;
  if not found or invite.accepted_at is not null or invite.revoked_at is not null or invite.expires_at<=now() or not exists(select 1 from auth.users where id=uid and lower(email)=lower(invite.email) and email_confirmed_at is not null)
  or not exists(select 1 from public.organizations where id=invite.organization_id and status='active')
  or not (exists(select 1 from public.platform_admins where user_id=invite.invited_by) or exists(select 1 from public.organization_members where organization_id=invite.organization_id and user_id=invite.invited_by and role='admin' and status='active'))
  then raise exception 'Invitación no válida para esta cuenta, caducada o ya utilizada.' using errcode='42501';end if;
  org:=invite.organization_id;desired_role:=invite.role;select * into c from public.organizations where id=org for update;
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
  if c.slug='rise' and args->>'slug'<>'rise' then raise exception 'Se conserva el identificador de Rise.';end if;
  if (args->>'max_users')::integer<(select count(*) from public.organization_members where organization_id=org and role='user' and status='active') or (args->>'max_staff')::integer<(select count(*) from public.organization_members where organization_id=org and role<>'user' and status='active') then raise exception 'Los límites son inferiores a las plazas activas.';end if;
  update public.organizations set name=args->>'name',slug=args->>'slug',kind=args->>'kind',status=args->>'status',brand=args->'brand',modules=args->'modules',max_users=(args->>'max_users')::integer,max_staff=(args->>'max_staff')::integer,self_signup=case when c.slug='rise' then (args->>'self_signup')::boolean else false end,updated_at=now() where id=org;
 elsif kind='brand' then
  if not raw_platform.manages(org) then raise exception 'Solo administradores.' using errcode='42501';end if;update public.organizations set brand=args->'brand',name=args->>'name',updated_at=now() where id=org;
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
  if raw_platform.member_role(org) is null or raw_platform.member_role(org) not in ('admin','coach') then raise exception 'Solo profesionales.' using errcode='42501';end if;
  if (select count(*) from public.organization_templates where organization_id=org)>=100 then raise exception 'Máximo 100 plantillas por empresa.';end if;
  insert into public.organization_templates(organization_id,title,kind,payload,created_by) values(org,args->>'title',args->>'kind',args->'payload',uid) returning id into new_id;result:=jsonb_build_object('id',new_id);
 elsif kind='delete_template' then
  if not raw_platform.manages(org) then raise exception 'Solo administradores.' using errcode='42501';end if;delete from public.organization_templates where id=(args->>'id')::uuid and organization_id=org;
 else raise exception 'Acción no disponible.' using errcode='22023';end if;
 perform raw_platform.audit(org,kind,coalesce(args->>'user_id',args->>'id',org::text),case when kind in ('create_company','update_company','member') then args-'brand'-'modules' else '{}' end);
 return result;end$$;
create function raw_platform.client_notes(org uuid,subject uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if raw_platform.member_role(org) is null or raw_platform.member_role(org) not in ('admin','coach') or not coalesce(raw_platform.can_follow(org,subject),false) then raise exception 'Sin acceso.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(n) order by created_at desc) from (select * from public.organization_client_notes where organization_id=org and user_id=subject order by created_at desc limit 100)n),'[]');end$$;
-- Public entry points run as the caller. Privileged implementations stay unexposed.
create function public.platform_context(requested text default null) returns jsonb language sql security invoker set search_path='' as $$select raw_platform.context(requested)$$;
create function public.platform_snapshot(org uuid default null) returns jsonb language sql security invoker set search_path='' as $$select raw_platform.snapshot(org)$$;
create function public.platform_action(kind text,args jsonb) returns jsonb language sql security invoker set search_path='' as $$select raw_platform.action(kind,args)$$;
create function public.platform_journal(org uuid,subject uuid default null) returns jsonb language sql security invoker set search_path='' as $$select raw_platform.journal(org,subject)$$;
create function public.platform_save_journal(org uuid,new_payload jsonb,expected integer,subject uuid default null) returns integer language sql security invoker set search_path='' as $$select raw_platform.save_journal(org,new_payload,expected,subject)$$;
create function public.platform_client_notes(org uuid,subject uuid) returns jsonb language sql security invoker set search_path='' as $$select raw_platform.client_notes(org,subject)$$;
create function raw_platform.public_brand(requested text) returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('name',name,'slug',slug,'brand',brand,'status',status) from public.organizations where slug=requested and status='active'$$;
create function public.organization_brand(requested text) returns jsonb language sql security invoker set search_path='' as $$select raw_platform.public_brand(requested)$$;
create function raw_platform.invite_info(token text) returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('name',o.name,'slug',o.slug,'role',i.role,'brand',o.brand) from public.organization_invitations i join public.organizations o on o.id=i.organization_id where i.token_hash=encode(extensions.digest(token,'sha256'),'hex') and i.revoked_at is null and i.accepted_at is null and i.expires_at>now() and o.status='active'$$;
create function public.platform_invite_info(token text) returns jsonb language sql security invoker set search_path='' as $$select raw_platform.invite_info(token)$$;
revoke all on all functions in schema raw_platform from public,anon,authenticated;
grant execute on function raw_platform.rise_id(),raw_platform.is_super(),raw_platform.member_role(uuid),raw_platform.manages(uuid),raw_platform.module_enabled(uuid,text),raw_platform.can_follow(uuid,uuid),raw_platform.context(text),raw_platform.journal(uuid,uuid),raw_platform.save_journal(uuid,jsonb,integer,uuid),raw_platform.snapshot(uuid),raw_platform.action(text,jsonb),raw_platform.client_notes(uuid,uuid) to authenticated;
grant usage on schema raw_platform to anon;
grant execute on function raw_platform.public_brand(text),raw_platform.invite_info(text) to anon,authenticated;
revoke all on function public.platform_context(text),public.platform_snapshot(uuid),public.platform_action(text,jsonb),public.platform_journal(uuid,uuid),public.platform_save_journal(uuid,jsonb,integer,uuid),public.platform_client_notes(uuid,uuid) from public,anon;
grant execute on function public.platform_context(text),public.platform_snapshot(uuid),public.platform_action(text,jsonb),public.platform_journal(uuid,uuid),public.platform_save_journal(uuid,jsonb,integer,uuid),public.platform_client_notes(uuid,uuid) to authenticated;
revoke all on function public.organization_brand(text),public.platform_invite_info(text) from public;
grant execute on function public.organization_brand(text),public.platform_invite_info(text) to anon,authenticated;
commit;
