import {writeFileSync} from 'node:fs';
import {exerciseCatalog,exerciseRecordSchema} from '../app/exercise-catalog.ts';
const target=process.argv[2];
if(!target?.endsWith('_exercise_catalog.sql'))throw new Error('Pass the migration path created by supabase migration new.');
const records=exerciseRecordSchema.array().parse(exerciseCatalog);
const rows=records.map(r=>`('${r.id}', $catalog$${JSON.stringify(r)}$catalog$::jsonb)`).join(',\n');
writeFileSync(target,`-- Shared, non-personal teaching content. Images are versioned static assets, never generated per workout.
begin;
create table public.exercise_catalog (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text generated always as (data->>'name') stored,
  data jsonb not null check (jsonb_typeof(data)='object' and data->>'id'=id and data ? 'image' and data ? 'steps'),
  published boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.exercise_catalog enable row level security;
alter table public.exercise_catalog force row level security;
revoke all on public.exercise_catalog from public, anon, authenticated;
grant select on public.exercise_catalog to anon, authenticated;
create policy exercise_catalog_read_published on public.exercise_catalog for select to anon, authenticated using (published);
comment on table public.exercise_catalog is 'Public exercise instructions and reusable illustrations. Contains no user data. Client roles have SELECT only.';
insert into public.exercise_catalog (id,data) values
${rows}
on conflict (id) do update set data=excluded.data,updated_at=now();
commit;
select count(*) as illustrated_exercises from public.exercise_catalog where data->'image'->>'src' is not null;
`, 'utf8');
console.log(`${records.length} exercise records written to ${target}`);
