export const boxingLegends=[
  {id:'canelo',name:'Canelo Álvarez',theme:'Mentalidad de campeón',quote:'Nada es imposible en la vida, y menos en el boxeo.',source:'Llegada al combate Canelo–Jacobs · 2019',url:'https://www.boxing247.com/boxing-news/saul-canelo-alvarez-vs-daniel-jacobs-grand-arrivals-quotes-photos/116718'},
  {id:'ali',name:'Muhammad Ali',theme:'Ligero de pies. Firme de mente.',quote:'Flota como una mariposa, pica como una abeja.',source:'Muhammad Ali Center · guía de recursos',url:'https://alicenter.org/wp-content/uploads/2023/10/MAC-Resource-Library-About-Ali-Resource-Guide.pdf'},
  {id:'tyson',name:'Mike Tyson',theme:'La disciplina se entrena',quote:'Disciplina es hacer lo que odias, como si lo amaras.',source:'Fox News · entrevista · 2010',url:'https://www.foxnews.com/transcript/mike-tyson-i-live-a-boring-life-ive-learned-to-love'},
  {id:'lopez',name:'Teófimo López',theme:'El trabajo deja huella',quote:'Todo el trabajo duro dio sus frutos.',source:'Boxing News · entrevista · 2021',url:'https://boxingnewsonline.net/news/teofimo-lopez-vs-george-kambosos-postponed/'},
  {id:'usyk',name:'Oleksandr Usyk',theme:'Constancia por encima de las ganas',quote:'No tengo motivación. Tengo disciplina.',source:'The Guardian · entrevista · 2025',url:'https://www.theguardian.com/sport/2025/jul/20/essence-oleksandr-usyk-daniel-dubois-boxing-heavyweight-unification-title-fight-wembley'},
] as const;

/** Stable for the whole day, independent of timezone and render count. */
export function legendsForDate(date:string){
  const parsed=Date.parse(date+'T12:00:00Z');
  const first=Number.isFinite(parsed)?Math.floor(parsed/86400000)%boxingLegends.length:0;
  return [...boxingLegends.slice(first),...boxingLegends.slice(0,first)];
}
