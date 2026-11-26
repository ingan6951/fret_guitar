// 화면 테스트: 코드·지판 페이지(보기 전용)와 진행 페이지(마디마다 코드 여러 개(최대 4) + 멜로디, 고쳐 쓰기·지우기), 설정 저장·복원
// jsdom 환경은 scripts/test-ui.mjs 가 --import 로 먼저 불러온다
import {useState} from 'react';
import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {render,cleanup,fireEvent,act} from '@testing-library/react';
import GuideProvider from '../components/GuideProvider.jsx';
import Shell from '../components/Shell.jsx';
import ExplorePage from '../components/ExplorePage.jsx';
import ProgressionPage from '../components/ProgressionPage.jsx';
import RoomPage from '../components/RoomPage.jsx';
import {makeChannel,resetBus,bus} from './shims/supabase.js';
import {epochNow} from '../lib/sync.js';
import {CHORDS} from '../lib/chords.js';
import {NOTE_SHARP,QUALITIES} from '../lib/fretlogic.js';
import {STORAGE_KEY} from '../lib/settings.js';

afterEach(()=>{ cleanup(); localStorage.clear(); });

// 두 페이지를 한 상태 위에서 오가는 틀: 실제 앱처럼 상태(고른 칸 등)가 페이지를 옮겨도 유지된다
const PAGES={explore:ExplorePage,prog:ProgressionPage,room:RoomPage};
let setPage;
function App(){ const [p,sp]=useState('explore'); setPage=sp; const P=PAGES[p]; return <GuideProvider><Shell><P/></Shell></GuideProvider>; }
function boot(saved,page='explore'){
  if(saved) localStorage.setItem(STORAGE_KEY,typeof saved==='string'?saved:JSON.stringify(saved));
  const r=render(<App/>);
  const go=p=>act(()=>{ setPage(p); });
  if(page!=='explore') go(page);
  // 근음·코드·음 개수는 셀렉트박스, 나머지는 버튼이다. 셀렉트의 비활성 옵션은 고를 수 없으므로 무시한다.
  const sel=k=>r.container.querySelector(`select[data-k="${k}"]`);
  const btn=(k,v)=>{ const s=sel(k); return s?s.querySelector(`option[value="${v}"]`):r.container.querySelector(`button[data-k="${k}"][data-v="${v}"]`); };
  const flags=k=>Object.fromEntries([...sel(k).querySelectorAll('option')].map(o=>[o.value,o.disabled]));
  const click=(k,v)=>{ const b=btn(k,v); assert.ok(b,`버튼 없음 ${k}=${v}`); const s=sel(k); if(s){ if(!b.disabled) fireEvent.change(s,{target:{value:String(v)}}); } else fireEvent.click(b); };
  const svgs=()=>r.container.querySelectorAll('.cards svg').length;
  const state=()=>JSON.parse(localStorage.getItem(STORAGE_KEY));
  const count=()=>r.container.querySelector('.count').textContent;
  return {...r,btn,flags,click,svgs,state,count,go};
}
const barsOf=t=>{ const s=t.state(); return s.lists[s.cur].bars; };
// 마디마다 코드 이름 (뒤쪽의 ＋ 버튼은 코드가 아니다)
const chordNames=t=>[...t.container.querySelectorAll('.bars .bar')].map(b=>[...b.querySelectorAll('.slot:not(.blank) b')].map(x=>x.textContent));
const adding=(t,bar)=>t.btn('cadd',String(bar)).getAttribute('aria-pressed')==='true'; // 그 마디에 코드를 더하는 중
const melodyNames=t=>[...t.container.querySelectorAll('.bars .bar')].map(b=>[...b.querySelectorAll('.mnote b')].map(x=>x.textContent));
const melodyOrder=t=>[...t.container.querySelectorAll('.bars .bar')].map(b=>[...b.querySelectorAll('.mnote i')].map(x=>x.textContent));
const addFirst=t=>fireEvent.click(t.container.querySelector('button[data-k="fadd"][data-v="0"]'));
const nameOf=c=>NOTE_SHARP[c.root]+QUALITIES.find(q=>q.id===c.q).suffix;
const setChord=(t,r,q)=>{ t.click('root',String(r)); t.click('q',q); };
const noteCell=(t,s,f)=>t.container.querySelector(`button[data-k="nnote"][data-v="${s}.${f}"]`);

test('처음 화면: Am 폼 2개(오픈, 5프렛 바레), 첫 폼은 개방 위치·5번 줄 베이스',()=>{
  const t=boot();
  assert.equal(t.container.querySelector('.sym').textContent,'Am');
  assert.equal(t.svgs(),2);
  assert.match(t.count(),/폼 2개/);
  assert.equal(t.container.querySelector('.card .who b').textContent,'5번 줄');
  assert.equal(t.container.querySelector('.card .pos').textContent,'개방');
  const svg=t.container.querySelector('.cards svg');
  assert.equal(svg.querySelectorAll('.open').length,2);
  assert.equal(svg.querySelectorAll('.dot').length,3);
  assert.equal(svg.querySelectorAll('.mute').length,1);
});

test('코드·지판 페이지는 보기 전용: 진행 버튼·마디 차트가 없고, 지판 음계 표가 같이 있다',()=>{
  const t=boot();
  assert.deepEqual([...t.container.querySelectorAll('.controls .field>span')].map(x=>x.textContent),['근음','코드','음 개수']);
  for(const k of ['fadd','frep','bar','slot','padd','ptitle','pshare']) assert.equal(t.container.querySelector(`[data-k="${k}"]`),null,k);
  assert.ok(t.container.querySelector('.notetable'),'지판 음계 표');
  assert.equal(t.container.querySelectorAll('.ngrid button[data-k="nnote"]').length,6*16);
  assert.deepEqual([...t.container.querySelectorAll('.tab')].map(x=>x.textContent),['코드·지판','진행']);
});

