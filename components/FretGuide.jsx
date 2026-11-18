'use client';
// 운지 가이드 화면 전체. 상태는 하나의 객체로 두고 브라우저에 저장한다.
import {useEffect,useMemo,useState} from 'react';
import {NOTE_SHARP,NOTE_FLAT,QUALITIES,maskFor,hasForms,collect,handPos,planProgression} from '../lib/fretlogic.js';
import {DEFAULT,MAX_PROG,loadState,saveState} from '../lib/settings.js';
import Diagram,{ariaFor} from './Diagram.jsx';

const RS=[['1','1'],['2','2'],['3','3'],['4','4'],['5','5'],['6','6'],['all','전체']];
const LAYOUTS=[['adj','붙여서','인접한 줄'],['skip','쉘','한 줄 건너뛰기']];
const LABELS=[['finger','손가락'],['note','음이름'],['degree','도수']];
const MODES=[['chord','코드'],['prog','진행']];

function Chip({k,v,on,disabled,onPick,children,className='chip',...rest}){
  return (
    <button className={className} type="button" data-k={k} data-v={v} aria-pressed={on===undefined?undefined:String(on)}
      disabled={disabled} onClick={()=>onPick(k,v)} {...rest}>{children}</button>
  );
}

export default function FretGuide(){
  const [state,setState]=useState(DEFAULT);
  const [ready,setReady]=useState(false);

  useEffect(()=>{ const s=loadState(); if(s) setState(s); setReady(true); },[]);
  useEffect(()=>{ if(ready) saveState(state); },[state,ready]);

  const pick=(k,v)=>setState(s=>{
    switch(k){
      case 'root': return {...s,root:Number(v)};
      case 'q': return {...s,q:v};
      case 'rs': return {...s,rs:v==='all'?'all':Number(v)};
      case 'label': return {...s,label:v};
      case 'lay': return {...s,layout:v};
      case 'mode': return {...s,mode:v};
      case 'acc': return {...s,flat:v==='flat'};
      case 'oct': return {...s,octave:!s.octave};
      case 't': { const t=s.t.slice(); t[Number(v)]=!t[Number(v)]; return {...s,t}; }
      case 'padd': return s.prog.length<MAX_PROG?{...s,prog:[...s.prog,{root:s.root,q:s.q}]}:s;
      case 'pdel': return {...s,prog:s.prog.filter((_,j)=>j!==Number(v))};
      case 'pclear': return {...s,prog:[]};
      default: return s;
    }
  });

  const {root,q:qid,rs,t,layout,label,flat,octave,mode,prog}=state;
  const nm=flat?NOTE_FLAT:NOTE_SHARP;
  const q=QUALITIES.find(x=>x.id===qid);
  const sym=nm[root]+q.suffix;
  const chordName=c=>nm[c.root]+QUALITIES.find(x=>x.id===c.q).suffix;
  const isProg=mode==='prog';

  const list=useMemo(()=>isProg?[]:collect(root,qid,rs,octave,t,layout),[isProg,root,qid,rs,octave,t,layout]);
  const plan=useMemo(()=>isProg&&prog.length?planProgression(prog,rs,t,layout):null,[isProg,prog,rs,t,layout]);
  const needOct=!isProg&&list.some(r=>r.canOctave);

  // 지금 고른 다른 값과 합쳤을 때 폼이 하나도 없는 선택지는 비활성화한다 (고른 버튼은 그대로 둔다)
  const qOff=id=>id!==qid&&!hasForms(id,rs,t,layout);
  const rsOff=v=>v!==String(rs)&&!hasForms(qid,v==='all'?'all':Number(v),t,layout);
  const layOff=v=>v!==layout&&!hasForms(qid,rs,t,v);
  // 구성음 칩: 켜면 폼이 하나도 없어지거나, 마지막 하나를 끄게 되는 칩은 비활성화한다
  const tOff=i=>{ if(i>=q.tones.length) return true; const next=t.slice(); next[i]=!next[i]; return !hasForms(qid,rs,next,layout); };

  let cards,count,solo=false;
  if(!isProg){
    solo=list.length===1;
    cards=list.length?list.map((res,i)=>(
      <figure className="card" key={i+res.notes.map(n=>n?n.fret:'x').join(',')}>
        <figcaption>
          <div className="who"><b>{res.bass}번 줄 베이스</b><span>{res.formName}</span></div>
          <div className="pos">{res.baseFret===0?'개방':res.baseFret+'프렛'}</div>
        </figcaption>
        <Diagram res={res} rootPc={root} label={label} names={nm} aria={ariaFor(res,sym)}/>
      </figure>
    )):<div className="empty"><p>이 조건으로 잡히는 폼이 없어요.</p><p>구성음이나 베이스를 바꿔 보세요.</p></div>;
    count=`폼 ${list.length}개 · ${maskFor(qid,t).length}음`+(layout==='skip'?' · 쉘: 건너뛴 줄은 옆 손가락으로 살짝 닿아 소리를 막아 주세요':'');
  }else if(!prog.length){
    cards=<div className="empty"><p>코드를 고르고 &quot;+ 추가&quot;를 눌러 진행을 만드세요.</p><p>손 이동이 가장 적은 폼을 골라 차례로 보여줘요.</p></div>;
    count=`최대 ${MAX_PROG}개`;
  }else{
    let moved=0,prev=null;
    cards=prog.map((c,i)=>{
      const res=plan.pick[i],name=chordName(c);
      if(!res){ prev=null; return <div className="empty" key={i}><p>{i+1}. {name}: 지금 구성음·베이스·줄 배치로는 잡히는 폼이 없어요.</p></div>; }
      const d=prev?Math.abs(handPos(res)-handPos(prev)):null;
      if(d!==null) moved+=d;
      prev=res;
      const hp=handPos(res);
      return (
        <figure className="card" key={i}>
          <figcaption>
            <div className="who"><b>{i+1}. {name}</b><span>{res.bass}번 줄 베이스{d===null?null:<> · <span className="move">{d===0?'제자리':`${d}프렛 이동`}</span></>}</span></div>
            <div className="pos">{hp===0?'개방':hp+'프렛'}</div>
          </figcaption>
          <Diagram res={res} rootPc={c.root} label={label} names={nm} aria={ariaFor(res,name)}/>
        </figure>
      );
    });
    count=`코드 ${prog.length}개 · 총 손 이동 ${moved}프렛 · 위치는 검지가 놓이는 프렛`+(layout==='skip'?' · 쉘':'');
  }

  return (
    <div className="app">
      <header className="top">
        <h1>운지 가이드</h1>
        <div className="seg compact" role="group" aria-label="보기">
          {MODES.map(([v,l])=><Chip key={v} k="mode" v={v} on={mode===v} onPick={pick}>{l}</Chip>)}
        </div>
      </header>

      <section className="rail" aria-label="코드 선택">
        <div className="group">
          <h2 id="h-root">근음</h2>
          <div className="roots" role="group" aria-labelledby="h-root">
            {NOTE_SHARP.map((_,i)=>(
              <Chip key={i} k="root" v={String(i)} on={root===i} onPick={pick}>
                <span>{nm[i]}</span><small>{NOTE_SHARP[i]!==NOTE_FLAT[i]?(flat?NOTE_SHARP[i]:NOTE_FLAT[i]):''}</small>
              </Chip>
            ))}
          </div>
        </div>
        <div className="group">
          <h2 id="h-qual">코드</h2>
          <div className="seg" role="group" aria-labelledby="h-qual">
            {QUALITIES.map(x=><Chip key={x.id} k="q" v={x.id} on={qid===x.id} disabled={qOff(x.id)} onPick={pick}>{x.label}</Chip>)}
          </div>
        </div>
        <div className="group">
          <h2 id="h-t">구성음</h2>
          <div className="seg row4" role="group" aria-labelledby="h-t">
            {['1','3','5','7'].map((l,i)=>(
              <Chip key={i} k="t" v={String(i)} on={i<q.tones.length&&t[i]} disabled={tOff(i)} onPick={pick}>
                <span>{l}</span><small>{i<q.tones.length?nm[(root+q.tones[i])%12]:''}</small>
              </Chip>
            ))}
          </div>
        </div>
        <div className="group">
          <h2 id="h-lay">줄 배치</h2>
          <div className="seg row2" role="group" aria-labelledby="h-lay">
            {LAYOUTS.map(([v,l,d])=><Chip key={v} k="lay" v={v} on={layout===v} disabled={layOff(v)} onPick={pick}><span>{l}</span><small>{d}</small></Chip>)}
          </div>
        </div>
        <div className="group">
          <h2 id="h-rs">베이스</h2>
          <div className="seg row7" role="group" aria-labelledby="h-rs">
            {RS.map(([v,l])=><Chip key={v} k="rs" v={v} on={String(rs)===v} disabled={rsOff(v)} onPick={pick}>{l}</Chip>)}
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
          <div className="tools">
            <div className="seg compact" role="group" aria-label="표시 방식">
              {LABELS.map(([v,l])=><Chip key={v} k="label" v={v} on={label===v} onPick={pick}>{l}</Chip>)}
            </div>
            <div className="seg compact" role="group" aria-label="음 이름 표기">
              <Chip k="acc" v="sharp" on={!flat} onPick={pick} aria-label="샤프 표기">♯</Chip>
              <Chip k="acc" v="flat" on={flat} onPick={pick} aria-label="플랫 표기">♭</Chip>
            </div>
            {needOct&&<Chip k="oct" v="" on={octave} onPick={pick}>한 옥타브 위로</Chip>}
          </div>
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
            <div className="picker">
              <label>근음
                <select aria-label="추가할 근음" value={String(root)} onChange={e=>pick('root',e.target.value)}>
                  {nm.map((n,i)=><option key={i} value={String(i)}>{n}</option>)}
                </select>
              </label>
              <label>코드
                <select aria-label="추가할 코드" value={qid} onChange={e=>pick('q',e.target.value)}>
                  {QUALITIES.map(x=><option key={x.id} value={x.id} disabled={qOff(x.id)}>{x.label}</option>)}
                </select>
              </label>
              <div className="prog-actions">
                <Chip k="padd" v="" className="chip add" disabled={prog.length>=MAX_PROG} onPick={pick}>+ {sym} 추가</Chip>
                <Chip k="pclear" v="" disabled={!prog.length} onPick={pick}>비우기</Chip>
              </div>
            </div>
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
