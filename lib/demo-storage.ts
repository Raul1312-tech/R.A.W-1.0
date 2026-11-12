// A separate browser-only namespace. Never read or write account journals here.
export const DEMO_STORAGE_KEY='raw-1-0:demo:v1';
type StoragePort=Pick<Storage,'getItem'|'setItem'>;
export function readDemo(storage:StoragePort,key=DEMO_STORAGE_KEY):unknown|null{
  const value=storage.getItem(key);
  if(value===null)return null;
  try{return JSON.parse(value)}catch{throw new Error('No se pudo leer la copia de prueba guardada en este navegador.')}
}
export function writeDemo(storage:StoragePort,state:unknown,key=DEMO_STORAGE_KEY){
  const value=JSON.stringify(state);
  if(new TextEncoder().encode(value).length>2_000_000)throw new Error('La copia de prueba supera 2 MB. Exporta tu historial antes de reducirlo.');
  try{storage.setItem(key,value)}catch{throw new Error('El navegador no permite guardar más datos. Exporta tu historial para conservar los cambios.')}
}