test('지판 음계 표: 줄·프렛별 음이름, 고른 코드의 근음·구성음 표시, 누르면 같은 음을 모두 밝힌다',()=>{
  const t=boot(); // Am: A C E
  assert.equal(noteCell(t,0,0).textContent,'E'); assert.equal(noteCell(t,1,3).textContent,'C'); assert.equal(noteCell(t,5,5).textContent,'A');
  assert.match(noteCell(t,5,5).className,/rt/,'근음 A');
  assert.match(noteCell(t,1,3).className,/ct/,'구성음 C');
  assert.doesNotMatch(noteCell(t,1,2).className,/rt|ct/,'B는 Am의 구성음이 아니다');
  fireEvent.click(noteCell(t,0,0)); // E를 누르면 E가 있는 칸이 모두 밝아진다
  const lit=[...t.container.querySelectorAll('.ncell.pf')];
  assert.ok(lit.length>=6&&lit.every(c=>c.textContent==='E'));
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).lists[0].bars.every(b=>!b.notes.length),true,'보기 모드는 진행을 바꾸지 않는다');
  fireEvent.click(noteCell(t,0,0));
  assert.equal(t.container.querySelectorAll('.ncell.pf').length,0);
  // 코드를 바꾸면 표시도 따라간다
  setChord(t,0,'maj');
  assert.match(noteCell(t,1,3).className,/rt/);
});

test('오픈 코드 8개가 이미지와 같은 운지로 나온다 (데이터 맨 앞 8개)',()=>{
  const expected={Em:'0 2 2 0 0 0',Am:'x 0 2 2 1 0',C:'x 3 2 0 1 0',D:'x x 0 2 3 2',G:'3 2 0 0 0 3',E:'0 2 2 1 0 0',A:'x 0 2 2 2 0',Dm:'x x 0 2 3 1'};
  assert.equal(CHORDS.length,446);
  for(const c of CHORDS.slice(0,8)){
    const t=boot({root:c.root,q:c.q});
    assert.equal(t.container.querySelector('.sym').textContent,nameOf(c));
    assert.ok(t.svgs()>=1,`${nameOf(c)} 폼`);
    t.go('prog'); addFirst(t);
    assert.equal(barsOf(t)[0].chords[0].frets.map(f=>f===null?'x':f).join(' '),expected[nameOf(c)],`${nameOf(c)} 운지`);
    cleanup(); localStorage.clear();
  }
});

test('근음 12개·코드 2종류를 모두 고를 수 있고, 근음을 바꿔도 코드 종류가 유지된다',()=>{
  const t=boot();
  assert.ok(Object.values(t.flags('root')).every(off=>!off),'12개 근음 모두 선택 가능');
  t.click('root','0');
  assert.deepEqual([t.state().root,t.state().q],[0,'min']);
  assert.equal(t.container.querySelector('.sym').textContent,'Cm');
  assert.equal(t.svgs(),2,'Cm 2개');
  t.click('q','maj');
  assert.equal(t.container.querySelector('.sym').textContent,'C');
  assert.equal(t.svgs(),3,'C 3개');
});

test('음 개수: D를 2개로 고르면 오픈 폼에서 이웃한 두 줄 폼 3가지가 먼저 나온다',()=>{
  const t=boot({root:2,q:'maj'});
  assert.equal(t.svgs(),3,'D 3개');
  t.click('n','2');
  assert.equal(t.svgs(),12,'D 2줄 조합 12개');
  t.click('n','0');
  assert.equal(t.svgs(),3);
});

test('표시 방식: 음이름·도수',()=>{
  const t=boot();
  const labels=()=>[...t.container.querySelector('.cards svg').querySelectorAll('.dl,.ol')].map(x=>x.textContent);
  assert.deepEqual(labels().sort(),['A','A','C','E','E'].sort());
  t.click('label','degree');
  assert.deepEqual(labels().sort(),['R','R','5','5','♭3'].sort());
});

test('설정 저장·복원, 데이터에 없거나 잘못된 저장값은 기본값으로',()=>{
  const a=boot();
  a.click('root','7'); a.click('label','degree');
  const saved=a.state();
  assert.deepEqual([saved.root,saved.q,saved.label],[7,'min','degree']);
  cleanup();
  const b=boot(JSON.stringify(saved));
  assert.deepEqual(b.state(),saved);
  cleanup(); localStorage.clear();
  const c=boot({root:0,q:'zzz'});
  assert.equal(c.container.querySelector('.sym').textContent,'Am');
  cleanup(); localStorage.clear();
  const d=boot('{broken');
  assert.equal(d.container.querySelector('.sym').textContent,'Am');
});

test('진행 페이지: 처음에는 빈 마디 4개가 있고, 1마디가 선택돼 코드를 더하는 상태다',()=>{
  const t=boot(null,'prog');
  assert.equal(t.container.querySelectorAll('.bars .bar').length,4);
  assert.deepEqual(chordNames(t),[[],[],[],[]]);
  assert.equal(adding(t,0),true);
  assert.equal(t.btn('bar','0').getAttribute('aria-pressed'),'true');
  assert.ok(t.container.querySelector('button[data-k="padd"]'));
  assert.equal(t.container.querySelector('[data-k="div"]'),null,'코드 개수를 고르는 버튼은 없다');
  for(const k of ['pshare','pclear']) assert.equal(t.container.querySelector(`button[data-k="${k}"]`),null,`${k}는 내용이 생긴 뒤에 나온다`);
  assert.equal(t.btn('del','').disabled,true,'고른 것이 없으면 지울 것이 없다');
  assert.ok(t.container.querySelector('.finder'),'코드 폼을 여기서 고른다');
});

