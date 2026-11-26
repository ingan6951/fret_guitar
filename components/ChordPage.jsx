'use client';
// 코드 폼 페이지: 근음·코드·음 개수를 고르면 폼 카드가 나오고, +로 선택한 마디에 넣는다
import {useEffect,useMemo,useRef,useState} from 'react';
import {NOTE_SHARP,NOTE_FLAT,QUALITIES,handPos,moveCost,hasChord,rootsWithData,formsFor,fretsOf,isNote} from '../lib/fretlogic.js';
import {useGuide} from './GuideProvider.jsx';
import ProgBar,{Chip} from './ProgBar.jsx';
import Diagram,{ariaFor} from './Diagram.jsx';

const keyOf=(root,qid,frets)=>`${root}${qid}:${frets.map(f=>f===null?'x':f).join(',')}`;
const moveText=d=>d===0?'제자리':`${d}프렛 이동`;

export default function ChordPage(){
  const g=useGuide();
  const {root,qid,n,label,flat,prog,resolved,sl,selFilled,chordIdx,nm,q,sym,chordName,pick}=g;

  const list=useMemo(()=>formsFor(root,qid,n),[root,qid,n]);

  // 폼 카드 순서: 앞뒤 마디에 코드가 없으면 낮은 프렛부터. 있으면 앞뒤 폼에서 이동이 적은 순
  const bi=[...chordIdx].reverse().find(i=>i<sl);
  const ai=chordIdx.find(i=>i>sl);
  const before=bi!==undefined?resolved[bi]:undefined;
  const after=ai!==undefined?resolved[ai]:undefined;
  const shown=useMemo(()=>{
    const items=list.map((res,i)=>({res,i,cost:(before?moveCost(before,res):0)+(after?moveCost(res,after):0)}));
    if(before||after) items.sort((a,b)=>a.cost-b.cost||a.i-b.i);
    return items;
  },[list,before,after]);
  const refs=[bi!==undefined?{i:bi,tag:'이전 폼'}:null,ai!==undefined?{i:ai,tag:'다음 폼'}:null].filter(Boolean);
  const curKey=selFilled&&!isNote(prog[sl])?keyOf(prog[sl].root,prog[sl].q,prog[sl].frets):null;
  const gap=(a,b)=>Math.abs(handPos(a)-handPos(b));

  // 좁은 화면에서는 카드를 가로로 한 장씩 넘겨 본다 (넓은 화면에서는 격자). 목록이 바뀌면 첫 장으로 돌아간다.
  const nCards=shown.length||1;
  const cardsRef=useRef(null);
  const [ci,setCi]=useState(0);
  useEffect(()=>{ const el=cardsRef.current; if(el&&el.scrollTo) el.scrollTo({left:0,behavior:'auto'}); setCi(0); },[shown]);
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
  const solo=shown.length===1;

  const cards=shown.length?shown.map(({res},i)=>{
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
            {selFilled
              ?<Chip k="frep" v={String(i)} className="plus" onPick={()=>g.putForm(res)} aria-label={`${sl+1}마디를 이 폼으로 바꾸기`}>↺</Chip>
              :<Chip k="fadd" v={String(i)} className="plus" onPick={()=>g.putForm(res)} aria-label={`${sl+1}마디에 ${sym} 폼 넣기`}>+</Chip>}
          </div>
        </figcaption>
        <Diagram res={res} rootPc={root} quality={q} label={label} names={nm} aria={ariaFor(res,sym)}/>
      </figure>
    );
  }):<div className="empty"><p>이 코드의 폼 데이터가 아직 없어요.</p></div>;
  const count=`폼 ${shown.length}개`+(selFilled?` · ${sl+1}마디를 앞뒤 폼과 가까운 순`:before||after?' · 앞뒤 폼에서 가까운 순':'');

  return (
    <>
      <section className="rail" aria-label="코드 선택">
        <div className="row">
          <h2 id="h-root">근음</h2>
          <select className="sel" data-k="root" aria-labelledby="h-root" value={String(root)} onChange={e=>pick('root',e.target.value)}>
            {nm.map((nn,i)=><option key={i} value={String(i)} disabled={rootOff(i)}>{NOTE_SHARP[i]!==NOTE_FLAT[i]?`${nn} (${flat?NOTE_SHARP[i]:NOTE_FLAT[i]})`:nn}</option>)}
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
        </div>

        <ProgBar/>

        {refs.length>0&&(
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
    </>
  );
}
