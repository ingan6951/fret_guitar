// 화면 테스트: 코드·지판 페이지(보기 전용)와 진행 페이지(마디마다 코드 1·2·4개 + 멜로디, 고쳐 쓰기·지우기), 설정 저장·복원
// jsdom 환경은 scripts/test-ui.mjs 가 --import 로 먼저 불러온다
import {useState} from 'react';
import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {render,cleanup,fireEvent,act} from '@testing-library/react';
import GuideProvider from '../components/GuideProvider.jsx';
import Shell from '../components/Shell.jsx';
import ExplorePage from '../components/ExplorePage.jsx';
import ProgressionPage from '../components/ProgressionPage.jsx';
import {CHORDS} from '../lib/chords.js';
import {NOTE_SHARP,QUALITIES} from '../lib/fretlogic.js';
import {STORAGE_KEY} from '../lib/settings.js';

afterEach(()=>{ cleanup(); localStorage.clear(); });

// 두 페이지를 한 상태 위에서 오가는 틀: 실제 앱처럼 상태(고른 칸 등)가 페이지를 옮겨도 유지된다
const PAGES={explore:ExplorePage,prog:ProgressionPage};
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
// 마디마다 코드 칸 이름 (빈 칸은 '')
const chordNames=t=>[...t.container.querySelectorAll('.bars .bar')].map(b=>[...b.querySelectorAll('.slot')].map(x=>{ const n=x.querySelector('b'); return n?n.textContent:''; }));
const melodyNames=t=>[...t.container.querySelectorAll('.bars .bar')].map(b=>[...b.querySelectorAll('.mnote')].map(x=>x.textContent));
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

test('진행 페이지: 처음에는 빈 마디 4개(코드 칸 1개씩), 1마디 첫 코드 칸이 선택돼 있다',()=>{
  const t=boot(null,'prog');
  assert.equal(t.container.querySelectorAll('.bars .bar').length,4);
  assert.deepEqual(chordNames(t),[[''],[''],[''],['']]);
  assert.equal(t.btn('slot','0.0').getAttribute('aria-pressed'),'true');
  assert.ok(t.container.querySelector('button[data-k="padd"]'));
  for(const k of ['pshare','pclear']) assert.equal(t.container.querySelector(`button[data-k="${k}"]`),null,`${k}는 내용이 생긴 뒤에 나온다`);
  assert.equal(t.btn('del','').disabled,true,'빈 칸은 지울 것이 없다');
  assert.ok(t.container.querySelector('.finder'),'코드 폼을 여기서 고른다');
});

test('코드 넣기: 고른 칸에 + 로 넣고, 다음 마디로 넘어가지 않고 그 마디가 계속 선택돼 있다',()=>{
  const t=boot(null,'prog');
  addFirst(t);
  assert.deepEqual(chordNames(t),[['Am'],[''],[''],['']]);
  assert.equal(barsOf(t)[0].chords[0].frets.length,6);
  assert.equal(t.btn('slot','0.0').getAttribute('aria-pressed'),'true','넣은 칸이 그대로 선택돼 있다');
  assert.equal(t.btn('slot','1.0').getAttribute('aria-pressed'),'false','다음 마디로 넘어가지 않는다');
  assert.equal(t.btn('bar','0').getAttribute('aria-pressed'),'true');
  // 마디를 고르지 않고 다른 코드를 계속 누르면 같은 칸이 바뀐다 (↺)
  setChord(t,0,'maj'); fireEvent.click(t.container.querySelector('button[data-k="frep"][data-v="0"]'));
  assert.deepEqual(chordNames(t),[['C'],[''],[''],['']]);
  assert.equal(t.btn('bar','0').getAttribute('aria-pressed'),'true');
  // 마디를 직접 골라야 다음 마디에 들어간다. 앞 마디의 폼이 기준 폼으로 보인다
  t.click('bar','1');
  assert.deepEqual([...t.container.querySelectorAll('.refs .card.ref')].map(x=>x.dataset.v),['이전 폼']);
  assert.match(t.container.querySelector('.refs .card.ref').textContent,/1마디 C/);
  t.click('root','7'); addFirst(t);
  t.click('bar','2'); setChord(t,9,'min'); addFirst(t);
  assert.deepEqual(chordNames(t),[['C'],['G'],['Am'],['']]);
  assert.equal(t.btn('bar','2').getAttribute('aria-pressed'),'true');
});

