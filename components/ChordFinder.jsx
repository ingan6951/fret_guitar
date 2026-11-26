'use client';
// 코드 폼 찾기: 근음·코드·음 개수를 고르면 폼 카드가 나온다.
// edit이면 진행에서 고른 코드 칸에 넣을 수 있다(카드의 +/↺, 앞뒤 코드와 가까운 순서, 기준 폼).
import {useEffect,useMemo,useRef,useState} from 'react';
import {NOTE_SHARP,NOTE_FLAT,QUALITIES,handPos,hasChord,rootsWithData,formsFor,fretsOf} from '../lib/fretlogic.js';
import {useGuide} from './GuideProvider.jsx';
import {Chip} from './ui.jsx';
import Diagram,{ariaFor} from './Diagram.jsx';

const keyOf=(root,qid,frets)=>`${root}${qid}:${frets.map(f=>f===null?'x':f).join(',')}`;
const moveText=d=>d===0?'제자리':`${d}프렛 이동`;

export default function ChordFinder({edit=false}){
  const g=useGuide();
  const {root,qid,n,label,flat,nm,q,sym,pick,sel,selChord,prev,next}=g;
  const list=useMemo(()=>formsFor(root,qid,n),[root,qid,n]);

  const before=edit&&prev?prev.res:undefined,after=edit&&next?next.res:undefined;
  const shown=useMemo(()=>{
    const items=list.map((res,i)=>({res,i,cost:(before?g.moveCost(before,res):0)+(after?g.moveCost(res,after):0)}));
    if(before||after) items.sort((a,b)=>a.cost-b.cost||a.i-b.i);
    return items;
  },[list,before,after]);
  const refs=edit?[prev&&{x:prev,tag:'이전 폼'},next&&{x:next,tag:'다음 폼'}].filter(Boolean):[];
  const curKey=edit&&selChord?keyOf(selChord.root,selChord.q,selChord.frets):null;
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
    const k=Math.max(0,Math.min(nCards-1,ci+d));
    if(el.scrollTo) el.scrollTo({left:k*stepOf(el),behavior:'smooth'});
    setCi(k);
  };
  const onScroll=e=>{ const el=e.currentTarget,st=stepOf(el); if(st>0) setCi(Math.max(0,Math.min(nCards-1,Math.round(el.scrollLeft/st)))); };
  const onKey=e=>{
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return;
    if(!(window.matchMedia&&window.matchMedia('(max-width:719px)').matches)) return;
    e.preventDefault(); slide(e.key==='ArrowLeft'?-1:1);
  };

  const where=`${sel.bar+1}마디 ${g.selBar.div>1?`${sel.i+1}번째 `:''}`;
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
            {edit&&(selChord
              ?<Chip k="frep" v={String(i)} className="plus" onPick={()=>g.putForm(res)} aria-label={`${where}을 이 폼으로 바꾸기`}>↺</Chip>
              :<Chip k="fadd" v={String(i)} className="plus" onPick={()=>g.putForm(res)} aria-label={`${where}에 ${sym} 폼 넣기`}>+</Chip>)}
          </div>
        </figcaption>
        <Diagram res={res} rootPc={root} quality={q} label={label} names={nm} aria={ariaFor(res,sym)}/>
      </figure>
    );
  }):<div className="empty"><p>이 코드의 폼 데이터가 아직 없어요.</p></div>;
  const count=`폼 ${shown.length}개`+(edit?(selChord?` · ${where}을 앞뒤 폼과 가까운 순`:before||after?' · 앞뒤 폼에서 가까운 순':''):'');

  return (
    <section className="finder" aria-label="코드 폼">
      <div className="controls">
        <label className="field"><span id="h-root">근음</span>
          <select className="sel" data-k="root" aria-labelledby="h-root" value={String(root)} onChange={e=>pick('root',e.target.value)}>
            {nm.map((nn,i)=><option key={i} value={String(i)} disabled={rootOff(i)}>{NOTE_SHARP[i]!==NOTE_FLAT[i]?`${nn} (${flat?NOTE_SHARP[i]:NOTE_FLAT[i]})`:nn}</option>)}
          </select></label>
        <label className="field"><span id="h-qual">코드</span>
          <select className="sel" data-k="q" aria-labelledby="h-qual" value={qid} onChange={e=>pick('q',e.target.value)}>
            {QUALITIES.map(x=><option key={x.id} value={x.id} disabled={qOff(x.id)}>{x.label}</option>)}
          </select></label>
        <label className="field"><span id="h-n">음 개수</span>
          <select className="sel" data-k="n" aria-labelledby="h-n" value={String(n)} onChange={e=>pick('n',e.target.value)}>
            <option value="0">전체</option>
            {[1,2,3,4,5].map(k=><option key={k} value={String(k)}>{k}개 (이웃한 줄)</option>)}
          </select></label>
      </div>
      <div className="result">
        <div className="sym">{sym}</div>
        <div className="tones" aria-label="구성음">
          {q.tones.map(x=><span key={x} className={x===0?'r':''}>{nm[(root+x)%12]}</span>)}
        </div>
        <p className="count">{count}</p>
      </div>

      {refs.length>0&&(
        <div className="refs" aria-label="기준 폼">
          {refs.map(({x,tag})=>(
            <figure className="card ref" key={tag} data-k="ref" data-v={tag}>
              <figcaption>
                <div className="who"><b>{tag}</b><span>{x.bar+1}마디 {g.chordName(x.c)}</span></div>
                <div className="capr"><div className="pos">{x.res.baseFret===0?'개방':x.res.baseFret+'프렛'}</div></div>
              </figcaption>
              <Diagram res={x.res} rootPc={x.c.root} quality={QUALITIES.find(y=>y.id===x.c.q)} label={label} names={nm} aria={ariaFor(x.res,g.chordName(x.c))}/>
            </figure>
          ))}
        </div>
      )}
      {nCards>1&&(
        <div className="slidenav" role="group" aria-label="폼 넘기기">
          <button className="chip" type="button" data-k="cprev" aria-label="이전 폼" disabled={ci<=0} onClick={()=>slide(-1)}>◀</button>
          <span className="cpos" aria-live="polite">{Math.min(ci,nCards-1)+1} / {nCards}</span>
          <button className="chip" type="button" data-k="cnext" aria-label="다음 폼" disabled={ci>=nCards-1} onClick={()=>slide(1)}>▶</button>
        </div>
      )}
      <div className={'cards'+(shown.length===1?' solo':'')+(nCards===1?' one':'')} ref={cardsRef} tabIndex={0} aria-label="폼 목록" aria-live="polite" onScroll={onScroll} onKeyDown={onKey}>{cards}</div>
      <div className="legend"><span><i className="r"></i>근음</span><span><i></i>구성음</span><span><i className="o"></i>개방현</span><span>×&nbsp;치지 않는 줄</span></div>
    </section>
  );
}
