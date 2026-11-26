// 화면 설정의 기본값, 저장값 검증, 브라우저 저장
import {QUALITIES,MAX_FRET,hasChord,isNote} from './fretlogic.js';

export const STORAGE_KEY='fretguide.v3';
export const MIN_BARS=4; // 처음 보이는 마디 수
export const MAX_PROG=8; // 마디는 최대 8개까지 늘릴 수 있다
export const MAX_LISTS=20; // 저장할 수 있는 진행 수
export const MAX_TITLE=30;
const emptyProg=()=>Array(MIN_BARS).fill(null);
export const newList=(title)=>({title,prog:emptyProg()});
export const DEFAULT={root:9,q:'min',n:0,label:'note',flat:false,lists:[newList('진행 1')],cur:0};

// 마디마다 고른 폼을 운지(줄마다 프렛)째로 보관한다. 빈 마디는 null, 모양이 맞지 않는 항목은 빈 마디로 본다.
export function cleanProg(arr){
  const valid=c=>c&&Number.isInteger(c.root)&&c.root>=0&&c.root<12&&QUALITIES.some(x=>x.id===c.q)
    &&Array.isArray(c.frets)&&c.frets.length===6&&c.frets.every(f=>f===null||(Number.isInteger(f)&&f>=0&&f<=MAX_FRET))&&c.frets.some(f=>f!==null);
  const validNote=c=>isNote(c)&&c.s>=0&&c.s<6&&Number.isInteger(c.f)&&c.f>=0&&c.f<=MAX_FRET;
  const slots=(Array.isArray(arr)?arr:[]).slice(0,MAX_PROG).map(c=>validNote(c)?{s:c.s,f:c.f}:valid(c)?{root:c.root,q:c.q,frets:c.frets.slice()}:null);
  while(slots.length<MIN_BARS) slots.push(null);
  return slots;
}
export const cleanTitle=t=>typeof t==='string'?t.replace(/[\u0000-\u001f]/g,'').slice(0,MAX_TITLE):'';

export function sanitize(s){
  const o={...DEFAULT,lists:[newList('진행 1')]};
  if(!s||typeof s!=='object') return o;
  // 데이터에 없는 근음·코드 조합이면 기본값
  if(Number.isInteger(s.root)&&QUALITIES.some(x=>x.id===s.q)&&hasChord(s.root,s.q)){ o.root=s.root; o.q=s.q; }
  if(Number.isInteger(s.n)&&s.n>=0&&s.n<=5) o.n=s.n; // 0=전체, 1~5=이웃한 줄 수
  if(['note','degree'].includes(s.label)) o.label=s.label;
  o.flat=!!s.flat;
  // 진행 목록: 제목과 마디. 예전 저장값(진행 하나뿐인 `prog`)은 첫 진행으로 옮긴다.
  if(Array.isArray(s.lists)&&s.lists.length){
    o.lists=s.lists.slice(0,MAX_LISTS).map((l,i)=>({title:cleanTitle(l&&l.title),prog:cleanProg(l&&l.prog)}));
    if(Number.isInteger(s.cur)&&s.cur>=0&&s.cur<o.lists.length) o.cur=s.cur; else o.cur=0;
  }else if(Array.isArray(s.prog)){
    o.lists=[{title:'진행 1',prog:cleanProg(s.prog)}];
  }
  return o;
}

// 진행을 링크(?p=...)로 주고받기 위한 변환. 한 마디는 `근음-종류-프렛들`(뮤트는 x), 지판음은 `N줄.프렛`(줄 0=6번 줄), 빈 마디는 `_`, 마디 사이는 `~`
export function encodeProg(prog){
  return prog.map(c=>!c?'_':isNote(c)?`N${c.s}.${c.f}`:`${c.root}-${c.q}-${c.frets.map(f=>f===null?'x':f).join('.')}`).join('~');
}
export function decodeProg(text){
  if(typeof text!=='string'||!text) return [];
  const raw=text.split('~').slice(0,MAX_PROG).map(part=>{
    const nm=/^N(\d)\.(\d+)$/.exec(part);
    if(nm) return {s:Number(nm[1]),f:Number(nm[2])};
    const [root,q,fr]=part.split('-');
    if(fr===undefined) return null;
    return {root:Number(root),q,frets:fr.split('.').map(f=>f==='x'?null:(/^\d+$/.test(f)?Number(f):NaN))};
  });
  const prog=cleanProg(raw); // 모양이 맞지 않는 마디는 비운다
  return prog.some(Boolean)?prog:[];
}

export function loadState(){
  try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw) return sanitize(JSON.parse(raw)); }catch(e){}
  return null;
}
export function saveState(state){
  try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }catch(e){}
}
