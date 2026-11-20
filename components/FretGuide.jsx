'use client';
// 기타 가이드 화면 전체. 상태는 하나의 객체로 두고 브라우저에 저장한다.
import {useEffect,useMemo,useRef,useState} from 'react';
import {NOTE_SHARP,NOTE_FLAT,QUALITIES,collectN,handPos,moveCost,isShell,hasFormsNAt,hasTopAt,voicingFromFrets,fretsOf} from '../lib/fretlogic.js';
import {DEFAULT,MAX_PROG,FRET_MAX,loadState,saveState} from '../lib/settings.js';
import Diagram,{ariaFor} from './Diagram.jsx';

const RS_ORDER=['all',1,2,3,4,5,6]; // 베이스 스테퍼 순서: 전체 → 1번 줄 … 6번 줄
const LABELS=[['finger','손가락'],['note','음이름'],['degree','도수']];
const degName=d=>d==='R'?'1':d;
const NC_MAX=6;
const keyOf=(root,qid,frets)=>`${root}${qid}:${frets.map(f=>f===null?'x':f).join(',')}`;

function Chip({k,v,on,disabled,onPick,children,className='chip',...rest}){
  return (
    <button className={className} type="button" data-k={k} data-v={v} aria-pressed={on===undefined?undefined:String(on)}
      disabled={disabled} onClick={()=>onPick(k,v)} {...rest}>{children}</button>
  );
}

