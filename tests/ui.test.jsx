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
import {makeChannel,resetBus,bus,authBus,db,signIn,serverRow,readRow,resetAuth} from './shims/supabase.js';
import {SYNC_DELAY} from '../components/useCloudSync.js';
import {META_KEY} from '../lib/cloud.js';
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
// 탭 악보에서 마디마다 코드 이름·멜로디 음이름 (마디 창을 열지 않아도 읽힌다)
const tabBars=t=>[...t.container.querySelectorAll('.tab .tbar')];
const chordNames=t=>tabBars(t).map(b=>[...b.querySelectorAll('.tcol.c')].map(x=>x.dataset.name));
const melodyNames=t=>tabBars(t).map(b=>[...b.querySelectorAll('.tcol.n')].map(x=>x.dataset.name));
// 탭 악보의 프렛 숫자: 마디 → 칸 → 위(1번 줄)에서부터 6칸
const tabCells=(t,bi)=>[...tabBars(t)[bi].querySelectorAll('.tcol')].map(c=>[...c.querySelectorAll('.tcell')].map(x=>x.textContent));
const sheet=t=>t.container.querySelector('.sheet');
const openBar=(t,bi=0)=>fireEvent.click(t.container.querySelector(`.tab button[data-k="bar"][data-v="${bi}"]`));
const adding=(t,bar)=>{ const b=t.btn('cadd',String(bar)); return !!b&&b.getAttribute('aria-pressed')==='true'; }; // 마디 창이 그 마디에서 코드를 더하는 중
const melodyOrder=t=>[...sheet(t).querySelectorAll('.mnote i')].map(x=>x.textContent); // 열린 마디의 멜로디 번호
// 첫 폼을 넣는다. 마디 창이 닫혀 있으면 1마디 창을 연다
const addFirst=t=>{ if(!sheet(t)) openBar(t,0); fireEvent.click(t.container.querySelector('button[data-k="fadd"][data-v="0"]')); };
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
  assert.equal(t.container.querySelectorAll('.ngrid button[data-k="nnote"]').length,6*25);
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

test('진행 페이지: 처음에는 빈 마디 4개의 탭 악보 한 줄이 보이고, 마디를 누르면 그 마디 창이 뜬다',()=>{
  const t=boot(null,'prog');
  assert.equal(t.container.querySelectorAll('.tab .tabline').length,1,'4마디가 한 줄');
  assert.equal(tabBars(t).length,4);
  assert.deepEqual(chordNames(t),[[],[],[],[]]);
  assert.deepEqual([...t.container.querySelectorAll('.tnames span')].map(x=>x.textContent),['e','B','G','D','A','E'],'위에서부터 1번 줄');
  assert.equal(sheet(t),null,'처음에는 창이 닫혀 있다');
  assert.equal(t.container.querySelector('.finder'),null,'코드 폼은 마디 창에서 고른다');
  assert.ok(t.container.querySelector('button[data-k="padd"]'));
  for(const k of ['pshare','pclear']) assert.equal(t.container.querySelector(`button[data-k="${k}"]`),null,`${k}는 내용이 생긴 뒤에 나온다`);
  assert.equal(t.container.querySelector('[data-k="view"]'),null,'연주용 보기 전환은 없다(탭 악보가 연주 화면)');
  openBar(t,2);
  assert.ok(sheet(t));
  assert.equal(sheet(t).getAttribute('role'),'dialog');
  assert.match(t.container.querySelector('#sheet-h').textContent,/3마디/);
  assert.equal(adding(t,2),true,'코드를 더하는 상태로 열린다');
  assert.ok(sheet(t).querySelector('.finder'));
  assert.equal(t.btn('del','').disabled,true,'고른 것이 없으면 지울 것이 없다');
  assert.ok(tabBars(t)[2].classList.contains('picked'));
  // 닫기: ✕, Esc
  t.click('pclose','');
  assert.equal(sheet(t),null);
  openBar(t,0);
  fireEvent.keyDown(document,{key:'Escape'});
  assert.equal(sheet(t),null);
});

