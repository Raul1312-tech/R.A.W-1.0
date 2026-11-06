import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,generatePlan,emptyDay,targets,total,foodById} from '../app/model.ts';
import {competitionPhase,competitionStatus} from '../app/competition-phase.ts';
import {replanCompetition,competitionWeek} from '../app/competition-plan.ts';
import {recordMeal,foodDayView} from '../app/daily-food-model.ts';
import {freezeMonth,monthlyShopping} from '../app/preparation-model.ts';
import {generateTrainingPlan,defaultTrainingConfig} from '../app/training-model.ts';
import {sessionsForDate,editCalendarDay,dailySessions} from '../app/training-calendar-model.ts';
import {makeDraft,toggleSet} from '../app/workout-progress.ts';
import {stateSchema} from '../app/validation.ts';
import {strategyProposal} from '../app/coach-strategy.ts';
const today='2026-11-06';
const event={fight:'2026-11-15T20:00:00+01:00',weighIn:'2026-11-14T10:00:00+01:00',weight:67,taper:true,notes:'Revisar con mi equipo',timeZone:'Europe/Madrid'};
function setup(){const p={...newProfile('Synthetic'),confirmed:true,preparation:{competition:structuredClone(event)}};p.plans=[generatePlan(p,3)];p.workouts={plans:[generateTrainingPlan({...defaultTrainingConfig(),level:'advanced',days:[0,1,2,3,4,5,6]})],logs:[]};return p}

