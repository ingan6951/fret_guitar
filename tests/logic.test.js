// 폼 생성 로직 검증. lib/fretlogic.js를 별도의 전수 탐색(브루트포스)과 맞춰 본다.
import * as L from '../lib/fretlogic.js';
const {QUALITIES,OPEN,MAX_FRET,MAX_SPAN,maskFor,shapesFor,hasForms,resolve,collect,barres,handPos,moveCost,candidates}=L;

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
  if(layout!=='skip') return out;
  // 쉘 제한: 베이스 바로 위 줄이나 4번 줄을 비우는 폼은 없다
  return out.filter(arr=>{ const gap=[];for(let x=b-1;x>low;x--) if(!arr.includes(x)) gap.push(x); return gap.every(x=>x!==b-1&&x!==4); });
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
  // 쉘 제한: 비운 줄은 베이스 바로 위도, 4번 줄도 아니다
  //   6번 줄 베이스 3음(6·4·3, 6·5·3)은 없고, 5번 줄 베이스 3음은 5·4·2(3번 줄을 비움)뿐, 4번 줄 베이스 3음은 4·3·1(2번 줄을 비움)뿐
  const strs3=(b,q,t)=>[...new Set(collect(0,q,b,false,t,'skip').map(r=>r.notes.map((x,k)=>x?6-k:'-').filter(x=>x!=='-').join('')))];
  eq(strs3(6,'7',[true,true,false,true]),[],'6번 줄 베이스 3음 쉘은 없다');
  eq(strs3(5,'7',[true,true,false,true]),['542'],'5번 줄 베이스 3음 쉘은 5·4·2');
  eq(strs3(4,'maj7',[true,true,false,true]),['431'],'4번 줄 베이스 3음 쉘은 4·3·1');
  // 4음 쉘: 6번 줄 베이스는 6·5·4·2(3번 줄 비움)만, 5번 줄 베이스는 5·4·2·1
  eq(strs3(6,'7',[true,true,true,true]),['6542'],'6번 줄 베이스 4음 쉘');
  eq(strs3(5,'7',[true,true,true,true]),['5421','5431'],'5번 줄 베이스 4음 쉘');
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

