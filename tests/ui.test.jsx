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
  const click=(k,v)=>{ const b=btn(k,v); assert.ok(b,`버튼 없음 ${k}=${v}`); const s=sel(k); if(s){ if(!b.disabled) fireEvent.change(s,{target:{value:String(v)}}); } else fireEvent.click(b); };
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
  assert.deepEqual(t.flags('rs'),{1:true,2:true,3:true,4:false,5:false,6:false,all:false});
  assert.ok(Object.values(t.flags('root')).every(x=>!x));
  const before=t.container.querySelector('.cards').innerHTML;
  fireEvent.click(t.btn('rs','1'));
  assert.equal(t.container.querySelector('.cards').innerHTML,before);
  assert.equal(t.state().rs,'all');
});

test('구성음: 마지막 하나는 끌 수 없고 트라이어드의 7도는 비활성',()=>{
  const t=boot();
  t.click('q','maj'); t.click('t','1'); t.click('t','2');
  assert.deepEqual(t.state().t.slice(0,3),[true,false,false]);
  assert.equal(t.flags('t')['0'],true);
  assert.equal(t.flags('t')['3'],true);
});

test('7도만 켜면 트라이어드로 못 바꾼다',()=>{
  const t=boot();
  t.click('t','0'); t.click('t','1'); t.click('t','2');
  assert.deepEqual(t.state().t,[false,false,false,true]);
  const f=t.flags('q');
  assert.deepEqual([f.maj,f.min,f['7'],f.maj7,f.m7],[true,true,false,false,false]);
});

test('줄 배치 선택은 없고, 붙여서와 쉘 폼이 함께 나온다',()=>{
  const t=boot();
  assert.equal(t.container.querySelector('button[data-k="lay"]'),null);
  assert.doesNotMatch(t.container.querySelector('.cards').textContent,/쉘/); // 4음은 쉘이 없다
  t.click('t','2'); t.click('rs','6'); // 5도를 끄면 근음·♭3·♭7: 붙여서 + 쉘
  assert.match(t.container.querySelector('.cards').textContent,/쉘/);
  // 근음만 켜면 한 줄짜리라 쉘이 없다
  t.click('t','1'); t.click('t','3');
  assert.deepEqual(t.state().t.slice(0,4),[true,false,false,false]);
  assert.doesNotMatch(t.container.querySelector('.cards').textContent,/쉘/);
});

test('모든 코드·구성음·베이스 조합이 화면을 깨지 않는다',()=>{
  let n=0;
  for(const q of QUALITIES) for(let m=1;m<16;m++) for(const rs of [1,3,4,6,'all']){
    const t=[0,1,2,3].map(i=>!!(m&(1<<i)));
    const r=boot({root:n%12,q:q.id,rs,t,label:['finger','note','degree'][n%3],flat:n%2===0});
    // 불가능한 저장값은 복구되므로 항상 폼이 있다
    assert.ok(r.svgs()>0,`빈 화면 ${q.id} ${m} ${rs}`);
    cleanup(); localStorage.clear(); n++;
  }
});

test('아무렇게나 눌러도(비활성은 무시) 빈 화면에 닿지 않는다',()=>{
  const t=boot();
  let seed=12345;
  const rnd=m=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed%m; };
  const keys=['root','q','rs','t','label','acc'];
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
  a.click('root','2'); a.click('q','7'); a.click('rs','5'); a.click('t','0'); a.click('label','degree'); a.click('acc','flat');
  const saved=a.state();
  assert.deepEqual(saved.t,[false,true,true,true]);
  cleanup();
  const b=boot(JSON.stringify(saved));
  assert.deepEqual(b.state(),saved);
  cleanup(); localStorage.clear();
  const c=boot({root:0,q:'7',rs:1,t:[true,true,true,true]});
  assert.ok(c.svgs()>0); assert.equal(c.state().rs,4);
  cleanup(); localStorage.clear();
  const d=boot({root:3,q:'maj',rs:4,n:5});
  assert.deepEqual(d.state().t,[true,true,true,true]);
  cleanup(); localStorage.clear();
  const e=boot('{broken');
  assert.equal(e.container.querySelector('.sym').textContent,'Am7');
});

