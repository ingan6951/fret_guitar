// 화면 테스트: 데이터에 있는 코드만 고를 수 있고, 진행을 폼의 + 로 이어 담고 고치는 흐름, 설정 저장·복원
// jsdom 환경은 scripts/test-ui.mjs 가 --import 로 먼저 불러온다
import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {render,cleanup,fireEvent,act} from '@testing-library/react';
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
const progOf=t=>{ const s=t.state(); return s.lists[s.cur].prog; };
const barNames=t=>[...t.container.querySelectorAll('.bars .bar')].map(b=>{ const x=b.querySelector('.bc b'); return x?x.textContent:''; });
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
  assert.equal(CHORDS.length,446);
  for(const c of CHORDS.slice(0,8)){
    const t=boot({root:c.root,q:c.q});
    assert.equal(t.container.querySelector('.sym').textContent,nameOf(c));
    assert.ok(t.svgs()>=1,`${nameOf(c)} 폼`);
    addFirst(t);
    assert.equal(progOf(t)[0].frets.map(f=>f===null?'x':f).join(' '),expected[nameOf(c)],`${nameOf(c)} 운지`);
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

test('마디: 처음에는 빈 마디 4개가 있고 1마디가 선택돼 있다',()=>{
  const t=boot();
  assert.equal(t.container.querySelectorAll('.bars .bar').length,4);
  assert.equal(t.container.querySelectorAll('.bars .bar.blank').length,4);
  assert.equal(t.btn('bar','0').getAttribute('aria-pressed'),'true');
  assert.ok(t.container.querySelector('button[data-k="padd"]'),'마디 추가 버튼');
  for(const k of ['pview','pshare','pclear','pdel']) assert.equal(t.container.querySelector(`button[data-k="${k}"]`),null,`${k}는 코드가 들어간 뒤에 나온다`);
  assert.deepEqual(barNames(t),['','','','']);
});

test('마디에 코드 넣기: + 로 선택한 마디에 넣고 다음 마디로 넘어간다',()=>{
  const t=boot();
  addFirst(t);
  assert.deepEqual(barNames(t),['Am','','','']);
  assert.equal(progOf(t)[0].frets.length,6);
  assert.equal(t.btn('bar','1').getAttribute('aria-pressed'),'true','다음 마디가 선택된다');
  // 다음 코드를 고르는 동안 이전 폼을 보여 준다
  assert.deepEqual([...t.container.querySelectorAll('.refs .card.ref')].map(x=>x.dataset.v),['이전 폼']);
  assert.match(t.container.querySelector('.refs .card.ref').textContent,/1\. Am/);
  t.click('root','0'); t.click('q','maj'); addFirst(t);
  t.click('root','7'); addFirst(t);
  assert.deepEqual(barNames(t),['Am','C','G','']);
  assert.equal(progOf(t).length,4);
});

test('마디 추가: 하단 + 로 8마디까지 늘릴 수 있다',()=>{
  const t=boot();
  for(let i=0;i<4;i++) fireEvent.click(t.container.querySelector('button[data-k="padd"]'));
  assert.equal(t.container.querySelectorAll('.bars .bar').length,8);
  assert.equal(t.container.querySelector('button[data-k="padd"]'),null,'8마디가 최대');
  assert.equal(t.btn('bar','7').getAttribute('aria-pressed'),'true','새 마디가 선택된다');
  addFirst(t);
  assert.equal(barNames(t)[7],'Am');
  // 복원
  const raw=JSON.stringify(t.state());
  cleanup();
  const b=boot(raw);
  assert.equal(b.container.querySelectorAll('.bars .bar').length,8);
  assert.equal(barNames(b)[7],'Am');
});

test('마디 선택: 빈 마디를 건너뛰고 채우거나, 찬 마디를 다시 고르거나 비운다 (C–Am–Dm–G)',()=>{
  const t=boot();
  for(const [r,q] of [[0,'maj'],[9,'min'],[2,'min'],[7,'maj']]){ t.click('root',String(r)); t.click('q',q); addFirst(t); }
  assert.deepEqual(barNames(t),['C','Am','Dm','G']);
  const keep=progOf(t).map(e=>e.frets.join());
  // Am 마디 선택: 코드를 불러오고, 카드는 ↺ 로 바뀌고, 앞뒤 폼을 보여 준다
  t.click('bar','1');
  assert.deepEqual([t.state().root,t.state().q],[9,'min']);
  assert.equal(t.btn('bar','1').getAttribute('aria-pressed'),'true');
  assert.equal(t.container.querySelector('button[data-k="fadd"]'),null);
  assert.ok(t.container.querySelector('button[data-k="frep"][data-v="0"]'));
  assert.ok(t.container.querySelector('.cards .card.cur'),'지금 마디의 폼 표시');
  assert.deepEqual([...t.container.querySelectorAll('.refs .card.ref')].map(x=>x.dataset.v),['이전 폼','다음 폼']);
  assert.match(t.container.querySelector('.cards .move').textContent,/앞 .* 뒤 /);
  // 다른 코드로 교체: Am → Em, 이웃 마디는 그대로
  t.click('root','4'); t.click('q','min');
  fireEvent.click(t.container.querySelector('button[data-k="frep"][data-v="0"]'));
  assert.deepEqual(barNames(t),['C','Em','Dm','G']);
  const now=progOf(t).map(e=>e.frets.join());
  assert.equal(now[0],keep[0]); assert.equal(now[2],keep[2]); assert.equal(now[3],keep[3]);
  assert.notEqual(now[1],keep[1]);
  // 마디 비우기: 그 마디만 비고 이웃 폼은 그대로
  t.click('bar','1'); t.click('pdel','1');
  assert.deepEqual(barNames(t),['C','','Dm','G']);
  assert.equal(progOf(t).length,4);
  // 빈 마디 건너뛰고 4마디 앞 쪽 마디에 채우기: 1마디 선택 → 다음 칸(2마디)로 넘어가지 않고 선택한 마디에 들어간다
  t.click('bar','1'); t.click('root','9'); t.click('q','min'); addFirst(t);
  assert.deepEqual(barNames(t),['C','Am','Dm','G']);
  // 진행 보기: 담은 폼이 차례로 모이고 넘기기가 생긴다
  t.click('bar','1'); t.click('pdel','1');
  t.click('pview','');
  assert.equal(t.svgs(),3);
  assert.match(t.count(),/진행 3개 · 총 손 이동 \d+프렛/);
  assert.equal(t.container.querySelector('.refs'),null,'모아 볼 때는 기준 폼을 숨긴다');
  assert.ok(t.container.querySelector('.slidenav'));
  t.click('pview','');
  // 전체 비우기: 빈 마디 4개로 돌아간다
  fireEvent.click(t.container.querySelector('button[data-k="padd"]'));
  t.click('pclear','');
  assert.equal(t.container.querySelectorAll('.bars .bar').length,4);
  assert.deepEqual(barNames(t),['','','','']);
  assert.equal(t.btn('bar','0').getAttribute('aria-pressed'),'true');
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

test('진행 공유 링크: 링크 복사 → 그 링크로 들어오면 같은 마디 진행이 나온다',async()=>{
  let copied='';
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{ copied=t; }},configurable:true});
  const t=boot();
  addFirst(t);
  t.click('root','0'); t.click('q','maj'); addFirst(t);
  fireEvent.click(t.container.querySelector('button[data-k="padd"]')); // 5마디로 늘리고 3·4마디는 비워 둔다
  t.click('root','7'); addFirst(t);
  fireEvent.change(t.container.querySelector('input[data-k="ptitle"]'),{target:{value:'가을 노래'}});
  const saved=progOf(t);
  assert.deepEqual(barNames(t),['Am','C','','','G']);
  await act(async()=>{ fireEvent.click(t.container.querySelector('button[data-k="pshare"]')); });
  assert.match(copied,/\?p=/); assert.match(decodeURIComponent(copied),/t=가을[+ ]노래/);
  assert.match(t.container.querySelector('button[data-k="pshare"]').textContent,/복사됨/);
  // 다른 기기(저장된 설정이 없는 브라우저)에서 링크로 열기
  const q=new URL(copied).search;
  cleanup(); localStorage.clear();
  window.history.pushState(null,'','/'+q);
  const u=boot();
  assert.deepEqual(barNames(u),['Am','C','','','G']);
  assert.deepEqual(progOf(u),saved);
  assert.equal(u.state().lists.length,1,'비어 있는 첫 진행 자리에 불러온다');
  assert.equal(u.state().lists[0].title,'가을 노래');
  assert.equal(window.location.search,'','불러온 뒤에는 주소의 진행 값을 지운다');
  // 잘못된 링크는 무시한다
  cleanup(); localStorage.clear();
  window.history.pushState(null,'','/?p=broken');
  const v=boot();
  assert.deepEqual(barNames(v),['','','','']);
});

