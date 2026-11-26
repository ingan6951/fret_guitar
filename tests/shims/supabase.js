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
export function createClient(){ return {channel:(n,o)=>makeChannel(n,o),removeChannel:c=>c._leave()}; }
export function resetBus(){ bus.rooms.clear(); bus.sent=[]; }
