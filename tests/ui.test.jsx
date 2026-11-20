// 화면 테스트: 데이터에 있는 코드만 고를 수 있고, 진행을 폼의 + 로 이어 담고 고치는 흐름, 설정 저장·복원
import './setup-dom.js';
import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {render,cleanup,fireEvent} from '@testing-library/react';
import FretGuide from '../components/FretGuide.jsx';
import {CHORDS} from '../lib/chords.js';
import {NOTE_SHARP,QUALITIES} from '../lib/fretlogic.js';
import {STORAGE_KEY} from '../lib/settings.js';

afterEach(()=>{ cleanup(); localStorage.clear(); });

function boot(saved){
  if(saved) localStorage.setItem(STORAGE_KEY,typeof saved==='string'?saved:JSON.stringify(saved));
  const r=render(<FretGuide/>);
  // 근음·코드는 셀렉트박스, 나머지는 버튼이다. 셀렉트의 비활성 옵션은 고를 수 없으므로 무시한다.
  const sel=k=>r.container.querySelector(`select[data-k="${k}"]`);
  const btn=(k,v)=>{ const s=sel(k); return s?s.querySelector(`option[value="${v}"]`):r.container.querySelector(`button[data-k="${k}"][data-v="${v}"]`); };
  const flags=k=>Object.fromEntries([...sel(k).querySelectorAll('option')].map(o=>[o.value,o.disabled]));
  const click=(k,v)=>{ const b=btn(k,v); assert.ok(b,`버튼 없음 ${k}=${v}`); const s=sel(k); if(s){ if(!b.disabled) fireEvent.change(s,{target:{value:String(v)}}); } else fireEvent.click(b); };
  const svgs=()=>r.container.querySelectorAll('.cards svg').length;
  const state=()=>JSON.parse(localStorage.getItem(STORAGE_KEY));
  const count=()=>r.container.querySelector('.count').textContent;
  return {...r,btn,flags,click,svgs,state,count};
}
const chipNames=t=>[...t.container.querySelectorAll('button[data-k="psel"]')].map(b=>b.firstChild.textContent);
const addFirst=t=>fireEvent.click(t.container.querySelector('button[data-k="fadd"][data-v="0"]'));
const nameOf=c=>NOTE_SHARP[c.root]+QUALITIES.find(q=>q.id===c.q).suffix;

test('처음 화면: Am 폼 2개(오픈, 5프렛 바레), 첫 폼은 개방 위치·5번 줄 베이스',()=>{
  const t=boot();
  assert.equal(t.container.querySelector('.sym').textContent,'Am');
  assert.equal(t.svgs(),2);
  assert.match(t.count(),/폼 2개/);
  assert.equal(t.container.querySelector('.card .who b').textContent,'5번 줄');
  assert.equal(t.container.querySelector('.card .pos').textContent,'개방');
  // 소리 나는 5줄: 개방 2줄(5·1번) + 누르는 3줄, 6번 줄은 뮤트
  const svg=t.container.querySelector('.cards svg');
  assert.equal(svg.querySelectorAll('.open').length,2);
  assert.equal(svg.querySelectorAll('.dot').length,3);
  assert.equal(svg.querySelectorAll('.mute').length,1);
});

test('조건은 근음·코드·음 개수뿐이고 묶음·진행 추가 버튼·캡션은 없다',()=>{
  const t=boot();
  assert.deepEqual([...t.container.querySelectorAll('.rail .row h2')].map(x=>x.textContent),['근음','코드','음 개수']);
  for(const k of ['top','pnstep','rstep','fstep','mode','pfind','oct']) assert.equal(t.container.querySelector(`[data-k="${k}"]`),null,k);
  assert.equal(t.container.querySelector('.adv'),null);
  assert.equal(t.container.querySelector('.hint'),null);
  assert.ok(t.container.querySelector('.card .capr button[data-k="fadd"]'),'우측 상단 + 버튼');
});

test('오픈 코드 8개가 이미지와 같은 운지로 나온다 (데이터 맨 앞 8개)',()=>{
  const expected={Em:'0 2 2 0 0 0',Am:'x 0 2 2 1 0',C:'x 3 2 0 1 0',D:'x x 0 2 3 2',G:'3 2 0 0 0 3',E:'0 2 2 1 0 0',A:'x 0 2 2 2 0',Dm:'x x 0 2 3 1'};
  assert.equal(CHORDS.length,443);
  for(const c of CHORDS.slice(0,8)){
    const t=boot({root:c.root,q:c.q});
    assert.equal(t.container.querySelector('.sym').textContent,nameOf(c));
    assert.ok(t.svgs()>=1,`${nameOf(c)} 폼`);
    addFirst(t);
    assert.equal(t.state().prog[0].frets.map(f=>f===null?'x':f).join(' '),expected[nameOf(c)],`${nameOf(c)} 운지`);
    cleanup(); localStorage.clear();
  }
});

test('근음 12개·코드 2종류를 모두 고를 수 있고, 근음을 바꿔도 코드 종류가 유지된다',()=>{
  const t=boot();
  assert.ok(Object.values(t.flags('root')).every(off=>!off),'12개 근음 모두 선택 가능');
  assert.equal(t.flags('q').maj,false); assert.equal(t.flags('q').min,false);
  t.click('root','0');
  assert.deepEqual([t.state().root,t.state().q],[0,'min']);
  assert.equal(t.container.querySelector('.sym').textContent,'Cm');
  assert.equal(t.svgs(),2,'Cm은 E·A 모양 2개');
  t.click('q','maj');
  assert.equal(t.container.querySelector('.sym').textContent,'C');
  assert.equal(t.svgs(),3,'C: 오픈 + E·A 모양');
});

