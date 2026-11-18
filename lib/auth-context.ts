import {slugSchema} from './platform-model.ts';
export function loginDestination(company?:string|null,invite?:string|null){
 if(invite&&/^[a-f0-9]{64}$/.test(invite))return '/join/'+invite;
 return company&&slugSchema.safeParse(company).success?'/o/'+company:'/';
}
export function validReturnPath(path:string|undefined){return !!path&&(/^\/o\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)||/^\/join\/[a-f0-9]{64}$/.test(path))}
