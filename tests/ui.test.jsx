// 화면 테스트: 버튼 비활성화, 아무렇게나 눌러도 빈 화면이 없는지, 진행 보기, 설정 저장·복원
import './setup-dom.js';
import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {render,cleanup,fireEvent,act} from '@testing-library/react';
import FretGuide from '../components/FretGuide.jsx';
import {QUALITIES} from '../lib/fretlogic.js';
import {STORAGE_KEY} from '../lib/settings.js';

afterEach(()=>{ cleanup(); localStorage.clear(); });

function boot(saved){
  if(saved) localStorage.setItem(STORAGE_KEY,typeof saved==='string'?saved:JSON.stringify(saved));
  const r=render(<FretGuide/>);
  // 근음·코드는 셀렉트박스, 나머지는 버튼이다. 셀렉트의 비활성 옵션은 고를 수 없으므로 무시한다.
  const sel=k=>r.container.querySelector(`select[data-k="${k}"]`);
  const btn=(k,v)=>{ const s=sel(k); return s?s.querySelector(`option[value="${v}"]`):r.container.querySelector(`button[data-k="${k}"][data-v="${v}"]`); };
  const flags=k=>{ const s=sel(k); return s
    ?Object.fromEntries([...s.querySelectorAll('option')].map(o=>[o.value,o.disabled]))
    :Object.fromEntries([...r.container.querySelectorAll(`button[data-k="${k}"]`)].map(b=>[b.dataset.v,b.disabled])); };
  const RSO=['all','1','2','3','4','5','6'];
  // 베이스는 스테퍼라서, 원하는 값이 될 때까지 − / + 를 누른다 (폼이 없는 값은 건너뛰어 가므로 못 가면 멈춘다)
  const setRs=v=>{
    for(let i=0;i<10;i++){
      const cur=String(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{"rs":4}').rs);
      if(cur===String(v)) return;
      const d=RSO.indexOf(String(v))>RSO.indexOf(cur)?'1':'-1';
      const b=r.container.querySelector(`button[data-k="rstep"][data-v="${d}"]`);
      if(!b||b.disabled) return;
      fireEvent.click(b);
      const nxt=String(JSON.parse(localStorage.getItem(STORAGE_KEY)).rs);
      if(Math.sign(RSO.indexOf(nxt)-RSO.indexOf(String(v)))*Math.sign(RSO.indexOf(cur)-RSO.indexOf(String(v)))<=0) return; // 목표를 지나쳤거나 도착
    }
  };
  const click=(k,v)=>{ if(k==='rs') return setRs(v); const b=btn(k,v); assert.ok(b,`버튼 없음 ${k}=${v}`); const s=sel(k); if(s){ if(!b.disabled) fireEvent.change(s,{target:{value:String(v)}}); } else fireEvent.click(b); };
  const svgs=()=>r.container.querySelectorAll('.cards svg').length;
  const state=()=>JSON.parse(localStorage.getItem(STORAGE_KEY));
  const count=()=>r.container.querySelector('.count').textContent;
  return {...r,btn,flags,click,svgs,state,count};
}

test('처음 화면: Am7, 4번 줄 베이스 폼 4개',()=>{
  const t=boot();
  assert.equal(t.container.querySelector('.sym').textContent,'Am7');
  assert.equal(t.svgs(),4);
  assert.match(t.count(),/폼 4개/);
});

test('m7 4음: 베이스 1~3은 비활성, 근음은 항상 활성, 비활성 버튼은 눌러도 무시',()=>{
  const t=boot();
  t.click('rs','all');
  assert.ok(Object.values(t.flags('root')).every(x=>!x));
  // 전체에서 − 는 막히고, + 는 폼이 없는 1~3번 줄을 건너뛰어 4번 줄로 간다
  const dn=t.container.querySelector('button[data-k="rstep"][data-v="-1"]');
  assert.equal(dn.disabled,true);
  fireEvent.click(dn);
  assert.equal(t.state().rs,'all');
  fireEvent.click(t.container.querySelector('button[data-k="rstep"][data-v="1"]'));
  assert.equal(t.state().rs,4);
  fireEvent.click(t.container.querySelector('button[data-k="rstep"][data-v="-1"]'));
  assert.equal(t.state().rs,'all');
});

test('코드 하나만 볼 때도 음 개수 − + 와 하이톤을 쓴다 (진행과 같은 조건)',()=>{
  const t=boot();
  assert.equal(t.container.querySelector('button[data-k="t"]'),null,'구성음 칩은 없다');
  assert.equal(t.container.querySelector('button[data-k="preset"]'),null,'구성음 프리셋도 없다');
  const val=()=>t.container.querySelector('#h-n').nextElementSibling.querySelector('output').textContent;
  assert.equal(val(),'4');
  // 베이스 4번 줄에서는 5음 이상이 없어 + 가 막힌다
  assert.equal(t.btn('pnstep','1').disabled,true);
  t.click('pnstep','-1');
  assert.equal(t.state().nc,3);
  assert.match(t.count(),/3음/);
  for(const svg of t.container.querySelectorAll('.cards svg')) assert.equal(svg.querySelectorAll('.dot,.open').length,3,'3음 폼');
  // 하이톤: 자동 + 구성음 도수, 고르면 그 음이 맨 위인 폼만 남는다
  const top=t.container.querySelector('select[data-k="top"]');
  assert.deepEqual([...top.options].map(o=>o.value),['','0','1','2','3']);
  t.click('top','1');
  assert.equal(t.state().top,1);
  assert.ok(t.svgs()>0);
  t.click('top','');
  assert.equal(t.state().top,null);
});

test('줄 배치 선택은 없고, 붙여서와 쉘 폼이 함께 나온다',()=>{
  const t=boot();
  assert.equal(t.container.querySelector('button[data-k="lay"]'),null);
  assert.doesNotMatch(t.container.querySelector('.cards').textContent,/쉘/); // 4음은 쉘이 없다
  t.click('pnstep','-1'); t.click('rs','5'); // 3음, 5번 줄 베이스: 붙여서 + 5·4·2번 줄 쉘
  assert.match(t.container.querySelector('.cards').textContent,/쉘/);
  // 1음은 한 줄짜리라 쉘이 없다
  t.click('pnstep','-1'); t.click('pnstep','-1');
  assert.equal(t.state().nc,1);
  assert.doesNotMatch(t.container.querySelector('.cards').textContent,/쉘/);
});

test('모든 코드·구성음·베이스 조합이 화면을 깨지 않는다',()=>{
  let n=0;
  for(const q of QUALITIES) for(let m=1;m<=6;m++) for(const rs of [1,3,4,6,'all']){
    const r=boot({root:n%12,q:q.id,rs,nc:m,top:n%5===0?n%4:null,label:['finger','note','degree'][n%3],flat:n%2===0});
    // 불가능한 저장값은 복구되므로 항상 폼이 있다
    assert.ok(r.svgs()>0,`빈 화면 ${q.id} ${m}음 ${rs}`);
    cleanup(); localStorage.clear(); n++;
  }
});

test('아무렇게나 눌러도(비활성은 무시) 빈 화면에 닿지 않는다',()=>{
  const t=boot();
  let seed=12345;
  const rnd=m=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed%m; };
  const keys=['root','q','rstep','pnstep','top','fstep','label','acc'];
  for(let i=0;i<600;i++){
    const k=keys[rnd(keys.length)];
    const s=t.container.querySelector(`select[data-k="${k}"]`);
    if(s){
      const opts=[...s.querySelectorAll('option')];
      const o=opts[rnd(opts.length)];
      if(!o.disabled) fireEvent.change(s,{target:{value:o.value}});
    }else{
      const list=[...t.container.querySelectorAll(`button[data-k="${k}"]`)];
      fireEvent.click(list[rnd(list.length)]);
    }
    assert.ok(t.svgs()>0,`${i}번째 클릭 후 빈 화면`);
  }
});

