'use client';
// 합주 방 페이지 (/room/?id=...): 방장은 곡을 재생·정지하고 빠르기를 바꾸며, 참여자는 소리를 켜고 같은 박을 듣는다.
// 들어오면 먼저 듣는 기기(스피커·유선 / 블루투스)를 골라 이어폰 지연을 맞춘다(기기에 저장, 다음엔 묻지 않음).
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useGuide} from './GuideProvider.jsx';
import useRoom from './useRoom.js';
import {LeadSetup,LeadSetting} from './LeadSetup.jsx';
import TempoBar from './TempoBar.jsx';
import {Chip} from './ui.jsx';
import {cleanRoomId} from '../lib/sync.js';
import {createMetronome,epochMs} from '../lib/metronome.js';

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
        {/* 듣는 기기를 고르기 전에는 재생 버튼 대신 맞추기 단계 (방장 귀에도 같은 박이어야 하므로) */}
        {room.output
          ?<TempoBar m={{playing:!!room.grid.playing,pos:room.pos,supported:room.supported,toggle:room.grid.playing?room.stop:room.play}}/>
          :<LeadSetup room={room}/>}
        <section className="foot" aria-label="방 링크">
          <Chip k="roomcopy" v="" onPick={copyRoom}>{copyNote||'방 링크 복사'}</Chip>
          <p className="count">이 링크로 들어온 사람은 듣는 기기를 고르고 참여하면, 방장이 재생할 때 같은 박을 들어요. 곡은 진행 페이지에서 바꿀 수 있어요.</p>
          {copyUrl&&<input className="shareurl" readOnly value={copyUrl} aria-label="방 링크" onFocus={e=>e.target.select()}/>}
        </section>
      </>:!room.output?<LeadSetup room={room}/>:(
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

      {room.output&&<LeadSetting room={room}/>}
    </main>
  );
}