test('탭 악보: 코드는 폼의 프렛을 세로로 쌓고 위에 이름, 멜로디는 그 줄 위의 숫자로 코드 뒤에 놓인다',()=>{
  const t=boot(null,'prog');
  addFirst(t);                     // Am: x 0 2 2 1 0 (6번 줄 → 1번 줄)
  t.click('kind','n'); fireEvent.click(noteCell(t,5,5)); fireEvent.click(noteCell(t,0,3)); // 1번 줄 5프렛, 6번 줄 3프렛
  assert.deepEqual(chordNames(t)[0],['Am']);
  assert.deepEqual(melodyNames(t)[0],['A','G']);
  assert.deepEqual(tabCells(t,0),[
    ['0','1','2','2','0',''],      // 위(e)에서 아래(E)로: 6번 줄은 치지 않아 비어 있다
    ['5','','','','',''],
    ['','','','','','3']
  ]);
  assert.equal(tabBars(t)[0].querySelector('.tcol.c .tchord').textContent,'Am');
  assert.match(tabBars(t)[0].getAttribute('aria-label'),/^1마디, 코드 Am, 멜로디 A G/);
  assert.match(tabBars(t)[1].getAttribute('aria-label'),/^2마디, 비어 있음/);
});

test('코드 넣기: 창의 마디에 코드가 차례로 더해지고(최대 4개), ◀ ▶로 다른 마디로 옮긴다',()=>{
  const t=boot(null,'prog');
  addFirst(t);
  assert.deepEqual(chordNames(t),[['Am'],[],[],[]]);
  assert.equal(barsOf(t)[0].chords[0].frets.length,6);
  assert.equal(adding(t,0),true,'넣은 뒤에도 1마디에 더하는 상태');
  setChord(t,0,'maj'); addFirst(t);
  t.click('root','7'); addFirst(t);
  assert.deepEqual(chordNames(t),[['Am','C','G'],[],[],[]]);
  // 한 마디 코드는 최대 4개: 4개가 차면 더하는 버튼이 없어지고 폼 카드의 +도 막힌다
  setChord(t,2,'min'); addFirst(t);
  assert.deepEqual(chordNames(t)[0],['Am','C','G','Dm']);
  assert.equal(t.container.querySelector('button[data-k="cadd"]'),null);
  assert.ok(t.container.querySelector('button[data-k="fadd"]').disabled);
  addFirst(t);
  assert.equal(barsOf(t)[0].chords.length,4);
  // ▶ 다음 마디: 앞 마디의 마지막 코드가 기준 폼으로 보인다
  assert.equal(t.btn('pbar','-1').disabled,true,'1마디에서는 이전이 없다');
  t.click('pbar','1');
  assert.match(t.container.querySelector('#sheet-h').textContent,/2마디/);
  assert.deepEqual([...t.container.querySelectorAll('.refs .card.ref')].map(x=>x.dataset.v),['이전 폼']);
  assert.match(t.container.querySelector('.refs .card.ref').textContent,/1마디 Dm/);
  setChord(t,9,'min'); addFirst(t); setChord(t,4,'min'); addFirst(t);
  assert.deepEqual(chordNames(t),[['Am','C','G','Dm'],['Am','Em'],[],[]]);
  t.click('pbar','1'); t.click('pbar','1');
  assert.equal(t.btn('pbar','1').disabled,true,'마지막 마디에서는 다음이 없다');
});