test('옥타브 토글',()=>{
  const t=boot();
  const before=t.container.querySelector('.cards').innerHTML;
  t.click('oct','');
  assert.equal(t.state().octave,true);
  assert.notEqual(t.container.querySelector('.cards').innerHTML,before);
});

test('설정 저장·복원, 불가능하거나 잘못된 저장값 복구',()=>{
  const a=boot();
  a.click('root','2'); a.click('q','7'); a.click('rs','5'); a.click('pnstep','-1'); a.click('top','2'); a.click('label','degree'); a.click('acc','flat');
  const saved=a.state();
  assert.equal(saved.nc,3);
  assert.equal(saved.top,2);
  cleanup();
  const b=boot(JSON.stringify(saved));
  assert.deepEqual(b.state(),saved);
  cleanup(); localStorage.clear();
  const c=boot({root:0,q:'7',rs:1});
  assert.ok(c.svgs()>0); assert.equal(c.state().rs,4);
  cleanup(); localStorage.clear();
  const d=boot({root:3,q:'maj',rs:4,nc:9,top:3});
  assert.equal(d.state().nc,4);
  assert.equal(d.state().top,null,'트라이어드에 없는 하이톤은 자동으로');
  cleanup(); localStorage.clear();
  const e=boot('{broken');
  assert.equal(e.container.querySelector('.sym').textContent,'Am7');
});