test('진행 제목·여러 진행: 제목 붙이기, 새 진행 만들기·전환, 삭제',()=>{
  const t=boot();
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
  assert.deepEqual(barNames(t),['','','','']);
  fireEvent.change(title(),{target:{value:'후렴'}});
  t.click('root','0'); t.click('q','maj'); addFirst(t);
  assert.deepEqual(opts(),['Autumn Leaves','후렴']);
  // 전환: 각 진행의 마디가 그대로 있다
  t.click('pswitch','0');
  assert.equal(title().value,'Autumn Leaves');
  assert.deepEqual(barNames(t),['Am','','','']);
  t.click('pswitch','1');
  assert.deepEqual(barNames(t),['C','','','']);
  // 삭제: 코드가 있는 진행은 한 번 더 눌러야 지워진다
  t.click('pswitch','0');
  const del=()=>fireEvent.click(t.container.querySelector('button[data-k="plistdel"]'));
  del();
  assert.equal(t.state().lists.length,2,'첫 클릭은 확인만');
  assert.match(t.container.querySelector('button[data-k="plistdel"]').textContent,/정말 삭제/);
  del();
  assert.equal(t.state().lists.length,1);
  assert.equal(title().value,'후렴');
  assert.deepEqual(barNames(t),['C','','','']);
  // 저장·복원
  const raw=JSON.stringify(t.state());
  cleanup();
  const b=boot(raw);
  assert.equal(b.container.querySelector('input[data-k="ptitle"]').value,'후렴');
  // 마지막 진행을 지우면 빈 진행 하나가 남는다
  const del2=()=>fireEvent.click(b.container.querySelector('button[data-k="plistdel"]'));
  del2(); del2();
  assert.equal(b.state().lists.length,1);
  assert.equal(b.container.querySelector('input[data-k="ptitle"]').value,'진행 1');
  assert.deepEqual(barNames(b),['','','','']);
  // 빈 진행은 확인 없이 바로 지워진다
  fireEvent.click(b.container.querySelector('button[data-k="pnew"]'));
  assert.equal(b.state().lists.length,2);
  del2();
  assert.equal(b.state().lists.length,1);
});

