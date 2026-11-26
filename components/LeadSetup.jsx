'use client';
// 이어폰 지연 맞추기
//  - LeadSetup: 방에 들어와 처음 보이는 단계. "무엇으로 들으세요?" → 스피커·유선이면 0ms, 블루투스면 탭으로 잰다.
//  - LeadSetting: 고른 뒤 아래에 접혀 있는 보정 메뉴(슬라이더·다시 재기·듣는 기기 다시 고르기)
// 탭으로 재는 동안에는 박을 눈으로 보여 주지 않는다 — 눈으로 맞추면 소리의 지연을 잴 수 없다.
import {useEffect,useRef,useState} from 'react';
import {createMetronome,epochMs} from '../lib/metronome.js';
import {leadFromTaps} from '../lib/sync.js';
import {MAX_LEAD} from './useRoom.js';
import {Chip} from './ui.jsx';

const CAL_BPM=100,CAL_TAPS=8,PERIOD=60000/CAL_BPM;

// 탭 측정: begin()은 반드시 탭/클릭 안에서 (모바일 소리 정책)
function useTapCalibration(){
  const [st,setSt]=useState(null); // null | {n} 재는 중 | {result}
  const R=useRef(null);
  const close=()=>{ if(R.current) R.current.m.close(); R.current=null; };
  useEffect(()=>close,[]);
  const begin=()=>{
    close();
    const m=createMetronome(); if(!m.unlock()) return false;
    const start=epochMs()+600;
    m.start({startAt:start,bpm:CAL_BPM,beats:4,lead:0});
    R.current={m,start,taps:[]}; setSt({n:0});
    return true;
  };
  const tap=()=>{
    const r=R.current; if(!r) return;
    r.taps.push(epochMs());
    const res=leadFromTaps(r.taps,r.start,PERIOD,{need:CAL_TAPS});
    if(res){ close(); setSt({result:{...res,ms:Math.min(MAX_LEAD,res.ms)}}); }
    else setSt({n:Math.min(CAL_TAPS,r.taps.filter(t=>t-r.start>=PERIOD-150).length)});
  };
  const cancel=()=>{ close(); setSt(null); };
  return {st,begin,tap,cancel};
}

function TapPad({n,onTap,onCancel}){
  return (
    <div className="calrow">
      <button type="button" className="tapcal" data-k="caltap" onPointerDown={onTap}
        onKeyDown={e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); onTap(); } }}>
        이어폰에서 들리는 ‘딱’ 소리에 맞춰 누르세요 <small>{n}/{CAL_TAPS} · 화면 말고 소리에 맞춰요</small></button>
      <Chip k="calstop" v="" onPick={onCancel}>취소</Chip>
    </div>
  );
}

export function LeadSetup({room}){
  const host=room.role==='host';
  const cal=useTapCalibration();
  const done=(kind,ms)=>{ room.setOutput(kind,ms); if(!host) room.join(); }; // 참여자는 이 탭으로 바로 소리를 켠다
  const r=cal.st&&cal.st.result;
  return (
    <section className="panel setup" aria-label="듣는 기기 맞추기">
      <h2 className="setuph">무엇으로 들으세요?</h2>
      <p className="count">기기마다 소리가 귀에 닿는 시간이 달라요. 한 번 맞춰 두면 이 기기에서는 다시 묻지 않아요.</p>
      {!cal.st&&<div className="outs">
        <button type="button" className="outbtn" data-k="outwired" onClick={()=>done('wired',0)}>
          <b>🔈 휴대폰 스피커 · 유선 이어폰</b><small>따로 맞출 필요 없어요{host?'':' · 바로 참여'}</small></button>
        <button type="button" className="outbtn" data-k="outbt" onClick={cal.begin}>
          <b>🎧 블루투스 이어폰</b><small>들리는 소리에 맞춰 8번 눌러 지연을 잽니다</small></button>
      </div>}
      {cal.st&&!r&&<TapPad n={cal.st.n} onTap={cal.tap} onCancel={cal.cancel}/>}
      {r&&<div className="calres" role="status">
        <p>측정한 지연 <b data-k="calms">{r.ms}ms</b></p>
        {!r.ok&&<p className="warn">누른 박자가 고르지 않아요. 다시 재면 더 정확해요.</p>}
        <div className="outs2">
          <button type="button" className="mplay" data-k="outok" onClick={()=>done('bt',r.ms)}>{host?'이 값으로 정하기':'이 값으로 참여'}</button>
          <Chip k="calagain" v="" onPick={cal.begin}>다시 재기</Chip>
        </div>
      </div>}
    </section>
  );
}

export function LeadSetting({room}){
  const cal=useTapCalibration();
  const r=cal.st&&cal.st.result;
  return (
    <details className="panel calib">
      <summary>{room.output==='bt'?'🎧 블루투스 이어폰':'🔈 스피커 · 유선'} · 지연 보정 <b>{room.lead}ms</b></summary>
      <p className="count">소리가 다른 사람보다 늦게 들리면 값을 올리고, 일찍 들리면 내리세요.</p>
      <label className="leadrow">
        <input type="range" min="0" max={MAX_LEAD} step="5" value={room.lead} data-k="lead" aria-label="이어폰 지연 보정 (ms)" onChange={e=>room.setLead(e.target.value)}/>
        <span>{room.lead}ms</span>
      </label>
      {cal.st&&!r&&<TapPad n={cal.st.n} onTap={cal.tap} onCancel={cal.cancel}/>}
      {r&&<div className="calres" role="status">
        <p>측정한 지연 <b>{r.ms}ms</b>{!r.ok&&<span className="warn"> · 고르지 않아요, 다시 재 보세요</span>}</p>
        <div className="outs2">
          <Chip k="caluse" v="" onPick={()=>{ room.setOutput('bt',r.ms); cal.cancel(); }}>이 값으로</Chip>
          <Chip k="calagain" v="" onPick={cal.begin}>다시 재기</Chip>
        </div>
      </div>}
      {!cal.st&&<div className="outs2">
        <Chip k="calstart" v="" onPick={cal.begin}>탭으로 다시 재기</Chip>
        <Chip k="outreset" v="" onPick={()=>room.setOutput(null)}>듣는 기기 다시 고르기</Chip>
      </div>}
    </details>
  );
}
