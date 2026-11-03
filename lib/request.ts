export const MAX_BYTES=2_000_000;
export function sameOrigin(request:Request){
  const origin=request.headers.get('origin');
  return !!origin&&origin===new URL(request.url).origin;
}
export async function readLimitedJson(request:Request){
  if(Number(request.headers.get('content-length'))>MAX_BYTES)throw new RangeError('Registro demasiado grande.');
  if(!request.body)throw new SyntaxError('Faltan datos.');
  const reader=request.body.getReader();const parts:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES){await reader.cancel();throw new RangeError('Registro demasiado grande.')}parts.push(value)}
  const data=new Uint8Array(size);let offset=0;for(const part of parts){data.set(part,offset);offset+=part.length}
  return JSON.parse(new TextDecoder().decode(data));
}
export function reply(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0'}})}