test('조건은 한 열: 근음·코드·하이톤·음 개수·베이스·프렛, 묶음·진행 추가 버튼은 없다',()=>{
  const t=boot();
  assert.deepEqual([...t.container.querySelectorAll('.rail .row h2')].map(x=>x.textContent),['근음','코드','하이톤','음 개수','베이스','프렛']);
  assert.equal(t.container.querySelector('.adv'),null,'상세 조건 묶음은 없다');
  assert.equal(t.container.querySelector('button[data-k="mode"]'),null,'진행 추가 버튼은 없다');
  assert.equal(t.container.querySelector('button[data-k="pfind"]'),null);
  assert.equal(t.container.querySelector('.hint'),null,'폼 아래 캡션은 없다');
  assert.equal(t.container.querySelector('.card .who b').textContent,'4번 줄');
  assert.ok(t.container.querySelector('.card .capr .pos'),'우측 상단에 프렛 위치');
  assert.ok(t.container.querySelector('.card .capr button[data-k="fadd"]'),'우측 상단에 + 버튼');
});

const chipNames=t=>[...t.container.querySelectorAll('button[data-k="psel"]')].map(b=>b.firstChild.textContent);
// 카드의 앞 이동 프렛(제자리는 0)을 위에서부터 읽는다
const gaps=t=>[...t.container.querySelectorAll('.cards .card .move')].map(m=>{ const x=m.textContent.match(/앞 (제자리|(\d+)프렛)/); return x?(x[2]===undefined?0:Number(x[2])):null; });

test('진행: 폼의 + 로 시작해 다음 코드 폼을 이어 담고, 앞 폼에서 가까운 순으로 정렬된다',()=>{
  const t=boot();
  assert.equal(t.container.querySelector('.prog'),null,'처음엔 진행이 없다');
  t.click('rs','all');
  // Am7 첫 폼의 + : 진행 시작
  fireEvent.click(t.container.querySelector('button[data-k="fadd"][data-v="0"]'));
  assert.equal(t.state().prog.length,1);
  assert.deepEqual(chipNames(t),['Am7']);
  assert.equal(t.state().prog[0].frets.length,6);
  // 다음 코드 Dm7: 카드에 앞 폼에서의 이동이 보이고 가까운 순(오름차순)
  t.click('root','2');
  const g=gaps(t);
  assert.ok(g.length>1&&g.every(x=>x!==null),'앞 이동 표시');
  assert.deepEqual(g,[...g].sort((a,b)=>a-b),'가까운 순');
  fireEvent.click(t.container.querySelector('button[data-k="fadd"][data-v="0"]'));
  assert.deepEqual(chipNames(t),['Am7','Dm7']);
  // 담은 폼은 운지째 저장되어 조건을 바꿔도 그대로다
  const saved=t.state().prog.map(e=>e.frets.join());
  t.click('pnstep','-1');
  assert.deepEqual(t.state().prog.map(e=>e.frets.join()),saved);
  // 최대 8개
  for(let i=0;i<6;i++) fireEvent.click(t.container.querySelector('button[data-k="fadd"][data-v="0"]'));
  assert.equal(t.state().prog.length,8);
  assert.equal(t.container.querySelector('button[data-k="fadd"]').disabled,true);
  // 복원
  const raw=JSON.stringify(t.state());
  cleanup();
  const b=boot(raw);
  assert.equal(b.state().prog.length,8);
  assert.equal(chipNames(b).length,8);
});