export default function FretGuide(){
  const [state,setState]=useState(DEFAULT);
  const [ready,setReady]=useState(false);
  const [sel,setSel]=useState(null); // 진행에서 고른 칩의 순번: 그 자리를 다시 고르거나 제거할 대상
  const [showAll,setShowAll]=useState(false); // 진행에 담은 폼을 차례로 모아 보기

  useEffect(()=>{ const s=loadState(); if(s) setState(s); setReady(true); },[]);
  useEffect(()=>{ if(ready) saveState(state); },[state,ready]);

  const pick=(k,v)=>setState(s=>{
    switch(k){
      case 'root': return {...s,root:Number(v)};
      case 'q': return {...s,q:v};
      case 'rs': return {...s,rs:v==='all'?'all':Number(v)};
      case 'label': return {...s,label:v};
      case 'acc': return {...s,flat:v==='flat'};
      case 'oct': return {...s,octave:!s.octave};
      case 'top': return {...s,top:v===''?null:Number(v)};
      case 'pnstep': return {...s,nc:Math.max(1,Math.min(NC_MAX,s.nc+Number(v)))};
      case 'fstep': return {...s,fmin:Math.max(0,Math.min(FRET_MAX,s.fmin+Number(v)))};
      case 'pdel': return {...s,prog:s.prog.filter((_,j)=>j!==Number(v))};
      case 'pclear': return {...s,prog:[]};
      default: return s;
    }
  });

  const {root,q:qid,rs,fmin,label,flat,octave,nc,top,prog}=state;
  const nm=flat?NOTE_FLAT:NOTE_SHARP;
  const q=QUALITIES.find(x=>x.id===qid);
  const sym=nm[root]+q.suffix;
  const chordName=c=>nm[c.root]+QUALITIES.find(x=>x.id===c.q).suffix;

  // 진행에 담은 폼은 운지째로 보관한다 (조건을 바꿔도 그대로)
  const resolved=useMemo(()=>prog.map(e=>voicingFromFrets(e.root,e.q,e.frets,e.base)),[prog]);
  const selOk=sel!==null&&sel<prog.length?sel:null;
  const viewAll=showAll&&prog.length>0;

  // 하이톤: 지금 조건으로 그 음이 맨 위인 폼이 있어야 고를 수 있다
  const topOff=i=>i!==top&&!hasTopAt(root,qid,rs,nc,'any',fmin,i);
  const topEff=Number.isInteger(top)&&top<q.tones.length&&!topOff(top)?top:null;
  const list=useMemo(()=>collectN(root,qid,rs,octave,nc,'any',fmin,topEff),[root,qid,rs,octave,nc,fmin,topEff]);

  // 칩을 누르면 그 자리가 선택되고(코드도 불러옴) 다시 누르면 풀린다. 선택하면 그 자리를 다시 고르는 상태가 된다.
  const choose=i=>{
    setShowAll(false);
    if(selOk===i){ setSel(null); return; }
    setSel(i);
    setState(s=>s.prog[i]?{...s,root:s.prog[i].root,q:s.prog[i].q}:s);
  };
  const entryOf=(s,r)=>({root:s.root,q:s.q,frets:fretsOf(r),base:r.baseFret});
  const addForm=r=>setState(s=>s.prog.length>=MAX_PROG?s:{...s,prog:[...s.prog,entryOf(s,r)]});
  const replaceForm=r=>{ setState(s=>s.prog[selOk]?{...s,prog:s.prog.map((e,j)=>j===selOk?entryOf(s,r):e)}:s); setSel(null); };
  const delSel=()=>{ pick('pdel',String(selOk)); setSel(null); };

  // 폼 카드 순서: 진행이 비었으면 낮은 프렛부터. 진행이 있으면 앞 폼에서 이동이 적은 순.
  // 이미 담은 자리를 다시 고르는 중이면 앞뒤 폼 모두에서 가까운 순 (이웃 폼은 그대로 두므로 어긋남이 생기지 않는다).
  const before=selOk!==null?resolved[selOk-1]:resolved[resolved.length-1];
  const after=selOk!==null?resolved[selOk+1]:undefined;
  const shown=useMemo(()=>{
    const items=list.map((res,i)=>({res,i,cost:(before?moveCost(before,res):0)+(after?moveCost(res,after):0)}));
    if(before||after) items.sort((a,b)=>a.cost-b.cost||a.i-b.i);
    return items;
  },[list,before,after]);
  const bi=selOk!==null?selOk-1:prog.length-1; // 기준이 되는 앞 폼의 순번
  const ai=selOk!==null&&selOk+1<prog.length?selOk+1:-1; // 다시 고르는 중이면 뒤 폼도
  const refs=[bi>=0?{i:bi,tag:'이전 폼'}:null,ai>=0?{i:ai,tag:'다음 폼'}:null].filter(Boolean);
  const curKey=selOk!==null?keyOf(prog[selOk].root,prog[selOk].q,prog[selOk].frets):null;
  const full=prog.length>=MAX_PROG;
  const hand=r=>handPos(r);
  const gap=(a,b)=>Math.abs(hand(a)-hand(b));
  const moveText=d=>d===0?'제자리':`${d}프렛 이동`;

  // 진행 전체 이동 합
  const moved=resolved.reduce((sum,r,i)=>i?sum+gap(resolved[i-1],r):0,0);

  const fmt=n=>n.toLocaleString('ko-KR');
  // 좁은 화면에서는 카드를 가로로 한 장씩 넘겨 본다 (넓은 화면에서는 격자). 목록이 바뀌면 첫 장으로 돌아간다.
  const cardsRef=useRef(null);
  const [ci,setCi]=useState(0);
  useEffect(()=>{ const el=cardsRef.current; if(el&&el.scrollTo) el.scrollTo({left:0,behavior:'auto'}); setCi(0); },[shown,viewAll]);
  const needOct=fmin===0&&list.some(r=>r.canOctave);

  // 지금 고른 다른 값과 합쳤을 때 폼이 하나도 없는 선택지는 비활성화한다 (고른 버튼은 그대로 둔다)
  // 프렛 하한이 있으면 근음에 따라 폼 유무가 달라지므로 근음도 함께 넘긴다
  const hasAt=(rt,id,r,fm)=>hasFormsNAt(rt,id,r,nc,'any',fm);
  const has=(id,r)=>hasAt(root,id,r,fmin);
  const rootOff=i=>i!==root&&!hasAt(i,qid,rs,fmin);
  const qOff=id=>id!==qid&&!has(id,rs);
  // 베이스 스테퍼: 폼이 없는 값은 건너뛰고 가장 가까운 값으로 간다. 갈 곳이 없으면 null
  const rsNext=d=>{ for(let i=RS_ORDER.indexOf(rs)+d;i>=0&&i<RS_ORDER.length;i+=d) if(has(qid,RS_ORDER[i])) return RS_ORDER[i]; return null; };
  const pnOff=n=>n!==nc&&!hasFormsNAt(root,qid,rs,n,'any',fmin);
  // 하한을 올릴수록 폼은 줄어들기만 하므로, 다음 숫자에 폼이 없으면 + 는 막는다
  const plusOff=fmin>=FRET_MAX||!hasAt(root,qid,rs,fmin+1);

  const stepOf=el=>el.children.length>1?el.children[1].offsetLeft-el.children[0].offsetLeft:el.clientWidth;
  const slide=d=>{
    const el=cardsRef.current; if(!el) return;
    const next=Math.max(0,Math.min(nCards-1,ci+d));
    if(el.scrollTo) el.scrollTo({left:next*stepOf(el),behavior:'smooth'});
    setCi(next);
  };
  const onScroll=e=>{ const el=e.currentTarget,st=stepOf(el); if(st>0) setCi(Math.max(0,Math.min(nCards-1,Math.round(el.scrollLeft/st)))); };
  const onKey=e=>{
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return;
    if(!(window.matchMedia&&window.matchMedia('(max-width:719px)').matches)) return;
    e.preventDefault(); slide(e.key==='ArrowLeft'?-1:1);
  };

  let cards,count,nCards=1;
  const solo=!viewAll&&shown.length===1;
  if(viewAll){
    nCards=prog.length;
    cards=prog.map((c,i)=>{
      const res=resolved[i],name=chordName(c);
      const d=i?gap(resolved[i-1],res):null;
      return (
        <figure className="card" key={i+keyOf(c.root,c.q,c.frets)}>
          <figcaption>
            <div className="who"><b>{i+1}. {name}</b><span>{res.bass}번 줄 베이스{isShell(res)?' · 쉘':''}{d===null?null:<> · <span className="move">{moveText(d)}</span></>}</span></div>
            <div className="capr"><div className="pos">{res.baseFret===0?'개방':res.baseFret+'프렛'}</div></div>
          </figcaption>
          <Diagram res={res} rootPc={c.root} quality={QUALITIES.find(x=>x.id===c.q)} label={label} names={nm} aria={ariaFor(res,name)}/>
        </figure>
      );
    });
    count=`진행 ${prog.length}개 · 총 손 이동 ${moved}프렛 · 위치는 검지가 놓이는 프렛`;
  }else{
    nCards=shown.length||1;
    cards=shown.length?shown.map(({res},i)=>{
      const dPrev=before?gap(before,res):null,dNext=after?gap(res,after):null;
      const cur=curKey!==null&&keyOf(root,qid,fretsOf(res))===curKey;
      return (
        <figure className={'card'+(cur?' cur':'')} key={keyOf(root,qid,fretsOf(res))}>
          <figcaption>
            <div className="who"><b>{res.bass}번 줄</b><span className="deg">{res.bassLabel==='R'?'근음':res.bassLabel} 베이스{isShell(res)?' · 쉘':''}</span>
              {(dPrev!==null||dNext!==null)&&<span className="move">{dPrev!==null&&`앞 ${moveText(dPrev)}`}{dPrev!==null&&dNext!==null&&' · '}{dNext!==null&&`뒤 ${moveText(dNext)}`}</span>}
              {cur&&<span className="curtag">지금 이 자리</span>}</div>
            <div className="capr">
              <div className="pos">{res.baseFret===0?'개방':res.baseFret+'프렛'}</div>
              {selOk!==null
                ?<Chip k="frep" v={String(i)} className="plus" onPick={()=>replaceForm(res)} aria-label={`${selOk+1}번째 코드를 이 폼으로 바꾸기`}>↺</Chip>
                :<Chip k="fadd" v={String(i)} className="plus" disabled={full} onPick={()=>addForm(res)} aria-label={`${sym} 폼을 진행에 추가`}>+</Chip>}
            </div>
          </figcaption>
          <Diagram res={res} rootPc={root} quality={q} label={label} names={nm} aria={ariaFor(res,sym)}/>
        </figure>
      );
    }):<div className="empty"><p>이 조건으로 잡히는 폼이 없어요.</p><p>음 개수나 베이스를 바꿔 보세요.</p></div>;
    count=`폼 ${shown.length}개 · ${nc}음`+(selOk!==null?` · ${selOk+1}번째 자리를 앞뒤 폼과 가까운 순`:before?' · 이전 폼에서 가까운 순':'');
  }

  return (
    <div className="app">
      <header className="top">
        <h1>기타 가이드</h1>
      </header>

      <section className="rail" aria-label="코드 선택">
        <div className="row">
          <h2 id="h-root">근음</h2>
          <select className="sel" data-k="root" aria-labelledby="h-root" value={String(root)} onChange={e=>pick('root',e.target.value)}>
            {nm.map((n,i)=><option key={i} value={String(i)} disabled={rootOff(i)}>{NOTE_SHARP[i]!==NOTE_FLAT[i]?`${n} (${flat?NOTE_SHARP[i]:NOTE_FLAT[i]})`:n}</option>)}
          </select>
        </div>
        <div className="row">
          <h2 id="h-qual">코드</h2>
          <select className="sel" data-k="q" aria-labelledby="h-qual" value={qid} onChange={e=>pick('q',e.target.value)}>
            {QUALITIES.map(x=><option key={x.id} value={x.id} disabled={qOff(x.id)}>{x.label}</option>)}
          </select>
        </div>
        <div className="row">
          <h2 id="h-top">하이톤</h2>
          <select className="sel" data-k="top" aria-labelledby="h-top" value={topEff===null?'':String(topEff)} onChange={e=>pick('top',e.target.value)}>
            <option value="">자동</option>
            {q.tones.map((iv,i)=>(<option key={i} value={String(i)} disabled={topOff(i)}>{degName(q.deg[i])} ({nm[(root+iv)%12]})</option>))}
          </select>
        </div>
        <div className="row">
          <h2 id="h-n">음 개수</h2>
          <div className="stepper" role="group" aria-labelledby="h-n">
            <Chip k="pnstep" v="-1" disabled={nc<=1||pnOff(nc-1)} onPick={pick} aria-label="음 개수 줄이기">−</Chip>
            <output className="val" aria-live="polite">{nc}</output>
            <Chip k="pnstep" v="1" disabled={nc>=NC_MAX||pnOff(nc+1)} onPick={pick} aria-label="음 개수 늘리기">+</Chip>
          </div>
        </div>
        <div className="row">
          <h2 id="h-rs">베이스</h2>
          <div className="stepper" role="group" aria-labelledby="h-rs">
            <Chip k="rstep" v="-1" disabled={rsNext(-1)===null} onPick={(k,v)=>{ const n=rsNext(Number(v)); if(n!==null) pick('rs',String(n)); }} aria-label="베이스 줄 낮추기">−</Chip>
            <output className="val" aria-live="polite">{rs==='all'?'전체':`${rs}번 줄`}</output>
            <Chip k="rstep" v="1" disabled={rsNext(1)===null} onPick={(k,v)=>{ const n=rsNext(Number(v)); if(n!==null) pick('rs',String(n)); }} aria-label="베이스 줄 올리기">+</Chip>
          </div>
        </div>
        <div className="row">
          <h2 id="h-fret">프렛</h2>
          <div className="stepper" role="group" aria-labelledby="h-fret">
            <Chip k="fstep" v="-1" disabled={fmin<=0} onPick={pick} aria-label="프렛 낮추기">−</Chip>
            <output className="val" aria-live="polite">{fmin===0?'전체':fmin}</output>
            <Chip k="fstep" v="1" disabled={plusOff} onPick={pick} aria-label="프렛 올리기">+</Chip>
          </div>
        </div>
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
            <summary aria-label="보기">⚙ 보기</summary>
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

        {prog.length>0&&(
          <div className="prog">
            <div className="prog-list" aria-label="진행">
              {prog.map((c,i)=>(
                <span key={i} style={{display:'contents'}}>
                  {i>0&&<span className="arrow" aria-hidden="true">→<small>{gap(resolved[i-1],resolved[i])}</small></span>}
                  <button className="chip" type="button" data-k="psel" data-v={String(i)} aria-pressed={String(selOk===i)}
                    aria-label={`${i+1}번째 ${chordName(c)} 선택`} onClick={()=>choose(i)}>{chordName(c)}<small>{resolved[i].baseFret===0?'개방':resolved[i].baseFret+'프렛'}</small></button>
                </span>
              ))}
            </div>
            <div className="prog-actions">
              <span className="selname">{selOk!==null?`${selOk+1}번째 ${chordName(prog[selOk])}: 바꿀 폼을 ↺로 고르세요`:`총 손 이동 ${moved}프렛 · 아래에서 다음 코드를 고르고 +`}</span>
              {selOk!==null&&<Chip k="pdel" v={String(selOk)} onPick={delSel}>제거</Chip>}
              <Chip k="pview" v="" on={showAll} onPick={()=>setShowAll(v=>!v)}>{viewAll?'폼 고르기':'진행 보기'}</Chip>
              <Chip k="pclear" v="" onPick={(k,v)=>{ pick(k,v); setSel(null); setShowAll(false); }}>비우기</Chip>
            </div>
          </div>
        )}

        {!viewAll&&refs.length>0&&(
          <div className="refs" aria-label="기준 폼">
            {refs.map(({i,tag})=>{
              const c=prog[i],res=resolved[i],name=chordName(c);
              return (
                <figure className="card ref" key={tag} data-k="ref" data-v={tag}>
                  <figcaption>
                    <div className="who"><b>{tag}</b><span>{i+1}. {name}</span></div>
                    <div className="capr"><div className="pos">{res.baseFret===0?'개방':res.baseFret+'프렛'}</div></div>
                  </figcaption>
                  <Diagram res={res} rootPc={c.root} quality={QUALITIES.find(x=>x.id===c.q)} label={label} names={nm} aria={ariaFor(res,name)}/>
                </figure>
              );
            })}
          </div>
        )}
        <p className="count">{count}</p>
        {nCards>1&&(
          <div className="slidenav" role="group" aria-label="폼 넘기기">
            <button className="chip" type="button" data-k="cprev" aria-label="이전 폼" disabled={ci<=0} onClick={()=>slide(-1)}>◀</button>
            <span className="cpos" aria-live="polite">{Math.min(ci,nCards-1)+1} / {nCards}</span>
            <button className="chip" type="button" data-k="cnext" aria-label="다음 폼" disabled={ci>=nCards-1} onClick={()=>slide(1)}>▶</button>
          </div>
        )}
        <div className={'cards'+(solo?' solo':'')+(nCards===1?' one':'')} ref={cardsRef} tabIndex={0} aria-label="폼 목록" aria-live="polite" onScroll={onScroll} onKeyDown={onKey}>{cards}</div>

        <div className="foot">
          <div className="legend"><span><i className="r"></i>근음</span><span><i></i>구성음</span><span><i className="o"></i>개방현</span><span>×&nbsp;치지 않는 줄</span></div>
        </div>
      </main>
    </div>
  );
}
