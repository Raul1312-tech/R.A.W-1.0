import {emptyDay,type Profile} from './model.ts';

import {preparationSchema} from './preparation-schema.ts';

type ClubRecord=NonNullable<NonNullable<Profile['preparation']>['clubRecords']>[string];
export function saveClubRecord(p:Profile,date:string,record:ClubRecord):Profile{
 record=preparationSchema.parse({clubRecords:{[date]:record}}).clubRecords![date];
 const previous=p.preparation?.clubRecords?.[date],day=p.days[date]??emptyDay(p);
 const records=Object.fromEntries(Object.entries({...p.preparation?.clubRecords,[date]:record}).sort(([a],[b])=>a.localeCompare(b)).slice(-365));
 if(day.minutes-(previous?.minutes??0)+record.minutes>600)throw Error('Revisa los minutos totales del día: máximo 600.');
 return {...p,days:{...p.days,[date]:{...day,minutes:Math.max(0,day.minutes-(previous?.minutes??0))+record.minutes}},
 preparation:{...p.preparation,clubRecords:records}};
}
