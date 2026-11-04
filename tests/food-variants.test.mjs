import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {foods,newProfile,emptyDay} from '../app/model.ts';
import {findFoods,foodSource,foodGroups,normalizeFood} from '../app/food-search.ts';
import {fromOpenFoodFacts} from '../app/open-food-facts.ts';
import {stateSchema} from '../app/validation.ts';
const read=name=>JSON.parse(fs.readFileSync(new URL('../public/data/'+name,import.meta.url),'utf8'));
const variants=read('food-variants.json'),manifest=read('food-variants-manifest.json'),provenance=read('food-variants-provenance.json');
const basics=JSON.parse(fs.readFileSync(new URL('../data/food-catalog.json',import.meta.url),'utf8'));
test('adds exactly 1000 genuinely distinct source products, separate from the 170 original foods',()=>{
 assert.equal(variants.length,1000);assert.equal(manifest.count,1000);assert.equal(provenance.records.length,1000);
 assert.equal(new Set([...foods,...basics,...variants].map(f=>f.id)).size,1170);
 assert.equal(new Set(variants.map(f=>normalizeFood(f.name))).size,1000);
 assert.ok(Object.keys(manifest.groups).length>=12);
 for(const category of ['Carnes y huevos','Pescados y mariscos','Verduras y hortalizas','Lácteos','Legumbres y vegetales proteicos','Cereales y féculas'])assert.ok(manifest.groups[category]>=25);
});
test('every added product has numeric nutrition identical to its retained public source and valid journal schema',()=>{
 const profile=newProfile('Test catalog');
 for(const [i,food] of variants.entries()){
  const source=provenance.records.find(r=>r.id===food.id);assert.ok(source?.raw.product_name_es);assert.equal(source.sourceUrl,foodSource(food).url);
  const mapped=fromOpenFoodFacts(source.raw);assert.ok(mapped);for(const macro of ['k','p','c','f'])assert.equal(food[macro],mapped[macro],food.id+' '+macro);
  assert.ok(foodGroups.includes(food.group));assert.ok(!source.raw.obsolete);assert.ok(!(source.raw.data_quality_errors_tags??[]).length);
  const key='2026-11-'+String(i%28+1).padStart(2,'0');profile.days[key]={...emptyDay(profile),items:[{food,grams:30,id:'test-'+i,meal:'Comida'}]};
  assert.equal(stateSchema.safeParse({active:profile.id,profiles:[profile]}).success,true,food.id);
 }
});
test('user rice/corn/wholegrain/chocolate requests are instantly searchable with regional synonyms and accents',()=>{
 for(const query of ['tostas de arroz normales','tostas de arroz integrales','tostas de maiz','tostas de arroz con chocolate','tortitas de arroz','galletas de arroz con chocolate'])assert.ok(findFoods(variants,query).length>=1,query);
 for(const f of findFoods(variants,'tostas de arroz normales'))assert.doesNotMatch(normalizeFood(f.name.split(' · ')[0]),/integral|choco|cacao|avena/);
 for(const f of findFoods(variants,'tostas de arroz integrales'))assert.match(normalizeFood(f.name.split(' · ')[0]),/integral/);
 assert.equal(findFoods([{id:'test-cake',name:'Tortitas de arroz · El Granero Integral',unit:'g',k:380,p:7,c:80,f:2,allergens:[]}],'tostas arroz integral').length,0);
 for(const f of findFoods(variants,'tostas de arroz con chocolate'))assert.match(normalizeFood(f.name),/chocolate/);
 const ids=Object.values(manifest.coverage).flat();assert.equal(new Set(ids).size,ids.length);
 const plain=variants.find(f=>f.id===manifest.coverage.ricePlain[0]),chocolate=variants.find(f=>f.id===manifest.coverage.riceChocolate[0]);assert.notDeepEqual([plain.k,plain.p,plain.c,plain.f],[chocolate.k,chocolate.p,chocolate.c,chocolate.f]);
 const barcode=plain.id.slice(4);assert.deepEqual(findFoods(variants,barcode).map(f=>f.id),[plain.id]);
});
test('food categories do not classify fish as oil or egg pasta as meat; selected history versions still win',()=>{
 for(const f of variants.filter(f=>/^atun.*aceite/.test(normalizeFood(f.name))))assert.equal(f.group,'Pescados y mariscos');
 for(const f of variants.filter(f=>/^pasta especial al huevo/.test(normalizeFood(f.name))))assert.equal(f.group,'Cereales y féculas');
 const previous={...variants[0],k:123,unit:'por 100 ml según etiqueta'};
 const merged=[...new Map([...variants,previous].map(f=>[f.id,f])).values()];
 assert.equal(merged.length,1000);assert.equal(merged.find(f=>f.id===previous.id).k,123);
});
