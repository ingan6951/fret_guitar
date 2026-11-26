'use client';
// 합주 방 페이지 (/room/?id=...): 방장은 곡을 재생·정지하고 빠르기를 바꾸며, 참여자는 소리를 켜고 같은 박을 듣는다.
// 기기마다 이어폰 지연 보정(ms)을 맞출 수 있다.
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useGuide} from './GuideProvider.jsx';
import useRoom,{MAX_LEAD} from './useRoom.js';
import TempoBar from './TempoBar.jsx';
import {Chip} from './ui.jsx';
import {cleanRoomId} from '../lib/sync.js';
import {createMetronome,epochMs} from '../lib/metronome.js';

const CAL_TAPS=8,CAL_BPM=100;

// 이어폰 지연 보정: 슬라이더로 직접, 또는 들리는 클릭에 맞춰 눌러서 잰다
function LeadSetting({lead,setLead}){
  const [cal,setCal]=useState(null); // 재는 중이면 {n: 누른 횟수}
  const R=useRef(null);
  const end=()=>{ if(R.current) R.current.m.close(); R.current=null; setCal(null); };
  useEffect(()=>()=>{ if(R.current) R.current.m.close(); },[]);
  const begin=()=>{
    const m=createMetronome(); if(!m.unlock()) return;
    const d=60000/CAL_BPM,s=epochMs()+600;
    m.start({startAt:s,bpm:CAL_BPM,beats:4,lead:0});
    R.current={m,s,d,diffs:[]}; setCal({n:0});
  };
  // 메트로놈은 브라우저가 아는 출력 지연을 이미 빼고 예약하므로, 들린 클릭에 맞춰 누른 시각 - 예정 시각 ≈ 브라우저도 모르는 지연
  const tap=()=>{
    const r=R.current; if(!r) return;
    const t=epochMs(),k=Math.round((t-r.s)/r.d);
    if(k<1) return;
    r.diffs.push(t-(r.s+k*r.d));
    if(r.diffs.length<CAL_TAPS){ setCal({n:r.diffs.length}); return; }
    const use=r.diffs.slice(2).sort((a,b)=>a-b);
    setLead(use[Math.floor(use.length/2)]); // 처음 두 번은 익숙해지는 중이라 빼고 중앙값
    end();
  };
  return (
    <details className="panel calib">
      <summary>이어폰 지연 보정 <b>{lead}ms</b></summary>
      <p className="count">블루투스 이어폰은 소리가 늦게 들려요(보통 100~250ms). 이 기기에서만 클릭을 그만큼 먼저 냅니다. 유선 이어폰·스피커는 0 근처면 됩니다.</p>
      <label className="leadrow">
        <input type="range" min="0" max={MAX_LEAD} step="5" value={lead} data-k="lead" aria-label="이어폰 지연 보정 (ms)" onChange={e=>setLead(e.target.value)}/>
        <span>{lead}ms</span>
      </label>
      {cal
        ?<div className="calrow">
          <button type="button" className="tapcal" data-k="caltap" onPointerDown={tap} onKeyDown={e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); tap(); } }}>
            들리는 박에 맞춰 누르세요 <small>{cal.n}/{CAL_TAPS}</small></button>
          <Chip k="calstop" v="" onPick={end}>취소</Chip>
        </div>
        :<Chip k="calstart" v="" onPick={begin}>탭으로 맞추기</Chip>}
    </details>
  );
}

function BeatDots({beats,pos}){
  return <div className="beatdots" aria-hidden="true">{Array.from({length:beats},(_,i)=><i key={i} className={(i===0?'one':'')+(pos&&pos.beat===i?' on':'')}/>)}</div>;
}

