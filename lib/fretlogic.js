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
  if(fingerCache[key]) return fingerCache[key];
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
  naturalFingers(o).forEach((x,i)=>{ f[i]=x; });
  return {o,f,bass:bassString,anchorTone,name:order.map(i=>quality.deg[i]).join('–')};
}

// 베이스 줄부터 위로 n개 음을 놓을 줄 목록.
// 'adj': 인접한 n줄. 'skip'(쉘): 음과 음 사이 한 곳에서 한 줄을 건너뛴다 (예: 6·4·3번 줄의 R–7–3).
export function stringSets(bassString,n,layout){
  const out=[];
  if(n<1) return out;
  if(layout==='skip'){
    if(n<2||bassString-n<1) return out;
    for(let g=1;g<n;g++){
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
export function shapesFor(bassString,qualityId,mask,layout='adj'){
  const key=bassString+'|'+qualityId+'|'+mask.join('')+'|'+layout;
  if(shapeCache[key]) return shapeCache[key];
  // 'any': 붙여서와 쉘을 모두 (사용자가 줄 배치를 따로 고르지 않는다)
  if(layout==='any') return (shapeCache[key]=[...shapesFor(bassString,qualityId,mask,'adj'),...shapesFor(bassString,qualityId,mask,'skip')]);
  const quality=QUALITIES.find(x=>x.id===qualityId);
  const list=[];
  stringSets(bassString,mask.length,layout).forEach(strings=>{
    permutations(mask).forEach(order=>{
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
  const fingers=hasOpen?naturalFingers(shape.o.map(off=>off===null||f+off===0?null:f+off)):shape.f;
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
export function collect(rootPc,qualityId,rs,octave,t,layout='adj',minFret=0){
  const mask=maskFor(qualityId,t);
  const strs=rs==='all'?[6,5,4,3,2,1]:[rs];
  const out=[];
  strs.forEach(s=>shapesFor(s,qualityId,mask,layout).forEach(shape=>{
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

// 진행의 한 코드 후보: 기본 위치 + 한 옥타브 위 (같은 운지는 하나만)
export function candidates(rootPc,qualityId,rs,t,layout,minFret=0){
  const seen=new Set(),out=[];
  [false,true].forEach(oct=>collect(rootPc,qualityId,rs,oct,t,layout,minFret).forEach(r=>{
    const k=r.notes.map(n=>n?n.fret:'x').join(',');
    if(!seen.has(k)){ seen.add(k); out.push(r); }
  }));
  return out;
}

// 진행 전체에서 손 이동 합이 가장 적은 폼을 고른다 (동적 계획법).
// 폼이 없는 코드는 null이고, 그 앞뒤 구간은 따로 이어진다.
export function planProgression(prog,rs,t,layout){
  const cands=prog.map(c=>candidates(c.root,c.q,rs,t,layout));
  const n=prog.length,pick=new Array(n).fill(null);
  let total=0,i=0;
  while(i<n){
    if(!cands[i].length){ i++; continue; }
    let j=i; while(j+1<n&&cands[j+1].length) j++;
    let cost=cands[i].map(()=>0);
    const back=[];
    for(let k=i+1;k<=j;k++){
      const nc=[],bk=[];
      cands[k].forEach(b=>{
        let best=Infinity,arg=-1;
        cands[k-1].forEach((a,ai)=>{ const c=cost[ai]+moveCost(a,b); if(c<best-1e-9){ best=c; arg=ai; } });
        nc.push(best); bk.push(arg);
      });
      cost=nc; back[k]=bk;
    }
    let bi=0; cost.forEach((c,ci)=>{ if(c<cost[bi]-1e-9) bi=ci; });
    total+=cost[bi];
    for(let k=j;k>=i;k--){ pick[k]=cands[k][bi]; if(k>i) bi=back[k][bi]; }
    i=j+1;
  }
  return {pick,total};
}

// ── 진행의 보이싱 전체를 손 이동이 적은 순으로 차례로 꺼내기 ──

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

// 음 개수 n인 폼 후보: 가능한 구성음 조합의 후보를 모두 모은다 (같은 운지는 하나만)
export function candidatesN(rootPc,qualityId,rs,n,layout,minFret=0){
  const seen=new Set(),out=[];
  toneSubsets(qualityId,n).forEach(t=>candidates(rootPc,qualityId,rs,t,layout,minFret).forEach(r=>{
    const k=r.notes.map(x=>x?x.fret:'x').join(',');
    if(!seen.has(k)){ seen.add(k); out.push(r); }
  }));
  return out;
}

// 음 개수 n으로 잡히는 폼이 하나라도 있는지 (근음과 무관)
export function hasFormsN(qualityId,rs,n,layout){
  return toneSubsets(qualityId,n).some(t=>hasForms(qualityId,rs,t,layout));
}

// 진행의 코드마다 후보 폼 목록 (음 개수 n). 폼이 없는 코드는 [null] (그 자리는 비워 두고 앞뒤를 잇는다)
export function progressionCandidates(prog,rs,n,layout,minFret=0){
  return prog.map(c=>{ const cs=candidatesN(c.root,c.q,rs,n,layout,minFret); return cs.length?cs:[null]; });
}

// 가능한 보이싱 가짓수: 폼이 있는 코드들의 후보 수를 곱한 값 (폼이 있는 코드가 없으면 0)
export function countVoicings(cands){
  const real=cands.filter(c=>c[0]!==null);
  return real.length?real.reduce((n,c)=>n*c.length,1):0;
}

function edgeCost(a,b){ return a&&b?moveCost(a,b):0; }

// 비용이 작은 순으로 보이싱을 꺼내는 목록. get(k)는 k번째(0부터) 보이싱 {pick,total} 또는 null.
// 끝까지 남은 최소 비용(동적 계획법)을 기준으로 한 최선 우선 탐색이라, 꺼내는 순서가 정확히 비용 순이다.
export function rankVoicings(cands){
  const n=cands.length;
  const h=new Array(n);
  h[n-1]=cands[n-1].map(()=>0);
  for(let k=n-2;k>=0;k--) h[k]=cands[k].map(a=>Math.min(...cands[k+1].map((b,j)=>edgeCost(a,b)+h[k+1][j])));
  // 최소 힙 (같은 비용이면 먼저 넣은 것부터)
  const heap=[];let seq=0;
  const less=(x,y)=>x.f<y.f-1e-9||(Math.abs(x.f-y.f)<=1e-9&&x.s<y.s);
  const push=x=>{ x.s=seq++; heap.push(x); let i=heap.length-1; while(i>0){ const p=(i-1)>>1; if(!less(heap[i],heap[p])) break; [heap[i],heap[p]]=[heap[p],heap[i]]; i=p; } };
  const pop=()=>{ const top=heap[0],last=heap.pop(); if(heap.length){ heap[0]=last; let i=0; for(;;){ const l=2*i+1,r=l+1; let m=i; if(l<heap.length&&less(heap[l],heap[m])) m=l; if(r<heap.length&&less(heap[r],heap[m])) m=r; if(m===i) break; [heap[i],heap[m]]=[heap[m],heap[i]]; i=m; } } return top; };
  cands[0].forEach((_,i)=>push({g:0,f:h[0][i],path:[i]}));
  const found=[];
  const next=()=>{
    while(heap.length){
      const x=pop(),k=x.path.length-1;
      if(k===n-1) return {pick:x.path.map((i,j)=>cands[j][i]),total:x.g};
      const a=cands[k][x.path[k]];
      cands[k+1].forEach((b,j)=>{ const g=x.g+edgeCost(a,b); push({g,f:g+h[k+1][j],path:[...x.path,j]}); });
    }
    return null;
  };
  return {
    get(k){ while(found.length<=k){ const v=next(); if(!v) return null; found.push(v); } return found[k]; }
  };
}

// 쉘 폼인지: 소리 나는 줄 사이에 건너뛴 줄이 있다
export function isShell(res){
  const s=res.notes.map((n,i)=>n?6-i:null).filter(x=>x!==null);
  return s.length>1&&s[0]-s[s.length-1]!==s.length-1;
}

// 진행의 줄 배치를 자동으로 정한다: 붙여서만 쓰되, 쉘을 섞어야 폼이 생기거나 총 손 이동이 줄어들면 둘 다 쓴다.
// 돌려주는 값은 'adj'(붙여서만) 또는 'any'(붙여서 + 쉘).
export function autoLayout(prog,rs,n,minFret=0){
  const adj=progressionCandidates(prog,rs,n,'adj',minFret);
  const any=progressionCandidates(prog,rs,n,'any',minFret);
  const missing=c=>c.filter(x=>x[0]===null).length;
  if(missing(any)<missing(adj)) return 'any';
  const best=c=>{ const r=rankVoicings(c).get(0); return r?r.total:Infinity; };
  return best(any)<best(adj)-1e-9?'any':'adj';
}

// 프렛 하한(minFret)까지 고려한 "폼이 하나라도 있는지". 하한이 있으면 근음에 따라 달라진다.
export function hasFormsAt(rootPc,qualityId,rs,t,layout,minFret=0){
  if(!minFret) return hasForms(qualityId,rs,t,layout);
  return collect(rootPc,qualityId,rs,false,t,layout,minFret).length>0;
}
export function hasFormsNAt(rootPc,qualityId,rs,n,layout,minFret=0){
  if(!minFret) return hasFormsN(qualityId,rs,n,layout);
  return toneSubsets(qualityId,n).some(t=>hasFormsAt(rootPc,qualityId,rs,t,layout,minFret));
}
