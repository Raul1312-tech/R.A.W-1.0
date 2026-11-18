begin;
create function raw_platform.directory() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')<>'false' or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'Inicia sesión con una cuenta confirmada.' using errcode='42501';end if;
 return jsonb_build_object('superAdmin',raw_platform.is_super(),'memberships',coalesce((select jsonb_agg(jsonb_build_object('organization',to_jsonb(o),'role',m.role,'status',m.status) order by o.name) from public.organization_members m join public.organizations o on o.id=m.organization_id where m.user_id=auth.uid()),'[]'));
end$$;
revoke all on function raw_platform.directory() from public,anon;
grant execute on function raw_platform.directory() to authenticated;
create function public.platform_memberships() returns jsonb language sql security invoker set search_path='' as $$select raw_platform.directory()$$;
revoke all on function public.platform_memberships() from public,anon;
grant execute on function public.platform_memberships() to authenticated;
commit;
