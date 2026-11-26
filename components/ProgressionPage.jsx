'use client';
// 진행 페이지: 진행 이름·목록, 마디 차트, 고른 칸 편집(코드·멜로디), 공유, 연주용 보기.
// 진행은 연주할 때 기억하기 어려운 코드·멜로디를 적어 두고 보려는 용도다. 진행을 만들고 고치는 일은 이 페이지에서만 한다.
import {useEffect,useRef,useState} from 'react';
import useMetronome from './useMetronome.js';
import TempoBar from './TempoBar.jsx';
import {rememberHostRoom} from './useRoom.js';
import {newRoomId} from '../lib/sync.js';
import {roomConfigured} from '../lib/room.js';
import Link from 'next/link';
import {QUALITIES} from '../lib/fretlogic.js';
import {MAX_LISTS,MAX_PROG,MAX_TITLE,MAX_NOTES,MAX_CHORDS,barIsEmpty} from '../lib/settings.js';
import {useGuide} from './GuideProvider.jsx';
import {Chip} from './ui.jsx';
import ChordFinder from './ChordFinder.jsx';
import NoteTable from './NoteTable.jsx';
import Diagram,{ariaFor} from './Diagram.jsx';

const posText=res=>res.baseFret===0?'개방':res.baseFret+'프렛';

