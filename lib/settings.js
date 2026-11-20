// 화면 설정의 기본값, 저장값 검증, 브라우저 저장
import {QUALITIES,hasFormsNAt,hasTopAt} from './fretlogic.js';

export const STORAGE_KEY='fretguide.v2';
export const MAX_PROG=8;
export const FRET_MAX=12; // 프렛 하한의 최댓값 (0 = 전체)
export const DEFAULT={root:9,q:'m7',rs:4,label:'finger',flat:false,octave:false,fmin:0,mode:'chord',prog:[],progDone:false,progN:4,top:null};

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
  if(['chord','prog'].includes(s.mode)) o.mode=s.mode;
  if(Array.isArray(s.prog)) o.prog=s.prog.filter(c=>c&&Number.isInteger(c.root)&&c.root>=0&&c.root<12&&QUALITIES.some(x=>x.id===c.q)).slice(0,MAX_PROG).map(c=>{ const n=QUALITIES.find(x=>x.id===c.q).tones.length; return Number.isInteger(c.top)&&c.top>=0&&c.top<n?{root:c.root,q:c.q,top:c.top}:{root:c.root,q:c.q}; });
  o.progDone=!!s.progDone&&o.prog.length>0;
  if([1,2,3,4,5,6].includes(s.progN)) o.progN=s.progN;
  if(Number.isInteger(s.top)&&s.top>=0&&s.top<4) o.top=s.top;
  // 저장된 조합이 불가능하면 음 개수, 베이스, 프렛, 하이톤 순으로 기본값으로 되돌린다
  if(!hasFormsNAt(o.root,o.q,o.rs,o.progN,'any',0)) o.progN=DEFAULT.progN;
  if(!hasFormsNAt(o.root,o.q,o.rs,o.progN,'any',0)) o.rs=DEFAULT.rs;
  if(o.fmin&&!hasFormsNAt(o.root,o.q,o.rs,o.progN,'any',o.fmin)) o.fmin=0; // 프렛 하한으로 폼이 없어지면 전체로
  if(o.top!==null&&(o.top>=QUALITIES.find(x=>x.id===o.q).tones.length||!hasTopAt(o.root,o.q,o.rs,o.progN,'any',o.fmin,o.top))) o.top=null;
  return o;
}

export function loadState(){
  try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw) return sanitize(JSON.parse(raw)); }catch(e){}
  return null;
}
export function saveState(state){
  try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }catch(e){}
}
