// 로그인한 사용자의 설정을 Supabase `user_settings` 테이블(사용자마다 한 줄)에 저장해 여러 기기에서 같이 쓴다.
// 테이블·보안 정책은 supabase/user_settings.sql. 화면 쪽 흐름은 components/useCloudSync.js.
//
// 무엇을 올리나: 진행 목록과 코드 조건·표시 설정. 지금 고른 진행(cur)은 기기마다 따로 둔다.
// 이 기기가 마지막으로 서버와 맞춘 내용은 META_KEY에 { uid, at(서버 updated_at), synced(올린 JSON) } 로 기억한다.
//   - 로컬이 synced와 같으면 "안 바꿈", 다르면 "올릴 게 있음"
//   - 서버 updated_at이 at과 다르면 다른 기기가 바꾼 것
import {sb} from './supabase.js';
import {sanitize,barIsEmpty,MAX_LISTS} from './settings.js';

export const TABLE='user_settings';
export const META_KEY='fretguide.sync';

export const syncPart=s=>({root:s.root,q:s.q,n:s.n,label:s.label,flat:s.flat,lists:s.lists});
export const syncJSON=s=>JSON.stringify(syncPart(s));
const listKey=l=>JSON.stringify(l);
const blankList=l=>l.bars.every(barIsEmpty);
// 아직 아무것도 안 만든 상태(빈 진행 하나뿐)
export const isBlank=s=>s.lists.length===1&&blankList(s.lists[0]);

// 서버 값을 이 기기 상태로: 지금 고른 진행 번호만 기기 것을 유지한다
export const fromRemote=(local,data)=>sanitize({...data,cur:local.cur});
// 이 기기와 서버가 서로 모르는 변경을 가진 경우: 서버 진행 뒤에 서버에 없는 이 기기 진행을 붙인다(빈 진행은 뺀다).
export function merge(local,data){
  const remote=sanitize(data);
  const have=new Set(remote.lists.map(listKey));
  const extra=local.lists.filter(l=>!blankList(l)&&!have.has(listKey(l)));
  const base=isBlank(remote)&&extra.length?[]:remote.lists;
  const lists=[...base,...extra].slice(0,MAX_LISTS);
  return {...remote,lists,cur:Math.min(local.cur,lists.length-1)};
}

export function readMeta(uid){
  try{ const m=JSON.parse(localStorage.getItem(META_KEY)); return m&&m.uid===uid?m:null; }catch(e){ return null; }
}
export function writeMeta(m){ try{ if(m) localStorage.setItem(META_KEY,JSON.stringify(m)); else localStorage.removeItem(META_KEY); }catch(e){} }

// 서버는 시각을 "…+00:00" 꼴로 돌려주므로 글자가 아니라 시각으로 비교한다
const sameTime=(a,b)=>typeof a==='string'&&typeof b==='string'&&Date.parse(a)===Date.parse(b);

// 서버 줄과 이 기기 상태를 보고 할 일을 정한다.
//  { kind:'none' } | { kind:'push' } | { kind:'apply', state, at, json } | { kind:'merge', state }
export function decide(local,row,meta){
  const dirty=!meta||syncJSON(local)!==meta.synced;
  if(!row) return {kind:'push'};
  if(meta&&sameTime(row.updated_at,meta.at)) return dirty?{kind:'push'}:{kind:'none'};
  if(!dirty||isBlank(local)){ const s=fromRemote(local,row.data); return {kind:'apply',state:s,at:row.updated_at,json:syncJSON(s)}; }
  return {kind:'merge',state:merge(local,row.data)};
}

export async function fetchRow(uid){
  const {data,error}=await sb().from(TABLE).select('data,updated_at').eq('user_id',uid).maybeSingle();
  if(error) throw error;
  return data;
}
export async function pushRow(uid,state){
  const updated_at=new Date().toISOString();
  const {error}=await sb().from(TABLE).upsert({user_id:uid,data:syncPart(state),updated_at});
  if(error) throw error;
  return updated_at;
}
