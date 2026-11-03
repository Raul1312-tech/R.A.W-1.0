-- The dashboard-created event trigger runs as postgres; API clients never need it.
-- Conditional so a fresh project without the optional trigger can use this migration too.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
