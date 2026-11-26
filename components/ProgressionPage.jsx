'use client';
// 진행 페이지: 이름·목록·마디 관리, 공유, 마디에 담은 항목을 차례로 보기
import {isNote,fretsOf} from '../lib/fretlogic.js';
import {QUALITIES} from '../lib/fretlogic.js';
import {useGuide} from './GuideProvider.jsx';
import ProgBar from './ProgBar.jsx';
import Diagram,{ariaFor} from './Diagram.jsx';

const moveText=d=>d===0?'제자리':`${d}프렛 이동`;

export default function ProgressionPage(){
  const g=useGuide();
  const {prog,resolved,filled,chordIdx,nm,label,chordName,noteWhere,moved}=g;
  const cards=filled.map(i=>{
    const c=prog[i],res=resolved[i],name=chordName(c);
    const pos=<div className="capr"><div className="pos">{res.baseFret===0?'개방':res.baseFret+'프렛'}</div></div>;
    if(isNote(c)) return (
      <figure className="card" key={i+'n'+c.s+'.'+c.f}>
        <figcaption><div className="who"><b>{i+1}마디 {name}</b><span>지판음 · {noteWhere(c)}</span></div>{pos}</figcaption>
        <Diagram res={res} rootPc={-1} quality={null} label={label} names={nm} aria={`${name}, ${noteWhere(c)}`}/>
      </figure>
    );
    const k=chordIdx.indexOf(i),d=k>0?g.gap(resolved[chordIdx[k-1]],res):null;
    return (
      <figure className="card" key={i+JSON.stringify(c.frets)+c.root+c.q}>
        <figcaption>
          <div className="who"><b>{i+1}마디 {name}</b><span>{res.bass}번 줄 베이스{d===null?null:<> · <span className="move">{moveText(d)}</span></>}</span></div>
          {pos}
        </figcaption>
        <Diagram res={res} rootPc={c.root} quality={QUALITIES.find(x=>x.id===c.q)} label={label} names={nm} aria={ariaFor(res,name)}/>
      </figure>
    );
  });
  return (
    <main className="stage wide">
      <ProgBar full/>
      {filled.length>0
        ?<><p className="count">{`진행 ${filled.length}개 · 총 손 이동 ${moved}프렛 · 위치는 검지가 놓이는 프렛`}</p>
          <div className="cards" aria-label="진행 폼 목록">{cards}</div></>
        :<div className="empty"><p>아직 담은 코드가 없어요. 코드 폼·지판음 페이지에서 마디를 고르고 넣어 보세요.</p></div>}
    </main>
  );
}
