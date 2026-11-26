'use client';
// 합주 방: 방장이 재생하면 모든 참여자의 메트로놈이 같은 박에 울린다.
//  - 방장: 박자 격자(lib/sync.js)를 정해 state로 알리고, 참여자의 ping에 자기 시계로 답한다.
//  - 참여자: ping으로 방장 시계와의 차이를 재고, 격자를 자기 오디오 시계로 바꿔 예약한다.
//  - 각 기기: 이어폰 지연(lead, ms)만큼 클릭을 먼저 낸다. 이 값은 기기마다 따로 저장한다.
import {useEffect,useRef,useState} from 'react';
import {createMetronome,audioSupported} from '../lib/metronome.js';
import {joinRoom,roomConfigured} from '../lib/room.js';
import {epochNow,pingSample,estimateOffset,retime,gridKey} from '../lib/sync.js';

const ROOMS_KEY='fretguide.rooms',LEAD_KEY='fretguide.lead';
export const START_DELAY=1500;  // 방장이 누른 뒤 첫 박까지: 메시지가 모두에게 닿을 여유
export const RETIME_AHEAD=700;  // 재생 중 빠르기를 바꾸면 이만큼 뒤의 박부터
export const MAX_LEAD=400;
const PINGS=8,PING_GAP=150,RESYNC=30000,KEEP=24;
const REALIGN=200; // 다시 맞출 때 건너뛰는 시간(ms): 이미 예약된 클릭과 겹치지 않게

const readJSON=(k,d)=>{ try{ const v=JSON.parse(localStorage.getItem(k)); return v??d; }catch(e){ return d; } };
export function rememberHostRoom(id){
  const a=readJSON(ROOMS_KEY,[]);
  try{ localStorage.setItem(ROOMS_KEY,JSON.stringify([id,...(Array.isArray(a)?a:[]).filter(x=>x!==id)].slice(0,20))); }catch(e){}
}
const isHostOf=id=>{ const a=readJSON(ROOMS_KEY,[]); return Array.isArray(a)&&a.includes(id); };
export const loadLead=()=>{ const v=Number(readJSON(LEAD_KEY,0)); return Number.isFinite(v)?Math.min(MAX_LEAD,Math.max(0,Math.round(v))):0; };
const newMe=()=>Math.random().toString(36).slice(2,10);

