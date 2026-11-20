// 화면 설정의 기본값, 저장값 검증, 브라우저 저장
import {QUALITIES,MAX_FRET,hasChord} from './fretlogic.js';

export const STORAGE_KEY='fretguide.v3';
export const MAX_PROG=8; // 진행에 담을 수 있는 폼 수
export const DEFAULT={root:9,q:'min',label:'note',flat:false,prog:[]};

export function sanitize(s){
  const o={...DEFAULT,prog:[]};
  if(!s||typeof s!=='object') return o;
  // 데이터에 없는 근음·코드 조합이면 기본값
  if(Number.isInteger(s.root)&&QUALITIES.some(x=>x.id===s.q)&&hasChord(s.root,s.q)){ o.root=s.root; o.q=s.q; }
  if(['note','degree'].includes(s.label)) o.label=s.label;
  o.flat=!!s.flat;
  // 진행: 고른 폼을 운지(줄마다 프렛)째로 보관한다. 모양이 맞지 않는 항목은 버린다.
  if(Array.isArray(s.prog)) o.prog=s.prog.filter(c=>c&&Number.isInteger(c.root)&&c.root>=0&&c.root<12&&QUALITIES.some(x=>x.id===c.q)
    &&Array.isArray(c.frets)&&c.frets.length===6&&c.frets.every(f=>f===null||(Number.isInteger(f)&&f>=0&&f<=MAX_FRET))&&c.frets.some(f=>f!==null))
    .slice(0,MAX_PROG).map(c=>({root:c.root,q:c.q,frets:c.frets.slice()}));
  return o;
}

export function loadState(){
  try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw) return sanitize(JSON.parse(raw)); }catch(e){}
  return null;
}
export function saveState(state){
  try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }catch(e){}
}
