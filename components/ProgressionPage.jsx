'use client';
// 진행 페이지: 곡(진행) 이름·목록·빠르기, 탭 악보(한 줄 4마디), 공유·합주 방.
// 탭 악보의 마디를 누르면 마디 창(BarSheet)이 떠서 그 마디의 코드·멜로디를 고른다. 탭 악보가 곧 연주용 화면이다.
import {useCallback,useEffect,useState} from 'react';
import useMetronome from './useMetronome.js';
import TempoBar from './TempoBar.jsx';
import {rememberHostRoom} from './useRoom.js';
import {newRoomId} from '../lib/sync.js';
import {roomConfigured} from '../lib/room.js';
import Link from 'next/link';
import {MAX_LISTS,MAX_PROG,MAX_TITLE,barIsEmpty} from '../lib/settings.js';
import {useGuide} from './GuideProvider.jsx';
import {Chip} from './ui.jsx';
import TabStaff from './TabStaff.jsx';
import BarSheet from './BarSheet.jsx';

export default function ProgressionPage(){
  const g=useGuide();
  const [sheet,setSheet]=useState(false); // 마디 창이 열려 있나 (어느 마디인지는 g.sel.bar)
  const {bars,lists,cur,sel,filledSlots,selectBar}=g;
  const hasAny=bars.some(b=>!barIsEmpty(b));

  // 메트로놈: 곡 길이는 마지막으로 무언가 적힌 마디까지 (다 비었으면 모든 마디), 끝나면 처음으로 돌아간다
  const m=useMetronome({bpm:g.bpm,beats:g.beats});
  let songLen=bars.length; while(songLen>1&&barIsEmpty(bars[songLen-1])) songLen--;
  if(!hasAny) songLen=bars.length;
  const nowBar=m.playing&&m.pos?m.pos.bar%songLen:-1;
  useEffect(()=>{ m.stop(); setSheet(false); },[cur]); // eslint-disable-line react-hooks/exhaustive-deps -- 다른 곡으로 바꾸면 멈추고 창을 닫는다
  const openBar=useCallback(bi=>{ selectBar(bi); setSheet(true); },[selectBar]);
  const closeSheet=useCallback(()=>setSheet(false),[]);
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
      </section>

      <TempoBar m={m} sticky={m.playing}/>

      <section className="chart" aria-label="탭 악보">
        <p className="count">{filledSlots.length>1?`코드 ${filledSlots.length}개 · 총 손 이동 ${g.moved}프렛 · `:''}마디를 누르면 코드·멜로디를 넣어요</p>
        <TabStaff onPick={openBar} picked={sheet?sel.bar:-1} nowBar={nowBar}/>
        {bars.length<MAX_PROG&&<button type="button" className="chip addbar" data-k="padd" onClick={g.addBar} aria-label="다음 마디 추가">＋ 마디 추가</button>}
      </section>
      {sheet&&<BarSheet onClose={closeSheet}/>}

      <section className="foot" aria-label="진행 도구">
        {/* 합주 방 만들기: 이 기기를 방장으로 기억하고 방으로 간다 (방장 화면은 지금 곡을 쓴다) */}
        {roomConfigured()&&roomId&&<Link href={`/room/?id=${roomId}`} className="chip roomgo" data-k="room" onClick={()=>rememberHostRoom(roomId)}>🎧 합주 방 만들기</Link>}
        {hasAny&&<Chip k="pshare" v="" onPick={g.shareProg}>{g.shareNote||'링크 복사'}</Chip>}
        {hasAny&&<Chip k="pclear" v="" onPick={g.clearAll}>전체 비우기</Chip>}
        {g.shareUrl&&<input className="shareurl" readOnly value={g.shareUrl} aria-label="공유 링크" onFocus={e=>e.target.select()}/>}
      </section>
    </main>
  );
}
