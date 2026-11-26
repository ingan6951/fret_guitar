'use client';
// 메트로놈을 화면에서 쓰기 위한 훅: 재생/정지, 지금 몇 마디 몇 번째 박인지(pos)
// 빠르기는 재생 중에도 바로 반영하고, 박 수가 바뀌면 마디 셈이 달라지므로 처음부터 다시 센다.
import {useEffect,useRef,useState} from 'react';
import {createMetronome,audioSupported} from '../lib/metronome.js';

export default function useMetronome({bpm,beats}){
  const ref=useRef(null);
  const [playing,setPlaying]=useState(false);
  const [pos,setPos]=useState(null);           // {beat, bar} — 정지 중이면 null
  const [supported,setSupported]=useState(null); // 서버 렌더와 맞추려고 마운트 뒤에 정한다
  const get=()=>ref.current||(ref.current=createMetronome({onBeat:setPos}));

  useEffect(()=>{ setSupported(audioSupported()); },[]);
  useEffect(()=>()=>{ if(ref.current) ref.current.close(); },[]);
  useEffect(()=>{ if(ref.current) ref.current.setBpm(bpm); },[bpm]);
  useEffect(()=>{ if(playing){ setPos(null); get().start({bpm,beats}); } },[beats]); // eslint-disable-line react-hooks/exhaustive-deps

  const start=()=>{
    setPos(null);
    if(get().start({bpm,beats})) setPlaying(true);
    else setSupported(false);
  };
  const stop=()=>{ if(ref.current) ref.current.stop(); setPlaying(false); setPos(null); };
  return {playing,pos,supported,start,stop,toggle:()=>playing?stop():start()};
}