test('구성음 프리셋: 적용·눌림 표시, 트라이어드에서는 3·7이 비활성',()=>{
  const t=boot();
  t.click('preset','guide');
  assert.deepEqual(t.state().t,[false,true,false,true]);
  assert.equal(t.btn('preset','guide').getAttribute('aria-pressed'),'true');
  assert.equal(t.btn('preset','all').getAttribute('aria-pressed'),'false');
  assert.ok(t.svgs()>0);
  t.click('preset','rootless');
  assert.deepEqual(t.state().t,[false,true,true,true]);
  assert.ok(t.svgs()>0);
  t.click('preset','all');
  assert.deepEqual(t.state().t,[true,true,true,true]);
  t.click('q','maj');
  assert.equal(t.flags('preset').guide,true);
  assert.equal(t.flags('preset').all,false);
});

test('상세 조건 요약 줄과 카드 제목',()=>{
  const t=boot();
  assert.match(t.container.querySelector('.adv summary span').textContent,/구성음 1·♭3·5·♭7 · 베이스 4번 줄/);
  t.click('rs','all');
  assert.match(t.container.querySelector('.adv summary span').textContent,/베이스 전체/);
  t.click('rs','4');
  assert.equal(t.container.querySelector('.card .who b').textContent,'4번 줄');
  assert.match(t.container.querySelector('.card .hint.order').textContent,/^낮은 줄부터 /);
});

