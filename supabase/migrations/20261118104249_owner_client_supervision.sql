begin;
-- This read-only supervision endpoint is separate from the consented write path.
create function raw_platform.can_view_client(org uuid,subject uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(raw_platform.can_follow(org,subject),false) or (raw_platform.is_super() and exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id where m.organization_id=org and m.user_id=subject and m.status='active' and o.status='active'))$$;
revoke all on function raw_platform.can_view_client(uuid,uuid) from public,anon;
grant execute on function raw_platform.can_view_client(uuid,uuid) to authenticated;
create function raw_platform.client_detail(org uuid,subject uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare state jsonb;rev integer;stamp timestamptz;editable boolean;begin
 if not raw_platform.can_view_client(org,subject) or (not raw_platform.is_super() and coalesce(raw_platform.member_role(org),'') not in ('admin','coach')) then raise exception 'Seguimiento no autorizado.' using errcode='42501';end if;
 editable:=coalesce(raw_platform.member_role(org) in ('admin','coach') and raw_platform.can_follow(org,subject),false);
 if org=raw_platform.rise_id() then select j.payload,j.revision,j.updated_at into state,rev,stamp from public.journals j where j.owner=subject;
 else select j.payload,j.revision,j.updated_at into state,rev,stamp from public.organization_journals j where j.organization_id=org and j.owner=subject;end if;
 perform raw_platform.audit(org,case when editable then 'client.viewed' else 'client.supervision_viewed' end,subject::text);
 return jsonb_build_object('state',state,'revision',coalesce(rev,0),'updatedAt',stamp,'canEdit',editable,
 'notes',coalesce((select jsonb_agg(to_jsonb(n) order by created_at desc) from (select id,content,created_at from public.organization_client_notes where organization_id=org and user_id=subject order by created_at desc limit 100)n),'[]'),
 'activity',coalesce((select jsonb_agg(to_jsonb(a) order by created_at desc) from (select * from public.organization_activity where organization_id=org and (actor_id=subject or target=subject::text) order by created_at desc limit 120)a),'[]'),
 'reviews',coalesce((select jsonb_agg(to_jsonb(r) order by created_at desc) from (select request_day,profile,choice,created_at from public.coach_reviews where organization_id=org and owner=subject order by created_at desc limit 60)r),'[]'),
 'weekly',coalesce((select jsonb_agg(to_jsonb(w) order by reviewed_at desc) from (select week,profile,review,reviewed_at,dismissed from public.coach_weekly_reviews where organization_id=org and owner=subject order by reviewed_at desc limit 30)w),'[]'),
 'foodPhotos',coalesce((select jsonb_agg(to_jsonb(f) order by created_at desc) from (select request_day,choice,created_at from public.food_photo_reviews where organization_id=org and owner=subject order by created_at desc limit 30)f),'[]'));
end$$;
revoke all on function raw_platform.client_detail(uuid,uuid) from public,anon;
grant execute on function raw_platform.client_detail(uuid,uuid) to authenticated;
create function public.platform_client_detail(org uuid,subject uuid) returns jsonb language sql security invoker set search_path='' as $$select raw_platform.client_detail(org,subject)$$;
revoke all on function public.platform_client_detail(uuid,uuid) from public,anon;
grant execute on function public.platform_client_detail(uuid,uuid) to authenticated;
create index organization_activity_target_idx on public.organization_activity(organization_id,target,created_at desc);
commit;
