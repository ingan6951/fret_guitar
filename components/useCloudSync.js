'use client';
// 로그인(이메일 링크·코드)과 기기 사이 설정 동기화. GuideProvider가 상태와 함께 쓴다.
//  - 로그인하면 서버 값을 먼저 읽고(lib/cloud.js의 decide), 그다음부터 바뀐 내용을 잠깐 모았다가 올린다.
//  - 탭으로 돌아올 때마다 다시 읽어, 다른 기기에서 바꾼 내용을 가져온다.
//  - 로그아웃해도 이 기기에 저장된 내용은 그대로 둔다.
import {useCallback,useEffect,useRef,useState} from 'react';
import {sb,supabaseConfigured} from '../lib/supabase.js';
import {decide,fetchRow,pushRow,readMeta,writeMeta,syncJSON} from '../lib/cloud.js';

export const SYNC_DELAY=1200; // 마지막으로 바꾼 뒤 이만큼(ms) 지나면 올린다
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function useCloudSync(state,setState,ready){
  const [configured]=useState(supabaseConfigured);
  const [user,setUser]=useState(null);
  const [status,setStatus]=useState('idle'); // idle | sync | saved | error
  const stateRef=useRef(state); stateRef.current=state;
  const pulled=useRef(null);  // 서버 값을 읽어 맞춘 사용자 id (그 전에는 올리지 않는다)
  const busy=useRef(false);
  const timer=useRef(null);
  const uid=user?user.id:null;

  // 로그인 상태 지켜보기 (메일 링크로 돌아오면 주소의 토큰을 읽어 로그인된다)
  useEffect(()=>{
    if(!configured) return;
    const auth=sb().auth;
    let alive=true;
    auth.getSession().then(({data})=>{ if(alive) setUser(data&&data.session?data.session.user:null); }).catch(()=>{});
    const {data}=auth.onAuthStateChange((_e,session)=>{ setUser(session?session.user:null); });
    return ()=>{ alive=false; data.subscription.unsubscribe(); };
  },[configured]);

  const push=useCallback(async id=>{
    const s=stateRef.current,json=syncJSON(s);
    const at=await pushRow(id,s);
    writeMeta({uid:id,at,synced:json});
  },[]);

  // 서버 값 읽어 맞추기
  const pull=useCallback(async()=>{
    if(!uid||busy.current) return;
    busy.current=true; setStatus('sync');
    try{
      const row=await fetchRow(uid);
      const d=decide(stateRef.current,row,readMeta(uid));
      if(d.kind==='apply'){
        writeMeta({uid,at:d.at,synced:d.json}); // 먼저 적어 둬야 바뀐 상태를 다시 올리지 않는다
        stateRef.current=d.state; setState(d.state);
      }else if(d.kind==='merge'){
        stateRef.current=d.state; setState(d.state);
        await push(uid);
      }else if(d.kind==='push') await push(uid);
      pulled.current=uid; setStatus('saved');
    }catch(e){ setStatus('error'); }
    finally{ busy.current=false; }
  },[uid,setState,push]);

  useEffect(()=>{
    if(!ready||!uid){ pulled.current=null; return; }
    pull();
    const onShow=()=>{ if(document.visibilityState!=='hidden') pull(); };
    document.addEventListener('visibilitychange',onShow);
    return ()=>document.removeEventListener('visibilitychange',onShow);
  },[ready,uid,pull]);

  // 바뀐 내용 올리기 (status도 지켜봐서, 읽는 동안 바뀐 내용은 읽기가 끝난 뒤 올린다)
  useEffect(()=>{
    if(!uid||pulled.current!==uid) return;
    const m=readMeta(uid);
    if(m&&m.synced===syncJSON(state)) return;
    timer.current=setTimeout(async()=>{
      if(busy.current||pulled.current!==uid) return;
      busy.current=true; setStatus('sync');
      try{ await push(uid); setStatus('saved'); }catch(e){ setStatus('error'); }
      finally{ busy.current=false; }
    },SYNC_DELAY);
    return ()=>clearTimeout(timer.current);
  },[state,uid,push,status]);

  // ----- 로그인 -----
  const sendLink=async email=>{
    const e=String(email||'').trim();
    if(!EMAIL_RE.test(e)) return '이메일 주소를 확인해 주세요';
    try{
      const url=new URL(window.location.href); url.search=''; url.hash='';
      const {error}=await sb().auth.signInWithOtp({email:e,options:{emailRedirectTo:url.toString(),shouldCreateUser:true}});
      return error?'메일을 보내지 못했어요. 잠시 뒤 다시 해 주세요':'';
    }catch(err){ return '메일을 보내지 못했어요. 인터넷 연결을 확인해 주세요'; }
  };
  const verifyCode=async(email,code)=>{
    const token=String(code||'').replace(/\s/g,'');
    if(!/^\d{6,10}$/.test(token)) return '메일에 있는 숫자 코드를 넣어 주세요';
    try{
      const {error}=await sb().auth.verifyOtp({email:String(email).trim(),token,type:'email'});
      return error?'코드가 맞지 않거나 시간이 지났어요':'';
    }catch(err){ return '확인하지 못했어요. 인터넷 연결을 확인해 주세요'; }
  };
  const signOut=async()=>{
    clearTimeout(timer.current);
    pulled.current=null; writeMeta(null);
    try{ await sb().auth.signOut({scope:'local'}); }catch(e){}
    setUser(null); setStatus('idle');
  };

  return {configured,user,email:user?user.email:'',status,sendLink,verifyCode,signOut,retry:pull};
}
