// 화면 설정의 기본값, 저장값 검증, 브라우저 저장
import {QUALITIES,MAX_FRET,hasFormsNAt,hasTopAt} from './fretlogic.js';

export const STORAGE_KEY='fretguide.v2';
export const MAX_PROG=8; // 진행에 담을 수 있는 폼 수
export const FRET_MAX=12; // 프렛 하한의 최댓값 (0 = 전체)
export const DEFAULT={root:9,q:'m7',rs:4,label:'finger',flat:false,octave:false,fmin:0,nc:4,top:null,prog:[]};

export function sanitize(s){
  const o={...DEFAULT,prog:[]};
  if(!s||typeof s!=='object') return o;
  if(Number.isInteger(s.root)&&s.root>=0&&s.root<12) o.root=s.root;
  if(QUALITIES.some(x=>x.id===s.q)) o.q=s.q;
  if([6,5,4,3,2,1,'all'].includes(s.rs)) o.rs=s.rs;
  if(['finger','note','degree'].includes(s.label)) o.label=s.label;
  if(Number.isInteger(s.fmin)&&s.fmin>=0&&s.fmin<=FRET_MAX) o.fmin=s.fmin;
  o.flat=!!s.flat;
  o.octave=!!s.octave;
  // 진행: 고른 폼을 운지(줄마다 프렛)째로 보관한다. 모양이 맞지 않는 항목은 버린다.
  if(Array.isArray(s.prog)) o.prog=s.prog.filter(c=>c&&Number.isInteger(c.root)&&c.root>=0&&c.root<12&&QUALITIES.some(x=>x.id===c.q)
    &&Array.isArray(c.frets)&&c.frets.length===6&&c.frets.every(f=>f===null||(Number.isInteger(f)&&f>=0&&f<=MAX_FRET))&&c.frets.some(f=>f!==null))
    .slice(0,MAX_PROG).map(c=>({root:c.root,q:c.q,frets:c.frets.slice(),base:Number.isInteger(c.base)&&c.base>=0&&c.base<=MAX_FRET?c.base:null}));
  if([1,2,3,4,5,6].includes(s.nc)) o.nc=s.nc;
  if(Number.isInteger(s.top)&&s.top>=0&&s.top<4) o.top=s.top;
  // 저장된 조합이 불가능하면 음 개수, 베이스, 프렛, 하이톤 순으로 기본값으로 되돌린다
  if(!hasFormsNAt(o.root,o.q,o.rs,o.nc,'any',0)) o.nc=DEFAULT.nc;
  if(!hasFormsNAt(o.root,o.q,o.rs,o.nc,'any',0)) o.rs=DEFAULT.rs;
  if(o.fmin&&!hasFormsNAt(o.root,o.q,o.rs,o.nc,'any',o.fmin)) o.fmin=0; // 프렛 하한으로 폼이 없어지면 전체로
  if(o.top!==null&&(o.top>=QUALITIES.find(x=>x.id===o.q).tones.length||!hasTopAt(o.root,o.q,o.rs,o.nc,'any',o.fmin,o.top))) o.top=null;
  return o;
}

export function loadState(){
  try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw) return sanitize(JSON.parse(raw)); }catch(e){}
  return null;
}
export function saveState(state){
  try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }catch(e){}
}
