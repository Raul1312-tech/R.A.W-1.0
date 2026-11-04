export function slideIndex(ids:string[],selected:string|undefined,previous=0){const found=selected===undefined?-1:ids.indexOf(selected);return found>=0?found:Math.max(0,Math.min(previous,ids.length-1))}
export function nextRemaining(ids:string[],removed:string,remaining:string[]){const index=ids.indexOf(removed);return ids.slice(index+1).find(id=>remaining.includes(id))??remaining[0]}
export function swipeDirection(dx:number,dy:number){return Math.abs(dx)>=55&&Math.abs(dx)>Math.abs(dy)*1.4?(dx<0?1:-1):0}