test('competition phases use the local event dates and actual weigh-in confirmation, including short recovery and past events',()=>{
 assert.equal(competitionPhase(event,'2026-10-15').phase,'camp');assert.equal(competitionPhase(event,today).phase,'taper');assert.equal(competitionPhase(event,'2026-11-07').phase,'fight-week');assert.equal(competitionPhase(event,'2026-11-14').phase,'weigh-in');assert.equal(competitionPhase(event,'2026-11-15').phase,'fight-day');assert.equal(competitionPhase(event,'2026-11-16').phase,'complete');
 const confirmed={...event,weighInResult:{weight:67,at:'2026-11-14T10:05:00+01:00'}};assert.equal(competitionPhase(confirmed,'2026-11-14').phase,'recovery');assert.equal(competitionPhase(confirmed,'2026-11-13').weighed,false);
 const sameDay={...event,weighIn:'2026-11-15T08:00:00+01:00'};assert.equal(competitionPhase(sameDay,'2026-11-15').shortRecovery,false);sameDay.fight='2026-11-15T13:00:00+01:00';assert.equal(competitionPhase(sameDay,'2026-11-15').shortRecovery,true);
 const midnight={...event,weighIn:'2026-11-14T23:30:00Z',fight:'2026-11-15T09:00:00Z'};assert.equal(competitionPhase(midnight,'2026-11-15').weighDay,'2026-11-15');assert.equal(competitionPhase(midnight,'2026-11-15').sameDay,true);
});
test('a planned lower category raises a red alert with kg pending, missing dates and stale measurements explicitly represented',()=>{
 const p=setup();assert.equal(competitionStatus(p,today).red,true);assert.equal(competitionStatus(p,today).gap,3);assert.equal(competitionStatus(p,today).staleWeight,true);
 p.days[today]={...emptyDay(p),weight:68};assert.equal(competitionStatus(p,today).gap,1);assert.equal(competitionStatus(p,today).staleWeight,false);
 p.preparation.competition.weighInResult={weight:67,at:'2026-11-14T10:00:00+01:00'};assert.equal(competitionStatus(p,'2026-11-14').red,false);assert.equal(competitionStatus(p,today).red,true);assert.equal(competitionStatus(p,'2026-11-16').active,false);
 const incomplete={...p,preparation:undefined,athlete:{sport:'boxing',level:'competitive',goal:'performance',schedule:'regular',competitionWeight:{mode:'target',weight:67,date:'2026-11-14'}}};assert.equal(competitionStatus(incomplete,today).needsDates,true);assert.equal(competitionStatus(incomplete,today).red,true);
});
test('dated competition menus replace ordinary and fixed pending plans, remove incompatible gain, preserve history and update shopping',()=>{
 let p=setup();p=freezeMonth(p,p.plans[0],'2026-11');const plan=p.plans[0];
 const past=recordMeal(emptyDay(p),plan,'2026-11-05',0,'planned'),partial=recordMeal({...emptyDay(p),water:750,minutes:35},plan,today,0,'planned');p.days={'2026-11-05':past,[today]:partial};
 const original=JSON.stringify(p),next=replanCompetition(p,today),day=next.days[today];
 assert.deepEqual(next.days['2026-11-05'],past);assert.deepEqual(day.items,partial.items);assert.deepEqual(day.foodPlan.records,partial.foodPlan.records);assert.equal(day.water,750);assert.equal(day.minutes,35);assert.ok(day.target.k<targets(p).k);assert.ok(day.target.c>=100);assert.equal(day.target.p,targets(p).p);
 assert.equal(next.days['2026-11-10'].competition.phase,'fight-week');assert.equal(next.days['2026-11-14'].competition.phase,'weigh-in');assert.equal(next.days['2026-11-15'].competition.phase,'fight-day');assert.equal(next.days['2026-11-16'],undefined);assert.equal(next.waterGoal,p.waterGoal);
 assert.notEqual(total(monthlyShopping(next,'2026-11')).k,total(monthlyShopping(p,'2026-11')).k);assert.equal(JSON.stringify(p),original);
 assert.strictEqual(replanCompetition(next,today),next);assert.equal(stateSchema.safeParse(JSON.parse(JSON.stringify({active:next.id,profiles:[next]}))).success,true);
 assert.equal(competitionWeek(next,'2026-11-10').dates[0],'2026-11-09');assert.deepEqual(competitionWeek(next,'2026-11-10').plan.week[1].meals,foodDayView(next.days['2026-11-10'],undefined,'2026-11-10').meals);
});
test('the competition week and monthly shopping use the actual registered substitute instead of the previous recipe',()=>{
 let p=setup();p=freezeMonth(p,p.plans[0],'2026-11');p.days[today]=recordMeal(emptyDay(p),p.plans[0],today,2,'alternative',[{food:foodById('rice-cooked'),grams:300}]);
 const next=replanCompetition(p,today),meal=competitionWeek(next,today).plan.week[4].meals[2];
 assert.equal(meal.items.length,1);assert.equal(meal.items[0].food.id,'rice-cooked');assert.equal(meal.items[0].grams,300);assert.equal(total(meal.items).k,390);assert.equal(monthlyShopping(next,'2026-11').find(it=>it.food.id==='rice-cooked').grams,300);
});
test('fight-week caps replace manual pending training, never compound and preserve a started session snapshot',()=>{
 let p=setup();const originalPlan=p.workouts.plans[0],date='2026-11-09',originalSession=sessionsForDate(originalPlan,date)[0];
 p.workouts.plans=[editCalendarDay(originalPlan,'2026-11',date,[originalSession],'date')];const next=replanCompetition(p,today),plan=next.workouts.plans[0],sessions=sessionsForDate(plan,date);
 assert.ok(sessions.every(s=>s.minutes<=30&&s.exercises.length<=4&&s.exercises.every(e=>e.sets<=2)));assert.equal(sessionsForDate(plan,'2026-11-14').length,0);
 const edited=editCalendarDay(plan,'2026-11',date,sessions,'date');assert.deepEqual(sessionsForDate(edited,date),sessions);
 let draft=makeDraft('started',originalSession);draft=toggleSet(draft,originalSession,originalSession.exercises[0].id,0);draft={...draft,planId:plan.id,date,session:originalSession};
 const pinned=dailySessions({...next.workouts,drafts:[draft]},date);assert.equal(pinned[0].pinned,true);assert.deepEqual(pinned[0].session,originalSession);
 assert.equal(strategyProposal(next,today).enabled,false);
});
test('confirming weigh-in switches to recovery without using transient weigh-in mass as the nutritional body mass',()=>{
 const p=setup(),before=replanCompetition(p,'2026-11-14');p.preparation.competition={...event,weighInResult:{weight:67,at:'2026-11-14T10:00:00+01:00'}};const next=replanCompetition(p,'2026-11-14');
 assert.equal(next.days['2026-11-14'].competition.phase,'recovery');assert.equal(next.days['2026-11-14'].target.p,targets(p).p);assert.equal(next.weight,p.weight);assert.equal(next.waterGoal,p.waterGoal);assert.notEqual(next.days['2026-11-14'].competition.key,before.days['2026-11-14'].competition.key);
});
test('changing or removing the event restores future pending ordinary days while keeping completed records',()=>{
 let p=replanCompetition(setup(),today);p.days[today]=recordMeal(p.days[today],undefined,today,0,'planned');const actual=structuredClone(p.days[today].items);
 const removed=replanCompetition({...p,preparation:{...p.preparation,competition:undefined}},today);assert.equal(removed.days['2026-11-10'].foodPlan,undefined);assert.equal(removed.days['2026-11-10'].competition,undefined);assert.deepEqual(removed.days[today].items,actual);assert.equal(removed.workouts.plans[0].config.competition,undefined);
 const changed=replanCompetition({...p,preparation:{...p.preparation,competition:{...event,fight:'2026-11-11T18:00:00+01:00',weighIn:'2026-11-11T08:00:00+01:00'}}},today);assert.equal(changed.days['2026-11-14'].competition,undefined);assert.deepEqual(changed.days[today].items,actual);
});
test('generation failures are explicit and never invent incompatible meals; a ten-week plan remains within the journal size limit',()=>{
 const p=setup(),blocked=replanCompetition({...p,excluded:['olive']},today);assert.ok(blocked.days[today].competition.error);assert.equal(blocked.days[today].foodPlan,undefined);assert.equal(p.days[today],undefined);
 p.preparation.competition={...event,weighIn:'2027-01-14T10:00:00+01:00',fight:'2027-01-15T20:00:00+01:00'};const next=replanCompetition(p,today);assert.ok(Object.keys(next.days).length>=70);assert.ok(Buffer.byteLength(JSON.stringify({state:{active:next.id,profiles:[next]},revision:0}))<2*1024*1024);
});
