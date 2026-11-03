import fs from 'node:fs';
import {exerciseCatalog,exerciseRecordSchema} from '../app/exercise-catalog.ts';
const records=exerciseCatalog.filter(r=>r.image.src==='/training/combat-strength.png').map(r=>exerciseRecordSchema.parse(r));
if(records.length!==8)throw new Error('Expected eight combat exercise records');
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const sql='-- Shared non-personal exercise content. Existing RLS and grants unchanged.\nbegin;\ninsert into public.exercise_catalog (id,data,published) values\n'+records.map(r=>'('+quote(r.id)+','+quote(JSON.stringify(r))+'::jsonb,true)').join(',\n')+'\non conflict (id) do update set data=excluded.data,published=excluded.published,updated_at=now();\ncommit;\nselect count(*) as illustrated_exercises from public.exercise_catalog where published;\n';
fs.writeFileSync('supabase/migrations/20261103210454_combat_exercise_catalog.sql',sql);
