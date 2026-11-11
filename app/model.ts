import type {StrategyVersion} from './strategy-version.ts';
import type {Onboarding} from './onboarding-schema';
import type {Athlete} from './athlete-schema';
import {mealSlots,mealFractions} from './meal-layout.ts';
import type {Preparation} from './preparation-schema';
import type {TrainingData} from './training-model';
import type {AppliedNutrition} from './nutrition-situation-schema';
export type Macro={k:number;p:number;c:number;f:number};
export type Food=Macro & {id:string;name:string;unit:string;allergens:string[];group?:string};
export const foods:Food[]=[
['oats','Copos de avena','secos',370,13,60,7,['gluten']],
['rice','Arroz','en seco',356,7,79,1,[]],
['pasta','Pasta','en seco',350,12,70,2,['gluten']],
['couscous','Cuscús','en seco',360,12,72,2,['gluten']],
['bread','Pan integral','tal como se vende',250,9,43,4,['gluten']],
['potato','Patata','cruda, parte comestible',77,2,17,0.1,[]],
['chicken','Pechuga de pollo','cruda, sin hueso',110,23,0,2,[]],
['turkey','Pechuga de pavo','cruda, sin hueso',107,24,0,1.2,[]],
['beef','Ternera magra','cruda, sin hueso',137,21,0,5.5,[]],
['egg','Huevo','sin cáscara; 1 mediano ≈ 50 g',143,12.6,0.7,9.5,['huevo']],
['yogurt','Yogur natural alto en proteína','tal como se vende',60,10,4,0.4,['leche']],
['milk','Leche entera','por 100 ml',64,3.2,4.8,3.6,['leche']],
['lentils','Lentejas cocidas','escurridas',100,7,14,0.5,[]],
['chickpeas','Garbanzos cocidos','escurridos',120,7,18,2,[]],
['tofu','Tofu firme','escurrido',130,14,2,7,['soja']],
['olive','Aceite de oliva','en gramos',900,0,0,100,[]],
['peanut','Crema de cacahuete 100 %','tal como se vende',610,26,12,50,['cacahuete']],
['nuts','Nueces','sin cáscara',680,15,7,65,['frutos secos']],
['banana','Plátano','sin piel',89,1.1,20.2,0.3,[]],
['apple','Manzana','parte comestible',52,0.3,12,0.2,[]],
['dates','Dátiles','sin hueso',282,2.5,67,0.4,[]],
['veg','Verduras variadas','crudas o congeladas sin salsa',35,2,5,0.3,[]],
['tomato','Tomate','crudo',20,1,3,0.2,[]],
['cheese','Queso fresco','revisar etiqueta',170,12,3,12,['leche']],
['quark','Queso fresco batido 0 %','revisar ingredientes',47,8,4,0.2,['leche']],
['cottage','Queso cottage','revisar etiqueta',98,12,3,4,['leche']],
['eggwhite','Clara de huevo pasteurizada','pesar antes de cocinar; consumir cocinada',46,10.5,0.7,0.2,['huevo']],
['cornflakes','Copos de maíz sin azúcar','en seco; revisar etiqueta',370,7,82,1,['gluten']],
['tortilla','Tortilla de trigo','tal como se vende',310,8,52,7,['gluten']],
['quinoa','Quinoa','en seco',368,14,64,6,[]],
['sweetpotato','Boniato','crudo, parte comestible',86,1.6,20,0.1,[]],
['beans','Alubias cocidas','escurridas',105,7,16,0.5,[]],
['almonds','Almendras','sin cáscara',610,21,7,54,['frutos secos']],
['avocado','Aguacate','sin piel ni hueso',160,2,2,15,[]],
['orange','Naranja','sin piel',47,0.9,9,0.1,[]],
['pear','Pera','parte comestible',57,0.4,12,0.1,[]],
['kiwi','Kiwi','sin piel',61,1.1,11,0.5,[]],
['berries','Frutos rojos','frescos o congelados, sin azúcar',45,1,8,0.4,[]],
['raisins','Pasas','sin semillas',299,3.1,69,0.5,[]],
['broccoli','Brócoli','crudo o congelado sin salsa',34,2.8,4,0.4,[]],
['carrot','Zanahoria','cruda, parte comestible',41,0.9,7,0.2,[]],
['zucchini','Calabacín','crudo',17,1.2,2,0.3,[]],
['pepper','Pimiento','crudo, sin semillas',31,1,5,0.3,[]],
['spinach','Espinacas','crudas o congeladas sin salsa',23,2.9,1.4,0.4,[]],
['greenbeans','Judías verdes','crudas o congeladas sin salsa',31,1.8,4,0.2,[]],
['coffee','Café solo','por 100 ml, sin leche ni azúcar',1,0.1,0,0,[]],
['whey','Proteína en polvo','genérica; revisar etiqueta',400,80,8,6,['leche']],
['turkey-slices','Pavo en lonchas','tal como se vende; revisar etiqueta',110,20,3,2,['soja']],
['rice-cooked','Arroz cocido','cocido, sin aceite ni salsa',130,2.7,28,0.3,[]],
['pasta-cooked','Pasta cocida','cocida, sin aceite ni salsa',150,5,29,1,['gluten']],
['sugar','Azúcar','en gramos',400,0,100,0,[]],
].map(([id,name,unit,k,p,c,f,allergens])=>({id,name,unit,k,p,c,f,allergens})) as Food[];
export const foodById=(id:string)=>foods.find(x=>x.id===id)!;
export type Item={food:Food;grams:number};
export type Meal={name:string;items:Item[];prep?:string};
export const weekdays=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
export const mealNames=['Primera comida','Tentempié','Comida','Merienda','Cena'];
export type MenuDay={day:string;meals:Meal[];estimates?:Record<number,Macro>};
export type Plan={id:string;created:string;seed:number;target:Macro;meals:Meal[];week?:MenuDay[]};
export type MealRecord={slot:number;status:'planned'|'alternative'|'skipped';itemIds:string[]};
export type DailyFoodPlan={planId:string;meals:Meal[];labels:string[];autoAdjust:boolean;records:MealRecord[]};
export type Day={supplementForecast?:Record<string,Macro>;items:(Item & {id:string;meal:string})[];foodPlan?:DailyFoodPlan;nutrition?:AppliedNutrition;competition?:{key:string;phase:string;review:boolean;error?:string};water:number;weight:number|null;steps:number|null;minutes:number;training:string;sleep:number|null;notes:string;complete:boolean;target:Macro};
export type Profile={strategyVersion?:StrategyVersion;onboarding?:Onboarding;mealCount?:number;athlete?:Athlete;preparation?:Preparation;id:string;name:string;age:number;sex:'male'|'female';height:number;weight:number;goal:number;activity:number;surplus:number;waterGoal:number;confirmed:boolean;allergens:string[];excluded:string[];health:string;training:string;budget:string;workouts?:TrainingData;plans:Plan[];days:Record<string,Day>};
export type State={profiles:Profile[];active:string};
export function targets(p:Profile){const bmr=10*p.weight+6.25*p.height-5*p.age+(p.sex==='male'?5:-161);const maintenance=bmr*p.activity;const k=p.preparation?.energyTarget??Math.round((maintenance+p.surplus)/50)*50;const protein=Math.round(p.weight*2/5)*5;const f=Math.round(k*.27/9);return {bmr,maintenance,k,p:protein,f,c:(k-4*protein-9*f)/4};}
export function total(items:Item[]):Macro{return items.reduce((a,x)=>({k:a.k+x.food.k*x.grams/100,p:a.p+x.food.p*x.grams/100,c:a.c+x.food.c*x.grams/100,f:a.f+x.food.f*x.grams/100}),{k:0,p:0,c:0,f:0})}
const item=(id:string,grams:number):Item=>({food:foodById(id),grams});
type Template={name:string;vars:string[];fixed:[string,number][];prep:string};
const breakfastTemplates:Template[]=[];
const snackTemplates:Template[]=[];
const mainTemplates:Template[]=[];
const fruitNames:Record<string,string>={banana:'plátano',apple:'manzana',orange:'naranja',pear:'pera',kiwi:'kiwi',berries:'frutos rojos',dates:'dátiles',raisins:'pasas'};
const carbNames:Record<string,string>={rice:'arroz',pasta:'pasta',couscous:'cuscús',potato:'patata',sweetpotato:'boniato',quinoa:'quinoa',tortilla:'tortillas de trigo'};
const proteinNames:Record<string,string>={chicken:'Pollo',turkey:'Pavo',beef:'Ternera',tofu:'Tofu',eggwhite:'Revuelto de huevo y claras'};
const vegetableNames:Record<string,string>={broccoli:'brócoli',carrot:'zanahoria',zucchini:'calabacín',pepper:'pimiento',spinach:'espinacas',greenbeans:'judías verdes',tomato:'tomate'};
// Each recipe has a distinct food combination, not just a renamed plate.
for(const [fruit,index] of Object.keys(fruitNames).map((f,i)=>[f,i] as const)){
 const grams=fruit==='dates'||fruit==='raisins'?25:100;
 const dairy=index%2?'quark':'yogurt';
 const nut=index%3===0?'nuts':index%3===1?'almonds':'peanut';
 const nutName=foodById(nut).name.toLowerCase();
 breakfastTemplates.push({name:`Avena con ${fruitNames[fruit]} y ${nutName}`,vars:[dairy,'oats',nut],fixed:[[fruit,grams]],prep:'Mezcla los cereales con el yogur o queso batido, la fruta y los frutos secos. Puedes hidratar la avena con agua.'});
 breakfastTemplates.push({name:`Tostadas con ${fruitNames[fruit]} y queso cottage`,vars:['cottage','bread','nuts'],fixed:[[fruit,grams]],prep:'Sirve el queso sobre las tostadas. Acompaña con la fruta y las nueces.'});
 snackTemplates.push({name:`Yogur con copos de maíz y ${fruitNames[fruit]}`,vars:['yogurt','cornflakes',nut],fixed:[[fruit,grams*.7]],prep:'Combina los copos con el yogur. Añade la fruta y los frutos secos justo antes de comer.'});
 snackTemplates.push({name:`Queso batido con avena y ${fruitNames[fruit]}`,vars:['quark','oats',nut],fixed:[[fruit,grams*.7]],prep:'Mezcla el queso batido con la avena, la fruta y los frutos secos. Si te resulta espeso, añade agua.'});
 snackTemplates.push({name:`Tostadas de pavo con ${fruitNames[fruit]}`,vars:['turkey','bread','olive'],fixed:[[fruit,grams]],prep:'Cocina la pechuga de pavo y córtala fina. Sirve con pan, el aceite medido y la fruta aparte.'});
}
for(const [protein,index] of ['turkey','chicken','eggwhite'].map((f,i)=>[f,i] as const)){
 for(const fat of ['avocado','olive']){
  const fixed:[string,number][]=[['tomato',100]];if(protein==='eggwhite')fixed.push(['egg',50]);
  const recipe={name:`Tostadas de ${protein==='eggwhite'?'huevo':proteinNames[protein].toLowerCase()} con ${fat==='avocado'?'aguacate':'tomate y aceite'}`,vars:[protein,'bread',fat],fixed,prep:'Cocina bien la carne o el huevo y las claras. Sirve sobre el pan con el tomate y el aguacate o aceite medidos.'};
  breakfastTemplates.push(recipe);snackTemplates.push(recipe);
 }
}
for(const [pi,protein] of ['chicken','turkey','beef','tofu','eggwhite'].entries()){
 for(const [ci,carb] of Object.keys(carbNames).entries()){
  const veg=Object.keys(vegetableNames)[(pi*2+ci)%7];
  const fixed:[string,number][]=[[veg,180]];
  if(protein==='eggwhite')fixed.push(['egg',100]);
  mainTemplates.push({name:`${proteinNames[protein]} con ${carbNames[carb]} y ${vegetableNames[veg]}`,vars:[protein,carb,'olive'],fixed,prep:protein==='eggwhite'?'Cocina el huevo y las claras en un revuelto. Prepara la guarnición y las verduras por separado y mide el aceite total.':protein==='tofu'?'Dora el tofu con parte del aceite. Cocina la guarnición y las verduras; usa el resto del aceite para aliñar.':'Cocina bien la carne. Cuece el cereal o asa la patata o el boniato. Añade las verduras y mide todo el aceite utilizado.'});
 }
}
for(const legume of ['lentils','chickpeas','beans']){
 for(const [i,protein] of ['chicken','turkey','tofu'].entries()){
  const carb=['rice','couscous','pasta'][i];const veg=['carrot','spinach','pepper'][i];
  mainTemplates.push({name:`${foodById(legume).name} con ${proteinNames[protein].toLowerCase()} y ${carbNames[carb]}`,vars:[protein,carb,'olive'],fixed:[[legume,100],[veg,150]],prep:'Escurre las legumbres y caliéntalas con las verduras. Cocina la proteína y el cereal por separado, combina y añade el aceite medido.'});
 }
}

