// 한 폼의 지판 그림 (5프렛 창)
import {DEGREE,windowStart,barres} from '../lib/fretlogic.js';

const PAD_L=46,CELL=58,TOP=32,GAP=24,W=PAD_L+CELL*5+14,H=172;
const WIDTHS=[1,1.2,1.6,2.1,2.7,3.3];

export function ariaFor(res,sym){
  const parts=res.notes.map((n,i)=>{
    const s=6-i;
    return n===null?`${s}번 줄 치지 않음`:(n.fret===0?`${s}번 줄 개방현`:`${s}번 줄 ${n.fret}프렛 ${n.finger}번 손가락`);
  });
  return `${sym}, ${res.bass}번 줄 베이스 ${res.formName}, ${res.baseFret===0?'개방 위치':res.baseFret+'프렛'}. `+parts.join(', ');
}

export default function Diagram({res,rootPc,label,names,aria}){
  const start=windowStart(res.notes);
  const X=fret=>PAD_L+(fret-start)*CELL+CELL/2;
  const Y=s=>TOP+(s-1)*GAP;
  const mx=PAD_L-22;
  const textFor=n=>label==='finger'?n.finger:label==='note'?names[n.pc]:DEGREE[(n.pc-rootPc+12)%12];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria}>
      <rect x={PAD_L} y="20" width={CELL*5} height="144" rx="3" fill="var(--rosewood)"/>
      {[0,1,2,3,4].map(i=>{
        const n=start+i,cx=PAD_L+i*CELL+CELL/2;
        return (
          <g key={'f'+i}>
            {[3,5,7,9,15,17,19,21].includes(n)&&<circle cx={cx} cy="92" r="6" fill="var(--inlay)"/>}
            {(n===12||n===24)&&<><circle cx={cx} cy="68" r="6" fill="var(--inlay)"/><circle cx={cx} cy="116" r="6" fill="var(--inlay)"/></>}
            <text x={cx} y="12" textAnchor="middle" className="fn">{n}</text>
          </g>
        );
      })}
      {[1,2,3,4,5].map(i=><line key={'w'+i} x1={PAD_L+i*CELL} y1="20" x2={PAD_L+i*CELL} y2="164" className="fretline"/>)}
      {start===1
        ?<rect x={PAD_L-5} y="18" width="6" height="148" rx="1" className="nut"/>
        :<line x1={PAD_L} y1="20" x2={PAD_L} y2="164" className="fretline"/>}
      {[1,2,3,4,5,6].map(s=><line key={'s'+s} x1={PAD_L} y1={Y(s)} x2={PAD_L+CELL*5} y2={Y(s)} stroke={s>=4?'var(--wound)':'var(--string)'} strokeWidth={WIDTHS[s-1]}/>)}
      {barres(res.notes).map(b=>{
        const y1=Y(b.top)-11,y2=Y(b.bottom)+11;
        return <rect key={`b${b.fret}-${b.top}`} x={X(b.fret)-11} y={y1} width="22" height={y2-y1} rx="11" className="barre"/>;
      })}
      {res.notes.map((n,i)=>{
        const s=6-i,y=Y(s);
        if(n===null) return <text key={'n'+i} x={mx} y={y} className="mute">×</text>;
        const root=n.pc===rootPc?' root':'';
        const t=textFor(n);
        if(n.fret===0) return (
          <g key={'n'+i}>
            <circle cx={mx} cy={y} r="9" className={'open'+root}/>
            {label!=='finger'&&<text x={mx} y={y} className={'ol'+root}>{t}</text>}
          </g>
        );
        return (
          <g key={'n'+i}>
            <circle cx={X(n.fret)} cy={y} r="10.5" className={'dot'+root}/>
            <text x={X(n.fret)} y={y} className="dl" fontSize={String(t).length>1?10.5:12.5}>{t}</text>
          </g>
        );
      })}
    </svg>
  );
}
