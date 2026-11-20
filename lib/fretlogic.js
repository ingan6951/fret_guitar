// 폼 생성·손가락 번호·진행 계산 로직. UI와 무관한 순수 함수만 둔다.
export const NOTE_SHARP=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const NOTE_FLAT =['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
// 개방현 음높이 (index 0 = 6번 줄 ... index 5 = 1번 줄)
export const OPEN=[4,9,2,7,11,4];

// 코드 종류. tones는 근음에서의 반음 거리, deg는 같은 순서의 도수 이름 (구성음 칩·도수 표시·폼 이름에 쓴다).
// 구성음은 최대 4개 (구성음 칩 4칸).
export const QUALITIES=[
  {id:'maj',   label:'Major', suffix:'',       tones:[0,4,7],    deg:['R','3','5']},
  {id:'min',   label:'minor', suffix:'m',      tones:[0,3,7],    deg:['R','♭3','5']},
  {id:'dim',   label:'dim',   suffix:'dim',    tones:[0,3,6],    deg:['R','♭3','♭5']},
  {id:'aug',   label:'aug',   suffix:'aug',    tones:[0,4,8],    deg:['R','3','♯5']},
  {id:'sus2',  label:'sus2',  suffix:'sus2',   tones:[0,2,7],    deg:['R','2','5']},
  {id:'sus4',  label:'sus4',  suffix:'sus4',   tones:[0,5,7],    deg:['R','4','5']},
  {id:'6',     label:'6',     suffix:'6',      tones:[0,4,7,9],  deg:['R','3','5','6']},
  {id:'m6',    label:'m6',    suffix:'m6',     tones:[0,3,7,9],  deg:['R','♭3','5','6']},
  {id:'7',     label:'7',     suffix:'7',      tones:[0,4,7,10], deg:['R','3','5','♭7']},
  {id:'maj7',  label:'maj7',  suffix:'maj7',   tones:[0,4,7,11], deg:['R','3','5','7']},
  {id:'m7',    label:'m7',    suffix:'m7',     tones:[0,3,7,10], deg:['R','♭3','5','♭7']},
  {id:'m7b5',  label:'m7♭5',  suffix:'m7♭5',   tones:[0,3,6,10], deg:['R','♭3','♭5','♭7']},
  {id:'dim7',  label:'dim7',  suffix:'dim7',   tones:[0,3,6,9],  deg:['R','♭3','♭5','𝄫7']},
  {id:'7sus4', label:'7sus4', suffix:'7sus4',  tones:[0,5,7,10], deg:['R','4','5','♭7']},
  {id:'mmaj7', label:'mM7',   suffix:'m(maj7)',tones:[0,3,7,11], deg:['R','♭3','5','7']},
  {id:'add9',  label:'add9',  suffix:'add9',   tones:[0,4,7,2],  deg:['R','3','5','9']}
];

// 코드 안에서 근음과의 반음 거리 → 도수 이름 (구성음이 아니면 빈 문자열)
export function degreeOf(quality,interval){
  const i=quality.tones.indexOf(((interval%12)+12)%12);
  return i<0?'':quality.deg[i];
}
export const MAX_FRET=17;
export const MAX_SPAN=3; // 한 프렛에 손가락 하나로 잡을 수 있는 폭

export function permutations(arr){
  if(arr.length<=1) return [arr];
  const out=[];
  arr.forEach((x,i)=>permutations(arr.filter((_,j)=>j!==i)).forEach(p=>out.push([x,...p])));
  return out;
}

// t: [1도, 3도, 5도, 7도]를 켰는지. 코드에 없는 구성음(트라이어드의 7도)은 무시하고, 켠 구성음의 인덱스 목록을 돌려준다.
export function maskFor(qualityId,t){
  const q=QUALITIES.find(x=>x.id===qualityId);
  return q.tones.map((_,i)=>i).filter(i=>t[i]);
}

// 줄 i(0=6번 줄)에서 j까지 한 손가락으로 바레할 수 있는지: 사이의 줄이 모두 같거나 더 높은 프렛을 누르고 있어야 한다
export function canBarre(fr,i,j,at){
  for(let k=Math.min(i,j)+1;k<Math.max(i,j);k++) if(fr[k]===null||fr[k]<at) return false;
  return true;
}

// 자연스러운 손가락 번호. fr[i]는 누르는 프렛(null = 누르지 않음: 치지 않는 줄이나 개방현).
// 모든 폼에 쓰고, 개방현이 섞인 위치는 실제 프렛으로 다시 계산한다.
// 규칙: 높은 프렛일수록 높은 번호, 같은 프렛의 다른 손가락은 굵은 줄이 낮은 번호,
// 같은 손가락 두 줄은 바레가 가능할 때만(치지 않는 줄을 가로지르지 않음).
// 비용: 손 벌림(프렛 차보다 손가락 차가 작음) > 1번 손가락에서 시작하지 않음 > 바레 > 같은 프렛에 손가락 여러 개 > 손가락을 건너뜀.
const fingerCache={};
export function naturalFingers(fr){
  const key=fr.join(',');
  if(key in fingerCache) return fingerCache[key];
  const idx=fr.map((x,i)=>x===null?-1:i).filter(i=>i>=0);
  if(!idx.length) return (fingerCache[key]=[null,null,null,null,null,null]);
  let best=null,bestCost=Infinity;
  const cur=new Array(idx.length);
  const score=()=>{
    let cost=0;
    const barreFingers=new Set();
    for(let a=0;a<idx.length;a++) for(let b=a+1;b<idx.length;b++){
      const ia=idx[a],ib=idx[b],fa=fr[ia],fb=fr[ib],ga=cur[a],gb=cur[b];
      if(fa===fb){
        if(ga===gb){ if(!canBarre(fr,ia,ib,fa)) return Infinity; barreFingers.add(ga); }
        else if(ga>gb) return Infinity; // ia가 더 굵은 줄
        else cost+=0.4; // 같은 프렛을 손가락 여러 개로 누름
        continue;
      }
      const lo=fa<fb?[fa,ga]:[fb,gb],hi=fa<fb?[fb,gb]:[fa,ga];
      const fd=hi[0]-lo[0],gd=hi[1]-lo[1];
      if(gd<=0) return Infinity;
      cost+=gd<fd?3*(fd-gd):0.25*(gd-fd);
    }
    return cost+0.75*barreFingers.size+(Math.min(...cur)-1);
  };
  const rec=k=>{
    if(k===idx.length){ const c=score(); if(c<bestCost){ bestCost=c; best=cur.slice(); } return; }
    for(let g=1;g<=4;g++){ cur[k]=g; rec(k+1); }
  };
  rec(0);
  if(!best) return (fingerCache[key]=false); // 손가락 4개로 잡을 수 없음
  const out=[null,null,null,null,null,null];
  idx.forEach((i,k)=>{ out[i]=best[k]; });
  return (fingerCache[key]=out);
}

// 인접한 줄에 order 순서(낮은 줄 -> 높은 줄)로 구성음을 한 줄에 하나씩 놓은 폼.
// 가장 낮은 줄(베이스)의 음을 기준으로 상대 프렛을 계산하고, 손 폭이 넓으면 null.
export function buildVoicing(quality,strings,order){
  const bassString=strings[0];
  const anchorIdx=6-bassString;
  const anchorTone=quality.tones[order[0]];
  const o=[null,null,null,null,null,null];
  const f=[null,null,null,null,null,null];
  strings.forEach((s,k)=>{
    const i=6-s;
    const raw=quality.tones[order[k]]-anchorTone-OPEN[i]+OPEN[anchorIdx];
    let off=((raw%12)+12)%12;
    if(off>5) off-=12;
    o[i]=off;
  });
  const used=o.filter(x=>x!==null);
  const lo=Math.min(...used),hi=Math.max(...used);
  if(hi-lo>MAX_SPAN) return null;
  const fg=naturalFingers(o);
  if(!fg) return null;
  fg.forEach((x,i)=>{ f[i]=x; });
  return {o,f,bass:bassString,anchorTone,name:order.map(i=>quality.deg[i]).join('–')};
}

// 베이스 줄부터 위로 n개 음을 놓을 줄 목록.
// 'adj': 인접한 n줄. 'skip'(쉘): 음과 음 사이 한 곳에서 한 줄을 건너뛴다 (예: 5·3·2번 줄의 R–7–3). 베이스 바로 위 줄과 4번 줄은 비우지 않는다.
export function stringSets(bassString,n,layout){
  const out=[];
  if(n<1) return out;
  if(layout==='skip'){
    if(n<2||bassString-n<1) return out;
    for(let g=1;g<n;g++){
      // 쉘 제한: 베이스 바로 위 줄을 비우는 폼은 잡기 어렵고, 4번 줄은 엄지로 뮤트할 수 없어 비울 수 없다
      const gap=bassString-g;
      if(g===1||gap===4) continue;
      const strings=[];
      for(let k=0;k<n;k++) strings.push(bassString-k-(k>=g?1:0));
      out.push(strings);
    }
  }else if(bassString-n+1>=1){
    const strings=[];
    for(let k=0;k<n;k++) strings.push(bassString-k);
    out.push(strings);
  }
  return out;
}

// 베이스 줄(가장 낮은 소리가 나는 줄), 코드, 켠 구성음, 줄 배치('adj' 붙여서 / 'skip' 쉘 / 'any' 둘 다) -> 그 구성음을 한 줄에 하나씩 쓰는 모든 폼
const shapeCache={};
// n이 구성음 수보다 크면 켠 구성음을 모두 쓰고 일부를 겹쳐서(옥타브 겹음) 줄 n개를 채운다.
export function ordersFor(mask,n){
  if(n<=mask.length) return permutations(mask);
  const out=[],cur=[];
  const rec=k=>{
    if(k===n){ if(mask.every(m=>cur.includes(m))) out.push(cur.slice()); return; }
    // 남은 줄로 아직 안 쓴 구성음을 다 채울 수 있어야 한다
    const missing=mask.filter(m=>!cur.includes(m)).length;
    if(missing>n-k) return;
    mask.forEach(m=>{ cur[k]=m; rec(k+1); });
    cur.length=k;
  };
  rec(0);
  return out;
}
export function shapesFor(bassString,qualityId,mask,layout='adj',n=mask.length){
  const key=bassString+'|'+qualityId+'|'+mask.join('')+'|'+layout+'|'+n;
  if(shapeCache[key]) return shapeCache[key];
  // 'any': 붙여서와 쉘을 모두 (사용자가 줄 배치를 따로 고르지 않는다)
  if(layout==='any') return (shapeCache[key]=[...shapesFor(bassString,qualityId,mask,'adj',n),...shapesFor(bassString,qualityId,mask,'skip',n)]);
  const quality=QUALITIES.find(x=>x.id===qualityId);
  const list=[];
  stringSets(bassString,n,layout).forEach(strings=>{
    ordersFor(mask,n).forEach(order=>{
      const v=buildVoicing(quality,strings,order);
      if(v) list.push(v);
    });
  });
  return (shapeCache[key]=list);
}

// 이 코드·베이스·구성음·줄 배치 조합으로 잡히는 폼이 하나라도 있는지. 근음에는 영향받지 않는다.
export function hasForms(qualityId,rs,t,layout='adj'){
  const mask=maskFor(qualityId,t);
  const strs=rs==='all'?[6,5,4,3,2,1]:[rs];
  return strs.some(s=>shapesFor(s,qualityId,mask,layout).length>0);
}

// 베이스 음이 놓이는 프렛. 음수 프렛이 생기면 한 옥타브 위로 올리고,
// octave가 켜져 있고 17프렛 안에 들어오면 한 옥타브 더 올린다.
export function baseFretFor(rootPc,shape,octave){
  const used=shape.o.filter(x=>x!==null);
  const lo=Math.min(...used),hi=Math.max(...used);
  let f=((rootPc+shape.anchorTone-OPEN[6-shape.bass])%12+12)%12;
  while(f+lo<0) f+=12;
  const canOctave=f+12+hi<=MAX_FRET;
  return {fret:(octave&&canOctave)?f+12:f,base:f,canOctave};
}

// 근음 음높이(0~11), 코드 종류, 폼 -> 프렛 위치와 각 줄의 운지
export function resolve(rootPc,qualityId,shape,octave){
  const r=baseFretFor(rootPc,shape,octave);
  const f=r.fret;
  // 개방현이 섞이면 이동형 폼 번호 대신 실제 누르는 프렛으로 손가락을 다시 정한다 (개방현은 손가락 없음)
  const hasOpen=shape.o.some(off=>off!==null&&f+off===0);
  const fingers=hasOpen?(naturalFingers(shape.o.map(off=>off===null||f+off===0?null:f+off))||shape.f):shape.f;
  const notes=shape.o.map((off,i)=>off===null?null:{
    string:6-i,
    fret:f+off,
    finger:fingers[i],
    pc:(OPEN[i]+f+off)%12
  });
  const bassNote=notes.find(Boolean);
  return {bass:shape.bass,formName:shape.name,baseFret:f,canOctave:r.canOctave,octaveApplied:f!==r.base,
    count:notes.filter(Boolean).length,
    bassLabel:degreeOf(QUALITIES.find(x=>x.id===qualityId),bassNote.pc-rootPc),notes};
}

// 조건에 맞는 폼 목록. rs가 'all'이면 모든 베이스 줄.
// minFret이 0보다 크면 소리 나는 모든 음이 minFret 이상인 폼만 (개방현은 제외).
// 이때는 기본 위치와 한 옥타브 위 위치를 모두 후보로 두고, octave 인자는 쓰지 않는다.
export function collect(rootPc,qualityId,rs,octave,t,layout='adj',minFret=0,n=null){
  const mask=maskFor(qualityId,t);
  const nn=n===null?mask.length:n;
  const strs=rs==='all'?[6,5,4,3,2,1]:[rs];
  const out=[];
  strs.forEach(s=>shapesFor(s,qualityId,mask,layout,nn).forEach(shape=>{
    if(minFret>0){
      [false,true].forEach(oct=>{
        const res=resolve(rootPc,qualityId,shape,oct);
        if(oct&&!res.octaveApplied) return;
        if(res.notes.some(n=>n&&n.fret<minFret)) return;
        out.push(res);
      });
    }else out.push(resolve(rootPc,qualityId,shape,octave));
  }));
  const low=r=>Math.min(...r.notes.filter(Boolean).map(n=>n.fret));
  out.sort((a,b)=>low(a)-low(b)||b.bass-a.bass);
  return out;
}

// 보여줄 5프렛 창의 시작 프렛
export function windowStart(notes){
  const fretted=notes.filter(n=>n&&n.fret>0).map(n=>n.fret);
  if(!fretted.length) return 1;
  const max=Math.max(...fretted),min=Math.min(...fretted);
  return max<=5?1:min;
}

// 같은 손가락이 같은 프렛에서 두 줄 이상을 누르면 바레로 그린다
export function barres(notes){
  const map={};
  notes.forEach(n=>{
    if(n&&n.fret>0){
      const k=n.finger+'-'+n.fret;
      (map[k]=map[k]||[]).push(n);
    }
  });
  // 사이의 줄이 모두 더 높은 프렛을 누를 때만 이어 그린다 (치지 않는 줄·개방현을 가로지르지 않는다)
  const fr=notes.map(n=>n?n.fret:null);
  const out=[];
  Object.values(map).forEach(g=>{
    const ss=g.map(n=>n.string).sort((a,b)=>a-b);
    let start=0;
    for(let i=1;i<=ss.length;i++){
      if(i===ss.length||!canBarre(fr,6-ss[i-1],6-ss[i],g[0].fret)){
        if(i-start>=2) out.push({fret:g[0].fret,top:ss[start],bottom:ss[i-1]});
        start=i;
      }
    }
  });
  return out;
}
// 손 위치: 누르는 음 중 가장 낮은 프렛 (모두 개방현이면 0)
export function handPos(res){
  const fr=res.notes.filter(n=>n&&n.fret>0).map(n=>n.fret);
  return fr.length?Math.min(...fr):0;
}
// 두 폼 사이 이동 비용: 손 위치 차이(프렛)가 기본이고,
// 같으면 베이스 줄이 덜 바뀌고 손가락(줄마다 프렛 차이)이 덜 움직이는 쪽
export function moveCost(a,b){
  let fingers=0;
  a.notes.forEach((n,i)=>{ const m=b.notes[i]; if(n&&m) fingers+=Math.abs(n.fret-m.fret); else if(n||m) fingers+=1; });
  return Math.abs(handPos(a)-handPos(b))+0.1*Math.abs(a.bass-b.bass)+0.01*fingers;
}

// 한 코드의 후보: 기본 위치 + 한 옥타브 위 (같은 운지는 하나만)
export function candidates(rootPc,qualityId,rs,t,layout,minFret=0,n=null){
  const seen=new Set(),out=[];
  [false,true].forEach(oct=>collect(rootPc,qualityId,rs,oct,t,layout,minFret,n).forEach(r=>{
    const k=r.notes.map(n=>n?n.fret:'x').join(',');
    if(!seen.has(k)){ seen.add(k); out.push(r); }
  }));
  return out;
}


// 음 개수 n으로 고를 수 있는 구성음 조합 (t 배열 목록). 코드의 구성음 수보다 많으면 모든 구성음.
// 예: 7th 코드 3음 → R·3·5 / R·3·7 / R·5·7 / 3·5·7
export function toneSubsets(qualityId,n){
  const len=QUALITIES.find(x=>x.id===qualityId).tones.length;
  const k=Math.min(n,len),out=[];
  for(let m=1;m<16;m++){
    const t=[0,1,2,3].map(i=>i<len&&!!(m&(1<<i)));
    if(t.filter(Boolean).length===k&&!(m>>len)) out.push(t);
  }
  return out;
}


// 코드 하나만 볼 때의 목록: 음 개수 n의 모든 구성음 조합을 모아(같은 운지는 하나만) 낮은 프렛부터 정렬한다.
// tp(하이톤: 구성음 인덱스)가 있으면 그 음이 맨 위인 폼만 남긴다.
export function collectN(rootPc,qualityId,rs,octave,n,layout,minFret=0,tp=null){
  const q=QUALITIES.find(x=>x.id===qualityId);
  const seen=new Set(),out=[];
  toneSubsets(qualityId,n).forEach(t=>collect(rootPc,qualityId,rs,octave,t,layout,minFret,n>q.tones.length?n:null).forEach(r=>{
    const k=r.notes.map(x=>x?x.fret:'x').join(',');
    if(seen.has(k)) return;
    seen.add(k);
    if(tp!==null&&topIndex(r,{root:rootPc,q:qualityId})!==tp) return;
    out.push(r);
  }));
  const low=r=>Math.min(...r.notes.filter(Boolean).map(x=>x.fret));
  out.sort((a,b)=>low(a)-low(b)||b.bass-a.bass);
  return out;
}

// 음 개수 n인 폼 후보: 가능한 구성음 조합의 후보를 모두 모은다 (같은 운지는 하나만)
export function candidatesN(rootPc,qualityId,rs,n,layout,minFret=0){
  const seen=new Set(),out=[];
  const len=QUALITIES.find(x=>x.id===qualityId).tones.length;
  toneSubsets(qualityId,n).forEach(t=>candidates(rootPc,qualityId,rs,t,layout,minFret,n>len?n:null).forEach(r=>{
    const k=r.notes.map(x=>x?x.fret:'x').join(',');
    if(!seen.has(k)){ seen.add(k); out.push(r); }
  }));
  return out;
}

// 음 개수 n으로 잡히는 폼이 하나라도 있는지 (근음과 무관)
export function hasFormsN(qualityId,rs,n,layout){
  const len=QUALITIES.find(x=>x.id===qualityId).tones.length;
  if(n>len){
    const mask=toneSubsets(qualityId,len)[0].map((b,i)=>b?i:-1).filter(i=>i>=0);
    return (rs==='all'?[6,5,4,3,2,1]:[rs]).some(s=>shapesFor(s,qualityId,mask,layout,n).length>0);
  }
  return toneSubsets(qualityId,n).some(t=>hasForms(qualityId,rs,t,layout));
}

// 소리 나는 가장 높은 음(번호가 가장 작은 줄)이 코드의 몇 번째 구성음인지 (q.tones의 인덱스). 구성음이 아니면 -1.
export function topIndex(res,c){
  const q=QUALITIES.find(x=>x.id===(c.q||c));
  const note=res.notes.filter(Boolean).reduce((a,b)=>(!a||b.string<a.string?b:a),null);
  if(!note) return -1;
  return q.tones.indexOf(((note.pc-c.root)%12+12)%12);
}
// 이 코드에서 하이톤(맨 위 음)을 tp(구성음 인덱스)로 둘 수 있는 폼이 있는지
export function hasTopAt(rootPc,qualityId,rs,n,layout,minFret,tp){
  const c={root:rootPc,q:qualityId};
  return candidatesN(rootPc,qualityId,rs,n,layout,minFret).some(r=>topIndex(r,c)===tp);
}

// 쉘 폼인지: 소리 나는 줄 사이에 건너뛴 줄이 있다
export function isShell(res){
  const s=res.notes.map((n,i)=>n?6-i:null).filter(x=>x!==null);
  return s.length>1&&s[0]-s[s.length-1]!==s.length-1;
}

// 프렛 하한(minFret)까지 고려한 "폼이 하나라도 있는지". 하한이 있으면 근음에 따라 달라진다.
export function hasFormsAt(rootPc,qualityId,rs,t,layout,minFret=0){
  if(!minFret) return hasForms(qualityId,rs,t,layout);
  return collect(rootPc,qualityId,rs,false,t,layout,minFret).length>0;
}
export function hasFormsNAt(rootPc,qualityId,rs,n,layout,minFret=0){
  if(!minFret) return hasFormsN(qualityId,rs,n,layout);
  const len=QUALITIES.find(x=>x.id===qualityId).tones.length;
  if(n>len) return toneSubsets(qualityId,len).some(t=>collect(rootPc,qualityId,rs,false,t,layout,minFret,n).length>0);
  return toneSubsets(qualityId,n).some(t=>hasFormsAt(rootPc,qualityId,rs,t,layout,minFret));
}

// 저장해 둔 운지(줄마다 프렛, 치지 않으면 null)에서 폼 정보를 다시 만든다.
// 진행에 담은 폼은 이 운지로 보관하므로, 이후 음 개수·베이스 같은 조건을 바꿔도 그대로 보인다.
export function voicingFromFrets(rootPc,qualityId,frets,baseFret=null){
  const q=QUALITIES.find(x=>x.id===qualityId);
  const fingers=naturalFingers(frets.map(f=>f===null||f===0?null:f))||[null,null,null,null,null,null];
  const notes=frets.map((f,i)=>f===null?null:{string:6-i,fret:f,finger:f===0?null:fingers[i],pc:(OPEN[i]+f)%12});
  const sounded=notes.filter(Boolean);
  const pressed=sounded.filter(n=>n.fret>0).map(n=>n.fret);
  const bass=sounded[0];
  return {
    bass:bass.string,
    formName:sounded.map(n=>degreeOf(q,n.pc-rootPc)).join('–'),
    baseFret:Number.isInteger(baseFret)?baseFret:(pressed.length?Math.min(...pressed):0),
    canOctave:false,octaveApplied:false,
    count:sounded.length,
    bassLabel:degreeOf(q,bass.pc-rootPc),
    notes
  };
}
// 폼에서 운지(줄마다 프렛)만 뽑는다
export const fretsOf=res=>res.notes.map(n=>n?n.fret:null);
