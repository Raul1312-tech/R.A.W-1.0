import test from 'node:test';
import assert from 'node:assert/strict';
import {companyProducts,productModules} from '../lib/company-products.ts';
import {companyInput,moduleKeys,riseCompany} from '../lib/platform-model.ts';
import {normalizeTrainingTemplate,templateSummary} from '../lib/company-templates.ts';
import {defaultTrainingConfig,generateTrainingPlan,trainingPlanSchema} from '../app/training-model.ts';
import {sessionsForDate} from '../app/training-calendar-model.ts';
const reference='2026-11-18';
const make=()=>({...generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',level:'intermediate',days:[0,1,3,5],physicalDays:[0,3],runningDays:[1,5],technicalDays:[2],sparringDays:[4]}),month:'2026-11'});
test('every company product has a valid independent module preset',()=>{
 for(const kind of Object.keys(companyProducts)){
  const modules=productModules(kind);
  assert.deepEqual(Object.keys(modules).sort(),[...moduleKeys].sort());
  const {id,created_at,updated_at,...fields}=riseCompany;
  assert.equal(companyInput.safeParse({...fields,kind,modules}).success,true);
  modules.training=false;
  assert.equal(productModules(kind).training,true);
 }
 assert.equal(productModules('academy').boxing,false);
 assert.equal(productModules('academy').competition,false);
 assert.match(companyProducts.academy.summary,/pruebas físicas/);
});
test('company templates capture selected week edits and simultaneous running, without dated client context',()=>{
 const plan=make(),lift=plan.sessions[0],run=plan.sessions.find(s=>s.kind==='conditioning');
 const changed={...lift,day:2,title:'Fuerza propia del centro',exercises:lift.exercises.map((e,i)=>i===0?{...e,sets:5,dose:'6 repeticiones'}:e)};
 plan.overrides=[{date:reference,source:'manual',sessions:[changed,{...run,day:2,slot:'running'}]}];
 plan.clubOverrides={[reference]:'none','2026-11-20':'technique'};
 plan.config.catalogVersion=2;
 plan.config.competition={fight:'2026-11-20T20:00:00Z',weighIn:'2026-11-19T10:00:00Z',weight:70,taper:true,notes:'Synthetic competition'};
 const before=structuredClone(plan),normalized=normalizeTrainingTemplate(plan,reference);
 assert.equal(normalized.sessions[2].title,changed.title);
 assert.equal(normalized.sessions[2].exercises[0].sets,5);
 assert.equal(normalized.extraSessions.find(s=>s.day===2).kind,'conditioning');
 assert.ok(normalized.config.physicalDays.includes(2));
 assert.ok(normalized.config.runningDays.includes(2));
 assert.deepEqual(normalized.config.technicalDays,[4]);
 assert.deepEqual(normalized.config.sparringDays,[]);
 assert.equal(normalized.month,undefined);
 assert.equal(normalized.overrides,undefined);
 assert.equal(normalized.clubOverrides,undefined);
 assert.equal(normalized.config.competition,undefined);
 assert.equal(normalized.config.exerciseRotation,'fixed');
 const copied={...normalized,month:'2026-11'};
 assert.deepEqual(sessionsForDate(copied,'2026-11-25'),sessionsForDate(copied,reference));
 assert.notEqual(normalized.id,plan.id);
 assert.deepEqual(plan,before);
 assert.equal(trainingPlanSchema.safeParse(normalized).success,true);
 const t={kind:'training',payload:normalized};
 assert.equal(templateSummary(t).sessions,normalized.sessions.filter(s=>s.kind!=='rest').length+normalized.extraSessions.length);
});
test('week selection does not silently copy an edited day from a different week',()=>{
 const plan=make(),lift=plan.sessions[0];
 plan.overrides=[{date:'2026-11-09',source:'manual',sessions:[{...lift,title:'Otra semana'}]}];
 const result=normalizeTrainingTemplate(plan,reference);
 assert.notEqual(result.sessions[0].title,'Otra semana');
 assert.throws(()=>normalizeTrainingTemplate(plan,'2026-12-02'),/mes del borrador/);
 assert.throws(()=>normalizeTrainingTemplate(plan,'2026-11-31'));
});
test('a reference week crossing the month preserves the base days outside it',()=>{
 const plan=make(),result=normalizeTrainingTemplate(plan,'2026-11-01');
 assert.equal(result.sessions[0].kind,'lift');
 assert.equal(result.sessions[1].kind,'conditioning');
});
test('an empty routine cannot become a saved company template',()=>{
 const plan={...generateTrainingPlan({...defaultTrainingConfig(),days:[],conditioningDays:0}),month:'2026-11'};
 assert.throws(()=>normalizeTrainingTemplate(plan,reference),/al menos una sesión/);
});
