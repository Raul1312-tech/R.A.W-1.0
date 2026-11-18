begin;
create function raw_platform.module_payload(payload jsonb,feature text) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_object_agg(p->>'id',data order by p->>'id'),'{}') from jsonb_array_elements(coalesce(payload->'profiles','[]'))p
 cross join lateral(select case when feature='nutrition' then jsonb_build_object('plans',coalesce(p->'plans','[]'),'items',coalesce((select jsonb_object_agg(key,value->'items' order by key) from jsonb_each(coalesce(p->'days','{}')) where jsonb_array_length(coalesce(value->'items','[]'))>0),'{}'))
 else coalesce(p->'workouts','null') end as data)d
 where case when feature='nutrition' then jsonb_array_length(coalesce(p->'plans','[]'))>0 or exists(select 1 from jsonb_each(coalesce(p->'days','{}')) where jsonb_array_length(coalesce(value->'items','[]'))>0) else p->'workouts' is not null and p->'workouts'<>'null' end
$$;
revoke all on function raw_platform.module_payload(jsonb,text) from public,anon,authenticated;
create or replace function raw_platform.check_modules(org uuid,before jsonb,after jsonb) returns void language plpgsql security definer set search_path='' as $$begin
 if before is null then return;end if;
 if not raw_platform.module_enabled(org,'nutrition') and raw_platform.module_payload(before,'nutrition') is distinct from raw_platform.module_payload(after,'nutrition') then raise exception 'El módulo Alimentación no está activo.' using errcode='42501';end if;
 if not raw_platform.module_enabled(org,'training') and raw_platform.module_payload(before,'training') is distinct from raw_platform.module_payload(after,'training') then raise exception 'El módulo Entrenamiento no está activo.' using errcode='42501';end if;
end$$;
commit;
