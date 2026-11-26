// 메트로놈 엔진 (Web Audio). 클릭은 오디오 시계에 미리 예약해서 낸다 — setInterval로 직접 소리를 내면 박이 밀린다.
//
// 합주용 설계:
//  - 박자 격자는 이 기기의 실제 시계(epoch ms)로 기억한다. start({startAt}) 은 "이 시각에 0번째 박이 귀에 닿는다".
//    이미 지났으면 그 격자에 맞춰 다음 박부터 낸다 → 방장 시각을 내 시각으로 바꿔 넘기면 늦게 들어와도 같은 박.
//  - 매 박을 예약할 때마다 그 순간의 "오디오 시각 ↔ 실제 시각" 대응(getOutputTimestamp)으로 바꾼다.
//    그래서 브라우저가 아는 출력 지연이 빠지고, 오래 틀어도 두 시계가 어긋나지 않는다.
//    오디오가 막 켜져 대응을 아직 모르면 알 때까지 기다린다(첫 박이 그만큼 늦게 나는 일이 없게).
//  - lead(ms): 브라우저도 모르는 출력 지연(블루투스 이어폰 등)만큼 클릭을 먼저 낸다.

export const beatSec=bpm=>60/bpm;

// startAt 에서 시작한 박자 격자에서, now 이후(같은 시각 포함) 첫 박의 번호와 시각 (단위: 초)
export function firstBeat(startAt,now,bpm){
  if(now<=startAt) return {index:0,time:startAt};
  const d=beatSec(bpm),i=Math.ceil((now-startAt)/d-1e-9);
  return {index:i,time:startAt+i*d};
}

// 박 번호 → 마디 안 박(0부터)과 마디 번호
export const beatPos=(index,beats)=>({beat:index%beats,bar:Math.floor(index/beats)});

const AudioCtor=()=>typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext)||null;
export const audioSupported=()=>!!AudioCtor();
export const epochMs=()=>typeof performance!=='undefined'&&performance.timeOrigin?performance.timeOrigin+performance.now():Date.now();

export function createMetronome({onBeat}={}){
  let ctx=null,timer=null,run=0,pending=null,map=null;
  let bpm=90,beats=4,lead=0,index=0,next=0; // next: 다음 박이 귀에 닿을 시각(epoch ms)

  function ensure(){
    if(!ctx){ const C=AudioCtor(); if(!C) return null; ctx=new C(); map=null; }
    if(ctx.state==='suspended'&&ctx.resume) ctx.resume();
    return ctx;
  }
  // 오디오 시각(ms) - 실제 시각(ms). 출력 타임스탬프가 있으면 그것으로(작은 흔들림은 고르게), 없으면 알려진 지연을 뺀다.
  // 아직 모르면 null
  function refreshMap(){
    if(!ctx||ctx.state!=='running') return null;
    const ts=ctx.getOutputTimestamp&&ctx.getOutputTimestamp();
    let m;
    if(ts&&ts.contextTime>0&&ts.performanceTime>0&&typeof performance!=='undefined'&&performance.timeOrigin)
      m=ts.contextTime*1000-(performance.timeOrigin+ts.performanceTime);
    else if(ctx.getOutputTimestamp&&ctx.currentTime<0.05) return map; // 막 켜져 아직 모름
    else m=ctx.currentTime*1000-epochMs()-((ctx.outputLatency||0)+(ctx.baseLatency||0))*1000;
    map=map===null||Math.abs(m-map)>20?m:map+(m-map)*0.1;
    return map;
  }
  function click(t,accent){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.frequency.value=accent?1600:1000;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(accent?0.9:0.45,t+0.002);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.05);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t+0.06);
  }
  function tick(){
    if(refreshMap()===null) return; // 오디오가 아직 준비되지 않음: 다음 틱에
    // 탭이 뒤로 가면 타이머가 1초 단위로 늦어지므로 더 멀리 예약해 둔다
    const ahead=typeof document!=='undefined'&&document.hidden?1500:150;
    const me=run,now=epochMs();
    for(;;){
      // 예약된 빠르기·박 수 변경: 지금 격자가 그 박에 닿으면 거기서부터 새 값으로
      if(pending&&next>=pending.time-0.1){ next=pending.time; index=pending.index; bpm=pending.bpm; beats=pending.beats; pending=null; }
      if(next-lead>=now+ahead) break;
      const i=index,e=next,n=beats,t=(e-lead+map)/1000;
      if(t>=ctx.currentTime-0.005) click(Math.max(ctx.currentTime,t),i%n===0); // 이미 지나 버린 박은 건너뛴다
      // 화면 표시는 소리가 귀에 닿는 시각에 맞춘다
      setTimeout(()=>{ if(me===run&&onBeat) onBeat(beatPos(i,n)); },Math.max(0,e-now));
      index++; next+=60000/bpm;
    }
  }
  function stop(){
    run++; pending=null;
    if(timer){ clearInterval(timer); timer=null; }
  }
  return {
    // 사용자 동작(탭·클릭) 안에서 불러야 모바일에서 소리가 난다
    unlock(){ return !!ensure(); },
    get playing(){ return !!timer; },
    // 출력 지연 보정(ms): 클릭을 이만큼 먼저 낸다
    setLead(ms){ lead=Math.max(0,ms||0); },
    // startAt(epoch ms)에 index0번째 박. skip(ms): 재생 중에 다시 맞출 때 이미 예약된 클릭과 겹치지 않게 그 뒤의 박부터
    start(o={}){
      const c=ensure(); if(!c) return false;
      stop();
      bpm=o.bpm||bpm; beats=o.beats||beats; if(o.lead!==undefined) lead=Math.max(0,o.lead);
      const now=epochMs(),startAt=o.startAt??now+150;
      const f=firstBeat(startAt/1000,(now+(o.skip||30))/1000,bpm);
      index=(o.index0||0)+f.index; next=f.time*1000;
      timer=setInterval(tick,25);
      tick();
      return true;
    },
    // 재생 중 빠르기만 바꾼다 (다음 박부터)
    setBpm(v){ bpm=v; },
    // 재생을 끊지 않고 time(epoch ms, 지금 격자 위의 박)부터 index·bpm·beats 로 이어 간다.
    // 이미 지났거나 재생 중이 아니면 false — 그때는 start 로 새로 맞춘다.
    changeAt({time,index:i,bpm:b,beats:n}){
      if(!timer||time<epochMs()+lead+20) return false;
      pending={time,index:i,bpm:b,beats:n}; return true;
    },
    stop,
    close(){ stop(); if(ctx&&ctx.close) ctx.close(); ctx=null; map=null; }
  };
}