test('진행: 칩을 골라 그 자리를 다시 고르거나 제거하고, 이웃 폼은 그대로 둔다 (C–Am–Dm–G)',()=>{
  const t=boot();
  t.click('rs','all'); t.click('pnstep','-1');
  for(const [r,q] of [[0,'maj'],[9,'min'],[2,'min'],[7,'maj']]){ t.click('root',String(r)); t.click('q',q); fireEvent.click(t.container.querySelector('button[data-k="fadd"][data-v="0"]')); }
  assert.deepEqual(chipNames(t),['C','Am','Dm','G']);
  const keep=t.state().prog.map(e=>e.frets.join());
  // Am 선택: 코드를 불러오고, 카드는 ↺ 로 바뀌고, 앞뒤 폼에서 가까운 순
  t.click('psel','1');
  assert.deepEqual([t.state().root,t.state().q],[9,'min']);
  assert.equal(t.btn('psel','1').getAttribute('aria-pressed'),'true');
  assert.equal(t.container.querySelector('button[data-k="fadd"]'),null);
  assert.ok(t.container.querySelector('button[data-k="frep"][data-v="0"]'));
  assert.ok(t.container.querySelector('.cards .card.cur'),'지금 자리의 폼 표시');
  assert.match(t.container.querySelector('.cards .move').textContent,/앞 .* 뒤 /);
  // 다시 누르면 선택이 풀리고 + 로 돌아간다
  t.click('psel','1');
  assert.ok(t.container.querySelector('button[data-k="fadd"]'));
  // 바꾸기: Am 자리를 다른 폼으로 → 이웃은 그대로
  t.click('psel','1');
  const second=[...t.container.querySelectorAll('button[data-k="frep"]')][1];
  fireEvent.click(second);
  const now=t.state().prog.map(e=>e.frets.join());
  assert.equal(now[0],keep[0]); assert.equal(now[2],keep[2]); assert.equal(now[3],keep[3]);
  assert.notEqual(now[1],keep[1]);
  assert.equal(t.state().prog.length,4);
  // 코드를 바꿔서 그 자리를 다른 코드로: Dm → Em
  t.click('psel','2'); t.click('root','4');
  fireEvent.click(t.container.querySelector('button[data-k="frep"][data-v="0"]'));
  assert.deepEqual(chipNames(t),['C','Am','Em','G']);
  // 제거: 이웃 폼은 그대로, 이동 거리만 다시 계산된다
  const before=t.state().prog.map(e=>e.frets.join());
  t.click('psel','1'); t.click('pdel','1');
  assert.deepEqual(chipNames(t),['C','Em','G']);
  assert.deepEqual(t.state().prog.map(e=>e.frets.join()),[before[0],before[2],before[3]]);
  // 진행 보기: 담은 폼이 차례로 모인다
  t.click('pview','');
  assert.equal(t.svgs(),3);
  assert.match(t.count(),/진행 3개 · 총 손 이동 \d+프렛/);
  t.click('pview','');
  // 비우기
  t.click('pclear','');
  assert.equal(t.state().prog.length,0);
  assert.equal(t.container.querySelector('.prog'),null);
});

