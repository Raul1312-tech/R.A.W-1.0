// Stable meal identities keep saved dishes in the same part of the day.
export const mealLabels=['Primera comida','Tentempié','Comida','Merienda','Cena','Recena'];
const slots:Record<number,number[]>={2:[0,4],3:[0,2,4],4:[0,2,3,4],5:[0,1,2,3,4],6:[0,1,2,3,4,5]};
const portions:Record<number,number[]>={2:[.5,.5],3:[.28,.38,.34],4:[.25,.32,.15,.28],5:[.22,.12,.28,.12,.26],6:[.2,.1,.25,.1,.25,.1]};
export const mealSlots=(count:number)=>slots[count]??slots[5];
export const mealLabelsFor=(count:number)=>mealSlots(count).map(slot=>mealLabels[slot]);
export const mealFractions=(count:number)=>portions[count]??portions[5];
export function mealTimes(count:number,schedule:string){
  const ranges:Record<string,[number,number]>={early:[7*60,21*60],regular:[8*60,22*60],late:[11*60,23*60],weekend:[10*60,23*60]};
  const [start,end]=ranges[schedule]??ranges.regular;
  return Array.from({length:count},(_,i)=>{
    const minutes=Math.round((start+(end-start)*i/(count-1))/15)*15;
    return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
  });
}
