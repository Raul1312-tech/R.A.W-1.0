'use client';
import {useState} from 'react';
const quotes=[
  {text:'Apostar por la disciplina, que creo es la base para llegar a lo más alto.',author:'Saúl «Canelo» Álvarez',sport:'Boxeo',source:'GQ · entrevista, 2023',url:'https://www.gq.com.mx/deportes/articulo/saul-canelo-alvarez-entrevista-portada-negocios-caballos-box-y-pelicula-creed'},
  {text:'El trabajo duro dio sus frutos.',author:'Katie Taylor',sport:'Boxeo',source:'The Irish Times · 2019 · traducción',url:'https://www.irishtimes.com/sport/other-sports/katie-taylor-the-hard-work-paid-off-i-made-history-1.3913470'},
  {text:'Ningún ser humano tiene límites.',author:'Eliud Kipchoge',sport:'Atletismo',source:'World Athletics · 2019 · traducción',url:'https://worldathletics.org/awards/news/eliud-kipchoge-athlete-of-year-2019'},
  {text:'Me gusta ganar con esfuerzo.',author:'Rafa Nadal',sport:'Tenis',source:'RTVE · entrevista, 2013',url:'https://www.rtve.es/deportes/20130920/nadal-gusta-ganar-con-esfuerzo/748368.shtml'},
];
export default function Motivation({date}:{date:string}){const [step,setStep]=useState(0);const index=(Math.floor(Date.parse(date+'T12:00:00Z')/86400000)||0)+step;const q=quotes[index%quotes.length];return <aside className="motivation-card"><span className="eyebrow">EN TU ESQUINA · {q.sport}</span><blockquote>«{q.text}»</blockquote><b>{q.author}</b><div><a href={q.url} target="_blank" rel="noreferrer">{q.source} ↗</a><button className="text-button" onClick={()=>setStep(s=>s+1)} aria-label="Ver otra frase motivadora">Otra frase ↗</button></div><p>Tu ritmo. Tu proceso. Descansar también forma parte.</p></aside>}
