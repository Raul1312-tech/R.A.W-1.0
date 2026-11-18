import {moduleKeys,type Company,type ModuleKey} from './platform-model.ts';

export const companyProducts={
 boxing:{name:'Boxeo',summary:'Club, preparación física, carrera y nutrición para el boxeador.',available:['Alimentación personalizada','Físico y carrera','Calendario de club y sparring','Competición y pesaje'],next:['Inventario de material del centro'],modules:['nutrition','training','boxing','competition','ai','photos','learning','progress']},
 gym:{name:'Musculación',summary:'Fuerza, hipertrofia, progresión y alimentación adaptada.',available:['Rutinas de musculación','Series, cargas y progresión','Alimentación personalizada','Seguimiento'],next:['Inventario real de máquinas y material'],modules:['nutrition','training','ai','photos','learning','progress']},
 academy:{name:'Preparación física de oposiciones',summary:'Carrera, fuerza, recuperación y nutrición para preparar las pruebas físicas.',available:['Base de entrenamiento y nutrición','Plantillas propias del centro','Seguimiento de alumnos'],next:['Pruebas por convocatoria y baremos','Fecha objetivo y periodización específica'],modules:['nutrition','training','ai','photos','progress']},
 mixed:{name:'Centro multidisciplinar',summary:'Configura los servicios de entrenamiento y nutrición de tu centro.',available:['Alimentación personalizada','Biblioteca de rutinas','Equipo y seguimiento'],next:['Inventario por sede y actividad'],modules:['nutrition','training','ai','photos','learning','progress']}
} as const;
export function productModules(kind:Company['kind']):Record<ModuleKey,boolean>{
 const selected:readonly string[]=companyProducts[kind].modules;
 return Object.fromEntries(moduleKeys.map(key=>[key,selected.includes(key)])) as Record<ModuleKey,boolean>;
}