export default function RoomPage(){
  const g=useGuide();
  const [id,setId]=useState(undefined);
  const [copyNote,setCopyNote]=useState(''),[copyUrl,setCopyUrl]=useState('');
  useEffect(()=>{ setId(cleanRoomId(new URL(window.location.href).searchParams.get('id'))); },[]);
  const mySong={t:g.lists[g.cur].title||`진행 ${g.cur+1}`,bpm:g.bpm,ts:g.beats};
  const room=useRoom(id||null,mySong);

  if(id===undefined) return <main className="stage"/>;
  if(id===null||room.status==='off') return (
    <main className="stage">
      <section className="panel roomerr">
        <h2>합주 방</h2>
        <p>{id===null?'방 링크가 올바르지 않아요. 받은 링크를 다시 확인해 주세요.':'합주 방 서버 설정(Supabase)이 없어 열 수 없어요.'}</p>
        <Link href="/progression" className="chip">진행으로 가기</Link>
      </section>
    </main>
  );

  const host=room.role==='host',song=room.song,beats=(room.grid.playing&&room.grid.beats)||(song&&song.ts)||4;
  const statusText=room.status==='error'?'연결 끊김 · 다시 연결하는 중':room.status!=='live'?'연결하는 중…'
    :`접속 ${Math.max(1,room.peers.length)}명`;
  const clockText=host?null:!room.hostOnline?'방장이 아직 들어오지 않았어요'
    :room.clock?`방장과 시계 맞춤 ±${Math.max(1,Math.round(room.clock.err))}ms`:'방장과 시계 맞추는 중…';
  const copyRoom=async()=>{
    const url=new URL(window.location.href); url.pathname='/room/'; url.search=''; url.hash=''; url.searchParams.set('id',id);
    const text=url.toString();
    try{ await navigator.clipboard.writeText(text); setCopyUrl(''); setCopyNote('복사됨'); }
    catch(e){ setCopyUrl(text); setCopyNote('아래 주소를 복사하세요'); }
    setTimeout(()=>setCopyNote(''),2500);
  };

  return (
    <main className="stage room">
      <section className="panel roomhead" aria-label="합주 방">
        <div className="roomtop">
          <h2>합주 방</h2>
          <span className={'badge'+(host?' host':'')}>{host?'방장':'참여자'}</span>
          <span className={'conn'+(room.status==='live'?' ok':'')} role="status">{statusText}</span>
        </div>
        <p className="songline" data-k="song">{song
          ?<><b>{song.t}</b><span>{song.bpm} BPM · {song.ts}/4</span></>
          :<span>방장의 곡을 기다리는 중</span>}</p>
        {clockText&&<p className="count" data-k="clock">{clockText}</p>}
      </section>

      {host?<>
        <TempoBar m={{playing:!!room.grid.playing,pos:room.pos,supported:room.supported,toggle:room.grid.playing?room.stop:room.play}}/>
        <section className="foot" aria-label="방 링크">
          <Chip k="roomcopy" v="" onPick={copyRoom}>{copyNote||'방 링크 복사'}</Chip>
          <p className="count">이 링크로 들어온 사람은 ‘소리 켜고 참여’를 누르면, 방장이 재생할 때 같은 박을 들어요. 곡은 진행 페이지에서 바꿀 수 있어요.</p>
          {copyUrl&&<input className="shareurl" readOnly value={copyUrl} aria-label="방 링크" onFocus={e=>e.target.select()}/>}
        </section>
      </>:(
        <section className="panel guest" aria-label="내 소리">
          {room.ready
            ?<>
              <p className="gstate" role="status">{room.grid.playing?'재생 중':'방장이 재생하면 같이 울려요'}</p>
              <BeatDots beats={beats} pos={room.pos}/>
              <Chip k="gleave" v="" onPick={room.leave}>소리 끄기</Chip>
            </>
            :<button type="button" className="mplay big" data-k="gjoin" data-v="" disabled={room.supported===false} onClick={room.join}>🎧 소리 켜고 참여</button>}
          {room.supported===false&&<p className="count">이 브라우저에서는 메트로놈 소리를 낼 수 없어요</p>}
        </section>
      )}

      <LeadSetting lead={room.lead} setLead={room.setLead}/>
    </main>
  );
}