test('마디당 코드 1·2·4개: 칸 수를 바꾸고 칸마다 채우면 마디 안에서 이어진다',()=>{
  const t=boot(null,'prog');
  t.click('div','2');
  assert.deepEqual(chordNames(t),[['',''],[''],[''],['']]);
  addFirst(t);                                   // 1마디 첫 칸 Am → 같은 마디 둘째 칸으로
  assert.equal(t.btn('slot','0.1').getAttribute('aria-pressed'),'true');
  setChord(t,0,'maj'); addFirst(t);              // 둘째 칸 C → 마지막 칸이라 그대로 (다음 마디로 가지 않는다)
  assert.deepEqual(chordNames(t)[0],['Am','C']);
  assert.equal(t.btn('slot','0.1').getAttribute('aria-pressed'),'true');
  assert.equal(t.btn('slot','1.0').getAttribute('aria-pressed'),'false');
  // 2마디를 골라 4칸으로: 칸 4개
  t.click('bar','1'); t.click('div','4');
  assert.deepEqual(chordNames(t)[1],['','','','']);
  assert.ok(t.container.querySelector('.bar.d4'));
  for(const [i,[r,q]] of [[2,'min'],[7,'maj'],[9,'min'],[4,'min']].entries()){ t.click('slot',`1.${i}`); setChord(t,r,q); addFirst(t); }
  assert.deepEqual(chordNames(t)[1],['Dm','G','Am','Em']);
  // 칸 수를 줄이면 앞 칸이 남고, 다시 늘려도 빈 칸
  t.click('bar','1'); t.click('div','2');
  assert.deepEqual(chordNames(t)[1],['Dm','G']);
  t.click('div','4');
  assert.deepEqual(chordNames(t)[1],['Dm','G','','']);
  assert.equal(barsOf(t)[1].div,4);
  assert.equal(barsOf(t).length,4);
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
  // 삭제: 그 칸만 비고 이웃은 그대로, 마디 수도 그대로
  t.click('slot','1.0'); t.click('del','');
  assert.deepEqual(chordNames(t),[['C'],[''],['Dm'],['G']]);
  assert.equal(barsOf(t).length,4);
  assert.equal(t.btn('del','').disabled,true);
  // 비운 칸에 다시 채우면 선택한 칸에 들어간다 (다음 칸으로 건너뛰지 않는다)
  t.click('slot','1.0'); setChord(t,9,'min'); addFirst(t);
  assert.deepEqual(chordNames(t),[['C'],['Am'],['Dm'],['G']]);
  // 마디 비우기: 마디의 코드와 멜로디가 모두 비워진다
  t.click('bar','2'); t.click('bclear','');
  assert.deepEqual(chordNames(t)[2],['']);
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
  assert.match(t.container.querySelector('.selname').textContent,/1마디 멜로디 · C/);
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
  t.click('div','2'); addFirst(t);
  t.click('kind','n'); fireEvent.click(noteCell(t,1,3));
  assert.deepEqual(chordNames(t)[0],['Am','']);
  assert.deepEqual(melodyNames(t)[0],['C']);
  t.click('kind','c');
  assert.ok(t.container.querySelector('.finder'));
  assert.equal(t.btn('slot','0.0').getAttribute('aria-pressed'),'true');
  // 마디 선택 버튼은 현재 탭 종류를 유지한 채 마디만 옮긴다
  t.click('bar','2');
  assert.equal(t.btn('slot','2.0').getAttribute('aria-pressed'),'true');
});