test('코드 넣기: 마디를 고르기 전에는 같은 마디에 코드가 계속 더해지고, 다음 마디로 넘어가지 않는다',()=>{
  const t=boot(null,'prog');
  addFirst(t);
  assert.deepEqual(chordNames(t),[['Am'],[],[],[]]);
  assert.equal(barsOf(t)[0].chords[0].frets.length,6);
  assert.equal(adding(t,0),true,'넣은 뒤에도 1마디에 더하는 상태');
  assert.equal(adding(t,1),false);
  setChord(t,0,'maj'); addFirst(t);
  t.click('root','7'); addFirst(t);
  assert.deepEqual(chordNames(t),[['Am','C','G'],[],[],[]]);
  assert.equal(t.btn('bar','0').getAttribute('aria-pressed'),'true');
  // 한 마디 코드는 최대 4개: 4개가 차면 더하는 버튼이 없어지고 폼 카드의 +도 막힌다
  setChord(t,2,'min'); addFirst(t);
  assert.deepEqual(chordNames(t)[0],['Am','C','G','Dm']);
  assert.equal(t.container.querySelector('button[data-k="cadd"][data-v="0"]'),null);
  assert.ok(t.container.querySelector('button[data-k="fadd"]').disabled);
  addFirst(t);
  assert.equal(barsOf(t)[0].chords.length,4);
  // 다음 마디는 직접 골라야 들어가고, 앞 마디의 마지막 코드가 기준 폼으로 보인다
  t.click('bar','1');
  assert.deepEqual([...t.container.querySelectorAll('.refs .card.ref')].map(x=>x.dataset.v),['이전 폼']);
  assert.match(t.container.querySelector('.refs .card.ref').textContent,/1마디 Dm/);
  setChord(t,9,'min'); addFirst(t); setChord(t,4,'min'); addFirst(t);
  assert.deepEqual(chordNames(t),[['Am','C','G','Dm'],['Am','Em'],[],[]]);
  assert.equal(t.btn('bar','1').getAttribute('aria-pressed'),'true');
  assert.ok(t.container.querySelector('.bar.wide'),'코드가 2개 이상이면 마디가 넓어진다');
});

test('코드 고쳐 쓰기·지우기: 칸을 고르면 그 코드가 불러와지고 ↺ 로 바꾸고 삭제로 비운다',()=>{
  const t=boot(null,'prog');
  for(const [i,[r,q]] of [[0,'maj'],[9,'min'],[2,'min'],[7,'maj']].entries()){ t.click('bar',String(i)); setChord(t,r,q); addFirst(t); }
  assert.deepEqual(chordNames(t),[['C'],['Am'],['Dm'],['G']]);
  const keep=barsOf(t).map(b=>b.chords[0].frets.join());
  t.click('slot','1.0'); // Am 칸 선택
  assert.deepEqual([t.state().root,t.state().q],[9,'min'],'고른 코드를 불러온다');
  assert.equal(t.container.querySelector('button[data-k="fadd"]'),null);
  assert.ok(t.container.querySelector('button[data-k="frep"][data-v="0"]'));
  assert.ok(t.container.querySelector('.cards .card.cur'),'지금 칸의 폼 표시');
  assert.deepEqual([...t.container.querySelectorAll('.refs .card.ref')].map(x=>x.dataset.v),['이전 폼','다음 폼']);
  // Am → Em 으로 교체: 이웃 칸은 그대로
  setChord(t,4,'min');
  fireEvent.click(t.container.querySelector('button[data-k="frep"][data-v="0"]'));
  assert.deepEqual(chordNames(t),[['C'],['Em'],['Dm'],['G']]);
  const now=barsOf(t).map(b=>b.chords[0].frets.join());
  assert.equal(now[0],keep[0]); assert.equal(now[2],keep[2]); assert.equal(now[3],keep[3]); assert.notEqual(now[1],keep[1]);
  // 삭제: 그 코드만 빠지고 이웃 마디는 그대로, 마디 수도 그대로, 다시 더하는 상태로 돌아간다
  t.click('slot','1.0'); t.click('del','');
  assert.deepEqual(chordNames(t),[['C'],[],['Dm'],['G']]);
  assert.equal(barsOf(t).length,4);
  assert.equal(t.btn('del','').disabled,true);
  assert.equal(adding(t,1),true);
  // 비운 마디에 다시 넣으면 그 마디에 들어간다
  setChord(t,9,'min'); addFirst(t);
  assert.deepEqual(chordNames(t),[['C'],['Am'],['Dm'],['G']]);
  // 한 마디 안에서 가운데 코드를 지우면 뒤 코드가 앞으로 당겨진다
  addFirst(t); setChord(t,2,'min'); addFirst(t);
  assert.deepEqual(chordNames(t)[1],['Am','Am','Dm']);
  t.click('slot','1.1'); t.click('del','');
  assert.deepEqual(chordNames(t)[1],['Am','Dm']);
  // 마디 비우기: 마디의 코드와 멜로디가 모두 비워진다
  t.click('bar','2'); t.click('bclear','');
  assert.deepEqual(chordNames(t)[2],[]);

});