test('코드 고쳐 쓰기·지우기: 창에서 코드를 고르면 불러와지고 ↺ 로 바꾸고 삭제로 비운다',()=>{
  const t=boot(null,'prog');
  for(const [i,[r,q]] of [[0,'maj'],[9,'min'],[2,'min'],[7,'maj']].entries()){ openBar(t,i); setChord(t,r,q); addFirst(t); }
  assert.deepEqual(chordNames(t),[['C'],['Am'],['Dm'],['G']]);
  const keep=barsOf(t).map(b=>b.chords[0].frets.join());
  openBar(t,1); t.click('slot','1.0'); // Am 칸 선택
  assert.deepEqual([t.state().root,t.state().q],[9,'min'],'고른 코드를 불러온다');
  assert.equal(t.container.querySelector('button[data-k="fadd"]'),null);
  assert.ok(t.container.querySelector('button[data-k="frep"][data-v="0"]'));
  assert.ok(t.container.querySelector('.cards .card.cur'),'지금 칸의 폼 표시');
  assert.deepEqual([...t.container.querySelectorAll('.refs .card.ref')].map(x=>x.dataset.v),['이전 폼','다음 폼']);
  // Am → Em 으로 교체: 이웃 마디는 그대로
  setChord(t,4,'min');
  fireEvent.click(t.container.querySelector('button[data-k="frep"][data-v="0"]'));
  assert.deepEqual(chordNames(t),[['C'],['Em'],['Dm'],['G']]);
  const now=barsOf(t).map(b=>b.chords[0].frets.join());
  assert.equal(now[0],keep[0]); assert.equal(now[2],keep[2]); assert.equal(now[3],keep[3]); assert.notEqual(now[1],keep[1]);
  // 삭제: 그 코드만 빠지고 마디 수는 그대로, 다시 더하는 상태로 돌아간다
  t.click('slot','1.0'); t.click('del','');
  assert.deepEqual(chordNames(t),[['C'],[],['Dm'],['G']]);
  assert.equal(barsOf(t).length,4);
  assert.equal(t.btn('del','').disabled,true);
  assert.equal(adding(t,1),true);
  setChord(t,9,'min'); addFirst(t);
  assert.deepEqual(chordNames(t),[['C'],['Am'],['Dm'],['G']]);
  // 한 마디 안에서 가운데 코드를 지우면 뒤 코드가 앞으로 당겨진다
  addFirst(t); setChord(t,2,'min'); addFirst(t);
  assert.deepEqual(chordNames(t)[1],['Am','Am','Dm']);
  t.click('slot','1.1'); t.click('del','');
  assert.deepEqual(chordNames(t)[1],['Am','Dm']);
  // 마디 비우기
  openBar(t,2); t.click('bclear','');
  assert.deepEqual(chordNames(t)[2],[]);
});

test('멜로디: 마디 창에서 지판 음을 여러 개 더하고, 고르면 바꾸거나 지울 수 있다',()=>{
  const t=boot(null,'prog');
  openBar(t,0); t.click('kind','n');
  assert.ok(sheet(t).querySelector('.notetable'),'멜로디는 지판 표에서 고른다');
  assert.equal(sheet(t).querySelector('.finder'),null);
  assert.match(t.container.querySelector('.selname').textContent,/음 더하기 \(0\/8\)/);
  fireEvent.click(noteCell(t,0,0)); fireEvent.click(noteCell(t,1,3)); fireEvent.click(noteCell(t,5,5));
  assert.deepEqual(barsOf(t)[0].notes,[{s:0,f:0},{s:1,f:3},{s:5,f:5}]);
  assert.deepEqual(melodyNames(t)[0],['E','C','A']);
  // 다른 마디에도 따로 더한다 (◀ ▶로 옮겨도 멜로디를 넣는 상태 그대로)
  t.click('pbar','1'); fireEvent.click(noteCell(t,2,2));
  assert.deepEqual(melodyNames(t),[['E','C','A'],['E'],[],[]]);
  // 음을 고르면 표에 표시되고, 다른 음을 누르면 바뀐다
  openBar(t,0); t.click('mnote','0.1');
  assert.equal(noteCell(t,1,3).getAttribute('aria-pressed'),'true');
  assert.match(t.container.querySelector('.selname').textContent,/2번째 음 C/);
  fireEvent.click(noteCell(t,2,2));
  assert.deepEqual(melodyNames(t)[0],['E','E','A']);
  t.click('del','');
  assert.deepEqual(melodyNames(t)[0],['E','A']);
  assert.match(t.container.querySelector('.selname').textContent,/음 더하기 \(2\/8\)/);
  // 한 마디에 8개까지, 24프렛까지
  for(let i=0;i<10;i++) fireEvent.click(noteCell(t,0,20+i%5));
  assert.equal(barsOf(t)[0].notes.length,8);
  assert.equal(barsOf(t)[0].notes[6].f,24,'24프렛 음도 넣는다');
  assert.equal(noteCell(t,0,0).disabled,true,'8개가 차면 더할 수 없다');
  t.click('bclear','');
  assert.deepEqual(melodyNames(t)[0],[]);
});