export const planDays=(p:Plan):MenuDay[]=>p.week??[{day:'Menú anterior',meals:p.meals}];
export const allPlanItems=(p:Plan)=>planDays(p).flatMap(d=>d.meals.flatMap(m=>m.items));
export function shoppingList(plan:Plan,dayCount=7){const sums=new Map<string,Item>();for(const d of planDays(plan).slice(0,dayCount))for(const meal of d.meals)for(const it of meal.items)sums.set(it.food.id,{food:it.food,grams:(sums.get(it.food.id)?.grams??0)+it.grams});return [...sums.values()].sort((a,b)=>a.food.name.localeCompare(b.food.name,'es'));}
function solve(matrix:number[][],v:number[]){const a=matrix.map((row,i)=>[...row,v[i]]);for(let i=0;i<3;i++){let pivot=i;for(let j=i+1;j<3;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;[a[i],a[pivot]]=[a[pivot],a[i]];if(Math.abs(a[i][i])<1e-8)return null;const d=a[i][i];for(let k=i;k<4;k++)a[i][k]/=d;for(let j=0;j<3;j++)if(j!==i){const f=a[j][i];for(let k=i;k<4;k++)a[j][k]-=f*a[i][k];}}return a.map(r=>r[3]);}
function recipeMeal(t:Template,profile:Profile,ratio:number,override?:Macro):Meal|null{
 const ids=[...t.vars,...t.fixed.map(x=>x[0])];
 if(ids.some(id=>profile.excluded.includes(id)||profile.preparation?.foodPreferences?.foods[id]==='avoid'||foodById(id).allergens.some(a=>profile.allergens.includes(a))))return null;
 const target=override??targets(profile),fixed=t.fixed.map(([id,g])=>item(id,g)),m=total(fixed),vars=t.vars.map(foodById),keys=['p','c','f'] as const;
 const q=solve(keys.map(k=>vars.map(f=>f[k]/100)),keys.map(k=>target[k]*ratio-m[k]));
 if(!q||q.some(g=>!Number.isFinite(g)||g<5||g>600))return null;
 const meat=ids.some(id=>id==='chicken'||id==='beef'||id==='turkey');
 const style=profile.preparation?.foodPreferences?.proteinStyle;
 const prep=meat&&style&&style!=='any'?t.prep+(style==='fillet'?' Usa filetes o pechuga sin hueso.':' Puedes usar la misma carne picada magra; comprueba la etiqueta si cambia el contenido de grasa.') :t.prep;
 const result={name:t.name,prep:prep+(profile.preparation?.foodPreferences?.certification==='halal'?' · Si requiere certificación halal, comprueba el envase o consulta al proveedor.':''),items:[...vars.map((food,i)=>({food,grams:Math.round(q[i])})),...fixed]};
 if(Math.abs(total(result.items).k-target.k*ratio)>target.k*ratio*.065)return null;
 return result;
}
function noise(seed:number,text:string){let h=seed|0;for(let i=0;i<text.length;i++){h=Math.imul(h^text.charCodeAt(i),16777619)}return (h>>>0)/4294967296}
export function generatePlan(profile:Profile,seed:number,previous?:Plan,override?:Macro):Plan|null{
 const target=override??targets(profile),week:MenuDay[]=[],slots=mealSlots(profile.mealCount??5),fractions=mealFractions(profile.mealCount??5);
 const usedNames=new Set<string>(),uses=new Map<string,number>();
 const preferences=profile.preparation?.foodPreferences;
 const preferred=new Set(profile.onboarding?.completed?.answers.food.preferred??[]);
 const previousNames=new Set(previous?planDays(previous).flatMap(d=>d.meals.map(m=>m.name)):[]);
 for(let d=0;d<7;d++){
  const meals:Meal[]=[];
  for(let slot=0;slot<slots.length;slot++){
   const identity=slots[slot];
   const templates=identity===0?breakfastTemplates:(identity===1||identity===3||identity===5)?snackTemplates:mainTemplates;
   const previousMeal=previous?.week?.[d]?.meals[slot];
   const candidates=templates.map(t=>recipeMeal(t,profile,fractions[slot],target)).filter((m):m is Meal=>!!m&&m.name!==previousMeal?.name);
   const score=(m:Meal)=> {
    const repeat=preferences?.variety==='repeat',balanced=preferences?.variety==='balanced';
    const reward=m.items.reduce((n,it)=>n+(preferences?.foods[it.food.id]==='usual'?18:preferences?.foods[it.food.id]==='like'?5:preferred.has(it.food.id)?1.5:0),0);
    return (usedNames.has(m.name)?repeat?-3:balanced?5:preferences?12:1000:0)+(previousNames.has(m.name)?2:0)-reward+
      m.items.filter(it=>it.food.id!=='olive').reduce((a,it)=>a+(uses.get(it.food.id)??0)*(repeat?0:.28),0)+noise(seed*7919+(repeat?0:d*311)+slot*101,m.name)*3;
   };
   candidates.sort((a,b)=>score(a)-score(b));
   const meal=candidates[0];if(!meal)return null;
   meals.push(meal);usedNames.add(meal.name);for(const it of meal.items)uses.set(it.food.id,(uses.get(it.food.id)??0)+1);
  }
  const m=total(meals.flatMap(x=>x.items));if(Math.abs(m.k-target.k)>target.k*.05)return null;
  week.push({day:weekdays[d],meals});
 }
 return {id:crypto.randomUUID(),created:new Date().toISOString(),seed,target,meals:week[0].meals,week};
}
/** Replace only the requested day or meal; retain every other meal unchanged. */
export function updateMenuSelection(profile:Profile,plan:Plan,dayIndex:number,slot?:number):Plan|null{
 const days=planDays(plan),day=days[dayIndex];
 if(!Number.isInteger(dayIndex)||!day||slot!==undefined&&(!Number.isInteger(slot)||!day.meals[slot]))return null;
 const generated=generatePlan(profile,plan.seed+1,plan);if(!generated?.week)return null;
 const replacements=generated.week[dayIndex].meals;
 const meals=day.meals.map((meal,i)=>slot===undefined||slot===i?replacements[i]:meal);
 if(!plan.week)return {...plan,id:generated.id,created:generated.created,seed:generated.seed,meals};
 const week=plan.week.map((d,i)=>i===dayIndex?{...d,meals}:d);
 return {...plan,id:generated.id,created:generated.created,seed:generated.seed,week,meals:week[0].meals};
}
export function upgradeWeeklyState(state:State):State{
 let changed=false;
 const profiles=state.profiles.map(p=>{const last=p.plans.at(-1);if(!p.confirmed||last?.week)return p;const next=generatePlan(p,(last?.seed??0)+1,last);if(!next)return p;changed=true;return {...p,plans:[...p.plans,next].slice(-36)}});
 return changed?{...state,profiles}:state;
}
export function newProfile(name='Nuevo perfil'):Profile{return {id:crypto.randomUUID(),name,age:30,sex:'male',height:175,weight:70,goal:75,activity:1.6,surplus:300,waterGoal:2500,confirmed:false,allergens:[],excluded:[],health:'Pendiente de confirmar.',training:'Frecuencia y duración pendientes de confirmar.',budget:'Pendiente.',plans:[],days:{}}}
export function initialState():State{const p=newProfile();return {profiles:[p],active:p.id}}
export function emptyDay(p:Profile):Day{return {items:[],water:0,weight:null,steps:null,minutes:0,training:'',sleep:null,notes:'',complete:false,target:targets(p)}}
export const dateKey=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
export function weightTrend(p:Profile){const entries=Object.entries(p.days).filter(([,d])=>d.weight!=null).sort(([a],[b])=>a.localeCompare(b));if(!entries.length)return null;const last=entries.at(-1)![0];const age=(date:string)=>(Date.parse(last+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000;const a=entries.filter(([d])=>age(d)<7);const b=entries.filter(([d])=>age(d)>=7&&age(d)<14);if(a.length<3||b.length<3)return null;const avg=(xs:typeof entries)=>xs.reduce((s,[,d])=>s+d.weight!,0)/xs.length;return {current:avg(a),previous:avg(b),change:avg(a)-avg(b),end:last};}
