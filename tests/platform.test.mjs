import test from 'node:test';
import assert from 'node:assert/strict';
import {allModules,companyInput,brandSchema,riseCompany,scopedApi,canFollow,commercialMetrics,clientMetrics} from '../lib/platform-model.ts';
import {loginDestination,validReturnPath} from '../lib/auth-context.ts';
import {preserveDisabledFeatures} from '../lib/platform-features.ts';
import {applyCompanyTemplate} from '../lib/company-templates.ts';
import {newProfile,emptyDay,generatePlan} from '../app/model.ts';
import {stateSchema} from '../app/validation.ts';
import {generateTrainingPlan,defaultTrainingConfig} from '../app/training-model.ts';
import {sessionsForDate,planForDate} from '../app/training-calendar-model.ts';
const today='2026-11-18';
function athlete(){const p=newProfile('Synthetic');p.confirmed=true;p.athlete={sport:'boxing',level:'recreational',goal:'performance',schedule:'regular',competitionWeight:{mode:'none'}};p.plans=[generatePlan(p,1)];return p;}
const template=(kind,payload)=>({id:crypto.randomUUID(),organization_id:crypto.randomUUID(),title:'Synthetic',created_at:today+'T10:00:00Z',kind,payload});
test('company configuration rejects incompatible modules and unsafe logos',()=>{
 const {id,created_at,updated_at,...fields}=riseCompany;
 assert.ok(companyInput.safeParse(fields).success);
 assert.equal(companyInput.safeParse({...fields,modules:{...allModules,training:false}}).success,false);
 for(const logo of ['javascript:alert(1)','data:image/svg+xml;base64,PHN2Zz4=','//example.invalid/a.png'])assert.equal(brandSchema.safeParse({...fields.brand,logo}).success,false);
 assert.ok(brandSchema.safeParse({...fields.brand,logo:'data:image/webp;base64,AAAA'}).success);
});
test('API requests derive scope from each tab path and preserve query parameters',()=>{
 assert.equal(scopedApi('/api/journal','/o/team-alache'),'/api/journal?organization=team-alache');
 assert.equal(scopedApi('/api/progress-photos?profile=p','/o/gym-b'),'/api/progress-photos?profile=p&organization=gym-b');
 assert.equal(scopedApi('/api/journal','/'),'/api/journal');
 assert.equal(scopedApi('https://example.invalid/api/x','/o/gym-b'),'https://example.invalid/api/x');
});
test('login accepts only company and invitation destinations; redirects cannot leave app',()=>{
 const token='a'.repeat(64);
 assert.equal(loginDestination('team-alache',token),'/join/'+token);
 assert.equal(loginDestination('team-alache'),'/o/team-alache');
 for(const path of ['https://bad.invalid','//bad.invalid','/o/a?next=https://bad.invalid','/join/x','/o/a/../../admin'])assert.equal(validReturnPath(path),false);
 assert.ok(validReturnPath('/o/team-alache'));assert.ok(validReturnPath('/join/'+token));
 assert.equal(loginDestination('../admin'),'/');
});
test('professional follow-up requires consent and assignment, while own access remains',()=>{
 const member={user_id:'u',share_followup:false,coach_id:'c'};
 assert.equal(canFollow({id:'a',role:'admin'},member),false);
 assert.equal(canFollow({id:'u',role:'user'},member),true);
 assert.equal(canFollow({id:'c',role:'coach'},{...member,share_followup:true}),true);
 assert.equal(canFollow({id:'other',role:'coach'},{...member,share_followup:true}),false);
});
test('commercial KPIs distinguish contracted monthly income, paid and overdue invoices',()=>{
 const companies=[{...riseCompany,id:'a'},{...riseCompany,id:'b',status:'suspended'}];
 const subscriptions=[{organization_id:'a',monthly_cents:9900,status:'active'},{organization_id:'b',monthly_cents:5000,status:'active'}];
 const invoices=[{status:'paid',amount_cents:9000,due_date:today},{status:'open',amount_cents:3000,due_date:'2026-11-17'},{status:'open',amount_cents:4000,due_date:today},{status:'void',amount_cents:10000,due_date:'2026-11-01'}];
 assert.deepEqual(commercialMetrics(companies,subscriptions,invoices,today),{companies:2,activeCompanies:1,mrrCents:9900,paidCents:9000,overdueCents:3000});
});
test('client KPIs exclude future records and incomplete days are never invented failures',()=>{
 const p=athlete();p.days['2026-11-01']={...emptyDay(p),weight:74};p.days[today]={...emptyDay(p),water:2500,weight:75,minutes:50};p.days['2026-12-01']={...emptyDay(p),weight:90,minutes:999,complete:true};
 const k=clientMetrics({profiles:[p],active:p.id},today);
 assert.equal(k.lastRecord,today);assert.equal(k.days7,1);assert.equal(k.weight,75);assert.equal(k.weightChange,1);assert.equal(k.minutes7,50);assert.equal(k.completed7,0);
});
test('disabled modules preserve prescriptions while allowing hydration and sensations',()=>{
 const p=athlete();p.days[today]={...emptyDay(p),water:250};
 const changed={...p,plans:[],workouts:{plans:[],logs:[]},days:{[today]:{...p.days[today],water:500}}};
 const next=preserveDisabledFeatures(p,changed,{...allModules,nutrition:false,training:false});
 assert.deepEqual(next.plans,p.plans);assert.equal(next.workouts,undefined);assert.equal(next.days[today].water,500);assert.deepEqual(next.days[today].items,[]);
 assert.ok(stateSchema.safeParse({profiles:[next],active:next.id}).success);
});
test('nutrition template recalculates meal count without removing restrictions or recorded intake',()=>{
 const p=athlete();p.excluded=['rice'];p.days['2026-11-17']={...emptyDay(p),water:2000,weight:74.5};
 const before=structuredClone(p),result=applyCompanyTemplate({profiles:[p],active:p.id},p.id,template('nutrition',{mealCount:3,schedule:'late'}),today);
 assert.equal(result.profiles[0].mealCount,3);assert.deepEqual(result.profiles[0].excluded,['rice']);assert.deepEqual(result.profiles[0].days['2026-11-17'],before.days['2026-11-17']);assert.deepEqual(p,before);
 assert.ok(stateSchema.safeParse(result).success);
});
test('training template preserves past prescriptions, club days, logs and running drafts',()=>{
 const p=athlete(),old={...generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',physicalDays:[0,2],runningDays:[1],technicalDays:[0,1],sparringDays:[4]}),month:'2026-11'};
 p.workouts={plans:[old],logs:[],drafts:[]};
 const before=structuredClone(p),source=generateTrainingPlan({...defaultTrainingConfig(),sport:'boxing',physicalDays:[3,5],runningDays:[0,2],technicalDays:[],sparringDays:[]});
 const result=applyCompanyTemplate({profiles:[p],active:p.id},p.id,template('training',source),today),next=result.profiles[0],applied=planForDate(next.workouts,today);
 assert.deepEqual(sessionsForDate(applied,'2026-11-16'),sessionsForDate(old,'2026-11-16'));
 assert.deepEqual(applied.config.sparringDays,old.config.sparringDays);assert.deepEqual(applied.config.physicalDays,source.config.physicalDays);
 assert.deepEqual(next.workouts.logs,p.workouts.logs);assert.deepEqual(next.workouts.drafts,p.workouts.drafts);assert.deepEqual(p,before);assert.ok(stateSchema.safeParse(result).success);
});
test('generic training templates cannot override a competition plan',()=>{
 const p=athlete();p.preparation={competition:{date:today}};
 assert.throws(()=>applyCompanyTemplate({profiles:[p],active:p.id},p.id,template('training',generateTrainingPlan(defaultTrainingConfig())),today),/competición/);
});