test('멜로디: 마디 안에 지판 음을 여러 개 더하고, 고르면 바꾸거나 지울 수 있다',()=>{
  const t=boot(null,'prog');
  t.click('kind','n');
  assert.ok(t.container.querySelector('.notetable'),'멜로디는 지판 표에서 고른다');
  assert.equal(t.container.querySelector('.finder'),null);
  assert.match(t.container.querySelector('.selname').textContent,/1마디 멜로디 · 새 음 더하기 \(0\/8\)/);
  // 1마디에 E(6번 줄 개방), C(5번 줄 3프렛), A(1번 줄 5프렛)를 차례로 더한다 — 마디는 그대로 선택돼 있다
  fireEvent.click(noteCell(t,0,0)); fireEvent.click(noteCell(t,1,3)); fireEvent.click(noteCell(t,5,5));
  assert.deepEqual(barsOf(t)[0].notes,[{s:0,f:0},{s:1,f:3},{s:5,f:5}]);
  assert.deepEqual(melodyNames(t)[0],['E','C','A']);
  assert.deepEqual(melodyNames(t)[1],[]);
  // 다른 마디에도 따로 더한다
  t.click('bar','1'); fireEvent.click(noteCell(t,2,2));
  assert.deepEqual(melodyNames(t),[['E','C','A'],['E'],[],[]]);
  // 음을 고르면 그 음이 표에 표시되고, 다른 음을 누르면 바뀐다
  t.click('mnote','0.1');
  assert.equal(noteCell(t,1,3).getAttribute('aria-pressed'),'true');
  assert.match(t.container.querySelector('.selname').textContent,/1마디 멜로디 2번째 음 · C/);
  fireEvent.click(noteCell(t,2,2)); // 4번 줄 2프렛 = E
  assert.deepEqual(barsOf(t)[0].notes,[{s:0,f:0},{s:2,f:2},{s:5,f:5}]);
  assert.deepEqual(melodyNames(t)[0],['E','E','A']);
  // 삭제: 고른 음만 지워지고 새 음 더하기 상태로 돌아간다
  t.click('del','');
  assert.deepEqual(melodyNames(t)[0],['E','A']);
  assert.match(t.container.querySelector('.selname').textContent,/새 음 더하기 \(2\/8\)/);
  // 한 마디에 8개까지
  for(let i=0;i<10;i++) fireEvent.click(noteCell(t,0,i%5));
  assert.equal(barsOf(t)[0].notes.length,8);
  assert.equal(noteCell(t,0,0).disabled,true,'8개가 차면 더할 수 없다');
  // 마디 비우기로 멜로디도 지운다
  t.click('bclear','');
  assert.deepEqual(melodyNames(t)[0],[]);
});

test('코드와 멜로디를 한 마디에 같이 쓰고, 탭을 오가도 고른 마디가 유지된다',()=>{
  const t=boot(null,'prog');
  addFirst(t); setChord(t,0,'maj'); addFirst(t);
  t.click('kind','n'); fireEvent.click(noteCell(t,1,3));
  assert.deepEqual(chordNames(t)[0],['Am','C']);
  assert.deepEqual(melodyNames(t)[0],['C']);
  t.click('kind','c');
  assert.ok(t.container.querySelector('.finder'));
  assert.equal(adding(t,0),true);
  // 마디 선택 버튼은 현재 탭 종류를 유지한 채 마디만 옮긴다
  t.click('bar','2');
  assert.equal(adding(t,2),true);
});

test('마디 추가: 하단 + 로 8마디까지 늘릴 수 있다, 저장·복원',()=>{
  const t=boot(null,'prog');
  for(let i=0;i<4;i++) fireEvent.click(t.container.querySelector('button[data-k="padd"]'));
  assert.equal(t.container.querySelectorAll('.bars .bar').length,8);
  assert.equal(t.container.querySelector('button[data-k="padd"]'),null,'8마디가 최대');
  assert.equal(adding(t,7),true,'새 마디가 선택된다');
  addFirst(t);
  assert.equal(chordNames(t)[7][0],'Am');
  const raw=JSON.stringify(t.state());
  cleanup();
  const b=boot(raw,'prog');
  assert.equal(b.container.querySelectorAll('.bars .bar').length,8);
  assert.equal(chordNames(b)[7][0],'Am');
});

test('전체 비우기: 빈 마디 4개로 돌아간다',()=>{
  const t=boot(null,'prog');
  addFirst(t); setChord(t,0,'maj'); addFirst(t);
  assert.equal(t.container.querySelector('.sum'),null,'폼 모아 보기는 연주용 보기로 합쳤다');
  fireEvent.click(t.container.querySelector('button[data-k="padd"]'));
  t.click('pclear','');
  assert.equal(t.container.querySelectorAll('.bars .bar').length,4);
  assert.deepEqual(chordNames(t),[[],[],[],[]]);
  assert.equal(adding(t,0),true);
});

test('멜로디 표시: 마디마다 코드와 ♪ 멜로디 행이 구분되고, 음에는 순서 번호가 붙는다',()=>{
  const t=boot(null,'prog');
  const bar=()=>t.container.querySelector('.bars .bar');
  assert.deepEqual([...bar().querySelectorAll('.rowtag')].map(x=>x.textContent),['코드','♪ 멜로디']);
  addFirst(t);
  t.click('kind','n');
  fireEvent.click(noteCell(t,0,0)); fireEvent.click(noteCell(t,1,3)); fireEvent.click(noteCell(t,5,5));
  assert.deepEqual(melodyOrder(t)[0],['1','2','3']);
  assert.deepEqual(melodyNames(t)[0],['E','C','A']);
  // 지판 표에도 이 마디에서 그 자리가 몇 번째 음인지 번호가 나온다. 같은 자리를 또 쓰면 번호가 둘
  assert.equal(noteCell(t,1,3).querySelector('.ord').textContent,'2');
  fireEvent.click(noteCell(t,0,0));
  assert.equal(noteCell(t,0,0).querySelector('.ord').textContent,'1,4');
  // 다른 마디의 표시는 섞이지 않는다
  t.click('bar','1');
  assert.equal(noteCell(t,1,3).querySelector('.ord'),null);
});

test('멜로디 순서 바꾸기: 고른 음을 앞·뒤로 옮기면 번호가 따라 바뀐다',()=>{
  const t=boot(null,'prog');
  t.click('kind','n');
  assert.equal(t.btn('nmove','-1').disabled,true,'고른 음이 없으면 옮길 수 없다');
  fireEvent.click(noteCell(t,0,0)); fireEvent.click(noteCell(t,1,3)); fireEvent.click(noteCell(t,5,5)); // E C A
  t.click('mnote','0.2'); // A (3번)
  assert.equal(t.btn('nmove','1').disabled,true,'맨 뒤는 더 뒤로 못 간다');
  t.click('nmove','-1');
  assert.deepEqual(melodyNames(t)[0],['E','A','C']);
  assert.deepEqual(barsOf(t)[0].notes.map(n=>n.s),[0,5,1]);
  assert.equal(t.btn('mnote','0.1').getAttribute('aria-pressed'),'true','옮긴 음이 계속 선택돼 있다');
  t.click('nmove','-1');
  assert.deepEqual(melodyNames(t)[0],['A','E','C']);
  assert.equal(t.btn('nmove','-1').disabled,true);
  t.click('nmove','1');
  assert.deepEqual(melodyNames(t)[0],['E','A','C']);
  assert.match(t.container.querySelector('.selname').textContent,/2번째 음/);
});

