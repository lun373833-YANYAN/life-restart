export const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const today=()=>dateKey();
export const addDays=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return dateKey(d)};
export const dayDiff=(a,b)=>Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);
export const lastDays=(n,end=today())=>Array.from({length:n},(_,i)=>addDays(end,i-n+1));
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// HTTP LAN origins provide getRandomValues but not necessarily randomUUID.
export function uid(source=globalThis.crypto){
 if(typeof source.randomUUID==='function')return source.randomUUID();
 const bytes=source.getRandomValues(new Uint8Array(16));
 bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function initialState(){return {version:1,theme:'light',planStart:null,tasks:[['带宠物出门散步','20 分钟'],['接触自然光','10—20 分钟'],['英语学习','15 分钟'],['给兴趣留点时间','阅读、咖啡研究或其他兴趣活动 20 分钟'],['完成一件家务','一件小事就好'],['睡前放下电子设备','按自己的节奏，少看一会儿']].map(([name,standard],i)=>({id:'default-'+i,name,standard,start:'1900-01-01',end:null})),checks:{},moods:{},sleep:{},alcohol:{},journal:[]}}
export function tasksFor(s,date){return s.checks[date]?.tasks||s.tasks.filter(t=>t.start<=date&&(!t.end||t.end>date))}
export function completion(s,date){const tasks=tasksFor(s,date);const done=tasks.filter(t=>s.checks[date]?.done?.includes(t.id)).length;return {done,total:tasks.length,percent:tasks.length?Math.round(done/tasks.length*100):0}}
export function planDay(s,date=today()){return s.planStart?dayDiff(date,s.planStart)+1:0}
export const MOODS={happy:['☺','开心'],calm:['◡','平静'],okay:['○','一般'],low:['☁','低落']};
export function sleepHours(bed,wake){const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));return ((mins(wake)-mins(bed)+1440)%1440)/60}
export const alcoholGrams=(ml,abv)=>ml*abv/100*0.789;
export function weekDates(date=today()){const offset=(new Date(date+'T12:00:00').getDay()+6)%7;const start=addDays(date,-offset);return Array.from({length:7},(_,i)=>addDays(start,i))}
export function alcoholStats(s,dates=weekDates()){let drinking=0,dry=0,unknown=0,grams=0;for(const d of dates){if(d>today())continue;const r=s.alcohol[d];if(!r){unknown++;continue}if(r.dry){dry++;continue}if(r.items.length){drinking++;grams+=r.items.reduce((n,x)=>n+alcoholGrams(x.ml,x.abv),0)}else unknown++}return {drinking,dry,unknown,grams}}
