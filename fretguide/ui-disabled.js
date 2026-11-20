// 불가능한 조합의 버튼이 비활성화되는지, 비활성 버튼은 눌러도 무시되는지,
// 아무렇게나 눌러도 빈 화면에 닿지 않는지, 저장된 불가능 조합이 복구되는지 확인한다.
const {boot}=require('./harness');
const fails=[];
const eq=(a,b,msg)=>{ if(JSON.stringify(a)!==JSON.stringify(b)) fails.push(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };

// 1) 베이스 1에는 줄이 부족해 4음을 못 놓는다 -> 모든 구성음이 켜진 m7에서는 베이스 1~3이 비활성 (4줄이 필요)
{
  const t=boot({});
  t.click('q','m7'); t.click('rs','all');
  eq(t.flags('[data-k="rs"]'),{1:true,2:true,3:true,4:false,5:false,6:false,all:false},'m7 4음: 베이스 버튼 상태');
  eq(Object.values(t.flags('#roots .chip')).some(Boolean),false,'근음 버튼은 항상 활성');
  // 비활성 버튼은 눌러도 무시된다
  const before=t.cards();
  t.clickBtn(t.lists['[data-k="rs"]'][0]); // 베이스 1
  if(t.cards()!==before) fails.push('비활성 버튼을 눌렀는데 화면이 바뀜');
  eq(t.state().rs,'all','비활성 버튼 클릭 후 상태');
}
// 2) 구성음 하나만 켜면 그 칩은 꺼지지 않는다 (마지막 하나)
{
  const t=boot({});
  t.click('q','maj'); t.click('t',1); t.click('t',2); // 1도만 남김
  eq(t.state().t.slice(0,3),[true,false,false],'3도·5도 끄기');
  eq(t.flags('#tsel [data-k="t"]')['0'],true,'마지막 켜진 구성음은 끌 수 없음');
  // 트라이어드에서 7도 칩은 비활성
  eq(t.flags('#tsel [data-k="t"]')['3'],true,'트라이어드는 7도 칩 비활성');
}
// 3) 코드 버튼: 7도만 켠 상태에서는 트라이어드로 못 바꾼다
{
  const t=boot({});
  t.click('q','m7'); t.click('t',0); t.click('t',1); t.click('t',2);
  eq(t.state().t,[false,false,false,true],'7도만 켬');
  const f=t.flags('[data-k="q"]');
  eq([f.maj,f.min,f['7'],f.maj7,f.m7],[true,true,false,false,false],'7도만 켠 상태: 코드 버튼');
}
// 4) 아무렇게나 눌러도(비활성은 무시) 빈 화면에 닿지 않는다
{
  const t=boot({});
  let seed=12345;
  const rnd=m=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed%m; };
  const groups=['#roots .chip','[data-k="q"]','[data-k="rs"]','#tsel [data-k="t"]'];
  let empties=0;
  for(let i=0;i<4000;i++){
    const g=groups[rnd(groups.length)];
    const list=t.lists[g];
    t.clickBtn(list[rnd(list.length)]);
    if(t.svgs()<1) empties++;
  }
  eq(empties,0,'무작위 클릭 중 빈 화면 횟수');
}
// 5) 불가능한 저장값은 열 때 복구된다
{
  const t=boot({'fretguide.v2':JSON.stringify({root:0,q:'7',rs:1,t:[true,true,true,true]})});
  if(t.svgs()<1) fails.push('불가능한 저장값에서 빈 화면');
  eq(t.state().rs,4,'불가능한 저장값 복구');
}

// 6) 구성음 프리셋: 눌리고, 트라이어드에서 7도 프리셋은 비활성이며, 현재 조합과 같으면 눌림 표시
{
  const t=boot({});
  t.click('q','maj');
  eq(t.flags('#presets [data-k="preset"]'),{all:false,guide:true,rootless:false,r5:false},'트라이어드 프리셋 상태');
  t.click('q','m7');
  t.clickBtn(t.lists['#presets [data-k="preset"]'][1]); // 3·7
  eq(t.state().t,[false,true,false,true],'프리셋 3·7');
  eq(t.lists['#presets [data-k="preset"]'].map(b=>b.attrs['aria-pressed']),['false','true','false','false'],'프리셋 눌림 표시');
  t.clickBtn(t.lists['#presets [data-k="preset"]'][2]); // 근음 빼기
  eq(t.state().t,[false,true,true,true],'프리셋 근음 빼기');
  if(t.svgs()<1) fails.push('프리셋 적용 후 빈 화면');
  // 요약 줄
  eq(t.stubs['#advsum'].textContent.startsWith('구성음 3·5·7 · 베이스 4번 줄'),true,'상세 조건 요약');
}

if(fails.length){ console.log(`실패 ${fails.length}건`); fails.slice(0,20).forEach(f=>console.log(' -',f)); process.exit(1); }
console.log('모든 검사 통과');
