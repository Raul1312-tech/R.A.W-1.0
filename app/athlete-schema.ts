import {z} from 'zod';
export const sportOptions={boxing:'Boxeo',kickboxing:'Kickboxing / Muay Thai',mma:'MMA / lucha',strength:'Fuerza / musculación',running:'Carrera / resistencia',team:'Deporte de equipo',other:'Otro deporte'};
export const levelOptions={beginner:'Estoy empezando',recreational:'Practico con regularidad',experienced:'Tengo varios años de experiencia',competitive:'Compito'};
export const goalOptions={performance:'Rendir y recuperar mejor',gain:'Ganar masa y fuerza',maintain:'Mantener mi peso y mis hábitos'};
export const scheduleOptions={regular:'Horario diurno habitual',early:'Empiezo el día muy temprano',late:'Empiezo y termino más tarde',variable:'Mis horarios cambian'};
const calendarDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>!Number.isNaN(Date.parse(value))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value,'Revisa la fecha.');
export const competitionWeightSchema=z.discriminatedUnion('mode',[
  z.object({mode:z.literal('none')}),
  z.object({mode:z.literal('target'),weight:z.number().finite().min(30).max(250),date:calendarDate.optional(),event:z.string().trim().max(120).optional()}),
]);
export const athleteSchema=z.object({
  sport:z.enum(['boxing','kickboxing','mma','strength','running','team','other']),
  otherSport:z.string().trim().max(80).optional(),
  level:z.enum(['beginner','recreational','experienced','competitive']),
  goal:z.enum(['performance','gain','maintain']),
  schedule:z.enum(['regular','early','late','variable']),
  competitionWeight:competitionWeightSchema,
}).refine(value=>value.sport!=='other'||!!value.otherSport,'Indica qué deporte practicas.');
export type Athlete=z.infer<typeof athleteSchema>;
