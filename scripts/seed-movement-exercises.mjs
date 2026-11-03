import fs from 'node:fs';
import {exerciseCatalog,exerciseRecordSchema} from '../app/exercise-catalog.ts';
const records=exerciseCatalog.filter(r=>r.image.src==='/training/core-footwork.png').map(r=>exerciseRecordSchema.parse(r));
if(records.length!==12)throw new Error('Expected twelve movement records');
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const sql='-- Reusable public instructional content only. RLS and grants are unchanged.\nbegin;\ninsert into public.exercise_catalog (id,data,published) values\n'+records.map(r=>'('+quote(r.id)+','+quote(JSON.stringify(r))+'::jsonb,true)').join(',\n')+'\non conflict (id) do update set data=excluded.data,published=excluded.published,updated_at=now();\ncommit;\nselect count(*) as illustrated_exercises, count(*) filter (where data->\'image\'->>\'src\'=\'/training/core-footwork.png\') as new_movements from public.exercise_catalog where published;\n';
fs.writeFileSync('supabase/migrations/20261103215841_monthly_movement_catalog.sql',sql);