export default function useRoom(id,song){ // song(방장만): {t,bpm,ts} — 방장 화면의 지금 곡
  const [role,setRole]=useState(null);           // 'host' | 'guest'
  const [status,setStatus]=useState('connecting'); // 'off'(설정 없음) | 'connecting' | 'live' | 'error'
  const [peers,setPeers]=useState([]);
  const [clock,setClock]=useState(null);         // {offset, err} ms
  const [remoteSong,setRemoteSong]=useState(null);
  const [grid,setGridState]=useState({playing:false});
  const [ready,setReadyState]=useState(false);   // 이 기기에서 소리를 내는 중(참여)
  const [pos,setPos]=useState(null);
  const [lead,setLeadState]=useState(0);
  const [supported,setSupported]=useState(null);

  const R=useRef({role:null,grid:{playing:false},clock:null,ready:false,lead:0,song:null,conn:null,me:null,samples:[],applied:'stop',appliedGrid:'stop',lastV:0});
  const met=useRef(null);
  const getMet=()=>met.current||(met.current=createMetronome({onBeat:setPos}));

  // 지금 격자·시계·보정값을 이 기기 메트로놈에 반영한다 (같으면 아무것도 안 함)
  const apply=()=>{
    const r=R.current,g=r.grid;
    if(!r.ready||!g.playing||!r.clock){
      if(met.current&&r.applied!=='stop'){ met.current.stop(); setPos(null); }
      r.applied='stop'; r.appliedGrid='stop';
      return;
    }
    const gk=gridKey(g),tail=`|${Math.round(r.clock.offset)}|${r.lead}`,key=gk+tail;
    if(key===r.applied) return;
    const m=getMet(); m.setLead(r.lead);
    const time=g.anchor-r.clock.offset; // 방장 시각 → 이 기기 시각
    const wasPlaying=r.applied!=='stop';
    // 같은 시계로 빠르기만 바뀌었으면 끊지 않고 그 박부터 이어 간다
    const sameClock=wasPlaying&&r.applied.endsWith(tail);
    if(!(sameClock&&gk!==r.appliedGrid&&m.changeAt({time,index:g.index,bpm:g.bpm,beats:g.beats})))
      m.start({startAt:time,index0:g.index,bpm:g.bpm,beats:g.beats,lead:r.lead,skip:wasPlaying?REALIGN:undefined});
    r.applied=key; r.appliedGrid=gk;
  };
  const setGrid=g=>{ R.current.grid=g; setGridState(g); apply(); };
  const broadcast=()=>{ const r=R.current; if(r.role==='host'&&r.conn) r.conn.send('state',{v:epochNow(),song:r.song,grid:r.grid}); };

  // 방장: 곡(빠르기·박 수·제목)이 바뀌면 알리고, 재생 중이면 다음 박부터 새 빠르기로
  const songKey=song?`${song.t}|${song.bpm}|${song.ts}`:'';
  useEffect(()=>{
    const r=R.current; if(!song) return;
    r.song={t:song.t,bpm:song.bpm,ts:song.ts};
    if(r.role!=='host') return;
    const g=r.grid;
    if(g.playing&&(g.bpm!==song.bpm||g.beats!==song.ts)) setGrid(retime(g,epochNow()+RETIME_AHEAD,{bpm:song.bpm,beats:song.ts}));
    broadcast();
  },[songKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{
    setSupported(audioSupported());
    const l=loadLead(); R.current.lead=l; setLeadState(l);
    if(!id) return;
    if(!roomConfigured()){ setStatus('off'); return; }
    const r=R.current;
    r.role=isHostOf(id)?'host':'guest'; setRole(r.role);
    r.me=newMe();
    if(r.role==='host'){ r.clock={offset:0,err:0}; setClock(r.clock); }
    const timers=[];
    // 시계는 방장이 접속자 목록에 보일 때(처음·다시 들어올 때) 재고, 그 뒤로는 RESYNC마다 다시 잰다
    const pingBurst=()=>{
      for(let n=0;n<PINGS;n++) timers.push(setTimeout(()=>{ if(r.conn) r.conn.send('ping',{from:r.me,n,t0:epochNow()}); },n*PING_GAP)); };
    let hostSeen=false;

    r.conn=joinRoom(id,{me:r.me,role:r.role,
      onStatus:s=>{
        if(s==='SUBSCRIBED'){
          setStatus('live');
          if(r.role==='host') broadcast(); else r.conn.send('hello',{from:r.me});
        }else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT') setStatus('error');
      },
      onPeers:list=>{
        setPeers(list);
        // 방장이 나중에 들어오면(또는 다시 들어오면) 상태를 다시 받고 시계를 다시 잰다
        const h=list.some(p=>p.role==='host');
        if(r.role==='guest'&&h&&!hostSeen){ r.conn.send('hello',{from:r.me}); pingBurst(); }
        hostSeen=h;
      },
      onMsg:(ev,p)=>{
        if(r.role==='host'){
          if(ev==='hello') broadcast();
          else if(ev==='ping'&&p.from) r.conn.send('pong',{to:p.from,n:p.n,t0:p.t0,th:epochNow()});
          return;
        }
        if(ev==='state'){
          if(typeof p.v==='number'&&p.v<r.lastV) return; // 늦게 도착한 옛 상태
          r.lastV=p.v||0;
          if(p.song) setRemoteSong(p.song);
          if(p.grid&&typeof p.grid==='object') setGrid(p.grid.playing?p.grid:{playing:false});
        }else if(ev==='pong'&&p.to===r.me){
          r.samples=[...r.samples,pingSample(p.t0,p.th,epochNow())].slice(-KEEP);
          const est=estimateOffset(r.samples);
          // 몇 ms 안쪽의 흔들림으로 다시 맞추지는 않는다
          if(est&&(!r.clock||Math.abs(est.offset-r.clock.offset)>4)){ r.clock=est; setClock(est); apply(); }
          else if(est&&r.clock&&est.err<r.clock.err){ r.clock={...r.clock,err:est.err}; setClock(r.clock); }
        }
      }});
    const resync=r.role==='guest'?setInterval(pingBurst,RESYNC):null;
    // 창을 닫거나 새로고침하면 바로 나간다 (안 그러면 서버가 알아챌 때까지 접속자 수에 남는다)
    const bye=()=>{ if(r.conn){ r.conn.leave(); r.conn=null; } };
    window.addEventListener('pagehide',bye);
    return ()=>{
      window.removeEventListener('pagehide',bye);
      timers.forEach(clearTimeout); if(resync) clearInterval(resync);
      if(r.conn) r.conn.leave(); r.conn=null;
      if(met.current) met.current.close(); met.current=null;
    };
  },[id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- 동작 -----
  const setReady=v=>{ R.current.ready=v; setReadyState(v); apply(); };
  // 참여자: 소리 켜기는 반드시 탭/클릭 안에서 (모바일 소리 정책)
  const join=()=>{ if(!getMet().unlock()){ setSupported(false); return; } setReady(true); };
  const leave=()=>setReady(false);
  // 방장: 재생·정지
  const play=()=>{
    const r=R.current; if(r.role!=='host'||!r.song) return;
    if(!getMet().unlock()){ setSupported(false); return; }
    r.ready=true; setReadyState(true);
    setGrid({playing:true,anchor:epochNow()+START_DELAY,index:0,bpm:r.song.bpm,beats:r.song.ts});
    broadcast();
  };
  const stop=()=>{ if(R.current.role!=='host') return; setGrid({playing:false}); broadcast(); };
  const setLead=ms=>{
    const v=Math.min(MAX_LEAD,Math.max(0,Math.round(Number(ms)||0)));
    try{ localStorage.setItem(LEAD_KEY,JSON.stringify(v)); }catch(e){}
    R.current.lead=v; setLeadState(v); apply();
  };

  const hostOnline=role==='host'||peers.some(p=>p.role==='host');
  return {role,status,peers,hostOnline,clock,grid,ready,pos,lead,supported,
    song:role==='host'?R.current.song:remoteSong,
    join,leave,play,stop,setLead};
}
