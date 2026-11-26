'use client';
// 모든 페이지가 같이 쓰는 상태: 코드 조건, 진행 목록, 선택한 마디. 설정은 브라우저에 저장한다.
import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {NOTE_SHARP,NOTE_FLAT,QUALITIES,hasChord,voicingFromFrets,fretsOf,isNote,pcOfNote,noteVoicing,moveCost,handPos} from '../lib/fretlogic.js';
import {DEFAULT,MIN_BARS,MAX_PROG,MAX_LISTS,newList,cleanTitle,loadState,saveState,encodeProg,decodeProg} from '../lib/settings.js';

const Ctx=createContext(null);
export const useGuide=()=>useContext(Ctx);

const progOf=s=>s.lists[s.cur].prog;
const withProg=(s,fn)=>({...s,lists:s.lists.map((l,i)=>i===s.cur?{...l,prog:fn(l.prog)}:l)});

export default function GuideProvider({children}){
  const [state,setState]=useState(DEFAULT);
  const [ready,setReady]=useState(false);
  const [sel,setSel]=useState(0);             // 선택한 마디: 코드·지판음 페이지에서 고른 것이 이 마디에 들어간다
  const [confirmDel,setConfirmDel]=useState(false); // 진행 삭제 확인 대기
  const [shareNote,setShareNote]=useState('');
  const [shareUrl,setShareUrl]=useState('');

  useEffect(()=>{
    let s=loadState();
    // 공유 링크(?p=...)로 들어오면 새 진행으로 추가한다 (기존 진행은 그대로)
    try{
      const url=new URL(window.location.href),shared=decodeProg(url.searchParams.get('p'));
      if(shared.some(Boolean)){
        const base=s||DEFAULT,title=cleanTitle(url.searchParams.get('t'))||'공유받은 진행';
        const onlyEmpty=base.lists.length===1&&!base.lists[0].prog.some(Boolean);
        const lists=onlyEmpty?[]:base.lists.length>=MAX_LISTS?base.lists.slice(0,MAX_LISTS-1):base.lists;
        s={...base,lists:[...lists,{title,prog:shared}],cur:lists.length};
        url.searchParams.delete('p'); url.searchParams.delete('t');
        window.history.replaceState(null,'',url.pathname+url.search+url.hash);
      }
    }catch(e){}
    if(s) setState(s);
    setReady(true);
  },[]);
  useEffect(()=>{ if(ready) saveState(state); },[state,ready]);

  const pick=(k,v)=>setState(s=>{
    switch(k){
      // 근음을 바꿨는데 지금 코드 종류가 그 근음에 없으면, 있는 종류로 바꾼다
      case 'root': { const r=Number(v); const q2=hasChord(r,s.q)?s.q:(QUALITIES.find(x=>hasChord(r,x.id))||{id:s.q}).id; return {...s,root:r,q:q2}; }
      case 'q': return {...s,q:v};
      case 'n': return {...s,n:Number(v)};
      case 'label': return {...s,label:v};
      case 'acc': return {...s,flat:v==='flat'};
      case 'pdel': return withProg(s,p=>p.map((e,j)=>j===Number(v)?null:e));
      case 'pclear': return withProg(s,()=>Array(MIN_BARS).fill(null));
      case 'ptitle': return {...s,lists:s.lists.map((l,i)=>i===s.cur?{...l,title:cleanTitle(v)}:l)};
      case 'pswitch': { const i=Number(v); return i>=0&&i<s.lists.length?{...s,cur:i}:s; }
      case 'pnew': return s.lists.length>=MAX_LISTS?s:{...s,lists:[...s.lists,newList(`진행 ${s.lists.length+1}`)],cur:s.lists.length};
      case 'plistdel': {
        const lists=s.lists.filter((_,i)=>i!==s.cur);
        return lists.length?{...s,lists,cur:Math.min(s.cur,lists.length-1)}:{...s,lists:[newList('진행 1')],cur:0};
      }
      default: return s;
    }
  });

  const {root,q:qid,n,label,flat,lists,cur}=state;
  const prog=lists[cur].prog;
  const nm=flat?NOTE_FLAT:NOTE_SHARP;
  const q=QUALITIES.find(x=>x.id===qid);
  const chordName=c=>isNote(c)?nm[pcOfNote(c.s,c.f)]:nm[c.root]+QUALITIES.find(x=>x.id===c.q).suffix;
  const noteWhere=c=>`${6-c.s}번 줄 ${c.f===0?'개방':c.f+'프렛'}`;

  // 마디에 담은 항목은 운지째로 보관한다 (조건을 바꿔도 그대로). 빈 마디는 null.
  const resolved=useMemo(()=>prog.map(e=>!e?null:isNote(e)?noteVoicing(e.s,e.f):voicingFromFrets(e.root,e.q,e.frets)),[prog]);
  const sl=Math.min(sel,prog.length-1);
  const filled=prog.map((e,i)=>e?i:-1).filter(i=>i>=0);
  const chordIdx=filled.filter(i=>!isNote(prog[i])); // 앞뒤 폼 비교·손 이동은 코드가 들어 있는 마디만
  const gap=(a,b)=>Math.abs(handPos(a)-handPos(b));
  const moved=chordIdx.reduce((sum,idx,k)=>k?sum+gap(resolved[chordIdx[k-1]],resolved[idx]):0,0);

  const choose=i=>{
    setSel(i);
    const e=prog[i];
    if(e&&!isNote(e)) setState(s=>({...s,root:e.root,q:e.q}));
  };
  const resetView=()=>{ setSel(0); setConfirmDel(false); };
  const switchList=v=>{ pick('pswitch',v); resetView(); };
  const newProg=()=>{ pick('pnew',''); resetView(); };
  const deleteProg=()=>{
    if(!confirmDel&&prog.some(Boolean)){ setConfirmDel(true); setTimeout(()=>setConfirmDel(false),3000); return; }
    pick('plistdel',''); resetView();
  };
  const addBar=()=>{ setState(s=>progOf(s).length>=MAX_PROG?s:withProg(s,p=>[...p,null])); setSel(prog.length); };
  const clearAll=()=>{ pick('pclear',''); setSel(0); };
  const delSel=()=>pick('pdel',String(sl));
  // 선택한 마디에 폼/지판음을 넣고(이미 있으면 바꾸고) 다음 마디를 고른 상태로 넘어간다
  const putForm=r=>{ setState(s=>withProg(s,p=>p.map((e,j)=>j===sl?{root:s.root,q:s.q,frets:fretsOf(r)}:e))); setSel(Math.min(sl+1,prog.length-1)); };
  const putNote=(s,f)=>{ setState(st=>withProg(st,p=>p.map((e,j)=>j===sl?{s,f}:e))); setSel(Math.min(sl+1,prog.length-1)); };
  const shareProg=async()=>{
    try{
      const url=new URL(window.location.href); url.pathname='/progression'; url.search=''; url.hash='';
      url.searchParams.set('p',encodeProg(prog));
      if(lists[cur].title) url.searchParams.set('t',lists[cur].title);
      const text=url.toString();
      try{ await navigator.clipboard.writeText(text); setShareUrl(''); setShareNote('복사됨'); }
      catch(e){ setShareUrl(text); setShareNote('아래 주소를 복사하세요'); }
      setTimeout(()=>setShareNote(''),2500);
    }catch(e){ setShareNote(''); }
  };

  const value={state,pick,root,qid,n,label,flat,lists,cur,prog,nm,q,sym:nm[root]+q.suffix,chordName,noteWhere,resolved,sl,setSel,
    selFilled:!!prog[sl],filled,chordIdx,moved,gap,choose,switchList,newProg,deleteProg,confirmDel,addBar,clearAll,delSel,putForm,putNote,
    shareProg,shareNote,shareUrl,moveCost};
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
