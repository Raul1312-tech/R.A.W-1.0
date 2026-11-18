'use client';
import LateralCarousel from './lateral-carousel';
import {legendsForDate} from './boxing-legends';

export default function BoxingInspiration({date}:{date:string}){
  return <section className="boxing-inspiration" aria-label="Mentalidad de boxeo">
    <LateralCarousel label="Desde la esquina" slides={legendsForDate(date).map(legend=>({id:legend.id,label:legend.name,content:
      <article className="boxing-legend-card">
        <div className="boxing-legend-copy"><span className="boxing-legend-theme">{legend.theme}</span>
          <blockquote><p>«{legend.quote}»</p><cite>{legend.name}</cite></blockquote>
          <details className="boxing-legend-source"><summary>Sobre esta frase</summary><p>Traducción al español. <a href={legend.url} target="_blank" rel="noreferrer">{legend.source} ↗</a></p><p>Retrato generado con IA.</p></details>
        </div>
        <figure><img src={'/boxing-legends/'+legend.id+'.webp'} width={600} height={800} loading="lazy" decoding="async" alt={'Retrato de '+legend.name+' generado con IA'}/><figcaption>Retrato IA</figcaption></figure>
      </article>
    }))}/>
  </section>;
}
