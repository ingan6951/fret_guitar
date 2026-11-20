// 코드 폼 로직. 폼 데이터는 chords.js에 있고, 여기서는 그 데이터를 화면용 모양으로 바꾸고 이동 거리를 계산한다.
// UI와 무관한 순수 함수만 둔다.
import {CHORDS} from './chords.js';

export const NOTE_SHARP=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const NOTE_FLAT =['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
// 개방현 음높이 (index 0 = 6번 줄 ... index 5 = 1번 줄)
export const OPEN=[4,9,2,7,11,4];
export const MAX_FRET=17;

// 코드 종류. tones는 근음에서의 반음 거리, deg는 같은 순서의 도수 이름 (도수 표시에 쓴다).
export const QUALITIES=[
  {id:'maj', label:'Major', suffix:'',  tones:[0,4,7], deg:['R','3','5']},
  {id:'min', label:'minor', suffix:'m', tones:[0,3,7], deg:['R','♭3','5']}
];

// 코드 안에서 근음과의 반음 거리 → 도수 이름 (구성음이 아니면 빈 문자열)
export function degreeOf(quality,interval){
  const i=quality.tones.indexOf(((interval%12)+12)%12);
  return i<0?'':quality.deg[i];
}

// 데이터에 있는 코드인지 / 그 코드의 폼 목록
export const hasChord=(root,qid)=>CHORDS.some(c=>c.root===root&&c.q===qid);
export const chordsFor=(root,qid)=>CHORDS.filter(c=>c.root===root&&c.q===qid);
export const rootsWithData=()=>[...new Set(CHORDS.map(c=>c.root))];

// 운지(줄마다 프렛, 치지 않으면 null)에서 화면용 폼 정보를 만든다. 진행에 담은 폼도 이 운지로 보관한다.
// baseFret: 개방현이 있으면 0(개방 위치), 아니면 누르는 가장 낮은 프렛.
export function voicingFromFrets(rootPc,qualityId,frets){
  const q=QUALITIES.find(x=>x.id===qualityId);
  const notes=frets.map((f,i)=>f===null?null:{string:6-i,fret:f,pc:(OPEN[i]+f)%12});
  const sounded=notes.filter(Boolean);
  const pressed=sounded.filter(n=>n.fret>0).map(n=>n.fret);
  const bass=sounded[0];
  return {
    bass:bass.string,
    formName:sounded.map(n=>degreeOf(q,n.pc-rootPc)).join('–'),
    baseFret:sounded.some(n=>n.fret===0)||!pressed.length?0:Math.min(...pressed),
    count:sounded.length,
    bassLabel:degreeOf(q,bass.pc-rootPc),
    notes
  };
}
// 폼에서 운지(줄마다 프렛)만 뽑는다
export const fretsOf=res=>res.notes.map(n=>n?n.fret:null);
// 코드의 폼 목록 (화면용)
export const formsFor=(root,qid)=>chordsFor(root,qid).map(c=>voicingFromFrets(c.root,c.q,c.frets));

// 보여줄 5프렛 창의 시작 프렛
export function windowStart(notes){
  const fretted=notes.filter(n=>n&&n.fret>0).map(n=>n.fret);
  if(!fretted.length) return 1;
  const max=Math.max(...fretted),min=Math.min(...fretted);
  return max<=5?1:min;
}

// 손 위치: 누르는 음 중 가장 낮은 프렛 (모두 개방현이면 0)
export function handPos(res){
  const fr=res.notes.filter(n=>n&&n.fret>0).map(n=>n.fret);
  return fr.length?Math.min(...fr):0;
}
// 두 폼 사이 이동 비용: 손 위치 차이(프렛)가 기본이고,
// 같으면 베이스 줄이 덜 바뀌고 줄마다 프렛 차이가 적은 쪽
export function moveCost(a,b){
  let fingers=0;
  a.notes.forEach((n,i)=>{ const m=b.notes[i]; if(n&&m) fingers+=Math.abs(n.fret-m.fret); else if(n||m) fingers+=1; });
  return Math.abs(handPos(a)-handPos(b))+0.1*Math.abs(a.bass-b.bass)+0.01*fingers;
}
