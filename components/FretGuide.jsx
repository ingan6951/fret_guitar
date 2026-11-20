'use client';
// 기타 가이드 화면 전체. 상태는 하나의 객체로 두고 브라우저에 저장한다.
import {useEffect,useMemo,useState} from 'react';
import {NOTE_SHARP,NOTE_FLAT,QUALITIES,maskFor,hasForms,collect,handPos,progressionCandidates,countVoicings,rankVoicings,hasFormsN,isShell,autoLayout} from '../lib/fretlogic.js';
import {DEFAULT,MAX_PROG,loadState,saveState} from '../lib/settings.js';
import Diagram,{ariaFor} from './Diagram.jsx';

const RS=[['1','1'],['2','2'],['3','3'],['4','4'],['5','5'],['6','6'],['all','전체']];
const LABELS=[['finger','손가락'],['note','음이름'],['degree','도수']];
// 자주 쓰는 구성음 조합. 도수 이름으로 고르므로 코드 종류가 바뀌어도 같은 뜻을 유지한다. min은 필요한 최소 구성음 수.
const PRESETS=[
  {id:'all',label:'전부',pick:()=>true},
  {id:'guide',label:'3·7',pick:d=>/^♭?3$/.test(d)||/7$/.test(d),min:2},
  {id:'rootless',label:'근음 빼기',pick:d=>d!=='R'},
  {id:'r5',label:'근음+5',pick:d=>d==='R'||d==='5',min:2}
];
const presetT=(p,q)=>[0,1,2,3].map(i=>i<q.deg.length&&p.pick(q.deg[i]));
const degName=d=>d==='R'?'1':d;
const NOTE_COUNTS=[[2,'2음','구성음 2개'],[3,'3음','구성음 3개'],[4,'4음','모든 구성음']];

function Chip({k,v,on,disabled,onPick,children,className='chip',...rest}){
  return (
    <button className={className} type="button" data-k={k} data-v={v} aria-pressed={on===undefined?undefined:String(on)}
      disabled={disabled} onClick={()=>onPick(k,v)} {...rest}>{children}</button>
  );
}