test('진행: 추가·빼기·비우기·최대 8개·선택 칸·복원',()=>{
  const t=boot();
  t.click('mode','prog');
  assert.match(t.container.querySelector('.cards').textContent,/추가/);
  t.click('root','2'); t.click('q','m7'); t.click('padd','');
  t.click('root','7'); t.click('q','7'); t.click('padd','');
  t.click('root','0'); t.click('q','maj7'); t.click('padd','');
  assert.deepEqual(t.state().prog,[{root:2,q:'m7'},{root:7,q:'7'},{root:0,q:'maj7'}]);
  // 진행을 다 고르기 전에는 결과가 없다
  assert.equal(t.svgs(),0);
  assert.match(t.container.querySelector('.cards').textContent,/보이싱 찾기/);
  assert.match(t.count(),/코드 3개/);
  // 보이싱 찾기 → 가짓수와 1번째(손 이동 최소)
  t.click('pfind','');
  assert.equal(t.svgs(),3);
  assert.match(t.container.querySelector('.vcount').textContent,/가능한 보이싱 216가지/);
  assert.equal(t.container.querySelector('.vpos').textContent,'1 / 216');
  assert.match(t.count(),/1번째 · 4음 · 총 손 이동/);
  assert.equal(t.container.querySelector('.picker'),null);
  const prevBtn=t.container.querySelector('button[data-k="vprev"]'),nextBtn=t.container.querySelector('button[data-k="vnext"]');
  assert.equal(prevBtn.disabled,true);
  const first=t.container.querySelector('.cards').innerHTML;
  fireEvent.click(nextBtn);
  assert.equal(t.container.querySelector('.vpos').textContent,'2 / 216');
  assert.notEqual(t.container.querySelector('.cards').innerHTML,first);
  fireEvent.click(prevBtn);
  assert.equal(t.container.querySelector('.cards').innerHTML,first);
  // 이동은 순위대로 늘어난다 (1번째 ≤ 2번째 ≤ … )
  let last=-1;
  for(let i=0;i<20;i++){
    const m=Number(t.count().match(/총 손 이동 (\d+)프렛/)[1]);
    assert.ok(m>=last-1,`순위 ${i+1}: 이동 ${m}`); last=Math.max(last,m);
    fireEvent.click(t.container.querySelector('button[data-k="vnext"]'));
  }
  // 설정을 바꾸면 1번째로 돌아간다
  t.click('rs','all');
  assert.match(t.container.querySelector('.vpos').textContent,/^1 \//);
  // 진행 보기는 구성음 대신 음 개수: 구성음 칩이 없고 음 개수 칩이 있다
  assert.equal(t.container.querySelector('button[data-k="t"]'),null);
  assert.equal(t.btn('pn','4').getAttribute('aria-pressed'),'true');
  t.click('rs','4');
  assert.match(t.container.querySelector('.vcount').textContent,/216가지/);
  // 3음: 7th는 구성음 3개 조합(4가지)의 폼을 모두 후보로 → 가짓수가 바뀌고 카드마다 3음
  t.click('pn','3');
  assert.equal(t.state().progN,3);
  assert.doesNotMatch(t.container.querySelector('.vcount').textContent,/216가지/);
  assert.match(t.count(),/3음/);
  for(const svg of t.container.querySelectorAll('.cards svg')) assert.equal(svg.querySelectorAll('.dot,.open').length,3,'3음 폼');
  t.click('pn','4');
  t.click('rs','all');
  // 진행 수정 → 다시 고르기 화면
  t.click('pedit','');
  assert.equal(t.state().progDone,false);
  assert.equal(t.svgs(),0);
  t.click('rs','4');
  // 진행 화면에서도 위쪽 근음·코드 선택을 쓴다
  assert.equal(t.container.querySelectorAll('.picker select').length,0,'근음·코드는 위쪽 한 곳에서만 고른다');
  t.click('root','5'); t.click('q','maj7');
  t.click('padd','');
  assert.deepEqual(t.state().prog[3],{root:5,q:'maj7'});
  assert.deepEqual([t.state().root,t.state().q],[5,'maj7']);
  t.click('pfind',''); assert.equal(t.state().progDone,true);
  t.click('psel','3'); t.click('pdel','3');
  assert.equal(t.state().progDone,false,'진행을 바꾸면 결과를 닫는다');
  t.click('psel','1'); t.click('pdel','1');
  assert.deepEqual(t.state().prog,[{root:2,q:'m7'},{root:0,q:'maj7'}]);
  for(let i=0;i<10;i++) fireEvent.click(t.btn('padd',''));
  assert.equal(t.state().prog.length,8);
  assert.equal(t.btn('padd','').disabled,true);
  t.click('pfind','');
  assert.ok(t.svgs()>0);
  const saved=JSON.stringify(t.state());
  cleanup();
  const b=boot(saved);
  assert.equal(b.state().prog.length,8); assert.equal(b.state().mode,'prog'); assert.equal(b.state().progDone,true);
  assert.ok(b.svgs()>0,'저장된 결과 화면 복원');
  b.click('pedit','');
  // 코드 보기로 돌아가면 구성음 칩이 다시 보인다
  b.click('mode','chord'); assert.ok(b.btn('t','0')); assert.equal(b.container.querySelector('button[data-k="pn"]'),null); b.click('mode','prog');
  b.click('pclear','');
  assert.deepEqual(b.state().prog,[]);
  b.click('mode','chord');
  assert.ok(b.svgs()>0);
  cleanup(); localStorage.clear();
  const c=boot({mode:'prog',prog:[{root:3,q:'m7'},{root:99,q:'x'},null]});
  assert.deepEqual(c.state().prog,[{root:3,q:'m7'}]);
});

test('진행: 코드를 골라 수정·제거 (C–Am–Dm–G–C)',()=>{
  const t=boot();
  t.click('mode','prog');
  for(const [r,q] of [[0,'maj'],[9,'min'],[2,'min'],[7,'maj'],[0,'maj']]){ t.click('root',String(r)); t.click('q',q); t.click('padd',''); }
  assert.equal(t.state().prog.length,5);
  assert.equal(t.btn('pdel','1'),null,'고르기 전에는 제거 버튼이 없다');
  // Am 선택: 근음·코드 선택에 불러오고, 바꾼 것이 없으면 수정은 비활성
  t.click('psel','1');
  assert.deepEqual([t.state().root,t.state().q],[9,'min']);
  assert.equal(t.btn('psel','1').getAttribute('aria-pressed'),'true');
  assert.equal(t.btn('pupd','1').disabled,true);
  // 다시 누르면 선택이 풀린다
  t.click('psel','1');
  assert.equal(t.btn('pdel','1'),null);
  // 수정: Am → Em
  t.click('psel','1');
  t.click('root','4');
  assert.equal(t.btn('pupd','1').disabled,false);
  t.click('pupd','1');
  assert.deepEqual(t.state().prog.map(c=>`${c.root}${c.q}`),['0maj','4min','2min','7maj','0maj']);
  assert.equal(t.btn('pupd','1'),null,'수정하면 선택이 풀린다');
  // 제거: Dm
  t.click('psel','2'); t.click('pdel','2');
  assert.deepEqual(t.state().prog.map(c=>`${c.root}${c.q}`),['0maj','4min','7maj','0maj']);
  assert.equal(t.btn('pdel','2'),null);
  // 결과 화면에서 칩을 누르면 편집 화면으로 돌아온다
  t.click('pfind','');
  assert.equal(t.state().progDone,true);
  t.click('psel','0');
  assert.equal(t.state().progDone,false);
  assert.ok(t.btn('pdel','0'));
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
  // 구성음을 근음 하나만 켜고 베이스를 고정하면 폼이 하나라 넘기기가 없다
  t.click('t','1'); t.click('t','2'); t.click('t','3'); t.click('rs','4');
  assert.equal(t.svgs(),1);
  assert.equal(t.container.querySelector('.slidenav'),null);
});
