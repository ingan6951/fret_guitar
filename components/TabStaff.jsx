'use client';
// 진행을 기타 탭 악보로 보여 준다: 한 줄에 4마디, 위에서부터 1번 줄(e) … 6번 줄(E).
// 마디 안은 코드(그 폼의 프렛을 세로로 쌓은 묶음, 위에 코드 이름) 다음에 멜로디 음(한 줄 위의 프렛 숫자)이 순서대로 놓인다.
// 마디를 누르면 onPick(마디 번호) — 진행 페이지가 그 마디의 코드·멜로디를 고르는 창을 연다.
import {useEffect,useRef} from 'react';
import {barIsEmpty} from '../lib/settings.js';
import {useGuide} from './GuideProvider.jsx';

export const BARS_PER_LINE=4;
const STRINGS=['e','B','G','D','A','E']; // 위(1번 줄)에서 아래(6번 줄)로
// 데이터의 줄 번호(0=6번 줄 … 5=1번 줄)를 악보의 위에서부터 칸 번호로
const rowOf=s=>5-s;

// 마디 하나를 탭 칸 목록으로: [{kind:'c'|'n', name, cells:[6칸, 위에서부터]}]
export function barColumns(b,chordName,noteName){
  const cols=b.chords.map(c=>{
    const cells=Array(6).fill(null);
    c.frets.forEach((f,s)=>{ if(f!==null) cells[rowOf(s)]=f; });
    return {kind:'c',name:chordName(c),cells};
  });
  for(const x of b.notes){
    const cells=Array(6).fill(null); cells[rowOf(x.s)]=x.f;
    cols.push({kind:'n',name:noteName(x),cells});
  }
  return cols;
}
const barLabel=(bi,cols)=>{
  const ch=cols.filter(c=>c.kind==='c').map(c=>c.name),nt=cols.filter(c=>c.kind==='n').map(c=>c.name);
  const parts=[ch.length?`코드 ${ch.join(' ')}`:'',nt.length?`멜로디 ${nt.join(' ')}`:''].filter(Boolean);
  return `${bi+1}마디${parts.length?', '+parts.join(', '):', 비어 있음'} — 눌러서 고치기`;
};

export default function TabStaff({onPick,picked=-1,nowBar=-1}){
  const g=useGuide();
  const {bars}=g;
  const lines=[];
  for(let i=0;i<bars.length;i+=BARS_PER_LINE) lines.push(bars.slice(i,i+BARS_PER_LINE).map((b,k)=>({b,bi:i+k})));

  // 메트로놈이 다음 마디로 넘어가면 그 줄이 화면에 들어오게 한다
  const ref=useRef(null);
  useEffect(()=>{
    const el=nowBar>=0&&ref.current&&ref.current.querySelector(`[data-bar="${nowBar}"]`);
    if(el&&el.scrollIntoView) el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
  },[nowBar]);

  return (
    <div className="tab" ref={ref} role="group" aria-label="탭 악보">
      {lines.map((line,li)=>(
        <div key={li} className="tabscroll">
          <div className="tabline">
            <div className="tnames" aria-hidden="true">{STRINGS.map(s=><span key={s}>{s}</span>)}</div>
            {line.map(({b,bi})=>{
              const cols=barColumns(b,g.chordName,g.noteName);
              const n=Math.max(cols.length,2);
              return (
                <button key={bi} type="button" data-k="bar" data-v={String(bi)} data-bar={bi}
                  className={'tbar'+(barIsEmpty(b)?' empty':'')+(bi===picked?' picked':'')+(bi===nowBar?' now':'')}
                  style={{flexGrow:n,minWidth:`${28+cols.length*30}px`}}
                  aria-label={barLabel(bi,cols)} aria-current={bi===nowBar?'step':undefined} onClick={()=>onPick(bi)}>
                  <span className="tnum" aria-hidden="true">{bi+1}</span>
                  {cols.length?(
                    <span className="tcols" aria-hidden="true">
                      {cols.map((c,ci)=>(
                        <span key={ci} className={'tcol '+c.kind} data-name={c.name}>
                          <span className="tchord">{c.kind==='c'?c.name:''}</span>
                          {c.cells.map((f,r)=><span key={r} className="tcell">{f===null?'':<i>{f}</i>}</span>)}
                        </span>
                      ))}
                    </span>
                  ):<span className="tplus" aria-hidden="true">＋</span>}
                </button>
              );
            })}
            {/* 마지막 줄이 4마디보다 적어도 마디 폭이 늘어나지 않게 빈자리를 둔다 */}
            {Array.from({length:BARS_PER_LINE-line.length},(_,k)=><span key={'gap'+k} className="tgap" aria-hidden="true"/>)}
          </div>
        </div>
      ))}
    </div>
  );
}
