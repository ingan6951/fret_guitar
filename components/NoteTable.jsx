'use client';
// 지판 음계 표: 줄(1~6번)×프렛(0~24)의 음이름.
// 보기 모드: 지금 고른 코드의 구성음을 표시하고, 음을 누르면 같은 음이 지판 어디에 있는지 모두 밝힌다.
// edit 모드: 누른 음을 진행의 고른 마디 멜로디에 넣는다(음을 고른 상태면 그 음을 바꾼다).
import {useState} from 'react';
import {pcOfNote,MAX_FRET} from '../lib/fretlogic.js';
import {MAX_NOTES} from '../lib/settings.js';
import {useGuide} from './GuideProvider.jsx';

const FRETS=MAX_FRET+1; // 프렛 0~24

export default function NoteTable({edit=false}){
  const g=useGuide();
  const {nm,root,q,sel,selBar,selNote}=g;
  const [focus,setFocus]=useState(null); // 보기 모드에서 눌러 본 음(pc)
  const tones=new Set(q.tones.map(x=>(root+x)%12));
  const full=edit&&sel.i<0&&selBar.notes.length>=MAX_NOTES;
  // 이 마디 멜로디에서 그 자리의 음이 몇 번째인지 (같은 자리를 여러 번 쓰면 모두)
  const orders=(s,f)=>edit?selBar.notes.map((x,i)=>x.s===s&&x.f===f?i+1:0).filter(Boolean):[];
  return (
    <div className="notetable" role="group" aria-label={edit?'멜로디 음 고르기':'지판 음계'}>
      <div className="nscroll">
        <div className="ngrid" style={{gridTemplateColumns:`34px repeat(${FRETS},minmax(34px,1fr))`}}>
          <span className="nh"></span>
          {Array.from({length:FRETS},(_,f)=><span key={f} className="nh">{f}</span>)}
          {[5,4,3,2,1,0].map(si=>[
            <span key={'l'+si} className="nl">{6-si}</span>,
            ...Array.from({length:FRETS},(_,f)=>{
              const pc=pcOfNote(si,f);
              const on=edit&&!!selNote&&selNote.s===si&&selNote.f===f;
              const cls='ncell'+(f===0?' open':'')+(on?' on':'')+(orders(si,f).length&&!on?' used':'')
                +(!edit&&tones.has(pc)?(pc===root?' rt':' ct'):'')+(!edit&&focus===pc?' pf':'');
              return <button key={si+'.'+f} type="button" data-k="nnote" data-v={si+'.'+f} className={cls}
                aria-pressed={edit?String(on):String(focus===pc)} disabled={edit&&full}
                aria-label={edit?`${nm[pc]}, ${6-si}번 줄 ${f===0?'개방현':f+'프렛'}, ${sel.bar+1}마디 멜로디${selNote?'에서 바꾸기':'에 더하기'}${orders(si,f).length?`, 지금 ${orders(si,f).join('·')}번째 음`:''}`:`${nm[pc]}, ${6-si}번 줄 ${f===0?'개방현':f+'프렛'}`}
                onClick={()=>edit?g.putNote(si,f):setFocus(v=>v===pc?null:pc)}>{nm[pc]}{orders(si,f).length>0&&<sup className="ord">{orders(si,f).join(',')}</sup>}</button>;
            })
          ])}
        </div>
      </div>
      {!edit&&<div className="nlegend">
        <span><i className="lg rt"></i>근음</span>
        <span><i className="lg ct"></i>구성음</span>
        <span><i className="lg pf"></i>{focus===null?'음을 누르면 같은 음을 모두 표시':`누른 음 ${nm[focus]} (같은 음 모두)`}</span>
      </div>}
    </div>
  );
}