// 4-2) 새 코드 종류: 모든 코드는 모든 구성음으로 폼이 있고, 폼 이름·도수는 코드별 이름을 쓴다
{
  const {degreeOf}=L;
  for(const q of QUALITIES){
    const all=[0,1,2,3].map(i=>i<q.tones.length);
    if(!hasForms(q.id,'all',all,'adj')) fails.push(`${q.id}: 모든 구성음 폼 없음`);
    eq(q.deg.length,q.tones.length,`${q.id}: 도수 이름 수`);
    eq(new Set(q.tones).size,q.tones.length,`${q.id}: 구성음 중복`);
    collect(0,q.id,'all',false,all,'adj').forEach(r=>r.formName.split('–').forEach(d=>{ if(!q.deg.includes(d)) fails.push(`${q.id}: 폼 이름 ${r.formName}`); }));
  }
  const add9=QUALITIES.find(q=>q.id==='add9'),dim7=QUALITIES.find(q=>q.id==='dim7'),aug=QUALITIES.find(q=>q.id==='aug');
  eq([degreeOf(add9,2),degreeOf(add9,14),degreeOf(add9,4),degreeOf(add9,5)],['9','9','3',''],'add9 도수');
  eq(degreeOf(dim7,9),'𝄫7','dim7 도수');
  eq(degreeOf(aug,8),'♯5','aug 도수');
  // Csus4 폼은 모두 C·F·G로만 이루어진다
  collect(0,'sus4',5,false,[true,true,true,false],'adj').forEach(r=>{
    const pcs=r.notes.filter(Boolean).map(n=>n.pc).sort((a,b)=>a-b);
    eq(pcs,[0,5,7],'Csus4 음: C F G');
  });
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

// 6) 음 개수 후보: 구성음 조합별 후보의 합집합이고, 모두 그 음 개수
{
  const {toneSubsets,candidatesN,hasFormsN,collectN}=L;
  eq(toneSubsets('m7',3).length,4,'7th 3음 조합 4가지');
  eq(toneSubsets('m7',4),[[true,true,true,true]],'7th 4음은 전부');
  eq(toneSubsets('maj',4),[[true,true,true,false]],'트라이어드 4음은 구성음 전부(겹쳐서 채움)');
  eq(toneSubsets('maj',2).length,3,'트라이어드 2음 조합 3가지');
  for(const qq of QUALITIES) for(const n of [2,3,4]) for(const rs of [6,4,'all']) for(const layout of ['adj','skip']){
    const got=candidatesN(4,qq.id,rs,n,layout);
    const want=new Set();
    toneSubsets(qq.id,n).forEach(t=>candidates(4,qq.id,rs,t,layout,0,n>qq.tones.length?n:null).forEach(r=>want.add(r.notes.map(x=>x?x.fret:'x').join(','))));
    eq(got.length,want.size,`음 개수 후보 수 ${qq.id} ${n} ${rs} ${layout}`);
    got.forEach(r=>{ if(r.notes.filter(Boolean).length!==n) fails.push(`음 개수 ${qq.id} ${n}: ${r.notes.filter(Boolean).length}음`); });
    eq(hasFormsN(qq.id,rs,n,layout),got.length>0,`hasFormsN ${qq.id} ${n} ${rs} ${layout}`);
  }
  // 코드 하나 목록(collectN): 같은 운지는 하나만, 낮은 프렛부터
  for(const qq of QUALITIES) for(const n of [1,2,3,4,5,6]) for(const rs of [6,4,'all']){
    const r=collectN(4,qq.id,rs,false,n,'any',0,null);
    const keys=r.map(x=>x.notes.map(m=>m?m.fret:'x').join(','));
    if(new Set(keys).size!==keys.length) fails.push(`collectN 중복 ${qq.id} ${n} ${rs}`);
    for(let i=1;i<r.length;i++) if(Math.min(...r[i].notes.filter(Boolean).map(m=>m.fret))<Math.min(...r[i-1].notes.filter(Boolean).map(m=>m.fret))) fails.push(`collectN 정렬 ${qq.id} ${n} ${rs}`);
  }
}

// 'any'(붙여서 + 쉘): 폼 수는 둘의 합이고, hasForms도 둘 중 하나라도 있으면 true
{
  for(const q of QUALITIES) for(const t of masks){
    if(!maskFor(q.id,t).length) continue;
    for(const rs of [6,5,4,3,2,1,'all']){
      const a=collect(0,q.id,rs,false,t,'adj').length,k=collect(0,q.id,rs,false,t,'skip').length,any=collect(0,q.id,rs,false,t,'any').length;
      eq(any,a+k,`any 폼 수 ${q.id} ${rs} ${maskFor(q.id,t)}`);
      eq(hasForms(q.id,rs,t,'any'),a+k>0,`hasForms any ${q.id} ${rs} ${maskFor(q.id,t)}`);
    }
  }
}

// 프렛 하한(minFret): 소리 나는 모든 음이 하한 이상인 폼만, 기본 위치와 한 옥타브 위 위치를 모두 후보로
{
  const {hasFormsAt}=L;
  let seed=4242,checked=0;
  const rnd=m=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed%m; };
  const keyOf=r=>`${r.bass}:`+r.notes.map(n=>n?n.fret:'x').join(',');
  for(let trial=0;trial<400;trial++){
    const q=QUALITIES[rnd(QUALITIES.length)],t=masks[rnd(masks.length)];
    if(!maskFor(q.id,t).length) continue;
    const rs=[6,5,4,3,2,1,'all'][rnd(7)],layout=['adj','skip','any'][rnd(3)],root=rnd(12),minFret=[1,2,3,5,8,12][rnd(6)];
    const want=new Set();
    [false,true].forEach(oct=>collect(root,q.id,rs,oct,t,layout).forEach(r=>{
      if(r.notes.every(n=>!n||n.fret>=minFret)) want.add(keyOf(r));
    }));
    const got=collect(root,q.id,rs,false,t,layout,minFret);
    const gotKeys=new Set(got.map(keyOf));
    got.forEach(r=>{ if(r.notes.some(n=>n&&n.fret<minFret)) fails.push(`프렛 하한 ${minFret} 위반 ${keyOf(r)}`); });
    eq([...gotKeys].sort(),[...want].sort(),`프렛 하한 ${minFret} ${q.id} ${rs} ${layout} root=${root} ${maskFor(q.id,t)}`);
    eq(hasFormsAt(root,q.id,rs,t,layout,minFret),want.size>0,`hasFormsAt ${minFret}`);
    checked++;
  }
  // 하한 0은 기존과 같다
  eq(collect(9,'m7',4,false,[true,true,true,true],'any',0).length,collect(9,'m7',4,false,[true,true,true,true],'any').length,'하한 0');
  console.log(`프렛 하한 ${checked}개 검사`);
}

