// index.html 안의 LOGIC 블록만 꺼내서 모든 조합의 구성음과 운지 범위를 검증한다.
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const m=html.match(/\/\* LOGIC:START \*\/([\s\S]*?)\/\* LOGIC:END \*\//);
if(!m){ console.error('LOGIC 블록을 찾지 못했습니다'); process.exit(1); }
const L=new Function(m[1]+'; return {NOTE_SHARP,OPEN,QUALITIES,FORMS,VOICINGS,MAX_FRET,resolve,windowStart,barres,collect,inFretRange,availableWindows,WINDOW,hasForms};')();

let checked=0,maxFret=0;
const fails=[];
const fretsOf=r=>r.notes.map(n=>n===null?null:n.fret);

for(const q of L.QUALITIES){
  const want=new Set(q.tones);
  for(const rs of [6,5,4,3,2,1]){
    const variants=L.VOICINGS[rs][q.id];
    if(!variants.length) fails.push(`${q.id} rs${rs}: 폼이 하나도 없음`);
    for(let root=0;root<12;root++){
      for(const octave of [false,true]){
        variants.forEach((v,idx)=>{
          const r=L.resolve(root,q.id,rs,octave,idx);
          const tag=`${L.NOTE_SHARP[root]} ${q.id} rs${rs} #${idx}(${r.formName}) oct${octave}`;
          const sounding=r.notes.filter(Boolean);
          const have=new Set(sounding.map(n=>(n.pc-root+12)%12));
          // 1) 구성음이 정확히 일치 (빠진 음도, 남는 음도 없음)
          if(have.size!==want.size||[...want].some(t=>!have.has(t))) fails.push(`${tag}: 구성음 ${[...have]} != ${[...want]}`);
          // 2) 근음 줄에 실제로 근음이 있다
          const rn=r.notes[6-rs];
          if(!rn||rn.pc!==root) fails.push(`${tag}: 근음 줄에 근음이 없음`);
          // 3) 소리 나는 줄이 끊김 없이 이어져 있다 (중간 줄 뮤트 없음)
          const idxs=r.notes.map((n,i)=>n?i:-1).filter(i=>i>=0);
          if(idxs[idxs.length-1]-idxs[0]+1!==idxs.length) fails.push(`${tag}: 소리 나는 줄이 끊김`);
          // 4) 프렛 범위와 손가락 수
          const frets=sounding.map(n=>n.fret);
          const lo=Math.min(...frets),hi=Math.max(...frets);
          maxFret=Math.max(maxFret,hi);
          if(lo<0||hi>L.MAX_FRET) fails.push(`${tag}: 프렛 범위 ${lo}~${hi}`);
          const fingers=sounding.map(n=>n.finger);
          if(Math.min(...fingers)<1||Math.max(...fingers)>4) fails.push(`${tag}: 손가락 번호 ${fingers}`);
          // 5) 5프렛 창 안에 들어온다
          const st=L.windowStart(r.notes);
          const fretted=frets.filter(x=>x>0);
          if(fretted.length&&(Math.min(...fretted)<st||Math.max(...fretted)>st+4)) fails.push(`${tag}: 5프렛 창을 벗어남`);
          // 6) 같은 코드 안에서 같은 폼이 중복되지 않는다
          if(!octave&&variants.findIndex(x=>JSON.stringify(x.o)===JSON.stringify(v.o))!==idx) fails.push(`${tag}: 중복 폼`);
          checked++;
        });
      }
    }
  }
}

// 알려진 값을 직접 확인
const eq=(a,b,msg)=>{ if(JSON.stringify(a)!==JSON.stringify(b)) fails.push(`${msg}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };
const has=(root,q,rs,frets,msg)=>{
  const all=L.VOICINGS[rs][q].map((v,i)=>JSON.stringify(fretsOf(L.resolve(root,q,rs,false,i))));
  if(!all.includes(JSON.stringify(frets))) fails.push(`${msg}: ${JSON.stringify(frets)} 없음, 후보 ${all.join(' | ')}`);
};
const C=0,E=4,G=7,A=9;
eq(fretsOf(L.resolve(A,'m7',5,false,0)),[null,0,2,0,1,0],'Am7 5번 줄 A폼');
eq(fretsOf(L.resolve(C,'maj',6,false,0)),[8,10,10,9,8,8],'C 6번 줄 E폼');
eq(fretsOf(L.resolve(C,'maj',5,false,0)),[null,3,5,5,5,3],'C 5번 줄 A폼');
eq(fretsOf(L.resolve(C,'maj',4,false,0)),[null,null,10,12,13,12],'C 4번 줄 D폼');
eq(fretsOf(L.resolve(G,'7',6,false,0)),[3,5,3,4,3,3],'G7 6번 줄 E폼');
eq(fretsOf(L.resolve(E,'min',6,true,0)),[12,14,14,12,12,12],'Em 12프렛');
eq(L.barres(L.resolve(C,'maj',6,false,0).notes),[{fret:8,top:1,bottom:6}],'C E폼 바레');
// 상단 트라이어드: 기본형 / 2전위 / 1전위
has(C,'maj',3,[null,null,null,5,5,3],'C 트라이어드 3-2-1 기본형');
has(C,'maj',2,[null,null,null,0,1,0],'C 트라이어드 3-2-1 2전위');
has(C,'maj',1,[null,null,null,9,8,8],'C 트라이어드 3-2-1 1전위');
has(C,'min',2,[null,null,null,12,13,11],'Cm 트라이어드 2전위 (음수 프렛이라 한 옥타브 위)');
// 상단 드롭2 Cmaj7: 4-3-2-1 세트의 네 가지 전위 (모두 잘 알려진 모양)
has(C,'maj7',4,[null,null,10,12,12,12],'Cmaj7 기본형');
has(C,'maj7',2,[null,null,2,4,1,3],'Cmaj7 1전위 (3도 베이스)');
has(C,'maj7',3,[null,null,5,5,5,7],'Cmaj7 2전위 (5도 베이스)');
has(C,'maj7',1,[null,null,9,9,8,8],'Cmaj7 3전위 (7도 베이스)');
// 베이스 도수 표시
eq(L.resolve(C,'maj7',2,false,L.VOICINGS[2].maj7.findIndex(v=>v.name==='4–1번 줄 · 1전위')).bassLabel,'3','Cmaj7 1전위 베이스');

// 프렛 범위 필터: collect 결과가 "모든 폼 x 두 위치"를 직접 훑은 결과와 정확히 같아야 한다
let filterChecks=0,emptyCases=0;
const windows=[[0,17],[0,4],[3,7],[5,9],[8,12],[12,16],[7,7],[0,0]];
for(const q of L.QUALITIES){
  for(let root=0;root<12;root++){
    for(const [a,b] of windows){
      for(const rs of ['all',6,5,4,3,2,1]){
        const got=L.collect(root,q.id,rs,a,b,false);
        const filtered=!(a===0&&b===L.MAX_FRET);
        const strs=rs==='all'?[6,5,4,3,2,1]:[rs];
        const want=new Set();
        strs.forEach(s=>L.VOICINGS[s][q.id].forEach((v,idx)=>{
          (filtered?[false,true]:[false]).forEach(oct=>{
            const r=L.resolve(root,q.id,s,oct,idx);
            if(filtered&&oct&&!r.octaveApplied) return;
            const ok=r.notes.every(n=>n===null||(n.fret>=a&&n.fret<=b));
            if(ok) want.add(`${s}-${idx}-${r.rootFret}`);
          });
        }));
        const have=new Set(got.map(r=>`${r.rootString}-${L.VOICINGS[r.rootString][q.id].findIndex(v=>v.name===r.formName)}-${r.rootFret}`));
        if(have.size!==want.size||[...want].some(k=>!have.has(k))||got.length!==want.size) fails.push(`필터 ${L.NOTE_SHARP[root]} ${q.id} rs${rs} ${a}-${b}: ${got.length}개, 기대 ${want.size}개`);
        got.forEach(r=>{ if(!r.notes.every(n=>n===null||(n.fret>=a&&n.fret<=b))) fails.push(`필터 ${a}-${b}: 범위 밖 프렛 포함`); });
        if(!got.length) emptyCases++;
        filterChecks++;
      }
    }
  }
}
// 범위가 없으면 전체 폼 수와 같다
for(const q of L.QUALITIES){
  const total=[6,5,4,3,2,1].reduce((s,rs)=>s+L.VOICINGS[rs][q.id].length,0);
  eq(L.collect(9,q.id,'all',0,L.MAX_FRET,false).length,total,`${q.id} 전체 폼 수`);
}
// 개방현이 든 폼은 시작이 0일 때만 나온다: Am7 개방 A폼
eq(L.collect(9,'m7',5,0,4,false).some(r=>r.notes.some(n=>n&&n.fret===0)),true,'0~4에서 개방 폼 포함');
eq(L.collect(9,'m7',5,1,5,false).some(r=>r.notes.some(n=>n&&n.fret===0)),false,'1~5에서는 개방현 폼 제외');
// 5~9 필터에서는 같은 폼이 한 옥타브 위 위치로 다시 나오지 않는다 (범위 밖이므로)
eq(L.collect(9,'m7','all',5,9,false).every(r=>r.rootFret>=5-3&&r.rootFret<=9+3),true,'5~9 근음 프렛 범위');

// 음 개수 필터: 인접한 줄의 프렛을 직접 훑어 찾은 결과와 같아야 한다
// (근음 포함, 도수 중복 없음, 구성음만, 4프렛 이내)
let countChecks=0;
const ranges=[[0,4],[3,7],[5,9],[8,12],[12,16],[2,14]];
const minByN={};
for(const q of L.QUALITIES){
  const T=q.tones.length;
  for(let n=1;n<=T;n++){
    for(let root=0;root<12;root++){
      for(const [a,b] of ranges){
        if(n===4&&b-a>10) continue; // 속도: 넓은 범위의 4음은 건너뜀
        const want=new Set();
        for(let top=6;top-n+1>=1;top--){
          const idxs=[];
          for(let k=0;k<n;k++) idxs.push(6-(top-k)); // 배열 인덱스 (0=6번 줄)
          const rec=(k,frets)=>{
            if(k===n){
              const degs=frets.map((fr,j)=>(((L.OPEN[idxs[j]]+fr)%12)-root+12)%12);
              if(new Set(degs).size!==n||!degs.includes(0)||!degs.every(d=>q.tones.includes(d))) return;
              if(Math.max(...frets)-Math.min(...frets)>3) return;
              const arr=[null,null,null,null,null,null];
              frets.forEach((fr,j)=>{ arr[idxs[j]]=fr; });
              want.add(JSON.stringify(arr));
              return;
            }
            for(let fr=a;fr<=b;fr++) rec(k+1,[...frets,fr]);
          };
          rec(0,[]);
        }
        const res=L.collect(root,q.id,'all',a,b,false,n);
        const got=new Set(res.map(r=>JSON.stringify(fretsOf(r))));
        if(got.size!==res.length) fails.push(`음개수 ${n} ${L.NOTE_SHARP[root]} ${q.id} ${a}-${b}: 중복 폼`);
        if(got.size!==want.size||[...want].some(k=>!got.has(k))) fails.push(`음개수 ${n} ${L.NOTE_SHARP[root]} ${q.id} ${a}-${b}: ${got.size}개, 기대 ${want.size}개`);
        res.forEach(r=>{ if(r.count!==n) fails.push(`음개수 ${n}: 카드 음 수 ${r.count}`); });
        // 5프렛 창 폭에서 몇 개나 나오는지 (최소값 기록)
        if(b-a===4){ const key=`${n}음`; minByN[key]=Math.min(minByN[key]??1e9,res.length); }
        countChecks++;
      }
    }
  }
}
// 사용자 예시: 12프렛 근처에서 E 코드를 2음으로 -> 1번 줄 12프렛, 2번 줄 12프렛
for(const qid of ['maj','min']){
  const r=L.collect(E,qid,'all',12,16,false,2);
  if(!r.some(x=>JSON.stringify(fretsOf(x))===JSON.stringify([null,null,null,null,12,12]))) fails.push(`E ${qid} 2음 12프렛: [2번 줄 12, 1번 줄 12] 없음`);
}
// 2음과 3음은 어떤 근음이든 5프렛 창에서 비지 않는다
for(const key of ['1음','2음','3음']) if(!(minByN[key]>=1)) fails.push(`${key}: 5프렛 창에서 빈 결과가 있음 (최소 ${minByN[key]})`);

// 가능한 프렛 범위: 폼이 하나라도 있으면 범위 목록도 비지 않고, 모든 폼이 목록의 어떤 범위에는 들어가며,
// 목록에 나온 범위를 고르면 항상 폼이 있고, 나오지 않은 범위에는 폼이 없다
let winChecks=0,emptyLists=0;
for(const q of L.QUALITIES){
  for(let root=0;root<12;root++){
    for(const rs of ['all',6,5,4,3,2,1]){
      for(const n of ['basic',2,3,4,5,6]){
        const all=L.collect(root,q.id,rs,0,L.MAX_FRET,false,n);
        const avail=L.availableWindows(root,q.id,rs,n);
        const tag=`범위목록 ${L.NOTE_SHARP[root]} ${q.id} rs${rs} n${n}`;
        if(all.length>0&&avail.length===0) fails.push(`${tag}: 폼은 ${all.length}개인데 가능한 범위가 없음`);
        if(all.length===0&&avail.length>0) fails.push(`${tag}: 폼이 없는데 가능한 범위가 있음`);
        if(all.length===0) emptyLists++;
        const have=new Map(avail.map(w=>[w.start,w.count]));
        for(let k=0;k+L.WINDOW<=L.MAX_FRET;k++){
          const c=L.collect(root,q.id,rs,k,k+L.WINDOW,false,n).length;
          if((c>0)!==have.has(k)||(c>0&&have.get(k)!==c)) fails.push(`${tag} 범위 ${k}: 목록과 실제 폼 수가 다름`);
        }
        // 기본 위치의 모든 폼은 목록의 범위 중 하나에 완전히 들어간다
        all.forEach(r=>{
          const fr=r.notes.filter(Boolean).map(x=>x.fret);
          const lo=Math.min(...fr),hi=Math.max(...fr);
          if(![...have.keys()].some(k=>k<=lo&&hi<=k+L.WINDOW)) fails.push(`${tag}: ${lo}~${hi} 폼이 어떤 범위에도 안 들어감`);
        });
        winChecks++;
      }
    }
  }
}
// 사용자 예시: E, 2음 -> 12프렛이 걸치는 범위가 목록에 나온다
const eWins=L.availableWindows(E,'maj','all',2).map(w=>w.start);
if(!eWins.some(k=>k<=12&&12<=k+L.WINDOW)) fails.push('E 2음: 12프렛을 포함하는 범위가 목록에 없음');
// 풀 코드 폼(6음)만 보면 범위가 적게 나온다는 점을 확인용으로 출력
const sixWins=L.availableWindows(L.NOTE_SHARP.indexOf('A'),'m7',6,6).map(w=>w.start);
console.log(`가능한 프렛 범위 ${winChecks}개 조건 검사 (폼 자체가 없는 조건 ${emptyLists}개). 예: Am7 6번 줄 6음 범위 시작 프렛 ${JSON.stringify(sixWins)}`);

// 버튼 비활성화 기준(hasForms): 모든 근음에서 실제 폼 유무와 같아야 하고, 근음에 따라 달라지면 안 된다
let formChecks=0,impossible=0;
for(const q of L.QUALITIES){
  for(const rs of ['all',6,5,4,3,2,1]){
    for(const n of ['basic',1,2,3,4,5,6]){
      const want=L.hasForms(q.id,rs,n);
      for(let root=0;root<12;root++){
        const got=L.collect(root,q.id,rs,0,L.MAX_FRET,false,n).length>0;
        if(got!==want) fails.push(`hasForms ${q.id} rs${rs} n${n} root${root}: hasForms=${want}, 실제=${got}`);
      }
      if(!want) impossible++;
      formChecks++;
    }
  }
}
if(L.hasForms('7',5,6)!==false) fails.push('사용자 예시: 코드 7, 베이스 5, 6음은 불가능해야 함');
if(L.hasForms('7',6,6)!==true) fails.push('코드 7, 베이스 6, 6음은 가능해야 함');
console.log(`조합 가능 여부 ${formChecks}개 검사 (불가능한 조합 ${impossible}개)`);

console.log(`음 개수 ${countChecks}개 검사, 5프렛 창 최소 폼 수`,JSON.stringify(minByN));
console.log(`필터 ${filterChecks}개 검사 (빈 결과 ${emptyCases}개)`);
console.log(`조합 ${checked}개 검사, 최고 프렛 ${maxFret}, 실패 ${fails.length}개`);
console.log('근음 줄별 폼 개수 (코드 종류 maj/min/7/maj7/m7)');
for(const rs of [6,5,4,3,2,1]) console.log(` ${rs}번 줄:`,L.QUALITIES.map(q=>L.VOICINGS[rs][q.id].length).join(' / '));
if(fails.length){ fails.slice(0,30).forEach(f=>console.log(' -',f)); process.exit(1); }
