// 테스트용 @supabase/supabase-js 대체: 같은 프로세스 안에서 채널 메시지·접속자를 주고받는 버스.
// 테스트는 makeChannel 로 가짜 방장/참여자를 직접 만들어 앱과 메시지를 주고받는다.
export const bus={rooms:new Map(),sent:[]};
const roomOf=name=>{ if(!bus.rooms.has(name)) bus.rooms.set(name,{members:new Set(),presence:new Map()}); return bus.rooms.get(name); };

export function makeChannel(name,opts={}){
  const cfg=(opts&&opts.config)||{},room=roomOf(name);
  const key=(cfg.presence&&cfg.presence.key)||Math.random().toString(36).slice(2);
  const self=!!(cfg.broadcast&&cfg.broadcast.self);
  const handlers=[],presence=[];
  const c={
    key,
    on(type,filter,cb){ if(type==='broadcast') handlers.push([filter.event,cb]); else if(type==='presence') presence.push(cb); return c; },
    _deliver(event,payload){ for(const [e,cb] of handlers) if(e===event) cb({type:'broadcast',event,payload}); },
    _sync(){ presence.forEach(cb=>cb()); },
    presenceState(){ return Object.fromEntries([...room.presence].map(([k,v])=>[k,[v]])); },
    subscribe(cb){ room.members.add(c); setTimeout(()=>cb&&cb('SUBSCRIBED'),0); return c; },
    track(p){ room.presence.set(key,p); setTimeout(()=>room.members.forEach(m=>m._sync()),0); return Promise.resolve('ok'); },
    send({event,payload}){
      bus.sent.push({room:name,event,payload,from:key});
      const copy=JSON.parse(JSON.stringify(payload));
      setTimeout(()=>room.members.forEach(m=>{ if(m!==c||self) m._deliver(event,copy); }),0);
      return Promise.resolve('ok');
    },
    _leave(){ room.members.delete(c); room.presence.delete(key); room.members.forEach(m=>m._sync()); }
  };
  return c;
}
export function createClient(){ return {channel:(n,o)=>makeChannel(n,o),removeChannel:c=>c._leave(),auth,from}; }
export function resetBus(){ bus.rooms.clear(); bus.sent=[]; }

// ----- 로그인(auth)과 user_settings 테이블 흉내 -----
// 서버 행 규칙(RLS)처럼 로그인한 사용자 자기 줄만 읽고 쓴다. 시각은 실제 서버처럼 "+00:00" 꼴로 돌려준다.
export const authBus={session:null,listeners:new Set(),otps:[],code:'123456'};
export const db={tables:new Map(),fail:false,writes:0};
const tableOf=n=>{ if(!db.tables.has(n)) db.tables.set(n,new Map()); return db.tables.get(n); };
const emit=(ev,s)=>authBus.listeners.forEach(cb=>cb(ev,s));
const clone=v=>JSON.parse(JSON.stringify(v));
export function signIn(email,id='user-'+email){ authBus.session={user:{id,email},access_token:'t'}; emit('SIGNED_IN',authBus.session); return id; }
export function serverRow(table,uid,data,at=new Date().toISOString()){ tableOf(table).set(uid,{user_id:uid,data:clone(data),updated_at:at}); }
export const readRow=(table,uid)=>{ const r=tableOf(table).get(uid); return r?clone(r):null; };
const me=()=>authBus.session&&authBus.session.user.id;
const auth={
  getSession:async()=>({data:{session:authBus.session},error:null}),
  onAuthStateChange(cb){ authBus.listeners.add(cb); return {data:{subscription:{unsubscribe:()=>authBus.listeners.delete(cb)}}}; },
  signInWithOtp:async({email,options})=>{ authBus.otps.push({email,options}); return {data:{},error:null}; },
  verifyOtp:async({email,token})=>{
    if(token!==authBus.code) return {data:{},error:{message:'Token has expired or is invalid'}};
    signIn(email); return {data:{session:authBus.session},error:null};
  },
  signOut:async()=>{ authBus.session=null; emit('SIGNED_OUT',null); return {error:null}; }
};
function from(table){
  const rows=tableOf(table);
  return {
    select(){ return {eq(col,val){ return {maybeSingle:async()=>{
      if(db.fail) return {data:null,error:{message:'network'}};
      const r=rows.get(val);
      if(!r||r[col]!==val||r.user_id!==me()) return {data:null,error:null};
      return {data:{data:clone(r.data),updated_at:r.updated_at.replace(/Z$/,'+00:00')},error:null};
    }}; }}; },
    upsert:async row=>{
      if(db.fail) return {error:{message:'network'}};
      if(row.user_id!==me()) return {error:{message:'new row violates row-level security policy'}};
      db.writes++; rows.set(row.user_id,clone(row)); return {error:null};
    }
  };
}
export function resetAuth(){ authBus.session=null; authBus.listeners.clear(); authBus.otps=[]; db.tables.clear(); db.fail=false; db.writes=0; }
