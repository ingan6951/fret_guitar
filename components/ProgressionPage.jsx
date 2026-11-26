'use client';
// 진행 페이지: 진행 이름·목록, 마디 차트, 고른 칸 편집(코드·멜로디), 공유.
// 진행을 만들고 고치는 일은 이 페이지에서만 한다.
import {QUALITIES} from '../lib/fretlogic.js';
import {MAX_LISTS,MAX_PROG,MAX_TITLE,MAX_NOTES,MAX_CHORDS,barIsEmpty} from '../lib/settings.js';
import {useGuide} from './GuideProvider.jsx';
import {Chip} from './ui.jsx';
import ChordFinder from './ChordFinder.jsx';
import NoteTable from './NoteTable.jsx';
import Diagram,{ariaFor} from './Diagram.jsx';

const moveText=d=>d===0?'제자리':`${d}프렛 이동`;

export default function ProgressionPage(){
  const g=useGuide();
  const {bars,lists,cur,sel,selBar,selChord,selNote,nm,label,filledSlots,noteTotal}=g;
  const posText=res=>res.baseFret===0?'개방':res.baseFret+'프렛';
  const hasAny=bars.some(b=>!barIsEmpty(b));
  const what=sel.kind==='c'
    ?`${sel.bar+1}마디 코드${selChord?` ${sel.i+1}번째 · ${g.chordName(selChord)}`:` · 새 코드 더하기 (${selBar.chords.length}/${MAX_CHORDS})`}`
    :`${sel.bar+1}마디 멜로디${selNote?` · ${g.noteName(selNote)} (${g.noteWhere(selNote)})`:` · 새 음 더하기 (${selBar.notes.length}/${MAX_NOTES})`}`;
  const canDel=sel.i>=0;

  return (
    <main className="stage">
      <section className="plist" aria-label="진행">
        <input className="titlein" type="text" data-k="ptitle" value={lists[cur].title} maxLength={MAX_TITLE} placeholder={`진행 ${cur+1} 제목`}
          aria-label="진행 제목" onChange={e=>g.pick('ptitle',e.target.value)}/>
        <select className="sel" data-k="pswitch" aria-label="진행 선택" value={String(cur)} onChange={e=>g.switchList(e.target.value)}>
          {lists.map((l,i)=><option key={i} value={String(i)}>{l.title||`진행 ${i+1}`}</option>)}
        </select>
        <Chip k="pnew" v="" disabled={lists.length>=MAX_LISTS} onPick={g.newProg}>＋ 새 진행</Chip>
        <Chip k="plistdel" v="" on={g.confirmDel||undefined} onPick={g.deleteProg}>{g.confirmDel?'정말 삭제':'진행 삭제'}</Chip>
      </section>

      <section className="chart" aria-label="마디 차트">
        <div className="bars">
          {bars.map((b,bi)=>(
            <div key={bi} className={'bar'+(b.chords.length>=2?' wide':'')+(sel.bar===bi?' picked':'')}>
              <button type="button" className="bn" data-k="bar" data-v={String(bi)} aria-pressed={String(sel.bar===bi)} aria-label={`${bi+1}마디 선택`} onClick={()=>g.selectBar(bi)}>{bi+1}</button>
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
              <div className="mel" aria-label={`${bi+1}마디 멜로디`}>
                {b.notes.map((x,i)=>{
                  const on=sel.bar===bi&&sel.kind==='n'&&sel.i===i;
                  return <button key={i} type="button" className={'mnote'+(on?' on':'')} data-k="mnote" data-v={`${bi}.${i}`} aria-pressed={String(on)}
                    aria-label={`${bi+1}마디 멜로디 ${i+1}번째 ${g.noteName(x)} (${g.noteWhere(x)}) 선택`} onClick={()=>g.selectNote(bi,i)}>{g.noteName(x)}</button>;
                })}
                {!b.notes.length&&<span className="mel-empty">멜로디 없음</span>}
              </div>
            </div>
          ))}
        </div>
        {bars.length<MAX_PROG&&<button type="button" className="chip addbar" data-k="padd" onClick={g.addBar} aria-label="다음 마디 추가">＋ 마디 추가</button>}
      </section>

      <section className="seltool" aria-label="고른 칸">
        <span className="selname">{what}{filledSlots.length>1?` · 총 손 이동 ${g.moved}프렛`:''}</span>
        <div className="seg compact">
          <Chip k="del" v="" disabled={!canDel} onPick={g.delSel}>삭제</Chip>
          <Chip k="bclear" v="" disabled={barIsEmpty(selBar)} onPick={g.clearBar}>마디 비우기</Chip>
        </div>
      </section>

      <section className="editor" aria-label="코드·멜로디 넣기">
        <div className="seg compact tabs2" role="group" aria-label="넣을 것">
          <Chip k="kind" v="c" on={sel.kind==='c'} onPick={(k,v)=>g.setKind(v)}>코드 폼</Chip>
          <Chip k="kind" v="n" on={sel.kind==='n'} onPick={(k,v)=>g.setKind(v)}>멜로디 음</Chip>
        </div>
        {sel.kind==='c'?<ChordFinder edit/>:<NoteTable edit/>}
      </section>

      <section className="foot" aria-label="진행 도구">
        {hasAny&&<Chip k="pshare" v="" onPick={g.shareProg}>{g.shareNote||'링크 복사'}</Chip>}
        {hasAny&&<Chip k="pclear" v="" onPick={g.clearAll}>전체 비우기</Chip>}
        {g.shareUrl&&<input className="shareurl" readOnly value={g.shareUrl} aria-label="공유 링크" onFocus={e=>e.target.select()}/>}
      </section>

      {filledSlots.length>0&&(
        <details className="sum">
          <summary>코드 폼 모아 보기 ({filledSlots.length}개)</summary>
          <p className="count">{`총 손 이동 ${g.moved}프렛 · 위치는 검지가 놓이는 프렛${noteTotal?` · 멜로디 음 ${noteTotal}개`:''}`}</p>
          <div className="cards" aria-label="진행 폼 목록">
            {filledSlots.map((x,k)=>{
              const d=k>0?g.gap(filledSlots[k-1].res,x.res):null,name=g.chordName(x.c);
              return (
                <figure className="card" key={`${x.bar}.${x.i}`}>
                  <figcaption>
                    <div className="who"><b>{x.bar+1}마디{bars[x.bar].chords.length>1?` ${x.i+1}/${bars[x.bar].chords.length}`:''} {name}</b><span>{x.res.bass}번 줄 베이스{d===null?null:<> · <span className="move">{moveText(d)}</span></>}</span></div>
                    <div className="capr"><div className="pos">{posText(x.res)}</div></div>
                  </figcaption>
                  <Diagram res={x.res} rootPc={x.c.root} quality={QUALITIES.find(y=>y.id===x.c.q)} label={label} names={nm} aria={ariaFor(x.res,name)}/>
                </figure>
              );
            })}
          </div>
        </details>
      )}
    </main>
  );
}
