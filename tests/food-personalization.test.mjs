import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,generatePlan,dateKey} from '../app/model.ts';
import {foodPreferenceIds,foodPreferencesSchema} from '../app/preparation-preferences.ts';
import {saveFoodPreferences,daySettings} from '../app/preparation-engine.ts';
import {previewNutritionSituation} from '../app/nutrition-situations-model.ts';
import {photoItems,photoEstimateSchema} from '../app/food-photo-model.ts';
import {stateSchema} from '../app/validation.ts';
import {estimateFoodPhoto} from '../lib/food-photo-ai.ts';
const prefs={foods:{rice:'usual',pasta:'usual',bread:'usual',potato:'usual',sweetpotato:'usual',quinoa:'like',couscous:'like',chicken:'usual',turkey:'usual',egg:'usual',yogurt:'usual'},variety:'balanced',certification:'none'};
test('usual shopping foods dominate menus across seeds without breaking macros or excluding occasional choices',()=>{
 const p=newProfile();p.preparation={foodPreferences:prefs};let usual=0,total=0;const seen=new Set();
 for(let seed=1;seed<=12;seed++){
  const plan=generatePlan(p,seed);assert.ok(plan);
  for(const day of plan.week)for(const meal of day.meals)for(const item of meal.items)if(foodPreferenceIds.carbs.includes(item.food.id)){total++;seen.add(item.food.id);if(prefs.foods[item.food.id]==='usual')usual++}
 }
 assert.ok(usual/total>.85);assert.ok(seen.has('quinoa')||seen.has('couscous'));assert.ok(!seen.has('oats'));
});
test('preferences update automatic pending meals and preserve historic or fixed nutrition records',()=>{
 const p=newProfile();p.confirmed=true;p.plans=[generatePlan(p,1)];const today=dateKey();
 p.days[today]=previewNutritionSituation(p,daySettings(p,today),today);
 const old=structuredClone(p);const next=saveFoodPreferences(p,prefs);
 assert.notDeepEqual(next.days[today].foodPlan.meals,old.days[today].foodPlan.meals);
 assert.deepEqual(p,old);assert.ok(stateSchema.safeParse({active:next.id,profiles:[next]}).success);
 p.days[today].complete=true;assert.deepEqual(saveFoodPreferences(p,prefs).days[today],p.days[today]);
 assert.ok(foodPreferencesSchema.safeParse({...prefs,explore:true}).success);
});
test('photo estimates are validated and converted to editable food portions, never diary records',()=>{
 const estimate={message:'Revisar cantidad',assumptions:['Peso cocido aproximado'],items:[{name:'Arroz cocido',grams:180,basis:'cocido',k:130,p:2.7,c:28,f:.3}]};
 const items=photoItems(estimate);assert.equal(items[0].grams,180);assert.equal(items[0].food.k,130);assert.match(items[0].food.name,/estimación/);assert.match(items[0].food.unit,/cocido/);
 assert.ok(!photoEstimateSchema.safeParse({...estimate,items:[{...estimate.items[0],grams:-1}]}).success);
 assert.ok(!photoEstimateSchema.safeParse({...estimate,items:[{...estimate.items[0],p:80,c:80}]}).success);
 assert.ok(!photoEstimateSchema.safeParse({...estimate,items:[{...estimate.items[0],k:900}]}).success);
 assert.deepEqual(photoItems({...estimate,items:[]}),[]);
 const p=newProfile();p.days[dateKey()]={...previewNutritionSituation({...p,plans:[generatePlan(p,1)]},daySettings(p,dateKey()),dateKey()),items:photoItems({...estimate,items:[{...estimate.items[0],name:'A'.repeat(120),basis:'B'.repeat(160)}]}).map((it,i)=>({...it,id:String(i),meal:'Comida'}))};
 assert.ok(stateSchema.safeParse({active:p.id,profiles:[p]}).success);
});

test('vision caller sends a nonstored structured request and rejects incomplete responses',async()=>{
 const original=globalThis.fetch;let sent;
 try{
  globalThis.fetch=async(url,options)=>{sent=JSON.parse(options.body);return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({message:'No hay comida',assumptions:[],items:[]})}]}]})};
  const result=await estimateFoodPhoto('data:image/jpeg;base64,abc','Solo el táper','test-key');
  assert.equal(result.items.length,0);assert.equal(sent.store,false);assert.equal(sent.input[0].content[1].type,'input_image');assert.equal(sent.text.format.strict,true);
  globalThis.fetch=async()=>Response.json({status:'incomplete'});
  await assert.rejects(()=>estimateFoodPhoto('data:image/jpeg;base64,abc','','test-key'),/no se completó/);
  globalThis.fetch=async()=>Response.json({error:'hidden'},{status:429});
  await assert.rejects(()=>estimateFoodPhoto('data:image/jpeg;base64,abc','','test-key'),/ocupado/);
 }finally{globalThis.fetch=original}
});