test('음 개수: D를 2개로 고르면 오픈 폼에서 이웃한 두 줄 폼 3가지가 먼저 나온다',()=>{
  const t=boot({root:2,q:'maj'});
  assert.equal(t.svgs(),3,'오픈, E 모양, A 모양');
  t.click('n','2');
  assert.equal(t.svgs(),3+5+4,'오픈 3가지 + E 모양 5가지 + A 모양 4가지');
  t.click('n','0');
  assert.equal(t.svgs(),3);
});

test('표시 방식: 음이름·도수',()=>{
  const t=boot();
  const labels=()=>[...t.container.querySelector('.cards svg').querySelectorAll('.dl,.ol')].map(x=>x.textContent);
  assert.deepEqual(labels().sort(),['A','A','C','E','E'].sort());
  t.click('label','degree');
  assert.deepEqual(labels().sort(),['1','R','R','5','♭3'].map(x=>x==='1'?'5':x).sort());
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

test('진행: 폼의 + 로 시작해 다음 코드 폼을 이어 담는다 (최대 8개)',()=>{
  const t=boot();
  assert.equal(t.container.querySelector('.prog'),null,'처음엔 진행이 없다');
  addFirst(t);
  assert.deepEqual(chipNames(t),['Am']);
  assert.equal(t.state().prog[0].frets.length,6);
  // 다음 코드를 고르는 동안 이전 폼을 보여 준다
  assert.deepEqual([...t.container.querySelectorAll('.refs .card.ref')].map(x=>x.dataset.v),['이전 폼']);
  assert.match(t.container.querySelector('.refs .card.ref').textContent,/1\. Am/);
  t.click('root','0'); t.click('q','maj'); addFirst(t);
  t.click('root','7'); addFirst(t);
  assert.deepEqual(chipNames(t),['Am','C','G']);
  // 최대 8개
  for(let i=0;i<5;i++) addFirst(t);
  assert.equal(t.state().prog.length,8);
  assert.equal(t.container.querySelector('button[data-k="fadd"]').disabled,true);
  // 복원
  const raw=JSON.stringify(t.state());
  cleanup();
  const b=boot(raw);
  assert.equal(chipNames(b).length,8);
});

test('진행: 칩을 골라 그 자리를 다시 고르거나 제거한다 (C–Am–Dm–G)',()=>{
  const t=boot();
  for(const [r,q] of [[0,'maj'],[9,'min'],[2,'min'],[7,'maj']]){ t.click('root',String(r)); t.click('q',q); addFirst(t); }
  assert.deepEqual(chipNames(t),['C','Am','Dm','G']);
  const keep=t.state().prog.map(e=>e.frets.join());
  // Am 선택: 코드를 불러오고, 카드는 ↺ 로 바뀌고, 앞뒤 폼을 보여 준다
  t.click('psel','1');
  assert.deepEqual([t.state().root,t.state().q],[9,'min']);
  assert.equal(t.btn('psel','1').getAttribute('aria-pressed'),'true');
  assert.equal(t.container.querySelector('button[data-k="fadd"]'),null);
  assert.ok(t.container.querySelector('button[data-k="frep"][data-v="0"]'));
  assert.ok(t.container.querySelector('.cards .card.cur'),'지금 자리의 폼 표시');
  assert.deepEqual([...t.container.querySelectorAll('.refs .card.ref')].map(x=>x.dataset.v),['이전 폼','다음 폼']);
  assert.match(t.container.querySelector('.cards .move').textContent,/앞 .* 뒤 /);
  // 다시 누르면 선택이 풀리고 + 로 돌아간다
  t.click('psel','1');
  assert.ok(t.container.querySelector('button[data-k="fadd"]'));
  // 다른 코드로 교체: Am → Em
  t.click('psel','1'); t.click('root','4'); t.click('q','min');
  fireEvent.click(t.container.querySelector('button[data-k="frep"][data-v="0"]'));
  assert.deepEqual(chipNames(t),['C','Em','Dm','G']);
  const now=t.state().prog.map(e=>e.frets.join());
  assert.equal(now[0],keep[0]); assert.equal(now[2],keep[2]); assert.equal(now[3],keep[3]);
  assert.notEqual(now[1],keep[1]);
  // 제거: 이웃 폼은 그대로, 이동 거리만 다시 계산된다
  const before=t.state().prog.map(e=>e.frets.join());
  t.click('psel','1'); t.click('pdel','1');
  assert.deepEqual(chipNames(t),['C','Dm','G']);
  assert.deepEqual(t.state().prog.map(e=>e.frets.join()),[before[0],before[2],before[3]]);
  // 진행 보기: 담은 폼이 차례로 모이고 넘기기가 생긴다
  t.click('pview','');
  assert.equal(t.svgs(),3);
  assert.match(t.count(),/진행 3개 · 총 손 이동 \d+프렛/);
  assert.equal(t.container.querySelector('.refs'),null,'모아 볼 때는 기준 폼을 숨긴다');
  assert.ok(t.container.querySelector('.slidenav'));
  t.click('pview','');
  // 비우기
  t.click('pclear','');
  assert.equal(t.state().prog.length,0);
  assert.equal(t.container.querySelector('.prog'),null);
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
