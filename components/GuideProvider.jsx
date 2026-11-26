'use client';
// 모든 페이지가 같이 쓰는 상태: 코드 조건, 진행 목록, 진행에서 고른 칸. 설정은 브라우저에 저장한다.
import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {NOTE_SHARP,NOTE_FLAT,QUALITIES,hasChord,voicingFromFrets,fretsOf,pcOfNote,handPos,moveCost} from '../lib/fretlogic.js';
import {DEFAULT,MIN_BARS,MAX_PROG,MAX_LISTS,MAX_NOTES,newBar,newList,cleanTitle,loadState,saveState,encodeBars,decodeBars,barIsEmpty} from '../lib/settings.js';

const Ctx=createContext(null);
export const useGuide=()=>useContext(Ctx);

const barsOf=s=>s.lists[s.cur].bars;
const withBars=(s,fn)=>({...s,lists:s.lists.map((l,i)=>i===s.cur?{...l,bars:fn(l.bars)}:l)});
const editBar=(s,bi,fn)=>withBars(s,b=>b.map((x,j)=>j===bi?fn(x):x));
// 고른 칸: bar 마디, kind 'c'(코드 칸 i) 또는 'n'(멜로디: i가 음 번호, -1이면 새 음 추가)
const START={bar:0,kind:'c',i:0};

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
        s={...base,lists:[...lists,{title,bars:shared}],cur:lists.length};
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
      case 'pclear': return withBars(s,()=>Array.from({length:MIN_BARS},()=>newBar()));
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
  const bars=lists[cur].bars;
  const nm=flat?NOTE_FLAT:NOTE_SHARP;
  const q=QUALITIES.find(x=>x.id===qid);
  const chordName=c=>nm[c.root]+QUALITIES.find(x=>x.id===c.q).suffix;
  const noteName=c=>nm[pcOfNote(c.s,c.f)];
  const noteWhere=c=>`${6-c.s}번 줄 ${c.f===0?'개방':c.f+'프렛'}`;

  // 고른 칸은 마디 수·칸 수가 줄어도 항상 있는 칸을 가리킨다
  const sel=useMemo(()=>{
    const bar=Math.min(selRaw.bar,bars.length-1),b=bars[bar];
    if(selRaw.kind==='n') return {bar,kind:'n',i:Math.min(selRaw.i,b.notes.length-1)<0?-1:Math.min(selRaw.i,b.notes.length-1)};
    return {bar,kind:'c',i:Math.max(0,Math.min(selRaw.i,b.div-1))};
  },[selRaw,bars]);
  const selBar=bars[sel.bar];
  const selChord=sel.kind==='c'?selBar.chords[sel.i]:null;
  const selNote=sel.kind==='n'&&sel.i>=0?selBar.notes[sel.i]:null;

  // 코드 칸을 마디 순서대로 한 줄로 펼친 목록: 앞뒤 폼 비교와 손 이동 계산에 쓴다
  const chordSlots=useMemo(()=>bars.flatMap((b,bar)=>b.chords.map((c,i)=>({bar,i,c,res:c?voicingFromFrets(c.root,c.q,c.frets):null}))),[bars]);
  const filledSlots=chordSlots.filter(x=>x.c);
  const gap=(a,b)=>Math.abs(handPos(a)-handPos(b));
  const moved=filledSlots.reduce((sum,x,k)=>k?sum+gap(filledSlots[k-1].res,x.res):0,0);
  const at=chordSlots.findIndex(x=>x.bar===sel.bar&&x.i===sel.i&&sel.kind==='c');
  const prev=at>=0?[...chordSlots.slice(0,at)].reverse().find(x=>x.c):undefined;
  const next=at>=0?chordSlots.slice(at+1).find(x=>x.c):undefined;
  const noteTotal=bars.reduce((t,b)=>t+b.notes.length,0);

  // ----- 진행 편집 -----
  const resetView=()=>{ setSel(START); setConfirmDel(false); };
  const selectBar=bar=>setSel(s=>({bar,kind:s.kind,i:s.kind==='n'?-1:0}));
  const selectChord=(bar,i)=>{
    setSel({bar,kind:'c',i});
    const c=bars[bar].chords[i];
    if(c) setState(s=>({...s,root:c.root,q:c.q}));
  };
  const selectNote=(bar,i)=>setSel({bar,kind:'n',i});
  const setKind=kind=>setSel(s=>({bar:s.bar,kind,i:kind==='n'?-1:0}));
  const setDiv=(bar,div)=>setState(s=>editBar(s,bar,b=>({...b,div,chords:Array.from({length:div},(_,i)=>b.chords[i]||null)})));
  const addBar=()=>{ setState(s=>barsOf(s).length>=MAX_PROG?s:withBars(s,b=>[...b,newBar()])); setSel(s=>({bar:bars.length,kind:s.kind,i:s.kind==='n'?-1:0})); };
  const clearBar=()=>setState(s=>editBar(s,sel.bar,b=>({...b,chords:Array(b.div).fill(null),notes:[]})));
  const clearAll=()=>{ pick('pclear',''); setSel(START); };
  // 고른 코드 칸에 폼을 넣는다(있으면 바꾼다). 같은 마디에 칸이 남아 있으면 다음 칸으로 가지만, 다음 마디로는 넘어가지 않는다.
  const putForm=res=>{
    if(sel.kind!=='c') return;
    setState(s=>editBar(s,sel.bar,b=>({...b,chords:b.chords.map((c,i)=>i===sel.i?{root:s.root,q:s.q,frets:fretsOf(res)}:c)})));
    setSel({bar:sel.bar,kind:'c',i:Math.min(sel.i+1,selBar.div-1)});
  };
  // 멜로디: 음을 고른 상태면 그 음을 바꾸고, 아니면 마디 끝에 더한다
  const putNote=(s,f)=>{
    if(sel.kind!=='n') return;
    if(sel.i<0&&selBar.notes.length>=MAX_NOTES) return;
    setState(st=>editBar(st,sel.bar,b=>({...b,notes:sel.i>=0?b.notes.map((x,j)=>j===sel.i?{s,f}:x):[...b.notes,{s,f}]})));
  };
  const delSel=()=>{
    if(sel.kind==='c') setState(s=>editBar(s,sel.bar,b=>({...b,chords:b.chords.map((c,i)=>i===sel.i?null:c)})));
    else if(sel.i>=0){ setState(s=>editBar(s,sel.bar,b=>({...b,notes:b.notes.filter((_,j)=>j!==sel.i)}))); setSel({bar:sel.bar,kind:'n',i:-1}); }
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
      const text=url.toString();
      try{ await navigator.clipboard.writeText(text); setShareUrl(''); setShareNote('복사됨'); }
      catch(e){ setShareUrl(text); setShareNote('아래 주소를 복사하세요'); }
      setTimeout(()=>setShareNote(''),2500);
    }catch(e){ setShareNote(''); }
  };

  const value={state,pick,root,qid,n,label,flat,lists,cur,bars,nm,q,sym:nm[root]+q.suffix,chordName,noteName,noteWhere,
    sel,selBar,selChord,selNote,chordSlots,filledSlots,moved,gap,prev,next,noteTotal,moveCost,
    selectBar,selectChord,selectNote,setKind,setDiv,addBar,clearBar,clearAll,putForm,putNote,delSel,
    switchList,newProg,deleteProg,confirmDel,shareProg,shareNote,shareUrl};
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