test('연주용 보기: 마디마다 코드 폼 그림과 멜로디 음(순서·음이름·줄/프렛)을 크게 보여 준다',()=>{
  const t=boot(null,'prog');
  addFirst(t); setChord(t,0,'maj'); addFirst(t);
  t.click('kind','n'); fireEvent.click(noteCell(t,0,0)); fireEvent.click(noteCell(t,1,3));
  t.click('bar','2'); fireEvent.click(noteCell(t,5,5));
  t.click('view','play');
  assert.equal(t.container.querySelector('.editor'),null,'연주용 보기에서는 편집 화면이 없다');
  const bars=[...t.container.querySelectorAll('.playbar')];
  assert.equal(bars.length,4);
  assert.deepEqual([...bars[0].querySelectorAll('.pchord figcaption b')].map(x=>x.textContent),['Am','C']);
  assert.equal(bars[0].querySelectorAll('.pchord svg').length,2);
  assert.deepEqual([...bars[0].querySelectorAll('.rowtag')].map(x=>x.textContent),['코드','♪ 멜로디']);
  assert.deepEqual([...bars[0].querySelectorAll('.pnote')].map(x=>x.textContent),['1E6번 줄 개방','2C5번 줄 3프렛']);
  assert.deepEqual([...bars[2].querySelectorAll('.pnote')].map(x=>x.textContent),['1A1번 줄 5프렛']);
  assert.equal(bars[2].querySelector('.pchord'),null);
  assert.match(bars[1].textContent,/비어 있음/);
  assert.ok(t.container.querySelector('button[data-k="pshare"]'),'공유는 연주용 보기에서도');
  t.click('view','edit');
  assert.ok(t.container.querySelector('.editor'));
  assert.deepEqual(chordNames(t)[0],['Am','C'],'돌아와도 그대로');
});

test('아무렇게나 눌러도 폼이 항상 보인다',()=>{
  const t=boot();
  let seed=12345;
  const rnd=m=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed%m; };
  for(let i=0;i<300;i++){
    const k=['root','q','label','acc'][rnd(4)];
    const s=t.container.querySelector(`select[data-k="${k}"]`);
    if(s){
      const opts=[...s.querySelectorAll('option')],o=opts[rnd(opts.length)];
      if(!o.disabled) fireEvent.change(s,{target:{value:o.value}});
    }else{
      const list=[...t.container.querySelectorAll(`button[data-k="${k}"]`)];
      fireEvent.click(list[rnd(list.length)]);
    }
    assert.ok(t.svgs()>=1,`${i}번째 클릭 후 폼 수`);
  }
});

test('진행 페이지에서 아무렇게나 눌러도 칸 선택이 어긋나지 않는다',()=>{
  const t=boot(null,'prog');
  let seed=777;
  const rnd=m=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed%m; };
  for(let i=0;i<400;i++){
    const ks=['bar','slot','cadd','mnote','kind','del','bclear','padd','fadd','frep','nnote','nmove','view'];
    const list=[...t.container.querySelectorAll(ks.map(k=>`button[data-k="${k}"]`).join(','))].filter(b=>!b.disabled);
    fireEvent.click(list[rnd(list.length)]);
    const s=barsOf(t);
    assert.ok(s.length>=4&&s.length<=8);
    assert.ok(s.every(b=>b.chords.length<=4&&b.notes.length<=8&&!('div' in b)),`${i}번째 클릭 후 마디 모양`);
    assert.equal(t.container.querySelectorAll('.bar .slot[aria-pressed="true"],.bar .mnote[aria-pressed="true"]').length<=1,true);
  }
});

test('진행 공유 링크: 마디마다 코드 여러 개와 멜로디, 제목까지 같은 진행으로 열린다',async()=>{
  let copied='';
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async x=>{ copied=x; }},configurable:true});
  const t=boot(null,'prog');
  addFirst(t);                                          // 1마디 Am
  t.click('bar','1'); setChord(t,0,'maj'); addFirst(t); setChord(t,7,'maj'); addFirst(t); // 2마디 C G
  t.click('kind','n'); fireEvent.click(noteCell(t,1,3)); fireEvent.click(noteCell(t,5,5));
  fireEvent.change(t.container.querySelector('input[data-k="ptitle"]'),{target:{value:'가을 노래'}});
  const saved=barsOf(t);
  assert.deepEqual(chordNames(t),[['Am'],['C','G'],[],[]]);
  await act(async()=>{ fireEvent.click(t.container.querySelector('button[data-k="pshare"]')); });
  assert.match(copied,/\/progression\/\?p=/); assert.match(decodeURIComponent(copied),/t=가을[+ ]노래/);
  assert.match(t.container.querySelector('button[data-k="pshare"]').textContent,/복사됨/);
  // 다른 기기(저장된 설정이 없는 브라우저)에서 링크로 열기
  const q=new URL(copied).search;
  cleanup(); localStorage.clear();
  window.history.pushState(null,'','/progression/'+q);
  const u=boot(null,'prog');
  assert.deepEqual(barsOf(u),saved);
  assert.equal(u.state().lists.length,1,'비어 있는 첫 진행 자리에 불러온다');
  assert.equal(u.state().lists[0].title,'가을 노래');
  assert.deepEqual(chordNames(u)[1],['C','G']);
  assert.deepEqual(melodyNames(u)[1],['C','A']);
  assert.equal(window.location.search,'','불러온 뒤에는 주소의 진행 값을 지운다');
  // 잘못된 링크는 무시한다
  cleanup(); localStorage.clear();
  window.history.pushState(null,'','/?p=broken');
  const v=boot(null,'prog');
  assert.deepEqual(chordNames(v),[[],[],[],[]]);
});

