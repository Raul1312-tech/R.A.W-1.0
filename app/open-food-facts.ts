import type {Food} from './model';
type Obj=Record<string,unknown>;
const object=(v:unknown):Obj=>v&&typeof v==='object'&&!Array.isArray(v)?v as Obj:{};
const text=(v:unknown)=>typeof v==='string'?v.trim():'';
const strings=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[];
const amount=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&v.trim()&&Number.isFinite(Number(v))?Number(v):null;
const allergens:Record<string,string>={'en:milk':'leche','en:eggs':'huevo','en:gluten':'gluten','en:wheat':'gluten','en:soybeans':'soja','en:nuts':'frutos secos','en:peanuts':'cacahuete','en:fish':'pescado','en:crustaceans':'crustáceos','en:molluscs':'moluscos','en:sesame-seeds':'sésamo','en:celery':'apio','en:mustard':'mostaza','en:sulphur-dioxide-and-sulphites':'sulfitos','en:lupin':'altramuces'};
function group(tags:string[]){const s=tags.join(' ');if(/sausages|salamis|hams|charcuteries|spanish-meat-products/.test(s))return 'Embutidos y fiambres';if(/seafood|fishes|fish-|mollus|crustaceans/.test(s))return 'Pescados y mariscos';if(/beverages/.test(s))return 'Bebidas y batidos';if(/dairies|cheeses|yogurts|milks/.test(s))return 'Lácteos';if(/meats|eggs/.test(s))return 'Carnes y huevos';if(/legumes|tofu|tempeh|hummus/.test(s))return 'Legumbres y vegetales proteicos';if(/vegetables/.test(s))return 'Verduras y hortalizas';if(/fruits/.test(s))return 'Frutas';if(/nuts|seeds|oils|fats/.test(s))return 'Frutos secos, semillas y grasas';if(/cereals|breads|pastas|rices|potatoes/.test(s))return 'Cereales y féculas';if(/sweet|chocolate|biscuits|sauces/.test(s))return 'Dulces y salsas';return 'Otros'}
/** Reject incomplete nutrition; missing nutrients must never silently become zero. */
export function fromOpenFoodFacts(raw:unknown):Food|null{
 const p=object(raw),n=object(p.nutriments),code=text(p.code);if(!/^\d{8,14}$/.test(code))return null;
 const name=text(p.product_name_es)||text(p.product_name);if(!name)return null;
 let k=amount(n['energy-kcal_100g']);if(k===null){const kj=amount(n.energy_100g);if(kj!==null)k=kj/4.184}
 const protein=amount(n.proteins_100g),c=amount(n.carbohydrates_100g),f=amount(n.fat_100g);
 if(k===null||protein===null||c===null||f===null||k<0||k>1000||[protein,c,f].some(v=>v<0||v>100)||protein+c+f>105)return null;
 // A zero/mistyped energy value must not turn a substantial meal into zero calories.
 const macroEnergy=4*(protein+c)+9*f;if(macroEnergy>30&&(k<macroEnergy*.5||k>macroEnergy*2))return null;
 const brand=Array.isArray(p.brands)?strings(p.brands).join(', '):text(p.brands);
 const round=(v:number)=>Math.round(v*100)/100;
 return {id:'off-'+code,name:(name+(brand?' · '+brand:'')).slice(0,120),unit:'por 100 g según ficha; comprueba el envase',k:round(k),p:round(protein),c:round(c),f:round(f),group:group(strings(p.categories_tags)),allergens:[...new Set(strings(p.allergens_tags).map(a=>allergens[a]??a.replace(/^[a-z]{2}:/,'').slice(0,60)))].slice(0,20)};
}
export type FoodSearchResult={foods:Food[];page:number;hasMore:boolean;omitted:number};
export function offSearchResult(raw:unknown,page:number):FoodSearchResult{
 const data=object(raw);if(!Array.isArray(data.hits)||data.timed_out===true||Array.isArray(data.errors)&&data.errors.length)throw Error('Invalid food search response');
 const records=data.hits.map(fromOpenFoodFacts).filter((f):f is Food=>!!f);
 return {foods:[...new Map(records.map(f=>[f.id,f])).values()],page,hasMore:page<Number(data.page_count??1)&&page<20,omitted:data.hits.length-records.length};
}
