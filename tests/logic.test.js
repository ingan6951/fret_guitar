// 코드 폼 데이터 검증. lib/chords.js의 데이터가 이미지(오픈 코드)와 같고, 화면용 변환이 맞는지 본다.
import {CHORDS} from '../lib/chords.js';
import * as L from '../lib/fretlogic.js';
import A from "node:assert/strict";
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
const OPENS=CHORDS.slice(0,8); // 맨 앞 8개가 이미지의 오픈 코드
eq(OPENS.map(nameOf).sort(),Object.keys(expected).sort(),'오픈 코드 목록');
OPENS.forEach(c=>eq(toText(c.frets),expected[nameOf(c)],`${nameOf(c)} 운지`));

// 프렛을 올린 폼: 오픈 E·Em·A·Am 모양을 그대로 옮긴 것 (개방현인 12가지 중 오픈 코드와 겹치는 것은 제외)
const moved=[];
for(const [q,shape,low] of [['maj','E',0],['min','E',0],['maj','A',1],['min','A',1]]){
  for(let r=0;r<12;r++){
    const f=(r-(low?9:4)+12)%12; if(!f) continue;
    const fr=low
      ?[null,f,f+2,f+2,q==='maj'?f+2:f+1,f]
      :[f,f+2,f+2,q==='maj'?f+1:f,f,f];
    moved.push({root:r,q,frets:fr});
  }
}
eq(CHORDS.slice(8,52).map(c=>JSON.stringify(c)).sort(),moved.map(c=>JSON.stringify(c)).sort(),'프렛을 올린 폼 44개');
eq(CHORDS.length,446,'코드 폼 개수 (잡기 어려운 폼 99개를 뺀 값)');
// 개방현이 없는 폼(바레)은 개방현이 있는 오픈 폼을 k프렛(모든 줄 +k) 올린 것이어야 한다
for(const c of CHORDS){
  if(c.frets.includes(0)) continue;
  const ok=CHORDS.some(o=>o.q===c.q&&o.frets.includes(0)&&(()=>{ const k=(c.root-o.root+12)%12; return k>0&&JSON.stringify(o.frets.map(f=>f===null?null:f+k))===JSON.stringify(c.frets); })());
  if(!ok) fails.push(`${nameOf(c)} ${JSON.stringify(c.frets)}: 오픈 폼을 올린 것이 아님`);
}
// 너무 어려운 폼이 남아 있지 않다 (손가락 4개+벌림 3프렛 이상 등). 코드에 폼이 이것뿐이면 예외.
const effort=fr=>{ const p=fr.map((f,i)=>f>0?{i,f}:null).filter(Boolean); if(!p.length) return {fingers:0,span:0};
  const lo=Math.min(...p.map(x=>x.f)),hi=Math.max(...p.map(x=>x.f)),low=p.filter(x=>x.f===lo).map(x=>x.i);
  const barre=low.length>=2&&!fr.slice(Math.min(...low),Math.max(...low)+1).some(f=>f===0);
  const groups=arr=>{ let g=0,prev=null; for(const x of arr){ if(!(prev&&prev.f===x.f&&x.i===prev.i+1)) g++; prev=x; } return g; };
  return {fingers:barre?1+groups(p.filter(x=>x.f>lo)):groups(p),span:hi-lo}; };
const hard=e=>e.fingers>4||(e.fingers===4&&e.span>=3)||e.span>=4;
for(const c of CHORDS){ if(hard(effort(c.frets))&&CHORDS.filter(o=>o.root===c.root&&o.q===c.q).length>1) fails.push(`${nameOf(c)} ${JSON.stringify(c.frets)}: 잡기 어려운 폼이 남음`); }
// 12개 근음 모두 Major·minor·7·m7·maj7·sus4·sus2가 있다 (add9는 오픈 폼만 있어 일부 근음)
for(let r=0;r<12;r++) for(const q of QUALITIES.map(x=>x.id).filter(x=>x!=='add9')) if(!hasChord(r,q)) fails.push(`${NOTE_SHARP[r]} ${q} 없음`);
for(let r=0;r<12;r++) for(const q of ['maj','min']) if(!hasChord(r,q)) fails.push(`${NOTE_SHARP[r]} ${q} 없음`);