test('멜로디 표시·순서: 창에서 음에 순서 번호가 붙고, 앞·뒤로 옮기면 탭 악보 순서도 바뀐다',()=>{
  const t=boot(null,'prog');
  openBar(t,0);
  assert.deepEqual([...sheet(t).querySelectorAll('.rowtag')].map(x=>x.textContent),['코드','♪ 멜로디']);
  t.click('kind','n');
  assert.equal(t.btn('nmove','-1').disabled,true,'고른 음이 없으면 옮길 수 없다');
  fireEvent.click(noteCell(t,0,0)); fireEvent.click(noteCell(t,1,3)); fireEvent.click(noteCell(t,5,5)); // E C A
  assert.deepEqual(melodyOrder(t),['1','2','3']);
  assert.equal(noteCell(t,1,3).querySelector('.ord').textContent,'2');
  t.click('mnote','0.2');
  assert.equal(t.btn('nmove','1').disabled,true,'맨 뒤는 더 뒤로 못 간다');
  t.click('nmove','-1');
  assert.deepEqual(melodyNames(t)[0],['E','A','C']);
  assert.equal(t.btn('mnote','0.1').getAttribute('aria-pressed'),'true','옮긴 음이 계속 선택돼 있다');
  t.click('nmove','-1');
  assert.deepEqual(melodyNames(t)[0],['A','E','C']);
  // 다른 마디의 표시는 섞이지 않는다
  t.click('pbar','1');
  assert.equal(noteCell(t,1,3).querySelector('.ord'),null);
});

test('마디 추가: 하단 + 로 8마디까지(두 줄), 저장·복원',()=>{
  const t=boot(null,'prog');
  for(let i=0;i<4;i++) fireEvent.click(t.container.querySelector('button[data-k="padd"]'));
  assert.equal(tabBars(t).length,8);
  assert.equal(t.container.querySelectorAll('.tab .tabline').length,2,'4마디씩 두 줄');
  assert.equal(t.container.querySelector('button[data-k="padd"]'),null,'8마디가 최대');
  openBar(t,7); addFirst(t);
  assert.equal(chordNames(t)[7][0],'Am');
  const raw=JSON.stringify(t.state());
  cleanup();
  const b=boot(raw,'prog');
  assert.equal(tabBars(b).length,8);
  assert.equal(chordNames(b)[7][0],'Am');
  // 5마디만 있으면 둘째 줄은 마디 하나와 빈자리 셋 (마디 폭이 늘어나지 않게)
  cleanup();
  const c=boot({lists:[{title:'x',bars:Array.from({length:5},()=>({chords:[],notes:[]}))}],cur:0},'prog');
  const second=c.container.querySelectorAll('.tab .tabline')[1];
  assert.equal(second.querySelectorAll('.tbar').length,1);
  assert.equal(second.querySelectorAll('.tgap').length,3);
});

