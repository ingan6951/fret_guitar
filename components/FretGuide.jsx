'use client';
// 기타 가이드 화면 전체. 상태는 하나의 객체로 두고 브라우저에 저장한다.
import {useEffect,useMemo,useRef,useState} from 'react';
import {NOTE_SHARP,NOTE_FLAT,QUALITIES,handPos,moveCost,hasChord,rootsWithData,formsFor,voicingFromFrets,fretsOf} from '../lib/fretlogic.js';
import {DEFAULT,MIN_BARS,MAX_PROG,MAX_LISTS,MAX_TITLE,newList,cleanTitle,loadState,saveState,encodeProg,decodeProg} from '../lib/settings.js';
import Diagram,{ariaFor} from './Diagram.jsx';

const LABELS=[['note','음이름'],['degree','도수']];
const progOf=s=>s.lists[s.cur].prog;
const withProg=(s,fn)=>({...s,lists:s.lists.map((l,i)=>i===s.cur?{...l,prog:fn(l.prog)}:l)});
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
  const [sel,setSel]=useState(0); // 선택한 마디: 아래에서 고른 폼이 이 마디에 들어간다
  const [showAll,setShowAll]=useState(false); // 진행에 담은 폼을 차례로 모아 보기
  const [confirmDel,setConfirmDel]=useState(false); // 진행 삭제 확인 대기

  const [shareNote,setShareNote]=useState(''); // 링크 복사 결과 안내
  const [shareUrl,setShareUrl]=useState('');   // 복사가 막힌 브라우저에서 직접 복사하도록 보여 주는 주소

  useEffect(()=>{
    let s=loadState();
    // 공유 링크(?p=...)로 들어오면 그 진행을 불러온다 (저장해 둔 다른 설정은 그대로)
    try{
      const url=new URL(window.location.href),shared=decodeProg(url.searchParams.get('p'));
      if(shared.some(Boolean)){
        // 공유받은 진행은 기존 진행을 덮어쓰지 않고 새 진행으로 추가한다
        const base=s||DEFAULT,title=cleanTitle(url.searchParams.get('t'))||'공유받은 진행';
        const onlyEmpty=base.lists.length===1&&!base.lists[0].prog.some(Boolean); // 비어 있는 첫 진행뿐이면 그 자리에 둔다
        const lists=onlyEmpty?[]:base.lists.length>=MAX_LISTS?base.lists.slice(0,MAX_LISTS-1):base.lists;
        s={...base,lists:[...lists,{title,prog:shared}],cur:lists.length};
        url.searchParams.delete('p'); url.searchParams.delete('t');
        window.history.replaceState(null,'',url.pathname+url.search+url.hash);
      }
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
      case 'pdel': return withProg(s,p=>p.map((e,j)=>j===Number(v)?null:e));
      case 'pclear': return withProg(s,()=>Array(MIN_BARS).fill(null));
      case 'ptitle': return {...s,lists:s.lists.map((l,i)=>i===s.cur?{...l,title:cleanTitle(v)}:l)};
      case 'pswitch': { const i=Number(v); return i>=0&&i<s.lists.length?{...s,cur:i}:s; }
      case 'pnew': return s.lists.length>=MAX_LISTS?s:{...s,lists:[...s.lists,newList(`진행 ${s.lists.length+1}`)],cur:s.lists.length};
      case 'plistdel': {
        const lists=s.lists.filter((_,i)=>i!==s.cur);
        return lists.length?{...s,lists,cur:Math.min(s.cur,lists.length-1)}:{...s,lists:[newList('진행 1')],cur:0};
      }
      default: return s;
    }
  });

  const {root,q:qid,n,label,flat,lists,cur}=state;
  const prog=lists[cur].prog; // 지금 보는 진행의 마디들
  const nm=flat?NOTE_FLAT:NOTE_SHARP;
  const q=QUALITIES.find(x=>x.id===qid);
  const sym=nm[root]+q.suffix;
  const chordName=c=>nm[c.root]+QUALITIES.find(x=>x.id===c.q).suffix;

  // 마디에 담은 폼은 운지째로 보관한다 (조건을 바꿔도 그대로). 빈 마디는 null.
  const resolved=useMemo(()=>prog.map(e=>e?voicingFromFrets(e.root,e.q,e.frets):null),[prog]);
  const sl=Math.min(sel,prog.length-1); // 선택한 마디
  const selFilled=!!prog[sl];
  const filled=prog.map((e,i)=>e?i:-1).filter(i=>i>=0); // 코드가 들어 있는 마디 순번
  const viewAll=showAll&&filled.length>0;

  // 이 코드의 폼 (데이터에 적힌 것만)
  const list=useMemo(()=>formsFor(root,qid,n),[root,qid,n]);

  // 마디를 누르면 그 마디가 선택되고(코드가 들어 있으면 그 코드를 불러옴), 아래에서 고른 폼이 그 마디에 들어간다.
  const choose=i=>{
    setShowAll(false);
    setSel(i);
    setState(s=>progOf(s)[i]?{...s,root:progOf(s)[i].root,q:progOf(s)[i].q}:s);
  };
  // 진행을 바꾸거나 새로 만들거나 지우면 선택한 마디·모아 보기·삭제 확인을 처음 상태로 돌린다
  const resetView=()=>{ setSel(0); setShowAll(false); setConfirmDel(false); };
  const switchList=v=>{ pick('pswitch',v); resetView(); };
  const newProg=()=>{ pick('pnew',''); resetView(); };
  const deleteProg=()=>{
    // 코드가 들어 있는 진행은 한 번 더 눌러야 지운다
    if(!confirmDel&&prog.some(Boolean)){ setConfirmDel(true); setTimeout(()=>setConfirmDel(false),3000); return; }
    pick('plistdel',''); resetView();
  };
  const addBar=()=>{ setState(s=>progOf(s).length>=MAX_PROG?s:withProg(s,p=>[...p,null])); setSel(prog.length); setShowAll(false); };
  const shareProg=async()=>{
    try{
      const url=new URL(window.location.href); url.search=''; url.hash='';
      url.searchParams.set('p',encodeProg(prog));
      if(lists[cur].title) url.searchParams.set('t',lists[cur].title);
      const text=url.toString();
      try{ await navigator.clipboard.writeText(text); setShareUrl(''); setShareNote('복사됨'); }
      catch(e){ setShareUrl(text); setShareNote('아래 주소를 복사하세요'); }
      setTimeout(()=>setShareNote(''),2500);
    }catch(e){ setShareNote(''); }
  };
  const entryOf=(s,r)=>({root:s.root,q:s.q,frets:fretsOf(r)});
  // 선택한 마디에 폼을 넣고(이미 있으면 바꾸고) 다음 마디를 고른 상태로 넘어간다
  const putForm=r=>{ setState(s=>withProg(s,p=>p.map((e,j)=>j===sl?entryOf(s,r):e))); setSel(Math.min(sl+1,prog.length-1)); };
  const delSel=()=>{ pick('pdel',String(sl)); };

  // 폼 카드 순서: 앞뒤 마디에 코드가 없으면 낮은 프렛부터. 있으면 앞뒤 폼에서 이동이 적은 순
  // (다시 고르는 마디의 이웃 폼은 그대로 두므로 어긋남이 생기지 않는다).
  const bi=[...filled].reverse().find(i=>i<sl);
  const ai=filled.find(i=>i>sl);
  const before=bi!==undefined?resolved[bi]:undefined;
  const after=ai!==undefined?resolved[ai]:undefined;
  const shown=useMemo(()=>{
    const items=list.map((res,i)=>({res,i,cost:(before?moveCost(before,res):0)+(after?moveCost(res,after):0)}));
    if(before||after) items.sort((a,b)=>a.cost-b.cost||a.i-b.i);
    return items;
  },[list,before,after]);
  const refs=[bi!==undefined?{i:bi,tag:'이전 폼'}:null,ai!==undefined?{i:ai,tag:'다음 폼'}:null].filter(Boolean);
  const curKey=selFilled?keyOf(prog[sl].root,prog[sl].q,prog[sl].frets):null;
  const hand=r=>handPos(r);
  const gap=(a,b)=>Math.abs(hand(a)-hand(b));
  const moveText=d=>d===0?'제자리':`${d}프렛 이동`;

  // 진행 전체 이동 합
  const moved=filled.reduce((sum,idx,k)=>k?sum+gap(resolved[filled[k-1]],resolved[idx]):0,0);

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
    nCards=filled.length;
    cards=filled.map((i,k)=>{
      const c=prog[i],res=resolved[i],name=chordName(c);
      const d=k?gap(resolved[filled[k-1]],res):null;
      return (
        <figure className="card" key={i+keyOf(c.root,c.q,c.frets)}>
          <figcaption>
            <div className="who"><b>{i+1}마디 {name}</b><span>{res.bass}번 줄 베이스{d===null?null:<> · <span className="move">{moveText(d)}</span></>}</span></div>
            <div className="capr"><div className="pos">{res.baseFret===0?'개방':res.baseFret+'프렛'}</div></div>
          </figcaption>
          <Diagram res={res} rootPc={c.root} quality={QUALITIES.find(x=>x.id===c.q)} label={label} names={nm} aria={ariaFor(res,name)}/>
        </figure>
      );
    });
    count=`진행 ${filled.length}개 · 총 손 이동 ${moved}프렛 · 위치는 검지가 놓이는 프렛`;
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
              {selFilled
                ?<Chip k="frep" v={String(i)} className="plus" onPick={()=>putForm(res)} aria-label={`${sl+1}마디를 이 폼으로 바꾸기`}>↺</Chip>
                :<Chip k="fadd" v={String(i)} className="plus" onPick={()=>putForm(res)} aria-label={`${sl+1}마디에 ${sym} 폼 넣기`}>+</Chip>}
            </div>
          </figcaption>
          <Diagram res={res} rootPc={root} quality={q} label={label} names={nm} aria={ariaFor(res,sym)}/>
        </figure>
      );
    }):<div className="empty"><p>이 코드의 폼 데이터가 아직 없어요.</p></div>;
    count=`폼 ${shown.length}개`+(selFilled?` · ${sl+1}마디를 앞뒤 폼과 가까운 순`:before||after?' · 앞뒤 폼에서 가까운 순':'');
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

        <div className="prog">
          <div className="plist">
            <input className="titlein" type="text" data-k="ptitle" value={lists[cur].title} maxLength={MAX_TITLE} placeholder={`진행 ${cur+1} 제목`}
              aria-label="진행 제목" onChange={e=>pick('ptitle',e.target.value)}/>
            <div className="prow">
              <select className="sel" data-k="pswitch" aria-label="진행 선택" value={String(cur)} onChange={e=>switchList(e.target.value)}>
                {lists.map((l,i)=><option key={i} value={String(i)}>{l.title||`진행 ${i+1}`}</option>)}
              </select>
              <Chip k="pnew" v="" disabled={lists.length>=MAX_LISTS} onPick={newProg}>＋ 새 진행</Chip>
              <Chip k="plistdel" v="" on={confirmDel||undefined} onPick={deleteProg}>{confirmDel?'정말 삭제':'진행 삭제'}</Chip>
            </div>
          </div>
          <div className="chart" aria-label="코드 차트">
            <div className="bars">
              {prog.map((c,i)=>(
                <button key={i} type="button" className={'bar'+(sl===i?' picked':'')+(c?'':' blank')} data-k="bar" data-v={String(i)}
                  aria-pressed={String(sl===i)} aria-label={c?`${i+1}마디 ${chordName(c)} 선택`:`${i+1}마디 비어 있음, 선택`} onClick={()=>choose(i)}>
                  <small className="bn">{i+1}</small>
                  {c?<span className="bc"><b>{chordName(c)}</b><small>{resolved[i].baseFret===0?'개방':resolved[i].baseFret+'프렛'}</small></span>
                    :<span className="bc"><em>비어 있음</em></span>}
                </button>
              ))}
            </div>
            {prog.length<MAX_PROG&&<button type="button" className="chip addbar" data-k="padd" onClick={addBar} aria-label="다음 마디 추가">＋ 마디 추가</button>}
          </div>
          <div className="prog-actions">
            <span className="selname">{sl+1}마디 선택됨 · {selFilled?`${chordName(prog[sl])} (다른 폼은 아래에서 ↺)`:'아래에서 코드를 고르고 +'}{filled.length>1?` · 총 손 이동 ${moved}프렛`:''}</span>
            {selFilled&&<Chip k="pdel" v={String(sl)} onPick={delSel}>마디 비우기</Chip>}
            {filled.length>0&&<Chip k="pview" v="" on={showAll} onPick={()=>setShowAll(v=>!v)}>{viewAll?'폼 고르기':'진행 보기'}</Chip>}
            {filled.length>0&&<Chip k="pshare" v="" onPick={shareProg}>{shareNote||'링크 복사'}</Chip>}
            {filled.length>0&&<Chip k="pclear" v="" onPick={(k,v)=>{ pick(k,v); setSel(0); setShowAll(false); }}>전체 비우기</Chip>}
          </div>
          {shareUrl&&<input className="shareurl" readOnly value={shareUrl} aria-label="공유 링크" onFocus={e=>e.target.select()}/>}
        </div>

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
