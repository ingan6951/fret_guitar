'use client';
// 마디 창: 탭 악보에서 마디를 누르면 뜬다. 그 마디의 코드·멜로디를 보고, 코드 폼이나 지판 음을 골라 넣고, 고치고, 지운다.
// 좁은 화면에서는 아래에서 올라오는 시트, 넓은 화면에서는 가운데 창. Esc·바깥 누르기·✕로 닫는다.
import {useEffect,useRef} from 'react';
import {MAX_CHORDS,MAX_NOTES,barIsEmpty} from '../lib/settings.js';
import {useGuide} from './GuideProvider.jsx';
import {Chip} from './ui.jsx';
import ChordFinder from './ChordFinder.jsx';
import NoteTable from './NoteTable.jsx';

const posText=res=>res.baseFret===0?'개방':res.baseFret+'프렛';

export default function BarSheet({onClose}){
  const g=useGuide();
  const {bars,sel,selBar,selChord,selNote,filledSlots}=g;
  const bi=sel.bar;
  const boxRef=useRef(null);

  // 열릴 때 창으로 포커스를 옮기고 뒤 화면이 스크롤되지 않게, 닫히면 누른 마디로 포커스를 돌려준다
  useEffect(()=>{
    const back=document.activeElement;
    const body=document.body,was=body.style.overflow;
    body.style.overflow='hidden';
    if(boxRef.current&&boxRef.current.focus) boxRef.current.focus();
    return ()=>{ body.style.overflow=was; if(back&&back.focus&&document.contains(back)) back.focus(); };
  },[]);
  useEffect(()=>{
    const onKey=e=>{ if(e.key==='Escape'){ e.preventDefault(); onClose(); } };
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[onClose]);

  const what=sel.kind==='c'
    ?(selChord?`${sel.i+1}번째 코드 ${g.chordName(selChord)} 바꾸기`:`코드 더하기 (${selBar.chords.length}/${MAX_CHORDS})`)
    :(selNote?`${sel.i+1}번째 음 ${g.noteName(selNote)} (${g.noteWhere(selNote)}) 바꾸기`:`음 더하기 (${selBar.notes.length}/${MAX_NOTES})`);

  return (
    <div className="sheetwrap" onMouseDown={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h" tabIndex={-1} ref={boxRef}>
        <header className="sheethead">
          <button type="button" className="chip step" data-k="pbar" data-v="-1" aria-label="이전 마디" disabled={bi<=0} onClick={()=>g.selectBar(bi-1)}>◀</button>
          <h2 id="sheet-h"><span>{bi+1}</span>마디</h2>
          <button type="button" className="chip step" data-k="pbar" data-v="1" aria-label="다음 마디" disabled={bi>=bars.length-1} onClick={()=>g.selectBar(bi+1)}>▶</button>
          <button type="button" className="chip close" data-k="pclose" data-v="" aria-label="닫기" onClick={onClose}>✕</button>
        </header>

        <div className="sheetbody">
          <section className="baritems" aria-label={`${bi+1}마디 내용`}>
            <div className="brow"><span className="rowtag">코드</span>
              <div className="slots">
                {selBar.chords.map((c,i)=>{
                  const on=sel.kind==='c'&&sel.i===i;
                  return (
                    <button key={i} type="button" className={'slot'+(on?' on':'')} data-k="slot" data-v={`${bi}.${i}`} aria-pressed={String(on)}
                      aria-label={`${i+1}번째 코드 ${g.chordName(c)} 선택`} onClick={()=>g.selectChord(bi,i)}>
                      <b>{g.chordName(c)}</b><small>{posText(g.chordSlots.find(x=>x.bar===bi&&x.i===i).res)}</small>
                    </button>
                  );
                })}
                {selBar.chords.length<MAX_CHORDS&&(()=>{
                  const on=sel.kind==='c'&&sel.i<0;
                  return <button type="button" className={'slot blank'+(on?' on':'')} data-k="cadd" data-v={String(bi)} aria-pressed={String(on)}
                    aria-label="코드 더하기 선택" onClick={()=>g.selectChord(bi,-1)}><em>＋</em></button>;
                })()}
              </div>
            </div>
            <div className="brow mel"><span className="rowtag note">♪ 멜로디</span>
              <div className="notes">
                {selBar.notes.map((x,i)=>{
                  const on=sel.kind==='n'&&sel.i===i;
                  return <button key={i} type="button" className={'mnote'+(on?' on':'')} data-k="mnote" data-v={`${bi}.${i}`} aria-pressed={String(on)}
                    aria-label={`멜로디 ${i+1}번째 ${g.noteName(x)} (${g.noteWhere(x)}) 선택`} onClick={()=>g.selectNote(bi,i)}><i>{i+1}</i><b>{g.noteName(x)}</b></button>;
                })}
                {!selBar.notes.length&&<span className="mel-empty">없음</span>}
              </div>
            </div>
          </section>

          <section className="seltool" aria-label="고른 칸">
            <span className="selname">{what}{filledSlots.length>1?` · 곡 전체 손 이동 ${g.moved}프렛`:''}</span>
            <div className="seg compact">
              {sel.kind==='n'&&<>
                <Chip k="nmove" v="-1" disabled={!(sel.i>0)} onPick={()=>g.moveNote(-1)} aria-label="고른 음을 앞 순서로">◀ 앞으로</Chip>
                <Chip k="nmove" v="1" disabled={!(sel.i>=0&&sel.i<selBar.notes.length-1)} onPick={()=>g.moveNote(1)} aria-label="고른 음을 뒤 순서로">뒤로 ▶</Chip>
              </>}
              <Chip k="del" v="" disabled={sel.i<0} onPick={g.delSel}>삭제</Chip>
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
        </div>
      </div>
    </div>
  );
}
