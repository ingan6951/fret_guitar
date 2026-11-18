// 폼 생성 로직 검증. index.html의 LOGIC 블록만 꺼내 실행하고, 별도의 전수 탐색(브루트포스)과 결과를 맞춰 본다.
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const logic=html.split('/* LOGIC:START */')[1].split('/* LOGIC:END */')[0];
const L=new Function(logic+';return {QUALITIES,OPEN,DEGREE,MAX_FRET,MAX_SPAN,maskFor,shapesFor,hasForms,resolve,collect,barres,windowStart,handPos,moveCost,candidates,planProgression};')();
const {QUALITIES,OPEN,MAX_FRET,MAX_SPAN,maskFor,shapesFor,hasForms,resolve,collect,barres,handPos,moveCost,candidates,planProgression}=L;

const fails=[];
const eq=(a,b,msg)=>{ if(JSON.stringify(a)!==JSON.stringify(b)) fails.push(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };

// 켤 수 있는 구성음 조합 (1도·3도·5도·7도 중 비어 있지 않은 부분집합)
const masks=[];
for(let m=1;m<16;m++) masks.push([0,1,2,3].map(i=>!!(m&(1<<i))));
const lowFret=res=>Math.min(...res.notes.filter(Boolean).map(n=>n.fret));

// 전수 탐색용 줄 목록 (로직과 따로 만든다): 베이스부터 위로 n줄, 'skip'은 사이에 빈 줄이 정확히 하나
function refStrings(b,n,layout){
  const out=[];
  const gaps=layout==='skip'?1:0;
  const low=b-(n-1)-gaps;
  if(n<1||low<1||(layout==='skip'&&n<2)) return out;
  // b와 low 사이의 줄 중 빈 줄 gaps개를 고른다 (양 끝은 항상 사용)
  const inner=[];for(let s=b-1;s>low;s--) inner.push(s);
  const pick=(i,chosen)=>{
    if(chosen.length===inner.length-gaps||i===inner.length){
      if(chosen.length===inner.length-gaps) out.push([b,...chosen,low].filter((x,j,a)=>a.indexOf(x)===j));
      return;
    }
    pick(i+1,[...chosen,inner[i]]);
    pick(i+1,chosen);
  };
  if(n===1) out.push([b]); else pick(0,[]);
  return out;
}

let combos=0,impossible=0;
['adj','skip'].forEach(layout=>{
QUALITIES.forEach(q=>{
  masks.forEach(t=>{
    const mask=maskFor(q.id,t);
    if(!mask.length){ eq(hasForms(q.id,4,t,layout),false,`빈 구성음 ${q.id}`); return; } // 트라이어드에서 7도만 켠 경우
    [6,5,4,3,2,1,'all'].forEach(rs=>{
      const strs=rs==='all'?[6,5,4,3,2,1]:[rs];
      for(let root=0;root<12;root++){
        const got=collect(root,q.id,rs,false,t,layout);
        const gotOct=collect(root,q.id,rs,true,t,layout);
        // 1) 모든 폼이 규칙을 지키는지
        [...got,...gotOct].forEach(res=>{
          const sounded=res.notes.filter(Boolean);
          const tag=`${layout} ${q.id} ${rs} mask=${mask} root=${root}`;
          eq(sounded.length,mask.length,`${tag}: 음 개수`);
          eq(sounded.map(n=>(n.pc-root+12)%12).sort((a,b)=>a-b),mask.map(i=>q.tones[i]).sort((a,b)=>a-b),`${tag}: 켠 구성음을 한 줄에 하나씩`);
          const ss=sounded.map(n=>n.string);
          eq(ss,[...ss].sort((a,b)=>b-a),`${tag}: 줄 순서`);
          if(ss[0]-ss[ss.length-1]!==ss.length-1+(layout==='skip'?1:0)) fails.push(`${tag}: 줄 배치(${layout})가 맞지 않음 ${ss}`);
          if(!strs.includes(res.bass)||res.bass!==ss[0]) fails.push(`${tag}: 베이스 줄이 가장 낮은 줄이 아님`);
          const fr=sounded.map(n=>n.fret);
          if(Math.min(...fr)<0||Math.max(...fr)>MAX_FRET) fails.push(`${tag}: 프렛 범위 ${fr}`);
          if(Math.max(...fr)-Math.min(...fr)>MAX_SPAN) fails.push(`${tag}: 손 폭 ${fr}`);
          sounded.forEach(n=>{
            if(n.fret===0){ if(n.finger!==null) fails.push(`${tag}: 개방현에 손가락 ${n.finger}`); }
            else if(!(n.finger>=1&&n.finger<=4)) fails.push(`${tag}: 손가락 ${n.finger}`);
          });
          // 손가락 규칙: 높은 프렛 = 높은 번호, 같은 프렛 다른 손가락은 굵은 줄이 낮은 번호, 같은 손가락은 바레 가능할 때만
          {
            const fr=res.notes.map(n=>n?n.fret:null);
            for(let a=0;a<6;a++) for(let b=a+1;b<6;b++){
              const x=res.notes[a],y=res.notes[b];
              if(!x||!y||x.fret===0||y.fret===0) continue;
              if(x.fret!==y.fret){ if((x.fret<y.fret)!==(x.finger<y.finger)||x.finger===y.finger) fails.push(`${tag}: 손가락 순서 ${fr}`); }
              else if(x.finger===y.finger){
                for(let k=a+1;k<b;k++) if(fr[k]===null||fr[k]<x.fret) fails.push(`${tag}: 뮤트 줄을 가로지르는 바레 ${fr}`);
              } else if(x.finger>y.finger) fails.push(`${tag}: 같은 프렛 손가락 순서 ${fr}`);
            }
          }
        });
        // 2) 전수 탐색과 같은 폼 집합인지 (옥타브 위 포함)
        const want=new Set();
        strs.forEach(b=>{
          const n=mask.length;
          const pcs=mask.map(i=>(root+q.tones[i])%12);
          refStrings(b,n,layout).forEach(strings=>{
          const rec=(k,frets,used)=>{
            if(k===n){
              if(Math.max(...frets)-Math.min(...frets)<=MAX_SPAN){
                const arr=[null,null,null,null,null,null];
                strings.forEach((s,j)=>{ arr[6-s]=frets[j]; });
                want.add(`${b}:${arr.join(',')}`);
              }
              return;
            }
            for(let f=0;f<=MAX_FRET;f++){
              const pc=(OPEN[6-strings[k]]+f)%12;
              const idx=pcs.indexOf(pc);
              if(idx<0||used&(1<<idx)) continue;
              rec(k+1,[...frets,f],used|(1<<idx));
            }
          };
          rec(0,[],0);
          });
        });
        const have=new Set();
        [...got,...gotOct].forEach(res=>have.add(`${res.bass}:${res.notes.map(n=>n?n.fret:null).join(',')}`));
        const missing=[...want].filter(x=>!have.has(x)),extra=[...have].filter(x=>!want.has(x));
        if(missing.length||extra.length) fails.push(`${layout} ${q.id} ${rs} mask=${mask} root=${root}: 전수 탐색과 불일치 (빠짐 ${missing.length}, 초과 ${extra.length}) ${missing[0]||extra[0]}`);
      }
      // 3) hasForms는 근음과 무관하게 실제 결과와 일치
      const any=collect(0,q.id,rs,false,t,layout).length>0;
      eq(hasForms(q.id,rs,t,layout),any,`hasForms ${layout} ${q.id} ${rs} mask=${mask}`);
      combos++; if(!any) impossible++;
    });
  });
});
});

// 4) 알려진 값 (C 근음)
{
  // Cm7, 4번 줄 베이스: R 5 ♭7 ♭3 → 4번 줄 5프렛(근음)부터 5프렛 이내가 아니라 정확한 프렛 확인
  const t=[true,true,true,true];
  const list=collect(0,'m7',4,false,t);
  const rf=list.find(r=>r.formName==='R–5–♭7–♭3');
  eq(rf&&rf.notes.map(n=>n?n.fret:null),[null,null,10,12,11,11],'Cm7 R–5–♭7–♭3 (4번 줄 베이스)');
  eq(rf&&rf.notes.map(n=>n?n.finger:null),[null,null,1,3,2,2],'Cm7 R–5–♭7–♭3 손가락 (2·1번 줄 미니 바레)');
  // 사이 줄이 더 높은 프렛이면 바레: Am7 5번 줄 베이스 12·14·12·13 → 1·3·1·2
  const ab=collect(9,'m7',5,true,t).find(r=>r.formName==='R–5–♭7–♭3'&&r.baseFret===12);
  eq(ab&&ab.notes.map(n=>n?[n.fret,n.finger]:null),[null,[12,1],[14,3],[12,1],[13,2],null],'Am7 12프렛 손가락');
  // 같은 프렛 두 음 사이에 더 높은 음: D 트라이어드 3번 줄 베이스 5–R–3 (3·2·1번 줄 2·3·2) → 1·3·2 (D 코드 운지)
  const dd=collect(2,'maj',3,false,[true,true,true,false]).find(r=>r.formName==='5–R–3'&&r.baseFret===2);
  eq(dd&&dd.notes.map(n=>n?[n.fret,n.finger]:null),[null,null,null,[2,1],[3,3],[2,2]],'D 2·3·2 손가락');
  // 같은 프렛 네 줄은 바레: Am7 4번 줄 베이스 ♭7–♭3–5–R (5·5·5·5) → 1·1·1·1
  const b4=collect(9,'m7',4,false,t).find(r=>r.formName==='♭7–♭3–5–R'&&r.baseFret===5);
  eq(b4&&b4.notes.map(n=>n?n.finger:null),[null,null,1,1,1,1],'같은 프렛 네 줄 바레');
  // 근음 끄기: Am7 → 근음 없는 3도-5도-7도 폼
  const rootless=collect(9,'m7',5,false,[false,true,true,true]);
  if(!rootless.length) fails.push('Am7 근음 없는 폼이 없음');
  rootless.forEach(r=>{ if(r.notes.some(n=>n&&n.pc===9)) fails.push('근음 끈 폼에 근음이 들어 있음'); });
  // 1음: 근음만 켠 폼은 베이스 줄마다 정확히 한 줄
  [6,5,4,3,2,1].forEach(b=>{
    const one=collect(0,'maj',b,false,[true,false,false,false]);
    eq(one.length,1,`근음 1개 · 베이스 ${b}`);
    eq(one[0].notes.filter(Boolean).length,1,`근음 1개 · 베이스 ${b}: 음 하나`);
  });
  // 트라이어드에서 7도 토글은 무시된다
  eq(collect(0,'maj',4,false,[true,true,true,true]).length,collect(0,'maj',4,false,[true,true,true,false]).length,'트라이어드는 7도 토글 무시');
  // 7도만 켠 트라이어드는 폼이 없다
  eq(hasForms('maj',4,[false,false,false,true]),false,'트라이어드에서 7도만 켬');
  // 쉘: C7, 6번 줄 베이스 R–♭7–3 → 6번 줄 8, 5번 줄 뮤트, 4번 줄 8, 3번 줄 9
  const shell=collect(0,'7',6,false,[true,true,false,true],'skip');
  const s1=shell.find(r=>r.formName==='R–♭7–3');
  eq(s1&&s1.notes.map(n=>n?n.fret:null),[8,null,8,9,null,null],'C7 쉘 R–♭7–3 (6번 줄)');
  eq(s1&&s1.notes.map(n=>n?n.finger:null),[1,null,2,3,null,null],'C7 쉘 손가락');
  // 쉘: Cmaj7, 5번 줄 베이스 R–7–3 → 5번 줄 3, 4번 줄 뮤트, 3번 줄 4, 2번 줄 5
  const s2=collect(0,'maj7',5,false,[true,true,false,true],'skip').find(r=>r.formName==='R–7–3');
  eq(s2&&s2.notes.map(n=>n?n.fret:null),[null,3,null,4,5,null],'Cmaj7 쉘 R–7–3 (5번 줄)');
  eq(s2&&s2.notes.map(n=>n?n.finger:null),[null,1,null,2,3,null],'Cmaj7 쉘 손가락');
  // 개방 위치는 실제 누르는 프렛으로 번호를 매긴다
  // C7 쉘 6번 줄 베이스 3–R–♭7: 6번 줄 개방(E), 5번 줄 3(C), 3번 줄 3(B♭) → 1·2번 손가락
  const op=collect(0,'7',6,false,[true,true,false,true],'skip').find(r=>r.formName==='3–R–♭7'&&r.baseFret===0);
  eq(op&&op.notes.map(n=>n?[n.fret,n.finger]:null),[[0,null],[3,1],null,[3,2],null,null],'C7 쉘 개방 위치 손가락');
  // Am7 붙여서 5번 줄 베이스 R–5–♭7–♭3: x02010 → 2번 줄 1프렛 1번, 4번 줄 2프렛 2번
  const am=collect(9,'m7',5,false,[true,true,true,true]).find(r=>r.formName==='R–5–♭7–♭3'&&r.baseFret===0);
  eq(am&&am.notes.map(n=>n?[n.fret,n.finger]:null),[null,[0,null],[2,2],[0,null],[1,1],null],'Am7 개방 위치 손가락');
  // 1음은 건너뛸 줄이 없어 쉘 폼이 없다
  eq(hasForms('maj',6,[true,false,false,false],'skip'),false,'1음 쉘');
  // 바레는 치지 않는 줄을 가로지르지 않는다
  const mk=(st,fr,fi)=>({string:st,fret:fr,finger:fi});
  eq(barres([null,mk(5,3,1),null,mk(3,3,1),mk(2,3,1),null]),[{fret:3,top:2,bottom:3}],'바레가 뮤트 줄을 건너지 않음');
  // 사이 줄이 더 높은 프렛을 누르면 바레는 이어진다 (붙여서 배치의 기존 동작)
  eq(barres([null,null,mk(4,5,1),mk(3,7,3),mk(2,5,1),null]),[{fret:5,top:2,bottom:4}],'더 높은 프렛 위로 이어지는 바레');
}

// 5) 바레 계산이 모든 결과에서 깨지지 않는다
for(const q of QUALITIES){
  for(const t of masks){
    for(const rs of [6,4,1,'all']){
      for(const root of [0,4,9]){
        ['adj','skip'].forEach(l=>collect(root,q.id,rs,false,t,l).forEach(r=>{ barres(r.notes); }));
      }
    }
  }
}

// 6) 진행: 동적 계획법 결과가 모든 조합을 다 따져 본 최솟값과 같다
let progChecks=0;
{
  let seed=7;
  const rnd=m=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed%m; };
  const qs=QUALITIES.map(q=>q.id);
  for(let trial=0;trial<60;trial++){
    const len=2+rnd(3);
    const prog=Array.from({length:len},()=>({root:rnd(12),q:qs[rnd(qs.length)]}));
    const rs=[6,5,4,'all'][rnd(4)];
    const layout=['adj','skip'][rnd(2)];
    const t=[true,true,rnd(2)===0,true];
    const cands=prog.map(c=>candidates(c.root,c.q,rs,t,layout));
    const plan=planProgression(prog,rs,t,layout);
    // 폼이 있는 코드는 반드시 후보 중 하나를 고른다
    plan.pick.forEach((r,i)=>{
      if((r===null)!==(cands[i].length===0)) fails.push(`진행 ${trial}: ${i}번째 선택 여부`); const key=x=>x.notes.map(n=>n?n.fret:'x').join(',');
      if(r&&!cands[i].some(c=>key(c)===key(r))) fails.push(`진행 ${trial}: 후보 밖 선택`); });
    // 전수 탐색 (폼 없는 코드에서 끊긴다)
    let brute=0,seg=[];
    const segMin=seg=>{
      if(!seg.length) return 0;
      let best=Infinity;
      const rec=(k,prev,acc)=>{ if(acc>=best) return; if(k===seg.length){ best=acc; return; } seg[k].forEach(b=>rec(k+1,b,acc+(prev?moveCost(prev,b):0))); };
      rec(0,null,0); return best;
    };
    cands.forEach(c=>{ if(c.length) seg.push(c); else { brute+=segMin(seg); seg=[]; } });
    brute+=segMin(seg);
    if(Math.abs(brute-plan.total)>1e-6) fails.push(`진행 ${trial}: 최솟값 ${plan.total} != 전수 ${brute}`);
    // 고른 폼으로 다시 계산한 비용도 같다
    let again=0;
    for(let i=1;i<prog.length;i++) if(plan.pick[i]&&plan.pick[i-1]) again+=moveCost(plan.pick[i-1],plan.pick[i]);
    if(Math.abs(again-plan.total)>1e-6) fails.push(`진행 ${trial}: 고른 폼 비용 ${again} != ${plan.total}`);
    progChecks++;
  }
  // 알려진 예: 같은 코드를 반복하면 이동 0
  const same=planProgression([{root:9,q:'m7'},{root:9,q:'m7'},{root:9,q:'m7'}],'all',[true,true,true,true],'adj');
  eq(same.total,0,'같은 코드 반복은 이동 0');
  // ii–V–I (Dm7–G7–Cmaj7, 쉘 R·3·7): 이동이 작아야 한다 (3프렛 이하)
  const twofive=planProgression([{root:2,q:'m7'},{root:7,q:'7'},{root:0,q:'maj7'}],'all',[true,true,false,true],'skip');
  if(!(twofive.total<=3)) fails.push(`ii–V–I 쉘 총 이동 ${twofive.total}`);
  // 폼이 없는 코드(트라이어드에 7도만)는 null이고 앞뒤는 계속 계산된다
  const gap=planProgression([{root:0,q:'7'},{root:5,q:'maj'},{root:7,q:'7'}],4,[false,false,false,true],'adj');
  eq(gap.pick.map(Boolean),[true,false,true],'폼 없는 코드는 건너뜀');
}

console.log(`진행 ${progChecks}개 검사`);
console.log(`조합 ${combos}개 (폼 없는 조합 ${impossible}개) 검사`);
if(fails.length){ console.log(`실패 ${fails.length}건`); fails.slice(0,20).forEach(f=>console.log(' -',f)); process.exit(1); }
console.log('모든 검사 통과');