test('진행 제목·여러 진행: 제목 붙이기, 새 진행 만들기·전환, 삭제',()=>{
  const t=boot(null,'prog');
  const title=()=>t.container.querySelector('input[data-k="ptitle"]');
  const opts=()=>[...t.container.querySelectorAll('select[data-k="pswitch"] option')].map(o=>o.textContent);
  assert.equal(title().value,'진행 1');
  fireEvent.change(title(),{target:{value:'Autumn Leaves'}});
  assert.equal(t.state().lists[0].title,'Autumn Leaves');
  assert.deepEqual(opts(),['Autumn Leaves']);
  addFirst(t);
  // 새 진행: 빈 마디 4개로 시작하고 바로 전환된다
  fireEvent.click(t.container.querySelector('button[data-k="pnew"]'));
  assert.equal(t.state().lists.length,2); assert.equal(t.state().cur,1);
  assert.equal(title().value,'진행 2');
  assert.deepEqual(chordNames(t),[[],[],[],[]]);
  fireEvent.change(title(),{target:{value:'후렴'}});
  setChord(t,0,'maj'); addFirst(t);
  assert.deepEqual(opts(),['Autumn Leaves','후렴']);
  // 전환: 각 진행의 마디가 그대로 있다
  t.click('pswitch','0');
  assert.equal(title().value,'Autumn Leaves');
  assert.deepEqual(chordNames(t)[0],['Am']);
  t.click('pswitch','1');
  assert.deepEqual(chordNames(t)[0],['C']);
  // 삭제: 내용이 있는 진행은 한 번 더 눌러야 지워진다
  t.click('pswitch','0');
  const del=()=>fireEvent.click(t.container.querySelector('button[data-k="plistdel"]'));
  del();
  assert.equal(t.state().lists.length,2,'첫 클릭은 확인만');
  assert.match(t.container.querySelector('button[data-k="plistdel"]').textContent,/정말 삭제/);
  del();
  assert.equal(t.state().lists.length,1);
  assert.equal(title().value,'후렴');
  assert.deepEqual(chordNames(t)[0],['C']);
  // 저장·복원
  const raw=JSON.stringify(t.state());
  cleanup();
  const b=boot(raw,'prog');
  assert.equal(b.container.querySelector('input[data-k="ptitle"]').value,'후렴');
  // 마지막 진행을 지우면 빈 진행 하나가 남는다
  const del2=()=>fireEvent.click(b.container.querySelector('button[data-k="plistdel"]'));
  del2(); del2();
  assert.equal(b.state().lists.length,1);
  assert.equal(b.container.querySelector('input[data-k="ptitle"]').value,'진행 1');
  assert.deepEqual(chordNames(b),[[],[],[],[]]);
  // 빈 진행은 확인 없이 바로 지워진다
  fireEvent.click(b.container.querySelector('button[data-k="pnew"]'));
  assert.equal(b.state().lists.length,2);
  del2();
  assert.equal(b.state().lists.length,1);
});

test('예전 저장값(마디마다 항목 하나)은 새 마디 형태로 옮겨 열리고, 공유 링크는 새 진행으로 추가된다',()=>{
  const old={root:9,q:'min',label:'note',flat:false,prog:[{root:0,q:'maj',frets:[null,3,2,0,1,0]},{s:0,f:3}]};
  const a=boot(old,'prog');
  assert.deepEqual(chordNames(a)[0],['C']);
  assert.deepEqual(melodyNames(a)[1],['G']);
  assert.equal(a.container.querySelector('input[data-k="ptitle"]').value,'진행 1');
  cleanup();
  // 이미 진행이 있는 브라우저에서 링크 열기
  localStorage.setItem(STORAGE_KEY,JSON.stringify({lists:[{title:'내 진행',prog:[{root:9,q:'min',frets:[null,0,2,2,1,0]},null,null,null]}],cur:0}));
  window.history.pushState(null,'','/progression/?p='+encodeURIComponent('7-maj-3.2.0.0.0.3,_~_~_~_')+'&t='+encodeURIComponent('받은 진행'));
  const b=boot(null,'prog');
  assert.deepEqual(b.state().lists.map(l=>l.title),['내 진행','받은 진행']);
  assert.equal(b.state().cur,1);
  assert.deepEqual(chordNames(b)[0],['G']);
  assert.equal(window.location.search,'');
});

// ----- 곡 빠르기·박자와 메트로놈 -----
// jsdom에는 Web Audio가 없어서, 실제 시간을 따라가는 가짜 오디오 시계를 쓴다
class FakeAudio{
  constructor(){ this.t0=performance.now(); this.state='running'; this.destination={}; FakeAudio.clicks=0; }
  get currentTime(){ return (performance.now()-this.t0)/1000; }
  createOscillator(){ return {frequency:{},connect(){},start(){ FakeAudio.clicks++; },stop(){}}; }
  createGain(){ return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}; }
  close(){}
}
const wait=ms=>act(async()=>{ await new Promise(r=>setTimeout(r,ms)); });

test('곡 빠르기·박자: −/+·직접 입력·박자 고르기가 곡마다 저장되고, 새 곡은 기본값이다',()=>{
  const t=boot(null,'prog');
  const bpmIn=()=>t.container.querySelector('input[data-k="bpm"]');
  assert.equal(bpmIn().value,'90');
  t.click('bpmstep','1'); t.click('bpmstep','1');
  assert.equal(t.state().lists[0].bpm,92);
  fireEvent.change(bpmIn(),{target:{value:'128'}});
  assert.equal(t.state().lists[0].bpm,128);
  fireEvent.change(bpmIn(),{target:{value:'5'}}); fireEvent.blur(bpmIn()); // 범위 밖은 최소값으로
  assert.equal(t.state().lists[0].bpm,30); assert.equal(bpmIn().value,'30');
  t.click('beats','3');
  assert.equal(t.state().lists[0].beats,3);
  assert.equal(t.container.querySelectorAll('.beatdots i').length,3);
  t.click('pnew','');
  assert.equal(bpmIn().value,'90','새 곡은 기본 빠르기');
  assert.equal(t.state().lists[1].beats,4);
  t.click('pswitch','0');
  assert.equal(bpmIn().value,'30','곡을 바꾸면 그 곡의 빠르기');
});

