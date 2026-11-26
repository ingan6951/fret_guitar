'use client';
// 곡의 메트로놈 줄: 재생/정지, 빠르기(BPM: −/+·직접 입력·탭), 박자(n/4), 지금 박 표시
import {useEffect,useRef,useState} from 'react';
import {MIN_BPM,MAX_BPM,BEAT_OPTIONS,cleanBpm} from '../lib/settings.js';
import {useGuide} from './GuideProvider.jsx';

export default function TempoBar({m,sticky=false}){
  const g=useGuide();
  const {bpm,beats}=g;
  const [txt,setTxt]=useState(String(bpm));
  useEffect(()=>{ setTxt(String(bpm)); },[bpm]);
  const setBpm=v=>g.pick('pbpm',String(cleanBpm(v)));

  // 탭 템포: 2초 안에 이어서 누른 마지막 몇 번의 간격 평균
  const taps=useRef([]);
  const tap=()=>{
    const now=performance.now(),t=taps.current.filter(x=>now-x<2000);
    t.push(now); taps.current=t.slice(-5);
    if(taps.current.length>=2){
      const a=taps.current,d=(a[a.length-1]-a[0])/(a.length-1);
      setBpm(60000/d);
    }
  };

  return (
    <section className={'tempo'+(sticky?' stick':'')} aria-label="메트로놈">
      <button type="button" className={'mplay'+(m.playing?' on':'')} data-k="mplay" data-v="" aria-pressed={String(m.playing)}
        disabled={m.supported===false} onClick={m.toggle}>{m.playing?'■ 정지':'▶ 메트로놈'}</button>
      <div className="bpmbox" role="group" aria-label="빠르기">
        <button type="button" className="chip step" data-k="bpmstep" data-v="-1" aria-label="느리게" disabled={bpm<=MIN_BPM} onClick={()=>setBpm(bpm-1)}>−</button>
        <label className="bpmval">
          <input type="text" inputMode="numeric" data-k="bpm" aria-label="빠르기 (BPM)" value={txt} maxLength={3}
            onChange={e=>{ const v=e.target.value.replace(/\D/g,''); setTxt(v); const n=Number(v); if(n>=MIN_BPM&&n<=MAX_BPM) setBpm(n); }}
            onBlur={()=>{ if(txt) setBpm(txt); setTxt(String(cleanBpm(txt||bpm))); }}
            onKeyDown={e=>{ if(e.key==='Enter') e.currentTarget.blur(); if(e.key==='ArrowUp'){ e.preventDefault(); setBpm(bpm+1); } if(e.key==='ArrowDown'){ e.preventDefault(); setBpm(bpm-1); } }}/>
          <span>BPM</span>
        </label>
        <button type="button" className="chip step" data-k="bpmstep" data-v="1" aria-label="빠르게" disabled={bpm>=MAX_BPM} onClick={()=>setBpm(bpm+1)}>+</button>
      </div>
      <button type="button" className="chip" data-k="tap" onClick={tap} aria-label="박자에 맞춰 눌러 빠르기 정하기">탭</button>
      <select className="sel beatsel" data-k="beats" aria-label="박자" value={String(beats)} onChange={e=>g.pick('pbeats',e.target.value)}>
        {BEAT_OPTIONS.map(n=><option key={n} value={String(n)}>{n}/4</option>)}
      </select>
      <div className="beatdots" aria-hidden="true">
        {Array.from({length:beats},(_,i)=><i key={i} className={(i===0?'one':'')+(m.pos&&m.pos.beat===i?' on':'')}/>)}
      </div>
      {m.supported===false&&<p className="count">이 브라우저에서는 메트로놈 소리를 낼 수 없어요</p>}
    </section>
  );
}
