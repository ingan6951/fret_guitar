'use client';
// 모든 페이지가 같이 쓰는 상태: 코드 조건, 진행 목록, 진행에서 고른 칸. 설정은 브라우저에 저장하고, 로그인하면 서버에도 맞춰 둔다.
import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {NOTE_SHARP,NOTE_FLAT,QUALITIES,hasChord,voicingFromFrets,fretsOf,pcOfNote,handPos,moveCost} from '../lib/fretlogic.js';
import useCloudSync from './useCloudSync.js';
import {DEFAULT,MIN_BARS,MAX_PROG,MAX_LISTS,MAX_NOTES,MAX_CHORDS,newBar,newList,cleanTitle,cleanBpm,cleanBeats,loadState,saveState,encodeBars,decodeBars,barIsEmpty} from '../lib/settings.js';

const Ctx=createContext(null);
export const useGuide=()=>useContext(Ctx);

const barsOf=s=>s.lists[s.cur].bars;
const withBars=(s,fn)=>({...s,lists:s.lists.map((l,i)=>i===s.cur?{...l,bars:fn(l.bars)}:l)});
const editBar=(s,bi,fn)=>withBars(s,b=>b.map((x,j)=>j===bi?fn(x):x));
// 고른 칸: bar 마디, kind 'c'(코드) 또는 'n'(멜로디). i는 코드/음 번호이고 -1이면 "새로 더하기"
// (마디를 고르면 -1이라, 코드나 음을 고르는 대로 그 마디 끝에 계속 더해진다)
const START={bar:0,kind:'c',i:-1};