test('메트로놈: 재생하면 박이 돌고 연주 중인 마디가 강조되며, 정지하면 멈춘다',async()=>{
  window.AudioContext=FakeAudio;
  try{
    const t=boot(null,'prog');
    addFirst(t); t.click('bar','1'); addFirst(t);           // 1·2마디에 코드 → 곡 길이 2마디
    fireEvent.change(t.container.querySelector('input[data-k="bpm"]'),{target:{value:'240'}}); // 한 박 0.25초
    t.click('beats','2');                                     // 한 마디 0.5초
    t.click('view','play');
    t.click('mplay','');
    assert.equal(t.btn('mplay','').getAttribute('aria-pressed'),'true');
    await wait(400);
    assert.ok(FakeAudio.clicks>=2,'클릭 소리를 예약한다');
    assert.equal(t.container.querySelectorAll('.beatdots i.on').length,1,'지금 박 하나가 켜진다');
    assert.equal(t.container.querySelectorAll('.playbar.now').length,1);
    await wait(1100);                                         // 두 마디를 넘기면 처음 마디로 돌아온다
    const seen=t.container.querySelector('.playbar.now');
    assert.ok(seen,'계속 한 마디가 강조된다');
    assert.ok(['1마디','2마디'].includes(seen.getAttribute('aria-label')),'빈 3·4마디로는 가지 않는다');
    t.click('mplay','');
    assert.equal(t.btn('mplay','').getAttribute('aria-pressed'),'false');
    const n=FakeAudio.clicks; await wait(300);
    assert.equal(FakeAudio.clicks,n,'정지하면 더 예약하지 않는다');
    assert.equal(t.container.querySelector('.playbar.now'),null);
  }finally{ delete window.AudioContext; }
});

test('Web Audio가 없는 브라우저: 메트로놈 버튼이 꺼지고 안내가 나온다',()=>{
  const t=boot(null,'prog');
  assert.equal(t.btn('mplay','').disabled,true);
  assert.match(t.container.querySelector('.tempo').textContent,/소리를 낼 수 없어요/);
});

test('곡 공유 링크에 빠르기·박자가 담기고, 받은 쪽에서 같은 빠르기로 열린다',async()=>{
  let copied='';
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async x=>{ copied=x; }},configurable:true});
  const t=boot(null,'prog');
  addFirst(t);
  fireEvent.change(t.container.querySelector('input[data-k="bpm"]'),{target:{value:'132'}});
  t.click('beats','3');
  await act(async()=>{ fireEvent.click(t.container.querySelector('button[data-k="pshare"]')); });
  const url=new URL(copied);
  assert.equal(url.searchParams.get('bpm'),'132'); assert.equal(url.searchParams.get('ts'),'3');
  cleanup(); localStorage.clear();
  window.history.pushState(null,'','/progression/'+url.search);
  const u=boot(null,'prog');
  assert.equal(u.state().lists[0].bpm,132); assert.equal(u.state().lists[0].beats,3);
  assert.equal(u.container.querySelector('input[data-k="bpm"]').value,'132');
  assert.equal(window.location.search,'','빠르기 값도 주소에서 지운다');
  // 빠르기가 없는 예전 링크는 기본 빠르기
  cleanup(); localStorage.clear();
  window.history.pushState(null,'','/progression/?p='+url.searchParams.get('p'));
  const v=boot(null,'prog');
  assert.equal(v.state().lists[0].bpm,90);
});

