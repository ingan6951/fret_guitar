'use client';
// 지판음 페이지: 지판 전체를 음이름 버튼으로 보여 주고, 누른 음을 선택한 마디에 넣는다
import {pcOfNote,isNote} from '../lib/fretlogic.js';
import {useGuide} from './GuideProvider.jsx';
import ProgBar from './ProgBar.jsx';

const PICK_FRETS=16; // 프렛 0~15

export default function NotePage(){
  const g=useGuide();
  const {prog,sl,nm,selFilled}=g;
  const cur=selFilled&&isNote(prog[sl])?prog[sl]:null;
  return (
    <main className="stage wide">
      <ProgBar/>
      <div className="notepick" role="group" aria-label="지판음 고르기">
        <p className="count">{sl+1}마디에 넣을 음을 지판에서 누르세요{cur?` · 지금 ${g.chordName(cur)} (${g.noteWhere(cur)})`:''}</p>
        <div className="nscroll">
          <div className="ngrid" style={{gridTemplateColumns:`46px repeat(${PICK_FRETS},minmax(34px,1fr))`}}>
            <span className="nh"></span>
            {Array.from({length:PICK_FRETS},(_,f)=><span key={f} className="nh">{f}</span>)}
            {[5,4,3,2,1,0].map(si=>[
              <span key={'l'+si} className="nl">{6-si}번</span>,
              ...Array.from({length:PICK_FRETS},(_,f)=>{
                const pc=pcOfNote(si,f),on=!!cur&&cur.s===si&&cur.f===f;
                return <button key={si+'.'+f} type="button" data-k="nnote" data-v={si+'.'+f} aria-pressed={String(on)}
                  className={'ncell'+(f===0?' open':'')+(on?' on':'')} onClick={()=>g.putNote(si,f)}
                  aria-label={`${nm[pc]}, ${6-si}번 줄 ${f===0?'개방현':f+'프렛'}, ${sl+1}마디에 넣기`}>{nm[pc]}</button>;
              })
            ])}
          </div>
        </div>
      </div>
    </main>
  );
}