// 연주용 보기: 마디마다 코드 폼 그림과 멜로디 음(순서·음이름·줄/프렛)을 크게 보여 준다
function PlayView({nowBar}){
  const g=useGuide();
  const {bars,nm,label,chordSlots}=g;
  // 메트로놈이 다음 마디로 넘어가면 그 마디가 화면에 들어오게 한다
  const listRef=useRef(null);
  useEffect(()=>{
    const el=nowBar>=0&&listRef.current&&listRef.current.children[nowBar];
    if(el&&el.scrollIntoView) el.scrollIntoView({block:'nearest',behavior:'smooth'});
  },[nowBar]);
  return (
    <section className="play" aria-label="연주용 보기">
      <p className="count">{g.filledSlots.length>1?`코드 ${g.filledSlots.length}개 · 총 손 이동 ${g.moved}프렛 · `:''}위치는 검지가 놓이는 프렛</p>
      <div className="playbars" ref={listRef}>
        {bars.map((b,bi)=>(
          <article key={bi} className={'playbar'+(barIsEmpty(b)?' none':'')+(bi===nowBar?' now':'')} aria-label={`${bi+1}마디`} aria-current={bi===nowBar?'step':undefined}>
            <h3><span>{bi+1}</span>마디</h3>
            {b.chords.length>0&&(
              <div className="prow2"><span className="rowtag">코드</span>
                <div className="pchords">
                  {b.chords.map((c,i)=>{
                    const res=chordSlots.find(x=>x.bar===bi&&x.i===i).res,name=g.chordName(c);
                    return (
                      <figure key={i} className="pchord">
                        <figcaption><b>{name}</b><span className="pos">{posText(res)}</span></figcaption>
                        <Diagram res={res} rootPc={c.root} quality={QUALITIES.find(y=>y.id===c.q)} label={label} names={nm} aria={ariaFor(res,name)}/>
                      </figure>
                    );
                  })}
                </div>
              </div>
            )}
            {b.notes.length>0&&(
              <div className="prow2"><span className="rowtag note">♪ 멜로디</span>
                <ol className="pnotes">
                  {b.notes.map((x,i)=>(
                    <li key={i} className="pnote"><i>{i+1}</i><b>{g.noteName(x)}</b><small>{g.noteWhere(x)}</small></li>
                  ))}
                </ol>
              </div>
            )}
            {barIsEmpty(b)&&<p className="count">비어 있음</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function ProgressionPage(){
  const g=useGuide();
  const [view,setView]=useState('edit'); // 'edit' 만들기·고치기 / 'play' 연주용 보기
  const {bars,lists,cur,sel,selBar,selChord,selNote,filledSlots}=g;
  const hasAny=bars.some(b=>!barIsEmpty(b));
  const what=sel.kind==='c'
    ?`${sel.bar+1}마디 코드${selChord?` ${sel.i+1}번째 · ${g.chordName(selChord)}`:` · 새 코드 더하기 (${selBar.chords.length}/${MAX_CHORDS})`}`
    :`${sel.bar+1}마디 멜로디${selNote?` ${sel.i+1}번째 음 · ${g.noteName(selNote)} (${g.noteWhere(selNote)})`:` · 새 음 더하기 (${selBar.notes.length}/${MAX_NOTES})`}`;
  const canDel=sel.i>=0;

  // 메트로놈: 곡 길이는 마지막으로 무언가 적힌 마디까지 (다 비었으면 모든 마디), 끝나면 처음으로 돌아간다
  const m=useMetronome({bpm:g.bpm,beats:g.beats});
  let songLen=bars.length; while(songLen>1&&barIsEmpty(bars[songLen-1])) songLen--;
  if(!hasAny) songLen=bars.length;
  const nowBar=m.playing&&m.pos?m.pos.bar%songLen:-1;
  useEffect(()=>{ m.stop(); },[cur]); // eslint-disable-line react-hooks/exhaustive-deps -- 다른 곡으로 바꾸면 멈춘다
  // 방 이름은 브라우저에서만 만든다 (서버 렌더와 어긋나지 않게)
  const [roomId,setRoomId]=useState(null);
  useEffect(()=>{ setRoomId(newRoomId()); },[]);

  return (
    <main className="stage">
      <section className="plist" aria-label="진행">
        <input className="titlein" type="text" data-k="ptitle" value={lists[cur].title} maxLength={MAX_TITLE} placeholder={`진행 ${cur+1} 제목`}
          aria-label="진행 제목" onChange={e=>g.pick('ptitle',e.target.value)}/>
        <select className="sel" data-k="pswitch" aria-label="진행 선택" value={String(cur)} onChange={e=>g.switchList(e.target.value)}>
          {lists.map((l,i)=><option key={i} value={String(i)}>{l.title||`진행 ${i+1}`}</option>)}
        </select>
        <Chip k="pnew" v="" disabled={lists.length>=MAX_LISTS} onPick={g.newProg}>＋ 새 진행</Chip>
        <Chip k="plistdel" v="" className="chip danger" on={g.confirmDel||undefined} onPick={g.deleteProg}>{g.confirmDel?'정말 삭제':'진행 삭제'}</Chip>
        <div className="seg compact viewseg" role="group" aria-label="보기 방식">
          <Chip k="view" v="edit" on={view==='edit'} onPick={(k,v)=>setView(v)}>만들기</Chip>
          <Chip k="view" v="play" on={view==='play'} onPick={(k,v)=>setView(v)}>연주용 보기</Chip>
        </div>
      </section>

      <TempoBar m={m} sticky={view==='play'}/>

      {view==='play'?<PlayView nowBar={nowBar}/>:<>
      <section className="chart" aria-label="마디 차트">
        <div className="bars">
          {bars.map((b,bi)=>(
            <div key={bi} className={'bar'+(b.chords.length>=2||b.notes.length>=3?' wide':'')+(sel.bar===bi?' picked':'')+(bi===nowBar?' now':'')}>
              <button type="button" className="bn" data-k="bar" data-v={String(bi)} aria-pressed={String(sel.bar===bi)} aria-label={`${bi+1}마디 선택`} onClick={()=>g.selectBar(bi)}>{bi+1}</button>
              <div className="brow"><span className="rowtag">코드</span>
                <div className="slots">
                  {b.chords.map((c,i)=>{
                    const on=sel.bar===bi&&sel.kind==='c'&&sel.i===i;
                    return (
                      <button key={i} type="button" className={'slot'+(on?' on':'')} data-k="slot" data-v={`${bi}.${i}`} aria-pressed={String(on)}
                        aria-label={`${bi+1}마디 ${i+1}번째 코드 ${g.chordName(c)} 선택`} onClick={()=>g.selectChord(bi,i)}>
                        <b>{g.chordName(c)}</b><small>{posText(g.chordSlots.find(x=>x.bar===bi&&x.i===i).res)}</small>
                      </button>
                    );
                  })}
                  {b.chords.length<MAX_CHORDS&&(()=>{
                    const on=sel.bar===bi&&sel.kind==='c'&&sel.i<0;
                    return <button type="button" className={'slot blank'+(on?' on':'')} data-k="cadd" data-v={String(bi)} aria-pressed={String(on)}
                      aria-label={`${bi+1}마디에 코드 더하기 선택`} onClick={()=>g.selectChord(bi,-1)}><em>＋</em></button>;
                  })()}
                </div>
              </div>
              <div className="brow mel" aria-label={`${bi+1}마디 멜로디`}><span className="rowtag note">♪ 멜로디</span>
                <div className="notes">
                  {b.notes.map((x,i)=>{
                    const on=sel.bar===bi&&sel.kind==='n'&&sel.i===i;
                    return <button key={i} type="button" className={'mnote'+(on?' on':'')} data-k="mnote" data-v={`${bi}.${i}`} aria-pressed={String(on)}
                      aria-label={`${bi+1}마디 멜로디 ${i+1}번째 ${g.noteName(x)} (${g.noteWhere(x)}) 선택`} onClick={()=>g.selectNote(bi,i)}><i>{i+1}</i><b>{g.noteName(x)}</b></button>;
                  })}
                  {!b.notes.length&&<span className="mel-empty">없음</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
        {bars.length<MAX_PROG&&<button type="button" className="chip addbar" data-k="padd" onClick={g.addBar} aria-label="다음 마디 추가">＋ 마디 추가</button>}
      </section>

      <section className="seltool" aria-label="고른 칸">
        <span className="selname">{what}{filledSlots.length>1?` · 총 손 이동 ${g.moved}프렛`:''}
          {sel.i<0&&!barIsEmpty(selBar)&&<span className="barnow"> · 지금 {sel.kind==='c'
            ?(selBar.chords.map(g.chordName).join(' ')||'코드 없음')
            :(selBar.notes.map(g.noteName).join(' ')||'음 없음')}</span>}</span>
        <div className="seg compact">
          {sel.kind==='n'&&<>
            <Chip k="nmove" v="-1" disabled={!(sel.i>0)} onPick={()=>g.moveNote(-1)} aria-label="고른 음을 앞 순서로">◀ 앞으로</Chip>
            <Chip k="nmove" v="1" disabled={!(sel.i>=0&&sel.i<selBar.notes.length-1)} onPick={()=>g.moveNote(1)} aria-label="고른 음을 뒤 순서로">뒤로 ▶</Chip>
          </>}
          <Chip k="del" v="" disabled={!canDel} onPick={g.delSel}>삭제</Chip>
          <Chip k="bclear" v="" disabled={barIsEmpty(selBar)} onPick={g.clearBar}>마디 비우기</Chip>
        </div>
      </section>

      <section className="editor" aria-label="코드·멜로디 넣기">
        <div className="seg compact tabs2" role="group" aria-label="넣을 것">
          <Chip k="kind" v="c" on={sel.kind==='c'} onPick={(k,v)=>g.setKind(v)}>코드 폼</Chip>
          <Chip k="kind" v="n" on={sel.kind==='n'} onPick={(k,v)=>g.setKind(v)}>♪ 멜로디 음</Chip>
        </div>
        {sel.kind==='c'?<ChordFinder edit/>:<NoteTable edit/>}
      </section>
      </>}

      <section className="foot" aria-label="진행 도구">
        {/* 합주 방 만들기: 이 기기를 방장으로 기억하고 방으로 간다 (방장 화면은 지금 곡을 쓴다) */}
        {roomConfigured()&&roomId&&<Link href={`/room/?id=${roomId}`} className="chip roomgo" data-k="room" onClick={()=>rememberHostRoom(roomId)}>🎧 합주 방 만들기</Link>}
        {hasAny&&<Chip k="pshare" v="" onPick={g.shareProg}>{g.shareNote||'링크 복사'}</Chip>}
        {hasAny&&view==='edit'&&<Chip k="pclear" v="" onPick={g.clearAll}>전체 비우기</Chip>}
        {g.shareUrl&&<input className="shareurl" readOnly value={g.shareUrl} aria-label="공유 링크" onFocus={e=>e.target.select()}/>}
      </section>
    </main>
  );
}
