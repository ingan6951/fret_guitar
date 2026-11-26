// 합주 방의 시계 맞추기와 박자 격자 계산 (모두 ms, 순수 함수)
//
// 박자 격자 grid = { playing, anchor, index, bpm, beats }
//   anchor: 방장 시계(epoch ms)로 index번째 박이 울리는 시각. 그 뒤로 60000/bpm ms마다 한 박.
// 참여자는 방장 시계와 자기 시계의 차이(offset = 방장 - 나)를 재서, anchor - offset 을 자기 시각으로 쓴다.

export const epochNow=()=>typeof performance!=='undefined'&&performance.timeOrigin
  ?performance.timeOrigin+performance.now():Date.now();

// 핑 한 번: t0 보낸 시각(나), th 방장이 답한 시각(방장), t1 받은 시각(나)
export const pingSample=(t0,th,t1)=>({rtt:t1-t0,offset:th-(t0+t1)/2});

// 왕복이 짧은 샘플일수록 가는 길·오는 길의 차이가 작아 믿을 만하다: 가장 짧은 1/3의 중앙값.
// err는 최악의 경우 오차(가장 짧은 왕복의 절반)
export function estimateOffset(samples){
  const ok=samples.filter(s=>Number.isFinite(s.rtt)&&s.rtt>=0&&Number.isFinite(s.offset));
  if(!ok.length) return null;
  const best=[...ok].sort((a,b)=>a.rtt-b.rtt).slice(0,Math.max(1,Math.ceil(ok.length/3)));
  const offs=best.map(s=>s.offset).sort((a,b)=>a-b);
  return {offset:offs[Math.floor(offs.length/2)],err:best[0].rtt/2};
}

// 재생 중에 빠르기·박 수를 바꿀 때: at 이후의 첫 박(지금 격자 위)부터 새 값으로 이어 간다.
// 박 수가 바뀌면 그 박을 새 마디의 첫 박(0)으로 센다.
export function retime(grid,at,{bpm,beats}){
  const d=60000/grid.bpm,k=Math.max(0,Math.ceil((at-grid.anchor)/d-1e-9));
  return {playing:true,anchor:grid.anchor+k*d,index:beats!==grid.beats?0:grid.index+k,bpm,beats};
}

export const gridKey=g=>g&&g.playing?`${Math.round(g.anchor)}|${g.index}|${g.bpm}|${g.beats}`:'stop';

// 방 이름: 추측하기 어려운 10글자
export function newRoomId(){
  const A='abcdefghijkmnpqrstuvwxyz23456789',b=new Uint8Array(10);
  if(globalThis.crypto&&globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(b);
  else for(let i=0;i<b.length;i++) b[i]=Math.floor(Math.random()*256);
  return Array.from(b,x=>A[x%A.length]).join('');
}
export const cleanRoomId=v=>typeof v==='string'&&/^[a-z0-9]{6,20}$/.test(v)?v:null;
