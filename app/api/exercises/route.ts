import {exerciseCatalog,exerciseRecordSchema,mergeExerciseCatalog} from '../../exercise-catalog';
import {configured,credentials} from '../../../lib/supabase/config';

/** Non-personal shared content only. No cookies, service-role key or writes. */
export async function GET(){
  let records=exerciseCatalog;let source='bundled';
  if(configured()){
    const {url,key}=credentials();
    try{
      const response=await fetch(`${url}/rest/v1/exercise_catalog?select=data&published=eq.true&order=id`,{headers:{apikey:key},next:{revalidate:300},signal:AbortSignal.timeout(5000)});
      if(response.ok){
        const rows:unknown=await response.json();
        if(Array.isArray(rows)){
          const valid=rows.flatMap(row=>{const result=exerciseRecordSchema.safeParse(row?.data);return result.success?[result.data]:[];});
          if(valid.length){records=mergeExerciseCatalog(valid);source='database';}
        }
      }
    }catch{/* The versioned snapshot keeps exercise instructions available offline. */}
  }
  return Response.json({records,source},{headers:{'Cache-Control':'public, max-age=60, s-maxage=300, stale-while-revalidate=600'}});
}