// 음 개수 1~6: 구성음보다 많으면 구성음을 겹쳐서 채운다
{
  const {candidatesN,hasFormsN,hasFormsNAt,isShell}=L;
  let checked=0;
  for(const qq of QUALITIES) for(const n of [1,2,3,4,5,6]) for(const rs of [6,5,4,3,2,1,'all']){
    const root=[0,4,9,2][(qq.tones.length+n)%4];
    const cs=candidatesN(root,qq.id,rs,n,'any');
    if((cs.length>0)!==hasFormsN(qq.id,rs,n,'any')) fails.push(`hasFormsN 불일치 ${qq.id} ${n} ${rs}`);
    if((cs.length>0)!==hasFormsNAt(root,qq.id,rs,n,'any',0)) fails.push(`hasFormsNAt 불일치 ${qq.id} ${n} ${rs}`);
    cs.forEach(r=>{
      const sounded=r.notes.filter(Boolean);
      if(sounded.length!==n) fails.push(`${qq.id} ${n}음인데 ${sounded.length}음`);
      const ivs=new Set(sounded.map(x=>(x.pc-root+12)%12));
      if(n>=qq.tones.length&&!qq.tones.every(iv=>ivs.has(iv))) fails.push(`${qq.id} ${n}음: 구성음 빠짐`);
      if([...ivs].some(iv=>!qq.tones.includes(iv))) fails.push(`${qq.id} ${n}음: 구성음 아닌 음`);
      if(n<=qq.tones.length&&ivs.size!==n) fails.push(`${qq.id} ${n}음: 겹음`);
      // 손가락 4개로 잡을 수 있고(손가락 번호가 1~4), 한 프렛 폭 안
      sounded.forEach(x=>{ if(x.fret>0&&!(x.finger>=1&&x.finger<=4)) fails.push(`${qq.id} ${n}음: 손가락 없음`); });
      if(n===6&&r.bass!==6) fails.push('6음인데 베이스가 6번 줄이 아님');
      if(n===6&&isShell(r)) fails.push('6음인데 쉘');
      checked++;
    });
  }
  // 6음 폼은 베이스 6번 줄만, 5음은 6·5번 줄만
  for(const rs of [5,4,3,2,1]) if(hasFormsN('m7',rs,6,'any')) fails.push(`6음이 베이스 ${rs}번 줄에 있음`);
  if(!hasFormsN('m7',6,6,'any')) fails.push('6음 베이스 6번 줄 폼 없음');
  if(hasFormsN('m7',4,5,'any')) fails.push('5음이 베이스 4번 줄에 있음');
  console.log(`음 개수 1~6 ${checked}개 폼 검사`);
}

// 하이톤(맨 위 음): collectN의 필터가 전수 계산과 같다
{
  const {topIndex,hasTopAt,candidatesN,collectN,voicingFromFrets,fretsOf}=L;
  let seed=4242,checked=0;
  const rnd=m=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed%m; };
  for(let trial=0;trial<150;trial++){
    const q=QUALITIES[rnd(QUALITIES.length)];
    const root=rnd(12),rs=[6,5,4,3,'all'][rnd(5)],n=[2,3,4][rnd(3)],fm=[0,0,3,5][rnd(4)];
    const all=candidatesN(root,q.id,rs,n,'any',fm);
    for(let tp=0;tp<q.tones.length;tp++){
      const want=all.filter(r=>{
        const hi=r.notes.filter(Boolean).sort((a,b)=>a.string-b.string)[0];
        return ((hi.pc-root+12)%12)===q.tones[tp];
      });
      const got=collectN(root,q.id,rs,false,n,'any',fm,tp);
      if(fm>0&&got.length!==want.length) fails.push(`하이톤 필터 ${q.id} ${root} rs${rs} n${n} fm${fm} top${tp}: ${got.length} != ${want.length}`);
      if(got.some(r=>topIndex(r,{root,q:q.id})!==tp)) fails.push(`하이톤이 다른 음 ${q.id} ${root} top${tp}`);
      if(hasTopAt(root,q.id,rs,n,'any',fm,tp)!==(want.length>0)) fails.push(`hasTopAt ${q.id} ${root} top${tp}`);
      checked++;
    }
  }
  console.log(`하이톤 ${checked}개 검사`);
  // 저장한 운지에서 폼을 그대로 되살린다 (진행에 담은 폼)
  let same=0;
  for(const q of QUALITIES) for(const n of [1,2,3,4,5,6]) for(const root of [0,4,9]) for(const x of collectN(root,q.id,'all',false,n,'any',0,null)){
    const v=voicingFromFrets(root,q.id,fretsOf(x),x.baseFret);
    const same1=JSON.stringify(v)===JSON.stringify({...x,canOctave:false,octaveApplied:false});
    if(!same1&&(v.formName!==x.formName||v.bass!==x.bass||v.bassLabel!==x.bassLabel||v.baseFret!==x.baseFret||v.count!==x.count||JSON.stringify(v.notes)!==JSON.stringify(x.notes))) fails.push(`voicingFromFrets ${q.id} ${n} ${root}`);
    same++;
  }
  console.log(`저장 운지 복원 ${same}개 검사`);
}

console.log(`조합 ${combos}개 (폼 없는 조합 ${impossible}개) 검사`);
if(fails.length){ console.log(`실패 ${fails.length}건`); fails.slice(0,20).forEach(f=>console.log(' -',f)); process.exit(1); }
console.log('모든 검사 통과');