// 2) 음악적으로 맞는지: 소리 나는 음이 모두 코드 구성음이고 근음·3도·5도가 다 들어 있다
CHORDS.forEach(c=>{
  const q=QUALITIES.find(x=>x.id===c.q),n=nameOf(c);
  if(c.frets.length!==6) fails.push(`${n}: 6줄이 아님`);
  const pcs=c.frets.map((f,i)=>f===null?null:(OPEN[i]+f)%12).filter(x=>x!==null);
  const ivs=new Set(pcs.map(pc=>(pc-c.root+12)%12));
  if([...ivs].some(iv=>!q.tones.includes(iv))) fails.push(`${n}: 구성음이 아닌 음`);
  if(!q.tones.every(iv=>ivs.has(iv))) fails.push(`${n}: 구성음이 빠짐`);
  // 가장 낮은 소리가 나는 줄 뒤로는 끊김 없이 이어진다(뮤트는 베이스 아래쪽 줄만)
  const first=c.frets.findIndex(f=>f!==null),last=c.frets.length-1-[...c.frets].reverse().findIndex(f=>f!==null);
  if(c.frets.slice(first,last+1).some(f=>f===null)) fails.push(`${n}: 중간에 뮤트`);
  if(CHORDS.indexOf(c)<8&&Math.max(...c.frets.filter(f=>f!==null))>4) fails.push(`${n}: 오픈 코드가 아님`);
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
  CHORDS.forEach(c=>{ const r=formsFor(c.root,c.q).find(x=>JSON.stringify(fretsOf(x))===JSON.stringify(c.frets)); if(!r){ fails.push(`${nameOf(c)} 폼 목록에 없음`); return; } eq(fretsOf(r),c.frets,`${nameOf(c)} 운지 왕복`); eq(r,voicingFromFrets(c.root,c.q,fretsOf(r)),`${nameOf(c)} 복원`); });
  eq(L.formsFor(0,'min').length,2,'Cm은 폼 2개'); eq(L.formsFor(0,'zzz'),[],'없는 종류는 폼이 없다'); eq(hasChord(0,'zzz'),false,'hasChord 없음'); eq(hasChord(0,'maj'),true,'hasChord 있음');
  // 창 시작: 5프렛 안이면 1, 넘으면 가장 낮은 프렛
  eq(windowStart(am.notes),1,'Am 창'); eq(windowStart(bar.notes),5,'바레 창');
}

// 4) 이동 비용: 손 위치 차이가 기본이고 자기 자신과는 0
{
  const f=c=>voicingFromFrets(c.root,c.q,c.frets);
  CHORDS.forEach(c=>eq(moveCost(f(c),f(c)),0,`${nameOf(c)} 자기 이동`));
  const a=voicingFromFrets(9,'min',[null,0,2,2,1,0]),bar=voicingFromFrets(9,'min',[5,7,7,5,5,5]);
  if(!(moveCost(a,bar)>moveCost(a,a))) fails.push('이동 비용이 0 이하');
  eq(Math.round(moveCost(a,bar)),4,'Am 오픈 → 5프렛 바레 이동'); // 손 위치 1 → 5
  if(Math.abs(moveCost(a,bar)-moveCost(bar,a))>0.1+1e-9) fails.push('이동 비용 비대칭');
}

console.log(`코드 ${CHORDS.length}개 검사`);
if(fails.length){ console.log(`실패 ${fails.length}건`); fails.slice(0,20).forEach(f=>console.log(' -',f)); process.exit(1); }
console.log('모든 검사 통과');

// 음 개수: 이웃한 줄만 친 폼
{
  const asStr=f=>f.map(x=>x===null?'x':x).join('');
  const d2=L.formsFor(2,'maj',2).map(r=>asStr(L.fretsOf(r)));
  A.deepEqual(d2.slice(0,3),['xx02xx','xxx23x','xxxx32'],'D 오픈 폼 2개');
  A.equal(L.formsFor(2,'maj',0).length,3,'D 전체 폼 3개');
  A.equal(L.formsFor(2,'maj',9).length,3,'줄 수가 더 많으면 전체 폼');
  A.equal(L.formsFor(4,'min',3).length,7,'Em 이웃한 3줄 조합 전체');
  console.log('음 개수 검사 통과');
}

// 진행 데이터: 마디 { div, chords, notes }, 공유 링크 변환, 저장값 정리
{
  const S=await import('../lib/settings.js');
  const C=(root,q,frets)=>({root,q,frets});
  const cm=C(0,'maj',[null,3,2,0,1,0]),am=C(9,'min',[5,7,7,5,5,5]),g=C(7,'maj',[3,2,0,0,0,3]);
  const bars=[
    {chords:[cm],notes:[]},
    S.newBar(),
    {chords:[am],notes:[{s:0,f:3},{s:5,f:12}]},
    {chords:[cm,am,g],notes:[]}
  ];
  const text=S.encodeBars(bars);
  A.equal(text,'0-maj-x.3.2.0.1.0~_~9-min-5.7.7.5.5.5|0.3,5.12~0-maj-x.3.2.0.1.0,9-min-5.7.7.5.5.5,7-maj-3.2.0.0.0.3');
  A.deepEqual(S.decodeBars(text),bars,'링크 왕복(마디마다 코드 여러 개, 빈 마디, 멜로디)');
  A.deepEqual(S.decodeBars(S.encodeBars([{chords:[],notes:[{s:1,f:3}]},cm&&{chords:[cm],notes:[]}])).slice(0,2),[{chords:[],notes:[{s:1,f:3}]},{chords:[cm],notes:[]}],'멜로디만 있는 마디');
  A.equal(S.decodeBars('0-maj-x.3.2.0.1.0').length,4,'마디가 4개 미만이면 빈 마디로 채운다');
  A.deepEqual(S.decodeBars('broken'),[],'잘못된 링크');
  A.deepEqual(S.decodeBars('_~_'),[],'아무것도 없으면 무시');
  A.deepEqual(S.decodeBars('0-nope-1.2.3.4.5.6'),[],'없는 코드 종류');
  A.deepEqual(S.decodeBars('0-maj-1.2.3'),[],'줄 수가 맞지 않음');
  A.equal(S.decodeBars(Array(12).fill('0-maj-x.3.2.0.1.0').join('~')).length,8,'최대 8마디');
  A.equal(S.decodeBars(Array(7).fill('0-maj-x.3.2.0.1.0').join(','))[0].chords.length,S.MAX_CHORDS,'한 마디 코드는 최대 4개');
  // 범위를 벗어난 멜로디 음은 버리고, 멜로디는 최대 8개
  A.deepEqual(S.decodeBars('0-maj-x.3.2.0.1.0|6.0,0.99,0.3')[0].notes,[{s:0,f:3}]);
  A.equal(S.decodeBars('0-maj-x.3.2.0.1.0|'+Array(12).fill('0.3').join(','))[0].notes.length,S.MAX_NOTES);
  // 예전 링크(코드 칸 `_`, 지판음 마디 N줄.프렛)도 읽는다
  const old=S.decodeBars('N0.3~0-maj-x.3.2.0.1.0~0-maj-x.3.2.0.1.0,_,_');
  A.deepEqual(old[0],{chords:[],notes:[{s:0,f:3}]}); A.deepEqual(old[1],{chords:[cm],notes:[]}); A.deepEqual(old[2],{chords:[cm],notes:[]});
  // 저장값: 예전 형태(마디당 항목 하나, 칸 수 div와 빈 칸 null, 진행 하나뿐인 prog)를 새 형태로 옮긴다
  const mig=S.sanitize({prog:[cm,{s:2,f:2},null]});
  A.equal(mig.lists[0].title,'진행 1'); A.equal(mig.lists[0].bars.length,4);
  A.deepEqual(mig.lists[0].bars.slice(0,3),[{chords:[cm],notes:[]},{chords:[],notes:[{s:2,f:2}]},S.newBar()]);
  A.deepEqual(S.sanitize({lists:[{title:'a',prog:[cm]}]}).lists[0].bars[0],{chords:[cm],notes:[]});
  A.deepEqual(S.sanitize({lists:[{title:'a',bars:[{div:4,chords:[cm,null,am,null],notes:[]}]}]}).lists[0].bars[0],{chords:[cm,am],notes:[]},'빈 칸은 빼고 이어 붙인다');
  const two=S.sanitize({lists:[{title:'a',bars:[]},{title:'b'.repeat(99),bars:Array(5).fill(S.newBar())}],cur:5});
  A.equal(two.lists.length,2); A.equal(two.cur,0,'범위 밖 cur는 0'); A.equal(two.lists[1].title.length,S.MAX_TITLE); A.equal(two.lists[1].bars.length,5);
  A.equal(S.sanitize({lists:[]}).lists.length,1,'빈 목록이면 진행 하나');
  A.equal(S.sanitize({lists:Array(30).fill({title:'x',bars:[]})}).lists.length,S.MAX_LISTS,'진행은 최대 20개');
  // 지판음 음 높이: 6번 줄 개방=E, 5번 줄 3프렛=C, 1번 줄 5프렛=A
  A.equal(L.pcOfNote(0,0),4); A.equal(L.pcOfNote(1,3),0); A.equal(L.pcOfNote(5,5),9);
  const v=L.noteVoicing(2,2); A.equal(v.bass,4); A.equal(v.baseFret,2); A.equal(v.notes.filter(Boolean).length,1);
  A.equal(L.isNote({s:0,f:1}),true); A.equal(L.isNote(cm),false);
  console.log('진행 데이터·링크 검사 통과');
}

// 곡 빠르기·박자와 메트로놈 박자 격자 (합주: 늦게 시작한 사람도 같은 박에 맞아야 한다)
{
  const S=await import('../lib/settings.js');
  const M=await import('../lib/metronome.js');
  A.equal(S.cleanBpm(120),120); A.equal(S.cleanBpm('96'),96); A.equal(S.cleanBpm(10),S.MIN_BPM); A.equal(S.cleanBpm(999),S.MAX_BPM);
  A.equal(S.cleanBpm('abc'),S.DEFAULT_BPM); A.equal(S.cleanBpm(undefined),S.DEFAULT_BPM); A.equal(S.cleanBpm(100.6),101);
  A.equal(S.cleanBeats('3'),3); A.equal(S.cleanBeats(9),S.DEFAULT_BEATS); A.equal(S.cleanBeats(null),S.DEFAULT_BEATS);
  // 예전 저장값(빠르기 없음)은 기본 빠르기로, 잘못된 값은 범위 안으로
  const s=S.sanitize({lists:[{title:'a',bars:[]},{title:'b',bars:[],bpm:140,beats:3},{title:'c',bars:[],bpm:'x',beats:11}]});
  A.deepEqual(s.lists.map(l=>[l.bpm,l.beats]),[[S.DEFAULT_BPM,S.DEFAULT_BEATS],[140,3],[S.DEFAULT_BPM,S.DEFAULT_BEATS]]);
  A.equal(S.sanitize({prog:[]}).lists[0].bpm,S.DEFAULT_BPM);
  A.deepEqual(S.newList('x').bpm,S.DEFAULT_BPM);
  // 박자 격자: 120BPM이면 0.5초마다. 시작 전이면 0번째 박, 지난 뒤면 다음 박
  A.deepEqual(M.firstBeat(10,9,120),{index:0,time:10});
  A.deepEqual(M.firstBeat(10,10,120),{index:0,time:10});
  A.deepEqual(M.firstBeat(10,10.1,120),{index:1,time:10.5});
  A.deepEqual(M.firstBeat(10,11.5,120),{index:3,time:11.5},'박 위에 정확히 있으면 그 박');
  const f=M.firstBeat(0,123.456,97); A.ok(f.time>=123.456&&f.time-123.456<60/97+1e-9,'늦게 들어와도 한 박 안에 맞춘다');
  A.ok(Math.abs((f.time/(60/97))-f.index)<1e-6,'격자 위의 시각');
  A.deepEqual(M.beatPos(0,4),{beat:0,bar:0}); A.deepEqual(M.beatPos(7,4),{beat:3,bar:1}); A.deepEqual(M.beatPos(9,3),{beat:0,bar:3});
  console.log('곡 빠르기·메트로놈 박자 검사 통과');
}

// 합주 방: 시계 차이 추정과 박자 격자 이어 가기
{
  const Y=await import('../lib/sync.js');
  // 방장 시계가 5000ms 빠르고, 가는 길 20ms·오는 길 20ms면 차이를 정확히 잰다
  A.deepEqual(Y.pingSample(1000,6020,1040),{rtt:40,offset:5000});
  // 왕복이 긴(한쪽만 막힌) 샘플은 버리고 짧은 것들의 중앙값을 쓴다
  const ss=[Y.pingSample(0,5020,40),Y.pingSample(100,5130,160),Y.pingSample(200,5400,800),Y.pingSample(300,5321,342),Y.pingSample(400,5600,1300),Y.pingSample(500,5519,540)];
  const est=Y.estimateOffset(ss);
  A.ok(Math.abs(est.offset-5000)<=2,`차이 추정 ${est.offset}`); A.equal(est.err,20);
  A.equal(Y.estimateOffset([]),null); A.equal(Y.estimateOffset([{rtt:NaN,offset:1}]),null);
  // 120BPM(500ms)으로 1000ms에 0번째 박 → 2100ms 이후 첫 박은 2500ms(4번째), 빠르기만 바꾸면 번호를 이어 간다
  const g={playing:true,anchor:1000,index:0,bpm:120,beats:4};
  A.deepEqual(Y.retime(g,2100,{bpm:100,beats:4}),{playing:true,anchor:2500,index:3,bpm:100,beats:4});
  A.deepEqual(Y.retime(g,2500,{bpm:100,beats:4}).anchor,2500,'박 위에 정확히 있으면 그 박');
  A.deepEqual(Y.retime(g,2100,{bpm:120,beats:3}).index,0,'박 수가 바뀌면 새 마디 첫 박');
  A.deepEqual(Y.retime({...g,index:7},0,{bpm:90,beats:4}),{playing:true,anchor:1000,index:7,bpm:90,beats:4},'시작 전이면 그대로');
  A.equal(Y.gridKey({playing:false}),'stop'); A.equal(Y.gridKey(g),'1000|0|120|4');
  const id=Y.newRoomId(); A.match(id,/^[a-z0-9]{10}$/); A.notEqual(id,Y.newRoomId());
  A.equal(Y.cleanRoomId(id),id); A.equal(Y.cleanRoomId('../x'),null); A.equal(Y.cleanRoomId(null),null);
  console.log('합주 방 시계·격자 검사 통과');
}
