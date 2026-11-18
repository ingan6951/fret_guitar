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
  const btn=(k,v)=>r.container.querySelector(`button[data-k="${k}"][data-v="${v}"]`);
  const flags=k=>Object.fromEntries([...r.container.querySelectorAll(`button[data-k="${k}"]`)].map(b=>[b.dataset.v,b.disabled]));
  const click=(k,v)=>{ const b=btn(k,v); assert.ok(b,`버튼 없음 ${k}=${v}`); fireEvent.click(b); };
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

test('쉘: m7 4음은 베이스 5·6만, 근음만 켜면 쉘 비활성',()=>{
  const t=boot();
  t.click('rs','all'); t.click('lay','skip');
  assert.deepEqual(t.flags('rs'),{1:true,2:true,3:true,4:true,5:false,6:false,all:false});
  t.click('lay','adj'); t.click('t','1'); t.click('t','2'); t.click('t','3');
  assert.deepEqual(t.state().t,[true,false,false,false]);
  assert.equal(t.flags('lay').skip,true);
});

test('모든 코드·구성음·줄 배치·베이스 조합이 화면을 깨지 않는다',()=>{
  let n=0;
  for(const q of QUALITIES) for(let m=1;m<16;m++) for(const layout of ['adj','skip']) for(const rs of [1,2,3,4,5,6,'all']){
    const t=[0,1,2,3].map(i=>!!(m&(1<<i)));
    const r=boot({root:n%12,q:q.id,rs,t,layout,label:['finger','note','degree'][n%3],flat:n%2===0});
    // 불가능한 저장값은 복구되므로 항상 폼이 있다
    assert.ok(r.svgs()>0,`빈 화면 ${q.id} ${m} ${layout} ${rs}`);
    cleanup(); localStorage.clear(); n++;
  }
});

test('아무렇게나 눌러도(비활성은 무시) 빈 화면에 닿지 않는다',()=>{
  const t=boot();
  let seed=12345;
  const rnd=m=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed%m; };
  const keys=['root','q','rs','t','lay','label','acc'];
  for(let i=0;i<600;i++){
    const list=[...t.container.querySelectorAll(`button[data-k="${keys[rnd(keys.length)]}"]`)];
    fireEvent.click(list[rnd(list.length)]);
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
  a.click('root','2'); a.click('q','7'); a.click('rs','5'); a.click('t','0'); a.click('label','degree'); a.click('acc','flat'); a.click('lay','skip');
  const saved=a.state();
  assert.deepEqual(saved.t,[false,true,true,true]);
  assert.equal(saved.layout,'skip');
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

test('진행: 추가·빼기·비우기·최대 8개·선택 칸·복원',()=>{
  const t=boot();
  t.click('mode','prog');
  assert.match(t.container.querySelector('.cards').textContent,/추가/);
  t.click('root','2'); t.click('q','m7'); t.click('padd','');
  t.click('root','7'); t.click('q','7'); t.click('padd','');
  t.click('root','0'); t.click('q','maj7'); t.click('padd','');
  assert.deepEqual(t.state().prog,[{root:2,q:'m7'},{root:7,q:'7'},{root:0,q:'maj7'}]);
  assert.equal(t.svgs(),3);
  assert.match(t.count(),/총 손 이동/);
  // 진행 화면의 선택 칸
  const [selRoot,selQ]=t.container.querySelectorAll('.picker select');
  fireEvent.change(selRoot,{target:{value:'5'}});
  fireEvent.change(selQ,{target:{value:'maj7'}});
  t.click('padd','');
  assert.deepEqual(t.state().prog[3],{root:5,q:'maj7'});
  assert.deepEqual([t.state().root,t.state().q],[5,'maj7']);
  t.click('pdel','3'); t.click('pdel','1');
  assert.deepEqual(t.state().prog,[{root:2,q:'m7'},{root:0,q:'maj7'}]);
  for(let i=0;i<10;i++) fireEvent.click(t.btn('padd',''));
  assert.equal(t.state().prog.length,8);
  assert.equal(t.btn('padd','').disabled,true);
  const saved=JSON.stringify(t.state());
  cleanup();
  const b=boot(saved);
  assert.equal(b.state().prog.length,8); assert.equal(b.state().mode,'prog');
  b.click('pclear','');
  assert.deepEqual(b.state().prog,[]);
  b.click('mode','chord');
  assert.ok(b.svgs()>0);
  cleanup(); localStorage.clear();
  const c=boot({mode:'prog',prog:[{root:3,q:'m7'},{root:99,q:'x'},null]});
  assert.deepEqual(c.state().prog,[{root:3,q:'m7'}]);
});
