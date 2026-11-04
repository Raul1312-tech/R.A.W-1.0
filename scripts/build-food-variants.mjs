// Reproducible selection from cached, public OFF batches; no synthetic nutrients.
import fs from 'node:fs';
import {fromOpenFoodFacts} from '../app/open-food-facts.ts';
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const directory='.local/food-data/variants';
const sources=fs.readdirSync(directory).filter(f=>f.endsWith('.json')).sort().flatMap(file=>{const batch=JSON.parse(fs.readFileSync(directory+'/'+file,'utf8'));return batch.hits.map(raw=>({raw,batch:file,query:batch.query,fetchedAt:batch.fetchedAt}))});
function classify(f,raw){
 const n=norm(raw.product_name_es),tags=(raw.categories_tags??[]).join(' ');
 if(/tortitas/.test(n)&&/arroz|maiz/.test(n))return 'Cereales y féculas';
 if(/gazpacho|salmorejo|pizza|lasan|flautas|burrito|ensalada|ensaladilla|sopa|caldo|avecrem|crema de (verdura|calabaz|zanahoria|puerro)/.test(n))return 'Platos preparados';
 if(/galleta|bizcocho|barrita|barra de proteina|miel|mermelada|mayonesa|ketchup|pesto|tomate frito|crema de cacao/.test(n))return 'Dulces y salsas';
 if(/bebida|zumo|jugo|refresco|cafe|infusion|aromatica|batido|whey|proteina.*polvo|soy /.test(n))return 'Bebidas y batidos';
 if(/chocolat|cacao/.test(n)&&!/leche|yogur|kefir|skyr|avena|muesli|granola|cereales/.test(n))return 'Dulces y salsas';
 if(/(garbanzo|lenteja|alubia|hummus|tofu|tempeh)/.test(n))return 'Legumbres y vegetales proteicos';
 if(/\bpan\b|tostad|picos|avena|muesli|granola|cereales|quinoa|cuscus|arroz|macarron|espaguet|spaghetti|tallarin|fideos|fettuc|pasta/.test(n)&&!/leche|yogur|queso|almendra|cacahuete|sesamo|cacao/.test(n))return 'Cereales y féculas';
 if(/\bjamon\b|salchich|chorizo|mortadela|fiambre|fuet|cecina|bacon|pavo.*lonchas|pechuga.*lonchas/.test(n))return 'Embutidos y fiambres';
 if(/atun|salmon|sardina|merluza|caballa|bacalao|mejillon|gamba|calamar|pulpo|anchoa|bonito/.test(n))return 'Pescados y mariscos';
 if(/pollo|ternera|vacuno|pavo|huevo|lomo|cerdo/.test(n))return 'Carnes y huevos';
 if(/yogur|yogurt|skyr|kefir|queso|mozzarella|requeson/.test(n)||/en:yogurts|en:cheeses/.test(tags))return 'Lácteos';
 if(/leche/.test(n)&&!/chocolate|gallet|tortit|pan |arroz con leche/.test(n))return 'Lácteos';
 if(/chocolate|galleta|barrita|miel|mermelada|mayonesa|ketchup|pesto|salsa|tomate frito/.test(n))return 'Dulces y salsas';
 if(/aceite|almendra|anacardo|pistacho|nueces|frutos secos|semillas/.test(n))return 'Frutos secos, semillas y grasas';
 if(/verdura|hortaliza|brocoli|judias|espinaca|zanahoria|pimiento|cebolla|esparrago/.test(n))return 'Verduras y hortalizas';
 if(/fruta|manzana|platano|pera|pina|mango|melocoton|fresa|arandano/.test(n))return 'Frutas';
 return f.group;
}
const stats={sourceRows:sources.length,missingSpanish:0,invalid:0,duplicateCode:0,duplicateName:0};
const byCode=new Map();
for(const source of sources){
 const {raw}=source;
 if(typeof raw.product_name_es!=='string'||!raw.product_name_es.trim()){stats.missingSpanish++;continue;}
 const food=fromOpenFoodFacts(raw);
 if(!food||raw.obsolete===true||(raw.data_quality_errors_tags??[]).length||norm(raw.product_name_es).length<4||!/[a-z]{3}/.test(norm(raw.product_name_es))||/^\d+\s*(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\d*$/i.test(norm(raw.product_name_es))){stats.invalid++;continue;}
 // Avoid ambiguous products where the variant is missing from the name.
 if(/^(tortitas|pan|pasta|fruta|verduras|queso|leche|yogur|proteina)$/.test(norm(raw.product_name_es))){stats.invalid++;continue;}
 // Reject obvious per-piece values mislabeled as per-100g in dry rice/corn
 // cakes (e.g. 39 kcal), as well as incompatible/misidentified cake records.
 if(/tortitas/.test(norm(raw.product_name_es))&&/arroz|maiz/.test(norm(raw.product_name_es))&&(food.k<300||food.k>600)){stats.invalid++;continue;}
 // Some source titles omit their chocolate coating or refer to a different
 // fried cake. Do not present a high-fat, ambiguously named cake as plain.
 if(/tortitas/.test(norm(raw.product_name_es))&&/arroz|maiz/.test(norm(raw.product_name_es))&&food.f>8&&!/choco|cacao|caramelo|yogur|queso|sesamo|semilla|cacahuete|almendra|coco/.test(norm(raw.product_name_es))){stats.invalid++;continue;}
 food.group=classify(food,raw);
 const item={food,...source};const older=byCode.get(food.id);
 if(older){stats.duplicateCode++;if((older.raw.last_modified_t??0)>=(raw.last_modified_t??0))continue;}
 byCode.set(food.id,item);
}
const byName=new Map();
const fingerprint=name=>norm(name).replace(/\b\d+(?:\s\d+)?\s*(?:kg|gr|g|ml|litros|litro|l)\b/g,'').replace(/\b(de|del|la|el|las|los)\b/g,'').replace(/\s+/g,' ').trim();
for(const item of [...byCode.values()].sort((a,b)=>(b.raw.last_modified_t??0)-(a.raw.last_modified_t??0))){const key=fingerprint(item.food.name);if(byName.has(key)){stats.duplicateName++;continue;}byName.set(key,item);}
const candidates=[...byName.values()].sort((a,b)=>a.food.name.localeCompare(b.food.name,'es')||a.food.id.localeCompare(b.food.id));
const selected=new Map();
const required={
 ricePlain:n=>/tortitas/.test(n)&&/arroz/.test(n)&&!/choco|cacao|integral|maiz|avena|quinoa|caramelo|sesamo|semilla/.test(n),
 riceWhole:n=>/tortitas/.test(n)&&/arroz/.test(n)&&/integral/.test(n)&&!/choco|cacao/.test(n),
 cornPlain:n=>/tortitas/.test(n)&&/maiz/.test(n)&&!/choco|cacao|arroz|caramelo/.test(n),
 riceChocolate:n=>/tortitas/.test(n)&&/arroz/.test(n)&&/chocolate/.test(n),
};
const coverage={};for(const [key,match] of Object.entries(required)){const found=candidates.filter(it=>match(norm(it.raw.product_name_es)));if(!found.length)throw Error('Missing required variant '+key);coverage[key]=found.slice(0,4).map(it=>it.food.id);for(const it of found.slice(0,4))selected.set(it.food.id,it);}
// Round-robin categories and acquisition batches rather than filling the quota
// with hundreds of nearly identical products from one search or brand.
const buckets=new Map();for(const it of candidates){const key=it.food.group+'|'+it.batch;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(it);}
while(selected.size<1000){let changed=false;for(const bucket of buckets.values()){while(bucket.length&&selected.has(bucket[0].food.id))bucket.shift();if(bucket.length){const it=bucket.shift();selected.set(it.food.id,it);changed=true;}if(selected.size===1000)break;}if(!changed)throw Error(`Only ${selected.size} eligible unique variants, need 1000.`);}
const picked=[...selected.values()];const foods=picked.map(it=>it.food);
const folder='public/data';fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(folder+'/food-variants.json',JSON.stringify(foods)+'\n');
const provenance=picked.map(({raw,batch,query,fetchedAt,food})=>({id:food.id,batch,query,fetchedAt,sourceUrl:'https://world.openfoodfacts.org/product/'+raw.code,raw}));
fs.writeFileSync(folder+'/food-variants-provenance.json',JSON.stringify({source:'Open Food Facts contributors',license:'ODbL-1.0',contentsLicense:'DbCL-1.0',records:provenance})+'\n');
const groups=Object.fromEntries([...new Set(foods.map(f=>f.group))].sort().map(g=>[g,foods.filter(f=>f.group===g).length]));
fs.writeFileSync(folder+'/food-variants-manifest.json',JSON.stringify({version:'2026-11-04',source:'Open Food Facts contributors',sourceUrl:'https://world.openfoodfacts.org',license:'https://opendatacommons.org/licenses/odbl/1-0/',count:foods.length,eligible:candidates.length,stats,groups,coverage},null,2)+'\n');
console.log(JSON.stringify({count:foods.length,eligible:candidates.length,groups,coverage,stats},null,2));
