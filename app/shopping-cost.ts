import type {Item} from './model';

// Reference basket, not a live supermarket feed or a national statistical mean.
// Prices include VAT. pack is the purchasable quantity; yield is edible g per
// purchased g/ml (oil: g/ml). Ranges for unsampled foods are explicit estimates.
export const priceReviewDate='2026-11-04';
export const priceSources=[
  {name:'Carrefour · avena',url:'https://www.carrefour.es/supermercado/copos-de-avena-integral-original-carrefour-500-g/R-641402048/p'},
  {name:'Carrefour · arroz',url:'https://www.carrefour.es/supermercado/arroz-largo-categoria-1-carrefour-classic-1-kg/R-538408171/p'},
  {name:'Carrefour · fruta',url:'https://www.carrefour.es/supermercado/productos-frescos/verduras-y-hortalizas/cat220006/c'},
  {name:'Hipercor · hortalizas',url:'https://www.hipercor.es/supermercado/frescos/frutas-y-verduras/verduras-y-hortalizas/'},
  {name:'Carrefour · cottage',url:'https://www.carrefour.es/supermercado/queso-cottage-arla-200-g/R-VC4AECOMM-462139/p'},
  {name:'Carrefour · queso batido',url:'https://www.carrefour.es/supermercado/sensationproteina-el-mercado-otra-variedad-de-queso/F-1kd4fZ10flZ16xw/g'},
  {name:'La tenda d’Amir · pollo halal',url:'https://latendadamir.com/carniceria/pechuga-de-pollo-bandeja/'},
  {name:'Vilamercat · pollo halal',url:'https://compra.vilamercat.cat/es/halal/11716-1663-pechuga-de-pollo-halal.html'},
  {name:'FACUA · aceite de oliva',url:'https://super.facua.org/carrefour/aceite-de-oliva/'},
  {name:'Carrefour · lentejas escurridas',url:'https://www.carrefour.es/supermercado/lentejas-cocidas-al-natural-classic-carrefour-210-g/R-VC4AECOMM-551499/p'},
  {name:'Carrefour · frutos secos',url:'https://www.carrefour.es/supermercado/nav_frutossecos/nav_frutossecos/g'},
  {name:'Carrefour · leche entera',url:'https://www.carrefour.es/supermercado/la-despensa/lacteos-entera/F-10tjZ11cx/c'},
];
export type FoodPrice={low:number;high:number;pack:number;format:string;unit:'kg'|'l';yield:number;sources:number[];note?:string};
const price=(low:number,high:number,pack:number,format:string,sources:number[]=[],yieldFactor=1,unit:'kg'|'l'='kg',note?:string):FoodPrice=>({low,high,pack,format,sources,yield:yieldFactor,unit,note});
export const foodPrices:Record<string,FoodPrice>={
  oats:price(1.68,2.8,500,'bolsa de 500 g',[0]),
  rice:price(1.25,2.2,1000,'paquete de 1 kg',[1]),
  pasta:price(1.2,2.6,500,'paquete de 500 g'),
  couscous:price(2.4,4.5,500,'paquete de 500 g'),
  bread:price(2,4,500,'pan de 500 g'),
  potato:price(1,2.8,1000,'bolsa de 1 kg',[3],.9),
  chicken:price(7.8,10.3,1000,'bandeja de 1 kg',[6,7]),
  turkey:price(9,14,500,'bandeja de 500 g',[],1,'kg','Estimación de pavo; confirma el precio en tu carnicería.'),
  beef:price(13,22,500,'bandeja de 500 g',[],1,'kg','Estimación para ternera magra; el corte cambia mucho el precio.'),
  egg:price(4.5,7,300,'caja de 6 huevos (≈300 g comestibles)'),
  yogurt:price(3.5,6,500,'pack de 500 g'),
  milk:price(.94,1.3,1000,'brik de 1 l',[11],1,'l'),
  lentils:price(2.5,3.57,210,'bote de 210 g escurridos',[9]),
  chickpeas:price(2,3.5,400,'bote de 400 g escurridos'),
  beans:price(2.2,4,400,'bote de 400 g escurridos'),
  tofu:price(5,9,400,'pack de 400 g'),
  olive:price(3.89,5.19,1000,'botella de 1 l',[8],.916,'l','Conversión orientativa: 1 l ≈916 g de aceite.'),
  peanut:price(5,9,500,'tarro de 500 g'),
  nuts:price(10,17,200,'bolsa de 200 g peladas'),
  almonds:price(11.95,14.75,200,'bolsa de 200 g peladas',[10]),
  banana:price(1.47,2.75,150,'pieza de ≈150 g con piel',[2],.66),
  apple:price(1.8,3.5,180,'pieza de ≈180 g',[],.9),
  dates:price(5,12,200,'bolsa de 200 g sin hueso'),
  veg:price(1.5,3.5,1000,'bolsa congelada de 1 kg'),
  tomato:price(2,3.49,150,'pieza de ≈150 g',[3],.95),
  cheese:price(5,9,250,'tarrina de 250 g'),
  quark:price(2.74,4,500,'tarrina de 500 g',[5]),
  cottage:price(7.95,12.75,200,'tarrina de 200 g',[4,5]),
  eggwhite:price(3.5,6,1000,'botella de 1 kg'),
  cornflakes:price(2.5,5,500,'caja de 500 g'),
  tortilla:price(3,5.5,320,'paquete de 320 g'),
  quinoa:price(4.5,8,500,'paquete de 500 g'),
  sweetpotato:price(2,3.5,300,'pieza de ≈300 g',[],.9),
  avocado:price(4,6.5,200,'pieza de ≈200 g con piel y hueso',[2],.7),
  orange:price(1.5,3,200,'pieza de ≈200 g con piel',[],.72),
  pear:price(2,3.8,180,'pieza de ≈180 g',[],.9),
  kiwi:price(3.5,5.5,100,'pieza de ≈100 g con piel',[2],.85),
  berries:price(5,10,300,'bolsa congelada de 300 g'),
  raisins:price(4,8,250,'bolsa de 250 g'),
  broccoli:price(2,4,500,'bolsa congelada de 500 g'),
  carrot:price(1.25,2.33,1000,'bolsa de 1 kg',[3],.9),
  zucchini:price(1.5,3,250,'pieza de ≈250 g',[3],.95),
  pepper:price(2.95,3.99,200,'pieza de ≈200 g',[3],.82),
  spinach:price(1.8,3.5,500,'bolsa congelada de 500 g'),
  greenbeans:price(2.5,5,1000,'bolsa congelada de 1 kg'),
  whey:price(20,40,1000,'bolsa de 1 kg',[],1,'kg','Revisa la etiqueta del suplemento.'),
  'turkey-slices':price(12,22,200,'envase de 200 g',[],1,'kg','Estimación para pavo en lonchas.'),
  sugar:price(1,1.8,1000,'paquete de 1 kg'),
};
const mercadonaSource=priceSources.push({name:'Mercadona · catálogo CP 28054 · consulta 05/11/2026',url:'https://tienda.mercadona.es/'})-1;
const checked=(perUnit:number,pack:number,format:string,unit:'kg'|'l'='kg',yieldFactor=1)=>price(perUnit/(pack/1000),perUnit/(pack/1000),pack,format,[mercadonaSource],yieldFactor,unit,'Precio observado en Mercadona para 28054 el 05/11/2026. No se actualiza solo; verifica antes de comprar.');
Object.assign(foodPrices,{
 quark:checked(1.10,500,'tarrina de queso fresco batido 0 % Hacendado de 500 g'),
 nuts:checked(2.40,200,'paquete de nueces Hacendado peladas de 200 g'),
 almonds:checked(2.30,200,'paquete de almendra natural Hacendado de 200 g'),
 egg:checked(2.85,600,'12 huevos medianos M (≈600 g comestibles)'),
 oats:checked(1.30,800,'caja Brüggen de 800 g'),
 rice:checked(1.20,1000,'paquete de arroz largo Hacendado de 1 kg'),
 pasta:checked(1.20,1000,'paquete de spaghetti Hacendado de 1 kg'),
 milk:checked(.96,1000,'brik de leche entera Hacendado de 1 l','l'),
 olive:checked(4.35,1000,'botella de aceite de oliva virgen extra Hacendado de 1 l','l',.916),
 chickpeas:checked(.80,400,'tarro de garbanzos Hacendado de 400 g escurridos'),
});
const cents=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function estimateShopping(items:Item[],owned:ReadonlySet<string>=new Set(),overrides:Record<string,{perKg:number;packGrams:number;checked:string;source:string}>={}){
  const rows=items.filter(it=>Number.isFinite(it.grams)&&it.grams>0).map(it=>{
    const custom=overrides[it.food.id];const ref=custom?{low:custom.perKg,high:custom.perKg,pack:custom.packGrams,format:custom.packGrams+' g/ml (formato indicado)',unit:foodPrices[it.food.id]?.unit??'kg',yield:foodPrices[it.food.id]?.yield??1,sources:[],note:'Precio indicado · '+custom.checked+' · '+custom.source}:foodPrices[it.food.id];const have=owned.has(it.food.id);
    if(!ref)return {...it,have,ref:null,cost:null};
    const required=it.grams/ref.yield;const packs=ref.pack?Math.ceil((required-1e-7)/ref.pack):0;
    const purchase=ref.pack?packs*ref.pack:Math.ceil(required/10)*10;
    const mid=(ref.low+ref.high)/2;
    return {...it,have,ref,cost:{required,packs,purchase,used:cents(required/1000*mid),mean:cents(purchase/1000*mid),low:cents(purchase/1000*ref.low),high:cents(purchase/1000*ref.high)}};
  });
  const pending=rows.filter(r=>!r.have);const priced=pending.filter(r=>r.cost);
  return {rows,unknown:pending.filter(r=>!r.cost).length,pending:pending.length,mean:cents(priced.reduce((n,r)=>n+r.cost!.mean,0)),low:cents(priced.reduce((n,r)=>n+r.cost!.low,0)),high:cents(priced.reduce((n,r)=>n+r.cost!.high,0)),used:cents(rows.reduce((n,r)=>n+(r.cost?.used??0),0))};
}
export const euros=(n:number)=>n.toLocaleString('es-ES',{style:'currency',currency:'EUR'});
export const priceDateLabel=()=>new Date(priceReviewDate+'T12:00:00Z').toLocaleDateString('es-ES');
export function pricesAreOld(today=Date.now()){return today-Date.parse(priceReviewDate+'T00:00:00Z')>30*86400000}
export function shoppingText(estimate:ReturnType<typeof estimateShopping>,days:number,period?:string){return `R.A.W · Lista de compra · ${days} días${period?' · '+period:' desde el lunes'}\nEstimación orientativa · España · Referencias revisadas: ${priceDateLabel()} (sin actualización en tiempo real).\n${estimate.unknown?'Subtotal estimado (faltan precios)':'Compra estimada'}: ${euros(estimate.mean)} · Horquilla orientativa: ${euros(estimate.low)}–${euros(estimate.high)}\nCoste proporcional del menú: ${euros(estimate.used)}${estimate.rows.some(r=>!r.cost)?' (parcial)':''}\nEnvases orientativos completos. IVA incluido; envío excluido.\n\n`+estimate.rows.map(r=>`${r.have?'[YA LO TENGO]':'[ ]'} ${r.food.name}: ${Math.round(r.grams)} ${r.food.unit.includes('ml')?'ml':'g'} para el menú (${r.food.unit}). ${r.cost&&r.ref?`Compra: ${r.cost.packs?`${r.cost.packs} × ${r.ref.format}`:`≈${Math.round(r.cost.purchase)} g ${r.ref.format}`} · ${r.have?euros(0):euros(r.cost.mean)} · ${r.ref.note??(r.ref.sources.length?'Referencia con precios consultados':'Precio orientativo sin cotización individual')}`:'Sin precio: no incluido en el total'}`).join('\n')+'\n\nMétodo: punto medio de rangos orientativos, no media estadística de supermercados. Frutas: merma aproximada; legumbres: peso escurrido; aceite: conversión g/l. Formatos supuestos, sin descuentos ni promociones.\nFuentes consultadas como referencia de precios.\n'+priceSources.map(s=>`${s.name}: ${s.url}`).join('\n')}