test('전체 비우기: 빈 마디 4개로 돌아간다',()=>{
  const t=boot(null,'prog');
  addFirst(t); setChord(t,0,'maj'); addFirst(t);
  t.click('pclose','');
  fireEvent.click(t.container.querySelector('button[data-k="padd"]'));
  t.click('pclear','');
  assert.equal(tabBars(t).length,4);
  assert.deepEqual(chordNames(t),[[],[],[],[]]);
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
    const ks=['bar','slot','cadd','mnote','kind','del','bclear','padd','fadd','frep','nnote','nmove','pbar','pclose'];
    const list=[...t.container.querySelectorAll(ks.map(k=>`button[data-k="${k}"]`).join(','))].filter(b=>!b.disabled);
    fireEvent.click(list[rnd(list.length)]);
    const s=barsOf(t);
    assert.ok(s.length>=4&&s.length<=8);
    assert.ok(s.every(b=>b.chords.length<=4&&b.notes.length<=8&&!('div' in b)),`${i}번째 클릭 후 마디 모양`);
    assert.equal(t.container.querySelectorAll('.sheet .slot[aria-pressed="true"],.sheet .mnote[aria-pressed="true"]').length<=1,true);
    assert.deepEqual(chordNames(t).map(x=>x.length),s.map(b=>b.chords.length),'탭 악보가 데이터와 같다');
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
  assert.equal(sheet(t),null,'진행을 바꾸면 마디 창이 닫힌다');
  openBar(t,0); setChord(t,0,'maj'); addFirst(t);
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

test('메트로놈: 재생하면 박이 돌고 탭 악보에서 연주 중인 마디가 강조되며, 정지하면 멈춘다',async()=>{
  window.AudioContext=FakeAudio;
  try{
    const t=boot(null,'prog');
    addFirst(t); t.click('bar','1'); addFirst(t);           // 1·2마디에 코드 → 곡 길이 2마디
    fireEvent.change(t.container.querySelector('input[data-k="bpm"]'),{target:{value:'240'}}); // 한 박 0.25초
    t.click('beats','2');                                     // 한 마디 0.5초
    t.click('pclose','');                                     // 창을 닫고 탭 악보를 보며 연주
    t.click('mplay','');
    assert.equal(t.btn('mplay','').getAttribute('aria-pressed'),'true');
    await wait(400);
    assert.ok(FakeAudio.clicks>=2,'클릭 소리를 예약한다');
    assert.equal(t.container.querySelectorAll('.beatdots i.on').length,1,'지금 박 하나가 켜진다');
    assert.equal(t.container.querySelectorAll('.tab .tbar.now').length,1);
    await wait(1100);                                         // 두 마디를 넘기면 처음 마디로 돌아온다
    const seen=t.container.querySelector('.tab .tbar.now');
    assert.ok(seen,'계속 한 마디가 강조된다');
    assert.match(seen.getAttribute('aria-label'),/^[12]마디/,'빈 3·4마디로는 가지 않는다');
    t.click('mplay','');
    assert.equal(t.btn('mplay','').getAttribute('aria-pressed'),'false');
    const n=FakeAudio.clicks; await wait(300);
    assert.equal(FakeAudio.clicks,n,'정지하면 더 예약하지 않는다');
    assert.equal(t.container.querySelector('.tab .tbar.now'),null);
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
    // 듣는 기기(스피커·유선)를 고르면 바로 참여해, 이미 진행 중인 박자 격자에 맞춰 울린다
    // (시계 차이 5초를 반영하지 않으면 5초 동안 조용하다)
    assert.equal(t.container.querySelector('button[data-k="gjoin"]'),null,'처음에는 참여 버튼 대신 듣는 기기를 묻는다');
    fireEvent.click(t.container.querySelector('button[data-k="outwired"]'));
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

    // 방장도 먼저 듣는 기기를 고른다 (그 전에는 재생 버튼이 없다)
    assert.equal(t.container.querySelector('button[data-k="mplay"]'),null);
    fireEvent.click(t.container.querySelector('button[data-k="outwired"]'));
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

test('듣는 기기 맞추기: 블루투스는 탭으로 지연을 재서 그 값으로 참여하고, 다음에 들어오면 묻지 않는다',async()=>{
  await withRoom(async()=>{
    const q=(s)=>t.container.querySelector(s);
    let t=await openRoomAt('btroom01');
    assert.match(q('.setup').textContent,/무엇으로 들으세요/);
    // 블루투스 → 탭 측정 화면. 재는 동안 박 점(눈으로 보는 박)은 없다
    fireEvent.click(q('button[data-k="outbt"]'));
    assert.ok(q('button[data-k="caltap"]'));
    assert.equal(q('.beatdots'),null,'재는 동안 박을 눈으로 보여 주지 않는다');
    // 취소하면 다시 고르기로
    fireEvent.click(q('button[data-k="calstop"]'));
    assert.ok(q('button[data-k="outbt"]'));
    // 다시 재기: 들리는 박(1번 박부터 600ms마다)보다 180ms 늦게 8번 누른다
    fireEvent.click(q('button[data-k="outbt"]'));
    const t0=performance.now();
    for(let k=1;k<=8;k++){
      const at=600+k*600+180-(performance.now()-t0);
      if(at>0) await wait(at);
      fireEvent.pointerDown(q('button[data-k="caltap"]'));
    }
    const ms=Number(q('[data-k="calms"]').textContent.replace('ms',''));
    assert.ok(Math.abs(ms-180)<=40,`잰 지연 ${ms}ms`);
    fireEvent.click(q('button[data-k="outok"]'));
    assert.ok(q('.gstate'),'그 값으로 바로 참여');
    assert.equal(JSON.parse(localStorage.getItem('fretguide.output')),'bt');
    assert.equal(Number(localStorage.getItem('fretguide.lead')),ms);
    assert.match(q('.calib summary').textContent,/블루투스.*\d+ms/);
    // 다음에 들어오면 묻지 않고 참여 버튼이 바로 나온다
    cleanup(); t=await openRoomAt('btroom01');
    assert.equal(q('.setup'),null);
    assert.ok(q('button[data-k="gjoin"]'));
    // 듣는 기기 다시 고르기
    fireEvent.click(q('button[data-k="outreset"]'));
    assert.ok(q('.setup'));
    assert.equal(localStorage.getItem('fretguide.output'),null);
  });
});

// ----- 로그인·기기 사이 동기화 (Supabase 대신 tests/shims/supabase.js 의 auth·테이블) -----
const withCloud=async(fn)=>{
  Object.assign(process.env,ROOM_ENV); resetAuth();
  try{ await fn(); }finally{
    for(const k of Object.keys(ROOM_ENV)) delete process.env[k];
    resetAuth(); window.history.pushState(null,'','/');
  }
};
const acct=t=>t.container.querySelector('.acct');
const gate=t=>t.container.querySelector('.gate');
// Google에서 돌아온 것처럼: 로그인된 상태가 되고 로그인 상태 변화가 앱에 전해진다
const backFromGoogle=async(email='me@example.com')=>{ await act(async()=>{ signIn(email); }); await wait(30); };
const song=(title,chord)=>({title,bars:[{chords:chord?[chord]:[],notes:[]},{chords:[],notes:[]},{chords:[],notes:[]},{chords:[],notes:[]}],bpm:90,beats:4});
const AM={root:9,q:'min',frets:[null,0,2,2,1,0]},C={root:0,q:'maj',frets:[null,3,2,0,1,0]};
const titles=t=>t.state().lists.map(l=>l.title);

test('로그인 칸: 서버 설정이 없으면 보이지 않는다',()=>{
  const t=boot();
  assert.equal(acct(t),null);
});

test('들어올 때 로그인 권하기: Google로 로그인하거나 건너뛸 수 있고, 건너뛰면 이 기기에서는 다시 묻지 않는다',async()=>{
  // 서버 설정이 없으면 띄우지 않는다
  let t=boot(); await wait(10);
  assert.equal(gate(t),null);
  cleanup();
  await withCloud(async()=>{
    t=boot(); await wait(10);
    assert.ok(gate(t),'처음 들어오면 로그인을 권한다');
    assert.equal(gate(t).getAttribute('role'),'dialog');
    assert.match(gate(t).textContent,/로그인 없이 쓰기/);
    t.click('skiplogin','');
    assert.equal(gate(t),null);
    assert.ok(acct(t),'건너뛰어도 ⚙ 보기 설정에서 로그인할 수 있다');
    cleanup();
    t=boot(); await wait(10);
    assert.equal(gate(t),null,'건너뛴 기기에서는 다시 묻지 않는다');
    cleanup(); localStorage.clear();
    // 합주 방 링크로 들어오면 묻지 않는다
    window.history.pushState(null,'','/room/?id=abcdefghij');
    t=boot(); await wait(10);
    assert.equal(gate(t),null);
    cleanup(); window.history.pushState(null,'','/');
    // Google 로그인을 시작하지 못하면 안내가 나온다
    authBus.oauthFail=true;
    t=boot(); await wait(10);
    fireEvent.click(gate(t).querySelector('button[data-k="google"]')); await wait(10);
    assert.match(gate(t).textContent,/Google 로그인을 시작하지 못했어요/);
    cleanup();
    // Google에서 실패하고 돌아오면(주소에 error_description) 그 이유를 보여 준다
    authBus.oauthFail=false;
    window.history.pushState(null,'','/?error=access_denied&error_description=Access+denied');
    t=boot(); await wait(10);
    assert.match(gate(t).textContent,/로그인하지 못했어요: Access denied/);
  });
});

test('Google 로그인: 지금 페이지로 돌아오게 Google로 보내고, 돌아오면 이 기기의 진행을 서버에 올린다',async()=>{
  await withCloud(async()=>{
    window.history.pushState(null,'','/progression/');
    const t=boot({lists:[song('내 곡',AM)],cur:0},'prog');
    await wait(10);
    fireEvent.click(gate(t).querySelector('button[data-k="google"]')); await wait(10);
    assert.equal(authBus.oauth.length,1);
    assert.equal(authBus.oauth[0].provider,'google');
    assert.equal(authBus.oauth[0].options.redirectTo,'http://localhost/progression/');
    assert.match(gate(t).textContent,/Google로 이동 중/);
    await backFromGoogle();
    assert.equal(gate(t),null,'로그인하면 닫힌다');
    assert.match(acct(t).textContent,/me@example.com/);
    assert.match(acct(t).textContent,/동기화됨/);
    const row=readRow('user_settings','user-me@example.com');
    assert.deepEqual(row.data.lists.map(l=>l.title),['내 곡']);
    assert.equal('cur' in row.data,false,'지금 고른 진행은 기기마다 따로');
  });
});

test('새 기기: 로그인하면 서버의 진행을 받아 오고, 고친 내용은 잠시 뒤 서버에 올라간다',async()=>{
  await withCloud(async()=>{
    const uid=signIn('me@example.com');
    serverRow('user_settings',uid,{root:0,q:'maj',n:0,label:'degree',flat:true,lists:[song('A',AM),song('B',C)]},'2026-01-01T00:00:00.000Z');
    const t=boot(null,'prog'); await wait(30);
    assert.deepEqual(titles(t),['A','B']);
    assert.equal(t.state().label,'degree');
    assert.equal(db.writes,0,'받기만 했으면 다시 올리지 않는다');
    fireEvent.click(t.container.querySelector('button[data-k="pnew"]'));
    await wait(SYNC_DELAY/2);
    assert.equal(db.writes,0,'바로 올리지 않고 모았다가');
    await wait(SYNC_DELAY);
    assert.equal(db.writes,1);
    assert.deepEqual(readRow('user_settings',uid).data.lists.map(l=>l.title),['A','B','진행 3']);
  });
});

test('두 기기 모두 내용이 있으면: 서버 진행 뒤에 이 기기에만 있는 진행을 붙인다',async()=>{
  await withCloud(async()=>{
    const uid=signIn('me@example.com');
    serverRow('user_settings',uid,{root:9,q:'min',n:0,label:'note',flat:false,lists:[song('A',AM)]});
    const t=boot({lists:[song('A',AM),song('폰에서 만든 곡',C)],cur:1}); await wait(30);
    assert.deepEqual(titles(t),['A','폰에서 만든 곡']);
    assert.deepEqual(readRow('user_settings',uid).data.lists.map(l=>l.title),['A','폰에서 만든 곡']);
  });
});

test('다른 기기에서 바꾼 내용은 탭으로 돌아올 때 가져오고, 서버에 실패하면 다시 시도할 수 있다',async()=>{
  await withCloud(async()=>{
    const uid=signIn('me@example.com');
    serverRow('user_settings',uid,{lists:[song('A',AM)]},'2026-01-01T00:00:00.000Z');
    const t=boot(); await wait(30);
    assert.deepEqual(titles(t),['A']);
    serverRow('user_settings',uid,{lists:[song('A',AM),song('PC에서 추가',C)]},'2026-01-02T00:00:00.000Z');
    await act(async()=>{ document.dispatchEvent(new window.Event('visibilitychange')); });
    await wait(30);
    assert.deepEqual(titles(t),['A','PC에서 추가']);
    assert.equal(db.writes,0);
    db.fail=true;
    await act(async()=>{ document.dispatchEvent(new window.Event('visibilitychange')); });
    await wait(30);
    assert.match(acct(t).textContent,/동기화하지 못했어요/);
    db.fail=false;
    fireEvent.click(t.container.querySelector('button[data-k="sretry"]')); await wait(30);
    assert.match(acct(t).textContent,/동기화됨/);
  });
});

test('로그아웃: 이 기기의 내용은 그대로 두고 동기화 기록만 지운다',async()=>{
  await withCloud(async()=>{
    const uid=signIn('me@example.com');
    serverRow('user_settings',uid,{lists:[song('A',AM)]});
    const t=boot(); await wait(30);
    assert.ok(localStorage.getItem(META_KEY));
    fireEvent.click(t.container.querySelector('button[data-k="logout"]')); await wait(10);
    assert.equal(authBus.session,null);
    assert.equal(localStorage.getItem(META_KEY),null);
    assert.deepEqual(titles(t),['A']);
    assert.match(acct(t).textContent,/다른 기기와 같이 쓰기/);
  });
});
