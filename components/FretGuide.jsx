'use client';
// 기타 가이드 화면 전체. 상태는 하나의 객체로 두고 브라우저에 저장한다.
import {useEffect,useMemo,useRef,useState} from 'react';
import {NOTE_SHARP,NOTE_FLAT,QUALITIES,handPos,moveCost,hasChord,rootsWithData,formsFor,voicingFromFrets,fretsOf} from '../lib/fretlogic.js';
import {DEFAULT,MAX_PROG,loadState,saveState,encodeProg,decodeProg} from '../lib/settings.js';
import Diagram,{ariaFor} from './Diagram.jsx';

const LABELS=[['note','음이름'],['degree','도수']];
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

  const [chart,setChart]=useState(false); // 진행을 코드 차트(마디) 악보로 보기
  const [perBar,setPerBar]=useState(1);   // 한 마디에 들어가는 코드 수
  const [shareNote,setShareNote]=useState(''); // 링크 복사 결과 안내
  const [shareUrl,setShareUrl]=useState('');   // 복사가 막힌 브라우저에서 직접 복사하도록 보여 주는 주소

  useEffect(()=>{
    let s=loadState();
    // 공유 링크(?p=...)로 들어오면 그 진행을 불러온다 (저장해 둔 다른 설정은 그대로)
    try{
      const url=new URL(window.location.href),shared=decodeProg(url.searchParams.get('p'));
      if(shared.length){ s={...(s||DEFAULT),prog:shared}; url.searchParams.delete('p'); window.history.replaceState(null,'',url.pathname+url.search+url.hash); }
    }catch(e){}
    if(s) setState(s);
    setReady(true);
  },[]);
  useEffect(()=>{ if(ready) saveState(state); },[state,ready]);

  const pick=(k,v)=>setState(s=>{
    switch(k){
      // 근음을 바꿨는데 지금 코드 종류가 그 근음에 없으면, 있는 종류로 바꾼다
      case 'root': { const r=Number(v); const q2=hasChord(r,s.q)?s.q:(QUALITIES.find(x=>hasChord(r,x.id))||{id:s.q}).id; return {...s,root:r,q:q2}; }
      case 'q': return {...s,q:v};
      case 'n': return {...s,n:Number(v)};
      case 'label': return {...s,label:v};
      case 'acc': return {...s,flat:v==='flat'};
      case 'pdel': return {...s,prog:s.prog.filter((_,j)=>j!==Number(v))};
      case 'pclear': return {...s,prog:[]};
      default: return s;
    }
  });

  const {root,q:qid,n,label,flat,prog}=state;
  const nm=flat?NOTE_FLAT:NOTE_SHARP;
  const q=QUALITIES.find(x=>x.id===qid);
  const sym=nm[root]+q.suffix;
  const chordName=c=>nm[c.root]+QUALITIES.find(x=>x.id===c.q).suffix;

  // 진행에 담은 폼은 운지째로 보관한다 (조건을 바꿔도 그대로)
  const resolved=useMemo(()=>prog.map(e=>voicingFromFrets(e.root,e.q,e.frets)),[prog]);
  const selOk=sel!==null&&sel<prog.length?sel:null;
  const viewAll=showAll&&prog.length>0;

  // 이 코드의 폼 (데이터에 적힌 것만)
  const list=useMemo(()=>formsFor(root,qid,n),[root,qid,n]);

  // 칩을 누르면 그 자리가 선택되고(코드도 불러옴) 다시 누르면 풀린다. 선택하면 그 자리를 다시 고르는 상태가 된다.
  const choose=i=>{
    setShowAll(false);
    if(selOk===i){ setSel(null); return; }
    setSel(i);
    setState(s=>s.prog[i]?{...s,root:s.prog[i].root,q:s.prog[i].q}:s);
  };
  const shareProg=async()=>{
    try{
      const url=new URL(window.location.href); url.search=''; url.hash='';
      url.searchParams.set('p',encodeProg(prog));
      const text=url.toString();
      try{ await navigator.clipboard.writeText(text); setShareUrl(''); setShareNote('복사됨'); }
      catch(e){ setShareUrl(text); setShareNote('아래 주소를 복사하세요'); }
      setTimeout(()=>setShareNote(''),2500);
    }catch(e){ setShareNote(''); }
  };
  const entryOf=(s,r)=>({root:s.root,q:s.q,frets:fretsOf(r)});
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
  // 데이터에 없는 근음·코드 조합은 고를 수 없게 비활성화한다 (고른 값은 그대로 둔다)
  const rootOff=i=>!rootsWithData().includes(i);
  const qOff=id=>id!==qid&&!hasChord(root,id);

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
            <div className="who"><b>{i+1}. {name}</b><span>{res.bass}번 줄 베이스{d===null?null:<> · <span className="move">{moveText(d)}</span></>}</span></div>
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
            <div className="who"><b>{res.bass}번 줄</b><span className="deg">{res.bassLabel==='R'?'근음':res.bassLabel} 베이스</span>
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
    }):<div className="empty"><p>이 코드의 폼 데이터가 아직 없어요.</p></div>;
    count=`폼 ${shown.length}개`+(selOk!==null?` · ${selOk+1}번째 자리를 앞뒤 폼과 가까운 순`:before?' · 이전 폼에서 가까운 순':'');
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
          <h2 id="h-n">음 개수</h2>
          <select className="sel" data-k="n" aria-labelledby="h-n" value={String(n)} onChange={e=>pick('n',e.target.value)}>
            <option value="0">전체</option>
            {[1,2,3,4,5].map(k=><option key={k} value={String(k)}>{k}개 (이웃한 줄)</option>)}
          </select>
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
              <Chip k="pchart" v="" on={chart} onPick={()=>setChart(v=>!v)}>악보</Chip>
              <Chip k="pshare" v="" onPick={shareProg}>{shareNote||'링크 복사'}</Chip>
              <Chip k="pclear" v="" onPick={(k,v)=>{ pick(k,v); setSel(null); setShowAll(false); }}>비우기</Chip>
            </div>
            {chart&&(
              <div className="chart" aria-label="코드 차트">
                <div className="seg compact" role="group" aria-label="마디당 코드 수">
                  {[1,2].map(n=><Chip key={n} k="perbar" v={String(n)} on={perBar===n} onPick={()=>setPerBar(n)}>{`한 마디에 ${n}개`}</Chip>)}
                </div>
                <div className="bars">
                  {Array.from({length:Math.ceil(prog.length/perBar)},(_,m)=>(
                    <div className="bar" key={m} data-k="bar" data-v={String(m)}>
                      {prog.slice(m*perBar,m*perBar+perBar).map((c,j)=>{
                        const i=m*perBar+j;
                        return <span className="bc" key={i}><b>{chordName(c)}</b><small>{resolved[i].baseFret===0?'개방':resolved[i].baseFret+'프렛'}</small></span>;
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {shareUrl&&<input className="shareurl" readOnly value={shareUrl} aria-label="공유 링크" onFocus={e=>e.target.select()}/>}
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