export default function FretGuide(){
  const [state,setState]=useState(DEFAULT);
  const [ready,setReady]=useState(false);
  const [vi,setVi]=useState(0); // 진행 결과에서 보고 있는 보이싱 순번 (0부터)
  const [advOpen,setAdvOpen]=useState(false); // 상세 조건 펼침 (넓은 화면에서는 처음부터 펼친다)

  useEffect(()=>{ const s=loadState(); if(s) setState(s); setReady(true); },[]);
  useEffect(()=>{ if(ready) saveState(state); },[state,ready]);
  useEffect(()=>{ if(typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(min-width:920px)').matches) setAdvOpen(true); },[]);

  const pick=(k,v)=>setState(s=>{
    switch(k){
      case 'root': return {...s,root:Number(v)};
      case 'q': return {...s,q:v};
      case 'rs': return {...s,rs:v==='all'?'all':Number(v)};
      case 'label': return {...s,label:v};
      case 'mode': return {...s,mode:v};
      case 'preset': { const p=PRESETS.find(x=>x.id===v); const qq=QUALITIES.find(x=>x.id===s.q); return p?{...s,t:presetT(p,qq)}:s; }
      case 'acc': return {...s,flat:v==='flat'};
      case 'oct': return {...s,octave:!s.octave};
      case 't': { const t=s.t.slice(); t[Number(v)]=!t[Number(v)]; return {...s,t}; }
      case 'padd': return s.prog.length<MAX_PROG?{...s,prog:[...s.prog,{root:s.root,q:s.q}],progDone:false}:s;
      case 'pdel': return {...s,prog:s.prog.filter((_,j)=>j!==Number(v)),progDone:false};
      case 'pclear': return {...s,prog:[],progDone:false};
      case 'pfind': return s.prog.length?{...s,progDone:true}:s;
      case 'pedit': return {...s,progDone:false};
      case 'pn': return {...s,progN:Number(v)};
      default: return s;
    }
  });

  const {root,q:qid,rs,t,label,flat,octave,mode,prog,progDone,progN}=state;
  const nm=flat?NOTE_FLAT:NOTE_SHARP;
  const q=QUALITIES.find(x=>x.id===qid);
  const sym=nm[root]+q.suffix;
  const chordName=c=>nm[c.root]+QUALITIES.find(x=>x.id===c.q).suffix;
  const isProg=mode==='prog';

  const list=useMemo(()=>isProg?[]:collect(root,qid,rs,octave,t,'any'),[isProg,root,qid,rs,octave,t]);
  // 진행을 다 고른 뒤: 가능한 보이싱 가짓수와, 손 이동이 적은 순으로 꺼내는 목록
  const showResult=isProg&&progDone&&prog.length>0;
  const rank=useMemo(()=>{
    if(!showResult) return null;
    // 줄 배치는 진행에 맞게 자동으로 정한다 (붙여서 우선, 쉘을 섞어야 이동이 줄 때만 쉘 포함)
    const lay=autoLayout(prog,rs,progN);
    const c=progressionCandidates(prog,rs,progN,lay);
    return {n:countVoicings(c),list:rankVoicings(c),lay};
  },[showResult,prog,rs,progN]);
  useEffect(()=>{ setVi(0); },[rank]);
  const cur=rank&&rank.n?rank.list.get(Math.min(vi,rank.n-1)):null;
  const fmt=n=>n.toLocaleString('ko-KR');
  const needOct=!isProg&&list.some(r=>r.canOctave);

  // 지금 고른 다른 값과 합쳤을 때 폼이 하나도 없는 선택지는 비활성화한다 (고른 버튼은 그대로 둔다)
  // 진행 보기에서는 구성음 대신 음 개수(progN)로 판단한다
  const has=(id,r)=>isProg?hasFormsN(id,r,progN,'any'):hasForms(id,r,t,'any');
  const qOff=id=>id!==qid&&!has(id,rs);
  const rsOff=v=>v!==String(rs)&&!has(qid,v==='all'?'all':Number(v));
  const pnOff=n=>n!==progN&&!hasFormsN(qid,rs,n,'any');
  // 구성음 칩: 켜면 폼이 하나도 없어지거나, 마지막 하나를 끄게 되는 칩은 비활성화한다
  const tOff=i=>{ if(i>=q.tones.length) return true; const next=t.slice(); next[i]=!next[i]; return !hasForms(qid,rs,next,'any'); };

  const presetOff=p=>{
    const pt=presetT(p,q);
    if(pt.filter(Boolean).length<(p.min||1)) return true;
    const same=JSON.stringify(maskFor(qid,t))===JSON.stringify(maskFor(qid,pt));
    return !same&&!hasForms(qid,rs,pt,'any');
  };
  const presetOn=p=>JSON.stringify(maskFor(qid,t))===JSON.stringify(maskFor(qid,presetT(p,q)));
  // 접어 둔 상세 조건에 현재 값을 한 줄로 보여 준다
  const advSummary=(isProg?`${progN}음`:`구성음 ${maskFor(qid,t).map(i=>degName(q.deg[i])).join('·')}`)
    +` · 베이스 ${rs==='all'?'전체':rs+'번 줄'}`;

  let cards,count,solo=false;
  if(!isProg){
    solo=list.length===1;
    cards=list.length?list.map((res,i)=>(
      <figure className="card" key={i+res.notes.map(n=>n?n.fret:'x').join(',')}>
        <figcaption>
          <div className="who"><b>{res.bass}번 줄</b><span className="deg">{res.bassLabel==='R'?'근음':res.bassLabel} 베이스{isShell(res)?' · 쉘':''}</span></div>
          <div className="pos">{res.baseFret===0?'개방':res.baseFret+'프렛'}</div>
        </figcaption>
        <Diagram res={res} rootPc={root} quality={q} label={label} names={nm} aria={ariaFor(res,sym)}/>
        {res.count>1&&<p className="hint order">낮은 줄부터 {res.formName}{isShell(res)?' · 건너뛴 줄은 옆 손가락으로 살짝 닿아 소리를 막아 주세요':''}</p>}
      </figure>
    )):<div className="empty"><p>이 조건으로 잡히는 폼이 없어요.</p><p>구성음이나 베이스를 바꿔 보세요.</p></div>;
    count=`폼 ${list.length}개 · ${maskFor(qid,t).length}음`;
  }else if(!showResult){
    cards=<div className="empty">{prog.length
      ?<><p>진행을 다 골랐으면 &quot;보이싱 찾기&quot;를 누르세요.</p><p>&quot;상세 조건&quot;의 음 개수에 맞는 보이싱 가짓수와, 손 이동이 적은 순서대로 보여줘요.</p></>
      :<><p>코드를 고르고 &quot;+ 추가&quot;를 눌러 진행을 먼저 만드세요.</p><p>다 고른 뒤 &quot;보이싱 찾기&quot;를 누르면 결과가 나와요.</p></>}</div>;
    count=`코드 ${prog.length}개 / 최대 ${MAX_PROG}개 · ${progN}음`;
  }else if(!cur){
    cards=<div className="empty"><p>지금 음 개수·베이스·줄 배치로는 이 진행의 폼이 하나도 없어요.</p><p>설정을 바꾸거나 진행을 수정해 보세요.</p></div>;
    count='가능한 보이싱 0가지';
  }else{
    let moved=0,prev=null;
    cards=prog.map((c,i)=>{
      const res=cur.pick[i],name=chordName(c);
      if(!res){ prev=null; return <div className="empty" key={i}><p>{i+1}. {name}: 지금 음 개수·베이스·줄 배치로는 잡히는 폼이 없어요.</p></div>; }
      const d=prev?Math.abs(handPos(res)-handPos(prev)):null;
      if(d!==null) moved+=d;
      prev=res;
      const hp=handPos(res);
      return (
        <figure className="card" key={i}>
          <figcaption>
            <div className="who"><b>{i+1}. {name}</b><span>{res.bass}번 줄 베이스{isShell(res)?' · 쉘':''}{d===null?null:<> · <span className="move">{d===0?'제자리':`${d}프렛 이동`}</span></>}</span></div>
            <div className="pos">{hp===0?'개방':hp+'프렛'}</div>
          </figcaption>
          <Diagram res={res} rootPc={c.root} quality={QUALITIES.find(x=>x.id===c.q)} label={label} names={nm} aria={ariaFor(res,name)}/>
          {res.count>1&&<p className="hint order">낮은 줄부터 {res.formName}{isShell(res)?' · 건너뛴 줄은 옆 손가락으로 살짝 닿아 소리를 막아 주세요':''}</p>}
        </figure>
      );
    });
    count=`${fmt(Math.min(vi,rank.n-1)+1)}번째 · ${progN}음 · 총 손 이동 ${moved}프렛 · 위치는 검지가 놓이는 프렛`+(rank.lay==='any'?' · 쉘 폼 포함':'');
  }

  return (
    <div className="app">
      <header className="top">
        <h1>기타 가이드</h1>
      </header>

      <section className="rail" aria-label="코드 선택">
        <div className="pair">
          <div className="group">
            <h2 id="h-root">근음</h2>
            <select className="sel" data-k="root" aria-labelledby="h-root" value={String(root)} onChange={e=>pick('root',e.target.value)}>
              {nm.map((n,i)=><option key={i} value={String(i)}>{NOTE_SHARP[i]!==NOTE_FLAT[i]?`${n} (${flat?NOTE_SHARP[i]:NOTE_FLAT[i]})`:n}</option>)}
            </select>
          </div>
          <div className="group">
            <h2 id="h-qual">코드</h2>
            <select className="sel" data-k="q" aria-labelledby="h-qual" value={qid} onChange={e=>pick('q',e.target.value)}>
              {QUALITIES.map(x=><option key={x.id} value={x.id} disabled={qOff(x.id)}>{x.label}</option>)}
            </select>
          </div>
        </div>
        <details className="adv" open={advOpen} onToggle={e=>setAdvOpen(e.currentTarget.open)}>
          <summary><b>상세 조건</b><span>{advSummary}</span></summary>
          <div className="advbody">
        {isProg?(
          <div className="group">
            <h2 id="h-n">음 개수</h2>
            <div className="seg row3" role="group" aria-labelledby="h-n">
              {NOTE_COUNTS.map(([v,l,d])=><Chip key={v} k="pn" v={String(v)} on={progN===v} disabled={pnOff(v)} onPick={pick}><span>{l}</span><small>{d}</small></Chip>)}
            </div>
          </div>
          ):(
          <div className="group">
            <h2 id="h-t">구성음</h2>
            <div className="seg compact presets" role="group" aria-label="구성음 프리셋">
              {PRESETS.map(p=><Chip key={p.id} k="preset" v={p.id} on={presetOn(p)} disabled={presetOff(p)} onPick={pick}>{p.label}</Chip>)}
            </div>
            <div className="seg row4" role="group" aria-labelledby="h-t">
              {[0,1,2,3].map(i=>(
                <Chip key={i} k="t" v={String(i)} on={i<q.tones.length&&t[i]} disabled={tOff(i)} onPick={pick}>
                  <span>{i<q.tones.length?degName(q.deg[i]):'–'}</span><small>{i<q.tones.length?nm[(root+q.tones[i])%12]:''}</small>
                </Chip>
              ))}
            </div>
          </div>
          )}
          <div className="group">
            <h2 id="h-rs">베이스</h2>
            <div className="seg row7" role="group" aria-labelledby="h-rs">
              {RS.map(([v,l])=><Chip key={v} k="rs" v={v} on={String(rs)===v} disabled={rsOff(v)} onPick={pick}>{l}</Chip>)}
            </div>
          </div>
          </div>
        </details>
        <Chip k="mode" v={isProg?'chord':'prog'} className="chip modebtn" onPick={pick}>{isProg?'← 코드 하나만 보기':'+ 진행 만들기'}</Chip>
      </section>

      <main className="stage">
        <div className="result">
          <div className="tones-wrap">
            <div className="sym">{sym}</div>
            <div className="tones" aria-label="구성음">
              {q.tones.map(x=><span key={x} className={x===0?'r':''}>{nm[(root+x)%12]}</span>)}
            </div>
          </div>
          <details className="set">
            <summary aria-label="설정">⚙ 설정</summary>
            <div className="setbody">
              <div className="seg compact" role="group" aria-label="표시 방식">
                {LABELS.map(([v,l])=><Chip key={v} k="label" v={v} on={label===v} onPick={pick}>{l}</Chip>)}
              </div>
              <div className="seg compact" role="group" aria-label="음 이름 표기">
                <Chip k="acc" v="sharp" on={!flat} onPick={pick} aria-label="샤프 표기">♯</Chip>
                <Chip k="acc" v="flat" on={flat} onPick={pick} aria-label="플랫 표기">♭</Chip>
              </div>
              {needOct&&<Chip k="oct" v="" on={octave} onPick={pick}>한 옥타브 위로</Chip>}
            </div>
          </details>
        </div>

        {isProg&&(
          <div className="prog">
            <div className="prog-list">
              {prog.map((c,i)=>(
                <span key={i} style={{display:'contents'}}>
                  {i>0&&<span className="arrow" aria-hidden="true">→</span>}
                  <Chip k="pdel" v={String(i)} onPick={pick} aria-label={`${i+1}번째 ${chordName(c)} 빼기`}>{chordName(c)}<i aria-hidden="true">×</i></Chip>
                </span>
              ))}
            </div>
            {!showResult&&<div className="picker">
              <div className="prog-actions">
                <Chip k="padd" v="" className="chip add" disabled={prog.length>=MAX_PROG} onPick={pick}>+ {sym} 추가</Chip>
                <Chip k="pclear" v="" disabled={!prog.length} onPick={pick}>비우기</Chip>
                <Chip k="pfind" v="" className="chip find" disabled={!prog.length} onPick={pick}>보이싱 찾기</Chip>
              </div>
            </div>}
            {showResult&&(
              <div className="voicings">
                <p className="vcount">가능한 보이싱 <b>{fmt(rank.n)}</b>가지 <span>· 손 이동이 적은 순</span></p>
                <div className="vnav">
                  <button className="chip" type="button" data-k="vprev" aria-label="이전 보이싱" disabled={!cur||vi<=0} onClick={()=>setVi(i=>Math.max(0,i-1))}>◀</button>
                  <span className="vpos" aria-live="polite">{cur?`${fmt(Math.min(vi,rank.n-1)+1)} / ${fmt(rank.n)}`:'0 / 0'}</span>
                  <button className="chip" type="button" data-k="vnext" aria-label="다음 보이싱" disabled={!cur||vi>=rank.n-1} onClick={()=>setVi(i=>Math.min(rank.n-1,i+1))}>▶</button>
                  <Chip k="pedit" v="" onPick={pick}>진행 수정</Chip>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="count">{count}</p>
        <div className={'cards'+(solo?' solo':'')} aria-live="polite">{cards}</div>

        <div className="foot">
          <div className="legend"><span><i className="r"></i>근음</span><span><i></i>구성음</span><span><i className="o"></i>개방현</span><span>×&nbsp;치지 않는 줄</span></div>
        </div>
      </main>
    </div>
  );
}