test('마디 추가: 하단 + 로 8마디까지 늘릴 수 있다, 저장·복원',()=>{
  const t=boot(null,'prog');
  for(let i=0;i<4;i++) fireEvent.click(t.container.querySelector('button[data-k="padd"]'));
  assert.equal(t.container.querySelectorAll('.bars .bar').length,8);
  assert.equal(t.container.querySelector('button[data-k="padd"]'),null,'8마디가 최대');
  assert.equal(t.btn('slot','7.0').getAttribute('aria-pressed'),'true','새 마디가 선택된다');
  addFirst(t);
  assert.equal(chordNames(t)[7][0],'Am');
  const raw=JSON.stringify(t.state());
  cleanup();
  const b=boot(raw,'prog');
  assert.equal(b.container.querySelectorAll('.bars .bar').length,8);
  assert.equal(chordNames(b)[7][0],'Am');
});

test('전체 비우기: 빈 마디 4개로 돌아간다 / 폼 모아 보기',()=>{
  const t=boot(null,'prog');
  assert.equal(t.container.querySelector('.sum'),null);
  t.click('div','2'); addFirst(t); setChord(t,0,'maj'); addFirst(t);
  assert.equal(t.container.querySelectorAll('.sum .card').length,2,'담은 코드가 차례로 모인다');
  assert.match(t.container.querySelector('.sum .count').textContent,/총 손 이동 \d+프렛/);
  fireEvent.click(t.container.querySelector('button[data-k="padd"]'));
  t.click('pclear','');
  assert.equal(t.container.querySelectorAll('.bars .bar').length,4);
  assert.deepEqual(chordNames(t),[[''],[''],[''],['']]);
  assert.equal(t.btn('slot','0.0').getAttribute('aria-pressed'),'true');
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
    const ks=['bar','slot','mnote','div','kind','del','bclear','padd','fadd','frep','nnote'];
    const list=[...t.container.querySelectorAll(ks.map(k=>`button[data-k="${k}"]`).join(','))].filter(b=>!b.disabled);
    fireEvent.click(list[rnd(list.length)]);
    const s=barsOf(t);
    assert.ok(s.length>=4&&s.length<=8);
    assert.ok(s.every(b=>[1,2,4].includes(b.div)&&b.chords.length===b.div&&b.notes.length<=8),`${i}번째 클릭 후 마디 모양`);
    assert.equal(t.container.querySelectorAll('.bar .slot[aria-pressed="true"],.bar .mnote[aria-pressed="true"]').length<=1,true);
  }
});

test('진행 공유 링크: 코드 1·2·4개와 멜로디, 제목까지 같은 진행으로 열린다',async()=>{
  let copied='';
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async x=>{ copied=x; }},configurable:true});
  const t=boot(null,'prog');
  addFirst(t);                                         // 1마디 Am
  t.click('bar','1'); t.click('div','2'); setChord(t,0,'maj'); addFirst(t); // 2마디 C _
  t.click('kind','n'); fireEvent.click(noteCell(t,1,3)); fireEvent.click(noteCell(t,5,5));
  t.click('bar','3'); t.click('kind','c'); t.click('div','4'); setChord(t,7,'maj'); t.click('slot','3.3'); addFirst(t);
  fireEvent.change(t.container.querySelector('input[data-k="ptitle"]'),{target:{value:'가을 노래'}});
  const saved=barsOf(t);
  assert.deepEqual(chordNames(t),[['Am'],['C',''],[''],['','','','G']]);
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
  assert.deepEqual(melodyNames(u)[1],['C','A']);
  assert.equal(window.location.search,'','불러온 뒤에는 주소의 진행 값을 지운다');
  // 잘못된 링크는 무시한다
  cleanup(); localStorage.clear();
  window.history.pushState(null,'','/?p=broken');
  const v=boot(null,'prog');
  assert.deepEqual(chordNames(v),[[''],[''],[''],['']]);
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
  assert.deepEqual(chordNames(t),[[''],[''],[''],['']]);
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
  assert.deepEqual(chordNames(b),[[''],[''],[''],['']]);
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
  assert.deepEqual(chordNames(b)[0],['G','']);
  assert.equal(window.location.search,'');
});
