import type {Food,Profile} from './model';
export const foodGroups=['Todos','Habituales','Carnes y huevos','Embutidos y fiambres','Pescados y mariscos','Lácteos','Legumbres y vegetales proteicos','Cereales y féculas','Verduras y hortalizas','Frutas','Frutos secos, semillas y grasas','Bebidas y batidos','Dulces y salsas','Platos preparados','Otros'];
const baseGroups:Record<string,string[]>={
 'Carnes y huevos':['chicken','turkey','beef','egg','eggwhite'],
 'Embutidos y fiambres':['turkey-slices'],
 'Lácteos':['yogurt','cheese','quark','cottage','milk'],
 'Legumbres y vegetales proteicos':['lentils','chickpeas','beans','tofu'],
 'Cereales y féculas':['oats','rice','pasta','couscous','bread','potato','cornflakes','tortilla','quinoa','sweetpotato','rice-cooked','pasta-cooked'],
 'Verduras y hortalizas':['veg','tomato','broccoli','carrot','zucchini','pepper','spinach','greenbeans'],
 'Frutas':['banana','apple','dates','orange','pear','kiwi','berries','raisins'],
 'Frutos secos, semillas y grasas':['olive','peanut','nuts','almonds','avocado'],
 'Bebidas y batidos':['coffee','whey'], 'Dulces y salsas':['sugar'],
};
export const normalizeFood=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const foodGroup=(f:Food)=>f.group??Object.entries(baseGroups).find(([,ids])=>ids.includes(f.id))?.[0]??'Otros';
const aliases:Record<string,string>={banana:'banana platano',potato:'papa patata',sweetpotato:'batata boniato camote',peanut:'mani cacahuete mantequilla',greenbeans:'ejotes habichuelas judias verdes',whey:'whey proteina batido suplemento',coffee:'cafe espresso expreso',beans:'frijoles alubias judias', 'usda-175179':'gamba camaron langostino', 'usda-171955':'bacalao', 'usda-168556':'ketchup catsup kétchup', 'usda-172684':'pan centeno', 'usda-174030':'ternera res vacuno carne picada'};
const searchTextCache=new WeakMap<Food,string>();
const searchForm=(value:string)=>normalizeFood(value).replace(/\bintegrales\b/g,'integral').replace(/\bnormales\b/g,'normal');
export function foodSearchText(food:Food){
 const cached=searchTextCache.get(food);if(cached!==undefined)return cached;
 let name=searchForm(food.name+' '+(aliases[food.id]??''));const productName=searchForm(food.name.split(' · ')[0]);
 // Regional names for puffed rice/corn cakes, not for pancakes or wheat toast.
 if(/\btortitas?\b/.test(productName)&&/\b(arroz|maiz)\b/.test(productName)){
  name+=' tosta tostas tostada tostadas galleta galletas tortita tortitas';
  if(food.f<=8&&!/integral|choco|cacao|caramelo|avena|quinoa|sabor|queso|yogur|semillas|sesamo|coco|limon|fresa|vainilla/.test(productName))name+=' normal natural';
 }
 if(/^off-\d+$/.test(food.id))name+=' '+food.id.slice(4);
 searchTextCache.set(food,name);return name;
}
export function findFoods(catalog:Food[],query:string,group='Todos',recentIds=new Set<string>()){
 const normalized=searchForm(query);const terms=normalized.split(' ').filter(t=>t&&!['de','del','la','el','las','los','con'].includes(t));
 const cakeQuery=terms.some(t=>/^(tostas?|tostadas?|tortitas?|galletas?)$/.test(t))&&terms.some(t=>/^(arroz|maiz)$/.test(t));
 return catalog.filter(f=>(group==='Todos'||group==='Habituales'&&recentIds.has(f.id)||foodGroup(f)===group)&&terms.every(t=>foodSearchText(f).includes(t))&&(!cakeQuery||!terms.includes('integral')||searchForm(f.name.split(' · ')[0]).includes('integral'))).sort((a,b)=>{
  const score=(f:Food)=>(searchForm(f.name)===normalized?100:0)+(recentIds.has(f.id)?10:0);
  return score(b)-score(a);
 });
}
export function previousFoods(profile:Profile):Food[]{
 const unique=new Map<string,Food>();for(const [,day] of Object.entries(profile.days).sort(([a],[b])=>b.localeCompare(a)))for(const {food} of day.items)if(!unique.has(food.id))unique.set(food.id,food);
 return [...unique.values()];
}
export function foodSource(food:Food){
 if(/^off-\d{8,14}$/.test(food.id))return {label:'Open Food Facts',url:'https://world.openfoodfacts.org/product/'+food.id.slice(4)};
 if(/^usda-\d+$/.test(food.id))return {label:'USDA · referencia genérica',url:'https://fdc.nal.usda.gov/food-details/'+food.id.slice(5)+'/nutrients'};
 return null;
}