export default function GuideProvider({children}){
  const [state,setState]=useState(DEFAULT);
  const [ready,setReady]=useState(false);
  const [selRaw,setSel]=useState(START);
  const [confirmDel,setConfirmDel]=useState(false);
  const [shareNote,setShareNote]=useState('');
  const [shareUrl,setShareUrl]=useState('');

  useEffect(()=>{
    let s=loadState();
    // 공유 링크(?p=...)로 들어오면 새 진행으로 추가한다 (기존 진행은 그대로)
    try{
      const url=new URL(window.location.href),shared=decodeBars(url.searchParams.get('p'));
      if(shared.length){
        const base=s||DEFAULT,title=cleanTitle(url.searchParams.get('t'))||'공유받은 진행';
        const onlyEmpty=base.lists.length===1&&base.lists[0].bars.every(barIsEmpty);
        const lists=onlyEmpty?[]:base.lists.length>=MAX_LISTS?base.lists.slice(0,MAX_LISTS-1):base.lists;
        s={...base,lists:[...lists,{title,bars:shared,bpm:cleanBpm(url.searchParams.get('bpm')),beats:cleanBeats(url.searchParams.get('ts'))}],cur:lists.length};
        for(const k of ['p','t','bpm','ts']) url.searchParams.delete(k);
        window.history.replaceState(null,'',url.pathname+url.search+url.hash);
      }
    }catch(e){}
    if(s) setState(s);
    setReady(true);
  },[]);
  useEffect(()=>{ if(ready) saveState(state); },[state,ready]);
  // 로그인하면 다른 기기와 같은 내용을 쓴다 (서버 설정이 없으면 아무것도 안 한다)
  const cloud=useCloudSync(state,setState,ready);

  const pick=(k,v)=>setState(s=>{
    switch(k){
      // 근음을 바꿨는데 지금 코드 종류가 그 근음에 없으면, 있는 종류로 바꾼다
      case 'root': { const r=Number(v); const q2=hasChord(r,s.q)?s.q:(QUALITIES.find(x=>hasChord(r,x.id))||{id:s.q}).id; return {...s,root:r,q:q2}; }
      case 'q': return {...s,q:v};
      case 'n': return {...s,n:Number(v)};
      case 'label': return {...s,label:v};
      case 'acc': return {...s,flat:v==='flat'};
      case 'pclear': return withBars(s,()=>Array.from({length:MIN_BARS},()=>newBar()));
      case 'ptitle': return {...s,lists:s.lists.map((l,i)=>i===s.cur?{...l,title:cleanTitle(v)}:l)};
      case 'pbpm': return {...s,lists:s.lists.map((l,i)=>i===s.cur?{...l,bpm:cleanBpm(v)}:l)};
      case 'pbeats': return {...s,lists:s.lists.map((l,i)=>i===s.cur?{...l,beats:cleanBeats(v)}:l)};
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
  const bars=lists[cur].bars;
  const nm=flat?NOTE_FLAT:NOTE_SHARP;
  const q=QUALITIES.find(x=>x.id===qid);
  const chordName=c=>nm[c.root]+QUALITIES.find(x=>x.id===c.q).suffix;
  const noteName=c=>nm[pcOfNote(c.s,c.f)];
  const noteWhere=c=>`${6-c.s}번 줄 ${c.f===0?'개방':c.f+'프렛'}`;

  // 고른 칸은 마디 수·칸 수가 줄어도 항상 있는 칸을 가리킨다
  const sel=useMemo(()=>{
    const bar=Math.min(selRaw.bar,bars.length-1),b=bars[bar];
    const len=selRaw.kind==='n'?b.notes.length:b.chords.length;
    return {bar,kind:selRaw.kind==='n'?'n':'c',i:selRaw.i>=0&&selRaw.i<len?selRaw.i:-1};
  },[selRaw,bars]);
  const selBar=bars[sel.bar];
  const selChord=sel.kind==='c'&&sel.i>=0?selBar.chords[sel.i]:null;
  const selNote=sel.kind==='n'&&sel.i>=0?selBar.notes[sel.i]:null;

  // 코드 칸을 마디 순서대로 한 줄로 펼친 목록: 앞뒤 폼 비교와 손 이동 계산에 쓴다
  const chordSlots=useMemo(()=>bars.flatMap((b,bar)=>b.chords.map((c,i)=>({bar,i,c,res:voicingFromFrets(c.root,c.q,c.frets)}))),[bars]);
  const filledSlots=chordSlots;
  const gap=(a,b)=>Math.abs(handPos(a)-handPos(b));
  const moved=filledSlots.reduce((sum,x,k)=>k?sum+gap(filledSlots[k-1].res,x.res):0,0);
  // 코드를 넣을 자리의 앞뒤 코드: 고른 코드가 있으면 그 앞뒤, 새로 더하는 중이면 이 마디 끝의 앞뒤
  let prev,next;
  if(sel.kind==='c'){
    const at=sel.i>=0?chordSlots.findIndex(x=>x.bar===sel.bar&&x.i===sel.i):-1;
    if(at>=0){ prev=chordSlots[at-1]; next=chordSlots[at+1]; }
    else{
      const after=chordSlots.findIndex(x=>x.bar>sel.bar);
      const cut=after<0?chordSlots.length:after;
      prev=chordSlots[cut-1]; next=chordSlots[cut];
    }
  }
  const noteTotal=bars.reduce((t,b)=>t+b.notes.length,0);

  // ----- 진행 편집 -----
  const resetView=()=>{ setSel(START); setConfirmDel(false); };
  const selectBar=bar=>setSel(s=>({bar,kind:s.kind,i:-1}));
  const selectChord=(bar,i)=>{
    setSel({bar,kind:'c',i});
    const c=i>=0?bars[bar].chords[i]:null;
    if(c) setState(s=>({...s,root:c.root,q:c.q}));
  };
  const selectNote=(bar,i)=>setSel({bar,kind:'n',i});
  const setKind=kind=>setSel(s=>({bar:s.bar,kind,i:-1}));
  const addBar=()=>{ if(bars.length>=MAX_PROG) return; setState(s=>barsOf(s).length>=MAX_PROG?s:withBars(s,b=>[...b,newBar()])); setSel(s=>({bar:bars.length,kind:s.kind,i:-1})); };
  const clearBar=()=>{ setState(s=>editBar(s,sel.bar,()=>newBar())); setSel(s=>({...s,i:-1})); };
  const clearAll=()=>{ pick('pclear',''); setSel(START); };
  // 코드: 코드를 고른 상태면 그 코드를 바꾸고, 아니면 고른 마디 끝에 더한다. 마디를 직접 고르기 전에는 계속 같은 마디에 더해진다.
  const putForm=res=>{
    if(sel.kind!=='c') return;
    if(sel.i<0&&selBar.chords.length>=MAX_CHORDS) return;
    setState(s=>editBar(s,sel.bar,b=>{
      const c={root:s.root,q:s.q,frets:fretsOf(res)};
      return {...b,chords:sel.i>=0?b.chords.map((x,i)=>i===sel.i?c:x):[...b.chords,c]};
    }));
  };
  // 멜로디: 음을 고른 상태면 그 음을 바꾸고, 아니면 마디 끝에 더한다
  const putNote=(s,f)=>{
    if(sel.kind!=='n') return;
    if(sel.i<0&&selBar.notes.length>=MAX_NOTES) return;
    setState(st=>editBar(st,sel.bar,b=>({...b,notes:sel.i>=0?b.notes.map((x,j)=>j===sel.i?{s,f}:x):[...b.notes,{s,f}]})));
  };
  // 멜로디 음 순서 바꾸기: 고른 음을 앞(-1)·뒤(+1)로 한 칸 옮긴다
  const moveNote=dir=>{
    if(sel.kind!=='n'||sel.i<0) return;
    const j=sel.i+dir;
    if(j<0||j>=selBar.notes.length) return;
    setState(s=>editBar(s,sel.bar,b=>{ const n=b.notes.slice(); [n[sel.i],n[j]]=[n[j],n[sel.i]]; return {...b,notes:n}; }));
    setSel({bar:sel.bar,kind:'n',i:j});
  };
  const delSel=()=>{
    if(sel.i<0) return;
    const key=sel.kind==='c'?'chords':'notes';
    setState(s=>editBar(s,sel.bar,b=>({...b,[key]:b[key].filter((_,j)=>j!==sel.i)})));
    setSel({bar:sel.bar,kind:sel.kind,i:-1});
  };
  const switchList=v=>{ pick('pswitch',v); resetView(); };
  const newProg=()=>{ pick('pnew',''); resetView(); };
  const deleteProg=()=>{
    if(!confirmDel&&bars.some(b=>!barIsEmpty(b))){ setConfirmDel(true); setTimeout(()=>setConfirmDel(false),3000); return; }
    pick('plistdel',''); resetView();
  };
  const shareProg=async()=>{
    try{
      const url=new URL(window.location.href); url.pathname='/progression/'; url.search=''; url.hash='';
      url.searchParams.set('p',encodeBars(bars));
      if(lists[cur].title) url.searchParams.set('t',lists[cur].title);
      url.searchParams.set('bpm',String(lists[cur].bpm));
      url.searchParams.set('ts',String(lists[cur].beats));
      const text=url.toString();
      try{ await navigator.clipboard.writeText(text); setShareUrl(''); setShareNote('복사됨'); }
      catch(e){ setShareUrl(text); setShareNote('아래 주소를 복사하세요'); }
      setTimeout(()=>setShareNote(''),2500);
    }catch(e){ setShareNote(''); }
  };

  const {bpm,beats}=lists[cur];
  const value={state,pick,root,qid,n,label,flat,lists,cur,bars,bpm,beats,nm,q,sym:nm[root]+q.suffix,chordName,noteName,noteWhere,
    sel,selBar,selChord,selNote,chordSlots,filledSlots,moved,gap,prev,next,noteTotal,moveCost,
    selectBar,selectChord,selectNote,setKind,addBar,clearBar,clearAll,putForm,putNote,moveNote,delSel,
    switchList,newProg,deleteProg,confirmDel,shareProg,shareNote,shareUrl,cloud};
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
