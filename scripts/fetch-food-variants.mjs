// Public product data only. Run manually; no API credentials or user data.
// Subset CSV export and the official Hugging Face viewer were unavailable (503/500).
// Bounded category batches are the fallback, spaced below OFF's 10 searches/min/IP.
import fs from 'node:fs';
import path from 'node:path';
const directory='.local/food-data/variants';fs.mkdirSync(directory,{recursive:true});
const batches=[
 ['tortitas','tortitas'],
 ['tortitas-integrales','tortitas arroz integral'],
 ['pan','pan'],
 ['arroz-pasta','pasta'],
 ['cereales','avena'],
 ['legumbres','garbanzos'],
 ['yogures','yogur'],
 ['leches','leche'],
 ['quesos','queso'],
 ['carnes','pollo'],
 ['pescados','atun'],
 ['verduras','verduras'],
 ['frutas','fruta'],
 ['frutos-secos','almendras'],
 ['salsas-aceites','aceite'],
 ['galletas-chocolate','galletas'],
 ['preparados','gazpacho'],
 ['embutidos','jamon'],
 ['proteinas','proteina'],
 ['bebidas','zumo'],
];
const fields=['code','product_name','product_name_es','brands','nutriments','allergens_tags','categories_tags','quantity','nutrition_data_per','product_quantity_unit','last_modified_t','data_quality_errors_tags','obsolete'];
let lastRequest=0;
for(const [name,query] of batches){
 const file=path.join(directory,name+'.json');if(fs.existsSync(file)&&JSON.parse(fs.readFileSync(file,'utf8')).hits.length){console.log('Cached '+name);continue;}
 const wait=8500-(Date.now()-lastRequest);if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));lastRequest=Date.now();
 const q=query;
 const response=await fetch('https://search.openfoodfacts.org/search',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'RAW/1.0 (https://raw-1-0.vercel.app)'},body:JSON.stringify({q,page_size:150,page:1,langs:['es','en'],fields}),signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error(`Export ${name}: HTTP ${response.status}. Stop instead of retrying or bypassing limits.`);
 const result=await response.json();if(!Array.isArray(result.hits)||!result.hits.length||result.errors?.length||result.timed_out)throw Error('Invalid or empty response '+name);
 fs.writeFileSync(file,JSON.stringify({fetchedAt:new Date().toISOString(),query:q,hits:result.hits},null,2)+'\n');console.log(`${name}: ${result.hits.length} source records`);
}
