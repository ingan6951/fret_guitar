// 코드 폼 데이터 검증. lib/chords.js의 데이터가 이미지(오픈 코드)와 같고, 화면용 변환이 맞는지 본다.
import {CHORDS} from '../lib/chords.js';
import * as L from '../lib/fretlogic.js';
const {QUALITIES,OPEN,voicingFromFrets,fretsOf,handPos,moveCost,formsFor,hasChord,windowStart,NOTE_SHARP}=L;

const fails=[];
const eq=(a,b,msg)=>{ if(JSON.stringify(a)!==JSON.stringify(b)) fails.push(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };

// 1) 이미지에서 읽은 값 그대로인지 (6번 줄 → 1번 줄, x = 뮤트, 0 = 개방현)
const expected={
  Em:'0 2 2 0 0 0', Am:'x 0 2 2 1 0', C:'x 3 2 0 1 0', D:'x x 0 2 3 2',
  G:'3 2 0 0 0 3',  E:'0 2 2 1 0 0',  A:'x 0 2 2 2 0',  Dm:'x x 0 2 3 1'
};
const nameOf=c=>NOTE_SHARP[c.root]+QUALITIES.find(q=>q.id===c.q).suffix;
const toText=f=>f.map(x=>x===null?'x':x).join(' ');
eq(CHORDS.length,Object.keys(expected).length,'코드 개수');
CHORDS.forEach(c=>{
  const n=nameOf(c);
  if(!(n in expected)){ fails.push(`이미지에 없는 코드 ${n}`); return; }
  eq(toText(c.frets),expected[n],`${n} 운지`);
});
Object.keys(expected).forEach(n=>{ if(!CHORDS.some(c=>nameOf(c)===n)) fails.push(`${n} 데이터 없음`); });

// 2) 음악적으로 맞는지: 소리 나는 음이 모두 코드 구성음이고 근음·3도·5도가 다 들어 있다
CHORDS.forEach(c=>{
  const q=QUALITIES.find(x=>x.id===c.q),n=nameOf(c);
  if(c.frets.length!==6) fails.push(`${n}: 6줄이 아님`);
  const pcs=c.frets.map((f,i)=>f===null?null:(OPEN[i]+f)%12).filter(x=>x!==null);
  const ivs=new Set(pcs.map(pc=>(pc-c.root+12)%12));
  if([...ivs].some(iv=>!q.tones.includes(iv))) fails.push(`${n}: 구성음이 아닌 음`);
  if(!q.tones.every(iv=>ivs.has(iv))) fails.push(`${n}: 구성음이 빠짐`);
  // 가장 낮은 소리가 나는 줄 뒤로는 끊김 없이 이어진다(뮤트는 베이스 아래쪽 줄만)
  const first=c.frets.findIndex(f=>f!==null);
  if(c.frets.slice(first).some(f=>f===null)) fails.push(`${n}: 중간에 뮤트`);
  if(Math.max(...c.frets.filter(f=>f!==null))>4) fails.push(`${n}: 오픈 코드가 아님`);
});

// 3) 화면용 변환
{
  const am=voicingFromFrets(9,'min',[null,0,2,2,1,0]);
  eq(am.bass,5,'Am 베이스 줄'); eq(am.baseFret,0,'Am 개방 위치'); eq(am.count,5,'Am 소리 나는 줄');
  eq(am.formName,'R–5–R–♭3–5','Am 폼 이름'); eq(am.bassLabel,'R','Am 베이스 도수');
  eq(am.notes.map(n=>n&&n.string),[null,5,4,3,2,1],'Am 줄 번호');
  const g=voicingFromFrets(7,'maj',[3,2,0,0,0,3]);
  eq(g.bass,6,'G 베이스 줄'); eq(g.bassLabel,'R','G 베이스 도수'); eq(g.baseFret,0,'G 개방 위치');
  const e=voicingFromFrets(4,'maj',[0,2,2,1,0,0]);
  eq(e.formName,'R–5–R–3–5–R','E 폼 이름');
  // 개방현이 없는 폼의 위치는 누르는 가장 낮은 프렛
  const bar=voicingFromFrets(9,'min',[5,7,7,5,5,5]);
  eq(bar.baseFret,5,'바레 위치'); eq(handPos(bar),5,'손 위치');
  // 저장한 운지에서 그대로 되살아난다
  CHORDS.forEach(c=>{ const r=formsFor(c.root,c.q)[0]; eq(fretsOf(r),c.frets,`${nameOf(c)} 운지 왕복`); eq(r,voicingFromFrets(c.root,c.q,fretsOf(r)),`${nameOf(c)} 복원`); });
  eq(formsFor(0,'min'),[],'데이터에 없는 코드는 폼이 없다'); eq(hasChord(0,'min'),false,'hasChord 없음'); eq(hasChord(0,'maj'),true,'hasChord 있음');
  // 창 시작: 5프렛 안이면 1, 넘으면 가장 낮은 프렛
  eq(windowStart(am.notes),1,'Am 창'); eq(windowStart(bar.notes),5,'바레 창');
}

// 4) 이동 비용: 손 위치 차이가 기본이고 자기 자신과는 0
{
  const f=c=>formsFor(c.root,c.q)[0];
  CHORDS.forEach(c=>eq(moveCost(f(c),f(c)),0,`${nameOf(c)} 자기 이동`));
  const a=voicingFromFrets(9,'min',[null,0,2,2,1,0]),bar=voicingFromFrets(9,'min',[5,7,7,5,5,5]);
  if(!(moveCost(a,bar)>moveCost(a,a))) fails.push('이동 비용이 0 이하');
  eq(Math.round(moveCost(a,bar)),4,'Am 오픈 → 5프렛 바레 이동'); // 손 위치 1 → 5
  if(Math.abs(moveCost(a,bar)-moveCost(bar,a))>0.1+1e-9) fails.push('이동 비용 비대칭');
}

console.log(`코드 ${CHORDS.length}개 검사`);
if(fails.length){ console.log(`실패 ${fails.length}건`); fails.slice(0,20).forEach(f=>console.log(' -',f)); process.exit(1); }
console.log('모든 검사 통과');
