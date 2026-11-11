import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,emptyDay,generatePlan,foodById,total} from '../app/model.ts';
import {saveProfileSetup} from '../app/profile-setup-model.ts';
import {stateSchema} from '../app/validation.ts';
import {boxingPhysicalCatalog,mergeExerciseCatalog} from '../app/exercise-catalog.ts';
import {generateTrainingPlan,defaultTrainingConfig} from '../app/training-model.ts';
import {reorganizeSparringWeek} from '../app/sparring-week-model.ts';
import {saveClubRecord} from '../app/club-session-model.ts';
import {hydrationReference} from '../app/hydration-model.ts';
import {supplementRecommendations} from '../app/supplement-recommendations-model.ts';
import {clubForDate,dailySessions,planForDate,refreshBoxingCatalog,sessionsForDate} from '../app/training-calendar-model.ts';
import {withCoordinatedDay,alternatives,savePlannedSupplement} from '../app/preparation-engine.ts';
import {previewNutritionSituation} from '../app/nutrition-situations-model.ts';
import {recordMeal,foodDayView} from '../app/daily-food-model.ts';
import {toggleSupplement} from '../app/preparation-model.ts';

const date='2026-11-09';
function athlete(){
 const p={...newProfile('Prueba sintética'),confirmed:true,mealCount:5,athlete:{sport:'boxing',level:'experienced',goal:'performance',schedule:'regular',competitionWeight:{mode:'none'}}};
 p.plans=[generatePlan(p,1)];
 p.workouts={plans:[{...generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',catalogVersion:2,level:'intermediate',physicalDays:[0,3],runningDays:[1,5],technicalDays:[0,2],sparringDays:[3],duration:60}),month:'2026-11'}],logs:[]};
 return p;
}
const roundtrip=p=>stateSchema.parse(JSON.parse(JSON.stringify({active:p.id,profiles:[p]}))).profiles[0];

test('the 100 boxing guides have the agreed split and outdated remote data cannot replace their images',()=>{
 const expected={'Fuerza y potencia':40,Abdomen:20,'Pliometría':20,'Agilidad de pies':15,Cuello:5};
 assert.equal(boxingPhysicalCatalog.length,100);
 for(const [category,count] of Object.entries(expected))assert.equal(boxingPhysicalCatalog.filter(r=>r.category===category).length,count);
 const guide=boxingPhysicalCatalog.find(r=>r.id==='split-jump');
 const merged=mergeExerciseCatalog([{...guide,version:1,image:{src:'/old.png',tile:0,columns:1,rows:1}}]);
 assert.equal(merged.find(r=>r.id===guide.id).image.src,guide.image.src);
});

test('new recommendations respect kit, difficulty, time and unique exercises; all 100 are reachable',()=>{
 const reached=new Set();
 for(let variation=0;variation<160;variation++){
  const plan=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',catalogVersion:2,variation,level:'advanced',physicalDays:[0,3],runningDays:[],duration:120,medicineBall:true,boxingKit:['box','trapBar','kettlebell','landmine'],additionalKit:['bench','abWheel','fitball','hurdles','cones','ladder','partner']});
  for(const s of plan.sessions.filter(s=>s.kind==='lift')){
   assert.equal(new Set(s.exercises.map(e=>e.catalogId)).size,s.exercises.length);
   for(const e of s.exercises)reached.add(e.catalogId);
  }
 }
 assert.equal(reached.size,100,[...boxingPhysicalCatalog.filter(r=>!reached.has(r.id)).map(r=>r.id)].join(','));
 for(const phase of ['base','deload'])for(const duration of [20,30,45,60]){
  const plan=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',catalogVersion:2,level:'beginner',equipment:'bodyweight',physicalDays:[0,3],runningDays:[],duration,phase});
  for(const session of plan.sessions.filter(s=>s.kind==='lift')){
   assert.equal(session.minutes,duration);assert.ok(session.exercises.length>0);
   for(const ex of session.exercises){
    const guide=boxingPhysicalCatalog.find(r=>r.id===ex.catalogId);
    assert.equal(guide.minLevel,1);assert.ok(guide.equipment.every(k=>['bodyweight','space'].includes(k)));
    if(phase==='deload')assert.notEqual(guide.impact,'high');
   }
  }
 }
});

test('boxing sessions can be reviewed without double-counting and survive persistence with templates',()=>{
 const p=athlete(),record={name:'Mi boxeo',kind:'mixed',minutes:60,rounds:6,roundMinutes:3,rpe:7,notes:'Saco y manoplas'};
 p.days[date]={...emptyDay(p),minutes:30};
 p.preparation={clubTemplates:[{id:'habitual',...Object.fromEntries(Object.entries(record).filter(([key])=>!['rpe','notes'].includes(key)))}]};
 const a=saveClubRecord(p,date,record);assert.equal(a.days[date].minutes,90);
 const b=saveClubRecord(a,date,{...record,minutes:45});assert.equal(b.days[date].minutes,75);
 assert.equal(roundtrip(b).preparation.clubRecords[date].rpe,7);assert.equal(roundtrip(b).preparation.clubTemplates[0].name,'Mi boxeo');
 assert.equal(p.days[date].minutes,30);
 assert.throws(()=>saveClubRecord(p,date,{...record,rpe:0}));
 assert.throws(()=>saveClubRecord({...p,days:{[date]:{...p.days[date],minutes:590}}},date,record));
});

test('hydration is automatic, responds to load and heat and preserves a professional override',()=>{
 const p=athlete();
 const busy=hydrationReference(p,date),rest=hydrationReference(p,'2026-11-15');
 assert.ok(rest.base>=2500&&rest.base<=3000);assert.ok(busy.goal>rest.goal);
 p.preparation={hydration:{mode:'auto',heat:true}};
 assert.equal(hydrationReference(p,date).goal,busy.goal+250);
 p.preparation.hydration={mode:'manual',manualGoal:2250};
 assert.equal(hydrationReference(roundtrip(p),date).goal,2250);
});

test('moving sparring to Friday preserves all pending workouts, intake and the following week',()=>{
 let p=athlete();p=withCoordinatedDay(p,date,p.plans[0]);
 p.days[date]=recordMeal(p.days[date],p.plans[0],date,0,'planned');
 const before=JSON.stringify(p),originalItems=structuredClone(p.days[date].items);
 const moved=roundtrip(reorganizeSparringWeek(p,date,'2026-11-13',date,[0,1,2,3,4,5,6]));
 assert.equal(JSON.stringify(p),before);
 assert.equal(clubForDate(planForDate(moved.workouts,'2026-11-13'),'2026-11-13'),'sparring');
 assert.notEqual(clubForDate(planForDate(moved.workouts,'2026-11-12'),'2026-11-12'),'sparring');
 assert.equal(dailySessions(moved.workouts,'2026-11-13').length,0);
 assert.equal(Array.from({length:7},(_,i)=>'2026-11-'+String(9+i).padStart(2,'0')).reduce((n,d)=>n+dailySessions(moved.workouts,d).length,0),4);
 assert.equal(clubForDate(planForDate(moved.workouts,'2026-11-19'),'2026-11-19'),'sparring');
 assert.deepEqual(moved.days[date].items,originalItems);
 assert.ok(moved.days['2026-11-13'].target.k>=moved.days['2026-11-15'].target.k);
 const unknown=roundtrip(reorganizeSparringWeek(p,date,null,date,[0,1,2,3,4,5,6]));
 assert.equal(unknown.preparation.sparringWeeks[date],null);
 assert.notEqual(clubForDate(planForDate(unknown.workouts,'2026-11-12'),'2026-11-12'),'sparring');
 assert.throws(()=>reorganizeSparringWeek(p,date,'2026-11-13',date,[4]),/Faltan huecos/);
});

test('sparring changes protect recorded club sessions and cannot add sparring in fight week',()=>{
 const p=saveClubRecord(athlete(),'2026-11-12',{name:'Sparring',kind:'sparring',minutes:60,rounds:4,roundMinutes:3,rpe:7,notes:''});
 assert.throws(()=>reorganizeSparringWeek(p,date,'2026-11-13',date),/registrado/);
 const q=athlete();q.preparation={competition:{fight:'2026-11-16T19:00:00Z',weighIn:'2026-11-15T09:00:00Z',weight:70,taper:true,notes:''}};
 assert.throws(()=>reorganizeSparringWeek(q,date,'2026-11-13',date),/combate/);
});

test('supplement proposals include dose and timing, count energy once, and exclude a sports drink on rest',()=>{
 const p=athlete();const proposal=supplementRecommendations(p,date);
 const creatine=proposal.result.find(r=>r.product.kind==='creatine').product;
 const drink=proposal.result.find(r=>r.product.kind==='sportsDrink').product;
 assert.equal(creatine.amount,3);assert.equal(drink.amount,500);assert.equal(drink.unit,'ml');assert.equal(drink.timing,'during');
 let next=withCoordinatedDay(p,date,p.plans[0]);next=savePlannedSupplement(next,drink,date);
 const day=next.days[date],before=foodDayView(day,p.plans[0],date).projected.k;
 const logged=toggleSupplement(day,drink);
 assert.equal(total(logged.items).k,120);assert.equal(logged.water,day.water+500);assert.equal(toggleSupplement(logged,drink).water,day.water);
 assert.ok(Math.abs(foodDayView(logged,p.plans[0],date).projected.k-before)<.001);
 const rest=previewNutritionSituation(next,{id:'rest',name:'Descanso',mealCount:3,times:['09:00','15:00','21:00'],training:'rest',supplements:[{id:drink.id,amount:500,timing:'during'}]},'2026-11-15');
 assert.deepEqual(rest.nutrition.supplements,[]);
 next.days[date]=logged;assert.equal(roundtrip(next).preparation.supplements[0].unit,'ml');
 p.preparation={competition:{fight:'2026-11-16T19:00:00Z',weighIn:'2026-11-15T09:00:00Z',weight:70,taper:true,notes:''}};
 assert.equal(supplementRecommendations(p,date).result.length,0);
});

test('equivalents list usual and liked foods first and omit exclusions',()=>{
 const p=athlete();p.preparation={foodPreferences:{foods:{rice:'usual',sweetpotato:'like',pasta:'avoid'}}};
 const options=alternatives(p,foodById('bread'));
 assert.equal(options[0].id,'rice');assert.equal(options[1].id,'sweetpotato');
 assert.ok(!options.some(f=>f.id==='pasta'));
});

test('catalog refresh preserves past sessions and a running draft while switching future prescriptions',()=>{
 const p=athlete();delete p.workouts.plans[0].config.catalogVersion;
 const old=p.workouts.plans[0],oldPast=sessionsForDate(old,'2026-11-02');
 const future='2026-11-12',session=sessionsForDate(old,future)[0];
 const key=old.id+':'+session.day+':'+future;
 p.workouts.drafts=[{id:key,planId:old.id,date:future,session,checked:{},elapsedMs:5000,runningSince:null,rpe:null}];
 const fresh=refreshBoxingCatalog(p.workouts,date);
 assert.equal(fresh.config.catalogVersion,2);
 const running=dailySessions({...p.workouts,plans:[old,fresh]},future).find(s=>s.pinned);
 assert.deepEqual(running.session,session);
 assert.deepEqual(sessionsForDate(fresh,'2026-11-02'),oldPast);
 assert.ok(sessionsForDate(fresh,date)[0].exercises.some(e=>e.id.startsWith('boxing-')));
});


test('changing five to three meals updates coordinated snapshots and merges consumed slots without losing food',()=>{
 let p=withCoordinatedDay(athlete(),date,athlete().plans[0]);
 const base=p.days[date];
 let logged=recordMeal(base,p.plans[0],date,0,'planned');
 logged=recordMeal(logged,p.plans[0],date,1,'alternative',Array.from({length:20},()=>({food:foodById('bread'),grams:10})));
 p.days[date]=logged;
 const before=total(logged.items);
 const fields={...p,mealCount:3};
 const next=saveProfileSetup(p,fields,date),day=next.days[date];
 assert.equal(day.foodPlan.meals.length,3);assert.equal(day.nutrition.mealCount,3);
 assert.deepEqual(total(day.items),before);
 assert.deepEqual(day.items.map(({meal,...item})=>item),logged.items.map(({meal,...item})=>item));
 assert.equal(day.foodPlan.records.length,1);
 assert.equal(day.foodPlan.records[0].itemIds.length,logged.items.length);
 assert.equal(roundtrip(next).days[date].water,logged.water);
 assert.equal(p.days[date].foodPlan.meals.length,5);
});

// Regression: the weekly exception must not be vetoed by habitual rest days,
// and long strength sessions must get the slots that can accommodate them.
test('weekly sparring automatically uses alternative days and saves without changing the next week',()=>{
 const p=athlete();
 const moved=roundtrip(reorganizeSparringWeek(p,date,'2026-11-13','2026-11-12'));
 assert.equal(clubForDate(planForDate(moved.workouts,'2026-11-13'),'2026-11-13'),'sparring');
 assert.equal(['2026-11-12','2026-11-14','2026-11-15'].flatMap(d=>dailySessions(moved.workouts,d)).length,2);
 assert.deepEqual(dailySessions(moved.workouts,'2026-11-19').map(e=>e.session),dailySessions(roundtrip(p).workouts,'2026-11-19').map(e=>e.session));
 assert.deepEqual(moved.workouts.plans[0].config,p.workouts.plans[0].config);
});

test('the longest pending session gets a compatible slot instead of failing on the first short day',()=>{
 const p=athlete();
 p.workouts.plans[0].config.sessionLimits=[{day:3,minutes:45},{day:5,minutes:60},{day:6,minutes:45}];
 const moved=roundtrip(reorganizeSparringWeek(p,date,'2026-11-13','2026-11-12',[3,5,6]));
 assert.equal(dailySessions(moved.workouts,'2026-11-14')[0].session.kind,'lift');
 assert.equal(['2026-11-12','2026-11-15'].flatMap(d=>dailySessions(moved.workouts,d)).filter(e=>e.session.kind==='conditioning').length,1);
 const original=JSON.stringify(p);
 assert.throws(()=>reorganizeSparringWeek(p,date,'2026-11-13','2026-11-12',[3,6]),/60 minutos/);
 assert.equal(JSON.stringify(p),original);
});