test('음 개수 − + (1~6), 6음이면 베이스는 6번 줄만',()=>{
  const t=boot();
  t.click('rs','all');
  const val=()=>t.container.querySelector('#h-n').nextElementSibling.querySelector('output').textContent;
  assert.equal(val(),'4');
  t.click('pnstep','1'); t.click('pnstep','1');
  assert.equal(val(),'6');
  assert.equal(t.btn('pnstep','1').disabled,true,'6에서 + 막힘');
  // 6음이면 6번 줄 베이스만 고를 수 있다
  assert.equal(t.container.querySelector('button[data-k="rstep"][data-v="-1"]').disabled,true);
  fireEvent.click(t.container.querySelector('button[data-k="rstep"][data-v="1"]'));
  assert.equal(t.state().rs,6,'6음이면 베이스는 6번 줄뿐');
  assert.equal(t.container.querySelector('button[data-k="rstep"][data-v="1"]').disabled,true);
  for(let i=0;i<5;i++) t.click('pnstep','-1');
  assert.equal(val(),'1');
  assert.equal(t.btn('pnstep','-1').disabled,true,'1에서 − 막힘');
  assert.equal(t.state().nc,1);
});

test('폼 넘기기(좁은 화면용 ◀ ▶와 번호): 넘기고, 목록이 바뀌면 첫 장으로, 폼이 하나면 없다',()=>{
  const t=boot();
  const pos=()=>t.container.querySelector('.cpos').textContent;
  const prev=()=>t.container.querySelector('button[data-k="cprev"]'),next=()=>t.container.querySelector('button[data-k="cnext"]');
  assert.equal(pos(),'1 / 4');
  assert.equal(prev().disabled,true);
  fireEvent.click(next());
  assert.equal(pos(),'2 / 4');
  for(let i=0;i<5;i++) fireEvent.click(next());
  assert.equal(pos(),'4 / 4');
  assert.equal(next().disabled,true);
  t.click('rs','all');
  assert.match(pos(),/^1 \//);
  // 하이톤을 ♭3으로 고정하고 베이스도 고정하면 폼이 하나라 넘기기가 없다
  t.click('top','1'); t.click('rs','4');
  assert.equal(t.svgs(),1);
  assert.equal(t.container.querySelector('.slidenav'),null);
});

test('프렛 하한: − 0 + 로 올리고 내리며, 그 프렛 이상만 잡는 폼이 나온다',()=>{
  const t=boot();
  const val=()=>t.container.querySelector('#h-fret + .stepper .val').textContent;
  const plus=()=>t.container.querySelector('button[data-k="fstep"][data-v="1"]'),minus=()=>t.container.querySelector('button[data-k="fstep"][data-v="-1"]');
  assert.equal(t.state().fmin,0);
  assert.equal(val(),'전체');
  assert.equal(minus().disabled,true);
  for(let i=0;i<5;i++) fireEvent.click(plus());
  assert.equal(t.state().fmin,5);
  assert.equal(val(),'5');
  assert.ok(t.svgs()>0);
  // 소리 나는 모든 음이 5프렛 이상이므로 기준 음 프렛(.pos)도 5 이상이고 개방현은 없다
  for(const pos of t.container.querySelectorAll('.cards .pos')) assert.ok(parseInt(pos.textContent,10)>=5,`위치 ${pos.textContent}`);
  // 하한을 켜면 한 옥타브 위로 버튼은 의미가 없어 숨긴다
  assert.equal(t.container.querySelector('button[data-k="oct"]'),null);
  fireEvent.click(minus());
  assert.equal(val(),'4');
  // 계속 올리면 폼이 없어지기 전에 + 가 막히고, 그때도 화면은 비지 않는다
  for(let i=0;i<20&&!plus().disabled;i++) fireEvent.click(plus());
  assert.equal(plus().disabled,true);
  assert.ok(t.state().fmin<=12);
  assert.ok(t.svgs()>0);
  // 저장·복원
  const saved=JSON.stringify(t.state());
  cleanup();
  const b=boot(saved);
  assert.equal(b.state().fmin,JSON.parse(saved).fmin);
  // 불가능해진 저장값(폼이 없는 하한)은 전체로 돌아간다
  cleanup(); localStorage.clear();
  const c=boot({root:0,q:'m7',rs:6,fmin:12});
  assert.ok(c.svgs()>0);
});