// ----- 합주 방 (Supabase 대신 tests/shims/supabase.js 의 버스) -----
const ROOM_ENV={NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_test'};
const withRoom=async(fn)=>{
  Object.assign(process.env,ROOM_ENV); window.AudioContext=FakeAudio; FakeAudio.clicks=0; resetBus();
  try{ await fn(); }finally{
    for(const k of Object.keys(ROOM_ENV)) delete process.env[k];
    delete window.AudioContext; resetBus(); window.history.pushState(null,'','/');
  }
};
const openRoomAt=async(id)=>{ window.history.pushState(null,'','/room/?id='+id); const t=boot(null,'room'); await wait(30); return t; };
const sentBy=(event,from)=>bus.sent.filter(m=>m.event===event&&(!from||m.from===from));

test('합주 방: 서버 설정이 없거나 방 링크가 잘못되면 안내만 보인다',async()=>{
  window.history.pushState(null,'','/room/?id=abcdefgh');
  let t=boot(null,'room'); await wait(10);
  assert.match(t.container.textContent,/서버 설정\(Supabase\)이 없어/);
  cleanup();
  await withRoom(async()=>{
    window.history.pushState(null,'','/room/?id=../../x');
    t=boot(null,'room'); await wait(10);
    assert.match(t.container.textContent,/방 링크가 올바르지 않아요/);
  });
  // 설정이 없으면 진행 페이지에 방 만들기 버튼도 없다
  cleanup(); window.history.pushState(null,'','/progression/');
  const p=boot(null,'prog');
  assert.equal(p.container.querySelector('[data-k="room"]'),null);
});

test('합주 방 참여자: 방장 시계에 맞춰, 소리를 켠 뒤 방장이 재생하면 울리고 정지하면 멈춘다',async()=>{
  await withRoom(async()=>{
    const AHEAD=5000; // 방장 기기 시계가 5초 빠르다
    const h=makeChannel('fretguide-room-guestroom1',{config:{presence:{key:'H'}}});
    let grid={playing:false};
    const sendState=()=>h.send({type:'broadcast',event:'state',payload:{v:epochNow()+AHEAD,song:{t:'가을 노래',bpm:240,ts:2},grid}});
    h.on('broadcast',{event:'hello'},sendState);
    h.on('broadcast',{event:'ping'},({payload:p})=>h.send({type:'broadcast',event:'pong',payload:{to:p.from,n:p.n,t0:p.t0,th:epochNow()+AHEAD}}));
    h.subscribe(); h.track({me:'H',role:'host'});

    const t=await openRoomAt('guestroom1');
    assert.equal(t.container.querySelector('.badge').textContent,'참여자');
    assert.match(t.container.querySelector('[data-k="song"]').textContent,/가을 노래.*240 BPM · 2\/4/);
    await wait(1400); // 핑 8번
    assert.match(t.container.querySelector('[data-k="clock"]').textContent,/시계 맞춤 ±\d+ms/);

    // 소리를 켜기 전에는 방장이 재생해도 울리지 않는다
    grid={playing:true,anchor:epochNow()+AHEAD+300,index:0,bpm:240,beats:2}; sendState();
    await wait(600);
    assert.equal(FakeAudio.clicks||0,0);
    // 소리를 켜면 이미 진행 중인 박자 격자에 맞춰 바로 울린다 (시계 차이 5초를 반영하지 않으면 5초 동안 조용하다)
    fireEvent.click(t.container.querySelector('button[data-k="gjoin"]'));
    await wait(500);
    assert.ok(FakeAudio.clicks>=1,'방장 격자에 맞춰 클릭');
    assert.match(t.container.querySelector('.gstate').textContent,/재생 중/);
    assert.equal(t.container.querySelectorAll('.guest .beatdots i').length,2);
    // 방장 정지
    grid={playing:false}; sendState(); await wait(50);
    const n=FakeAudio.clicks; await wait(400);
    assert.equal(FakeAudio.clicks,n,'정지 후에는 더 울리지 않는다');
    assert.match(t.container.querySelector('.gstate').textContent,/방장이 재생하면/);
    // 늦게 도착한 옛 상태(재생 중)는 무시한다
    h.send({type:'broadcast',event:'state',payload:{v:1,song:{t:'옛',bpm:60,ts:4},grid:{playing:true,anchor:0,index:0,bpm:60,beats:4}}});
    await wait(300);
    assert.equal(FakeAudio.clicks,n);
    h._leave();
  });
});

test('합주 방 방장: 상태·시계 응답을 보내고, 재생·빠르기 변경·정지를 알린다',async()=>{
  await withRoom(async()=>{
    localStorage.setItem('fretguide.rooms',JSON.stringify(['hostroom1']));
    const got=[];
    const q=makeChannel('fretguide-room-hostroom1',{config:{presence:{key:'G'}}});
    q.on('broadcast',{event:'state'},({payload})=>got.push(payload));
    const pongs=[]; q.on('broadcast',{event:'pong'},({payload})=>pongs.push(payload));
    q.subscribe(); q.track({me:'G',role:'guest'});

    const t=await openRoomAt('hostroom1');
    assert.equal(t.container.querySelector('.badge').textContent,'방장');
    await wait(30);
    q.send({type:'broadcast',event:'hello',payload:{from:'G'}});
    q.send({type:'broadcast',event:'ping',payload:{from:'G',n:0,t0:123}});
    await wait(30);
    const last=()=>got[got.length-1];
    assert.deepEqual(last().song,{t:'진행 1',bpm:90,ts:4});
    assert.equal(last().grid.playing,false);
    assert.equal(pongs.length,1); assert.equal(pongs[0].to,'G'); assert.equal(pongs[0].t0,123);
    assert.ok(Math.abs(pongs[0].th-epochNow())<200,'방장 시계로 답한다');
    assert.match(t.container.querySelector('.conn').textContent,/접속 2명/);

    // 재생: 1.5초 뒤 0번째 박
    t.click('mplay',''); await wait(20);
    const g1=last().grid;
    assert.equal(g1.playing,true); assert.equal(g1.index,0); assert.equal(g1.bpm,90);
    assert.ok(Math.abs(g1.anchor-(epochNow()+1500))<150,'시작 시각은 약 1.5초 뒤');
    // 재생 중 빠르기 변경: 같은 격자의 뒤쪽 박부터 새 빠르기
    t.click('bpmstep','1'); await wait(20);
    const g2=last().grid;
    assert.equal(g2.bpm,91); assert.equal(last().song.bpm,91);
    assert.ok(g2.anchor>=g1.anchor,'앞당기지 않는다');
    assert.ok(Math.abs(((g2.anchor-g1.anchor)/(60000/90))-g2.index)<1e-6,'원래 격자의 박 위');
    // 정지
    t.click('mplay',''); await wait(20);
    assert.equal(last().grid.playing,false);
    // 이 기기 이어폰 지연 보정은 기기에 저장된다
    fireEvent.change(t.container.querySelector('input[data-k="lead"]'),{target:{value:'180'}});
    assert.equal(localStorage.getItem('fretguide.lead'),'180');
    assert.match(t.container.querySelector('.calib summary').textContent,/180ms/);
    q._leave();
  });
});

test('진행 페이지의 합주 방 만들기: 이 기기를 방장으로 기억하고 방으로 간다',async()=>{
  await withRoom(async()=>{
    window.history.pushState(null,'','/progression/');
    const t=boot(null,'prog'); await wait(10);
    const a=t.container.querySelector('a[data-k="room"]');
    const m=/^\/room\/\?id=([a-z0-9]{10})$/.exec(a.getAttribute('href'));
    assert.ok(m,`방 주소 ${a.getAttribute('href')}`);
    a.addEventListener('click',e=>e.preventDefault()); // jsdom은 페이지 이동을 하지 않는다
    fireEvent.click(a);
    assert.deepEqual(JSON.parse(localStorage.getItem('fretguide.rooms')),[m[1]]);
  });
});
