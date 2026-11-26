'use client';
// 마디 차트. 모든 페이지 위쪽에 붙고, full이면 진행 이름·목록·공유까지 보인다.
import Link from 'next/link';
import {isNote} from '../lib/fretlogic.js';
import {MAX_PROG,MAX_LISTS,MAX_TITLE} from '../lib/settings.js';
import {useGuide} from './GuideProvider.jsx';

export function Chip({k,v,on,disabled,onPick,children,className='chip',...rest}){
  return (
    <button className={className} type="button" data-k={k} data-v={v} aria-pressed={on===undefined?undefined:String(on)}
      disabled={disabled} onClick={()=>onPick(k,v)} {...rest}>{children}</button>
  );
}

export default function ProgBar({full=false}){
  const g=useGuide();
  const {prog,resolved,sl,selFilled,chordName,noteWhere,lists,cur,filled,chordIdx,moved}=g;
  return (
    <div className="prog">
      {full?(
        <div className="plist">
          <input className="titlein" type="text" data-k="ptitle" value={lists[cur].title} maxLength={MAX_TITLE} placeholder={`진행 ${cur+1} 제목`}
            aria-label="진행 제목" onChange={e=>g.pick('ptitle',e.target.value)}/>
          <div className="prow">
            <select className="sel" data-k="pswitch" aria-label="진행 선택" value={String(cur)} onChange={e=>g.switchList(e.target.value)}>
              {lists.map((l,i)=><option key={i} value={String(i)}>{l.title||`진행 ${i+1}`}</option>)}
            </select>
            <Chip k="pnew" v="" disabled={lists.length>=MAX_LISTS} onPick={g.newProg}>＋ 새 진행</Chip>
            <Chip k="plistdel" v="" on={g.confirmDel||undefined} onPick={g.deleteProg}>{g.confirmDel?'정말 삭제':'진행 삭제'}</Chip>
          </div>
        </div>
      ):(
        <div className="plist">
          <span className="ptitle-s">{lists[cur].title||`진행 ${cur+1}`}</span>
          <Link className="plink" href="/progression">진행 관리 →</Link>
        </div>
      )}
      <div className="chart" aria-label="코드 차트">
        <div className="bars">
          {prog.map((c,i)=>(
            <button key={i} type="button" className={'bar'+(sl===i?' picked':'')+(c?'':' blank')} data-k="bar" data-v={String(i)}
              aria-pressed={String(sl===i)} aria-label={c?`${i+1}마디 ${chordName(c)} 선택`:`${i+1}마디 비어 있음, 선택`} onClick={()=>g.choose(i)}>
              <small className="bn">{i+1}</small>
              {c?<span className="bc"><b>{chordName(c)}</b><small>{isNote(c)?noteWhere(c):(resolved[i].baseFret===0?'개방':resolved[i].baseFret+'프렛')}</small></span>
                :<span className="bc"><em>비어 있음</em></span>}
            </button>
          ))}
        </div>
        {prog.length<MAX_PROG&&<button type="button" className="chip addbar" data-k="padd" onClick={g.addBar} aria-label="다음 마디 추가">＋ 마디 추가</button>}
      </div>
      <div className="prog-actions">
        <span className="selname">{sl+1}마디 선택됨 · {selFilled?`${chordName(prog[sl])}${isNote(prog[sl])?` (${noteWhere(prog[sl])})`:''}`:'비어 있음'}{chordIdx.length>1?` · 총 손 이동 ${moved}프렛`:''}</span>
        {selFilled&&<Chip k="pdel" v={String(sl)} onPick={g.delSel}>마디 비우기</Chip>}
        {full&&filled.length>0&&<Chip k="pshare" v="" onPick={g.shareProg}>{g.shareNote||'링크 복사'}</Chip>}
        {full&&filled.length>0&&<Chip k="pclear" v="" onPick={g.clearAll}>전체 비우기</Chip>}
      </div>
      {full&&g.shareUrl&&<input className="shareurl" readOnly value={g.shareUrl} aria-label="공유 링크" onFocus={e=>e.target.select()}/>}
    </div>
  );
}
