export const PHOTO_BUCKET='progress-photos';
export const PHOTO_LIMIT=2_000_000;
export const photoViews={front:'Frontal',side:'Lateral',back:'Espalda'} as const;
export type PhotoView=keyof typeof photoViews;
export type ProgressPhoto={id:string;profile:string;date:string;view:PhotoView;blob?:Blob};
export function validProfile(value:string){return /^[a-zA-Z0-9_-]{1,100}$/.test(value)}
export function validPhotoDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value}
export function validView(value:string):value is PhotoView{return Object.hasOwn(photoViews,value)}
export function photoName(date:string,view:PhotoView,id:string){if(!validPhotoDate(date)||!validView(view)||!/^[-a-f0-9]{36}$/.test(id))throw Error('Datos de foto no válidos.');return `${date}_${view}_${id}.jpg`}
export function parsePhotoName(name:string,profile:string):ProgressPhoto|null{const match=/^(\d{4}-\d{2}-\d{2})_(front|side|back)_([a-f0-9-]{36})\.jpg$/.exec(name);return match&&validPhotoDate(match[1])&&validProfile(profile)?{id:name,profile,date:match[1],view:match[2] as PhotoView}:null}
export function comparablePhotos(photos:ProgressPhoto[],view:PhotoView){return photos.filter(p=>p.view===view).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))}
export async function readPhotoBody(request:Request){
  if(request.headers.get('content-type')!=='image/jpeg')throw Error('Utiliza una imagen JPEG.');
  if(Number(request.headers.get('content-length'))>PHOTO_LIMIT)throw Error('La foto supera 2 MB.');
  if(!request.body)throw Error('Falta la foto.');const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>PHOTO_LIMIT){await reader.cancel();throw Error('La foto supera 2 MB.')}chunks.push(value)}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length}
  if(size<4||bytes[0]!==255||bytes[1]!==216||bytes[size-2]!==255||bytes[size-1]!==217)throw Error('El archivo no es un JPEG válido.');return bytes;
}
