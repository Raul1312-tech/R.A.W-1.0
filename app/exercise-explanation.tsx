'use client';
import {useEffect,useState} from 'react';
import type {Exercise} from './training-model';
import {exerciseCatalog,findExerciseRecord,type ExerciseRecord} from './exercise-catalog';
import {loadExerciseCatalog} from '../lib/exercise-catalog-client';
export function useExerciseCatalog(){const [catalog,setCatalog]=useState(exerciseCatalog);useEffect(()=>{let live=true;loadExerciseCatalog().then(records=>{if(live)setCatalog(records)});return()=>{live=false}},[]);return catalog}
export function ExerciseExplanation({exercise,catalog}:{exercise:Pick<Exercise,'name'|'catalogId'>;catalog:ExerciseRecord[]}){
  const guide=findExerciseRecord(exercise,catalog);
  const art=guide?.image;
  return <details className="routine-explanation"><summary>Cómo se hace · {exercise.name}</summary>{guide&&art?<div className="routine-explanation-content"><figure><div className="routine-exercise-art" role="img" aria-label={`Ilustración orientativa en dos posiciones: ${exercise.name}`} style={{backgroundImage:`url("${art.src}")`,backgroundSize:`${art.columns*100}% ${art.rows*100}%`,backgroundPosition:`${art.columns===1?0:(art.tile%art.columns)*100/(art.columns-1)}% ${art.rows===1?0:Math.floor(art.tile/art.columns)*100/(art.rows-1)}%`,aspectRatio:`${1536/art.columns} / ${1024/art.rows}`}}/><figcaption>Ilustración generada con IA, orientativa. Sigue las indicaciones de texto y revisa la técnica con tu entrenador.</figcaption></figure><div><h4>Para qué sirve</h4><p>{guide.purpose}</p><h4>Paso a paso</h4><ol>{guide.steps.map(step=><li key={step}>{step}</li>)}</ol><h4>Evita este error</h4><p>{guide.mistake}</p><p className="routine-learning-tip"><b>Para empezar:</b> {guide.learn}</p></div></div>:<p>Este ejercicio importado no tiene una ficha reconocida en el catálogo. Revisa su nombre o consulta a tu entrenador antes de realizarlo.</p>}</details>;
}
