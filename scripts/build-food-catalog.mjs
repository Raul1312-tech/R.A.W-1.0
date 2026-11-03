// Run with the unzipped official SR Legacy 2018 CSV directory as argv[2].
// Nutrition comes only from USDA, never from the translated names.
import fs from 'node:fs';
import path from 'node:path';
function csv(text){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(field);field=''}else if(c==='\n'&&!quoted){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field=''}else field+=c}if(field||row.length){row.push(field);rows.push(row)}const header=rows.shift();return rows.filter(r=>r.length===header.length).map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]])))}
const directory=process.argv[2];if(!directory)throw Error('Pass the directory containing food.csv and food_nutrient.csv.');
const rows=fs.readFileSync('data/usda-foods-es.tsv','utf8').trimEnd().split('\n').slice(1).map(s=>s.replace(/\r$/,'').split('\t'));
const selected=new Set(rows.map(r=>r[0]));
const descriptions=new Map(csv(fs.readFileSync(path.join(directory,'food.csv'),'utf8')).map(r=>[r.fdc_id,r.description]));
const values=new Map();for(const r of csv(fs.readFileSync(path.join(directory,'food_nutrient.csv'),'utf8'))){if(selected.has(r.fdc_id)&&['1003','1004','1005','1008','1079'].includes(r.nutrient_id)){if(!values.has(r.fdc_id))values.set(r.fdc_id,{});values.get(r.fdc_id)[r.nutrient_id]=Number(r.amount)}}
const round=n=>Math.round(n*100)/100;
const catalog=rows.map(([id,name,group,unit,allergens=''])=>{const n=values.get(id);if(n?.['1005']===0&&n['1079']===undefined)n['1079']=0;if(!n||!descriptions.has(id)||['1003','1004','1005','1008','1079'].some(key=>!Number.isFinite(n[key])))throw Error('Missing nutrient for '+id);return {id:'usda-'+id,name,group,unit,k:n['1008'],p:n['1003'],c:round(Math.max(0,n['1005']-n['1079'])),f:n['1004'],allergens:allergens.split(',').map(a=>a.trim()).filter(Boolean)}});
fs.writeFileSync('data/food-catalog.json',JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync('data/usda-provenance.json',JSON.stringify(rows.map(([id,name])=>({id,name,original:descriptions.get(id),nutrients:values.get(id)})),null,2)+'\n');
console.log(`Built ${catalog.length} foods with USDA provenance.`);
