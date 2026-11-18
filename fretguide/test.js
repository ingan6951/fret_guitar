// 폼 생성 로직 검증. index.html의 LOGIC 블록만 꺼내 실행하고, 별도의 전수 탐색(브루트포스)과 결과를 맞춰 본다.
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const logic=html.split('/* LOGIC:START */')[1].split('/* LOGIC:END */')[0];
const L=new Function(logic+';return {QUALITIES,OPEN,DEGREE,MAX_FRET,MAX_SPAN,maskFor,shapesFor,hasForms,resolve,collect,barres,windowStart};')();
const {QUALITIES,OPEN,MAX_FRET,MAX_SPAN,maskFor,shapesFor,hasForms,resolve,collect,barres}=L;

const fails=[];
const eq=(a,b,msg)=>{ if(JSON.stringify(a)!==JSON.stringify(b)) fails.push(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };

// 켤 수 있는 구성음 조합 (1도·3도·5도·7도 중 비어 있지 않은 부분집합)
const masks=[];
for(let m=1;m<16;m++) masks.push([0,1,2,3].map(i=>!!(m&(1<<i))));
const lowFret=res=>Math.min(...res.notes.filter(Boolean).map(n=>n.fret));

let combos=0,impossible=0;
QUALITIES.forEach(q=>{
  masks.forEach(t=>{
    const mask=maskFor(q.id,t);
    if(!mask.length){ eq(hasForms(q.id,4,t),false,`빈 구성음 ${q.id}`); return; } // 트라이어드에서 7도만 켠 경우
    [6,5,4,3,2,1,'all'].forEach(rs=>{
      const strs=rs==='all'?[6,5,4,3,2,1]:[rs];
      for(let root=0;root<12;root++){
        const got=collect(root,q.id,rs,false,t);
        const gotOct=collect(root,q.id,rs,true,t);
        // 1) 모든 폼이 규칙을 지키는지
        [...got,...gotOct].forEach(res=>{
          const sounded=res.notes.filter(Boolean);
          const tag=`${q.id} ${rs} mask=${mask} root=${root}`;
          eq(sounded.length,mask.length,`${tag}: 음 개수`);
          eq(sounded.map(n=>(n.pc-root+12)%12).sort((a,b)=>a-b),mask.map(i=>q.tones[i]).sort((a,b)=>a-b),`${tag}: 켠 구성음을 한 줄에 하나씩`);
          const ss=sounded.map(n=>n.string);
          eq(ss,[...ss].sort((a,b)=>b-a),`${tag}: 줄 순서`);
          if(ss[0]-ss[ss.length-1]!==ss.length-1) fails.push(`${tag}: 줄이 이어지지 않음`);
          if(!strs.includes(res.bass)||res.bass!==ss[0]) fails.push(`${tag}: 베이스 줄이 가장 낮은 줄이 아님`);
          const fr=sounded.map(n=>n.fret);
          if(Math.min(...fr)<0||Math.max(...fr)>MAX_FRET) fails.push(`${tag}: 프렛 범위 ${fr}`);
          if(Math.max(...fr)-Math.min(...fr)>MAX_SPAN) fails.push(`${tag}: 손 폭 ${fr}`);
          sounded.forEach(n=>{ if(!(n.finger>=1&&n.finger<=4)) fails.push(`${tag}: 손가락 ${n.finger}`); });
        });
        // 2) 전수 탐색과 같은 폼 집합인지 (옥타브 위 포함)
        const want=new Set();
        strs.forEach(b=>{
          const n=mask.length;
          if(b-n+1<1) return;
          const pcs=mask.map(i=>(root+q.tones[i])%12);
          const strings=[];for(let k=0;k<n;k++) strings.push(b-k);
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
        const have=new Set();
        [...got,...gotOct].forEach(res=>have.add(`${res.bass}:${res.notes.map(n=>n?n.fret:null).join(',')}`));
        const missing=[...want].filter(x=>!have.has(x)),extra=[...have].filter(x=>!want.has(x));
        if(missing.length||extra.length) fails.push(`${q.id} ${rs} mask=${mask} root=${root}: 전수 탐색과 불일치 (빠짐 ${missing.length}, 초과 ${extra.length}) ${missing[0]||extra[0]}`);
      }
      // 3) hasForms는 근음과 무관하게 실제 결과와 일치
      const any=collect(0,q.id,rs,false,t).length>0;
      eq(hasForms(q.id,rs,t),any,`hasForms ${q.id} ${rs} mask=${mask}`);
      combos++; if(!any) impossible++;
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
}

// 5) 바레 계산이 모든 결과에서 깨지지 않는다
for(const q of QUALITIES){
  for(const t of masks){
    for(const rs of [6,4,1,'all']){
      for(const root of [0,4,9]){
        collect(root,q.id,rs,false,t).forEach(r=>{ barres(r.notes); });
      }
    }
  }
}

console.log(`조합 ${combos}개 (폼 없는 조합 ${impossible}개) 검사`);
if(fails.length){ console.log(`실패 ${fails.length}건`); fails.slice(0,20).forEach(f=>console.log(' -',f)); process.exit(1); }
console.log('모든 검사 통과');
