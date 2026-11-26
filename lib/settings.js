// 화면 설정의 기본값, 저장값 검증, 브라우저 저장, 진행 링크 변환
// 진행(list)은 마디(bar)들이고, 마디 하나는 { div, chords, notes }:
//   div    마디에 들어가는 코드 수 (1·2·4)
//   chords 길이 div의 배열. 항목은 { root, q, frets } 또는 빈 칸 null
//   notes  멜로디. 항목은 { s, f } (s: 0=6번 줄 … 5=1번 줄, f: 프렛), 최대 MAX_NOTES개
import {QUALITIES,MAX_FRET,hasChord,isNote} from './fretlogic.js';

export const STORAGE_KEY='fretguide.v3';
export const MIN_BARS=4;   // 처음 보이는 마디 수
export const MAX_PROG=8;   // 마디는 최대 8개까지 늘릴 수 있다
export const MAX_LISTS=20; // 저장할 수 있는 진행 수
export const MAX_TITLE=30;
export const MAX_NOTES=8;  // 한 마디의 멜로디 음 수
export const DIVS=[1,2,4];

export const newBar=(div=1)=>({div,chords:Array(div).fill(null),notes:[]});
export const emptyBars=()=>Array.from({length:MIN_BARS},()=>newBar());
export const newList=(title)=>({title,bars:emptyBars()});
export const barIsEmpty=b=>!b.chords.some(Boolean)&&!b.notes.length;
export const DEFAULT={root:9,q:'min',n:0,label:'note',flat:false,lists:[newList('진행 1')],cur:0};

// 코드/음 항목 하나 검증: 맞으면 복사본, 아니면 null
export function cleanChord(c){
  const ok=c&&typeof c==='object'&&Number.isInteger(c.root)&&c.root>=0&&c.root<12&&QUALITIES.some(x=>x.id===c.q)
    &&Array.isArray(c.frets)&&c.frets.length===6&&c.frets.every(f=>f===null||(Number.isInteger(f)&&f>=0&&f<=MAX_FRET))&&c.frets.some(f=>f!==null);
  return ok?{root:c.root,q:c.q,frets:c.frets.slice()}:null;
}
export function cleanNote(n){
  const ok=isNote(n)&&n.s>=0&&n.s<6&&Number.isInteger(n.f)&&n.f>=0&&n.f<=MAX_FRET;
  return ok?{s:n.s,f:n.f}:null;
}
// 마디 목록 검증. 예전 저장값(마디마다 코드 하나 또는 음 하나, 빈 마디 null)도 읽어 들인다.
export function cleanBars(arr){
  const bars=(Array.isArray(arr)?arr:[]).slice(0,MAX_PROG).map(b=>{
    if(b&&Array.isArray(b.chords)){
      const div=DIVS.includes(b.div)?b.div:(DIVS.includes(b.chords.length)?b.chords.length:1);
      const chords=Array.from({length:div},(_,i)=>cleanChord(b.chords[i]));
      const notes=(Array.isArray(b.notes)?b.notes:[]).map(cleanNote).filter(Boolean).slice(0,MAX_NOTES);
      return {div,chords,notes};
    }
    const note=cleanNote(b),chord=note?null:cleanChord(b);
    return {div:1,chords:[chord],notes:note?[note]:[]};
  });
  while(bars.length<MIN_BARS) bars.push(newBar());
  return bars;
}
export const cleanTitle=t=>typeof t==='string'?t.replace(/[\u0000-\u001f]/g,'').slice(0,MAX_TITLE):'';

export function sanitize(s){
  const o={...DEFAULT,lists:[newList('진행 1')]};
  if(!s||typeof s!=='object') return o;
  if(Number.isInteger(s.root)&&QUALITIES.some(x=>x.id===s.q)&&hasChord(s.root,s.q)){ o.root=s.root; o.q=s.q; }
  if(Number.isInteger(s.n)&&s.n>=0&&s.n<=5) o.n=s.n; // 0=전체, 1~5=이웃한 줄 수
  if(['note','degree'].includes(s.label)) o.label=s.label;
  o.flat=!!s.flat;
  // 진행 목록: 제목과 마디. 예전 저장값(`lists[].prog`, 진행 하나뿐인 `prog`)도 옮겨 읽는다.
  if(Array.isArray(s.lists)&&s.lists.length){
    o.lists=s.lists.slice(0,MAX_LISTS).map(l=>({title:cleanTitle(l&&l.title),bars:cleanBars(l&&(l.bars||l.prog))}));
    o.cur=Number.isInteger(s.cur)&&s.cur>=0&&s.cur<o.lists.length?s.cur:0;
  }else if(Array.isArray(s.prog)){
    o.lists=[{title:'진행 1',bars:cleanBars(s.prog)}];
  }
  return o;
}

// 진행을 링크(?p=...)로 주고받기 위한 변환.
//  마디 사이 `~`, 한 마디는 `코드,코드|음,음`. 코드는 `근음-종류-프렛들`(뮤트 x)이고 빈 칸은 `_`, 음은 `줄.프렛`.
//  코드 수가 곧 div이고, 아무것도 없는 1칸 마디는 `_`. (예전 링크: 마디마다 코드 하나, 지판음 마디는 `N줄.프렛`)
const chordText=c=>c?`${c.root}-${c.q}-${c.frets.map(f=>f===null?'x':f).join('.')}`:'_';
export function encodeBars(bars){
  return bars.map(b=>{
    if(barIsEmpty(b)&&b.div===1) return '_';
    const chords=b.chords.map(chordText).join(',');
    return b.notes.length?`${chords}|${b.notes.map(n=>`${n.s}.${n.f}`).join(',')}`:chords;
  }).join('~');
}
function chordFrom(text){
  const [root,q,fr]=text.split('-');
  if(fr===undefined) return null;
  return {root:Number(root),q,frets:fr.split('.').map(f=>f==='x'?null:(/^\d+$/.test(f)?Number(f):NaN))};
}
export function decodeBars(text){
  if(typeof text!=='string'||!text) return [];
  const raw=text.split('~').slice(0,MAX_PROG).map(part=>{
    const old=/^N(\d)\.(\d+)$/.exec(part);
    if(old) return {s:Number(old[1]),f:Number(old[2])};
    const [cs,ns]=part.split('|');
    const chords=cs.split(',').map(chordFrom);
    const notes=(ns?ns.split(','):[]).map(x=>{ const m=/^(\d)\.(\d+)$/.exec(x); return m?{s:Number(m[1]),f:Number(m[2])}:null; });
    return {div:chords.length,chords,notes};
  });
  const bars=cleanBars(raw); // 모양이 맞지 않는 칸·음은 비운다
  return bars.some(b=>!barIsEmpty(b))?bars:[];
}

export function loadState(){
  try{ const raw=localStorage.getItem(STORAGE_KEY); if(raw) return sanitize(JSON.parse(raw)); }catch(e){}
  return null;
}
export function saveState(state){
  try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }catch(e){}
}
