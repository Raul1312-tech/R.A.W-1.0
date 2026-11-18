import type {Macro} from './model';
const number=(n:number)=>Math.round(n).toLocaleString('es-ES');
export default function TodayNutrition({consumed,target}:{consumed:Macro;target:Macro}){
 return <section className="today-nutrition" aria-label="Energía y macronutrientes registrados hoy">
 <article className="card today-energy"><div className="today-stat-heading"><span>Energía registrada</span><small>{consumed.k>target.k?`${number(consumed.k-target.k)} kcal sobre la referencia`:`${number(Math.max(0,target.k-consumed.k))} kcal hasta tu referencia`}</small></div><div className="today-stat-value">{number(consumed.k)} <small>/ {number(target.k)} kcal</small></div><progress aria-label="Energía registrada respecto al objetivo" value={Math.min(consumed.k,target.k)} max={Math.max(1,target.k)}/></article>
 <div className="today-macro-grid">{([{key:'p',label:'Proteína'},{key:'c',label:'Hidratos'},{key:'f',label:'Grasas'}] as const).map(({key,label})=><article className={'card today-macro today-macro-'+key} key={key}><h2>{label}</h2><div className="today-stat-value">{number(consumed[key])} <small>/ {number(target[key])} g</small></div><progress aria-label={label+' registrada respecto al objetivo'} value={Math.min(consumed[key],target[key])} max={Math.max(1,target[key])}/></article>)}</div>
 <p className="today-nutrition-note">Cuenta lo que has registrado. Las comidas pendientes aún no se suman.</p>
 </section>;
}