test('예전 저장값(진행 하나)은 첫 진행으로 옮겨 열린다, 공유 링크는 기존 진행을 지우지 않고 새 진행으로 추가된다',()=>{
  const old={root:9,q:'min',label:'note',flat:false,prog:[{root:0,q:'maj',frets:[null,3,2,0,1,0]}]};
  const a=boot(old);
  assert.deepEqual(barNames(a),['C','','','']);
  assert.equal(a.container.querySelector('input[data-k="ptitle"]').value,'진행 1');
  cleanup();
  // 이미 진행이 있는 브라우저에서 링크 열기
  localStorage.setItem(STORAGE_KEY,JSON.stringify({lists:[{title:'내 진행',prog:[{root:9,q:'min',frets:[null,0,2,2,1,0]},null,null,null]}],cur:0}));
  window.history.pushState(null,'','/?p='+encodeURIComponent('7-maj-3.2.0.0.0.3~_~_~_')+'&t='+encodeURIComponent('받은 진행'));
  const b=boot();
  assert.equal(b.state().lists.length,2);
  assert.deepEqual(b.state().lists.map(l=>l.title),['내 진행','받은 진행']);
  assert.equal(b.state().cur,1);
  assert.deepEqual(barNames(b),['G','','','']);
  assert.equal(window.location.search,'');
});

test('지판음: 모드를 바꿔 지판에서 음을 눌러 마디에 넣고, 코드와 섞어 쓰며, 진행 보기·링크로도 같다',async()=>{
  let copied='';
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{ copied=t; }},configurable:true});
  const t=boot();
  addFirst(t); // 1마디: Am
  fireEvent.click(t.container.querySelector('button[data-k="imode"][data-v="note"]'));
  assert.ok(t.container.querySelector('.notepick'),'지판 고르기가 보인다');
  assert.equal(t.container.querySelector('.cards'),null,'코드 폼 카드는 숨긴다');
  // 2마디(자동 선택됨): 6번 줄 개방(E), 3마디: 5번 줄 3프렛(C)
  const cell=(s,f)=>t.container.querySelector(`button[data-k="nnote"][data-v="${s}.${f}"]`);
  assert.equal(cell(0,0).textContent,'E');
  assert.equal(cell(1,3).textContent,'C');
  fireEvent.click(cell(0,0)); fireEvent.click(cell(1,3));
  assert.deepEqual(progOf(t).slice(0,3),[{root:9,q:'min',frets:[null,0,2,2,1,0]},{s:0,f:0},{s:1,f:3}]);
  assert.deepEqual(barNames(t),['Am','E','C','']);
  // 노트 마디를 다시 누르면 그 음이 선택된 상태로 보이고 다른 음으로 바꿀 수 있다
  fireEvent.click(t.container.querySelectorAll('.bars .bar')[1]);
  assert.equal(cell(0,0).getAttribute('aria-pressed'),'true');
  fireEvent.click(cell(5,5)); // 1번 줄 5프렛 = A
  assert.deepEqual(progOf(t)[1],{s:5,f:5});
  // 코드 마디를 누르면 코드 폼 모드로 돌아온다
  fireEvent.click(t.container.querySelectorAll('.bars .bar')[0]);
  assert.ok(t.container.querySelector('.cards'));
  // 진행 보기: 코드 마디와 지판음 마디가 모두 나온다
  fireEvent.click(t.container.querySelector('button[data-k="pview"]'));
  assert.equal(t.container.querySelectorAll('.cards figure').length,3);
  assert.match(t.container.querySelector('.cards').textContent,/지판음 · 1번 줄 5프렛/);
  fireEvent.click(t.container.querySelector('button[data-k="pview"]'));
  // 링크 복사 → 다른 브라우저에서 같은 진행
  await act(async()=>{ fireEvent.click(t.container.querySelector('button[data-k="pshare"]')); });
  const saved=progOf(t),q=new URL(copied).search;
  assert.match(decodeURIComponent(q),/N5\.5/);
  cleanup(); localStorage.clear();
  window.history.pushState(null,'','/'+q);
  const u=boot();
  assert.deepEqual(progOf(u),saved);
  assert.deepEqual(barNames(u),['Am','A','C','']);
});
