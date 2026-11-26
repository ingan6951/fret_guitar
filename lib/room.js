// 합주 방 연결 (Supabase Realtime Broadcast + Presence). 데이터베이스 테이블은 쓰지 않는다.
// 이 파일만 Supabase를 안다 — 메시지 내용과 시계 계산은 components/useRoom.js, lib/sync.js.
//
// 메시지 (broadcast event → payload)
//   state  방장 → 모두   { v, song:{t,bpm,ts}, grid }
//   hello  참여자 → 방장  { from }                  (들어왔으니 state를 보내 달라)
//   ping   참여자 → 방장  { from, n, t0 }
//   pong   방장 → 참여자  { to, n, t0, th }
import {createClient} from '@supabase/supabase-js';

// NEXT_PUBLIC_ 값은 빌드할 때 그대로 박히므로 process.env.이름 을 그대로 적어야 한다
const config=()=>({url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY});
export const roomConfigured=()=>{ const c=config(); return !!(c.url&&c.key); };

let client=null;
const sb=()=>{
  if(!client){ const c=config(); client=createClient(c.url,c.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}); }
  return client;
};

const EVENTS=['state','hello','ping','pong'];

// 방에 들어간다. onMsg(event,payload), onPeers([{me,role}]), onStatus('SUBSCRIBED'|'CHANNEL_ERROR'|'TIMED_OUT'|'CLOSED')
export function joinRoom(id,{me,role,onMsg,onPeers,onStatus}){
  const ch=sb().channel('fretguide-room-'+id,{config:{broadcast:{self:false,ack:false},presence:{key:me}}});
  for(const ev of EVENTS) ch.on('broadcast',{event:ev},({payload})=>onMsg(ev,payload||{}));
  ch.on('presence',{event:'sync'},()=>{
    const st=ch.presenceState();
    onPeers(Object.values(st).map(list=>list[0]).filter(Boolean));
  });
  ch.subscribe(status=>{
    onStatus(status);
    if(status==='SUBSCRIBED') ch.track({me,role});
  });
  return {
    send:(event,payload)=>ch.send({type:'broadcast',event,payload}),
    leave:()=>{ sb().removeChannel(ch); }
  };
}
