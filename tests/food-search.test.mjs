import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {foods,newProfile,emptyDay,total} from '../app/model.ts';
import {findFoods,foodGroup,previousFoods,foodSource} from '../app/food-search.ts';
import {fromOpenFoodFacts,offSearchResult} from '../app/open-food-facts.ts';
import {stateSchema} from '../app/validation.ts';
import {GET} from '../app/api/foods/search/route.ts';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/food-catalog.json',import.meta.url)));
const product={code:'8425214101114',product_name_es:'Salchichón de Vic',brands:['Marca de prueba'],nutriments:{'energy-kcal_100g':358,proteins_100g:32,carbohydrates_100g:.7,fat_100g:25},categories_tags:['en:spanish-meat-products'],allergens_tags:['en:milk']};
test('broad bundled catalog has unique IDs and traceable nutrition, separates raw/cooked and does not change the halal generator',()=>{
 const provenance=JSON.parse(fs.readFileSync(new URL('../data/usda-provenance.json',import.meta.url)));
 assert.ok(catalog.length>=119);assert.equal(new Set(catalog.map(f=>f.id)).size,catalog.length);
 for(const f of catalog){const source=provenance.find(p=>'usda-'+p.id===f.id);assert.ok(source?.original);assert.equal(f.k,source.nutrients['1008']);assert.equal(f.p,source.nutrients['1003']);assert.equal(f.f,source.nutrients['1004']);assert.ok(f.c>=0);assert.ok(f.name.length<=120);assert.ok(f.unit.length<=120);assert.ok(foodSource(f).url.startsWith('https://fdc.nal.usda.gov/'));}
 assert.equal(findFoods(catalog,'atún').length,4);assert.ok(findFoods(catalog,'arroz integral cocido')[0].unit.includes('cocido'));assert.ok(findFoods(catalog,'cerdo').length>=3);
 assert.equal(foods.some(f=>f.id.startsWith('usda-')),false);
});
test('local search ignores accents, supports multiword queries and synonyms, categories use food type instead of fat/protein content',()=>{
 const all=[...foods,...catalog];assert.ok(findFoods(all,'platano').some(f=>f.id==='banana'));assert.ok(findFoods(all,'arroz cocido').length>=2);assert.equal(foodGroup(catalog.find(f=>f.name.includes('Salami curado'))),'Embutidos y fiambres');assert.equal(foodGroup(foods.find(f=>f.id==='nuts')),'Frutos secos, semillas y grasas');assert.equal(findFoods(all,'','Habituales',new Set(['banana'])).length,1);
});
test('OFF preserves declared nutrition, source, brand and allergens; calories calculate from real grams',()=>{
 const f=fromOpenFoodFacts(product);assert.equal(f.name,'Salchichón de Vic · Marca de prueba');assert.equal(f.k,358);assert.equal(f.group,'Embutidos y fiambres');assert.deepEqual(f.allergens,['leche']);assert.equal(total([{food:f,grams:30}]).k,107.4);assert.equal(foodSource(f).url,'https://world.openfoodfacts.org/product/8425214101114');
 const kj=fromOpenFoodFacts({...product,nutriments:{...product.nutriments,'energy-kcal_100g':undefined,energy_100g:1497.872}});assert.equal(kj.k,358);
});
test('OFF rejects missing, invalid and impossible nutrients instead of inventing zeros, supports explicit zero',()=>{
 for(const nutrients of [{...product.nutriments,proteins_100g:undefined},{...product.nutriments,fat_100g:-1},{...product.nutriments,carbohydrates_100g:null},{...product.nutriments,'energy-kcal_100g':0},{...product.nutriments,fat_100g:Infinity}])assert.equal(fromOpenFoodFacts({...product,nutriments:nutrients}),null);
 assert.equal(fromOpenFoodFacts({...product,code:'<bad>'}),null);
 assert.equal(fromOpenFoodFacts({...product,nutriments:{'energy-kcal_100g':0,proteins_100g:0,carbohydrates_100g:0,fat_100g:0}}).k,0);
 const result=offSearchResult({hits:[product,{...product,code:'12345678',nutriments:{}}],page_count:3},1);assert.equal(result.foods.length,1);assert.equal(result.omitted,1);assert.equal(result.hasMore,true);
 assert.throws(()=>offSearchResult({hits:[],timed_out:true},1));
});
test('previous foods survive journal validation and reload, stay per profile and preserve latest chosen units',()=>{
 const profile=newProfile('Food QA'),food={...fromOpenFoodFacts(product),unit:'por 100 ml según ficha; comprueba el envase'};
 profile.days['2026-11-03']={...emptyDay(profile),items:[{id:'i',meal:'Cena',food,grams:30}]};
 const restored=stateSchema.parse(JSON.parse(JSON.stringify({active:profile.id,profiles:[profile]}))).profiles[0];
 assert.deepEqual(previousFoods(restored),[food]);assert.deepEqual(previousFoods(newProfile('Other')),[]);
});
test('search route validates, caches, bounds upstream traffic and reports service errors without fake foods',async()=>{
 const original=globalThis.fetch;let calls=0;let body;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://search.openfoodfacts.org/search');calls++;body=JSON.parse(options.body);assert.ok(!options.headers.Cookie);return Response.json({hits:[product],page_count:2})};
 const req=(q,page='1')=>new Request('http://localhost/api/foods/search?'+new URLSearchParams({q,page}));
 try{
  assert.equal((await GET(req('a'))).status,400);assert.equal((await GET(req('salchichon','0'))).status,400);assert.equal(calls,0);
  const first=await GET(req('salchichon'));assert.equal(first.status,200);assert.equal((await first.json()).foods[0].k,358);await GET(req('salchichon'));assert.equal(calls,1);
  await GET(req('8425214101114'));assert.equal(body.q,'code:"8425214101114"');
  globalThis.fetch=async()=>{calls++;throw Error('offline')};const failure=await GET(req('offline'));assert.equal(failure.status,503);assert.ok((await failure.json()).error);
  for(let i=0;i<5;i++)await GET(req('query'+i));assert.equal((await GET(req('throttled'))).status,429);
 }finally{globalThis.fetch=original}
});
